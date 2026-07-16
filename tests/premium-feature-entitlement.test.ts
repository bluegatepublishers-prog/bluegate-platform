import assert from "node:assert/strict";
import test from "node:test";
import { SafeEntitlementError, SAFE_ENTITLEMENT_MESSAGES } from "../lib/entitlements/errors";
import {
  decidePremiumFeatureEntitlement,
  planIncludesPremiumFeature,
} from "../lib/entitlements/features-policy";

test("SCHOOL_BASIC denies premium features", () => {
  assert.deepEqual(
    decidePremiumFeatureEntitlement({
      plan: "SCHOOL_BASIC",
      feature: "ASSIGNMENTS",
      publisherFeatureEnabled: true,
    }),
    { allowed: false, reason: "PREMIUM_REQUIRED" },
  );
});

test("SCHOOL_PREMIUM allows the initial school premium matrix", () => {
  for (const feature of [
    "ASSIGNMENTS",
    "INTERACTIVE_QUIZZES",
    "ASSESSMENTS",
    "REPORTS",
    "GAP_ANALYSIS",
    "REMEDIALS",
    "SCHOOL_TEACHER_SUPPORT",
  ] as const) {
    assert.equal(planIncludesPremiumFeature("SCHOOL_PREMIUM", feature), true);
  }
});

test("INDIVIDUAL_PREMIUM allows learning features but not mentor support", () => {
  assert.equal(
    planIncludesPremiumFeature("INDIVIDUAL_PREMIUM", "REVISION_PLANNER"),
    true,
  );
  assert.equal(
    planIncludesPremiumFeature("INDIVIDUAL_PREMIUM", "TUTOR_SUPPORT"),
    false,
  );
});

test("mentor entitlement exists only on the mentor plan", () => {
  assert.equal(
    planIncludesPremiumFeature("SCHOOL_PREMIUM", "TUTOR_SUPPORT"),
    false,
  );
  assert.equal(
    planIncludesPremiumFeature("INDIVIDUAL_PREMIUM", "TUTOR_SUPPORT"),
    false,
  );
  assert.equal(
    planIncludesPremiumFeature(
      "INDIVIDUAL_PREMIUM_MENTOR",
      "TUTOR_SUPPORT",
    ),
    true,
  );
});

test("publisher feature disabled still denies a premium plan", () => {
  assert.deepEqual(
    decidePremiumFeatureEntitlement({
      plan: "INDIVIDUAL_PREMIUM_MENTOR",
      feature: "STUDENT_AI",
      publisherFeatureEnabled: false,
    }),
    { allowed: false, reason: "FEATURE_DISABLED" },
  );
});

test("safe errors never reveal tenant, adoption, plan-source, or record details", () => {
  assert.deepEqual(SAFE_ENTITLEMENT_MESSAGES, {
    book: "This book is not available for your account.",
    resource: "This learning resource is not available for your account.",
    premium: "This feature requires premium access.",
    feature: "This feature is not available on your platform.",
  });
  for (const capability of ["book", "resource", "premium", "feature"] as const) {
    const error = new SafeEntitlementError(capability);
    assert.doesNotMatch(
      error.message,
      /publisher|school mismatch|adoption|studentId|teacherId|academicYear|prisma|grant source/i,
    );
  }
});
