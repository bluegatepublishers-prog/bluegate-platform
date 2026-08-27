import type { PrismaClient } from "@prisma/client";

import type { BookQuestionSource } from "@/lib/normalized-question";
import { prisma } from "@/lib/prisma";
import { createSmartBookStorageReference } from "@/lib/smart-book-release-manifest";
import type {
  SmartBookManifestAssessment,
  SmartBookManifestQuestion,
  SmartBookManifestStorageReference,
  SmartBookReleaseManifestV2,
} from "@/lib/smart-book-release-manifest";

export type SmartBookProtectedQuestion = {
  sourceId: string;
  bookId: string;
  chapterId: string;
  moduleId: string | null;
  exerciseId: string | null;
  exerciseGroupId: string | null;
  questionType: string;
  questionText: string;
  options: unknown;
  correctAnswer: string | null;
  explanation: string | null;
  marks: number;
  displayOrder: number;
  imageResourceId: string | null;
  sourceUpdatedAt: string;
};

export type SmartBookProtectedExerciseGroup = {
  sourceId: string;
  exerciseId: string;
  title: string;
  instructions: string | null;
  sortOrder: number;
  active: boolean;
  questionIds: string[];
};

export type SmartBookProtectedExercise = {
  sourceId: string;
  bookId: string;
  chapterId: string;
  moduleId: string | null;
  type: string;
  marks: number | null;
  groups: SmartBookProtectedExerciseGroup[];
};

export type SmartBookProtectedWorksheet = {
  sourceId: string;
  publisherId: string;
  bookId: string;
  chapterId: string;
  moduleId: string | null;
  exerciseId: string | null;
  title: string;
  type: string;
  instructions: string | null;
  totalMarks: number | null;
  allowOnlineAttempt: boolean;
  allowPrint: boolean;
  showAnswersAfterSubmit: boolean;
  sourceUpdatedAt: string;
  questionIds: string[];
  printableResourceId: string | null;
  answerKeyResourceId: string | null;
  answerKeyStorage: SmartBookManifestStorageReference | null;
  supportingResourceIds: string[];
};

export type SmartBookProtectedAssessmentItem = {
  sourceId: string;
  questionId: string;
  position: number;
  question: SmartBookProtectedQuestion;
};

export type SmartBookProtectedAssessment = {
  sourceId: string;
  publisherId: string;
  bookId: string;
  kind: string;
  deliveryMode: string;
  instructions: string | null;
  durationMinutes: number | null;
  totalMarks: number | null;
  allowOnlineAttempt: boolean;
  allowPrint: boolean;
  chapterId: string | null;
  moduleId: string | null;
  unitId: string | null;
  partId: string | null;
  chapterIds: string[];
  sourceUpdatedAt: string;
  sectionInstructions: Array<{ questionType: string; instruction: string }>;
  items: SmartBookProtectedAssessmentItem[];
};

export type SmartBookProtectedReleasePayload = {
  schemaVersion: 1;
  questions: SmartBookProtectedQuestion[];
  exercises: SmartBookProtectedExercise[];
  worksheets: SmartBookProtectedWorksheet[];
  assessments: SmartBookProtectedAssessment[];
};

type ProtectedDatabase = Pick<PrismaClient, "bookQuestion" | "bookExercise" | "bookExerciseQuestionGroup" | "publisherWorksheet" | "publisherAssessment" | "resource">;

