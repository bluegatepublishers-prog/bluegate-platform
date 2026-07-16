import assert from "node:assert/strict";
import test from "node:test";
import { GapDimension, GapSeverity } from "@prisma/client";
import { canAutomaticallyResolveGap, evaluateGapPolicy, GAP_POLICY } from "../lib/gaps/policy";

const now = new Date("2026-07-13T12:00:00.000Z");
test("gap policy rejects weak and unscored evidence", () => {
  assert.equal(evaluateGapPolicy({ dimension: GapDimension.SUBJECT, practiceAverage: 20, practiceCount: 1, aiRequests: 20, readingPercent: 10, now }).state, "INSUFFICIENT");
  assert.equal(evaluateGapPolicy({ dimension: GapDimension.CHAPTER, aiRequests: 20, readingPercent: 10, revisionPercent: 0, now }).state, "INSUFFICIENT");
});

test("repeated and mixed scored evidence create deterministic severity", () => {
  assert.equal(evaluateGapPolicy({ dimension: GapDimension.SUBJECT, practiceAverage: 72, practiceCount: 2, now }).state, "INSUFFICIENT");
  assert.equal(evaluateGapPolicy({ dimension: GapDimension.SUBJECT, practiceAverage: 72, practiceCount: 3, now }).severity, GapSeverity.LOW);
  assert.equal(evaluateGapPolicy({ dimension: GapDimension.BOOK, practiceAverage: 55, practiceCount: 1, assessmentAverage: 45, assessmentCount: 1, now }).severity, GapSeverity.MODERATE);
  assert.equal(evaluateGapPolicy({ dimension: GapDimension.CHAPTER, practiceAverage: 35, practiceCount: 2, now }).severity, GapSeverity.HIGH);
  assert.equal(evaluateGapPolicy({ dimension: GapDimension.CHAPTER, practiceAverage: 20, practiceCount: 3, lastObservedAt: now, now }).severity, GapSeverity.CRITICAL);
});

test("formal question coverage supports learning outcome and competency dimensions", () => {
  for (const dimension of [GapDimension.LEARNING_OUTCOME, GapDimension.COMPETENCY]) {
    const result = evaluateGapPolicy({ dimension, assessmentAverage: 38, assessmentCount: 3, formalAssessmentCount: 1, questionCoverage: GAP_POLICY.formalAssessmentCoverage, lastObservedAt: now, now });
    assert.equal(result.state, "GAP");
    assert.equal(result.severity, GapSeverity.HIGH);
  }
});

test("support context never changes a clear scored signal into a gap", () => {
  const result = evaluateGapPolicy({ dimension: GapDimension.SUBJECT, practiceAverage: 90, practiceCount: 3, aiRequests: 50, readingPercent: 0, revisionPercent: 0, now });
  assert.equal(result.state, "CLEAR");
});

test("automatic recovery is conservative and requires new evidence", () => {
  assert.equal(canAutomaticallyResolveGap({ currentAverage: 80, currentSampleSize: 4, baselineSampleSize: 3 }), false);
  assert.equal(canAutomaticallyResolveGap({ currentAverage: 74, currentSampleSize: 5, baselineSampleSize: 3 }), false);
  assert.equal(canAutomaticallyResolveGap({ currentAverage: 80, currentSampleSize: 5, baselineSampleSize: 3 }), true);
});
