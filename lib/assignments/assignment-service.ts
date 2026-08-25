import "server-only";

import {
  AssignmentAttachmentSource,
  ClassroomAssignmentStatus,
  SecurityAuditOutcome,
  UserRole,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  accountAuditActor,
  recordTrustedDeniedAudit,
  writeSecurityAuditEvent,
} from "@/lib/security-audit";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { getStorageProvider } from "@/lib/storage/provider";
import { keyBelongsToTenant } from "@/lib/storage/upload-service";
import {
  AssignmentAccessError,
  requireOwnedTeacherAssignment,
  requireTeacherAssignmentFeature,
} from "./access";
import { assignmentInputSchema, type AssignmentInput } from "./validation";

export class AssignmentMutationError extends Error {
  constructor(message: string, readonly code = "INVALID_STATE") {
    super(message);
    this.name = "AssignmentMutationError";
  }
}

function teacherActor(scope: Awaited<ReturnType<typeof requireTeacherAssignmentFeature>>) {
  return accountAuditActor({
    id: scope.teacher.userId,
    role: UserRole.TEACHER,
    publisherId: scope.publisherId,
  });
}

function assignmentData(
  input: AssignmentInput,
  destination: Awaited<ReturnType<typeof resolveAcademicContext>>,
  now: Date,
) {
  const status = input.intent;
  return {
    title: input.title,
    instructions: input.instructions,
    assignmentType: input.assignmentType,
    sectionSubjectId: destination.sectionSubject?.id ?? null,
    subjectId: destination.sectionSubject?.subjectId ?? null,
    bookId: destination.book?.id ?? null,
    chapterId: destination.chapter?.id ?? null,
    totalMarks: input.totalMarks,
    allowTextSubmission: input.allowTextSubmission,
    allowFileSubmission: input.allowFileSubmission,
    allowMultipleFiles: input.allowMultipleFiles,
    maximumFiles: input.allowFileSubmission ? (input.allowMultipleFiles ? input.maximumFiles : 1) : 1,
    maximumFileSizeBytes: input.maximumFileSizeMb * 1024 * 1024,
    acceptedFileTypes: input.allowFileSubmission ? input.acceptedFileTypes : [],
    allowLateSubmission: input.allowLateSubmission,
    allowResubmission: input.allowResubmission,
    maximumAttempts: input.allowResubmission ? input.maximumAttempts : 1,
    status,
    publishAt: status === "SCHEDULED" ? input.publishAt : status === "PUBLISHED" ? now : null,
    publishedAt: status === "PUBLISHED" ? now : null,
    dueAt: input.dueAt,
    closeAt: input.closeAt,
  };
}

async function resolveAcademicContext(
  scope: Awaited<ReturnType<typeof requireTeacherAssignmentFeature>>,
  input: AssignmentInput,
) {
  const sectionSubject = input.sectionSubjectId
    ? scope.sectionSubjects.find((item) => item.id === input.sectionSubjectId)
    : null;
  if (input.sectionSubjectId && !sectionSubject) {
    throw new AssignmentMutationError("That subject is not in your official assignment.");
  }
  const book = input.bookId && sectionSubject
    ? sectionSubject.bookAdoptions.map((item) => item.book).find((item) => item.id === input.bookId)
    : null;
  if (input.bookId && !book) throw new AssignmentMutationError("That book is not adopted for this class.");
  const chapter = input.chapterId && book
    ? book.chapters.find((item) => item.id === input.chapterId)
    : null;
  if (input.chapterId && !chapter) throw new AssignmentMutationError("That chapter is not available.");
  return { sectionSubject, book, chapter };
}

