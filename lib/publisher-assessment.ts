import "server-only";

import {
  PublisherAssessmentDeliveryMode,
  PublisherAssessmentKind,
  PublisherAssessmentStatus,
} from "@prisma/client";

import { normalizeQuestionType } from "@/lib/normalized-question";
import { prisma } from "@/lib/prisma";

export const PUBLISHER_ASSESSMENT_KINDS = [
  PublisherAssessmentKind.CHAPTER_TEST,
  PublisherAssessmentKind.MULTI_CHAPTER_TEST,
  PublisherAssessmentKind.UNIT_TEST,
  PublisherAssessmentKind.TERM_TEST,
  PublisherAssessmentKind.MULTI_TERM_TEST,
  PublisherAssessmentKind.BOOK_TEST,
  PublisherAssessmentKind.EXAM,
  PublisherAssessmentKind.FINAL_EXAM,
  PublisherAssessmentKind.DIAGNOSTIC,
] as const;

export const PUBLISHER_ASSESSMENT_DELIVERY_MODES = [
  PublisherAssessmentDeliveryMode.INTERACTIVE,
  PublisherAssessmentDeliveryMode.PRINT,
  PublisherAssessmentDeliveryMode.BOTH,
] as const;

const PUBLISHER_ASSESSMENT_HEADINGS: Record<PublisherAssessmentKind, string> = {
  CHAPTER_TEST: "Chapter Test",
  MULTI_CHAPTER_TEST: "Multi-Chapter Test",
  UNIT_TEST: "Unit Test",
  TERM_TEST: "Term Test",
  MULTI_TERM_TEST: "Multi-Term Test",
  BOOK_TEST: "Book Test",
  EXAM: "Exam",
  FINAL_EXAM: "Final Exam",
  DIAGNOSTIC: "Diagnostic Assessment",
};

export class PublisherAssessmentError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "PublisherAssessmentError";
  }
}

export function getPublisherAssessmentHeading(kind: PublisherAssessmentKind) {
  return PUBLISHER_ASSESSMENT_HEADINGS[kind];
}

type AssessmentScopeInput = {
  chapterId?: string | null;
  moduleId?: string | null;
  unitId?: string | null;
  partId?: string | null;
  chapterIds?: string[];
};

type AssessmentSettingsInput = AssessmentScopeInput & {
  deliveryMode?: PublisherAssessmentDeliveryMode;
  instructions?: string | null;
  durationMinutes?: number | null;
  totalMarks?: number | null;
  allowOnlineAttempt?: boolean;
  allowPrint?: boolean;
};

export type CreatePublisherAssessmentInput = AssessmentSettingsInput & {
  publisherId: string;
  bookId: string;
  kind: PublisherAssessmentKind;
};

export type UpdatePublisherAssessmentInput = AssessmentSettingsInput & {
  publisherId: string;
  bookId: string;
  assessmentId: string;
  kind?: PublisherAssessmentKind;
};

type ResolvedScope = {
  chapterId: string | null;
  moduleId: string | null;
  unitId: string | null;
  partId: string | null;
  chapterIds: string[];
};

function optionalId(value: string | null | undefined, field: string) {
  if (value === undefined || value === null) return value;
  const trimmed = value.trim();
  if (!trimmed) throw new PublisherAssessmentError(`${field} must be a non-empty id when supplied.`);
  return trimmed;
}

function optionalText(value: string | null | undefined, field: string) {
  if (value === undefined || value === null) return value;
  const trimmed = value.trim();
  if (trimmed.length > 10_000) throw new PublisherAssessmentError(`${field} must be 10,000 characters or fewer.`);
  return trimmed || null;
}

function optionalPositiveInteger(value: number | null | undefined, field: string) {
  if (value === undefined || value === null) return value;
  if (!Number.isInteger(value) || value <= 0) throw new PublisherAssessmentError(`${field} must be a positive integer.`);
  return value;
}

