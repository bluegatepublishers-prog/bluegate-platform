"use server";

import { revalidatePath } from "next/cache";

import {
  addReferencedAssignmentAttachment,
  addUploadedAssignmentAttachment,
  AssignmentMutationError,
  auditAssignmentDenial,
  createAssignment,
  removeAssignmentAttachment,
  transitionAssignment,
  updateAssignment,
} from "@/lib/assignments/assignment-service";
import { AssignmentAccessError } from "@/lib/assignments/access";
import {
  AssignmentItemServiceError,
  createAssignmentItem,
  deleteAssignmentItem,
  listAssignmentItems,
  listPublisherAssignmentQuestions,
  reorderAssignmentItems,
  updateAssignmentItem,
} from "@/lib/assignments/assignment-items";
import { gradeSubmission, returnSubmission } from "@/lib/assignments/submission-service";
import {
  gradeSubmissionSchema,
  parseAssignmentForm,
} from "@/lib/assignments/validation";

function refresh(sectionId: string, assignmentId?: string) {
  revalidatePath(`/teacher-dashboard/classes/${sectionId}/assignments`);
  if (assignmentId) revalidatePath(`/teacher-dashboard/classes/${sectionId}/assignments/${assignmentId}`);
  revalidatePath(`/student-dashboard/assignments`);
  if (assignmentId) revalidatePath(`/student-dashboard/assignments/${assignmentId}`);
}

function validationMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message || "Check the assignment details.";
}

async function safely<T>(
  sectionId: string,
  auditAction:
    | "classroom.assignment.update"
    | "classroom.assignment.publish"
    | "classroom.assignment.close"
    | "classroom.assignment.archive"
    | "classroom.assignment.attachment.add"
    | "classroom.assignment.attachment.remove"
    | "classroom.submission.grade"
    | "classroom.submission.return",
  operation: () => Promise<T>,
): Promise<{ ok: true; message: string; data: T } | { ok: false; message: string }> {
  try {
    const data = await operation();
    return { ok: true, message: "Saved.", data };
  } catch (error) {
    if (error instanceof AssignmentAccessError) {
      await auditAssignmentDenial(sectionId, auditAction);
      return { ok: false, message: "This assignment is not available." };
    }
    if (error instanceof AssignmentMutationError || error instanceof AssignmentItemServiceError) return { ok: false, message: error.message };
    return { ok: false, message: "The assignment could not be saved." };
  }
}

export async function createAssignmentAction(sectionId: string, form: FormData) {
  const parsed = parseAssignmentForm(form);
  if (!parsed.success) return { ok: false, message: validationMessage(parsed.error) } as const;
  const result = await safely(sectionId, "classroom.assignment.update", () => createAssignment(sectionId, parsed.data));
  if (result.ok) {
    refresh(sectionId, result.data.id);
    return { ok: true, message: "Assignment created.", data: { id: result.data.id } } as const;
  }
  return result;
}

export async function updateAssignmentAction(sectionId: string, assignmentId: string, form: FormData) {
  const parsed = parseAssignmentForm(form);
  if (!parsed.success) return { ok: false, message: validationMessage(parsed.error) } as const;
  const result = await safely(sectionId, "classroom.assignment.update", () => updateAssignment(sectionId, assignmentId, parsed.data));
  if (result.ok) refresh(sectionId, assignmentId);
  return result.ok ? { ok: true, message: "Assignment updated." } as const : result;
}

export async function transitionAssignmentAction(
  sectionId: string,
  assignmentId: string,
  transition: "PUBLISH" | "CLOSE" | "REOPEN" | "ARCHIVE" | "PUBLISH_RESULTS",
) {
  const auditAction = transition === "PUBLISH"
    ? "classroom.assignment.publish"
    : transition === "CLOSE" || transition === "REOPEN"
      ? "classroom.assignment.close"
      : "classroom.assignment.archive";
  const result = await safely(sectionId, auditAction, () => transitionAssignment(sectionId, assignmentId, transition));
  if (result.ok) refresh(sectionId, assignmentId);
  return result.ok ? { ok: true, message: transitionMessage(transition) } as const : result;
}

function transitionMessage(transition: "PUBLISH" | "CLOSE" | "REOPEN" | "ARCHIVE" | "PUBLISH_RESULTS") {
  return {
    PUBLISH: "Assignment published.",
    CLOSE: "Assignment closed.",
    REOPEN: "Assignment reopened.",
    ARCHIVE: "Assignment archived.",
    PUBLISH_RESULTS: "Graded results released.",
  }[transition];
}

