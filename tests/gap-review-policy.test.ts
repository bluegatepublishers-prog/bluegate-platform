import assert from "node:assert/strict";
import test from "node:test";
import { validateGapReviewInput } from "../lib/gaps/review-policy";

test("acknowledge is exact and ignores browser reason authority", () => {
  assert.deepEqual(validateGapReviewInput("ACKNOWLEDGE", "browser note"), { action: "ACKNOWLEDGE", reason: null });
  assert.equal(validateGapReviewInput("acknowledge", null), null);
});

test("dismissal and resolution require a bounded normalized reason", () => {
  assert.equal(validateGapReviewInput("DISMISS", "no"), null);
  assert.equal(validateGapReviewInput("RESOLVE", " ".repeat(10)), null);
  assert.deepEqual(validateGapReviewInput("DISMISS", "  Not supported   by context. "), { action: "DISMISS", reason: "Not supported by context." });
  assert.deepEqual(validateGapReviewInput("RESOLVE", "Reviewed with new evidence."), { action: "RESOLVE", reason: "Reviewed with new evidence." });
  assert.equal(validateGapReviewInput("RESOLVE", "x".repeat(501)), null);
});
