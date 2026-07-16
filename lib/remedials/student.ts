import "server-only";

import { getPremiumFeatureEntitlementForAuthenticatedUser } from "@/lib/entitlements/features";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student-dashboard";
import { FRIENDLY_STEP_LABEL } from "./policy";

export async function getStudentRemedialAccess() {
  const identity = await requireStudent();
  if (!identity.student.userId) return { state: "LOCKED" as const, identity };
  const decision = await getPremiumFeatureEntitlementForAuthenticatedUser({ id: identity.student.userId, role: "STUDENT" }, { feature: "REMEDIALS", academicYearId: identity.academicYear.id });
  return { state: decision.allowed ? "ALLOWED" as const : decision.reason === "FEATURE_DISABLED" ? "FEATURE_DISABLED" as const : "LOCKED" as const, identity };
}

export async function getStudentRemedialPlans() {
  const access = await getStudentRemedialAccess();
  if (access.state !== "ALLOWED") return { state: access.state, plans: [] };
  const plans = await prisma.remedialPlan.findMany({ where: { studentId: access.identity.student.id, academicYearId: access.identity.academicYear.id, status: { in: ["ACTIVE", "COMPLETED"] } }, include: { gap: { include: { subject: { select: { name: true } }, chapter: { select: { title: true } } } }, steps: { include: { recommendation: true }, orderBy: { sequence: "asc" } } }, orderBy: [{ status: "asc" }, { priority: "desc" }, { dueAt: "asc" }] });
  return { state: "READY" as const, plans: plans.map((plan) => ({ id: plan.id, status: plan.status, subject: plan.gap.subject?.name ?? "General learning", learningArea: plan.gap.skillLabel ?? plan.gap.chapter?.title ?? "Learning focus", dueAt: plan.dueAt, completed: plan.steps.filter((step) => step.status === "COMPLETED" || step.status === "TEACHER_CLOSED").length, total: plan.steps.filter((step) => step.recommendation.required).length, steps: plan.steps.map((step) => ({ id: step.id, type: step.recommendation.type, action: FRIENDLY_STEP_LABEL[step.recommendation.type], label: step.recommendation.labelSnapshot, required: step.recommendation.required, status: step.status, pageStart: step.recommendation.pageStart, pageEnd: step.recommendation.pageEnd, bookId: step.recommendation.bookId, chapterId: step.recommendation.chapterId, resourceId: step.recommendation.resourceId, assessmentId: step.recommendation.assessmentId })) })) };
}