export async function addUploadedAssignmentAttachmentAction(sectionId: string, assignmentId: string, input: {
  objectKey: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  label?: string;
}) {
  const result = await safely(sectionId, "classroom.assignment.attachment.add", () => addUploadedAssignmentAttachment(sectionId, assignmentId, input));
  if (result.ok) refresh(sectionId, assignmentId);
  return result.ok ? { ok: true, message: "Attachment added." } as const : result;
}

export async function addReferencedAssignmentAttachmentAction(
  sectionId: string,
  assignmentId: string,
  source: "RESOURCE" | "CLASS_MATERIAL" | "BOOK_CHAPTER",
  targetId: string,
) {
  const result = await safely(sectionId, "classroom.assignment.attachment.add", () => addReferencedAssignmentAttachment(sectionId, assignmentId, source, targetId));
  if (result.ok) refresh(sectionId, assignmentId);
  return result.ok ? { ok: true, message: "Attachment added." } as const : result;
}

export async function removeAssignmentAttachmentAction(sectionId: string, assignmentId: string, attachmentId: string) {
  const result = await safely(sectionId, "classroom.assignment.attachment.remove", () => removeAssignmentAttachment(sectionId, assignmentId, attachmentId));
  if (result.ok) refresh(sectionId, assignmentId);
  return result.ok ? { ok: true, message: "Attachment removed." } as const : result;
}

export async function gradeSubmissionAction(sectionId: string, assignmentId: string, submissionId: string, form: FormData) {
  const parsed = gradeSubmissionSchema.safeParse({
    marksAwarded: form.get("marksAwarded") ?? "",
    teacherFeedback: form.get("teacherFeedback") ?? "",
  });
  if (!parsed.success) return { ok: false, message: validationMessage(parsed.error) } as const;
  const result = await safely(sectionId, "classroom.submission.grade", () =>
    gradeSubmission(sectionId, assignmentId, submissionId, parsed.data.marksAwarded, parsed.data.teacherFeedback),
  );
  if (result.ok) refresh(sectionId, assignmentId);
  return result.ok ? { ok: true, message: "Grade saved. Release results when ready." } as const : result;
}

export async function returnSubmissionAction(sectionId: string, assignmentId: string, submissionId: string, form: FormData) {
  const feedback = String(form.get("teacherFeedback") ?? "").trim().slice(0, 5_000) || null;
  const result = await safely(sectionId, "classroom.submission.return", () =>
    returnSubmission(sectionId, assignmentId, submissionId, feedback),
  );
  if (result.ok) refresh(sectionId, assignmentId);
  return result.ok ? { ok: true, message: "Returned for correction." } as const : result;
}

export async function createAssignmentItemAction(sectionId: string, assignmentId: string, item: unknown) {
  const result = await safely(sectionId, "classroom.assignment.update", () => createAssignmentItem({ sectionId, assignmentId, item }));
  if (result.ok) refresh(sectionId, assignmentId);
  return result.ok ? { ok: true, message: "Assignment item added.", data: { id: result.data.id } } as const : result;
}

export async function updateAssignmentItemAction(sectionId: string, assignmentId: string, itemId: string, item: unknown) {
  const result = await safely(sectionId, "classroom.assignment.update", () => updateAssignmentItem({ sectionId, assignmentId, itemId, item }));
  if (result.ok) refresh(sectionId, assignmentId);
  return result.ok ? { ok: true, message: "Assignment item updated." } as const : result;
}

export async function deleteAssignmentItemAction(sectionId: string, assignmentId: string, itemId: string) {
  const result = await safely(sectionId, "classroom.assignment.update", () => deleteAssignmentItem({ sectionId, assignmentId, itemId }));
  if (result.ok) refresh(sectionId, assignmentId);
  return result.ok ? { ok: true, message: "Assignment item removed." } as const : result;
}

export async function reorderAssignmentItemsAction(sectionId: string, assignmentId: string, orderedItemIds: unknown) {
  const result = await safely(sectionId, "classroom.assignment.update", () => reorderAssignmentItems({ sectionId, assignmentId, orderedItemIds }));
  if (result.ok) refresh(sectionId, assignmentId);
  return result.ok ? { ok: true, message: "Assignment items reordered.", data: result.data } as const : result;
}
export async function getAssignmentItemsAction(sectionId: string, assignmentId: string) {
  return listAssignmentItems({ sectionId, assignmentId });
}

export async function listPublisherAssignmentQuestionsAction(sectionId: string, assignmentId: string, input: {
  moduleId: string;
  pageId?: string;
}) {
  return listPublisherAssignmentQuestions({ sectionId, assignmentId, ...input });
}