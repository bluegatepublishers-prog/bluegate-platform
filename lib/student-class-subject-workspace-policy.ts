export type StudentAssignmentState = "To Do" | "Draft Saved" | "Submitted" | "Returned" | "Resubmitted" | "Graded" | "Overdue";
export type StudentAssessmentState = "Available" | "In Progress" | "Submitted" | "Graded" | "Upcoming" | "Closed";

export function studentAssignmentState(
  row: { status: string; dueAt: string | null; isLate: boolean },
  now = new Date(),
): StudentAssignmentState {
  if (row.status === "DRAFT") return "Draft Saved";
  if (row.status === "RETURNED") return "Returned";
  if (row.status === "RESUBMITTED") return "Resubmitted";
  if (row.status === "SUBMITTED") return "Submitted";
  if (row.status === "GRADED") return "Graded";
  if (row.dueAt && new Date(row.dueAt) < now) return "Overdue";
  if (row.isLate) return "Overdue";
  return "To Do";
}

export function studentAssessmentState(
  row: { availability: string; attemptId: string | null; latestSubmittedAt: string | null },
): StudentAssessmentState {
  if (row.availability === "START") return "Available";
  if (row.availability === "CONTINUE") return "In Progress";
  if (row.availability === "RESULT") return "Graded";
  if (row.availability === "COMPLETED") return "Submitted";
  if (row.availability === "UPCOMING") return "Upcoming";
  return "Closed";
}
