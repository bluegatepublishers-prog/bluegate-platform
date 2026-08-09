import "server-only";

import {
  Prisma,
  StudentWorkType as PrismaStudentWorkType,
} from "@prisma/client";

import {
  filterDocumentForMode,
} from "@/lib/content-audience";
import { loadPublishedContentDocument } from "@/lib/content-release";
import { loadContentSectionDefinitions } from "@/lib/content-linked-assets";
import { getStudentBook } from "@/lib/student-books";
import { requireStudent } from "@/lib/student-dashboard";
import { prisma } from "@/lib/prisma";
import { resolveStudentAssignmentItemForWork } from "@/lib/assignments/assignment-items";
import {
  normalizeStudentWorkTarget,
  resolveV2StudentWorkTarget,
  STUDENT_WORK_TYPES,
  type ResolvedStudentWorkTarget,
  type StudentWorkTargetInput,
  type StudentWorkTypeName,
  type ValidatedStudentWorkPayload,
  StudentWorkPolicyError,
  assertStudentWorkTargetKeyLength,
  validateStudentWorkPayload,
} from "@/lib/student-work-policy";

type StudentIdentity = Awaited<ReturnType<typeof requireStudent>>;
type StudentWorkRow = Prisma.StudentWorkItemGetPayload<{ select: typeof workItemSelect }>;

const workItemSelect = {
  id: true,
  type: true,
  targetKey: true,
  pageId: true,
  frameId: true,
  childFrameId: true,
  questionId: true,
  segmentId: true,
  chapterId: true,
  moduleId: true,
  assignmentItemId: true,
  masterSourceHash: true,
  targetSourceHash: true,
  payload: true,
  revision: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StudentWorkItemSelect;

export type StudentWorkStatus = "CURRENT" | "STALE" | "MISSING_TARGET";

export class StudentWorkServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "CONTENT_UNAVAILABLE" | "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "SAVE_FAILED" | "INVALID_TARGET" | "INVALID_PAYLOAD",
    public readonly status: number,
  ) {
    super(message);
    this.name = "StudentWorkServiceError";
  }
}

export type StudentWorkItemView = {
  id: string;
  type: StudentWorkTypeName;
  targetKey: string;
  assignmentItemId: string | null;
  target: StudentWorkTargetInput;
  masterSourceHash: string | null;
  targetSourceHash: string | null;
  payload: unknown;
  revision: number;
  status: StudentWorkStatus;
  createdAt: string;
  updatedAt: string;
};

export type StudentWorkMutationSuccess = {
  ok: true;
  status: "SAVED";
  item: StudentWorkItemView;
  attemptNumber?: number;
};

export type StudentWorkConflict = {
  ok: false;
  status: "CONFLICT";
  conflict: {
    revision: number | null;
    item: StudentWorkItemView | null;
  };
};

export type StudentWorkMutationResult = StudentWorkMutationSuccess | StudentWorkConflict;

type StudentWorkScope = {
  identity: StudentIdentity;
  studentId: string;
  schoolId: string;
  publisherId: string;
  bookId: string;
  academicYearId: string;
};

type StudentModuleMetadata = {
  id: string;
  chapterId: string;
};

type StudentModuleDocument = StudentModuleMetadata & {
  document: NonNullable<Awaited<ReturnType<typeof loadPublishedContentDocument>>>;
};

function serviceError(
  message: string,
  code: StudentWorkServiceError["code"],
  status: number,
): StudentWorkServiceError {
  return new StudentWorkServiceError(message, code, status);
}

function unavailable() {
  return serviceError("This content is not available for your account.", "CONTENT_UNAVAILABLE", 404);
}

function invalidTarget() {
  return serviceError("This content target is not available.", "INVALID_TARGET", 404);
}

function invalidPayload() {
  return serviceError("The Student Work payload is invalid.", "INVALID_PAYLOAD", 400);
}

function scopeWhere(scope: StudentWorkScope) {
  return {
    studentId: scope.studentId,
    schoolId: scope.schoolId,
    publisherId: scope.publisherId,
    bookId: scope.bookId,
    academicYearId: scope.academicYearId,
  };
}

