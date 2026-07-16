import "server-only";

import { createHash } from "node:crypto";
import { Prisma, RemedialPlanStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recommendForGap } from "./recommend";

export async function generateRemedialDraftForGap(gapId: string, now = new Date()) {
  const recommendation = await recommendForGap(gapId, now);
  if (!recommendation?.draft.recommendations.length) return { state: "NO_APPROVED_CONTENT" as const };
  const fingerprint = createHash("sha256").update(JSON.stringify(recommendation.draft.recommendations)).digest("hex").slice(0, 24);
  const generationKey = `${gapId}:${recommendation.gap.latestRunId}:${recommendation.draft.policyVersion}:${fingerprint}`;
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`remedial:${gapId}`}))`;
    const existing = await tx.remedialPlan.findUnique({ where: { generationKey } });
    if (existing) return { state: "UNCHANGED" as const, planId: existing.id };
    await tx.remedialPlan.updateMany({ where: { gapId, status: RemedialPlanStatus.DRAFT }, data: { status: RemedialPlanStatus.SUPERSEDED, supersededAt: now } });
    const plan = await tx.remedialPlan.create({ data: { publisherId: recommendation.gap.publisherId, schoolId: recommendation.gap.schoolId, studentId: recommendation.gap.studentId, academicYearId: recommendation.gap.academicYearId, gapId, policyVersion: recommendation.draft.policyVersion, recommendationFingerprint: fingerprint, generationKey, priority: recommendation.draft.priority, dueAt: recommendation.draft.dueAt }, select: { id: true } });
    await tx.remedialRecommendation.createMany({ data: recommendation.draft.recommendations.map((item, sequence) => ({ ...item, planId: plan.id, sequence })) });
    const recommendations = await tx.remedialRecommendation.findMany({ where: { planId: plan.id }, orderBy: { sequence: "asc" }, select: { id: true, sequence: true } });
    await tx.remedialStep.createMany({ data: recommendations.map((item) => ({ planId: plan.id, recommendationId: item.id, sequence: item.sequence })) });
    return { state: "CREATED" as const, planId: plan.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function generateRemedialsForStudent(scope: { studentId: string; academicYearId: string }) {
  const gaps = await prisma.studentLearningGap.findMany({ where: { ...scope, status: { in: ["OPEN", "ACKNOWLEDGED"] } }, orderBy: { id: "asc" }, select: { id: true } });
  const results = [];
  for (const gap of gaps) results.push(await generateRemedialDraftForGap(gap.id));
  return results;
}

export async function generateRemedialsBestEffort(scope: { studentId: string; academicYearId: string }) {
  try { return await generateRemedialsForStudent(scope); }
  catch { console.error("Remedial draft generation failed after a completed gap update."); return []; }
}