export async function createAssignment(sectionId: string, input: AssignmentInput) {
  const scope = await requireTeacherAssignmentFeature(sectionId);
  const now = new Date();
  if (input.intent === "SCHEDULED" && (!input.publishAt || input.publishAt <= now)) {
    throw new AssignmentMutationError("Choose a future publishing time.");
  }
  const destination = await resolveAcademicContext(scope, input);
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.classroomAssignment.create({
      data: {
        publisherId: scope.publisherId,
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
        schoolClassId: scope.schoolClass.id,
        sectionId,
        teacherId: scope.teacher.id,
        ...assignmentData(input, destination, now),
      },
    });
    await writeSecurityAuditEvent(tx, {
      actor: teacherActor(scope),
      action: input.intent === "PUBLISHED"
        ? "classroom.assignment.publish"
        : input.intent === "SCHEDULED"
          ? "classroom.assignment.schedule"
          : "classroom.assignment.create",
      targetType: "ClassroomAssignment",
      targetId: assignment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { toStatus: input.intent, scope: "classroom" },
    });
    return assignment;
  });
}

export async function updateAssignment(sectionId: string, assignmentId: string, input: AssignmentInput) {
  const { scope, assignment } = await requireOwnedTeacherAssignment(sectionId, assignmentId);
  if (!["DRAFT", "SCHEDULED"].includes(assignment.status)) {
    throw new AssignmentMutationError("Published work cannot be edited. Close or archive it instead.");
  }
  const now = new Date();
  if (input.intent === "SCHEDULED" && (!input.publishAt || input.publishAt <= now)) {
    throw new AssignmentMutationError("Choose a future publishing time.");
  }
  const destination = await resolveAcademicContext(scope, input);
  if ((destination.book?.id ?? null) !== assignment.bookId) {
    const targetBoundItems = await prisma.classroomAssignmentItem.count({
      where: {
        assignmentId: assignment.id,
        type: { in: ["PUBLISHER_PAGE", "PUBLISHER_QUESTION", "TEACHER_QUESTION"] },
      },
    });
    if (targetBoundItems) {
      throw new AssignmentMutationError("Remove book content and answerable teacher questions before changing the assignment book.", "INVALID_STATE");
    }
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.classroomAssignment.update({
      where: { id: assignment.id },
      data: assignmentData(input, destination, now),
    });
    await writeSecurityAuditEvent(tx, {
      actor: teacherActor(scope),
      action: input.intent === "PUBLISHED"
        ? "classroom.assignment.publish"
        : input.intent === "SCHEDULED"
          ? "classroom.assignment.schedule"
          : "classroom.assignment.update",
      targetType: "ClassroomAssignment",
      targetId: assignment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { fromStatus: assignment.status, toStatus: input.intent, scope: "classroom" },
    });
    return updated;
  });
}

export async function transitionAssignment(
  sectionId: string,
  assignmentId: string,
  transition: "PUBLISH" | "CLOSE" | "REOPEN" | "ARCHIVE" | "PUBLISH_RESULTS",
) {
  const { scope, assignment } = await requireOwnedTeacherAssignment(sectionId, assignmentId);
  const now = new Date();
  const definitions = {
    PUBLISH: {
      allowed: ["DRAFT", "SCHEDULED"],
      status: ClassroomAssignmentStatus.PUBLISHED,
      action: "classroom.assignment.publish" as const,
      data: { status: ClassroomAssignmentStatus.PUBLISHED, publishAt: now, publishedAt: now, closedAt: null },
    },
    CLOSE: {
      allowed: ["PUBLISHED", "SCHEDULED"],
      status: ClassroomAssignmentStatus.CLOSED,
      action: "classroom.assignment.close" as const,
      data: { status: ClassroomAssignmentStatus.CLOSED, closedAt: now },
    },
    REOPEN: {
      allowed: ["CLOSED"],
      status: ClassroomAssignmentStatus.PUBLISHED,
      action: "classroom.assignment.reopen" as const,
      data: { status: ClassroomAssignmentStatus.PUBLISHED, closedAt: null, closeAt: null },
    },
    ARCHIVE: {
      allowed: ["DRAFT", "SCHEDULED", "PUBLISHED", "CLOSED"],
      status: ClassroomAssignmentStatus.ARCHIVED,
      action: "classroom.assignment.archive" as const,
      data: { status: ClassroomAssignmentStatus.ARCHIVED, archivedAt: now },
    },
    PUBLISH_RESULTS: {
      allowed: ["PUBLISHED", "CLOSED"],
      status: assignment.status,
      action: "classroom.assignment.results.publish" as const,
      data: { resultsPublishedAt: now },
    },
  };
  const definition = definitions[transition];
  if (!definition.allowed.includes(assignment.status)) {
    throw new AssignmentMutationError("That assignment action is not available in its current state.");
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.classroomAssignment.update({ where: { id: assignment.id }, data: definition.data });
    await writeSecurityAuditEvent(tx, {
      actor: teacherActor(scope),
      action: definition.action,
      targetType: "ClassroomAssignment",
      targetId: assignment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { fromStatus: assignment.status, toStatus: definition.status, scope: "classroom" },
    });
    return updated;
  });
}