export async function resolveStudentWorkContext(bookId: string): Promise<StudentWorkScope> {
  const identity = await requireStudent();
  if (typeof bookId !== "string" || !bookId.trim()) throw unavailable();
  const book = await getStudentBook(bookId);
  if (!book || book.id !== bookId || !identity.student.userId) throw unavailable();
  return {
    identity,
    studentId: identity.student.id,
    schoolId: identity.school.id,
    publisherId: identity.publisher.id,
    bookId,
    academicYearId: identity.academicYear.id,
  };
}

async function loadStudentModuleMetadata(
  scope: StudentWorkScope,
  moduleId: string,
  chapterId?: string,
): Promise<StudentModuleMetadata> {
  const moduleRecord = await prisma.bookModule.findFirst({
    where: {
      id: moduleId,
      bookId: scope.bookId,
      published: true,
      archived: false,
      book: { publisherId: scope.publisherId, published: true, archived: false },
      chapter: { published: true, archived: false },
    },
    select: { id: true, chapterId: true },
  });
  if (!moduleRecord || (chapterId && moduleRecord.chapterId !== chapterId)) throw unavailable();
  return moduleRecord;
}

async function loadStudentModuleDocument(
  scope: StudentWorkScope,
  moduleId: string,
  chapterId?: string,
): Promise<StudentModuleDocument> {
  const moduleRecord = await loadStudentModuleMetadata(scope, moduleId, chapterId);
  const published = await loadPublishedContentDocument({
    publisherId: scope.publisherId,
    bookId: scope.bookId,
    targetType: "MODULE",
    targetId: moduleRecord.id,
  });
  if (!published || published.layoutVersion !== 2 || !published.pageLayout) throw unavailable();
  const sections = await loadContentSectionDefinitions(scope.publisherId, scope.bookId);
  const document = filterDocumentForMode(published, "STUDENT", sections);
  if (document.layoutVersion !== 2 || !document.pageLayout) throw unavailable();
  return { ...moduleRecord, document };
}

function normalizeExpectedRevision(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 1000000000) {
    throw serviceError("The revision is invalid.", "CONFLICT", 409);
  }
  return value;
}

function asPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function isWorkType(value: unknown): value is StudentWorkTypeName {
  return typeof value === "string" && STUDENT_WORK_TYPES.includes(value as StudentWorkTypeName);
}

function validateAnswerOptions(
  payload: ValidatedStudentWorkPayload,
  question: Record<string, unknown> | undefined,
) {
  if (payload.type !== "ANSWER" || !question) return;
  const optionIds = payload.value.optionIds;
  if (!Array.isArray(optionIds)) return;
  const options = [
    ...(Array.isArray(question.options) ? question.options : []),
    ...(Array.isArray(question.assertionOptions) ? question.assertionOptions : []),
  ]
    .filter((option): option is Record<string, unknown> => Boolean(option) && typeof option === "object")
    .map((option) => option.id)
    .filter((id): id is string => typeof id === "string");
  if (optionIds.some((id) => !options.includes(id))) throw invalidPayload();
}

async function resolveMutationTarget(input: {
  scope: StudentWorkScope;
  type: StudentWorkTypeName;
  target: unknown;
  payload: unknown;
}) {
  const target = normalizeStudentWorkTarget(input.target);
  const validatedPayload = validateStudentWorkPayload(input.type, input.payload);
  const readingPayload = validatedPayload.type === "READING_POSITION" ? validatedPayload.value : null;
  const needsDocument = input.type !== "READING_POSITION" || Boolean(readingPayload?.pageId);
  let moduleDocument: StudentModuleDocument | null = null;
  let moduleMetadata: StudentModuleMetadata | null = null;

  if (needsDocument) {
    if (!target.moduleId) throw invalidTarget();
    moduleDocument = await loadStudentModuleDocument(input.scope, target.moduleId, target.chapterId);
  } else if (target.moduleId) {
    moduleMetadata = await loadStudentModuleMetadata(input.scope, target.moduleId, target.chapterId);
  }

  const canonicalTarget = {
    ...target,
    ...(moduleDocument ? { moduleId: moduleDocument.id, chapterId: moduleDocument.chapterId } : {}),
    ...(moduleMetadata ? { moduleId: moduleMetadata.id, chapterId: moduleMetadata.chapterId } : {}),
  };
  let resolved: ResolvedStudentWorkTarget;
  try {
    resolved = resolveV2StudentWorkTarget({
      bookId: input.scope.bookId,
      moduleId: canonicalTarget.moduleId,
      type: input.type,
      target: canonicalTarget,
      payload: validatedPayload.value,
      document: moduleDocument?.document,
    });
  } catch (error) {
    if (error instanceof StudentWorkPolicyError) {
      if (error.code === "INVALID_PAYLOAD") throw invalidPayload();
      if (error.code === "CONTENT_UNAVAILABLE") throw unavailable();
      throw invalidTarget();
    }
    throw error;
  }
  validateAnswerOptions(validatedPayload, resolved.question);
  return { validatedPayload, resolved };
}

