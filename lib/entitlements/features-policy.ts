import type {
  EntitlementDecision,
  PremiumFeatureKey,
  StudentAccessPlanValue,
} from "./types";

const SCHOOL_PREMIUM_FEATURES = new Set<PremiumFeatureKey>([
  "HOMEWORK",
  "ASSIGNMENTS",
  "INTERACTIVE_QUIZZES",
  "ASSESSMENTS",
  "REPORTS",
  "GAP_ANALYSIS",
  "REMEDIALS",
  "STUDENT_AI",
  "PROGRESS_ANALYTICS",
  "REVISION_PLANNER",
  "SCHOOL_TEACHER_SUPPORT",
]);

const INDIVIDUAL_PREMIUM_FEATURES = new Set<PremiumFeatureKey>([
  "HOMEWORK",
  "ASSIGNMENTS",
  "INTERACTIVE_QUIZZES",
  "ASSESSMENTS",
  "REPORTS",
  "GAP_ANALYSIS",
  "REMEDIALS",
  "STUDENT_AI",
  "PROGRESS_ANALYTICS",
  "REVISION_PLANNER",
]);

export function planIncludesPremiumFeature(
  plan: StudentAccessPlanValue,
  feature: PremiumFeatureKey,
) {
  if (plan === "SCHOOL_BASIC") return false;
  if (plan === "SCHOOL_PREMIUM") return SCHOOL_PREMIUM_FEATURES.has(feature);
  if (plan === "INDIVIDUAL_PREMIUM") {
    return INDIVIDUAL_PREMIUM_FEATURES.has(feature);
  }
  return (
    INDIVIDUAL_PREMIUM_FEATURES.has(feature) || feature === "TUTOR_SUPPORT"
  );
}

export function decidePremiumFeatureEntitlement(input: {
  plan: StudentAccessPlanValue;
  feature: PremiumFeatureKey;
  publisherFeatureEnabled: boolean;
}): EntitlementDecision {
  if (!input.publisherFeatureEnabled) {
    return { allowed: false, reason: "FEATURE_DISABLED" };
  }
  if (!planIncludesPremiumFeature(input.plan, input.feature)) {
    return { allowed: false, reason: "PREMIUM_REQUIRED" };
  }
  return {
    allowed: true,
    reason: "ALLOWED",
    source:
      input.plan === "SCHOOL_PREMIUM"
        ? "SCHOOL_PREMIUM"
        : "STUDENT_PREMIUM",
  };
}