type UploadAttachmentInput = {
  objectKey: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  label?: string;
};

export async function addUploadedAssignmentAttachment(sectionId: string, assignmentId: string, input: UploadAttachmentInput) {
  const { scope, assignment } = await requireOwnedTeacherAssignment(sectionId, assignmentId);
  let key: string;
  try {
    key = normalizeAndValidateObjectKey(input.objectKey);
  } catch {
    throw new AssignmentMutationError("Upload the file again.");
  }
  if (!keyBelongsToTenant(key, scope.publisherId, "assignment-attachment")) {
    throw new AssignmentMutationError("The uploaded file is unavailable.");
  }
  const metadata = await getStorageProvider().headObject({ key });
  if (
    !metadata ||
    metadata.contentLength !== input.fileSizeBytes ||
    metadata.contentType?.toLowerCase() !== input.mimeType.toLowerCase() ||
    metadata.customMetadata?.["upload-scope"] !== "assignment-attachment" ||
    metadata.customMetadata?.["uploader-user-id"] !== scope.teacher.userId ||
    metadata.customMetadata?.["target-id"] !== assignment.id
  ) throw new AssignmentMutationError("The uploaded file could not be verified.");
  try {
    return await prisma.$transaction(async (tx) => {
      const attachment = await tx.assignmentAttachment.create({
        data: {
          assignmentId: assignment.id,
          source: AssignmentAttachmentSource.UPLOAD,
          label: input.label?.trim().slice(0, 160) || input.originalFileName.slice(0, 255),
          objectKey: key,
          originalFileName: input.originalFileName.slice(0, 255),
          mimeType: input.mimeType.toLowerCase(),
          fileSizeBytes: BigInt(input.fileSizeBytes),
        },
      });
      await writeSecurityAuditEvent(tx, {
        actor: teacherActor(scope),
        action: "classroom.assignment.attachment.add",
        targetType: "AssignmentAttachment",
        targetId: attachment.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { fileOperation: "upload", scope: "assignment" },
      });
      return attachment;
    });
  } catch (error) {
    await getStorageProvider().deleteObject({ key }).catch(() => undefined);
    throw error;
  }
}

export async function addReferencedAssignmentAttachment(
  sectionId: string,
  assignmentId: string,
  source: "RESOURCE" | "CLASS_MATERIAL" | "BOOK_CHAPTER",
  targetId: string,
) {
  const { scope, assignment } = await requireOwnedTeacherAssignment(sectionId, assignmentId);
  let data: Prisma.AssignmentAttachmentUncheckedCreateInput;
  if (source === "RESOURCE") {
    const allowed = scope.sectionSubjects.flatMap((item) => item.resources).some((item) => item.id === targetId);
    if (!allowed) throw new AssignmentMutationError("That resource is not assigned to this class.");
    data = { assignmentId, source, resourceId: targetId };
  } else if (source === "CLASS_MATERIAL") {
    const material = await prisma.classMaterial.findFirst({
      where: {
        id: targetId,
        teacherId: scope.teacher.id,
        publisherId: scope.publisherId,
        schoolId: scope.schoolId,
        sectionId,
        archivedAt: null,
      },
      select: { id: true },
    });
    if (!material) throw new AssignmentMutationError("That class material is unavailable.");
    data = { assignmentId, source, classMaterialId: material.id };
  } else {
    if (!assignment.bookId || assignment.chapterId !== targetId) {
      throw new AssignmentMutationError("That chapter is not linked to this assignment.");
    }
    data = { assignmentId, source, bookChapterId: targetId };
  }
  return prisma.$transaction(async (tx) => {
    const attachment = await tx.assignmentAttachment.create({ data });
    await writeSecurityAuditEvent(tx, {
      actor: teacherActor(scope),
      action: "classroom.assignment.attachment.add",
      targetType: "AssignmentAttachment",
      targetId: attachment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { fileOperation: source.toLowerCase(), scope: "assignment" },
    });
    return attachment;
  });
}