function assertAssessmentKind(kind: PublisherAssessmentKind) {
  if (!PUBLISHER_ASSESSMENT_KINDS.includes(kind)) throw new PublisherAssessmentError("Unsupported publisher assessment kind.");
}

function assertDeliveryMode(deliveryMode: PublisherAssessmentDeliveryMode) {
  if (!PUBLISHER_ASSESSMENT_DELIVERY_MODES.includes(deliveryMode)) throw new PublisherAssessmentError("Unsupported publisher assessment delivery mode.");
}

function resolveAvailability(
  deliveryMode: PublisherAssessmentDeliveryMode,
  allowOnlineAttempt: boolean | undefined,
  allowPrint: boolean | undefined,
) {
  if (deliveryMode === PublisherAssessmentDeliveryMode.INTERACTIVE) return { allowOnlineAttempt: true, allowPrint: false };
  if (deliveryMode === PublisherAssessmentDeliveryMode.PRINT) return { allowOnlineAttempt: false, allowPrint: true };
  const resolved = { allowOnlineAttempt: allowOnlineAttempt ?? true, allowPrint: allowPrint ?? true };
  if (!resolved.allowOnlineAttempt && !resolved.allowPrint) throw new PublisherAssessmentError("A BOTH assessment must allow interactive delivery, print delivery, or both.");
  return resolved;
}

async function assertOwnedBook(publisherId: string, bookId: string) {
  const book = await prisma.book.findFirst({ where: { id: bookId, publisherId }, select: { id: true } });
  if (!book) throw new PublisherAssessmentError("Book not found for this publisher.", 404);
}

async function validateDirectScope(bookId: string, scope: Omit<AssessmentScopeInput, "chapterIds">) {
  const chapterId = optionalId(scope.chapterId, "chapterId") ?? null;
  const moduleId = optionalId(scope.moduleId, "moduleId") ?? null;
  const unitId = optionalId(scope.unitId, "unitId") ?? null;
  const partId = optionalId(scope.partId, "partId") ?? null;
  const [chapter, module, unit, part] = await Promise.all([
    chapterId ? prisma.bookChapter.findFirst({ where: { id: chapterId, bookId }, select: { id: true, unitId: true, partId: true } }) : null,
    moduleId ? prisma.bookModule.findFirst({ where: { id: moduleId, bookId }, select: { id: true, chapterId: true, unitId: true } }) : null,
    unitId ? prisma.bookUnit.findFirst({ where: { id: unitId, bookId }, select: { id: true, partId: true } }) : null,
    partId ? prisma.bookPart.findFirst({ where: { id: partId, bookId }, select: { id: true } }) : null,
  ]);

  if (chapterId && !chapter) throw new PublisherAssessmentError("Chapter does not belong to this book.");
  if (moduleId && !module) throw new PublisherAssessmentError("Module does not belong to this book.");
  if (unitId && !unit) throw new PublisherAssessmentError("Unit does not belong to this book.");
  if (partId && !part) throw new PublisherAssessmentError("Part does not belong to this book.");
  if (chapter && module && module.chapterId !== chapter.id) throw new PublisherAssessmentError("Module must belong to the selected chapter.");
  if (chapter && unit && chapter.unitId !== unit.id) throw new PublisherAssessmentError("Chapter must belong to the selected unit.");
  if (module && unit && module.unitId !== unit.id) throw new PublisherAssessmentError("Module must belong to the selected unit.");
  if (chapter && part && chapter.partId !== part.id) throw new PublisherAssessmentError("Chapter must belong to the selected part.");
  if (unit && part && unit.partId !== part.id) throw new PublisherAssessmentError("Unit must belong to the selected part.");

  return { chapterId, moduleId, unitId, partId };
}

