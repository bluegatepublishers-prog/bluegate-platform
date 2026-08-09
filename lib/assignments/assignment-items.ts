import "server-only";

import {
  ClassroomAssignmentStatus,
  Prisma,
  type ClassroomAssignmentItem,
} from "@prisma/client";

import { filterDocumentForMode } from "@/lib/content-audience";
import { loadContentSectionDefinitions } from "@/lib/content-linked-assets";
import { loadPublishedContentDocument } from "@/lib/content-release";
import { requireBookEntitlement } from "@/lib/entitlements/book";
import { SafeEntitlementError } from "@/lib/entitlements/errors";
import { prisma } from "@/lib/prisma";
import { getStudentBook } from "@/lib/student-books";
import { listStudentVisibleV2Questions, resolveV2StudentWorkTarget } from "@/lib/student-work-policy";
import { assignmentWindow, isAssignmentVisible } from "./timing";
import { deriveAssignmentWorkCompletion } from "./assignment-completion";
import {
  AssignmentAccessError,
  requireOwnedTeacherAssignment,
  requireStudentAssignment,
} from "./access";
import {
  ASSIGNMENT_ITEM_LIMITS,
  AssignmentItemPolicyError,
  buildAssignmentAwareTargetKey,
  cleanAssignmentItemIdentifier,
  normalizeInstructionPayload,
  normalizeTeacherQuestionPayload,
  parseAssignmentItemInput,
  resolvePublisherPageItem,
  resolvePublisherQuestionItem,
  resolveStoredAssignmentItemState,
  teacherQuestionSourceHash,
  validateAssignmentItemOrder,
  type AssignmentItemErrorCode,
  type AssignmentItemInput,
  type AssignmentItemState,
  type TeacherQuestionPayload,
} from "./assignment-item-policy";

type TeacherAssignmentContext = Awaited<ReturnType<typeof requireOwnedTeacherAssignment>>;
type AssignmentRecord = TeacherAssignmentContext["assignment"];
type ModuleDocument = { id: string; chapterId: string; document: NonNullable<Awaited<ReturnType<typeof loadPublishedContentDocument>>> | null };

export class AssignmentItemServiceError extends Error {
  constructor(readonly code: AssignmentItemErrorCode, message: string) {
    super(message);
  }
}

function domainError(code: AssignmentItemErrorCode, message: string): never {
  throw new AssignmentItemServiceError(code, message);
}

function mapPolicyError(error: unknown): never {
  if (error instanceof AssignmentItemServiceError) throw error;
  if (error instanceof AssignmentItemPolicyError) throw new AssignmentItemServiceError(error.code, error.message);
  throw error;
}

function isPrismaCode(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

async function serializableTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!isPrismaCode(error, "P2034") || attempt === 2) throw error;
    }
  }
  domainError("CONFLICT", "The assignment item change could not be completed safely.");
}

function assignmentIsEditable(assignment: AssignmentRecord) {
  if (assignment.status !== ClassroomAssignmentStatus.DRAFT && assignment.status !== ClassroomAssignmentStatus.SCHEDULED) {
    domainError("ASSIGNMENT_LOCKED", "Published, closed, or archived assignment items cannot be changed.");
  }
}

async function assertAssignmentPeriod(assignment: AssignmentRecord) {
  if (!assignment.teachingPeriodId) return;
  const period = await prisma.teachingPeriod.findFirst({
    where: {
      id: assignment.teachingPeriodId,
      plan: {
        schoolId: assignment.schoolId,
        academicYearId: assignment.academicYearId,
        sectionSubjectId: assignment.sectionSubjectId ?? "__missing__",
        teacherId: assignment.teacherId,
        bookId: assignment.bookId ?? "__missing__",
      },
    },
    select: { id: true },
  });
  if (!period) domainError("INVALID_TARGET", "The assignment teaching period is outside this assignment scope.");
}