async function resolveAssignmentMutationTarget(input: {
  scope: StudentWorkScope;
  type: StudentWorkTypeName;
  assignmentItemId: unknown;
  payload: unknown;
}) {
  if (input.type !== "ANSWER") throw invalidTarget();
  const context = await resolveStudentAssignmentItemForWork({
    assignmentItemId: input.assignmentItemId,
    bookId: input.scope.bookId,
  });
  const validatedPayload = validateStudentWorkPayload("ANSWER", input.payload);
  if (context.kind === "PUBLISHER_QUESTION") {
    validateAnswerOptions(validatedPayload, context.question);
    return {
      validatedPayload,
      assignmentItemId: context.assignmentItemId,
      resolved: {
        type: "ANSWER" as const,
        target: context.target,
        targetKey: context.targetKey,
        masterSourceHash: context.masterSourceHash,
        targetSourceHash: context.targetSourceHash,
        question: context.question,
      } satisfies ResolvedStudentWorkTarget,
    };
  }
  validateAnswerOptions(validatedPayload, context.payload as unknown as Record<string, unknown>);
  return {
    validatedPayload,
    assignmentItemId: context.assignmentItemId,
    resolved: {
      type: "ANSWER" as const,
      target: {},
      targetKey: context.targetKey,
      masterSourceHash: context.targetSourceHash,
      targetSourceHash: context.targetSourceHash,
      question: context.payload as unknown as Record<string, unknown>,
    } satisfies ResolvedStudentWorkTarget,
  };
}
function viewFromRow(row: StudentWorkRow, status: StudentWorkStatus): StudentWorkItemView {
  return {
    id: row.id,
    type: row.type as StudentWorkTypeName,
    targetKey: row.targetKey,
    assignmentItemId: row.assignmentItemId,
    target: {
      ...(row.chapterId ? { chapterId: row.chapterId } : {}),
      ...(row.moduleId ? { moduleId: row.moduleId } : {}),
      ...(row.pageId ? { pageId: row.pageId } : {}),
      ...(row.frameId ? { frameId: row.frameId } : {}),
      ...(row.childFrameId ? { childFrameId: row.childFrameId } : {}),
      ...(row.questionId ? { questionId: row.questionId } : {}),
      ...(row.segmentId ? { segmentId: row.segmentId } : {}),
    },
    masterSourceHash: row.masterSourceHash,
    targetSourceHash: row.targetSourceHash,
    payload: row.payload,
    revision: row.revision,
    status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function classifyRow(
  scope: StudentWorkScope,
  row: StudentWorkRow,
  documents: Map<string, StudentModuleDocument | null>,
): Promise<StudentWorkItemView> {
  const type = row.type as StudentWorkTypeName;
  let payload: ValidatedStudentWorkPayload;
  try {
    payload = validateStudentWorkPayload(type, row.payload);
  } catch {
    return viewFromRow(row, "STALE");
  }
  const document = row.moduleId ? documents.get(row.moduleId)?.document : undefined;
  try {
    const resolved = resolveV2StudentWorkTarget({
      bookId: scope.bookId,
      moduleId: row.moduleId ?? undefined,
      type,
      target: {
        ...(row.chapterId ? { chapterId: row.chapterId } : {}),
        ...(row.moduleId ? { moduleId: row.moduleId } : {}),
        ...(row.pageId ? { pageId: row.pageId } : {}),
        ...(row.frameId ? { frameId: row.frameId } : {}),
        ...(row.childFrameId ? { childFrameId: row.childFrameId } : {}),
        ...(row.questionId ? { questionId: row.questionId } : {}),
        ...(row.segmentId ? { segmentId: row.segmentId } : {}),
      },
      payload: payload.value,
      document,
    });
    const status: StudentWorkStatus = resolved.targetKey !== row.targetKey || resolved.targetSourceHash !== row.targetSourceHash
      ? "STALE"
      : "CURRENT";
    return viewFromRow(row, status);
  } catch {
    return viewFromRow(row, "MISSING_TARGET");
  }
}

async function loadDocumentMap(scope: StudentWorkScope, rows: StudentWorkRow[]) {
  const moduleIds = [...new Set(rows.map((row) => row.moduleId).filter((id): id is string => Boolean(id)))];
  const entries = await Promise.all(moduleIds.map(async (moduleId) => {
    try {
      return [moduleId, await loadStudentModuleDocument(scope, moduleId)] as const;
    } catch {
      return [moduleId, null] as const;
    }
  }));
  return new Map(entries);
}

export async function listStudentWork(input: {
  bookId: string;
  moduleId?: string;
  pageIds?: string[];
  types?: StudentWorkTypeName[];
}) {
  const scope = await resolveStudentWorkContext(input.bookId);
  const moduleId = input.moduleId ? normalizeStudentWorkTarget({ moduleId: input.moduleId }).moduleId : undefined;
  if (moduleId) await loadStudentModuleMetadata(scope, moduleId);
  const pageIds = input.pageIds?.length
    ? input.pageIds.map((pageId) => normalizeStudentWorkTarget({ pageId }).pageId as string)
    : undefined;
  const types = input.types?.length
    ? input.types.filter(isWorkType).map((type) => type as PrismaStudentWorkType)
    : undefined;
  const rows = await prisma.studentWorkItem.findMany({
    where: {
      ...scopeWhere(scope),
      ...(moduleId ? { moduleId } : {}),
      ...(pageIds ? { pageId: { in: pageIds } } : {}),
      ...(types ? { type: { in: types } } : {}),
    },
    select: workItemSelect,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });
  const documents = await loadDocumentMap(scope, rows);
  const items = await Promise.all(rows.map((row) => classifyRow(scope, row, documents)));
  return { items };
}

export async function getStudentWorkItem(input: { bookId: string; workItemId: string }) {
  const scope = await resolveStudentWorkContext(input.bookId);
  const row = await prisma.studentWorkItem.findFirst({
    where: { id: input.workItemId, ...scopeWhere(scope) },
    select: workItemSelect,
  });
  if (!row) throw serviceError("This Student Work item is not available.", "NOT_FOUND", 404);
  const documents = await loadDocumentMap(scope, [row]);
  return { item: await classifyRow(scope, row, documents) };
}

export async function upsertStudentWork(input: {
  bookId: string;
  type: StudentWorkTypeName;
  target: unknown;
  payload: unknown;
  expectedRevision?: unknown;
  recordAttempt?: boolean;
  assignmentItemId?: unknown;
}): Promise<StudentWorkMutationResult> {
  if (!isWorkType(input.type)) throw invalidTarget();
  if (input.recordAttempt && input.type !== "ANSWER") throw invalidTarget();
  const scope = await resolveStudentWorkContext(input.bookId);
  const expectedRevision = normalizeExpectedRevision(input.expectedRevision);
  const mutation = input.assignmentItemId === undefined
    ? await resolveMutationTarget({
      scope,
      type: input.type,
      target: input.target,
      payload: input.payload,
    })
    : await resolveAssignmentMutationTarget({
      scope,
      type: input.type,
      assignmentItemId: input.assignmentItemId,
      payload: input.payload,
    });
  const { validatedPayload, resolved } = mutation;
  const targetKey = assertStudentWorkTargetKeyLength(resolved.targetKey);
  const assignmentItemId = "assignmentItemId" in mutation ? mutation.assignmentItemId : null;
  const type = input.type as PrismaStudentWorkType;
  const where = { ...scopeWhere(scope), type, targetKey };
  const persistedTarget = resolved.target;
  const data = {
    schoolId: scope.schoolId,
    publisherId: scope.publisherId,
    bookId: scope.bookId,
    academicYearId: scope.academicYearId,
    assignmentItemId,
    chapterId: persistedTarget.chapterId ?? null,
    moduleId: persistedTarget.moduleId ?? null,
    pageId: persistedTarget.pageId ?? null,
    frameId: persistedTarget.frameId ?? null,
    childFrameId: persistedTarget.childFrameId ?? null,
    questionId: persistedTarget.questionId ?? null,
    segmentId: persistedTarget.segmentId ?? null,
    masterSourceHash: resolved.masterSourceHash,
    targetSourceHash: resolved.targetSourceHash,
    payload: asPrismaJson(validatedPayload.value),
  };
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.studentWorkItem.findFirst({ where, select: workItemSelect });
    if (existing) {
      if (expectedRevision !== undefined && expectedRevision !== existing.revision) {
        return {
          ok: false as const,
          status: "CONFLICT" as const,
          conflict: { revision: existing.revision, item: viewFromRow(existing, "CURRENT") },
        };
      }
      const updated = await tx.studentWorkItem.updateMany({
        where: { id: existing.id, revision: existing.revision },
        data: { ...data, revision: { increment: 1 } },
      });
      if (updated.count !== 1) {
        const current = await tx.studentWorkItem.findUnique({ where: { id: existing.id }, select: workItemSelect });
        return {
          ok: false as const,
          status: "CONFLICT" as const,
          conflict: { revision: current?.revision ?? null, item: current ? viewFromRow(current, "CURRENT") : null },
        };
      }
      const item = await tx.studentWorkItem.findUniqueOrThrow({ where: { id: existing.id }, select: workItemSelect });
      let attemptNumber: number | undefined;
      if (input.recordAttempt) {
        const maximum = await tx.studentWorkAttempt.aggregate({ where: { workItemId: item.id }, _max: { attemptNumber: true } });
        attemptNumber = (maximum._max.attemptNumber ?? 0) + 1;
        await tx.studentWorkAttempt.create({
          data: { workItemId: item.id, attemptNumber, payload: asPrismaJson(validatedPayload.value), masterSourceHash: resolved.masterSourceHash, targetSourceHash: resolved.targetSourceHash },
        });
      }
      return { ok: true as const, status: "SAVED" as const, item: viewFromRow(item, "CURRENT"), ...(attemptNumber ? { attemptNumber } : {}) };
    }
    if (expectedRevision !== undefined && expectedRevision !== 0) {
      return { ok: false as const, status: "CONFLICT" as const, conflict: { revision: null, item: null } };
    }
    const item = await tx.studentWorkItem.create({
      data: {
        studentId: scope.studentId,
        type,
        targetKey,
        ...data,
      },
      select: workItemSelect,
    });
    let attemptNumber: number | undefined;
    if (input.recordAttempt) {
      attemptNumber = 1;
      await tx.studentWorkAttempt.create({
        data: { workItemId: item.id, attemptNumber, payload: asPrismaJson(validatedPayload.value), masterSourceHash: resolved.masterSourceHash, targetSourceHash: resolved.targetSourceHash },
      });
    }
    return { ok: true as const, status: "SAVED" as const, item: viewFromRow(item, "CURRENT"), ...(attemptNumber ? { attemptNumber } : {}) };
  });
  return result;
}