async function validateChapterIds(bookId: string, chapterIds: string[], minimum: number, label: string) {
  if (!Array.isArray(chapterIds)) throw new PublisherAssessmentError(`${label} must be an ordered chapter id list.`);
  const normalized = chapterIds.map((chapterId) => optionalId(chapterId, "chapterIds"));
  if (normalized.some((chapterId) => !chapterId)) throw new PublisherAssessmentError("chapterIds cannot contain empty values.");
  const ids = normalized as string[];
  if (ids.length < minimum) throw new PublisherAssessmentError(`${label} requires at least ${minimum} selected chapter${minimum === 1 ? "" : "s"}.`);
  if (new Set(ids).size !== ids.length) throw new PublisherAssessmentError("Duplicate chapter scope is not allowed.", 409);
  const chapters = await prisma.bookChapter.findMany({ where: { id: { in: ids }, bookId }, select: { id: true } });
  if (chapters.length !== ids.length) throw new PublisherAssessmentError("Every selected chapter must belong to this book.");
  return ids;
}

function assertOnlyBookScope(direct: Awaited<ReturnType<typeof validateDirectScope>>, chapterIds: string[], label: string) {
  if (direct.chapterId || direct.moduleId || direct.unitId || direct.partId || chapterIds.length) {
    throw new PublisherAssessmentError(`${label} uses whole-book scope and cannot retain child scope.`);
  }
}

function assertOnlyChapterScope(direct: Awaited<ReturnType<typeof validateDirectScope>>, chapterIds: string[], label: string) {
  if (direct.moduleId || direct.unitId || direct.partId || chapterIds.length) {
    throw new PublisherAssessmentError(`${label} can only use one chapterId.`);
  }
  if (!direct.chapterId) throw new PublisherAssessmentError(`${label} requires one chapterId.`);
}

function assertOnlyUnitScope(direct: Awaited<ReturnType<typeof validateDirectScope>>, chapterIds: string[], label: string) {
  if (direct.chapterId || direct.moduleId || direct.partId || chapterIds.length) {
    throw new PublisherAssessmentError(`${label} can only use one unitId.`);
  }
  if (!direct.unitId) throw new PublisherAssessmentError(`${label} requires one unitId.`);
}

function assertMembershipOnly(direct: Awaited<ReturnType<typeof validateDirectScope>>, label: string) {
  if (direct.chapterId || direct.moduleId || direct.unitId || direct.partId) {
    throw new PublisherAssessmentError(`${label} uses ordered chapter membership instead of singular scope fields.`);
  }
}

async function resolveScopeForKind(bookId: string, kind: PublisherAssessmentKind, input: AssessmentScopeInput): Promise<ResolvedScope> {
  const direct = await validateDirectScope(bookId, input);
  const requestedChapterIds = input.chapterIds ?? [];

  switch (kind) {
    case PublisherAssessmentKind.CHAPTER_TEST:
      assertOnlyChapterScope(direct, requestedChapterIds, "CHAPTER_TEST");
      return { ...direct, chapterIds: [] };
    case PublisherAssessmentKind.MULTI_CHAPTER_TEST: {
      assertMembershipOnly(direct, "MULTI_CHAPTER_TEST");
      const chapterIds = await validateChapterIds(bookId, requestedChapterIds, 2, "MULTI_CHAPTER_TEST");
      return { chapterId: null, moduleId: null, unitId: null, partId: null, chapterIds };
    }
    case PublisherAssessmentKind.UNIT_TEST:
      assertOnlyUnitScope(direct, requestedChapterIds, "UNIT_TEST");
      return { ...direct, chapterIds: [] };
    case PublisherAssessmentKind.TERM_TEST: {
      assertMembershipOnly(direct, "TERM_TEST");
      const chapterIds = await validateChapterIds(bookId, requestedChapterIds, 1, "TERM_TEST");
      return { chapterId: null, moduleId: null, unitId: null, partId: null, chapterIds };
    }
    case PublisherAssessmentKind.MULTI_TERM_TEST: {
      assertMembershipOnly(direct, "MULTI_TERM_TEST");
      const chapterIds = await validateChapterIds(bookId, requestedChapterIds, 2, "MULTI_TERM_TEST");
      return { chapterId: null, moduleId: null, unitId: null, partId: null, chapterIds };
    }
    case PublisherAssessmentKind.BOOK_TEST:
    case PublisherAssessmentKind.FINAL_EXAM:
      assertOnlyBookScope(direct, requestedChapterIds, kind);
      return { chapterId: null, moduleId: null, unitId: null, partId: null, chapterIds: [] };
    case PublisherAssessmentKind.EXAM: {
      if (direct.chapterId || direct.moduleId || direct.unitId || direct.partId) {
        throw new PublisherAssessmentError("EXAM uses ordered chapter membership or whole-book scope.");
      }
      const chapterIds = requestedChapterIds.length ? await validateChapterIds(bookId, requestedChapterIds, 1, "EXAM") : [];
      return { chapterId: null, moduleId: null, unitId: null, partId: null, chapterIds };
    }
    case PublisherAssessmentKind.DIAGNOSTIC: {
      if (direct.moduleId || direct.partId) throw new PublisherAssessmentError("DIAGNOSTIC currently supports chapter, unit, or whole-book scope only.");
      if (requestedChapterIds.length) {
        if (direct.chapterId || direct.unitId) throw new PublisherAssessmentError("DIAGNOSTIC cannot combine chapter membership with singular chapter or unit scope.");
        const chapterIds = await validateChapterIds(bookId, requestedChapterIds, 1, "DIAGNOSTIC");
        return { chapterId: null, moduleId: null, unitId: null, partId: null, chapterIds };
      }
      if (direct.chapterId && direct.unitId) throw new PublisherAssessmentError("DIAGNOSTIC cannot combine singular chapter and unit scope.");
      return { chapterId: direct.chapterId, moduleId: null, unitId: direct.unitId, partId: null, chapterIds: [] };
    }
  }
}

