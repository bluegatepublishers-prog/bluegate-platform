export type SchoolAccessPlanValue = "FREE" | "PAID";
export type SchoolAccessStatusValue = "ACTIVE" | "SUSPENDED" | "EXPIRED";

export type SchoolAccessSubscriptionFacts = {
  plan: SchoolAccessPlanValue;
  status: SchoolAccessStatusValue;
  startsAt?: Date | null;
  expiresAt?: Date | null;
};

export type SchoolCapability =
  | "SCHOOL_DASHBOARD"
  | "TEACHER_DASHBOARD"
  | "STUDENT_DASHBOARD"
  | "ASSIGNMENTS"
  | "ASSESSMENTS"
  | "AI_TOOLS"
  | "ADVANCED_REPORTS"
  | "PREMIUM_QR_CONTENT"
  | "BOOK_CONTENT"
  | "RESOURCE_CONTENT";

export type SchoolAccessDecision =
  | { allowed: true; reason: "ALLOWED" }
  | {
      allowed: false;
      reason:
        | "WRONG_ROLE"
        | "ACCESS_NOT_STARTED"
        | "ACCESS_SUSPENDED"
        | "ACCESS_EXPIRED"
        | "UPGRADE_REQUIRED"
        | "FEATURE_DISABLED"
        | "CONTENT_NOT_ASSIGNED";
      message: string;
    };

const PREMIUM_CAPABILITIES = new Set<SchoolCapability>([
  "TEACHER_DASHBOARD",
  "STUDENT_DASHBOARD",
  "ASSIGNMENTS",
  "ASSESSMENTS",
  "AI_TOOLS",
  "ADVANCED_REPORTS",
  "PREMIUM_QR_CONTENT",
]);

const FEATURE_GATED_CAPABILITIES = new Set<SchoolCapability>([
  "AI_TOOLS",
  "ADVANCED_REPORTS",
  "PREMIUM_QR_CONTENT",
]);

const CONTENT_CAPABILITIES = new Set<SchoolCapability>([
  "BOOK_CONTENT",
  "RESOURCE_CONTENT",
  "PREMIUM_QR_CONTENT",
]);

const ROLES: Record<SchoolCapability, readonly string[]> = {
  SCHOOL_DASHBOARD: ["SCHOOL"],
  TEACHER_DASHBOARD: ["TEACHER"],
  STUDENT_DASHBOARD: ["STUDENT"],
  ASSIGNMENTS: ["SCHOOL", "TEACHER", "STUDENT"],
  ASSESSMENTS: ["SCHOOL", "TEACHER", "STUDENT"],
  AI_TOOLS: ["TEACHER", "STUDENT"],
  ADVANCED_REPORTS: ["SCHOOL", "TEACHER", "STUDENT"],
  PREMIUM_QR_CONTENT: ["SCHOOL", "TEACHER", "STUDENT"],
  BOOK_CONTENT: ["SCHOOL", "TEACHER", "STUDENT"],
  RESOURCE_CONTENT: ["SCHOOL", "TEACHER", "STUDENT"],
};

export function effectiveSchoolAccessStatus(
  subscription: SchoolAccessSubscriptionFacts,
  now = new Date(),
): SchoolAccessStatusValue | "NOT_STARTED" {
  if (subscription.status !== "ACTIVE") return subscription.status;
  if (subscription.startsAt && subscription.startsAt > now) return "NOT_STARTED";
  if (subscription.expiresAt && subscription.expiresAt <= now) return "EXPIRED";
  return "ACTIVE";
}

export function decideSchoolAccess(input: {
  subscription: SchoolAccessSubscriptionFacts;
  capability: SchoolCapability;
  role: string;
  publisherFeatureEnabled?: boolean;
  contentEntitled?: boolean;
  now?: Date;
}): SchoolAccessDecision {
  if (!ROLES[input.capability].includes(input.role)) {
    return { allowed: false, reason: "WRONG_ROLE", message: "This area is not available for your role." };
  }

  const status = effectiveSchoolAccessStatus(input.subscription, input.now);
  if (status === "NOT_STARTED") {
    return { allowed: false, reason: "ACCESS_NOT_STARTED", message: "School access has not started yet." };
  }
  if (status === "SUSPENDED") {
    return { allowed: false, reason: "ACCESS_SUSPENDED", message: "School access is temporarily suspended. Contact your publisher administrator." };
  }
  if (status === "EXPIRED") {
    return { allowed: false, reason: "ACCESS_EXPIRED", message: "School access has expired. Contact your publisher administrator to renew." };
  }
  if (PREMIUM_CAPABILITIES.has(input.capability) && input.subscription.plan !== "PAID") {
    return { allowed: false, reason: "UPGRADE_REQUIRED", message: "Upgrade this school to Paid to use this feature." };
  }
  if (FEATURE_GATED_CAPABILITIES.has(input.capability) && !input.publisherFeatureEnabled) {
    return { allowed: false, reason: "FEATURE_DISABLED", message: "This feature is not enabled by your publisher." };
  }
  if (CONTENT_CAPABILITIES.has(input.capability) && !input.contentEntitled) {
    return { allowed: false, reason: "CONTENT_NOT_ASSIGNED", message: "This content has not been assigned to your school." };
  }
  return { allowed: true, reason: "ALLOWED" };
}

export const canUseTeacherDashboard = (input: Omit<Parameters<typeof decideSchoolAccess>[0], "capability">) =>
  decideSchoolAccess({ ...input, capability: "TEACHER_DASHBOARD" }).allowed;
export const canUseStudentDashboard = (input: Omit<Parameters<typeof decideSchoolAccess>[0], "capability">) =>
  decideSchoolAccess({ ...input, capability: "STUDENT_DASHBOARD" }).allowed;
export const canUseAssignments = (input: Omit<Parameters<typeof decideSchoolAccess>[0], "capability">) =>
  decideSchoolAccess({ ...input, capability: "ASSIGNMENTS" }).allowed;
export const canUseAssessments = (input: Omit<Parameters<typeof decideSchoolAccess>[0], "capability">) =>
  decideSchoolAccess({ ...input, capability: "ASSESSMENTS" }).allowed;
export const canUseAiTools = (input: Omit<Parameters<typeof decideSchoolAccess>[0], "capability">) =>
  decideSchoolAccess({ ...input, capability: "AI_TOOLS" }).allowed;
export const canUseAdvancedReports = (input: Omit<Parameters<typeof decideSchoolAccess>[0], "capability">) =>
  decideSchoolAccess({ ...input, capability: "ADVANCED_REPORTS" }).allowed;
export const canUsePremiumQrContent = (input: Omit<Parameters<typeof decideSchoolAccess>[0], "capability">) =>
  decideSchoolAccess({ ...input, capability: "PREMIUM_QR_CONTENT" }).allowed;
