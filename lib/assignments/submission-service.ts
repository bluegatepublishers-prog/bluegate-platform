import "server-only";

import { SecurityAuditOutcome, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { accountAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { getStorageProvider } from "@/lib/storage/provider";
import { keyBelongsToTenant } from "@/lib/storage/upload-service";
import { requireOwnedTeacherAssignment, requireStudentAssignment } from "./access";
import { assignmentWindow, isAssignmentVisible } from "./timing";
import { AssignmentMutationError } from "./assignment-service";
import { getStudentAssignmentCompletion } from "./assignment-items";

function studentActor(scope: Awaited<ReturnType<typeof requireStudentAssignment>>) {
  return accountAuditActor({
    id: scope.identity.student.userId!,
    role: UserRole.STUDENT,
    publisherId: scope.identity.publisher.id,
  });
}

function teacherActor(scope: Awaited<ReturnType<typeof requireOwnedTeacherAssignment>>["scope"]) {
  return accountAuditActor({
    id: scope.teacher.userId,
    role: UserRole.TEACHER,
    publisherId: scope.publisherId,
  });
}

export async function saveSubmissionDraft(assignmentId: string, textResponse: string | null) {
  const scope = await requireStudentAssignment(assignmentId);
  if (!isAssignmentVisible(scope.assignment)) throw new AssignmentMutationError("This assignment is not available.");
  const window = assignmentWindow(scope.assignment);
  if (!window.acceptsSubmission) throw new AssignmentMutationError("The submission window is closed.");
  const latest = scope.assignment.submissions[0];
  if (latest && ["SUBMITTED", "RESUBMITTED", "GRADED"].includes(latest.status)) {
    throw new AssignmentMutationError("Submitted work cannot be overwritten.");
  }
  let attemptNumber = latest?.attemptNumber ?? 1;
  if (latest?.status === "RETURNED") {
    if (!scope.assignment.allowResubmission || attemptNumber >= scope.assignment.maximumAttempts) {
      throw new AssignmentMutationError("No further resubmission is available.");
    }
    attemptNumber += 1;
  }
  return prisma.$transaction(async (tx) => {
    const submission = latest?.status === "DRAFT"
      ? await tx.assignmentSubmission.update({
          where: { id: latest.id },
          data: { textResponse },
        })
      : await tx.assignmentSubmission.create({
          data: {
            assignmentId,
            studentId: scope.identity.student.id,
            publisherId: scope.identity.publisher.id,
            schoolId: scope.identity.school.id,
            academicYearId: scope.identity.academicYear.id,
            sectionId: scope.identity.enrollment.sectionId,
            attemptNumber,
            textResponse,
          },
        });
    await writeSecurityAuditEvent(tx, {
      actor: studentActor(scope),
      action: "classroom.submission.draft.save",
      targetType: "AssignmentSubmission",
      targetId: submission.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { attempt: submission.attemptNumber, scope: "assignment" },
    });
    return submission;
  });
}

export async function addSubmissionAttachment(assignmentId: string, input: {
  objectKey: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
}) {
  const scope = await requireStudentAssignment(assignmentId);
  const latest = scope.assignment.submissions[0];
  if (!latest || latest.status !== "DRAFT" || !scope.assignment.allowFileSubmission) {
    throw new AssignmentMutationError("Save a draft before adding files.");
  }
  const count = latest.attachments.length;
  if (count >= scope.assignment.maximumFiles) throw new AssignmentMutationError("The file limit has been reached.");
  if (
    input.fileSizeBytes <= 0 ||
    input.fileSizeBytes > scope.assignment.maximumFileSizeBytes ||
    !scope.assignment.acceptedFileTypes.includes(input.mimeType.toLowerCase())
  ) throw new AssignmentMutationError("That file type or size is not allowed.");
  let key: string;
  try {
    key = normalizeAndValidateObjectKey(input.objectKey);
  } catch {
    throw new AssignmentMutationError("Upload the file again.");
  }
  if (!keyBelongsToTenant(key, scope.identity.publisher.id, "submission-attachment")) {
    throw new AssignmentMutationError("The uploaded file is unavailable.");
  }
  const metadata = await getStorageProvider().headObject({ key });
  if (
    !metadata ||
    metadata.contentLength !== input.fileSizeBytes ||
    metadata.contentType?.toLowerCase() !== input.mimeType.toLowerCase() ||
    metadata.customMetadata?.["upload-scope"] !== "submission-attachment" ||
    metadata.customMetadata?.["uploader-user-id"] !== scope.identity.student.userId ||
    metadata.customMetadata?.["target-id"] !== assignmentId
  ) throw new AssignmentMutationError("The uploaded file could not be verified.");
  try {
    return await prisma.$transaction(async (tx) => {
      const attachment = await tx.submissionAttachment.create({
        data: {
          submissionId: latest.id,
          objectKey: key,
          originalFileName: input.originalFileName.slice(0, 255),
          mimeType: input.mimeType.toLowerCase(),
          fileSizeBytes: BigInt(input.fileSizeBytes),
        },
      });
      await writeSecurityAuditEvent(tx, {
        actor: studentActor(scope),
        action: "classroom.submission.attachment.add",
        targetType: "SubmissionAttachment",
        targetId: attachment.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { fileOperation: "upload", attempt: latest.attemptNumber, scope: "assignment" },
      });
      return attachment;
    });
  } catch (error) {
    await getStorageProvider().deleteObject({ key }).catch(() => undefined);
    throw error;
  }
}

export async function removeSubmissionAttachment(assignmentId: string, attachmentId: string) {
  const scope = await requireStudentAssignment(assignmentId);
  const latest = scope.assignment.submissions[0];
  if (!latest || latest.status !== "DRAFT") throw new AssignmentMutationError("Submitted files cannot be removed.");
  const attachment = latest.attachments.find((item) => item.id === attachmentId);
  if (!attachment) throw new AssignmentMutationError("File not found.");
  await prisma.$transaction(async (tx) => {
    await tx.submissionAttachment.delete({ where: { id: attachment.id } });
    await writeSecurityAuditEvent(tx, {
      actor: studentActor(scope),
      action: "classroom.submission.attachment.remove",
      targetType: "SubmissionAttachment",
      targetId: attachment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { fileOperation: "remove", attempt: latest.attemptNumber, scope: "assignment" },
    });
  });
  await getStorageProvider().deleteObject({ key: attachment.objectKey }).catch(() => undefined);
}

export async function submitAssignment(assignmentId: string) {
  const scope = await requireStudentAssignment(assignmentId);
  const window = assignmentWindow(scope.assignment);
  if (!window.acceptsSubmission) throw new AssignmentMutationError("The submission window is closed.");
  const latest = scope.assignment.submissions[0];
  if (!latest) throw new AssignmentMutationError("Save your work before submitting.");
  if (["SUBMITTED", "RESUBMITTED"].includes(latest.status)) return { id: latest.id, status: latest.status };
  if (latest.status !== "DRAFT") throw new AssignmentMutationError("Save your work before submitting.");
  if (!latest.textResponse && latest.attachments.length === 0) {
    throw new AssignmentMutationError("Add a response or file before submitting.");
  }
  if (scope.assignment.assignmentType === "HOMEWORK") {
    const completion = await getStudentAssignmentCompletion(assignmentId);
    if (completion.totalAnswerable > 0 && !completion.canSubmit) {
      if (completion.staleAnswerable > 0) {
        throw new AssignmentMutationError(`Review ${completion.staleAnswerable} saved answer${completion.staleAnswerable === 1 ? "" : "s"} after the book content update before submitting.`);
      }
      throw new AssignmentMutationError(`Answer ${completion.remainingAnswerable} remaining question${completion.remainingAnswerable === 1 ? "" : "s"} before submitting.`);
    }
  }
  return prisma.$transaction(async (tx) => {
    const status = latest.attemptNumber > 1 ? "RESUBMITTED" as const : "SUBMITTED" as const;
    const claimed = await tx.assignmentSubmission.updateMany({
      where: { id: latest.id, studentId: scope.identity.student.id, status: "DRAFT" },
      data: { status, submittedAt: new Date(), isLate: window.late },
    });
    if (claimed.count !== 1) throw new AssignmentMutationError("Your work was already submitted.");
    await writeSecurityAuditEvent(tx, {
      actor: studentActor(scope),
      action: status === "RESUBMITTED" ? "classroom.submission.resubmit" : "classroom.submission.submit",
      targetType: "AssignmentSubmission",
      targetId: latest.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { attempt: latest.attemptNumber, toStatus: status, scope: "assignment" },
    });
    return { id: latest.id, status };
  });
}

export async function gradeSubmission(sectionId: string, assignmentId: string, submissionId: string, marksAwarded: number | null, teacherFeedback: string | null) {
  const { scope, assignment } = await requireOwnedTeacherAssignment(sectionId, assignmentId);
  if (marksAwarded !== null && (marksAwarded < 0 || assignment.totalMarks === null || marksAwarded > assignment.totalMarks)) {
    throw new AssignmentMutationError("Marks must be within the assignment total.");
  }
  const submission = await prisma.assignmentSubmission.findFirst({
    where: {
      id: submissionId,
      assignmentId,
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      academicYearId: scope.academicYear.id,
      sectionId,
      status: { in: ["SUBMITTED", "RESUBMITTED", "GRADED"] },
    },
  });
  if (!submission) throw new AssignmentMutationError("Submission not found.");
  if (assignment.totalMarks === null && marksAwarded !== null) {
    throw new AssignmentMutationError("This assignment supports feedback-only grading.");
  }
  return prisma.$transaction(async (tx) => {
    const graded = await tx.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        marksAwarded,
        teacherFeedback,
        status: "GRADED",
        gradedAt: new Date(),
        gradedByTeacherId: scope.teacher.id,
      },
    });
    await writeSecurityAuditEvent(tx, {
      actor: teacherActor(scope),
      action: "classroom.submission.grade",
      targetType: "AssignmentSubmission",
      targetId: submission.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { attempt: submission.attemptNumber, toStatus: "GRADED", scope: "assignment" },
    });
    return graded;
  });
}

