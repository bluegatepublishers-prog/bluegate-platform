import "server-only";

import { Prisma, ResourceType, TeacherQuestionStatus } from "@prisma/client";

import { adaptTeacherQuestion, normalizeQuestionType } from "@/lib/normalized-question";
import { parseFillBlankAnswerConfig } from "@/lib/question-response-evaluator";
import { prisma } from "@/lib/prisma";
import { getTeacherResourceScope } from "@/lib/resource-audience";
import { decideSchoolAccess } from "@/lib/school-access-policy";
import {
  TEACHER_QUESTION_STATUSES,
  teacherQuestionSourceHash,
  validateTeacherQuestionMaster,
  type TeacherQuestionStatusValue,
} from "@/lib/teacher-question-policy";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

export const TEACHER_QUESTION_ERROR_CODES = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_INPUT",
  "INVALID_CONTEXT",
  "INVALID_RESOURCE",
  "REVISION_CONFLICT",
  "INVALID_TRANSITION",
] as const;

export type TeacherQuestionErrorCode = (typeof TEACHER_QUESTION_ERROR_CODES)[number];

export class TeacherQuestionBankError extends Error {
  constructor(
    message: string,
    readonly code: TeacherQuestionErrorCode,
    readonly status: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export type TeacherQuestionAuthoringInput = {
  sectionSubjectId?: unknown;
  bookId?: unknown;
  chapterId?: unknown;
  moduleId?: unknown;
  imageResourceId?: unknown;
  questionType?: unknown;
  questionText?: unknown;
  options?: unknown;
  correctAnswer?: unknown;
  explanation?: unknown;
  marks?: unknown;
  difficulty?: unknown;
  bloomLevel?: unknown;
  competency?: unknown;
  tags?: unknown;
};

export type TeacherQuestionListInput = {
  status?: unknown;
  questionType?: unknown;
  difficulty?: unknown;
  sectionSubjectId?: unknown;
  bookId?: unknown;
  chapterId?: unknown;
  moduleId?: unknown;
  tags?: unknown;
  search?: unknown;
  page?: unknown;
  pageSize?: unknown;
};

type StoredQuestionSemantics = {
  sectionSubjectId: string | null;
  bookId: string | null;
  chapterId: string | null;
  moduleId: string | null;
  imageResourceId: string | null;
  questionType: string;
  questionText: string;
  options: unknown;
  correctAnswer: string | null;
  explanation: string | null;
  marks: number;
  difficulty: string;
  bloomLevel: string | null;
  competency: string | null;
  tags: string[];
};

type TeacherQuestionActor = {
  userId: string;
  teacherId: string;
  schoolId: string;
  publisherId: string;
};

const questionSelect = {
  id: true,
  publisherId: true,
  schoolId: true,
  teacherId: true,
  sectionSubjectId: true,
  bookId: true,
  chapterId: true,
  moduleId: true,
  imageResourceId: true,
  questionType: true,
  questionText: true,
  options: true,
  correctAnswer: true,
  explanation: true,
  marks: true,
  difficulty: true,
  bloomLevel: true,
  competency: true,
  tags: true,
  status: true,
  revision: true,
  sourceHash: true,
  createdAt: true,
  updatedAt: true,
  imageResource: {
    select: {
      id: true,
      title: true,
      type: true,
      mimeType: true,
      thumbnail: true,
    },
  },
} satisfies Prisma.TeacherQuestionSelect;

type TeacherQuestionRow = Prisma.TeacherQuestionGetPayload<{ select: typeof questionSelect }>;

function fail(
  code: TeacherQuestionErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>,
): never {
  throw new TeacherQuestionBankError(message, code, status, details);
}

function record(value: unknown, message = "The request body must be an object.") {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("INVALID_INPUT", message, 400);
  return value as Record<string, unknown>;
}

function optionalId(value: unknown, label: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string" || !value.trim()) fail("INVALID_INPUT", `${label} must be a non-empty identifier or null.`, 400);
  return value.trim();
}

function valueOrExisting(value: unknown, label: string, existing: string | null | undefined) {
  const normalized = optionalId(value, label);
  return normalized === undefined ? existing ?? null : normalized;
}

function text(value: unknown, label: string, required: boolean, fallback?: string | null) {
  if (value === undefined) return fallback ?? null;
  if (value === null) {
    if (required) fail("INVALID_INPUT", `${label} is required.`, 400);
    return null;
  }
  if (typeof value !== "string") fail("INVALID_INPUT", `${label} must be text.`, 400);
  const normalized = value.trim();
  if (required && !normalized) fail("INVALID_INPUT", `${label} is required.`, 400);
  return normalized || null;
}

function integer(value: unknown, fallback: number) {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 100) {
    fail("INVALID_INPUT", "Marks must be a whole number between 1 and 100.", 400);
  }
  return value;
}

function normalizeTags(value: unknown, fallback: string[]) {
  if (value === undefined) return fallback;
  if (!Array.isArray(value) || value.some((tag) => typeof tag !== "string")) {
    fail("INVALID_INPUT", "Tags must be an array of text values.", 400);
  }
  const tags = [...new Set(value.map((tag) => tag.trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  if (tags.length > 40 || tags.some((tag) => tag.length > 80)) fail("INVALID_INPUT", "Use at most 40 tags of up to 80 characters.", 400);
  return tags;
}

function jsonValue(value: unknown, label: string) {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value)) as unknown;
  } catch {
    fail("INVALID_INPUT", `${label} must be JSON-compatible.`, 400);
  }
}

type ChoiceOption = { id: string; text: string };

function normalizeChoiceOptions(value: unknown, label: string): ChoiceOption[] {
  if (!Array.isArray(value) || value.length < 2) fail("INVALID_INPUT", `${label} requires at least two options.`, 400);
  const options = value.map((entry, index) => {
    if (typeof entry === "string" && entry.trim()) return { id: `option-${index + 1}`, text: entry.trim() };
    const item = record(entry, `${label} options must be text or objects.`);
    const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : `option-${index + 1}`;
    const valueText = [item.text, item.label, item.value].find((candidate) => typeof candidate === "string" && candidate.trim());
    if (typeof valueText !== "string") fail("INVALID_INPUT", `${label} options require text.`, 400);
    return { id, text: valueText.trim() };
  });
  if (new Set(options.map((option) => option.id.toLocaleLowerCase("en"))).size !== options.length) {
    fail("INVALID_INPUT", `${label} option identifiers must be unique.`, 400);
  }
  return options;
}

function optionId(options: ChoiceOption[], answer: unknown, label: string) {
  if (typeof answer !== "string" || !answer.trim()) fail("INVALID_INPUT", `${label} requires an answer.`, 400);
  const candidate = answer.trim().toLocaleLowerCase("en");
  const found = options.find((option) => option.id.toLocaleLowerCase("en") === candidate || option.text.toLocaleLowerCase("en") === candidate);
  if (!found) fail("INVALID_INPUT", `${label} answer must reference an option.`, 400);
  return found.id;
}

function answerList(value: unknown, label: string) {
  const source = typeof value === "string"
    ? (() => { try { return JSON.parse(value) as unknown; } catch { return [value]; } })()
    : value;
  if (!Array.isArray(source) || !source.length || source.some((entry) => typeof entry !== "string" || !entry.trim())) {
    fail("INVALID_INPUT", `${label} requires one or more answers.`, 400);
  }
  return source.map((entry) => (entry as string).trim());
}

function normalizeMatchPairs(value: unknown) {
  if (!Array.isArray(value) || !value.length) fail("INVALID_INPUT", "MATCH requires one or more left/right pairs.", 400);
  const pairs = value.map((entry) => {
    const pair = record(entry, "MATCH pairs must be objects.");
    if (typeof pair.left !== "string" || !pair.left.trim() || typeof pair.right !== "string" || !pair.right.trim()) {
      fail("INVALID_INPUT", "MATCH pairs require non-empty left and right values.", 400);
    }
    return { left: pair.left.trim(), right: pair.right.trim() };
  });
  if (new Set(pairs.map((pair) => pair.left.toLocaleLowerCase("en"))).size !== pairs.length) {
    fail("INVALID_INPUT", "MATCH left values must be unique.", 400);
  }
  return pairs;
}

function normalizeOrdering(optionsInput: unknown, answerInput: unknown) {
  const options = normalizeChoiceOptions(optionsInput, "ORDERING");
  const order = answerList(answerInput, "ORDERING").map((answer) => optionId(options, answer, "ORDERING"));
  if (new Set(order).size !== options.length || order.length !== options.length) {
    fail("INVALID_INPUT", "ORDERING answers must contain every option exactly once.", 400);
  }
  return { options, correctAnswer: JSON.stringify(order) };
}

function normalizeQuestionSemantics(
  raw: Record<string, unknown>,
  existing?: StoredQuestionSemantics,
): StoredQuestionSemantics {
  const rawType = raw.questionType === undefined ? existing?.questionType : raw.questionType;
  if (typeof rawType !== "string" || !rawType.trim()) fail("INVALID_INPUT", "Question type is required.", 400);
  const questionType = normalizeQuestionType(rawType);
  if (questionType === "UNSUPPORTED") fail("INVALID_INPUT", "Choose a supported question type.", 400);

  const questionText = text(raw.questionText, "Question text", true, existing?.questionText) as string;
  const marks = integer(raw.marks, existing?.marks ?? 1);
  const difficulty = text(raw.difficulty, "Difficulty", false, existing?.difficulty ?? "MEDIUM") ?? "MEDIUM";
  const bloomLevel = text(raw.bloomLevel, "Bloom level", false, existing?.bloomLevel) ?? null;
  const competency = text(raw.competency, "Competency", false, existing?.competency) ?? null;
  const explanation = text(raw.explanation, "Explanation", false, existing?.explanation) ?? null;
  const tags = normalizeTags(raw.tags, existing?.tags ?? []);
  let options = raw.options === undefined ? existing?.options ?? null : jsonValue(raw.options, "Options") ?? null;
  let correctAnswer = text(raw.correctAnswer, "Correct answer", false, existing?.correctAnswer) ?? null;

  if (questionType === "MCQ") {
    options = normalizeChoiceOptions(options, "MCQ");
    correctAnswer = optionId(options as ChoiceOption[], correctAnswer, "MCQ");
  } else if (questionType === "MULTIPLE_SELECT") {
    options = normalizeChoiceOptions(options, "MULTIPLE_SELECT");
    const answers = answerList(correctAnswer, "MULTIPLE_SELECT").map((answer) => optionId(options as ChoiceOption[], answer, "MULTIPLE_SELECT"));
    correctAnswer = JSON.stringify([...new Set(answers)]);
  } else if (questionType === "TRUE_FALSE") {
    const normalized = typeof correctAnswer === "string" ? correctAnswer.trim().toLocaleLowerCase("en") : "";
    if (normalized !== "true" && normalized !== "false") fail("INVALID_INPUT", "TRUE_FALSE requires a true or false answer.", 400);
    correctAnswer = normalized;
    options = [{ id: "true", text: "True" }, { id: "false", text: "False" }];
  } else if (questionType === "FILL_BLANK") {
    if (!correctAnswer) fail("INVALID_INPUT", "FILL_BLANK requires an expected answer.", 400);
    try {
      options = parseFillBlankAnswerConfig(options);
    } catch (error) {
      fail("INVALID_INPUT", error instanceof Error ? error.message : "Fill Blank options are invalid.", 400);
    }
  } else if (questionType === "MATCH") {
    options = normalizeMatchPairs(options);
    correctAnswer = correctAnswer ?? JSON.stringify((options as Array<{ left: string; right: string }>).map((pair) => ({ [pair.left]: pair.right })));
  } else if (questionType === "ORDERING") {
    const normalized = normalizeOrdering(options, correctAnswer);
    options = normalized.options;
    correctAnswer = normalized.correctAnswer;
  }

  const validation = validateTeacherQuestionMaster({
    questionType,
    questionText,
    options,
    correctAnswer,
    explanation,
    marks,
    difficulty,
    bloomLevel,
    competency,
    tags,
  });
  if (!validation.ok) fail("INVALID_INPUT", validation.errors.join(" "), 400);

  return {
    sectionSubjectId: valueOrExisting(raw.sectionSubjectId, "Section subject", existing?.sectionSubjectId),
    bookId: valueOrExisting(raw.bookId, "Book", existing?.bookId),
    chapterId: valueOrExisting(raw.chapterId, "Chapter", existing?.chapterId),
    moduleId: valueOrExisting(raw.moduleId, "Module", existing?.moduleId),
    imageResourceId: valueOrExisting(raw.imageResourceId, "Image resource", existing?.imageResourceId),
    questionType,
    questionText,
    options,
    correctAnswer,
    explanation,
    marks,
    difficulty,
    bloomLevel,
    competency,
    tags,
  };
}

export function validateTeacherQuestionPayload(input: unknown, existing?: StoredQuestionSemantics) {
  return normalizeQuestionSemantics(record(input), existing);
}

export function canonicalizeTeacherQuestionHierarchy(
  input: Pick<StoredQuestionSemantics, "bookId" | "chapterId" | "moduleId">,
  resolved: { chapter?: { bookId: string } | null; module?: { bookId: string; chapterId: string } | null },
) {
  const bookId = resolved.module?.bookId ?? resolved.chapter?.bookId ?? input.bookId;
  const chapterId = resolved.module?.chapterId ?? input.chapterId ?? null;
  if (input.bookId && bookId && input.bookId !== bookId) fail("INVALID_CONTEXT", "The selected book does not match the curriculum hierarchy.", 400);
  if (input.chapterId && resolved.module && input.chapterId !== resolved.module.chapterId) {
    fail("INVALID_CONTEXT", "The selected chapter does not match the module.", 400);
  }
  return { bookId: bookId ?? null, chapterId, moduleId: input.moduleId };
}

export function validateTeacherQuestionImageResource(input: {
  exists: boolean;
  publisherMatches: boolean;
  teacherCanUse: boolean;
  type?: string;
}) {
  if (!input.exists || !input.publisherMatches || !input.teacherCanUse) {
    fail("INVALID_RESOURCE", "The selected image resource is not available to this teacher.", 400);
  }
  if (input.type !== ResourceType.IMAGE) fail("INVALID_RESOURCE", "Question images must use an IMAGE resource.", 400);
}

export function canTransitionTeacherQuestionStatus(
  current: TeacherQuestionStatusValue,
  action: "ACTIVATE" | "ARCHIVE" | "RESTORE_DRAFT" | "RESTORE_ACTIVE",
) {
  return (
    (action === "ACTIVATE" && current === "DRAFT") ||
    (action === "ARCHIVE" && (current === "DRAFT" || current === "ACTIVE")) ||
    (action === "RESTORE_DRAFT" && current === "ARCHIVED") ||
    (action === "RESTORE_ACTIVE" && current === "ARCHIVED")
  );
}

function sourceHash(value: StoredQuestionSemantics) {
  return teacherQuestionSourceHash(value);
}

function questionData(value: StoredQuestionSemantics) {
  return {
    sectionSubjectId: value.sectionSubjectId,
    bookId: value.bookId,
    chapterId: value.chapterId,
    moduleId: value.moduleId,
    imageResourceId: value.imageResourceId,
    questionType: value.questionType,
    questionText: value.questionText,
    options: value.options === null ? Prisma.JsonNull : value.options as Prisma.InputJsonValue,
    correctAnswer: value.correctAnswer,
    explanation: value.explanation,
    marks: value.marks,
    difficulty: value.difficulty,
    bloomLevel: value.bloomLevel,
    competency: value.competency,
    tags: value.tags,
  };
}

function asStoredSemantics(question: TeacherQuestionRow): StoredQuestionSemantics {
  return {
    sectionSubjectId: question.sectionSubjectId,
    bookId: question.bookId,
    chapterId: question.chapterId,
    moduleId: question.moduleId,
    imageResourceId: question.imageResourceId,
    questionType: question.questionType,
    questionText: question.questionText,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    marks: question.marks,
    difficulty: question.difficulty,
    bloomLevel: question.bloomLevel,
    competency: question.competency,
    tags: question.tags,
  };
}

function view(question: TeacherQuestionRow) {
  return {
    id: question.id,
    ownership: { publisherId: question.publisherId, schoolId: question.schoolId, teacherId: question.teacherId },
    context: {
      sectionSubjectId: question.sectionSubjectId,
      bookId: question.bookId,
      chapterId: question.chapterId,
      moduleId: question.moduleId,
    },
    question: {
      questionType: question.questionType,
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      marks: question.marks,
      difficulty: question.difficulty,
      bloomLevel: question.bloomLevel,
      competency: question.competency,
      tags: question.tags,
    },
    imageResource: question.imageResource,
    status: question.status,
    revision: question.revision,
    sourceHash: question.sourceHash,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
    normalized: adaptTeacherQuestion(question),
  };
}

async function resolveActor(userId: string): Promise<TeacherQuestionActor> {
  if (!userId.trim()) fail("UNAUTHENTICATED", "Sign in as a teacher to use the Question Bank.", 401);
  const teacher = await prisma.teacher.findFirst({
    where: {
      userId,
      active: true,
      status: "APPROVED",
      school: { status: "APPROVED", publisher: { active: true } },
    },
    include: {
      school: true,
      schoolMemberships: { where: { active: true, status: "ACTIVE" }, select: { schoolId: true } },
    },
  });
  if (!teacher?.schoolId || !teacher.school?.publisherId || !teacher.schoolMemberships.some((membership) => membership.schoolId === teacher.schoolId)) {
    fail("FORBIDDEN", "Teacher Question Bank access is unavailable.", 403);
  }
  const subscription = await prisma.schoolAccessSubscription.findUnique({ where: { schoolId: teacher.schoolId } });
  const decision = subscription && subscription.publisherId === teacher.school.publisherId
    ? decideSchoolAccess({ subscription, capability: "TEACHER_DASHBOARD", role: "TEACHER" })
    : { allowed: false as const };
  if (!decision.allowed) fail("FORBIDDEN", "Teacher Question Bank access is unavailable.", 403);
  return { userId, teacherId: teacher.id, schoolId: teacher.schoolId, publisherId: teacher.school.publisherId };
}

function ownershipWhere(actor: TeacherQuestionActor) {
  return { publisherId: actor.publisherId, schoolId: actor.schoolId, teacherId: actor.teacherId };
}

async function resolveContext(actor: TeacherQuestionActor, semantics: StoredQuestionSemantics) {
  if (semantics.sectionSubjectId) {
    const sectionSubject = await prisma.sectionSubject.findFirst({
      where: {
        id: semantics.sectionSubjectId,
        active: true,
        section: {
          active: true,
          schoolClass: { schoolId: actor.schoolId, active: true, academicYear: { active: true, current: true } },
        },
      },
      select: { id: true, sectionId: true, subjectId: true },
    });
    if (!sectionSubject) fail("INVALID_CONTEXT", "The selected subject is not part of the current school structure.", 400);
    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        teacherId: actor.teacherId,
        schoolId: actor.schoolId,
        sectionId: sectionSubject.sectionId,
        active: true,
        academicYear: { active: true, current: true },
        OR: [
          { type: "CLASS_TEACHER" },
          { type: "SUBJECT_TEACHER", subjectId: sectionSubject.subjectId },
        ],
      },
      select: { id: true },
    });
    if (!assignment) fail("INVALID_CONTEXT", "The selected subject is not assigned to this teacher.", 400);
  }

  const entitledBookWhere = {
    publisherId: actor.publisherId,
    archived: false,
    schoolEntitlements: { some: { schoolId: actor.schoolId, publisherId: actor.publisherId, status: "ACTIVE" } },
  } satisfies Prisma.BookWhereInput;

  const moduleRecord = semantics.moduleId ? await prisma.bookModule.findFirst({
    where: { id: semantics.moduleId, book: entitledBookWhere },
    select: { id: true, bookId: true, chapterId: true },
  }) : null;
  if (semantics.moduleId && !moduleRecord) fail("INVALID_CONTEXT", "The selected module is not available for this school.", 400);

  const chapter = semantics.chapterId ? await prisma.bookChapter.findFirst({
    where: { id: semantics.chapterId, book: entitledBookWhere },
    select: { id: true, bookId: true },
  }) : null;
  if (semantics.chapterId && !chapter) fail("INVALID_CONTEXT", "The selected chapter is not available for this school.", 400);

  const hierarchy = canonicalizeTeacherQuestionHierarchy(semantics, { chapter, module: moduleRecord });
  if (hierarchy.bookId) {
    const book = await prisma.book.findFirst({ where: { id: hierarchy.bookId, ...entitledBookWhere }, select: { id: true } });
    if (!book) fail("INVALID_CONTEXT", "The selected book is not available for this school.", 400);
  }

  const imageResourceId = semantics.imageResourceId;
  if (imageResourceId) {
    const scope = await getTeacherResourceScope(actor.userId);
    const resource = scope ? await prisma.resource.findFirst({
      where: { id: imageResourceId, type: ResourceType.IMAGE, ...scope.where },
      select: { id: true, publisherId: true, type: true },
    }) : null;
    validateTeacherQuestionImageResource({
      exists: Boolean(resource),
      publisherMatches: resource?.publisherId === actor.publisherId,
      teacherCanUse: Boolean(resource),
      type: resource?.type,
    });
  }
  if (semantics.questionType === "PICTURE_BASED" && !imageResourceId) {
    fail("INVALID_RESOURCE", "PICTURE_BASED questions require an IMAGE resource.", 400);
  }

  return { ...semantics, ...hierarchy };
}