export async function buildSmartBookProtectedReleasePayloadFromDatabase(input: {
  publisherId: string;
  bookId: string;
  manifest: SmartBookReleaseManifestV2;
  database?: ProtectedDatabase;
}): Promise<SmartBookProtectedReleasePayload> {
  const database = input.database ?? prisma;
  const worksheetIds = input.manifest.assets.worksheets.map((item) => item.sourceId);
  const assessmentIds = input.manifest.assets.assessments.map((item) => item.sourceId);

  const [worksheets, assessments] = await Promise.all([
    worksheetIds.length
      ? database.publisherWorksheet.findMany({
          where: { id: { in: worksheetIds }, publisherId: input.publisherId, bookId: input.bookId, archivedAt: null, active: true, published: true },
          select: {
            id: true, publisherId: true, bookId: true, chapterId: true, moduleId: true, exerciseId: true,
            title: true, type: true, instructions: true, totalMarks: true, allowOnlineAttempt: true,
            allowPrint: true, showAnswersAfterSubmit: true, updatedAt: true, printableResourceId: true,
            answerKeyResourceId: true, supportingResourceIds: true, items: { orderBy: [{ position: "asc" }, { id: "asc" }], select: { questionId: true } },
          },
        })
      : Promise.resolve([]),
    assessmentIds.length
      ? database.publisherAssessment.findMany({
          where: { id: { in: assessmentIds }, publisherId: input.publisherId, bookId: input.bookId, archivedAt: null, status: "PUBLISHED" },
          select: {
            id: true, publisherId: true, bookId: true, kind: true, deliveryMode: true, instructions: true,
            durationMinutes: true, totalMarks: true, allowOnlineAttempt: true, allowPrint: true, updatedAt: true,
            chapterId: true, moduleId: true, unitId: true, partId: true,
            chapterScopes: { orderBy: [{ position: "asc" }, { id: "asc" }], select: { chapterId: true } },
            sectionInstructions: { orderBy: [{ questionType: "asc" }, { id: "asc" }], select: { questionType: true, instruction: true } },
            items: { orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true, questionId: true, position: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const answerKeyIds = [...new Set(worksheets.map((worksheet) => worksheet.answerKeyResourceId).filter((id): id is string => Boolean(id)))];
  const answerKeyResources = answerKeyIds.length
    ? await database.resource.findMany({ where: { id: { in: answerKeyIds }, publisherId: input.publisherId, archived: false }, select: { id: true, fileUrl: true } })
    : [];
  const answerKeyById = new Map(answerKeyResources.map((resource) => [resource.id, resource]));
  for (const answerKeyId of answerKeyIds) if (!answerKeyById.has(answerKeyId)) throw new Error(`Protected answer-key dependency is unavailable: ${answerKeyId}.`);

  const questionIds = new Set(input.manifest.assets.questions.map((item) => item.sourceId));
  for (const worksheet of worksheets) for (const item of worksheet.items) questionIds.add(item.questionId);
  for (const assessment of assessments) for (const item of assessment.items) questionIds.add(item.questionId);

  const questionRows = questionIds.size
    ? await database.bookQuestion.findMany({
        where: { id: { in: [...questionIds] }, bookId: input.bookId, archived: false, approved: true, book: { publisherId: input.publisherId } },
        select: {
          id: true, bookId: true, chapterId: true, moduleId: true, exerciseId: true, exerciseGroupId: true,
          questionType: true, questionText: true, options: true, correctAnswer: true, explanation: true, marks: true,
          displayOrder: true, imageResourceId: true, updatedAt: true,
        },
      })
    : [];
  const questionById = new Map(questionRows.map((question) => [question.id, question]));
  for (const questionId of questionIds) {
    if (!questionById.has(questionId)) throw new Error(`Protected question dependency is unavailable: ${questionId}.`);
  }

  const questions = questionRows.map(toProtectedQuestion);
  validateSafeQuestionConsistency(input.manifest.assets.questions, questions);

  const exerciseIds = new Set<string>();
  for (const question of questions) if (question.exerciseId) exerciseIds.add(question.exerciseId);
  for (const worksheet of worksheets) if (worksheet.exerciseId) exerciseIds.add(worksheet.exerciseId);

  const exercises = exerciseIds.size
    ? await database.bookExercise.findMany({
        where: { id: { in: [...exerciseIds] }, bookId: input.bookId, archived: false, book: { publisherId: input.publisherId } },
        select: {
          id: true, bookId: true, chapterId: true, moduleId: true, type: true, marks: true,
          questionGroups: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, exerciseId: true, title: true, instructions: true, sortOrder: true, active: true, questions: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }], select: { id: true } } } },
        },
      })
    : [];

  const protectedWorksheets = worksheets.map((worksheet) => ({
    sourceId: worksheet.id, publisherId: worksheet.publisherId, bookId: worksheet.bookId, chapterId: worksheet.chapterId,
    moduleId: worksheet.moduleId, exerciseId: worksheet.exerciseId, title: worksheet.title, type: worksheet.type,
    instructions: worksheet.instructions, totalMarks: worksheet.totalMarks, allowOnlineAttempt: worksheet.allowOnlineAttempt,
    allowPrint: worksheet.allowPrint, showAnswersAfterSubmit: worksheet.showAnswersAfterSubmit, sourceUpdatedAt: worksheet.updatedAt.toISOString(),
    questionIds: worksheet.items.map((item) => item.questionId), printableResourceId: worksheet.printableResourceId,
    answerKeyResourceId: worksheet.answerKeyResourceId,
    answerKeyStorage: worksheet.answerKeyResourceId && answerKeyById.get(worksheet.answerKeyResourceId)?.fileUrl
      ? createSmartBookStorageReference(answerKeyById.get(worksheet.answerKeyResourceId)!.fileUrl!, input.publisherId, "resource-file", null, null, false)
      : null,
    supportingResourceIds: [...worksheet.supportingResourceIds].sort(),
  }));

  const protectedAssessments = assessments.map((assessment) => ({
    sourceId: assessment.id, publisherId: assessment.publisherId, bookId: assessment.bookId, kind: assessment.kind,
    deliveryMode: assessment.deliveryMode, instructions: assessment.instructions, durationMinutes: assessment.durationMinutes,
    totalMarks: assessment.totalMarks, allowOnlineAttempt: assessment.allowOnlineAttempt, allowPrint: assessment.allowPrint,
    chapterId: assessment.chapterId, moduleId: assessment.moduleId, unitId: assessment.unitId, partId: assessment.partId,
    chapterIds: assessment.chapterScopes.map((scope) => scope.chapterId),
    sourceUpdatedAt: assessment.updatedAt.toISOString(), sectionInstructions: assessment.sectionInstructions,
    items: assessment.items.map((item) => ({ sourceId: item.id, questionId: item.questionId, position: item.position, question: toProtectedQuestion(questionById.get(item.questionId)!) })),
  }));

  return {
    schemaVersion: 1,
    questions,
    exercises: exercises.map((exercise) => ({
      sourceId: exercise.id, bookId: exercise.bookId, chapterId: exercise.chapterId, moduleId: exercise.moduleId,
      type: exercise.type, marks: exercise.marks,
      groups: exercise.questionGroups.map((group) => ({ sourceId: group.id, exerciseId: group.exerciseId, title: group.title, instructions: group.instructions, sortOrder: group.sortOrder, active: group.active, questionIds: group.questions.map((question) => question.id) })),
    })),
    worksheets: protectedWorksheets,
    assessments: protectedAssessments,
  };
}

export function toProtectedQuestion(question: {
  id: string; bookId: string; chapterId: string; moduleId: string | null; exerciseId: string | null; exerciseGroupId: string | null;
  questionType: string; questionText: string; options: unknown; correctAnswer: string | null; explanation: string | null;
  marks: number; displayOrder: number; imageResourceId: string | null; updatedAt: Date;
}): SmartBookProtectedQuestion {
  return { sourceId: question.id, bookId: question.bookId, chapterId: question.chapterId, moduleId: question.moduleId, exerciseId: question.exerciseId, exerciseGroupId: question.exerciseGroupId, questionType: question.questionType, questionText: question.questionText, options: question.options, correctAnswer: question.correctAnswer, explanation: question.explanation, marks: question.marks, displayOrder: question.displayOrder, imageResourceId: question.imageResourceId, sourceUpdatedAt: question.updatedAt.toISOString() };
}

export function toBookQuestionSource(question: SmartBookProtectedQuestion): BookQuestionSource {
  return { id: question.sourceId, bookId: question.bookId, chapterId: question.chapterId, moduleId: question.moduleId, imageResourceId: question.imageResourceId, questionType: question.questionType, questionText: question.questionText, options: question.options, correctAnswer: question.correctAnswer, explanation: question.explanation, marks: question.marks };
}

export function parseSmartBookProtectedReleasePayload(value: unknown): SmartBookProtectedReleasePayload {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.questions) || !Array.isArray(value.exercises) || !Array.isArray(value.worksheets) || !Array.isArray(value.assessments)) throw new Error("Protected Smart Book release payload is invalid.");
  const payload = value as unknown as SmartBookProtectedReleasePayload;
  validateProtectedReleasePayload(payload);
  return payload;
}