export async function deleteStudentWork(input: {
  bookId: string;
  workItemId: string;
  expectedRevision?: unknown;
}) {
  const scope = await resolveStudentWorkContext(input.bookId);
  const expectedRevision = normalizeExpectedRevision(input.expectedRevision);
  const item = await prisma.studentWorkItem.findFirst({
    where: { id: input.workItemId, ...scopeWhere(scope) },
    select: workItemSelect,
  });
  if (!item) throw serviceError("This Student Work item is not available.", "NOT_FOUND", 404);
  const type = item.type as StudentWorkTypeName;
  if (type === "READING_POSITION" || type === "COMPLETION") throw invalidTarget();
  if (expectedRevision !== undefined && expectedRevision !== item.revision) {
    return { ok: false as const, status: "CONFLICT" as const, conflict: { revision: item.revision, item: viewFromRow(item, "CURRENT") } };
  }
  const deleted = await prisma.studentWorkItem.deleteMany({
    where: { id: item.id, ...scopeWhere(scope), revision: expectedRevision ?? item.revision },
  });
  if (deleted.count !== 1) {
    const current = await prisma.studentWorkItem.findUnique({ where: { id: item.id }, select: workItemSelect });
    return { ok: false as const, status: "CONFLICT" as const, conflict: { revision: current?.revision ?? null, item: current ? viewFromRow(current, "CURRENT") : null } };
  }
  return { ok: true as const, status: "DELETED" as const, workItemId: item.id };
}