function expectedRevision(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    fail("INVALID_INPUT", "expectedRevision must be a positive whole number.", 400);
  }
  return value;
}

function listValue(value: unknown, fallback: number, maximum: number) {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > maximum) {
    fail("INVALID_INPUT", "Pagination values are invalid.", 400);
  }
  return value;
}

function listTags(value: unknown) {
  if (value === undefined) return undefined;
  const tags = Array.isArray(value) ? value : [value];
  if (tags.some((tag) => typeof tag !== "string" || !tag.trim())) fail("INVALID_INPUT", "Tags must be text.", 400);
  return [...new Set(tags.map((tag) => (tag as string).trim()))];
}

export function buildTeacherQuestionListWhere(actor: Pick<TeacherQuestionActor, "publisherId" | "schoolId" | "teacherId">, input: TeacherQuestionListInput) {
  const status = input.status === undefined ? undefined : String(input.status).trim().toUpperCase();
  if (status !== undefined && !TEACHER_QUESTION_STATUSES.includes(status as TeacherQuestionStatusValue)) {
    fail("INVALID_INPUT", "Unknown question status.", 400);
  }
  const questionType = input.questionType === undefined ? undefined : normalizeQuestionType(String(input.questionType));
  if (questionType === "UNSUPPORTED") fail("INVALID_INPUT", "Unknown question type.", 400);
  const search = input.search === undefined ? undefined : text(input.search, "Search", false) ?? undefined;
  return {
    ...ownershipWhere(actor as TeacherQuestionActor),
    ...(status ? { status: status as TeacherQuestionStatus } : { status: { not: TeacherQuestionStatus.ARCHIVED } }),
    ...(questionType ? { questionType } : {}),
    ...(input.difficulty === undefined ? {} : { difficulty: text(input.difficulty, "Difficulty", false) ?? undefined }),
    ...(input.sectionSubjectId === undefined ? {} : { sectionSubjectId: optionalId(input.sectionSubjectId, "Section subject") ?? undefined }),
    ...(input.bookId === undefined ? {} : { bookId: optionalId(input.bookId, "Book") ?? undefined }),
    ...(input.chapterId === undefined ? {} : { chapterId: optionalId(input.chapterId, "Chapter") ?? undefined }),
    ...(input.moduleId === undefined ? {} : { moduleId: optionalId(input.moduleId, "Module") ?? undefined }),
    ...(listTags(input.tags)?.length ? { tags: { hasSome: listTags(input.tags) } } : {}),
    ...(search ? { OR: [{ questionText: { contains: search, mode: "insensitive" as const } }, { tags: { has: search } }] } : {}),
  } satisfies Prisma.TeacherQuestionWhereInput;
}

