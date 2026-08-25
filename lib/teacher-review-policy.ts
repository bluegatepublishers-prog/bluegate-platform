export type ReviewSubmissionStatus = "DRAFT" | "SUBMITTED" | "RETURNED" | "RESUBMITTED" | "GRADED";
export type ReviewAssessmentAttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "PENDING_REVIEW" | "GRADED" | "ABANDONED";

export function assignmentNeedsReview(status: ReviewSubmissionStatus) {
  return status === "SUBMITTED" || status === "RESUBMITTED";
}

export function assessmentNeedsGrading(status: ReviewAssessmentAttemptStatus, pendingResponseCount: number) {
  return (status === "SUBMITTED" || status === "PENDING_REVIEW") && pendingResponseCount > 0;
}

export function reviewableAssignment(status: string) {
  return status === "PUBLISHED" || status === "CLOSED";
}

export function reviewableAssessment(status: string) {
  return status === "PUBLISHED" || status === "CLOSED";
}

export function validAssignmentMarks(marks: number | null, maximum: number | null) {
  return marks === null || (maximum !== null && Number.isFinite(marks) && marks >= 0 && marks <= maximum);
}

export function deriveReviewCounts(input: {
  assignments: Array<{ status: string; submissions: Array<{ status: ReviewSubmissionStatus }> }>;
  assessmentResponses: number;
}) {
  const submissions = input.assignments
    .filter((assignment) => reviewableAssignment(assignment.status))
    .flatMap((assignment) => assignment.submissions)
    .filter((submission) => assignmentNeedsReview(submission.status));
  return {
    assignmentSubmissions: submissions.length,
    assignmentResubmissions: submissions.filter((submission) => submission.status === "RESUBMITTED").length,
    assessmentResponses: input.assessmentResponses,
    total: submissions.length + input.assessmentResponses,
  };
}