export async function saveStudentAnswer(input: {
  bookId: string;
  target: unknown;
  payload: unknown;
  expectedRevision?: unknown;
  recordAttempt?: boolean;
}) {
  return upsertStudentWork({ ...input, type: "ANSWER" });
}

export async function saveStudentNote(input: {
  bookId: string;
  target: unknown;
  text: unknown;
  expectedRevision?: unknown;
}) {
  return upsertStudentWork({ bookId: input.bookId, type: "NOTE", target: input.target, payload: { text: input.text }, expectedRevision: input.expectedRevision });
}

export async function saveStudentHighlight(input: {
  bookId: string;
  target: unknown;
  payload: unknown;
  expectedRevision?: unknown;
}) {
  return upsertStudentWork({ ...input, type: "HIGHLIGHT" });
}

export async function bookmarkPage(input: {
  bookId: string;
  pageId: string;
  moduleId: string;
  chapterId?: string;
  label?: string;
  expectedRevision?: unknown;
}) {
  return upsertStudentWork({
    bookId: input.bookId,
    type: "BOOKMARK",
    target: { pageId: input.pageId, moduleId: input.moduleId, ...(input.chapterId ? { chapterId: input.chapterId } : {}) },
    payload: { ...(input.label !== undefined ? { label: input.label } : {}) },
    expectedRevision: input.expectedRevision,
  });
}