export async function removeAssignmentAttachment(sectionId: string, assignmentId: string, attachmentId: string) {
  const { scope } = await requireOwnedTeacherAssignment(sectionId, assignmentId);
  const attachment = await prisma.assignmentAttachment.findFirst({
    where: { id: attachmentId, assignmentId },
  });
  if (!attachment) throw new AssignmentMutationError("Attachment not found.");
  await prisma.$transaction(async (tx) => {
    await tx.assignmentAttachment.delete({ where: { id: attachment.id } });
    await writeSecurityAuditEvent(tx, {
      actor: teacherActor(scope),
      action: "classroom.assignment.attachment.remove",
      targetType: "AssignmentAttachment",
      targetId: attachment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { fileOperation: "remove", scope: "assignment" },
    });
  });
  if (attachment.source === "UPLOAD" && attachment.objectKey) {
    await getStorageProvider().deleteObject({ key: attachment.objectKey }).catch(() => undefined);
  }
}

export async function auditAssignmentDenial(
  sectionId: string,
  action:
    | "classroom.assignment.update"
    | "classroom.assignment.publish"
    | "classroom.assignment.close"
    | "classroom.assignment.archive"
    | "classroom.assignment.attachment.add"
    | "classroom.assignment.attachment.remove"
    | "classroom.submission.grade"
    | "classroom.submission.return",
) {
  try {
    const scope = await requireTeacherAssignmentFeature(sectionId);
    await recordTrustedDeniedAudit({
      actor: teacherActor(scope),
      action,
      targetType: action.startsWith("classroom.submission") ? "AssignmentSubmission" : action.includes("attachment") ? "AssignmentAttachment" : "ClassroomAssignment",
      reasonCode: "AUTHORIZATION_DENIED",
      metadata: { scope: "classroom" },
    });
  } catch (error) {
    if (!(error instanceof AssignmentAccessError)) throw error;
  }
}
export type TeachingPeriodAssignmentDraft = {
  id?: string | null;
} & AssignmentInput;

type ParsedTeachingPeriodAssignmentDraft = {
  id: string | null;
  input: AssignmentInput;
};

export function validateTeachingPeriodAssignmentDrafts(value: unknown) {
  const rawDrafts = Array.isArray(value) ? value : [];
  if (rawDrafts.length > 20) throw new AssignmentMutationError("A teaching period cannot contain more than 20 assignments.");
  const drafts = rawDrafts.map(parseTeachingPeriodAssignmentDraft);
  const ids = drafts.map((draft) => draft.id).filter((id): id is string => Boolean(id));
  if (new Set(ids).size !== ids.length) throw new AssignmentMutationError("An assignment cannot be listed more than once.");
  return drafts;
}

function parseTeachingPeriodAssignmentDraft(value: unknown): ParsedTeachingPeriodAssignmentDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AssignmentMutationError("Invalid assignment details.");
  }
  const record = value as Record<string, unknown>;
  const id = record.id == null || record.id === "" ? null : String(record.id).trim();
  if (id && (id.length > 100 || id.startsWith("new-"))) {
    throw new AssignmentMutationError("Invalid assignment identity.");
  }
  const parsed = assignmentInputSchema.safeParse(record);
  if (!parsed.success) {
    throw new AssignmentMutationError(parsed.error.issues[0]?.message ?? "Check the assignment details.");
  }
  return { id: id || null, input: parsed.data };
}