async function requireAssignmentBook(context: TeacherAssignmentContext) {
  const { assignment, scope } = context;
  const bookId = assignment.bookId;
  if (!bookId) domainError("BOOK_REQUIRED", "Select a book before adding an answerable assignment item.");
  if (assignment.book?.publisherId !== scope.publisherId) domainError("BOOK_NOT_ENTITLED", "This assignment book is not authorized for this class.");
  try {
    await requireBookEntitlement(
      { id: scope.teacher.userId, role: "TEACHER" },
      {
        bookId,
        academicYearId: scope.academicYear.id,
        sectionId: scope.section.id,
        sectionSubjectId: assignment.sectionSubjectId ?? undefined,
      },
    );
  } catch (error) {
    if (error instanceof SafeEntitlementError) domainError("BOOK_NOT_ENTITLED", "This assignment book is not authorized for this class.");
    throw error;
  }
  return bookId;
}

async function loadModuleDocuments(input: { publisherId: string; bookId: string; moduleIds: string[] }) {
  const moduleIds = [...new Set(input.moduleIds.filter(Boolean))];
  if (!moduleIds.length) return new Map<string, ModuleDocument>();
  const [modules, sections] = await Promise.all([
    prisma.bookModule.findMany({
      where: { id: { in: moduleIds }, bookId: input.bookId, published: true, archived: false },
      select: { id: true, chapterId: true },
    }),
    loadContentSectionDefinitions(input.publisherId, input.bookId),
  ]);
  const rows = await Promise.all(modules.map(async (module) => {
    const published = await loadPublishedContentDocument({
      publisherId: input.publisherId,
      bookId: input.bookId,
      targetType: "MODULE",
      targetId: module.id,
    });
    return [module.id, { id: module.id, chapterId: module.chapterId, document: published ? filterDocumentForMode(published, "STUDENT", sections) : null }] as const;
  }));
  return new Map(rows);
}

async function resolveItemTarget(context: TeacherAssignmentContext, input: AssignmentItemInput) {
  if (input.type === "INSTRUCTION") return { payload: input.payload };
  if (input.type === "TEACHER_QUESTION") {
    const bookId = await requireAssignmentBook(context);
    return {
      payload: input.payload,
      targetSourceHash: teacherQuestionSourceHash(input.payload),
      targetLabelSnapshot: input.payload.prompt.slice(0, ASSIGNMENT_ITEM_LIMITS.label),
      bookId,
    };
  }
  const bookId = await requireAssignmentBook(context);
  const documents = await loadModuleDocuments({ publisherId: context.scope.publisherId, bookId, moduleIds: [input.moduleId] });
  const document = documents.get(input.moduleId)?.document;
  if (!document) domainError("INVALID_TARGET", "The selected publisher target is not available.");
  try {
    return input.type === "PUBLISHER_PAGE"
      ? resolvePublisherPageItem(input, document)
      : resolvePublisherQuestionItem(input, document, bookId);
  } catch (error) {
    mapPolicyError(error);
  }
}

function persistableTarget(input: AssignmentItemInput, target: Awaited<ReturnType<typeof resolveItemTarget>>) {
  return {
    type: input.type,
    moduleId: "moduleId" in target ? target.moduleId ?? null : null,
    pageId: "pageId" in target ? target.pageId ?? null : null,
    frameId: "frameId" in target ? target.frameId ?? null : null,
    childFrameId: "childFrameId" in target ? target.childFrameId ?? null : null,
    questionId: "questionId" in target ? target.questionId ?? null : null,
    targetSourceHash: "targetSourceHash" in target ? target.targetSourceHash ?? null : null,
    targetLabelSnapshot: "targetLabelSnapshot" in target ? target.targetLabelSnapshot ?? null : null,
    payload: "payload" in target && target.payload ? target.payload as Prisma.InputJsonValue : Prisma.JsonNull,
  };
}

async function authorizeTeacherItem(sectionId: string, assignmentId: string) {
  let context: TeacherAssignmentContext;
  try {
    context = await requireOwnedTeacherAssignment(sectionId, cleanAssignmentItemIdentifier(assignmentId, "assignment"));
  } catch (error) {
    if (error instanceof AssignmentAccessError) domainError("ASSIGNMENT_NOT_FOUND", "This assignment is not available.");
    mapPolicyError(error);
  }
  await assertAssignmentPeriod(context.assignment);
  return context;
}

