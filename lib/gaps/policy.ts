import { GapSeverity } from "@prisma/client";
import type { GapPolicyEvaluation, GapPolicyInput } from "./types";

export const GAP_POLICY = Object.freeze({
  version: "BG-GAP-1.0",
  minimumScoredEvidence: 2,
  formalAssessmentCoverage: 3,
  lowThreshold: 80,
  moderateThreshold: 60,
  highThreshold: 40,
  criticalThreshold: 30,
  criticalEvidenceCount: 3,
  criticalRecencyDays: 90,
  recoveryThreshold: 75,
  recoveryNewEvidence: 2,
});

function weightedAverage(input: GapPolicyInput) {
  const values: Array<{ average: number; count: number }> = [];
  if (input.practiceAverage != null && (input.practiceCount ?? 0) > 0) values.push({ average: input.practiceAverage, count: input.practiceCount! });
  if (input.assessmentAverage != null && (input.assessmentCount ?? 0) > 0) values.push({ average: input.assessmentAverage, count: input.assessmentCount! });
  const count = values.reduce((sum, value) => sum + value.count, 0);
  if (!count) return null;
  return Math.round(values.reduce((sum, value) => sum + value.average * value.count, 0) / count * 100) / 100;
}

export function evaluateGapPolicy(input: GapPolicyInput): GapPolicyEvaluation {
  const practiceCount = input.practiceAverage == null ? 0 : input.practiceCount ?? 0;
  const assessmentCount = input.assessmentAverage == null ? 0 : input.assessmentCount ?? 0;
  const sampleSize = practiceCount + assessmentCount;
  const sufficientCoverage = (input.formalAssessmentCount ?? 0) > 0 && (input.questionCoverage ?? 0) >= GAP_POLICY.formalAssessmentCoverage;
  const sufficient = sampleSize >= GAP_POLICY.minimumScoredEvidence || sufficientCoverage;
  const averagePercent = weightedAverage(input);
  if (!sufficient || averagePercent == null) return { state: "INSUFFICIENT", averagePercent, sampleSize, severity: null, score: null, reasons: ["MORE_SCORED_EVIDENCE_REQUIRED"] };
  if (averagePercent >= GAP_POLICY.lowThreshold) return { state: "CLEAR", averagePercent, sampleSize, severity: null, score: null, reasons: ["CURRENT_SCORED_EVIDENCE_IS_ABOVE_THRESHOLD"] };
  const mixedEvidence = practiceCount > 0 && assessmentCount > 0;
  if (averagePercent >= GAP_POLICY.moderateThreshold && sampleSize < 3 && !mixedEvidence) return { state: "INSUFFICIENT", averagePercent, sampleSize, severity: null, score: null, reasons: ["REPEATED_OR_MIXED_EVIDENCE_REQUIRED"] };
  const now = input.now ?? new Date();
  const recent = Boolean(input.lastObservedAt && now.getTime() - input.lastObservedAt.getTime() <= GAP_POLICY.criticalRecencyDays * 86_400_000);
  const severity = averagePercent < GAP_POLICY.criticalThreshold && sampleSize >= GAP_POLICY.criticalEvidenceCount && recent
    ? GapSeverity.CRITICAL
    : averagePercent < GAP_POLICY.highThreshold
      ? GapSeverity.HIGH
      : averagePercent < GAP_POLICY.moderateThreshold
        ? GapSeverity.MODERATE
        : GapSeverity.LOW;
  const score = Math.min(100, Math.round(100 - averagePercent + Math.min(10, Math.max(0, sampleSize - 2) * 2)));
  const reasons = ["REPEATED_SCORED_EVIDENCE_BELOW_POLICY_THRESHOLD"];
  if (mixedEvidence) reasons.push("PRACTICE_AND_ASSESSMENT_SIGNALS_AGREE");
  if ((input.aiRequests ?? 0) > 0) reasons.push("LEARNING_ASSISTANT_USED_AS_SUPPORT_CONTEXT");
  if ((input.readingPercent ?? 100) < 100 || (input.revisionPercent ?? 100) < 100) reasons.push("LEARNING_COMPLETION_USED_AS_SUPPORT_CONTEXT");
  return { state: "GAP", averagePercent, sampleSize, severity, score, reasons };
}

export function canAutomaticallyResolveGap(input: { currentAverage: number | null; currentSampleSize: number; baselineSampleSize: number }) {
  return input.currentAverage != null && input.currentAverage >= GAP_POLICY.recoveryThreshold && input.currentSampleSize >= input.baselineSampleSize + GAP_POLICY.recoveryNewEvidence;
}

export const FRIENDLY_GAP_SEVERITY: Record<GapSeverity, string> = {
  LOW: "A little more practice",
  MODERATE: "Needs attention",
  HIGH: "Needs focused practice",
  CRITICAL: "Teacher support recommended",
};
