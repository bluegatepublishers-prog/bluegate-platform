import "server-only";

import { RemedialPlanStatus, RemedialStepStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function transitionRemedialStep(input: { stepId: string; toStatus: RemedialStepStatus; actorUserId?: string; sourceType: string; sourceId?: string }) {
  return prisma.$transaction(async (tx) => {
    const step = await tx.remedialStep.findUnique({ where: { id: input.stepId }, include: { plan: { select: { id: true, status: true } } } });
    if (!step || step.plan.status !== RemedialPlanStatus.ACTIVE) return { state: "NOT_ACTIVE" as const };
    if (step.status === RemedialStepStatus.COMPLETED || step.status === RemedialStepStatus.SKIPPED || step.status === RemedialStepStatus.TEACHER_CLOSED) return { state: "UNCHANGED" as const };
    const now = new Date();
    await tx.remedialStep.update({ where: { id: step.id }, data: { status: input.toStatus, startedAt: input.toStatus === RemedialStepStatus.IN_PROGRESS ? now : step.startedAt, completedAt: input.toStatus === RemedialStepStatus.COMPLETED ? now : null, skippedAt: input.toStatus === RemedialStepStatus.SKIPPED ? now : null, teacherClosedAt: input.toStatus === RemedialStepStatus.TEACHER_CLOSED ? now : null } });
    await tx.remedialStepEvent.create({ data: { stepId: step.id, actorUserId: input.actorUserId, fromStatus: step.status, toStatus: input.toStatus, sourceType: input.sourceType, sourceId: input.sourceId } });
    const remaining = await tx.remedialStep.count({ where: { planId: step.plan.id, recommendation: { required: true }, status: { notIn: [RemedialStepStatus.COMPLETED, RemedialStepStatus.TEACHER_CLOSED] } } });
    if (!remaining) await tx.remedialPlan.update({ where: { id: step.plan.id }, data: { status: RemedialPlanStatus.COMPLETED, completedAt: now, activeKey: null } });
    return { state: "UPDATED" as const };
  });
}

export async function completeMatchingRemedialSteps(input: { studentId: string; academicYearId: string; type: string; bookId?: string; chapterId?: string; resourceId?: string; assessmentId?: string; sourceId?: string }) {
  const steps = await prisma.remedialStep.findMany({ where: { plan: { studentId: input.studentId, academicYearId: input.academicYearId, status: RemedialPlanStatus.ACTIVE }, recommendation: { type: input.type as never, ...(input.bookId ? { bookId: input.bookId } : {}), ...(input.chapterId ? { chapterId: input.chapterId } : {}), ...(input.resourceId ? { resourceId: input.resourceId } : {}), ...(input.assessmentId ? { assessmentId: input.assessmentId } : {}) } }, select: { id: true } });
  for (const step of steps) await transitionRemedialStep({ stepId: step.id, toStatus: RemedialStepStatus.COMPLETED, sourceType: input.type, sourceId: input.sourceId });
}

export async function completeReadingRemedialSteps(input: { studentId: string; academicYearId: string; bookId: string; lastPage: number; bookCompleted: boolean; sourceId: string }) {
  const steps = await prisma.remedialStep.findMany({ where: { plan: { studentId: input.studentId, academicYearId: input.academicYearId, status: RemedialPlanStatus.ACTIVE }, OR: [{ recommendation: { type: "SPECIFIC_PAGES", bookId: input.bookId, pageEnd: { lte: input.lastPage } } }, ...(input.bookCompleted ? [{ recommendation: { type: "BOOK_CHAPTER" as const, bookId: input.bookId } }] : [])] }, select: { id: true } });
  for (const step of steps) await transitionRemedialStep({ stepId: step.id, toStatus: RemedialStepStatus.COMPLETED, sourceType: "READING", sourceId: input.sourceId });
}

export async function updateOwnRemedialStep(input: { stepId: string; action: "START" | "COMPLETE" }) {
  const { requireStudent } = await import("@/lib/student-dashboard");
  const identity = await requireStudent();
  const step = await prisma.remedialStep.findFirst({ where: { id: input.stepId, plan: { studentId: identity.student.id, academicYearId: identity.academicYear.id, status: RemedialPlanStatus.ACTIVE } }, select: { id: true, recommendation: { select: { type: true } } } });
  if (!step) return { state: "NOT_FOUND" as const };
  if (input.action === "COMPLETE" && !["VIDEO", "PPT", "WORKSHEET"].includes(step.recommendation.type)) return { state: "NOT_ALLOWED" as const };
  return transitionRemedialStep({ stepId: step.id, toStatus: input.action === "START" ? RemedialStepStatus.IN_PROGRESS : RemedialStepStatus.COMPLETED, actorUserId: identity.student.userId ?? undefined, sourceType: "STUDENT_PATH" });
}