function itemReadModel(item: ClassroomAssignmentItem, state: AssignmentItemState) {
  return {
    id: item.id,
    type: item.type,
    sequence: item.sequence,
    state,
    moduleId: item.moduleId,
    pageId: item.pageId,
    frameId: item.frameId,
    childFrameId: item.childFrameId,
    questionId: item.questionId,
    targetSourceHash: item.targetSourceHash,
    targetLabelSnapshot: item.targetLabelSnapshot,
    payload: item.payload,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function stateForItems(assignment: AssignmentRecord, items: ClassroomAssignmentItem[], publisherId: string) {
  const documents = assignment.bookId
    ? await loadModuleDocuments({ publisherId, bookId: assignment.bookId, moduleIds: items.map((item) => item.moduleId ?? "") })
    : new Map<string, ModuleDocument>();
  return items.map((item) => itemReadModel(item, resolveStoredAssignmentItemState({
    type: item.type,
    moduleId: item.moduleId,
    pageId: item.pageId,
    frameId: item.frameId,
    childFrameId: item.childFrameId,
    questionId: item.questionId,
    targetSourceHash: item.targetSourceHash,
    payload: item.payload,
    bookId: assignment.bookId,
    document: item.moduleId ? documents.get(item.moduleId)?.document : undefined,
  })));
}

export async function listAssignmentItems(input: { sectionId: string; assignmentId: string }) {
  const context = await authorizeTeacherItem(input.sectionId, input.assignmentId);
  const items = await prisma.classroomAssignmentItem.findMany({
    where: { assignmentId: context.assignment.id },
    orderBy: [{ sequence: "asc" }, { id: "asc" }],
  });
  return stateForItems(context.assignment, items, context.scope.publisherId);
}

export async function createAssignmentItem(input: { sectionId: string; assignmentId: string; item: unknown }) {
  const context = await authorizeTeacherItem(input.sectionId, input.assignmentId);
  assignmentIsEditable(context.assignment);
  let descriptor: AssignmentItemInput;
  try {
    descriptor = parseAssignmentItemInput(input.item);
  } catch (error) {
    mapPolicyError(error);
  }
  const target = await resolveItemTarget(context, descriptor);
  try {
    return await serializableTransaction(async (tx) => {
      const count = await tx.classroomAssignmentItem.count({ where: { assignmentId: context.assignment.id } });
      if (count >= ASSIGNMENT_ITEM_LIMITS.items) domainError("CONFLICT", "This assignment already has the maximum number of items.");
      const last = await tx.classroomAssignmentItem.findFirst({
        where: { assignmentId: context.assignment.id },
        orderBy: [{ sequence: "desc" }, { id: "desc" }],
        select: { sequence: true },
      });
      return tx.classroomAssignmentItem.create({
        data: { assignmentId: context.assignment.id, sequence: (last?.sequence ?? 0) + 1, ...persistableTarget(descriptor, target) },
      });
    });
  } catch (error) {
    if (error instanceof AssignmentItemServiceError) throw error;
    if (isPrismaCode(error, "P2002") || isPrismaCode(error, "P2034")) domainError("CONFLICT", "The item order changed. Retry the operation.");
    domainError("SAVE_FAILED", "The assignment item could not be saved.");
  }
}

export async function updateAssignmentItem(input: { sectionId: string; assignmentId: string; itemId: string; item: unknown }) {
  const context = await authorizeTeacherItem(input.sectionId, input.assignmentId);
  assignmentIsEditable(context.assignment);
  const itemId = cleanAssignmentItemIdentifier(input.itemId, "assignment item");
  const existing = await prisma.classroomAssignmentItem.findFirst({ where: { id: itemId, assignmentId: context.assignment.id } });
  if (!existing) domainError("ITEM_NOT_FOUND", "The assignment item is not available.");
  let descriptor: AssignmentItemInput;
  try {
    descriptor = parseAssignmentItemInput(input.item, existing.payload);
  } catch (error) {
    mapPolicyError(error);
  }
  const changingIdentity = existing.type !== descriptor.type
    || (descriptor.type === "PUBLISHER_PAGE" && (existing.moduleId !== descriptor.moduleId || existing.pageId !== descriptor.pageId))
    || (descriptor.type === "PUBLISHER_QUESTION" && (existing.moduleId !== descriptor.moduleId || existing.questionId !== descriptor.questionId || existing.pageId !== descriptor.pageId || existing.frameId !== descriptor.frameId || existing.childFrameId !== descriptor.childFrameId));
  const responses = await prisma.studentWorkItem.count({ where: { assignmentItemId: existing.id } });
  if (responses && changingIdentity) domainError("ITEM_HAS_RESPONSES", "Create a new item instead of changing a target with student responses.");
  if (responses && descriptor.type === "TEACHER_QUESTION") {
    const next = normalizeTeacherQuestionPayload(descriptor.payload, existing.payload);
    const previous = normalizeTeacherQuestionPayload(existing.payload);
    if (teacherQuestionSourceHash(next) !== teacherQuestionSourceHash(previous)) {
      domainError("ITEM_HAS_RESPONSES", "This question already has student responses and cannot be changed.");
    }
  }
  const target = await resolveItemTarget(context, descriptor);
  try {
    return await prisma.classroomAssignmentItem.update({
      where: { id: existing.id },
      data: persistableTarget(descriptor, target),
    });
  } catch {
    domainError("SAVE_FAILED", "The assignment item could not be saved.");
  }
}

export async function deleteAssignmentItem(input: { sectionId: string; assignmentId: string; itemId: string }) {
  const context = await authorizeTeacherItem(input.sectionId, input.assignmentId);
  assignmentIsEditable(context.assignment);
  const itemId = cleanAssignmentItemIdentifier(input.itemId, "assignment item");
  const item = await prisma.classroomAssignmentItem.findFirst({ where: { id: itemId, assignmentId: context.assignment.id }, select: { id: true } });
  if (!item) domainError("ITEM_NOT_FOUND", "The assignment item is not available.");
  if (await prisma.studentWorkItem.count({ where: { assignmentItemId: item.id } })) {
    domainError("ITEM_HAS_RESPONSES", "This item has student responses and cannot be deleted.");
  }
  try {
    await prisma.classroomAssignmentItem.delete({ where: { id: item.id } });
  } catch {
    domainError("SAVE_FAILED", "The assignment item could not be deleted.");
  }
  return { deletedItemId: item.id };
}

export async function reorderAssignmentItems(input: { sectionId: string; assignmentId: string; orderedItemIds: unknown }) {
  const context = await authorizeTeacherItem(input.sectionId, input.assignmentId);
  assignmentIsEditable(context.assignment);
  try {
    await serializableTransaction(async (tx) => {
      const rows = await tx.classroomAssignmentItem.findMany({
        where: { assignmentId: context.assignment.id },
        orderBy: [{ sequence: "asc" }, { id: "asc" }],
        select: { id: true },
      });
      let ordered: string[];
      try {
        ordered = validateAssignmentItemOrder(rows.map((row) => row.id), input.orderedItemIds);
      } catch (error) {
        mapPolicyError(error);
      }
      if (!rows.length) return;
      await tx.classroomAssignmentItem.updateMany({
        where: { assignmentId: context.assignment.id },
        data: { sequence: { increment: Math.max(1_000_000, rows.length + 1) } },
      });
      for (const [index, id] of ordered.entries()) {
        await tx.classroomAssignmentItem.update({ where: { id }, data: { sequence: index + 1 } });
      }
    });
  } catch (error) {
    if (error instanceof AssignmentItemServiceError) throw error;
    if (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002")) domainError("CONFLICT", "The item order changed. Retry the operation.");
    domainError("SAVE_FAILED", "The assignment item order could not be saved.");
  }
  return listAssignmentItems({ sectionId: input.sectionId, assignmentId: context.assignment.id });
}

export async function getStudentAssignmentItems(assignmentId: string) {
  let access: Awaited<ReturnType<typeof requireStudentAssignment>>;
  try {
    access = await requireStudentAssignment(cleanAssignmentItemIdentifier(assignmentId, "assignment"));
  } catch (error) {
    if (error instanceof AssignmentAccessError) domainError("ASSIGNMENT_NOT_FOUND", "This assignment is not available.");
    throw error;
  }
  if (!isAssignmentVisible(access.assignment)) domainError("UNAUTHORIZED", "This assignment is not available.");
  const items = await prisma.classroomAssignmentItem.findMany({
    where: { assignmentId: access.assignment.id },
    orderBy: [{ sequence: "asc" }, { id: "asc" }],
  });
  const needsBook = items.some((item) => item.type !== "INSTRUCTION");
  if (needsBook && (!access.assignment.bookId || !await getStudentBook(access.assignment.bookId))) {
    domainError("BOOK_NOT_ENTITLED", "The assignment book is not available.");
  }
  const resolved = await stateForItems(access.assignment as AssignmentRecord, items, access.identity.publisher.id);
  return {
    assignmentId: access.assignment.id,
    teachingPeriodId: access.assignment.teachingPeriodId,
    items: resolved.filter((item) => item.state !== "MISSING_TARGET").map((item) => ({
      id: item.id,
      type: item.type,
      sequence: item.sequence,
      state: item.state,
      label: item.targetLabelSnapshot,
      target: { moduleId: item.moduleId, pageId: item.pageId, frameId: item.frameId, childFrameId: item.childFrameId, questionId: item.questionId },
      payload: item.type === "INSTRUCTION" || item.type === "TEACHER_QUESTION" ? item.payload : undefined,
    })),
  };
}

type StudentAssignmentQuestion = {
  id: string;
  type: string;
  prompt: string;
  instructions?: string;
  options?: Array<{ id: string; text: string }>;
};

function safeStudentQuestion(question: Record<string, unknown> | undefined, fallbackId: string): StudentAssignmentQuestion | undefined {
  if (!question) return undefined;
  const id = typeof question.id === "string" && question.id ? question.id : fallbackId;
  const prompt = ["prompt", "text", "label", "title"]
    .map((key) => question[key])
    .find((value): value is string => typeof value === "string" && Boolean(value.trim()))
    ?.replace(/\s+/gu, " ")
    .trim()
    .slice(0, 5_000) ?? "Question";
  const type = ["responseType", "questionType", "type"]
    .map((key) => question[key])
    .find((value): value is string => typeof value === "string" && Boolean(value.trim()))
    ?.trim() ?? "SHORT";
  const rawOptions = Array.isArray(question.options)
    ? question.options
    : Array.isArray(question.assertionOptions)
      ? question.assertionOptions
      : [];
  const options = rawOptions
    .filter((option): option is Record<string, unknown> => Boolean(option) && typeof option === "object" && !Array.isArray(option))
    .map((option) => ({
      id: typeof option.id === "string" ? option.id : "",
      text: typeof option.text === "string" ? option.text : typeof option.label === "string" ? option.label : "",
    }))
    .filter((option) => option.id && option.text);
  return {
    id,
    type,
    prompt,
    ...(typeof question.instructions === "string" ? { instructions: question.instructions.slice(0, 5_000) } : {}),
    ...(options.length ? { options } : {}),
  };
}

export async function getStudentAssignmentDelivery(assignmentId: string) {
  const access = await requireStudentAssignment(cleanAssignmentItemIdentifier(assignmentId, "assignment"));
  if (!isAssignmentVisible(access.assignment)) domainError("UNAUTHORIZED", "This assignment is not available.");
  const [items, workRows] = await Promise.all([
    prisma.classroomAssignmentItem.findMany({
      where: { assignmentId: access.assignment.id },
      orderBy: [{ sequence: "asc" }, { id: "asc" }],
    }),
    prisma.studentWorkItem.findMany({
      where: {
        studentId: access.identity.student.id,
        type: "ANSWER",
        assignmentItem: { assignmentId: access.assignment.id },
      },
      select: {
        id: true,
        assignmentItemId: true,
        targetSourceHash: true,
        payload: true,
        revision: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    }),
  ]);
  const needsBook = items.some((item) => item.type !== "INSTRUCTION");
  const bookId = access.assignment.bookId;
  if (needsBook && (!bookId || !await getStudentBook(bookId))) {
    domainError("BOOK_NOT_ENTITLED", "This book is no longer available.");
  }
  const documents = bookId
    ? await loadModuleDocuments({ publisherId: access.identity.publisher.id, bookId, moduleIds: items.map((item) => item.moduleId ?? "") })
    : new Map<string, ModuleDocument>();
  const deliveryItems = items.map((item) => {
    const document = item.moduleId ? documents.get(item.moduleId)?.document : undefined;
    const moduleRecord = item.moduleId ? documents.get(item.moduleId) : undefined;
    const state = resolveStoredAssignmentItemState({
      type: item.type,
      moduleId: item.moduleId,
      pageId: item.pageId,
      frameId: item.frameId,
      childFrameId: item.childFrameId,
      questionId: item.questionId,
      targetSourceHash: item.targetSourceHash,
      payload: item.payload,
      bookId,
      document,
    });
    const base = {
      id: item.id,
      type: item.type,
      sequence: item.sequence,
      state,
      label: item.targetLabelSnapshot,
      target: {
        ...(item.moduleId ? { moduleId: item.moduleId } : {}),
        ...(item.pageId ? { pageId: item.pageId } : {}),
        ...(item.frameId ? { frameId: item.frameId } : {}),
        ...(item.childFrameId ? { childFrameId: item.childFrameId } : {}),
        ...(item.questionId ? { questionId: item.questionId } : {}),
      },
      sourceHash: item.targetSourceHash,
      currentTargetSourceHash: null as string | null,
    };
    if (item.type === "INSTRUCTION") {
      try {
        const payload = normalizeInstructionPayload(item.payload);
        return { ...base, payload };
      } catch {
        return base;
      }
    }
    if (item.type === "TEACHER_QUESTION") {
      try {
        const payload = normalizeTeacherQuestionPayload(item.payload);
        return {
          ...base,
          question: {
            id: item.id,
            type: payload.responseType,
            prompt: payload.prompt,
            ...(payload.options ? { options: payload.options.map((option) => ({ id: option.id, text: option.label })) } : {}),
          },
        };
      } catch {
        return base;
      }
    }
    if (item.type === "PUBLISHER_PAGE" && document?.pageLayout && bookId) {
      const page = document.pageLayout.pages.find((entry) => entry.id === item.pageId);
      if (page && moduleRecord) {
        const ordered = document.pageLayout.pages.slice().sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
        return {
          ...base,
          page: {
            moduleId: item.moduleId!,
            chapterId: moduleRecord.chapterId,
            pageId: page.id,
            pageNumber: ordered.findIndex((entry) => entry.id === page.id) + 1,
            title: item.targetLabelSnapshot?.replace(/^Page \\d+\\s+[—-]\\s*/u, "") || "Book page",
            moduleTitle: undefined,
          },
        };
      }
    }
    if (item.type === "PUBLISHER_QUESTION" && document && bookId && item.moduleId && item.questionId) {
      try {
        const resolved = resolveV2StudentWorkTarget({
          bookId,
          moduleId: item.moduleId,
          type: "ANSWER",
          target: {
            moduleId: item.moduleId,
            ...(item.pageId ? { pageId: item.pageId } : {}),
            ...(item.frameId ? { frameId: item.frameId } : {}),
            ...(item.childFrameId ? { childFrameId: item.childFrameId } : {}),
            questionId: item.questionId,
          },
          document,
        });
        const question = safeStudentQuestion(resolved.question, item.questionId);
        if (question) return { ...base, target: resolved.target, question, currentTargetSourceHash: resolved.targetSourceHash };
      } catch {}
    }
    return base;
  });
  return {
    assignmentId: access.assignment.id,
    bookId,
    items: deliveryItems,
    work: workRows.map((row) => ({
      id: row.id,
      assignmentItemId: row.assignmentItemId,
      payload: row.payload,
      revision: row.revision,
      targetSourceHash: row.targetSourceHash,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

export async function getStudentAssignmentCompletion(assignmentId: string) {
  const delivery = await getStudentAssignmentDelivery(assignmentId);
  return deriveAssignmentWorkCompletion({ items: delivery.items, work: delivery.work });
}

export async function resolveStudentAssignmentItemForWork(input: { assignmentItemId: unknown; bookId: string }) {
  const itemId = cleanAssignmentItemIdentifier(input.assignmentItemId, "assignment item");
  const item = await prisma.classroomAssignmentItem.findUnique({ where: { id: itemId } });
  if (!item) domainError("ITEM_NOT_FOUND", "The assignment item is not available.");
  if (item.type !== "PUBLISHER_QUESTION" && item.type !== "TEACHER_QUESTION") {
    domainError("INVALID_TARGET", "This assignment item does not accept a response.");
  }
  const access = await requireStudentAssignment(item.assignmentId);
  if (!isAssignmentVisible(access.assignment)) domainError("UNAUTHORIZED", "This assignment is not available.");
  const window = assignmentWindow(access.assignment);
  if (!window.acceptsSubmission || ["SUBMITTED", "RESUBMITTED", "GRADED"].includes(access.assignment.submissions[0]?.status ?? "")) {
    domainError("ASSIGNMENT_LOCKED", "This assignment can no longer be changed.");
  }
  if (!access.assignment.bookId || access.assignment.bookId !== input.bookId) {
    domainError("BOOK_REQUIRED", "The assignment book is not available.");
  }
  if (item.type === "TEACHER_QUESTION") {
    let payload: TeacherQuestionPayload;
    try { payload = normalizeTeacherQuestionPayload(item.payload); } catch (error) { mapPolicyError(error); }
    return {
      assignmentId: access.assignment.id,
      assignmentItemId: item.id,
      bookId: access.assignment.bookId,
      kind: "TEACHER_QUESTION" as const,
      payload,
      targetKey: buildAssignmentAwareTargetKey({ assignmentItemId: item.id, teacherQuestion: true }),
      targetSourceHash: teacherQuestionSourceHash(payload),
    };
  }
  if (!item.moduleId || !item.questionId) domainError("MISSING_TARGET", "The assignment question is no longer available.");
  const docs = await loadModuleDocuments({ publisherId: access.identity.publisher.id, bookId: access.assignment.bookId, moduleIds: [item.moduleId] });
  const document = docs.get(item.moduleId)?.document;
  if (!document) domainError("MISSING_TARGET", "The assignment question is no longer available.");
  try {
    const resolved = resolveV2StudentWorkTarget({
      bookId: access.assignment.bookId,
      moduleId: item.moduleId,
      type: "ANSWER",
      target: { moduleId: item.moduleId, pageId: item.pageId ?? undefined, frameId: item.frameId ?? undefined, childFrameId: item.childFrameId ?? undefined, questionId: item.questionId },
      document,
    });
    return {
      assignmentId: access.assignment.id,
      assignmentItemId: item.id,
      bookId: access.assignment.bookId,
      kind: "PUBLISHER_QUESTION" as const,
      target: resolved.target,
      question: resolved.question,
      masterSourceHash: resolved.masterSourceHash,
      targetSourceHash: resolved.targetSourceHash,
      targetKey: buildAssignmentAwareTargetKey({ assignmentItemId: item.id, target: resolved.target }),
    };
  } catch {
    domainError("MISSING_TARGET", "The assignment question is no longer available.");
  }
}

export async function getStudentAssignmentWork(assignmentId: string, expectedBookId?: string) {
  const access = await requireStudentAssignment(cleanAssignmentItemIdentifier(assignmentId, "assignment"));
  if (!isAssignmentVisible(access.assignment)) domainError("UNAUTHORIZED", "This assignment is not available.");
  if (expectedBookId !== undefined && access.assignment.bookId !== expectedBookId) {
    domainError("BOOK_NOT_ENTITLED", "This book is no longer available.");
  }
  return prisma.studentWorkItem.findMany({
    where: {
      studentId: access.identity.student.id,
      type: "ANSWER",
      assignmentItem: { assignmentId: access.assignment.id },
    },
    select: {
      id: true,
      assignmentItemId: true,
      targetKey: true,
      targetSourceHash: true,
      payload: true,
      revision: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });
}

export async function listPublisherAssignmentQuestions(input: {
  sectionId: string;
  assignmentId: string;
  moduleId: unknown;
  pageId?: unknown;
}) {
  const context = await authorizeTeacherItem(input.sectionId, input.assignmentId);
  const bookId = await requireAssignmentBook(context);
  const moduleId = cleanAssignmentItemIdentifier(input.moduleId, "module");
  const pageId = input.pageId === undefined || input.pageId === null || input.pageId === ""
    ? undefined
    : cleanAssignmentItemIdentifier(input.pageId, "page");
  const documents = await loadModuleDocuments({ publisherId: context.scope.publisherId, bookId, moduleIds: [moduleId] });
  const document = documents.get(moduleId)?.document;
  if (!document?.pageLayout) domainError("INVALID_TARGET", "This book content is no longer available.");
  const orderedPages = document.pageLayout.pages.slice().sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  return listStudentVisibleV2Questions(document)
    .filter((question) => !pageId || question.pageId === pageId)
    .map((question) => ({
      ...question,
      moduleId,
      pageNumber: orderedPages.findIndex((page) => page.id === question.pageId) + 1,
    }))
    .filter((question) => question.pageNumber > 0);
}