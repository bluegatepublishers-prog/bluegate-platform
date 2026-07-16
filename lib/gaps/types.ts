import type { GapDimension, GapEvidenceType, GapSeverity } from "@prisma/client";

export type GapMetricEvidence = {
  evidenceType: GapEvidenceType;
  metricKey: string;
  metricValue: number;
  thresholdValue?: number;
  sampleSize?: number;
  observedAt: Date;
  sourceAnalyticsType: string;
  sourceAnalyticsId: string;
};

export type GapPolicyInput = {
  dimension: GapDimension;
  practiceAverage?: number | null;
  practiceCount?: number;
  assessmentAverage?: number | null;
  assessmentCount?: number;
  formalAssessmentCount?: number;
  questionCoverage?: number;
  readingPercent?: number | null;
  revisionPercent?: number | null;
  aiRequests?: number;
  lastObservedAt?: Date | null;
  now?: Date;
};

export type GapPolicyEvaluation = {
  state: "INSUFFICIENT" | "CLEAR" | "GAP";
  averagePercent: number | null;
  sampleSize: number;
  severity: GapSeverity | null;
  score: number | null;
  reasons: string[];
};

export type GapCandidate = {
  dimension: GapDimension;
  subjectId?: string | null;
  bookId?: string | null;
  chapterId?: string | null;
  skillKey?: string | null;
  skillLabel?: string | null;
  detectionKey: string;
  evaluation: GapPolicyEvaluation;
  evidence: GapMetricEvidence[];
};
