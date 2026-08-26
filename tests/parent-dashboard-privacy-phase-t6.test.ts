import assert from "node:assert/strict";
import test from "node:test";

import { parentAssignmentResultProjection } from "../lib/parent-policy";

const submission = {
  status: "GRADED",
  marksAwarded: 8,
  teacherFeedback: "Keep practising.",
};

test("Parent assignment projection hides unreleased marks and feedback", () => {
  assert.deepEqual(
    parentAssignmentResultProjection({
      resultsPublishedAt: null,
      submission,
    }),
    { marksAwarded: null, teacherFeedback: null },
  );
});

test("Parent assignment projection allows returned feedback but not unreleased marks", () => {
  assert.deepEqual(
    parentAssignmentResultProjection({
      resultsPublishedAt: null,
      submission: { ...submission, status: "RETURNED" },
    }),
    { marksAwarded: null, teacherFeedback: submission.teacherFeedback },
  );
});

test("Parent assignment projection releases marks and feedback only after publication", () => {
  assert.deepEqual(
    parentAssignmentResultProjection({
      resultsPublishedAt: new Date("2026-08-26T00:00:00.000Z"),
      submission,
    }),
    { marksAwarded: submission.marksAwarded, teacherFeedback: submission.teacherFeedback },
  );
});
