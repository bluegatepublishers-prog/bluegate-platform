import "server-only";

import { RemedialPlanStatus, RemedialReviewAction, RemedialStepStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTeacherGap } from "@/lib/gaps/teacher";
import { generateRemedialDraftForGap } from "./path";
import { transitionRemedialStep } from "./completion";

export class RemedialReviewError extends Error {}

export async function reviewRemedialPlan(planId: string) {
  const plan = await prisma.remedialPlan.findUnique({ where: { id: planId }, select: { id: true, gapId: true, status: true } });
  if (!plan) throw new RemedialReviewError("This plan is unavailable.");
  const { teacher } = await requireTeacherGap(plan.gapId);
  if (plan.status !== RemedialPlanStatus.DRAFT) throw new RemedialReviewError("Only a draft plan can be reviewed.");
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.remedialPlan.updateMany({ where: { gapId: plan.gapId, status: RemedialPlanStatus.ACTIVE }, data: { status: RemedialPlanStatus.SUPERSEDED, activeKey: null, supersededAt: now } });
    const changed = await tx.remedialPlan.updateMany({ where: { id: plan.id, status: RemedialPlanStatus.DRAFT }, data: { status: RemedialPlanStatus.ACTIVE, activeKey: plan.gapId, reviewedAt: now, reviewedById: teacher.userId, activatedAt: now } });
    if (changed.count !== 1) throw new RemedialReviewError("This plan changed before review was saved.");
    await tx.remedialPlanReview.create({ data: { planId: plan.id, actorUserId: teacher.userId, teacherId: teacher.id, action: RemedialReviewAction.REVIEW } });
  });
}

export async function recomputeRemedialPlan(planId: string) {
  const plan = await prisma.remedialPlan.findUnique({ where: { id: planId }, select: { gapId: true } });
  if (!plan) throw new RemedialReviewError("This plan is unavailable.");
  const { teacher } = await requireTeacherGap(plan.gapId);
  const result = await generateRemedialDraftForGap(plan.gapId);
  if ("planId" in result) await prisma.remedialPlanReview.create({ data: { planId: result.planId, actorUserId: teacher.userId, teacherId: teacher.id, action: RemedialReviewAction.RECOMPUTE } });
  return result;
}

export async function teacherCloseRemedialStep(stepId: string, planId: string) {
  const plan = await prisma.remedialPlan.findUnique({ where: { id: planId }, select: { gapId: true } });
  if (!plan) throw new RemedialReviewError("This plan is unavailable.");
  const { teacher } = await requireTeacherGap(plan.gapId);
  const step = await prisma.remedialStep.findFirst({ where: { id: stepId, planId }, select: { id: true } });
  if (!step) throw new RemedialReviewError("This step is unavailable.");
  await transitionRemedialStep({ stepId, toStatus: RemedialStepStatus.TEACHER_CLOSED, actorUserId: teacher.userId, sourceType: "TEACHER_REVIEW", sourceId: planId });
  await prisma.remedialPlanReview.create({ data: { planId, actorUserId: teacher.userId, teacherId: teacher.id, action: RemedialReviewAction.CLOSE_STEP } });
}
