import "server-only";

import { createHash } from "node:crypto";
import { GapDimension, GapStatus, PlatformFeatureKey, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { buildMetricEvidence } from "./evidence";
import { canAutomaticallyResolveGap, evaluateGapPolicy, GAP_POLICY } from "./policy";
import type { GapCandidate, GapPolicyInput } from "./types";

type RecomputeScope = { studentId: string; academicYearId: string };
type AnalyticsContext = { publisherId: string; schoolId: string; studentId: string; academicYearId: string };

function candidate(input: AnalyticsContext & {
  dimension: GapDimension;
  identifier: string;
  sourceAnalyticsType: string;
  sourceAnalyticsId: string;
  observedAt: Date;
  policy: GapPolicyInput;
  subjectId?: string | null;
  bookId?: string | null;
  chapterId?: string | null;
  skillKey?: string | null;
  skillLabel?: string | null;
}): GapCandidate {
  const evaluation = evaluateGapPolicy(input.policy);
  return {
    dimension: input.dimension,
    subjectId: input.subjectId,
    bookId: input.bookId,
    chapterId: input.chapterId,
    skillKey: input.skillKey,
    skillLabel: input.skillLabel,
    detectionKey: `${input.studentId}:${input.academicYearId}:${input.dimension}:${input.identifier}:${GAP_POLICY.version}`,
    evaluation,
    evidence: evaluation.state === "INSUFFICIENT" ? [] : buildMetricEvidence({ ...input.policy, sourceAnalyticsType: input.sourceAnalyticsType, sourceAnalyticsId: input.sourceAnalyticsId, observedAt: input.observedAt }),
  };
}

const weighted = (rows: Array<{ average: number | null; count: number }>) => {
  const usable = rows.filter((row): row is { average: number; count: number } => row.average != null && row.count > 0);
  const count = usable.reduce((sum, row) => sum + row.count, 0);
  return count ? Math.round(usable.reduce((sum, row) => sum + row.average * row.count, 0) / count * 100) / 100 : null;
};

async function loadCandidates(scope: RecomputeScope) {
  const summary = await prisma.studentAnalytics.findUnique({ where: { studentId_academicYearId: scope } });
  if (!summary) return null;
  const context: AnalyticsContext = { publisherId: summary.publisherId, schoolId: summary.schoolId, studentId: summary.studentId, academicYearId: summary.academicYearId };
  const [subjects, chapters, skills] = await Promise.all([
    prisma.studentSubjectAnalytics.findMany({ where: scope, orderBy: { id: "asc" } }),
    prisma.studentChapterAnalytics.findMany({ where: scope, include: { book: { select: { subjectId: true } } }, orderBy: { id: "asc" } }),
    prisma.studentSkillAnalytics.findMany({ where: { ...scope, subjectId: { not: null }, skillLabel: { not: null } }, orderBy: { id: "asc" } }),
  ]);
  const candidates: GapCandidate[] = subjects.map((row) => candidate({
    ...context, dimension: GapDimension.SUBJECT, identifier: row.subjectId, subjectId: row.subjectId,
    sourceAnalyticsType: "StudentSubjectAnalytics", sourceAnalyticsId: row.id, observedAt: row.updatedAt,
    policy: { dimension: GapDimension.SUBJECT, practiceAverage: row.averagePractice, practiceCount: row.practicesCompleted, assessmentAverage: row.averageAssessment, assessmentCount: row.assessmentsCompleted, readingPercent: row.readingPercent, revisionPercent: row.revisionPercent, aiRequests: row.aiRequests, lastObservedAt: row.lastScoredAt },
  }));
  candidates.push(...chapters.map((row) => candidate({
    ...context, dimension: GapDimension.CHAPTER, identifier: row.chapterId, subjectId: row.book.subjectId, bookId: row.bookId, chapterId: row.chapterId,
    sourceAnalyticsType: "StudentChapterAnalytics", sourceAnalyticsId: row.id, observedAt: row.updatedAt,
    policy: { dimension: GapDimension.CHAPTER, practiceAverage: row.averagePractice, practiceCount: row.practicesCompleted, assessmentAverage: row.averageAssessment, assessmentCount: row.assessmentsCompleted, revisionPercent: row.revisionPercent, aiRequests: row.aiRequests, lastObservedAt: row.lastScoredAt },
  })));
  const byBook = new Map<string, typeof chapters>();
  for (const row of chapters) byBook.set(row.bookId, [...(byBook.get(row.bookId) ?? []), row]);
  for (const [bookId, rows] of byBook) {
    const practiceCount = rows.reduce((sum, row) => sum + row.practicesCompleted, 0);
    const assessmentCount = rows.reduce((sum, row) => sum + row.assessmentsCompleted, 0);
    const observedAt = rows.map((row) => row.updatedAt).sort((a, b) => +b - +a)[0];
    candidates.push(candidate({
      ...context, dimension: GapDimension.BOOK, identifier: bookId, subjectId: rows[0].book.subjectId, bookId,
      sourceAnalyticsType: "StudentChapterAnalytics", sourceAnalyticsId: `book:${bookId}`, observedAt,
      policy: { dimension: GapDimension.BOOK, practiceAverage: weighted(rows.map((row) => ({ average: row.averagePractice, count: row.practicesCompleted }))), practiceCount, assessmentAverage: weighted(rows.map((row) => ({ average: row.averageAssessment, count: row.assessmentsCompleted }))), assessmentCount, revisionPercent: weighted(rows.map((row) => ({ average: row.revisionPercent, count: 1 }))), aiRequests: rows.reduce((sum, row) => sum + row.aiRequests, 0), lastObservedAt: rows.map((row) => row.lastScoredAt).filter((date): date is Date => Boolean(date)).sort((a, b) => +b - +a)[0] ?? null },
    }));
  }
  candidates.push(...skills.map((row) => {
    const dimension = row.dimension === "COMPETENCY" ? GapDimension.COMPETENCY : GapDimension.LEARNING_OUTCOME;
    return candidate({
      ...context, dimension, identifier: row.skillKey, subjectId: row.subjectId, skillKey: row.skillKey, skillLabel: row.skillLabel,
      sourceAnalyticsType: "StudentSkillAnalytics", sourceAnalyticsId: row.id, observedAt: row.updatedAt,
      policy: { dimension, assessmentAverage: row.averagePercent, assessmentCount: row.attempts, formalAssessmentCount: 1, questionCoverage: row.attempts, lastObservedAt: row.lastAssessedAt },
    });
  }));
  const fingerprint = createHash("sha256").update(JSON.stringify([summary.updatedAt.toISOString(), ...subjects.map((row) => [row.id, row.updatedAt.toISOString()]), ...chapters.map((row) => [row.id, row.updatedAt.toISOString()]), ...skills.map((row) => [row.id, row.updatedAt.toISOString()])])).digest("hex").slice(0, 24);
  return { context, candidates, runKey: `${scope.studentId}:${scope.academicYearId}:${GAP_POLICY.version}:${fingerprint}` };
}

export async function recomputeStudentGaps(scope: RecomputeScope) {
  const loaded = await loadCandidates(scope);
  if (!loaded) return { state: "NO_ANALYTICS" as const, detectedCount: 0, resolvedCount: 0 };
  if (!await isPublisherFeatureEnabled(loaded.context.publisherId, PlatformFeatureKey.GAP_ANALYSIS)) return { state: "FEATURE_DISABLED" as const, detectedCount: 0, resolvedCount: 0 };
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`gap:${scope.studentId}:${scope.academicYearId}`}))`;
    const existingRun = await tx.gapAnalysisRun.findUnique({ where: { runKey: loaded.runKey } });
    if (existingRun) return { state: "UNCHANGED" as const, detectedCount: existingRun.detectedCount, resolvedCount: existingRun.resolvedCount };
    const run = await tx.gapAnalysisRun.create({ data: { runKey: loaded.runKey, ...loaded.context, policyVersion: GAP_POLICY.version, completedAt: new Date() } });
    let detectedCount = 0;
    let resolvedCount = 0;
    let sufficientEvidenceCount = 0;
    for (const item of loaded.candidates) {
      if (item.evaluation.state !== "INSUFFICIENT") sufficientEvidenceCount += 1;
      const active = await tx.studentLearningGap.findUnique({ where: { activeKey: item.detectionKey } });
      if (item.evaluation.state === "GAP" && item.evaluation.severity) {
        const previous = active ?? await tx.studentLearningGap.findFirst({ where: { detectionKey: item.detectionKey }, orderBy: { createdAt: "desc" } });
        if (!active && previous && item.evaluation.sampleSize <= previous.baselineSampleSize) continue;
        const values = { severity: item.evaluation.severity, policyVersion: GAP_POLICY.version, score: item.evaluation.score, evidenceCount: item.evaluation.sampleSize, baselineSampleSize: item.evaluation.sampleSize, lastDetectedAt: new Date(), latestRunId: run.id };
        const gap = active
          ? await tx.studentLearningGap.update({ where: { id: active.id }, data: values })
          : await tx.studentLearningGap.create({ data: { ...loaded.context, ...values, subjectId: item.subjectId ?? null, bookId: item.bookId ?? null, chapterId: item.chapterId ?? null, skillKey: item.skillKey ?? null, skillLabel: item.skillLabel ?? null, dimension: item.dimension, detectionKey: item.detectionKey, activeKey: item.detectionKey } });
        for (const evidence of item.evidence) await tx.studentLearningGapEvidence.create({ data: { gapId: gap.id, runId: run.id, ...evidence } });
        detectedCount += 1;
      } else if (active && item.evaluation.state === "CLEAR" && canAutomaticallyResolveGap({ currentAverage: item.evaluation.averagePercent, currentSampleSize: item.evaluation.sampleSize, baselineSampleSize: active.baselineSampleSize })) {
        for (const evidence of item.evidence) await tx.studentLearningGapEvidence.create({ data: { gapId: active.id, runId: run.id, ...evidence } });
        await tx.studentLearningGap.update({ where: { id: active.id }, data: { status: GapStatus.RESOLVED, activeKey: null, resolvedAt: new Date(), latestRunId: run.id, baselineSampleSize: item.evaluation.sampleSize } });
        resolvedCount += 1;
      }
    }
    await tx.gapAnalysisRun.update({ where: { id: run.id }, data: { detectedCount, resolvedCount, sufficientEvidenceCount } });
    return { state: "COMPLETED" as const, detectedCount, resolvedCount };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function recomputeStudentGapsBestEffort(scope: RecomputeScope) {
  try {
    return await recomputeStudentGaps(scope);
  } catch {
    console.error("Gap recomputation failed after a completed analytics update.");
    return { state: "RETRY_REQUIRED" as const, detectedCount: 0, resolvedCount: 0 };
  }
}
