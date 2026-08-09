import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  assignmentItemRequiresBook,
  buildAssignmentAwareTargetKey,
  normalizeInstructionPayload,
  normalizeTeacherQuestionPayload,
  resolvePublisherPageItem,
  validateAssignmentItemOrder,
} from "../lib/assignments/assignment-item-policy";
import type { ContentDocument } from "../lib/content-document";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

function v2Document(frameX = 0): ContentDocument {
  return {
    version: 2,
    layoutVersion: 2,
    blocks: [],
    pageLayout: {
      pageSize: { width: 800, height: 1000, unit: "PX" },
      pages: [{
        id: "page-1",
        order: 0,
        width: 800,
        height: 1000,
        unit: "PX",
        frames: [{
          id: "frame-1",
          type: "TEXT",
          pageId: "page-1",
          x: frameX,
          y: 0,
          width: 400,
          height: 100,
          zIndex: 5,
          layer: "CONTENT",
          layoutMode: "FLOW",
          wrapMode: "NONE",
          rotation: 0,
          locked: false,
          hidden: false,
          readable: true,
          readingOrder: 0,
          textSpans: [{ text: "Properties of Magnets" }],
        }],
      }],
    },
  } as unknown as ContentDocument;
}

test("V2-13C reserves bookless assignments for non-answerable instructions", () => {
  assert.equal(assignmentItemRequiresBook("INSTRUCTION"), false);
  assert.equal(assignmentItemRequiresBook("PUBLISHER_PAGE"), true);
  assert.equal(assignmentItemRequiresBook("PUBLISHER_QUESTION"), true);
  assert.equal(assignmentItemRequiresBook("TEACHER_QUESTION"), true);
});

test("teacher instruction and question payloads are bounded plain data with stable MCQ ids", () => {
  assert.deepEqual(normalizeInstructionPayload({ text: "Read the example, then explain it." }), { text: "Read the example, then explain it." });
  assert.throws(() => normalizeInstructionPayload({ text: "<b>unsafe</b>" }));

  const first = normalizeTeacherQuestionPayload({
    prompt: "Which material is magnetic?",
    responseType: "MCQ",
    options: ["Iron", "Wood"],
  });
  const revised = normalizeTeacherQuestionPayload({
    prompt: "Which material is magnetic?",
    responseType: "MCQ",
    options: ["Iron", "Plastic"],
  }, first);
  assert.equal(first.options?.[0]?.id, revised.options?.[0]?.id);
  assert.notEqual(first.options?.[1]?.id, revised.options?.[1]?.id);
  assert.throws(() => normalizeTeacherQuestionPayload({ prompt: "x", responseType: "MCQ", options: ["Same", "Same"] }));
});

test("page identity and semantic source hashing ignore visual-only changes", () => {
  const first = resolvePublisherPageItem({ type: "PUBLISHER_PAGE", moduleId: "module-1", pageId: "page-1" }, v2Document(0));
  const moved = resolvePublisherPageItem({ type: "PUBLISHER_PAGE", moduleId: "module-1", pageId: "page-1" }, v2Document(480));
  assert.equal(first.targetSourceHash, moved.targetSourceHash);
  assert.equal(first.targetLabelSnapshot, "Page 1 — Properties of Magnets");
});

test("assignment-aware answer keys separate self-study and every assignment item", () => {
  const a = buildAssignmentAwareTargetKey({
    assignmentItemId: "assignment-item-a",
    target: { pageId: "page-1", frameId: "frame-1", questionId: "question-1" },
  });
  const b = buildAssignmentAwareTargetKey({
    assignmentItemId: "assignment-item-b",
    target: { pageId: "page-1", frameId: "frame-1", questionId: "question-1" },
  });
  const teacher = buildAssignmentAwareTargetKey({ assignmentItemId: "teacher-question", teacherQuestion: true });
  assert.notEqual(a, b);
  assert.match(a, /^ASSIGNMENT_ITEM:assignment-item-a:QUESTION:/u);
  assert.equal(teacher, "ASSIGNMENT_ITEM:teacher-question:TEACHER_QUESTION");
});

test("item reordering validates exact membership before collision-safe persistence", () => {
  assert.deepEqual(validateAssignmentItemOrder(["a", "b", "c"], ["c", "a", "b"]), ["c", "a", "b"]);
  assert.throws(() => validateAssignmentItemOrder(["a", "b"], ["a", "a"]));
  assert.throws(() => validateAssignmentItemOrder(["a", "b"], ["a"]));
});

test("V2-13C runtime reuses authoritative access, Student filtering, transactions, and contextual Student Work", () => {
  const service = read("lib/assignments/assignment-items.ts");
  const work = read("lib/student-work.ts");
  const actions = read("app/teacher-dashboard/classes/[sectionId]/assignments/actions.ts");

  for (const fragment of [
    "requireOwnedTeacherAssignment",
    "requireStudentAssignment",
    "requireBookEntitlement",
    "filterDocumentForMode",
    "loadPublishedContentDocument",
    "isolationLevel: Prisma.TransactionIsolationLevel.Serializable",
    "assignmentItemId",
    "buildAssignmentAwareTargetKey",
    "isAssignmentVisible",
  ]) assert.equal(service.includes(fragment), true);

  assert.equal(read("lib/assignments/assignment-item-policy.ts").includes('return type !== "INSTRUCTION"'), true);
  assert.equal(service.includes("Select a book before adding an answerable assignment item"), true);
  assert.equal(work.includes("resolveStudentAssignmentItemForWork"), true);
  assert.equal(work.includes("assignmentItemId"), true);
  assert.equal(actions.includes("createAssignmentItemAction"), true);
  assert.equal(actions.includes("reorderAssignmentItemsAction"), true);
  assert.equal(service.includes("contentDocument.update"), false);
  assert.equal(service.includes("teachingPeriodPageRef.update"), false);
});
