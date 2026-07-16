import { GapReviewAction } from "@prisma/client";

export type ValidatedGapReview = { action: GapReviewAction; reason: string | null };

export function validateGapReviewInput(actionValue: string, reasonValue: unknown): ValidatedGapReview | null {
  if (!Object.values(GapReviewAction).includes(actionValue as GapReviewAction)) return null;
  const action = actionValue as GapReviewAction;
  if (action === GapReviewAction.ACKNOWLEDGE) return { action, reason: null };
  if (typeof reasonValue !== "string") return null;
  const reason = reasonValue.trim().replace(/\s+/g, " ");
  return reason.length >= 5 && reason.length <= 500 ? { action, reason } : null;
}
