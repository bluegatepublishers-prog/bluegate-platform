"use server";

import { revalidatePath } from "next/cache";

import { AssignmentAccessError } from "@/lib/assignments/access";
import { requireStudentAssignmentIdentity } from "@/lib/assignments/access";
import { AssignmentMutationError } from "@/lib/assignments/assignment-service";
import {
  addSubmissionAttachment,
  removeSubmissionAttachment,
  saveSubmissionDraft,
  submitAssignment,
} from "@/lib/assignments/submission-service";
import { submissionDraftSchema } from "@/lib/assignments/validation";
import { accountAuditActor, recordTrustedDeniedAudit } from "@/lib/security-audit";
import { UserRole } from "@prisma/client";

type Result<T> = { ok: true; message: string; data: T } | { ok: false; message: string };

async function safe<T>(
  action: "classroom.submission.draft.save" | "classroom.submission.submit" | "classroom.submission.attachment.add" | "classroom.submission.attachment.remove",
  operation: () => Promise<T>,
): Promise<Result<T>> {
  try {
    return { ok: true, message: "Saved.", data: await operation() };
  } catch (error) {
    if (error instanceof AssignmentAccessError) {
      await auditStudentDenial(action);
      return { ok: false, message: "This assignment is not available." };
    }
    if (error instanceof AssignmentMutationError) return { ok: false, message: error.message };
    return { ok: false, message: "Your work could not be saved." };
  }
}

function refresh(assignmentId: string) {
  revalidatePath("/student-dashboard/assignments");
  revalidatePath(`/student-dashboard/assignments/${assignmentId}`);
}

export async function saveSubmissionDraftAction(assignmentId: string, form: FormData) {
  const parsed = submissionDraftSchema.safeParse({ textResponse: form.get("textResponse") ?? "" });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "Check your response." } as const;
  const result = await safe("classroom.submission.draft.save", () => saveSubmissionDraft(assignmentId, parsed.data.textResponse));
  if (result.ok) {
    refresh(assignmentId);
    return { ok: true, message: "Draft saved.", data: { submissionId: result.data.id } } as const;
  }
  return result;
}

export async function addSubmissionAttachmentAction(assignmentId: string, input: {
  objectKey: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
}) {
  const result = await safe("classroom.submission.attachment.add", () => addSubmissionAttachment(assignmentId, input));
  if (result.ok) refresh(assignmentId);
  return result.ok ? { ok: true, message: "File added." } as const : result;
}

export async function submitAssignmentAction(assignmentId: string) {
  const result = await safe("classroom.submission.submit", () => submitAssignment(assignmentId));
  if (result.ok) refresh(assignmentId);
  return result.ok ? { ok: true, message: result.data.status === "RESUBMITTED" ? "Work resubmitted." : "Work submitted." } as const : result;
}

export async function removeSubmissionAttachmentAction(assignmentId: string, attachmentId: string) {
  const result = await safe("classroom.submission.attachment.remove", () => removeSubmissionAttachment(assignmentId, attachmentId));
  if (result.ok) refresh(assignmentId);
  return result.ok ? { ok: true, message: "File removed." } as const : result;
}

async function auditStudentDenial(action: "classroom.submission.draft.save" | "classroom.submission.submit" | "classroom.submission.attachment.add" | "classroom.submission.attachment.remove") {
  try {
    const identity = await requireStudentAssignmentIdentity();
    await recordTrustedDeniedAudit({
      actor: accountAuditActor({ id: identity.student.userId!, role: UserRole.STUDENT, publisherId: identity.publisher.id }),
      action,
      targetType: action.includes("attachment") ? "SubmissionAttachment" : "AssignmentSubmission",
      reasonCode: "AUTHORIZATION_DENIED",
      metadata: { scope: "assignment" },
    });
  } catch {}
}
