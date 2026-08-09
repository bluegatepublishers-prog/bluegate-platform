import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertStudentWorkTargetKeyLength,
  buildStudentWorkTargetKey,
  StudentWorkPolicyError,
  STUDENT_WORK_TARGET_KEY_MAX_LENGTH,
} from "../lib/student-work-policy";
import { buildAssignmentAwareTargetKey } from "../lib/assignments/assignment-item-policy";


test("the shared target-key policy accepts 511 and 512, and rejects 513", () => {
  assert.equal(assertStudentWorkTargetKeyLength("x".repeat(511)).length, 511);
  assert.equal(assertStudentWorkTargetKeyLength("x".repeat(STUDENT_WORK_TARGET_KEY_MAX_LENGTH)).length, 512);
  assert.throws(
    () => assertStudentWorkTargetKeyLength("x".repeat(513)),
    (error: unknown) => error instanceof StudentWorkPolicyError && error.code === "INVALID_TARGET",
  );
});

test("self-study and assignment-aware keys stay distinct and use the same guard", () => {
  const selfStudy = buildStudentWorkTargetKey({ bookId: "book-1", type: "ANSWER", target: { pageId: "page-1", frameId: "frame-1", questionId: "question-1" } });
  const assignmentA = buildAssignmentAwareTargetKey({ assignmentItemId: "assignment-a", target: { pageId: "page-1", frameId: "frame-1", questionId: "question-1" } });
  const assignmentB = buildAssignmentAwareTargetKey({ assignmentItemId: "assignment-b", target: { pageId: "page-1", frameId: "frame-1", questionId: "question-1" } });
  const teacherA = buildAssignmentAwareTargetKey({ assignmentItemId: "teacher-a", teacherQuestion: true });
  const teacherB = buildAssignmentAwareTargetKey({ assignmentItemId: "teacher-b", teacherQuestion: true });
  for (const key of [selfStudy, assignmentA, assignmentB, teacherA, teacherB]) assert.equal(assertStudentWorkTargetKeyLength(key), key);
  assert.equal(new Set([selfStudy, assignmentA, assignmentB, teacherA, teacherB]).size, 5);
});

test("an oversized assignment-aware key is rejected before the persistence transaction", () => {
  const longId = "x".repeat(128);
  const key = buildAssignmentAwareTargetKey({ assignmentItemId: longId, target: { pageId: longId, frameId: longId, childFrameId: longId, questionId: longId } });
  assert.ok(key.length > STUDENT_WORK_TARGET_KEY_MAX_LENGTH);
  assert.throws(() => assertStudentWorkTargetKeyLength(key), StudentWorkPolicyError);
  const service = readFileSync("lib/student-work.ts", "utf8");
  const upsertStart = service.indexOf("export async function upsertStudentWork");
  const guard = service.indexOf("assertStudentWorkTargetKeyLength", upsertStart);
  const transaction = service.indexOf("prisma.$transaction", upsertStart);
  assert.ok(guard > upsertStart && guard < transaction);
});