async function findOwnedAssessment(publisherId: string, bookId: string, assessmentId: string) {
  const assessment = await prisma.publisherAssessment.findFirst({ where: { id: assessmentId, publisherId, bookId } });
  if (!assessment) throw new PublisherAssessmentError("Publisher assessment not found.", 404);
  return assessment;
}

async function requireDraftAssessment(publisherId: string, bookId: string, assessmentId: string) {
  const assessment = await findOwnedAssessment(publisherId, bookId, assessmentId);
  if (assessment.status === PublisherAssessmentStatus.ARCHIVED) throw new PublisherAssessmentError("Restore this assessment before changing it.", 409);
  if (assessment.status === PublisherAssessmentStatus.PUBLISHED) throw new PublisherAssessmentError("Published assessments are immutable.", 409);
  return assessment;
}

async function currentChapterIds(assessmentId: string) {
  const rows = await prisma.publisherAssessmentChapterScope.findMany({
    where: { assessmentId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { chapterId: true },
  });
  return rows.map((row) => row.chapterId);
}

async function replaceChapterScopeInTransaction(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  assessmentId: string,
  chapterIds: string[],
) {
  await tx.publisherAssessmentChapterScope.deleteMany({ where: { assessmentId } });
  if (chapterIds.length) {
    await tx.publisherAssessmentChapterScope.createMany({
      data: chapterIds.map((chapterId, position) => ({ assessmentId, chapterId, position })),
    });
  }
}

export async function listPublisherAssessments(input: { publisherId: string; bookId: string; status?: PublisherAssessmentStatus }) {
  await assertOwnedBook(input.publisherId, input.bookId);
  const assessments = await prisma.publisherAssessment.findMany({
    where: { publisherId: input.publisherId, bookId: input.bookId, status: input.status },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    include: {
      chapter: { select: { id: true, title: true, chapterNumber: true } },
      unit: { select: { id: true, title: true } },
      chapterScopes: { orderBy: [{ position: "asc" }, { id: "asc" }], include: { chapter: { select: { id: true, title: true, chapterNumber: true } } } },
      items: { select: { question: { select: { marks: true } } } },
      _count: { select: { items: true, chapterScopes: true } },
    },
  });
  return assessments.map((assessment) => ({ ...assessment, heading: getPublisherAssessmentHeading(assessment.kind) }));
}

export async function getPublisherAssessment(input: { publisherId: string; bookId: string; assessmentId: string }) {
  const assessment = await prisma.publisherAssessment.findFirst({
    where: { id: input.assessmentId, publisherId: input.publisherId, bookId: input.bookId },
    include: {
      chapter: { select: { id: true, title: true, chapterNumber: true } },
      module: { select: { id: true, title: true } },
      unit: { select: { id: true, title: true } },
      part: { select: { id: true, title: true } },
      chapterScopes: { orderBy: [{ position: "asc" }, { id: "asc" }], include: { chapter: { select: { id: true, title: true, chapterNumber: true } } } },
      sectionInstructions: { orderBy: [{ questionType: "asc" }, { id: "asc" }] },
      items: {
        orderBy: [{ position: "asc" }, { id: "asc" }],
        include: { question: { include: { chapter: { select: { title: true, chapterNumber: true } }, module: { select: { title: true } } } } },
      },
    },
  });
  return assessment ? { ...assessment, heading: getPublisherAssessmentHeading(assessment.kind) } : null;
}

export async function createPublisherAssessment(input: CreatePublisherAssessmentInput) {
  assertAssessmentKind(input.kind);
  const deliveryMode = input.deliveryMode ?? PublisherAssessmentDeliveryMode.BOTH;
  assertDeliveryMode(deliveryMode);
  await assertOwnedBook(input.publisherId, input.bookId);
  const scope = await resolveScopeForKind(input.bookId, input.kind, input);
  const availability = resolveAvailability(deliveryMode, input.allowOnlineAttempt, input.allowPrint);
  return prisma.$transaction(async (tx) => {
    const assessment = await tx.publisherAssessment.create({
      data: {
        publisherId: input.publisherId,
        bookId: input.bookId,
        kind: input.kind,
        deliveryMode,
        chapterId: scope.chapterId,
        moduleId: scope.moduleId,
        unitId: scope.unitId,
        partId: scope.partId,
        ...availability,
        instructions: optionalText(input.instructions, "instructions") ?? null,
        durationMinutes: optionalPositiveInteger(input.durationMinutes, "durationMinutes") ?? null,
        totalMarks: optionalPositiveInteger(input.totalMarks, "totalMarks") ?? null,
      },
    });
    await replaceChapterScopeInTransaction(tx, assessment.id, scope.chapterIds);
    return assessment;
  });
}

export async function updatePublisherAssessment(input: UpdatePublisherAssessmentInput) {
  const current = await requireDraftAssessment(input.publisherId, input.bookId, input.assessmentId);
  const kind = input.kind ?? current.kind;
  const deliveryMode = input.deliveryMode ?? current.deliveryMode;
  assertAssessmentKind(kind);
  assertDeliveryMode(deliveryMode);
  const keepingKind = kind === current.kind;
  const existingChapterIds = keepingKind ? await currentChapterIds(current.id) : [];
  const scope = await resolveScopeForKind(input.bookId, kind, {
    chapterId: input.chapterId === undefined ? (keepingKind ? current.chapterId : null) : input.chapterId,
    moduleId: input.moduleId === undefined ? (keepingKind ? current.moduleId : null) : input.moduleId,
    unitId: input.unitId === undefined ? (keepingKind ? current.unitId : null) : input.unitId,
    partId: input.partId === undefined ? (keepingKind ? current.partId : null) : input.partId,
    chapterIds: input.chapterIds === undefined ? existingChapterIds : input.chapterIds,
  });
  const availability = resolveAvailability(deliveryMode, input.allowOnlineAttempt ?? current.allowOnlineAttempt, input.allowPrint ?? current.allowPrint);
  return prisma.$transaction(async (tx) => {
    const draft = await tx.publisherAssessment.findFirst({ where: { id: current.id, publisherId: input.publisherId, bookId: input.bookId }, select: { status: true } });
    if (!draft) throw new PublisherAssessmentError("Publisher assessment not found.", 404);
    if (draft.status !== PublisherAssessmentStatus.DRAFT) throw new PublisherAssessmentError("Only draft assessments can be changed.", 409);
    const assessment = await tx.publisherAssessment.update({
      where: { id: current.id },
      data: {
        kind,
        deliveryMode,
        chapterId: scope.chapterId,
        moduleId: scope.moduleId,
        unitId: scope.unitId,
        partId: scope.partId,
        ...availability,
        instructions: input.instructions === undefined ? current.instructions : optionalText(input.instructions, "instructions"),
        durationMinutes: input.durationMinutes === undefined ? current.durationMinutes : optionalPositiveInteger(input.durationMinutes, "durationMinutes"),
        totalMarks: input.totalMarks === undefined ? current.totalMarks : optionalPositiveInteger(input.totalMarks, "totalMarks"),
      },
    });
    await replaceChapterScopeInTransaction(tx, assessment.id, scope.chapterIds);
    return assessment;
  });
}

export async function listPublisherAssessmentChapterScope(input: { publisherId: string; bookId: string; assessmentId: string }) {
  await findOwnedAssessment(input.publisherId, input.bookId, input.assessmentId);
  return prisma.publisherAssessmentChapterScope.findMany({
    where: { assessmentId: input.assessmentId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: { chapter: { select: { id: true, title: true, chapterNumber: true } } },
  });
}

export async function replacePublisherAssessmentChapterScope(input: {
  publisherId: string;
  bookId: string;
  assessmentId: string;
  chapterIds: string[];
}) {
  const current = await requireDraftAssessment(input.publisherId, input.bookId, input.assessmentId);
  const scope = await resolveScopeForKind(input.bookId, current.kind, {
    chapterId: current.chapterId,
    moduleId: current.moduleId,
    unitId: current.unitId,
    partId: current.partId,
    chapterIds: input.chapterIds,
  });
  return prisma.$transaction(async (tx) => {
    const draft = await tx.publisherAssessment.findFirst({ where: { id: current.id, publisherId: input.publisherId, bookId: input.bookId }, select: { status: true } });
    if (!draft) throw new PublisherAssessmentError("Publisher assessment not found.", 404);
    if (draft.status !== PublisherAssessmentStatus.DRAFT) throw new PublisherAssessmentError("Only draft assessments can change scope.", 409);
    await replaceChapterScopeInTransaction(tx, current.id, scope.chapterIds);
    return tx.publisherAssessment.findUniqueOrThrow({ where: { id: current.id } });
  });
}

export type PublisherAssessmentSectionInstructionInput = {
  questionType: string;
  instruction: string;
};

function normalizeSectionInstruction(input: PublisherAssessmentSectionInstructionInput) {
  const questionType = normalizeQuestionType(input.questionType);
  if (questionType === "UNSUPPORTED") throw new PublisherAssessmentError("Use a supported normalized question type for a section instruction.");
  const instruction = input.instruction.trim();
  if (instruction.length > 2_000) throw new PublisherAssessmentError("Section instruction must be 2,000 characters or fewer.");
  return { questionType, instruction };
}

export async function listPublisherAssessmentSectionInstructions(input: { publisherId: string; bookId: string; assessmentId: string }) {
  await findOwnedAssessment(input.publisherId, input.bookId, input.assessmentId);
  return prisma.publisherAssessmentSectionInstruction.findMany({
    where: { assessmentId: input.assessmentId },
    orderBy: [{ questionType: "asc" }, { id: "asc" }],
  });
}

export async function replacePublisherAssessmentSectionInstructions(input: {
  publisherId: string;
  bookId: string;
  assessmentId: string;
  instructions: PublisherAssessmentSectionInstructionInput[];
}) {
  await requireDraftAssessment(input.publisherId, input.bookId, input.assessmentId);
  if (!Array.isArray(input.instructions)) throw new PublisherAssessmentError("Section instructions must be an array.");
  const values = input.instructions.map(normalizeSectionInstruction).filter((entry) => entry.instruction);
  if (new Set(values.map((entry) => entry.questionType)).size !== values.length) throw new PublisherAssessmentError("Use one instruction per question type.", 409);
  return prisma.$transaction(async (tx) => {
    const draft = await tx.publisherAssessment.findFirst({ where: { id: input.assessmentId, publisherId: input.publisherId, bookId: input.bookId }, select: { status: true } });
    if (!draft) throw new PublisherAssessmentError("Publisher assessment not found.", 404);
    if (draft.status !== PublisherAssessmentStatus.DRAFT) throw new PublisherAssessmentError("Only draft assessments can change section instructions.", 409);
    await tx.publisherAssessmentSectionInstruction.deleteMany({ where: { assessmentId: input.assessmentId } });
    if (values.length) await tx.publisherAssessmentSectionInstruction.createMany({ data: values.map((entry) => ({ assessmentId: input.assessmentId, ...entry })) });
    return tx.publisherAssessmentSectionInstruction.findMany({ where: { assessmentId: input.assessmentId }, orderBy: [{ questionType: "asc" }, { id: "asc" }] });
  });
}
export async function archivePublisherAssessment(input: { publisherId: string; bookId: string; assessmentId: string }) {
  const current = await findOwnedAssessment(input.publisherId, input.bookId, input.assessmentId);
  if (current.status === PublisherAssessmentStatus.ARCHIVED) return current;
  return prisma.publisherAssessment.update({ where: { id: current.id }, data: { status: PublisherAssessmentStatus.ARCHIVED, archivedAt: new Date() } });
}

export async function restorePublisherAssessment(input: { publisherId: string; bookId: string; assessmentId: string }) {
  const current = await findOwnedAssessment(input.publisherId, input.bookId, input.assessmentId);
  if (current.status !== PublisherAssessmentStatus.ARCHIVED) throw new PublisherAssessmentError("Only archived assessments can be restored.", 409);
  return prisma.publisherAssessment.update({
    where: { id: current.id },
    data: { status: PublisherAssessmentStatus.DRAFT, archivedAt: null, publishedAt: null },
  });
}

export async function publishPublisherAssessment(input: { publisherId: string; bookId: string; assessmentId: string }) {
  const current = await requireDraftAssessment(input.publisherId, input.bookId, input.assessmentId);
  await resolveScopeForKind(input.bookId, current.kind, {
    chapterId: current.chapterId,
    moduleId: current.moduleId,
    unitId: current.unitId,
    partId: current.partId,
    chapterIds: await currentChapterIds(current.id),
  });
  const itemCount = await prisma.publisherAssessmentItem.count({ where: { assessmentId: current.id } });
  if (!itemCount) throw new PublisherAssessmentError("Add at least one approved book question before publishing.");
  return prisma.publisherAssessment.update({
    where: { id: current.id },
    data: { status: PublisherAssessmentStatus.PUBLISHED, publishedAt: new Date() },
  });
}

export async function listPublisherAssessmentItems(input: { publisherId: string; bookId: string; assessmentId: string }) {
  await findOwnedAssessment(input.publisherId, input.bookId, input.assessmentId);
  return prisma.publisherAssessmentItem.findMany({
    where: { assessmentId: input.assessmentId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: { question: { include: { chapter: { select: { title: true, chapterNumber: true } }, module: { select: { title: true } } } } },
  });
}

export async function addPublisherAssessmentQuestions(input: { publisherId: string; bookId: string; assessmentId: string; questionIds: string[] }) {
  const questionIds = [...new Set(input.questionIds.filter(Boolean))];
  if (!questionIds.length) return [];
  await assertOwnedBook(input.publisherId, input.bookId);
  await prisma.$transaction(async (tx) => {
    const assessment = await tx.publisherAssessment.findFirst({
      where: { id: input.assessmentId, publisherId: input.publisherId, bookId: input.bookId },
      select: { id: true, status: true, kind: true, chapterId: true, unitId: true, chapterScopes: { select: { chapterId: true } } },
    });
    if (!assessment) throw new PublisherAssessmentError("Publisher assessment not found.", 404);
    if (assessment.status !== PublisherAssessmentStatus.DRAFT) throw new PublisherAssessmentError("Only draft assessments can change questions.", 409);
    const questions = await tx.bookQuestion.findMany({
      where: { id: { in: questionIds }, bookId: input.bookId, book: { publisherId: input.publisherId }, approved: true, archived: false },
      select: { id: true, chapterId: true },
    });
    if (questions.length !== questionIds.length) throw new PublisherAssessmentError("Only approved, active questions from this publisher book can be added.");
    const orderedScope = new Set(assessment.chapterScopes.map((scope) => scope.chapterId));
    const requiresChapterScope = assessment.kind === PublisherAssessmentKind.MULTI_CHAPTER_TEST
      || assessment.kind === PublisherAssessmentKind.TERM_TEST
      || assessment.kind === PublisherAssessmentKind.MULTI_TERM_TEST
      || ((assessment.kind === PublisherAssessmentKind.EXAM || assessment.kind === PublisherAssessmentKind.DIAGNOSTIC) && orderedScope.size > 0);
    if (assessment.kind === PublisherAssessmentKind.CHAPTER_TEST && questions.some((question) => question.chapterId !== assessment.chapterId)) {
      throw new PublisherAssessmentError("Selected questions must belong to the assessment chapter.");
    }
    if (requiresChapterScope && questions.some((question) => !orderedScope.has(question.chapterId))) {
      throw new PublisherAssessmentError("Selected questions must belong to the assessment chapter coverage.");
    }
    if (assessment.unitId) {
      const matchingChapters = await tx.bookChapter.findMany({
        where: { id: { in: questions.map((question) => question.chapterId) }, bookId: input.bookId, unitId: assessment.unitId },
        select: { id: true },
      });
      if (matchingChapters.length !== new Set(questions.map((question) => question.chapterId)).size) {
        throw new PublisherAssessmentError("Selected questions must belong to the assessment unit.");
      }
    }    const existing = await tx.publisherAssessmentItem.findMany({ where: { assessmentId: assessment.id, questionId: { in: questionIds } }, select: { questionId: true } });
    if (existing.length) throw new PublisherAssessmentError("A selected question is already in this assessment.", 409);
    const last = await tx.publisherAssessmentItem.aggregate({ where: { assessmentId: assessment.id }, _max: { position: true } });
    await tx.publisherAssessmentItem.createMany({ data: questionIds.map((questionId, index) => ({ assessmentId: assessment.id, questionId, position: (last._max.position ?? -1) + index + 1 })) });
  });
  return listPublisherAssessmentItems(input);
}

export async function removePublisherAssessmentItem(input: { publisherId: string; bookId: string; assessmentId: string; itemId: string }) {
  await requireDraftAssessment(input.publisherId, input.bookId, input.assessmentId);
  const deleted = await prisma.publisherAssessmentItem.deleteMany({ where: { id: input.itemId, assessmentId: input.assessmentId } });
  if (!deleted.count) throw new PublisherAssessmentError("Assessment item not found.", 404);
}

export async function movePublisherAssessmentItem(input: { publisherId: string; bookId: string; assessmentId: string; itemId: string; direction: -1 | 1 }) {
  if (input.direction !== -1 && input.direction !== 1) throw new PublisherAssessmentError("Direction must be -1 or 1.");
  await requireDraftAssessment(input.publisherId, input.bookId, input.assessmentId);
  await prisma.$transaction(async (tx) => {
    const rows = await tx.publisherAssessmentItem.findMany({ where: { assessmentId: input.assessmentId }, orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true, position: true } });
    const index = rows.findIndex((row) => row.id === input.itemId);
    const current = rows[index];
    if (!current) throw new PublisherAssessmentError("Assessment item not found.", 404);
    const neighbor = rows[index + input.direction];
    if (!neighbor) return;
    await Promise.all([
      tx.publisherAssessmentItem.update({ where: { id: current.id }, data: { position: neighbor.position } }),
      tx.publisherAssessmentItem.update({ where: { id: neighbor.id }, data: { position: current.position } }),
    ]);
  });
}