async function ownedQuestion(actor: TeacherQuestionActor, id: string) {
  if (!id.trim()) fail("NOT_FOUND", "Question not found.", 404);
  const question = await prisma.teacherQuestion.findFirst({ where: { id, ...ownershipWhere(actor) }, select: questionSelect });
  if (!question) fail("NOT_FOUND", "Question not found.", 404);
  return question;
}

export async function createTeacherQuestion(userId: string, input: unknown) {
  const actor = await resolveActor(userId);
  const semantics = await resolveContext(actor, validateTeacherQuestionPayload(input));
  const question = await prisma.teacherQuestion.create({
    data: {
      ...ownershipWhere(actor),
      ...questionData(semantics),
      status: TeacherQuestionStatus.DRAFT,
      revision: 1,
      sourceHash: sourceHash(semantics),
    },
    select: questionSelect,
  });
  return view(question);
}

export async function updateTeacherQuestion(userId: string, questionId: string, input: unknown) {
  const actor = await resolveActor(userId);
  const body = record(input);
  const question = await ownedQuestion(actor, questionId);
  const revision = expectedRevision(body.expectedRevision);
  if (question.revision !== revision) fail("REVISION_CONFLICT", "This question was changed by another editor.", 409, { revision: question.revision });
  const semantics = await resolveContext(actor, validateTeacherQuestionPayload(body, asStoredSemantics(question)));
  const nextHash = sourceHash(semantics);
  if (nextHash === question.sourceHash) return view(question);
  const updated = await prisma.teacherQuestion.updateMany({
    where: { id: question.id, ...ownershipWhere(actor), revision },
    data: { ...questionData(semantics), sourceHash: nextHash, revision: { increment: 1 } },
  });
  if (updated.count !== 1) {
    const current = await prisma.teacherQuestion.findFirst({ where: { id: question.id, ...ownershipWhere(actor) }, select: { revision: true } });
    fail("REVISION_CONFLICT", "This question was changed by another editor.", 409, { revision: current?.revision ?? null });
  }
  return view(await ownedQuestion(actor, question.id));
}

