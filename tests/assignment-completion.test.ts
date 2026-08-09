import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { deriveAssignmentWorkCompletion } from "../lib/assignments/assignment-completion";

const publisherQuestion = (overrides: Record<string, unknown> = {}) => ({
  id: "publisher-question",
  type: "PUBLISHER_QUESTION" as const,
  state: "CURRENT" as const,
  currentTargetSourceHash: "current-hash",
  question: { id: "q1", type: "MCQ", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }] },
  ...overrides,
});

const teacherQuestion = (overrides: Record<string, unknown> = {}) => ({
  id: "teacher-question",
  type: "TEACHER_QUESTION" as const,
  state: "CURRENT" as const,
  currentTargetSourceHash: "teacher-hash",
  question: { id: "teacher-question", type: "LONG_TEXT" },
  ...overrides,
});

test("completion counts only currently resolvable answerable assignment items", () => {
  const completion = deriveAssignmentWorkCompletion({
    items: [
      { id: "page", type: "PUBLISHER_PAGE", state: "CURRENT" },
      { id: "instruction", type: "INSTRUCTION", state: "CURRENT" },
      publisherQuestion(),
      teacherQuestion({ id: "missing", state: "MISSING_TARGET", currentTargetSourceHash: null, question: undefined }),
    ],
    work: [{ assignmentItemId: "publisher-question", payload: { optionIds: ["a"] }, targetSourceHash: "current-hash" }],
  });
  assert.deepEqual(completion, {
    totalAnswerable: 1,
    completedAnswerable: 1,
    remainingAnswerable: 0,
    unavailableAnswerable: 1,
    staleAnswerable: 0,
    canSubmit: true,
    items: [
      { assignmentItemId: "page", state: "INFORMATIONAL" },
      { assignmentItemId: "instruction", state: "INFORMATIONAL" },
      { assignmentItemId: "publisher-question", state: "COMPLETE" },
      { assignmentItemId: "missing", state: "UNAVAILABLE" },
    ],
  });
});

test("completion rejects blank text, invalid choices, stale hashes, and work from another assignment item", () => {
  const completion = deriveAssignmentWorkCompletion({
    items: [publisherQuestion(), teacherQuestion()],
    work: [
      { assignmentItemId: "publisher-question", payload: { optionIds: ["removed"] }, targetSourceHash: "current-hash" },
      { assignmentItemId: "teacher-question", payload: { value: "earlier answer" }, targetSourceHash: "old-hash" },
      { assignmentItemId: "another-assignment-item", payload: { value: "ignored" }, targetSourceHash: "anything" },
    ],
  });
  assert.equal(completion.completedAnswerable, 0);
  assert.equal(completion.remainingAnswerable, 2);
  assert.equal(completion.staleAnswerable, 1);
  assert.equal(completion.canSubmit, false);
});

test("a current re-save after a source change restores completion without requiring correctness", () => {
  const item = teacherQuestion({ state: "SOURCE_CHANGED", currentTargetSourceHash: "new-hash" });
  const stale = deriveAssignmentWorkCompletion({ items: [item], work: [{ assignmentItemId: "teacher-question", payload: { value: "A response" }, targetSourceHash: "old-hash" }] });
  const current = deriveAssignmentWorkCompletion({ items: [item], work: [{ assignmentItemId: "teacher-question", payload: { value: "A response" }, targetSourceHash: "new-hash" }] });
  assert.equal(stale.canSubmit, false);
  assert.equal(stale.staleAnswerable, 1);
  assert.equal(current.canSubmit, true);
  assert.equal(current.completedAnswerable, 1);
});

test("V2-13F reuses the canonical submission and review services without a second submission system", () => {
  const submission = readFileSync("lib/assignments/submission-service.ts", "utf8");
  const queries = readFileSync("lib/assignments/queries.ts", "utf8");
  const review = readFileSync("components/assignments/SubmissionReviewList.tsx", "utf8");
  assert.match(submission, /getStudentAssignmentCompletion/);
  assert.match(submission, /assignmentType === "HOMEWORK"/);
  assert.match(submission, /updateMany/);
  assert.match(queries, /assignmentItem: \{ assignmentId \}/);
  assert.match(queries, /type: "ANSWER"/);
  assert.match(review, /AssignmentWorkReview/);
  assert.match(review, /student\.submission\.status !== "DRAFT"/);
});