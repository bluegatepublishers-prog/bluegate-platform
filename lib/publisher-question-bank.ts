import "server-only";

import { Prisma, ResourceType } from "@prisma/client";

import { adaptBookQuestion, normalizeQuestionType } from "@/lib/normalized-question";
import { parseFillBlankAnswerConfig } from "@/lib/question-response-evaluator";
import { prisma } from "@/lib/prisma";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

export const PUBLISHER_QUESTION_STATUSES = ["DRAFT", "APPROVED", "ARCHIVED"] as const;
export type PublisherQuestionStatus = (typeof PUBLISHER_QUESTION_STATUSES)[number];

export class PublisherQuestionBankError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "INVALID_INPUT" | "INVALID_CONTEXT" | "INVALID_RESOURCE" | "INVALID_TRANSITION",
    readonly status: number,
  ) {
    super(message);
  }
}

export type PublisherQuestionAuthoringInput = {
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

export type PublisherQuestionListInput = {
  bookId?: unknown;
  classId?: unknown;
  subjectId?: unknown;
  chapterId?: unknown;
  moduleId?: unknown;
  questionType?: unknown;
  difficulty?: unknown;
  status?: unknown;
  tags?: unknown;
  search?: unknown;
  page?: unknown;
  pageSize?: unknown;
};

type ChoiceOption = { id: string; text: string };
type QuestionSemantics = {
  bookId: string;
  chapterId: string;
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

const questionSelect = {
  id: true,
  bookId: true,
  chapterId: true,
  exerciseId: true,
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
  displayOrder: true,
  archived: true,
  approved: true,
  createdAt: true,
  updatedAt: true,
  book: { select: { id: true, title: true, class: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } } } },
  chapter: { select: { id: true, title: true, chapterNumber: true } },
  module: { select: { id: true, title: true } },
  imageResource: { select: { id: true, title: true, type: true, mimeType: true, thumbnail: true } },
} satisfies Prisma.BookQuestionSelect;

type QuestionRow = Prisma.BookQuestionGetPayload<{ select: typeof questionSelect }>;

function fail(code: PublisherQuestionBankError["code"], message: string, status: number): never {
  throw new PublisherQuestionBankError(message, code, status);
}

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("INVALID_INPUT", "The request body must be an object.", 400);
  return value as Record<string, unknown>;
}

function optionalId(value: unknown, label: string, required = false): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null && !required) return null;
  if (typeof value !== "string" || !value.trim()) fail("INVALID_INPUT", `${label} is required.`, 400);
  return value.trim();
}