export async function returnSubmission(sectionId: string, assignmentId: string, submissionId: string, teacherFeedback: string | null) {
  const { scope, assignment } = await requireOwnedTeacherAssignment(sectionId, assignmentId);
  if (!assignment.allowResubmission) throw new AssignmentMutationError("Resubmission is not enabled.");
  const submission = await prisma.assignmentSubmission.findFirst({
    where: {
      id: submissionId,
      assignmentId,
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      academicYearId: scope.academicYear.id,
      sectionId,
      status: { in: ["SUBMITTED", "RESUBMITTED", "GRADED"] },
    },
  });
  if (!submission || submission.attemptNumber >= assignment.maximumAttempts) {
    throw new AssignmentMutationError("No further resubmission is available.");
  }
  return prisma.$transaction(async (tx) => {
    const returned = await tx.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        status: "RETURNED",
        teacherFeedback,
        returnedAt: new Date(),
        marksAwarded: null,
        gradedAt: null,
        gradedByTeacherId: null,
      },
    });
    await writeSecurityAuditEvent(tx, {
      actor: teacherActor(scope),
      action: "classroom.submission.return",
      targetType: "AssignmentSubmission",
      targetId: submission.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { attempt: submission.attemptNumber, toStatus: "RETURNED", scope: "assignment" },
    });
    return returned;
  });
}