async function requireTeachingPeriodForAssignment(
  sectionId: string,
  sectionSubjectId: string,
  periodId: string,
  scope: Awaited<ReturnType<typeof requireTeacherAssignmentFeature>>,
) {
  const period = await prisma.teachingPeriod.findFirst({
    where: {
      id: periodId,
      plan: {
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
        teacherId: scope.teacher.id,
        sectionSubjectId,
      },
    },
    select: { id: true, plan: { select: { sectionSubjectId: true } } },
  });
  if (!period || period.plan.sectionSubjectId !== sectionSubjectId) {
    throw new AssignmentMutationError("That teaching period is outside your authorized class and subject scope.", "AUTHORIZATION_DENIED");
  }
  if (!sectionId.trim()) throw new AssignmentMutationError("Invalid class section.", "AUTHORIZATION_DENIED");
  return period;
}

export async function saveTeachingPeriodAssignments(input: {
  sectionId: string;
  sectionSubjectId: string;
  periodId: string;
  drafts: unknown;
}) {
  const scope = await requireTeacherAssignmentFeature(input.sectionId);
  const period = await requireTeachingPeriodForAssignment(input.sectionId, input.sectionSubjectId, input.periodId, scope);
  const drafts = validateTeachingPeriodAssignmentDrafts(input.drafts);
  const ids = drafts.map((draft) => draft.id).filter((id): id is string => Boolean(id));
  const destinations = await Promise.all(drafts.map((draft) => resolveAcademicContext(scope, draft.input)));
  const current = await prisma.classroomAssignment.findMany({
    where: { teachingPeriodId: period.id },
    select: { id: true, status: true, bookId: true },
  });
  const currentById = new Map(current.map((assignment) => [assignment.id, assignment]));
  for (const id of ids) {
    if (!currentById.has(id)) throw new AssignmentMutationError("That assignment is not linked to this teaching period.", "AUTHORIZATION_DENIED");
  }

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    for (const [index, draft] of drafts.entries()) {
      const destination = destinations[index];
      if (draft.id) {
        const existing = currentById.get(draft.id);
        if (!existing) throw new AssignmentMutationError("That assignment is not linked to this teaching period.", "AUTHORIZATION_DENIED");
        if (!["DRAFT", "SCHEDULED"].includes(existing.status)) continue;

        if (existing.bookId !== (destination.book?.id ?? null)) {
          const itemCount = await tx.classroomAssignmentItem.count({ where: { assignmentId: existing.id } });
          if (itemCount) {
            throw new AssignmentMutationError("Remove book content before changing the assignment book.");
          }
        }

        const updated = await tx.classroomAssignment.update({
          where: { id: existing.id },
          data: assignmentData(draft.input, destination, now),
        });
        await writeSecurityAuditEvent(tx, {
          actor: teacherActor(scope),
          action: "classroom.assignment.update",
          targetType: "ClassroomAssignment",
          targetId: updated.id,
          outcome: SecurityAuditOutcome.SUCCESS,
          metadata: { scope: "teaching-period", teachingPeriodId: period.id, operation: "update" },
        });
      } else {
        const created = await tx.classroomAssignment.create({
          data: {
            publisherId: scope.publisherId,
            schoolId: scope.schoolId,
            academicYearId: scope.academicYear.id,
            schoolClassId: scope.schoolClass.id,
            sectionId: input.sectionId,
            teacherId: scope.teacher.id,
            teachingPeriodId: period.id,
            ...assignmentData(draft.input, destination, now),
          },
        });
        await writeSecurityAuditEvent(tx, {
          actor: teacherActor(scope),
          action: "classroom.assignment.create",
          targetType: "ClassroomAssignment",
          targetId: created.id,
          outcome: SecurityAuditOutcome.SUCCESS,
          metadata: { scope: "teaching-period", teachingPeriodId: period.id, operation: "create" },
        });
      }
    }

    const retainedIds = new Set(ids);
    for (const existing of current) {
      if (retainedIds.has(existing.id)) continue;
      await tx.classroomAssignment.update({
        where: { id: existing.id },
        data: { teachingPeriodId: null },
      });
      await writeSecurityAuditEvent(tx, {
        actor: teacherActor(scope),
        action: "classroom.assignment.update",
        targetType: "ClassroomAssignment",
        targetId: existing.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { scope: "teaching-period", teachingPeriodId: period.id, operation: "detach-preserve-assignment" },
      });
    }
  });
}
