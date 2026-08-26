import { canReleaseAssessmentResult } from "./assessment-policy";

export type MentorAssignmentFact = {
  status: "ACTIVE" | "ENDED" | "REVOKED";
  startsAt: Date;
  endsAt: Date | null;
  assignmentPublisherId: string;
  mentorPublisherId: string;
  schoolPublisherId: string | null;
  assignmentSchoolId: string;
  studentSchoolId: string;
  assignmentAcademicYearId: string;
  enrollmentAcademicYearId: string;
  plan: string;
  mentorActive: boolean;
  publisherActive: boolean;
  mentorFeatureEnabled: boolean;
};

export function canAccessMentorAssignment(fact: MentorAssignmentFact, now = new Date()) {
  return fact.status === "ACTIVE" && fact.startsAt <= now && (!fact.endsAt || fact.endsAt >= now) &&
    fact.mentorActive && fact.publisherActive && fact.mentorFeatureEnabled &&
    fact.plan === "INDIVIDUAL_PREMIUM_MENTOR" &&
    fact.assignmentPublisherId === fact.mentorPublisherId &&
    fact.assignmentPublisherId === fact.schoolPublisherId &&
    fact.assignmentSchoolId === fact.studentSchoolId &&
    fact.assignmentAcademicYearId === fact.enrollmentAcademicYearId;
}

export function assignmentKeys(studentId: string, academicYearId: string, mentorId: string, role: "PRIMARY" | "SUPPORTING") {
  return {
    activeKey: `${mentorId}:${studentId}:${academicYearId}`,
    activePrimaryKey: role === "PRIMARY" ? `${studentId}:${academicYearId}:PRIMARY` : null,
  };
}

export function validMentorNote(body: unknown) {
  if (typeof body !== "string") return null;
  const value = body.trim().replace(/\s+/g, " ");
  return value.length >= 5 && value.length <= 2000 ? value : null;
}

export function learningTrend(current: number | null, practice: number | null, assessment: number | null) {
  const values = [current, practice, assessment].filter((value): value is number => Number.isFinite(value));
  if (!values.length) return "Not enough evidence";
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return average >= 75 ? "Steady progress" : average >= 50 ? "Developing" : "Needs support";
}

export function mentorAssignmentResultProjection(input: {
  resultsPublishedAt: Date | null;
  submission: {
    status: string;
    marksAwarded: number | null;
    teacherFeedback: string | null;
  } | null;
}) {
  const released = Boolean(input.resultsPublishedAt && input.submission?.status === "GRADED");
  const feedbackVisible = input.submission?.status === "RETURNED" || released;
  return {
    marksAwarded: released ? input.submission?.marksAwarded ?? null : null,
    teacherFeedback: feedbackVisible ? input.submission?.teacherFeedback ?? null : null,
  };
}

export function mentorAssessmentResultProjection(input: {
  publishedAt: Date | null;
  release: "IMMEDIATE" | "AFTER_DUE_DATE" | "NEVER";
  dueAt: Date | null;
  showScore: boolean;
  percentage: number | null;
  now?: Date;
}) {
  const released = Boolean(
    input.publishedAt &&
    canReleaseAssessmentResult({ release: input.release, dueAt: input.dueAt, now: input.now }),
  );
  return {
    released,
    score: released && input.showScore ? input.percentage : null,
  };
}