export function validateSafeQuestionConsistency(safeQuestions: SmartBookManifestQuestion[], protectedQuestions: SmartBookProtectedQuestion[]) {
  const protectedById = new Map(protectedQuestions.map((question) => [question.sourceId, question]));
  for (const safe of safeQuestions) {
    const protectedQuestion = protectedById.get(safe.sourceId);
    if (!protectedQuestion || protectedQuestion.questionType !== safe.questionType || protectedQuestion.questionText !== safe.questionText || protectedQuestion.marks !== safe.marks || protectedQuestion.displayOrder !== safe.displayOrder || protectedQuestion.imageResourceId !== safe.imageResourceId || JSON.stringify(protectedQuestion.options) !== JSON.stringify(safe.options)) throw new Error(`Safe and protected question snapshots disagree for ${safe.sourceId}.`);
  }
}

export function validateSafeAssessmentConsistency(safeAssessments: SmartBookManifestAssessment[], protectedAssessments: SmartBookProtectedAssessment[]) {
  const protectedById = new Map(protectedAssessments.map((assessment) => [assessment.sourceId, assessment]));
  for (const safe of safeAssessments) {
    const protectedAssessment = protectedById.get(safe.sourceId);
    if (!hasCompleteSafeAssessmentExecution(safe)) continue;
    if (
      !protectedAssessment ||
      protectedAssessment.kind !== safe.kind ||
      protectedAssessment.deliveryMode !== safe.deliveryMode ||
      protectedAssessment.instructions !== safe.instructions ||
      protectedAssessment.durationMinutes !== safe.durationMinutes ||
      protectedAssessment.totalMarks !== safe.totalMarks ||
      protectedAssessment.allowOnlineAttempt !== safe.allowOnlineAttempt ||
      protectedAssessment.allowPrint !== safe.allowPrint ||
      protectedAssessment.chapterId !== safe.chapterId ||
      protectedAssessment.moduleId !== safe.moduleId ||
      protectedAssessment.unitId !== safe.unitId ||
      protectedAssessment.partId !== safe.partId ||
      protectedAssessment.sourceUpdatedAt !== safe.sourceUpdatedAt ||
      !sameStrings(protectedAssessment.chapterIds, safe.chapterIds) ||
      !sameStrings(protectedAssessment.items.map((item) => item.sourceId), safe.itemSourceIds) ||
      !sameStrings(protectedAssessment.items.map((item) => item.questionId), safe.questionIds) ||
      JSON.stringify(protectedAssessment.sectionInstructions) !== JSON.stringify(safe.sectionInstructions)
    ) throw new Error(`Safe and protected assessment snapshots disagree for ${safe.sourceId}.`);
  }
  if (safeAssessments.length !== protectedAssessments.length) throw new Error("Safe and protected assessment collections disagree.");
}