function text(value: unknown, label: string, required: boolean, fallback?: string | null) {
  if (value === undefined) return fallback ?? null;
  if (value === null) return required ? fail("INVALID_INPUT", `${label} is required.`, 400) : null;
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

function tags(value: unknown, fallback: string[]) {
  if (value === undefined) return fallback;
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) fail("INVALID_INPUT", "Tags must be an array of text values.", 400);
  const result = [...new Set(value.map((entry) => entry.trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  if (result.length > 40 || result.some((entry) => entry.length > 80)) fail("INVALID_INPUT", "Use at most 40 tags of up to 80 characters.", 400);
  return result;
}

function json(value: unknown) {
  if (value === undefined) return undefined;
  try { return JSON.parse(JSON.stringify(value)) as unknown; }
  catch { return fail("INVALID_INPUT", "Options must be JSON-compatible.", 400); }
}

function choices(value: unknown, label: string): ChoiceOption[] {
  if (!Array.isArray(value) || value.length < 2) fail("INVALID_INPUT", `${label} requires at least two options.`, 400);
  const result = value.map((entry, index) => {
    if (typeof entry === "string" && entry.trim()) return { id: `option-${index + 1}`, text: entry.trim() };
    const item = record(entry);
    const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : `option-${index + 1}`;
    const valueText = [item.text, item.label, item.value].find((candidate) => typeof candidate === "string" && candidate.trim());
    if (typeof valueText !== "string") fail("INVALID_INPUT", `${label} options require text.`, 400);
    return { id, text: valueText.trim() };
  });
  if (new Set(result.map((item) => item.id.toLocaleLowerCase("en"))).size !== result.length) fail("INVALID_INPUT", `${label} option identifiers must be unique.`, 400);
  return result;
}

function optionId(options: ChoiceOption[], value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) fail("INVALID_INPUT", `${label} requires an answer.`, 400);
  const candidate = value.trim().toLocaleLowerCase("en");
  const found = options.find((option) => option.id.toLocaleLowerCase("en") === candidate || option.text.toLocaleLowerCase("en") === candidate);
  if (!found) fail("INVALID_INPUT", `${label} answer must reference an option.`, 400);
  return found.id;
}

function answerList(value: unknown, label: string) {
  const parsed = typeof value === "string" ? (() => { try { return JSON.parse(value) as unknown; } catch { return [value]; } })() : value;
  if (!Array.isArray(parsed) || !parsed.length || parsed.some((entry) => typeof entry !== "string" || !entry.trim())) fail("INVALID_INPUT", `${label} requires one or more answers.`, 400);
  return parsed.map((entry) => (entry as string).trim());
}

function matchPairs(value: unknown) {
  if (!Array.isArray(value) || !value.length) fail("INVALID_INPUT", "MATCH requires one or more left/right pairs.", 400);
  const pairs = value.map((entry) => {
    const item = record(entry);
    if (typeof item.left !== "string" || !item.left.trim() || typeof item.right !== "string" || !item.right.trim()) fail("INVALID_INPUT", "MATCH pairs require non-empty left and right values.", 400);
    return { left: item.left.trim(), right: item.right.trim() };
  });
  if (new Set(pairs.map((item) => item.left.toLocaleLowerCase("en"))).size !== pairs.length) fail("INVALID_INPUT", "MATCH left values must be unique.", 400);
  return pairs;
}

function normalizeSemantics(input: unknown, existing?: QuestionSemantics): QuestionSemantics {
  const raw = record(input);
  const rawType = raw.questionType === undefined ? existing?.questionType : raw.questionType;
  if (typeof rawType !== "string" || !rawType.trim()) fail("INVALID_INPUT", "Question type is required.", 400);
  const questionType = normalizeQuestionType(rawType);
  if (questionType === "UNSUPPORTED") fail("INVALID_INPUT", "Choose a supported question type.", 400);
  const bookId = optionalId(raw.bookId, "Book", true) ?? existing?.bookId;
  const chapterId = optionalId(raw.chapterId, "Chapter", true) ?? existing?.chapterId;
  if (!bookId || !chapterId) fail("INVALID_INPUT", "Book and chapter are required.", 400);
  const moduleId = raw.moduleId === undefined ? existing?.moduleId ?? null : optionalId(raw.moduleId, "Module") ?? null;
  const imageResourceId = raw.imageResourceId === undefined ? existing?.imageResourceId ?? null : optionalId(raw.imageResourceId, "Image resource") ?? null;
  const questionText = text(raw.questionText, "Question text", true, existing?.questionText) as string;
  const marks = integer(raw.marks, existing?.marks ?? 1);
  const difficulty = text(raw.difficulty, "Difficulty", false, existing?.difficulty ?? "MEDIUM") ?? "MEDIUM";
  const bloomLevel = text(raw.bloomLevel, "Bloom level", false, existing?.bloomLevel) ?? null;
  const competency = text(raw.competency, "Competency", false, existing?.competency) ?? null;
  const explanation = text(raw.explanation, "Explanation", false, existing?.explanation) ?? null;
  const normalizedTags = tags(raw.tags, existing?.tags ?? []);
  let options = raw.options === undefined ? existing?.options ?? null : json(raw.options) ?? null;
  let correctAnswer = text(raw.correctAnswer, "Correct answer", false, existing?.correctAnswer) ?? null;

  if (questionType === "MCQ") { options = choices(options, "MCQ"); correctAnswer = optionId(options as ChoiceOption[], correctAnswer, "MCQ"); }
  else if (questionType === "MULTIPLE_SELECT") { options = choices(options, "MULTIPLE_SELECT"); correctAnswer = JSON.stringify([...new Set(answerList(correctAnswer, "MULTIPLE_SELECT").map((entry) => optionId(options as ChoiceOption[], entry, "MULTIPLE_SELECT")))]); }
  else if (questionType === "TRUE_FALSE") { const answer = correctAnswer?.toLocaleLowerCase("en"); if (answer !== "true" && answer !== "false") fail("INVALID_INPUT", "TRUE_FALSE requires a true or false answer.", 400); correctAnswer = answer; options = [{ id: "true", text: "True" }, { id: "false", text: "False" }]; }
  else if (questionType === "FILL_BLANK") { if (!correctAnswer) fail("INVALID_INPUT", "FILL_BLANK requires an expected answer.", 400); try { options = parseFillBlankAnswerConfig(options); } catch (error) { fail("INVALID_INPUT", error instanceof Error ? error.message : "Fill Blank options are invalid.", 400); } }
  else if (questionType === "MATCH") { options = matchPairs(options); correctAnswer = correctAnswer ?? JSON.stringify((options as Array<{ left: string; right: string }>).map((pair) => ({ [pair.left]: pair.right }))); }
  else if (questionType === "ORDERING") { options = choices(options, "ORDERING"); const ordered = answerList(correctAnswer, "ORDERING").map((entry) => optionId(options as ChoiceOption[], entry, "ORDERING")); if (new Set(ordered).size !== (options as ChoiceOption[]).length || ordered.length !== (options as ChoiceOption[]).length) fail("INVALID_INPUT", "ORDERING answers must contain every option exactly once.", 400); correctAnswer = JSON.stringify(ordered); }
  if (questionType === "PICTURE_BASED" && !imageResourceId) fail("INVALID_RESOURCE", "PICTURE_BASED requires an IMAGE resource.", 400);

  return { bookId, chapterId, moduleId, imageResourceId, questionType, questionText, options, correctAnswer, explanation, marks, difficulty, bloomLevel, competency, tags: normalizedTags };
}

export function validatePublisherQuestionPayload(input: unknown, existing?: QuestionSemantics) {
  return normalizeSemantics(input, existing);
}

function data(value: QuestionSemantics) {
  return { ...value, options: value.options === null ? Prisma.JsonNull : value.options as Prisma.InputJsonValue };
}

function stored(question: QuestionRow): QuestionSemantics {
  return { bookId: question.bookId, chapterId: question.chapterId, moduleId: question.moduleId, imageResourceId: question.imageResourceId, questionType: question.questionType, questionText: question.questionText, options: question.options, correctAnswer: question.correctAnswer, explanation: question.explanation, marks: question.marks, difficulty: question.difficulty, bloomLevel: question.bloomLevel, competency: question.competency, tags: question.tags };
}

function status(question: Pick<QuestionRow, "archived" | "approved">): PublisherQuestionStatus {
  return question.archived ? "ARCHIVED" : question.approved ? "APPROVED" : "DRAFT";
}

function view(question: QuestionRow) {
  return {
    id: question.id,
    context: { bookId: question.bookId, chapterId: question.chapterId, moduleId: question.moduleId, book: question.book, chapter: question.chapter, module: question.module },
    question: { exerciseId: question.exerciseId, questionType: question.questionType, questionText: question.questionText, options: question.options, correctAnswer: question.correctAnswer, explanation: question.explanation, marks: question.marks, difficulty: question.difficulty, bloomLevel: question.bloomLevel, competency: question.competency, tags: question.tags },
    imageResource: question.imageResource,
    status: status(question),
    approved: question.approved,
    archived: question.archived,
    updatedAt: question.updatedAt,
    createdAt: question.createdAt,
    normalized: adaptBookQuestion(question),
  };
}

export function publisherQuestionOwnershipWhere(publisherId: string) {
  return { book: { publisherId } } satisfies Prisma.BookQuestionWhereInput;
}

async function assertContext(publisherId: string, semantics: QuestionSemantics) {
  const [chapter, module, resource] = await Promise.all([
    prisma.bookChapter.findFirst({ where: { id: semantics.chapterId, bookId: semantics.bookId, book: { publisherId } }, select: { id: true } }),
    semantics.moduleId ? prisma.bookModule.findFirst({ where: { id: semantics.moduleId, bookId: semantics.bookId, chapterId: semantics.chapterId, archived: false }, select: { id: true } }) : Promise.resolve(null),
    semantics.imageResourceId ? prisma.resource.findFirst({ where: { id: semantics.imageResourceId, publisherId, type: ResourceType.IMAGE, archived: false, OR: [{ bookId: semantics.bookId }, { bookId: null }] }, select: { id: true } }) : Promise.resolve(null),
  ]);
  if (!chapter) fail("INVALID_CONTEXT", "The selected chapter is not owned by this publisher book.", 400);
  if (semantics.moduleId && !module) fail("INVALID_CONTEXT", "The selected module is not part of this book chapter.", 400);
  if (semantics.imageResourceId && !resource) fail("INVALID_RESOURCE", "The selected IMAGE resource is not available to this publisher book.", 400);
}

function page(value: unknown, fallback: number) {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function listTags(value: unknown) {
  if (value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.filter((entry): entry is string => typeof entry === "string").flatMap((entry) => entry.split(",")).map((entry) => entry.trim()).filter(Boolean).slice(0, 40);
}

export async function listPublisherQuestions(publisherId: string, input: PublisherQuestionListInput = {}) {
  const statusFilter = typeof input.status === "string" ? input.status.toUpperCase() : "";
  if (statusFilter && !PUBLISHER_QUESTION_STATUSES.includes(statusFilter as PublisherQuestionStatus)) fail("INVALID_INPUT", "Unknown question status.", 400);
  const questionType = typeof input.questionType === "string" && input.questionType.trim() ? normalizeQuestionType(input.questionType) : null;
  if (questionType === "UNSUPPORTED") fail("INVALID_INPUT", "Unknown question type.", 400);
  const search = typeof input.search === "string" ? input.search.trim() : "";
  const tagsFilter = listTags(input.tags);
  const where: Prisma.BookQuestionWhereInput = {
    ...publisherQuestionOwnershipWhere(publisherId),
    ...(typeof input.bookId === "string" && input.bookId.trim() ? { bookId: input.bookId.trim() } : {}),
    ...(typeof input.classId === "string" && input.classId.trim() ? { book: { publisherId, classId: input.classId.trim() } } : {}),
    ...(typeof input.subjectId === "string" && input.subjectId.trim() ? { book: { publisherId, subjectId: input.subjectId.trim() } } : {}),
    ...(typeof input.chapterId === "string" && input.chapterId.trim() ? { chapterId: input.chapterId.trim() } : {}),
    ...(typeof input.moduleId === "string" && input.moduleId.trim() ? { moduleId: input.moduleId.trim() } : {}),
    ...(questionType ? { questionType } : {}),
    ...(typeof input.difficulty === "string" && input.difficulty.trim() ? { difficulty: input.difficulty.trim() } : {}),
    ...(statusFilter === "ARCHIVED" ? { archived: true } : statusFilter === "APPROVED" ? { archived: false, approved: true } : statusFilter === "DRAFT" ? { archived: false, approved: false } : { archived: false }),
    ...(tagsFilter.length ? { tags: { hasSome: tagsFilter } } : {}),
    ...(search ? { OR: [{ questionText: { contains: search, mode: "insensitive" } }, { tags: { has: search } }] } : {}),
  };
  const currentPage = page(input.page, 1);
  const pageSize = Math.min(page(input.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const [total, rows] = await Promise.all([
    prisma.bookQuestion.count({ where }),
    prisma.bookQuestion.findMany({ where, select: questionSelect, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], skip: (currentPage - 1) * pageSize, take: pageSize }),
  ]);
  return { items: rows.map(view), total, page: currentPage, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function createPublisherQuestion(publisherId: string, input: PublisherQuestionAuthoringInput) {
  const semantics = normalizeSemantics(input);
  await assertContext(publisherId, semantics);
  const row = await prisma.bookQuestion.create({ data: { ...data(semantics), approved: false, archived: false }, select: questionSelect });
  return view(row);
}

export async function getPublisherQuestion(publisherId: string, id: string) {
  const row = await prisma.bookQuestion.findFirst({ where: { id, ...publisherQuestionOwnershipWhere(publisherId) }, select: questionSelect });
  if (!row) fail("NOT_FOUND", "Question not found.", 404);
  return view(row);
}

export async function updatePublisherQuestion(publisherId: string, id: string, input: PublisherQuestionAuthoringInput) {
  const current = await prisma.bookQuestion.findFirst({ where: { id, ...publisherQuestionOwnershipWhere(publisherId) }, select: questionSelect });
  if (!current) fail("NOT_FOUND", "Question not found.", 404);
  const semantics = normalizeSemantics(input, stored(current));
  await assertContext(publisherId, semantics);
  const row = await prisma.bookQuestion.update({ where: { id: current.id }, data: data(semantics), select: questionSelect });
  return view(row);
}

export function canTransitionPublisherQuestion(question: { approved: boolean; archived: boolean }, action: "APPROVE" | "RETURN_DRAFT" | "ARCHIVE" | "RESTORE") {
  return (action === "APPROVE" && !question.archived && !question.approved) ||
    (action === "RETURN_DRAFT" && !question.archived && question.approved) ||
    (action === "ARCHIVE" && !question.archived) ||
    (action === "RESTORE" && question.archived);
}

export async function transitionPublisherQuestion(publisherId: string, id: string, action: "APPROVE" | "RETURN_DRAFT" | "ARCHIVE" | "RESTORE") {
  const row = await prisma.bookQuestion.findFirst({ where: { id, ...publisherQuestionOwnershipWhere(publisherId) }, select: questionSelect });
  if (!row) fail("NOT_FOUND", "Question not found.", 404);
  if (!canTransitionPublisherQuestion(row, action)) fail("INVALID_TRANSITION", "This lifecycle action is not available for the question.", 400);
  const next = action === "APPROVE" ? { approved: true } : action === "RETURN_DRAFT" ? { approved: false } : action === "ARCHIVE" ? { archived: true, approved: false } : { archived: false };
  return view(await prisma.bookQuestion.update({ where: { id: row.id }, data: next, select: questionSelect }));
}

export async function loadPublisherQuestionBankOptions(publisherId: string, bookId: string) {
  const book = await prisma.book.findFirst({ where: { id: bookId, publisherId }, select: { id: true, title: true, class: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } } } });
  if (!book) fail("NOT_FOUND", "Book not found.", 404);
  const [chapters, modules, images] = await Promise.all([
    prisma.bookChapter.findMany({ where: { bookId, archived: false }, select: { id: true, title: true, chapterNumber: true }, orderBy: [{ chapterNumber: "asc" }, { id: "asc" }] }),
    prisma.bookModule.findMany({ where: { bookId, archived: false }, select: { id: true, chapterId: true, title: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }),
    prisma.resource.findMany({ where: { publisherId, type: ResourceType.IMAGE, archived: false, OR: [{ bookId }, { bookId: null }] }, select: { id: true, title: true, type: true, mimeType: true, thumbnail: true }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 100 }),
  ]);
  return { book, chapters, modules, images };
}

export function publisherQuestionErrorResponse(error: unknown) {
  if (error instanceof PublisherQuestionBankError) return { status: error.status, body: { ok: false, code: error.code, message: error.message } };
  return { status: 500, body: { ok: false, code: "INTERNAL", message: "Question Bank is unavailable." } };
}
