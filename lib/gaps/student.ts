import "server-only";

import { getPremiumFeatureEntitlementForAuthenticatedUser } from "@/lib/entitlements/features";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student-dashboard";
import { FRIENDLY_GAP_SEVERITY } from "./policy";

export async function getStudentGapAccess() {
  const identity = await requireStudent();
  if (!identity.student.userId) return { state: "LOCKED" as const, identity };
  const decision = await getPremiumFeatureEntitlementForAuthenticatedUser({ id: identity.student.userId, role: "STUDENT" }, { feature: "GAP_ANALYSIS", academicYearId: identity.academicYear.id });
  return { state: decision.allowed ? "ALLOWED" as const : decision.reason === "FEATURE_DISABLED" ? "FEATURE_DISABLED" as const : "LOCKED" as const, identity };
}

const gapInclude = {
  subject: { select: { name: true } },
  book: { select: { title: true } },
  chapter: { select: { title: true, chapterNumber: true } },
} as const;

export async function getStudentGaps() {
  const access = await getStudentGapAccess();
  if (access.state !== "ALLOWED") return { state: access.state, gaps: [], sufficientEvidence: false };
  const [gaps, latestRun] = await Promise.all([
    prisma.studentLearningGap.findMany({ where: { studentId: access.identity.student.id, academicYearId: access.identity.academicYear.id }, include: gapInclude, orderBy: [{ status: "asc" }, { severity: "desc" }, { lastDetectedAt: "desc" }], take: 100 }),
    prisma.gapAnalysisRun.findFirst({ where: { studentId: access.identity.student.id, academicYearId: access.identity.academicYear.id }, orderBy: { createdAt: "desc" }, select: { sufficientEvidenceCount: true } }),
  ]);
  return { state: "READY" as const, gaps: gaps.map(toStudentGapCard), sufficientEvidence: Boolean(latestRun?.sufficientEvidenceCount), year: access.identity.academicYear.name };
}

export async function getStudentGapDetail(gapId: string) {
  const access = await getStudentGapAccess();
  if (access.state !== "ALLOWED") return null;
  const gap = await prisma.studentLearningGap.findFirst({ where: { id: gapId, studentId: access.identity.student.id, academicYearId: access.identity.academicYear.id }, include: gapInclude });
  if (!gap) return null;
  const evidence = await prisma.studentLearningGapEvidence.findMany({ where: { gapId: gap.id, runId: gap.latestRunId }, orderBy: { createdAt: "asc" }, select: { evidenceType: true, metricKey: true, metricValue: true, sampleSize: true, observedAt: true } });
  return { ...toStudentGapCard(gap), firstDetectedAt: gap.firstDetectedAt, evidence: evidence.map((row) => ({ label: safeMetricLabel(row.metricKey), value: safeMetricValue(row.metricKey, row.metricValue), sampleSize: row.sampleSize, observedAt: row.observedAt })) };
}

function toStudentGapCard(gap: Awaited<ReturnType<typeof prisma.studentLearningGap.findMany>>[number] & { subject: { name: string } | null; book: { title: string } | null; chapter: { title: string; chapterNumber: number } | null }) {
  const learningArea = gap.skillLabel ?? gap.chapter?.title ?? gap.book?.title ?? gap.subject?.name ?? "this learning area";
  return { id: gap.id, subject: gap.subject?.name ?? "General learning", book: gap.book?.title ?? null, chapter: gap.chapter ? `Chapter ${gap.chapter.chapterNumber}: ${gap.chapter.title}` : null, learningArea, dimension: gap.dimension, severity: gap.severity, severityLabel: FRIENDLY_GAP_SEVERITY[gap.severity], status: gap.status, message: `Your recent scored learning activity shows that ${learningArea} may need more attention.`, lastDetectedAt: gap.lastDetectedAt };
}

function safeMetricLabel(key: string) {
  return key === "PRACTICE_AVERAGE" ? "Recent practice" : key === "ASSESSMENT_AVERAGE" ? "Recent assessments" : key === "READING_COMPLETION" ? "Reading progress" : key === "REVISION_COMPLETION" ? "Revision progress" : "Learning assistant support used";
}

function safeMetricValue(key: string, value: number) { return key === "AI_SUPPORT_REQUESTS" ? `${Math.round(value)} requests` : `${Math.round(value)}%`; }
