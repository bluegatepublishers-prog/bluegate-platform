import "server-only";

import { EnrollmentStatus, PlatformFeatureKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { SafeEntitlementError } from "./errors";
import { decidePremiumFeatureEntitlement } from "./features-policy";
import { getEffectiveStudentPlan } from "./student-plan";
import type {
  AuthenticatedEntitlementUser,
  EntitlementDecision,
  FeatureEntitlementRequest,
  PremiumFeatureKey,
} from "./types";

const PLATFORM_FEATURE_BY_PREMIUM_FEATURE: Partial<
  Record<PremiumFeatureKey, PlatformFeatureKey>
> = {
  HOMEWORK: PlatformFeatureKey.HOMEWORK,
  ASSIGNMENTS: PlatformFeatureKey.ASSIGNMENTS,
  INTERACTIVE_QUIZZES: PlatformFeatureKey.INTERACTIVE_QUIZZES,
  ASSESSMENTS: PlatformFeatureKey.ASSESSMENTS,
  REPORTS: PlatformFeatureKey.REPORTS,
  GAP_ANALYSIS: PlatformFeatureKey.GAP_ANALYSIS,
  REMEDIALS: PlatformFeatureKey.REMEDIALS,
  STUDENT_AI: PlatformFeatureKey.STUDENT_AI,
  TUTOR_SUPPORT: PlatformFeatureKey.TUTOR_PLATFORM,
};

export function getPlatformFeatureForPremiumFeature(feature: PremiumFeatureKey) {
  return PLATFORM_FEATURE_BY_PREMIUM_FEATURE[feature] ?? null;
}

export async function getPremiumFeatureEntitlementForAuthenticatedUser(
  user: AuthenticatedEntitlementUser,
  request: FeatureEntitlementRequest,
): Promise<EntitlementDecision> {
  if (!user.id) return { allowed: false, reason: "NOT_AUTHENTICATED" };
  if (user.role !== "STUDENT") return { allowed: false, reason: "WRONG_ROLE" };
  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    include: { school: { include: { publisher: { select: { active: true } } } } },
  });
  if (!student?.active || !student.school.publisherId) {
    return { allowed: false, reason: "NO_ENROLLMENT" };
  }
  if (!student.school.publisher?.active) {
    return { allowed: false, reason: "PUBLISHER_INACTIVE" };
  }
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      studentId: student.id,
      schoolId: student.schoolId,
      academicYearId: request.academicYearId,
      status: EnrollmentStatus.ACTIVE,
      academicYear: {
        active: true,
        current: request.academicYearId ? undefined : true,
      },
      schoolClass: { active: true },
      section: { active: true },
    },
    select: { academicYearId: true },
  });
  if (!enrollment) return { allowed: false, reason: "NO_ENROLLMENT" };
  const platformFeature = getPlatformFeatureForPremiumFeature(request.feature);
  const publisherFeatureEnabled = Boolean(
    platformFeature &&
      (await isPublisherFeatureEnabled(
        student.school.publisherId,
        platformFeature,
      )),
  );
  const effectivePlan = await getEffectiveStudentPlan(
    student.id,
    enrollment.academicYearId,
  );
  return decidePremiumFeatureEntitlement({
    plan: effectivePlan.plan,
    feature: request.feature,
    publisherFeatureEnabled,
  });
}

export async function canUsePremiumFeature(
  user: AuthenticatedEntitlementUser,
  request: FeatureEntitlementRequest,
) {
  return (await getPremiumFeatureEntitlementForAuthenticatedUser(user, request))
    .allowed;
}

export async function requirePremiumFeature(
  user: AuthenticatedEntitlementUser,
  request: FeatureEntitlementRequest,
) {
  const decision = await getPremiumFeatureEntitlementForAuthenticatedUser(
    user,
    request,
  );
  if (!decision.allowed) {
    throw new SafeEntitlementError(
      decision.reason === "FEATURE_DISABLED" ? "feature" : "premium",
    );
  }
  return decision;
}