export async function transitionTeacherQuestion(
  userId: string,
  questionId: string,
  action: "ACTIVATE" | "ARCHIVE" | "RESTORE_DRAFT" | "RESTORE_ACTIVE",
  expected?: unknown,
) {
  const actor = await resolveActor(userId);
  const question = await ownedQuestion(actor, questionId);
  if (expected !== undefined && question.revision !== expectedRevision(expected)) {
    fail("REVISION_CONFLICT", "This question was changed by another editor.", 409, { revision: question.revision });
  }
  const current = question.status as TeacherQuestionStatusValue;
  if (!canTransitionTeacherQuestionStatus(current, action)) {
    fail("INVALID_TRANSITION", "This lifecycle transition is not allowed.", 400);
  }
  const status = action === "ACTIVATE" || action === "RESTORE_ACTIVE"
    ? TeacherQuestionStatus.ACTIVE
    : action === "ARCHIVE"
      ? TeacherQuestionStatus.ARCHIVED
      : TeacherQuestionStatus.DRAFT;
  const updated = await prisma.teacherQuestion.updateMany({
    where: { id: question.id, ...ownershipWhere(actor), status: question.status },
    data: { status },
  });
  if (updated.count !== 1) fail("REVISION_CONFLICT", "This question was changed by another editor.", 409);
  return view(await ownedQuestion(actor, question.id));
}

export async function getTeacherQuestion(userId: string, questionId: string) {
  const actor = await resolveActor(userId);
  return view(await ownedQuestion(actor, questionId));
}

export async function listTeacherQuestions(userId: string, input: TeacherQuestionListInput = {}) {
  const actor = await resolveActor(userId);
  const page = listValue(input.page, 1, 1000000);
  const pageSize = listValue(input.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const where = buildTeacherQuestionListWhere(actor, input);
  const [questions, total] = await prisma.$transaction([
    prisma.teacherQuestion.findMany({
      where,
      select: questionSelect,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.teacherQuestion.count({ where }),
  ]);
  return { items: questions.map(view), page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export function teacherQuestionErrorResponse(error: unknown) {
  if (error instanceof TeacherQuestionBankError) {
    return { status: error.status, body: { ok: false, code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } };
  }
  return { status: 500, body: { ok: false, code: "INTERNAL_ERROR", message: "Teacher Question Bank is temporarily unavailable." } };
}