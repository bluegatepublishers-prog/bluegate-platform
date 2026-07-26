import type { ClassroomAssignmentStatus } from "@prisma/client";

export type AssignmentTiming = {
  status: ClassroomAssignmentStatus;
  publishAt: Date | null;
  dueAt: Date | null;
  closeAt: Date | null;
  allowLateSubmission: boolean;
  archivedAt: Date | null;
};

export function isAssignmentVisible(input: AssignmentTiming, now = new Date()) {
  if (input.status === "ARCHIVED" || input.archivedAt) return false;
  if (input.status === "PUBLISHED" || input.status === "CLOSED") return true;
  return input.status === "SCHEDULED" && Boolean(input.publishAt && input.publishAt <= now);
}

export function assignmentWindow(input: AssignmentTiming, now = new Date()) {
  const visible = isAssignmentVisible(input, now);
  const closed = input.status === "CLOSED" || Boolean(input.closeAt && input.closeAt <= now);
  const late = Boolean(input.dueAt && input.dueAt < now);
  return {
    visible,
    closed,
    late,
    acceptsSubmission: visible && !closed && (!late || input.allowLateSubmission),
  };
}

export function assignmentDisplayStatus(input: AssignmentTiming, now = new Date()) {
  const window = assignmentWindow(input, now);
  if (!window.visible) return input.status === "SCHEDULED" ? "UPCOMING" : input.status;
  if (window.closed) return "CLOSED";
  if (window.late) return input.allowLateSubmission ? "LATE" : "CLOSED";
  return "DUE";
}

