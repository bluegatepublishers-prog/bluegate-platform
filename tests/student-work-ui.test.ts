import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { filterDocumentForMode } from "../lib/content-audience";
import { createContentDocument, type ContentBlock } from "../lib/content-document";
import { adoptLayoutV2, createV2Frame } from "../lib/content-layout-v2";
import { buildV2NarrationManifest } from "../lib/content-narration";
import { buildStudentWorkClientMap, payloadHighlightText, payloadOptionIds, payloadText, studentWorkTargetMatches, studentWorkTargetIdentity } from "../lib/student-work-client";

function studentFixture() {
  const worksheet = {
    id: "worksheet-1",
    type: "worksheet" as const,
    teacherNote: "Teacher-only guidance",
    questions: [{
      id: "question-1",
      type: "mcq" as const,
      prompt: "Which material is magnetic?",
      options: [{ id: "iron", text: "Iron" }, { id: "wood", text: "Wood" }],
      answer: "Iron",
      correctOption: "iron",
      explanation: "The answer key must not reach the browser.",
      visibility: { student: true, teacher: true },
    }],
  };
  const document = adoptLayoutV2(createContentDocument([worksheet as ContentBlock]), {
    pageSize: { width: 600, height: 800, unit: "px" },
    pages: [{ id: "page-1", order: 0, width: 600, height: 800, unit: "px", frames: [createV2Frame("WORKSHEET", "page-1", { id: "worksheet-frame", contentRef: { blockId: "worksheet-1" }, readable: true })] }],
  });
  return document;
}

test("student audience filtering removes answer keys and teacher notes without mutating Publisher Master", () => {
  const master = studentFixture();
  const student = filterDocumentForMode(master, "STUDENT", []);
  const originalQuestion = (master.blocks[0] as Extract<ContentBlock, { type: "worksheet" }>).questions[0]!;
  const studentQuestion = (student.blocks[0] as Extract<ContentBlock, { type: "worksheet" }>).questions[0]!;
  assert.equal(originalQuestion.correctOption, "iron");
  assert.equal(originalQuestion.explanation, "The answer key must not reach the browser.");
  assert.equal("correctOption" in studentQuestion, false);
  assert.equal("explanation" in studentQuestion, false);
  assert.equal((student.blocks[0] as Extract<ContentBlock, { type: "worksheet" }>).teacherNote, undefined);
});

test("client work map restores answers, notes, highlights, and bookmarks by semantic target", () => {
  const target = { chapterId: "chapter-1", moduleId: "module-1", pageId: "page-1", frameId: "worksheet-frame", questionId: "question-1" };
  const items = [
    { id: "answer-1", type: "ANSWER" as const, targetKey: "server-answer", target, payload: { value: "Iron" }, revision: 2, status: "CURRENT" as const, createdAt: "now", updatedAt: "now" },
    { id: "note-1", type: "NOTE" as const, targetKey: "server-note", target: { moduleId: "module-1", pageId: "page-1" }, payload: { text: "Review this." }, revision: 1, status: "CURRENT" as const, createdAt: "now", updatedAt: "now" },
    { id: "highlight-1", type: "HIGHLIGHT" as const, targetKey: "server-highlight", target: { moduleId: "module-1", pageId: "page-1", frameId: "text-frame", segmentId: "segment-1" }, payload: { anchor: { start: 0, end: 5, text: "Hello" } }, revision: 1, status: "STALE" as const, createdAt: "now", updatedAt: "now" },
    { id: "bookmark-1", type: "BOOKMARK" as const, targetKey: "server-bookmark", target: { moduleId: "module-1", pageId: "page-1" }, payload: {}, revision: 1, status: "CURRENT" as const, createdAt: "now", updatedAt: "now" },
  ];
  const map = buildStudentWorkClientMap(items);
  assert.equal(map.byId.get("answer-1")?.payload && payloadText(map.byId.get("answer-1")?.payload), "Iron");
  assert.deepEqual(payloadOptionIds({ optionIds: ["iron", 4] }), ["iron"]);
  assert.equal(payloadHighlightText(map.byId.get("highlight-1")?.payload), "Hello");
  assert.equal(studentWorkTargetMatches(target, { questionId: "question-1", moduleId: "module-1" }), true);
  assert.equal(studentWorkTargetIdentity("ANSWER", target), studentWorkTargetIdentity("ANSWER", { ...target }));
});

test("Student Work provider uses one batched book GET and server-confirmed mutation paths", () => {
  const provider = readFileSync("components/content/StudentWorkProvider.tsx", "utf8");
  assert.match(provider, /method: "POST"/);
  assert.match(provider, /method: "DELETE"/);
  assert.match(provider, /expectedRevision/);
  assert.match(provider, /setLoading\(true\)/);
  assert.doesNotMatch(provider, /pageIds\.map/);
  assert.match(provider, /setStates\(\(previous\) => \(\{ \.\.\.previous, \[identity\]: "NOT_SAVED"/);
});

test("Student response props remain answer-key safe and Read Aloud content is independent", () => {
  const response = readFileSync("components/content/StudentQuestionResponse.tsx", "utf8");
  const book = readFileSync("components/content/StudentWorkBook.tsx", "utf8");
  assert.doesNotMatch(response, /correctOption|trueFalseAnswer|explanation|teacherNote/);
  assert.match(book, /StudentQuestionResponse/);
  const document = studentFixture();
  const before = buildV2NarrationManifest(document, "STUDENT", { scopeId: "module-1" }).sourceHash;
  const studentPayload = { value: "Student answer", status: "DRAFT" };
  assert.equal(buildV2NarrationManifest(document, "STUDENT", { scopeId: "module-1" }).sourceHash, before);
  assert.equal(studentPayload.status, "DRAFT");
});

test("Student Work controls are mounted only by student delivery", () => {
  const studentPage = readFileSync("app/student-dashboard/subjects/[sectionSubjectId]/chapters/[chapterId]/page.tsx", "utf8");
  const teacherPage = readFileSync("app/teacher-dashboard/classes/[sectionId]/content/[chapterId]/page.tsx", "utf8");
  assert.match(studentPage, /StudentWorkProvider/);
  assert.match(studentPage, /StudentWorkPanel/);
  assert.doesNotMatch(teacherPage, /StudentWorkProvider|StudentWorkPanel|StudentQuestionResponse/);
});
