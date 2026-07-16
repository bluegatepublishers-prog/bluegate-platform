import { GapSeverity, RemedialRecommendationType } from "@prisma/client";
import type { RemedialDraft, RemedialPolicyInput } from "./types";

export const REMEDIAL_POLICY = Object.freeze({
  version: "BG-REMEDIAL-1.0",
  dueDays: { CRITICAL: 7, HIGH: 14, MODERATE: 21, LOW: 30 } satisfies Record<GapSeverity, number>,
  priority: { CRITICAL: 100, HIGH: 75, MODERATE: 50, LOW: 25 } satisfies Record<GapSeverity, number>,
});

const order: Record<GapSeverity, RemedialRecommendationType[]> = {
  CRITICAL: ["SPECIFIC_PAGES", "BOOK_CHAPTER", "REVISION_HUB", "VIDEO", "PPT", "WORKSHEET", "INTERACTIVE_PRACTICE", "ASSESSMENT_RETRY", "STUDENT_AI", "FUTURE_MENTOR"],
  HIGH: ["REVISION_HUB", "VIDEO", "PPT", "WORKSHEET", "INTERACTIVE_PRACTICE", "ASSESSMENT_RETRY", "BOOK_CHAPTER", "STUDENT_AI", "FUTURE_MENTOR"],
  MODERATE: ["REVISION_HUB", "INTERACTIVE_PRACTICE", "ASSESSMENT_RETRY", "BOOK_CHAPTER", "VIDEO", "PPT", "WORKSHEET", "STUDENT_AI", "FUTURE_MENTOR"],
  LOW: ["REVISION_HUB", "INTERACTIVE_PRACTICE", "BOOK_CHAPTER", "VIDEO", "PPT", "WORKSHEET", "ASSESSMENT_RETRY", "STUDENT_AI", "FUTURE_MENTOR"],
};

export function buildRemedialDraft(input: RemedialPolicyInput): RemedialDraft {
  const rank = new Map(order[input.severity].map((type, index) => [type, index]));
  const seen = new Set<string>();
  const recommendations = input.references
    .filter((item) => {
      const key = [item.type, item.bookId, item.chapterId, item.resourceId, item.assessmentId, item.pageStart, item.pageEnd].join(":");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (rank.get(a.type) ?? 99) - (rank.get(b.type) ?? 99) || a.labelSnapshot.localeCompare(b.labelSnapshot));
  const now = input.now ?? new Date();
  return { policyVersion: REMEDIAL_POLICY.version, priority: REMEDIAL_POLICY.priority[input.severity], dueAt: new Date(now.getTime() + REMEDIAL_POLICY.dueDays[input.severity] * 86_400_000), recommendations };
}

export const FRIENDLY_STEP_LABEL: Record<RemedialRecommendationType, string> = {
  BOOK_CHAPTER: "Read the chapter", SPECIFIC_PAGES: "Read these pages", REVISION_HUB: "Review the chapter", WORKSHEET: "Complete the worksheet", VIDEO: "Watch the video", PPT: "Review the presentation", INTERACTIVE_PRACTICE: "Try interactive practice", ASSESSMENT_RETRY: "Retry the assessment", STUDENT_AI: "Ask the learning assistant (optional)", FUTURE_MENTOR: "Meet a mentor",
};
