export const PARENT_SAFE_STATUSES = ["APPROVED"] as const;

export function canParentViewChild(input: {
  parentActive: boolean;
  studentActive: boolean;
  relationshipStatus: string;
  canViewLearning: boolean;
  schoolApproved: boolean;
  schoolAccessActive: boolean;
  publisherActive: boolean;
  featureEnabled: boolean;
  relationshipStudentId: string;
  requestedStudentId: string;
}) {
  return input.parentActive && input.studentActive && input.relationshipStatus === "APPROVED" &&
    input.canViewLearning && input.schoolApproved && input.schoolAccessActive && input.publisherActive && input.featureEnabled &&
    input.relationshipStudentId === input.requestedStudentId;
}

export function parentGapMessage(input: { subject?: string | null; chapter?: string | null }) {
  const area = input.chapter ?? input.subject ?? "this learning area";
  return `Needs more practice with ${area}.`;
}

export function friendlyPlan(plan: string) {
  return ({ SCHOOL_BASIC: "School Basic", SCHOOL_PREMIUM: "School Premium", INDIVIDUAL_PREMIUM: "Individual Premium", INDIVIDUAL_PREMIUM_MENTOR: "Individual Premium with Mentor" } as Record<string, string>)[plan] ?? "School Basic";
}

export function friendlyPlanSource(source: string) {
  return source === "INDIVIDUAL" ? "Individual access" : source === "DEFAULT_SCHOOL_BASIC" || source === "SCHOOL" ? "Provided by school" : "Provided by publisher";
}
