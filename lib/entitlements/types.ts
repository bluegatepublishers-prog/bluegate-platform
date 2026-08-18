export type EntitlementSubjectType =
  | "SCHOOL"
  | "TEACHER"
  | "STUDENT"
  | "ADMIN"
  | "SUPER_ADMIN";

export type EntitlementSource =
  | "PUBLISHER_ADMIN"
  | "SCHOOL_BOOK_ENTITLEMENT"
  | "SCHOOL_BOOK_ADOPTION"
  | "SCHOOL_RESOURCE_ASSIGNMENT"
  | "TEACHER_ASSIGNMENT"
  | "STUDENT_ENROLLMENT"
  | "SCHOOL_PREMIUM"
  | "STUDENT_PREMIUM"
  | "FUTURE_TUTOR_ASSIGNMENT";

export type EntitlementDenyReason =
  | "NOT_AUTHENTICATED"
  | "WRONG_ROLE"
  | "PUBLISHER_INACTIVE"
  | "WRONG_PUBLISHER"
  | "SCHOOL_INACTIVE"
  | "NO_ACADEMIC_CONTEXT"
  | "NO_ASSIGNMENT"
  | "NO_ENROLLMENT"
  | "BOOK_NOT_APPROVED"
  | "RESOURCE_AUDIENCE_DENIED"
  | "FEATURE_DISABLED"
  | "PREMIUM_REQUIRED"
  | "RECORD_NOT_FOUND";

export type EntitlementDecision =
  | { allowed: true; reason: "ALLOWED"; source: EntitlementSource }
  | { allowed: false; reason: EntitlementDenyReason };

export interface AuthenticatedEntitlementUser {
  id?: string | null;
  role?: string | null;
}

export interface BookEntitlementRequest {
  bookId: string;
  academicYearId?: string;
  sectionId?: string;
  sectionSubjectId?: string;
}

export interface ResourceEntitlementRequest {
  resourceId: string;
  academicYearId?: string;
  sectionId?: string;
  sectionSubjectId?: string;
}

export const PREMIUM_FEATURE_KEYS = [
  "HOMEWORK",
  "ASSIGNMENTS",
  "INTERACTIVE_QUIZZES",
  "ASSESSMENTS",
  "REPORTS",
  "GAP_ANALYSIS",
  "REMEDIALS",
  "STUDENT_AI",
  "TUTOR_SUPPORT",
  "PROGRESS_ANALYTICS",
  "REVISION_PLANNER",
  "SCHOOL_TEACHER_SUPPORT",
] as const;

export type PremiumFeatureKey = (typeof PREMIUM_FEATURE_KEYS)[number];

export interface FeatureEntitlementRequest {
  feature: PremiumFeatureKey;
  academicYearId?: string;
}

export type StudentAccessPlanValue =
  | "SCHOOL_BASIC"
  | "SCHOOL_PREMIUM"
  | "INDIVIDUAL_PREMIUM"
  | "INDIVIDUAL_PREMIUM_MENTOR";

export type StudentAccessGrantSourceValue =
  | "DEFAULT_SCHOOL_BASIC"
  | "SCHOOL"
  | "INDIVIDUAL"
  | "PUBLISHER_ADMIN"
  | "MANUAL_TEST";
