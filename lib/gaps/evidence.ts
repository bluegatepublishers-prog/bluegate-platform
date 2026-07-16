import { GapEvidenceType } from "@prisma/client";
import { GAP_POLICY } from "./policy";
import type { GapMetricEvidence, GapPolicyInput } from "./types";

export function buildMetricEvidence(input: GapPolicyInput & { sourceAnalyticsType: string; sourceAnalyticsId: string; observedAt: Date }) {
  const rows: GapMetricEvidence[] = [];
  if (input.practiceAverage != null && (input.practiceCount ?? 0) > 0) rows.push({ evidenceType: GapEvidenceType.PRACTICE, metricKey: "PRACTICE_AVERAGE", metricValue: input.practiceAverage, thresholdValue: GAP_POLICY.lowThreshold, sampleSize: input.practiceCount, observedAt: input.observedAt, sourceAnalyticsType: input.sourceAnalyticsType, sourceAnalyticsId: input.sourceAnalyticsId });
  if (input.assessmentAverage != null && (input.assessmentCount ?? 0) > 0) rows.push({ evidenceType: GapEvidenceType.ASSESSMENT, metricKey: "ASSESSMENT_AVERAGE", metricValue: input.assessmentAverage, thresholdValue: GAP_POLICY.lowThreshold, sampleSize: input.assessmentCount, observedAt: input.observedAt, sourceAnalyticsType: input.sourceAnalyticsType, sourceAnalyticsId: input.sourceAnalyticsId });
  if (input.readingPercent != null && input.readingPercent < 100) rows.push({ evidenceType: GapEvidenceType.READING, metricKey: "READING_COMPLETION", metricValue: input.readingPercent, observedAt: input.observedAt, sourceAnalyticsType: input.sourceAnalyticsType, sourceAnalyticsId: input.sourceAnalyticsId });
  if (input.revisionPercent != null && input.revisionPercent < 100) rows.push({ evidenceType: GapEvidenceType.REVISION, metricKey: "REVISION_COMPLETION", metricValue: input.revisionPercent, observedAt: input.observedAt, sourceAnalyticsType: input.sourceAnalyticsType, sourceAnalyticsId: input.sourceAnalyticsId });
  if ((input.aiRequests ?? 0) > 0) rows.push({ evidenceType: GapEvidenceType.AI_SUPPORT, metricKey: "AI_SUPPORT_REQUESTS", metricValue: input.aiRequests!, observedAt: input.observedAt, sourceAnalyticsType: input.sourceAnalyticsType, sourceAnalyticsId: input.sourceAnalyticsId });
  return rows;
}