export function hasCompleteSafeAssessmentExecution(safe: SmartBookManifestAssessment): safe is SmartBookManifestAssessment & Required<Pick<SmartBookManifestAssessment, "deliveryMode" | "instructions" | "durationMinutes" | "totalMarks" | "allowOnlineAttempt" | "allowPrint" | "chapterId" | "moduleId" | "unitId" | "partId" | "chapterIds" | "sectionInstructions" | "itemSourceIds" | "questionIds">> {
  return ["deliveryMode", "instructions", "durationMinutes", "totalMarks", "allowOnlineAttempt", "allowPrint", "chapterId", "moduleId", "unitId", "partId", "chapterIds", "sectionInstructions", "itemSourceIds", "questionIds"].every((field) => Object.hasOwn(safe, field));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}


function validateProtectedReleasePayload(payload: SmartBookProtectedReleasePayload) {
  const ids = new Set<string>();
  const questionById = new Map<string, SmartBookProtectedQuestion>();
  for (const question of payload.questions) {
    if (!isRecord(question) || typeof question.sourceId !== "string" || !question.sourceId || ids.has(question.sourceId) || typeof question.bookId !== "string" || typeof question.chapterId !== "string" || typeof question.questionType !== "string" || typeof question.questionText !== "string" || typeof question.marks !== "number" || !Number.isInteger(question.marks) || question.marks < 0 || typeof question.displayOrder !== "number" || !Number.isInteger(question.displayOrder) || typeof question.sourceUpdatedAt !== "string") throw new Error("Protected question snapshot is invalid.");
    ids.add(question.sourceId);
    questionById.set(question.sourceId, question);
  }
  for (const worksheet of payload.worksheets) if (!isRecord(worksheet) || typeof worksheet.sourceId !== "string" || typeof worksheet.bookId !== "string" || typeof worksheet.publisherId !== "string" || !Array.isArray(worksheet.questionIds)) throw new Error("Protected worksheet snapshot is invalid.");
  for (const assessment of payload.assessments) {
    if (!isRecord(assessment) || typeof assessment.sourceId !== "string" || typeof assessment.bookId !== "string" || typeof assessment.publisherId !== "string" || typeof assessment.kind !== "string" || typeof assessment.deliveryMode !== "string" || typeof assessment.allowOnlineAttempt !== "boolean" || typeof assessment.allowPrint !== "boolean" || !Array.isArray(assessment.items) || !Array.isArray(assessment.chapterIds) || !Array.isArray(assessment.sectionInstructions)) throw new Error("Protected assessment snapshot is invalid.");
    const itemIds = new Set<string>();
    const questionIds = new Set<string>();
    for (const item of assessment.items) {
      if (!isRecord(item) || typeof item.sourceId !== "string" || !item.sourceId || itemIds.has(item.sourceId) || typeof item.questionId !== "string" || !item.questionId || questionIds.has(item.questionId) || !Number.isInteger(item.position) || !isRecord(item.question) || item.question.sourceId !== item.questionId || item.question.bookId !== assessment.bookId || !sameProtectedQuestion(item.question as SmartBookProtectedQuestion, questionById.get(item.questionId))) throw new Error("Protected assessment item snapshot is invalid.");
      itemIds.add(item.sourceId);
      questionIds.add(item.questionId);
    }
  }
}

function sameProtectedQuestion(left: SmartBookProtectedQuestion, right: SmartBookProtectedQuestion | undefined) {
  return Boolean(right) &&
    left.sourceId === right!.sourceId &&
    left.bookId === right!.bookId &&
    left.chapterId === right!.chapterId &&
    left.moduleId === right!.moduleId &&
    left.exerciseId === right!.exerciseId &&
    left.exerciseGroupId === right!.exerciseGroupId &&
    left.questionType === right!.questionType &&
    left.questionText === right!.questionText &&
    JSON.stringify(left.options) === JSON.stringify(right!.options) &&
    left.correctAnswer === right!.correctAnswer &&
    left.explanation === right!.explanation &&
    left.marks === right!.marks &&
    left.displayOrder === right!.displayOrder &&
    left.imageResourceId === right!.imageResourceId &&
    left.sourceUpdatedAt === right!.sourceUpdatedAt;
}

function sameStrings(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]) && new Set(left).size === left.length;
}