export async function unbookmarkPage(input: { bookId: string; workItemId: string; expectedRevision?: unknown }) {
  return deleteStudentWork(input);
}

export async function updateStudentReadingPosition(input: {
  bookId: string;
  moduleId?: string;
  chapterId?: string;
  pageId: string;
  segmentId?: string;
  expectedRevision?: unknown;
}) {
  return upsertStudentWork({
    bookId: input.bookId,
    type: "READING_POSITION",
    target: { ...(input.moduleId ? { moduleId: input.moduleId } : {}), ...(input.chapterId ? { chapterId: input.chapterId } : {}) },
    payload: { pageId: input.pageId, ...(input.segmentId ? { segmentId: input.segmentId } : {}) },
    expectedRevision: input.expectedRevision,
  });
}

export async function saveStudentCompletion(input: {
  bookId: string;
  target: unknown;
  state: "IN_PROGRESS" | "COMPLETED";
  expectedRevision?: unknown;
}) {
  return upsertStudentWork({
    bookId: input.bookId,
    type: "COMPLETION",
    target: input.target,
    payload: { state: input.state },
    expectedRevision: input.expectedRevision,
  });
}

export async function deleteStudentNote(input: { bookId: string; workItemId: string; expectedRevision?: unknown }) {
  return deleteStudentWork(input);
}

export async function deleteStudentHighlight(input: { bookId: string; workItemId: string; expectedRevision?: unknown }) {
  return deleteStudentWork(input);
}

export async function deleteStudentBookmark(input: { bookId: string; workItemId: string; expectedRevision?: unknown }) {
  return deleteStudentWork(input);
}