import assert from "node:assert/strict";
import test from "node:test";

import {
  mentorAssignmentResultProjection,
  mentorAssessmentResultProjection,
} from "../lib/mentor-policy";

const submission = {
  status: "GRADED",
  marksAwarded: 8,
  teacherFeedback: "Keep practising.",
};

test("Mentor assignment projection hides unreleased marks and feedback", () => {
  assert.deepEqual(
    mentorAssignmentResultProjection({ resultsPublishedAt: null, submission }),
    { marksAwarded: null, teacherFeedback: null },
  );
});

test("Mentor assignment projection allows returned feedback but not unreleased marks", () => {
  assert.deepEqual(
    mentorAssignmentResultProjection({
      resultsPublishedAt: null,
      submission: { ...submission, status: "RETURNED" },
    }),
    { marksAwarded: null, teacherFeedback: submission.teacherFeedback },
  );
});

test("Mentor assignment projection releases marks after assignment result publication", () => {
  assert.deepEqual(
    mentorAssignmentResultProjection({
      resultsPublishedAt: new Date("2026-08-26T00:00:00.000Z"),
      submission,
    }),
    { marksAwarded: submission.marksAwarded, teacherFeedback: submission.teacherFeedback },
  );
});

test("Mentor assessment projection respects the canonical release timing policy", () => {
  const dueAt = new Date("2026-08-30T00:00:00.000Z");
  const publishedAt = new Date("2026-08-26T00:00:00.000Z");

  assert.deepEqual(
    mentorAssessmentResultProjection({
      publishedAt,
      release: "AFTER_DUE_DATE",
      dueAt,
      showScore: true,
      percentage: 80,
      now: new Date("2026-08-27T00:00:00.000Z"),
    }),
    { released: false, score: null },
  );

  assert.deepEqual(
    mentorAssessmentResultProjection({
      publishedAt,
      release: "AFTER_DUE_DATE",
      dueAt,
      showScore: true,
      percentage: 80,
      now: new Date("2026-08-31T00:00:00.000Z"),
    }),
    { released: true, score: 80 },
  );
});
