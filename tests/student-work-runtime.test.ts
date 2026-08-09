import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { filterDocumentForMode } from "../lib/content-audience";
import { createContentDocument, type ContentBlock } from "../lib/content-document";
import { adoptLayoutV2, createV2Frame } from "../lib/content-layout-v2";
import { buildV2NarrationManifest } from "../lib/content-narration";
import { createExerciseBlock } from "../lib/exercise-object";
import { createWorksheetBlock } from "../lib/worksheet-object";
import {
  buildStudentWorkTargetKey,
  normalizeStudentWorkTarget,
  resolveV2StudentWorkTarget,
  StudentWorkPolicyError,
  validateStudentWorkPayload,
} from "../lib/student-work-policy";

function studentDocument(options: { text?: string; geometry?: number; visualMode?: "EDITABLE" | "EXACT_REPLICA" } = {}) {
  const pageId = "page-1";
  const worksheet = {
    ...createWorksheetBlock(),
    id: "worksheet-1",
    questions: [{
      id: "worksheet-question-1",
      type: "mcq" as const,
      prompt: "Which material is magnetic?",
      options: [{ id: "iron", text: "Iron" }, { id: "wood", text: "Wood" }],
      visibility: { student: true, teacher: true },
    }],
  };
  const exercise = {
    ...createExerciseBlock(),
    id: "exercise-1",
    questions: [{
      id: "exercise-question-1",
      type: "mcq" as const,
      prompt: "Choose the magnetic material.",
      options: [{ id: "iron", text: "Iron" }],
      visibility: { student: true, teacher: true },
    }],
  };
  const activity = {
    id: "activity-1",
    type: "activity" as const,
    fields: [
      { id: "activity-field-1", type: "instructions" as const, label: "Instructions", text: "Bring a magnet.", visibility: { student: true, teacher: true } },
      { id: "teacher-note-field", type: "teacherNote" as const, label: "Teacher Note", text: "Do not show this.", visibility: { student: false, teacher: true } },
    ],
  };
  const frames = [
    createV2Frame("TEXT", pageId, { id: "text-frame", payload: { text: options.text ?? "Magnets attract iron. They do not attract wood." }, readingOrder: 1, readable: true, renderMode: "SEMANTIC_ONLY", x: options.geometry ?? 10, y: 20 }),
    createV2Frame("WORKSHEET", pageId, { id: "worksheet-frame", contentRef: { blockId: "worksheet-1" }, readingOrder: 2, readable: true, x: 20, y: 100 }),
    createV2Frame("EXERCISE", pageId, { id: "exercise-frame", contentRef: { blockId: "exercise-1" }, readingOrder: 3, readable: true, x: 20, y: 200 }),
    createV2Frame("ACTIVITY", pageId, { id: "activity-frame", contentRef: { blockId: "activity-1" }, readingOrder: 4, readable: true, x: 20, y: 300 }),
    createV2Frame("TEXT", pageId, { id: "teacher-frame", payload: "Teacher-only answer key.", audience: "TEACHER", readingOrder: 5, readable: true, x: 20, y: 400 }),
    createV2Frame("EDUCATIONAL", pageId, {
      id: "container-frame",
      payload: { title: "Remember", body: "Magnets attract iron." },
      readingOrder: 6,
      readable: true,
      children: [createV2Frame("TEXT", pageId, { id: "child-frame", payload: "Child semantic text.", readingOrder: 1, readable: true })],
    }),
  ];
  return adoptLayoutV2(createContentDocument([worksheet, exercise, activity] as ContentBlock[]), {
    pageSize: { preset: "CUSTOM", width: 800, height: 1000, unit: "px" },
    pages: [{
      id: pageId,
      order: 0,
      width: 800,
      height: 1000,
      unit: "px",
      visualMode: options.visualMode ?? "EXACT_REPLICA",
      replica: { resourceId: "replica", sourceKind: "PAGE_IMAGE", intrinsicWidth: 800, intrinsicHeight: 1000, fitMode: "CONTAIN", sourceHash: "replica-source" },
      frames,
    }],
  });
}

function studentView() {
  return filterDocumentForMode(studentDocument(), "STUDENT", []);
}

function assertPolicyError(action: () => unknown, code: StudentWorkPolicyError["code"]) {
  assert.throws(action, (error: unknown) => error instanceof StudentWorkPolicyError && error.code === code);
}

test("target keys are deterministic, typed, and ignore client-supplied identity fields", () => {
  const target = normalizeStudentWorkTarget({ pageId: "page-1", frameId: "frame-1", targetKey: "client-forged", studentId: "student-forged" });
  assert.deepEqual(target, { pageId: "page-1", frameId: "frame-1" });
  assert.equal(
    buildStudentWorkTargetKey({ bookId: "book-1", type: "NOTE", target }),
    buildStudentWorkTargetKey({ bookId: "book-1", type: "NOTE", target: { frameId: "frame-1", pageId: "page-1" } }),
  );
  assert.notEqual(
    buildStudentWorkTargetKey({ bookId: "book-1", type: "NOTE", target: { pageId: "page-1" } }),
    buildStudentWorkTargetKey({ bookId: "book-1", type: "NOTE", target }),
  );
});

test("payload validation rejects unsafe HTML, unknown fields, and oversized values", () => {
  assert.deepEqual(validateStudentWorkPayload("NOTE", { text: "A useful note." }).value, { text: "A useful note." });
  assert.deepEqual((validateStudentWorkPayload("ANSWER", { optionIds: ["iron"], status: "SUBMITTED" }).value as { optionIds?: string[] }).optionIds, ["iron"]);
  assertPolicyError(() => validateStudentWorkPayload("NOTE", { text: "<script>alert(1)</script>" }), "INVALID_PAYLOAD");
  assertPolicyError(() => validateStudentWorkPayload("NOTE", { text: "ok", html: "<b>no</b>" }), "INVALID_PAYLOAD");
  assertPolicyError(() => validateStudentWorkPayload("HIGHLIGHT", { anchor: { start: 0, end: 1, text: "x" }, rectangle: { x: 1 } }), "INVALID_PAYLOAD");
  assertPolicyError(() => validateStudentWorkPayload("NOTE", { text: "x".repeat(5001) }), "INVALID_PAYLOAD");
});

test("student resolver validates worksheet, exercise, and activity IDs against published V2 content", () => {
  const document = studentView();
  const worksheet = resolveV2StudentWorkTarget({ bookId: "book-1", moduleId: "module-1", type: "ANSWER", target: { questionId: "worksheet-question-1" }, payload: validateStudentWorkPayload("ANSWER", { optionIds: ["iron"] }).value, document });
  assert.deepEqual(worksheet.target, { moduleId: "module-1", pageId: "page-1", frameId: "worksheet-frame", questionId: "worksheet-question-1" });
  assert.equal(worksheet.question?.id, "worksheet-question-1");

  const exercise = resolveV2StudentWorkTarget({ bookId: "book-1", moduleId: "module-1", type: "ANSWER", target: { questionId: "exercise-question-1", frameId: "exercise-frame" }, payload: validateStudentWorkPayload("ANSWER", { optionIds: ["iron"] }).value, document });
  assert.equal(exercise.question?.id, "exercise-question-1");

  const activity = resolveV2StudentWorkTarget({ bookId: "book-1", moduleId: "module-1", type: "COMPLETION", target: { questionId: "activity-field-1" }, payload: validateStudentWorkPayload("COMPLETION", { state: "COMPLETED" }).value, document });
  assert.equal(activity.question?.id, "activity-field-1");
  assertPolicyError(() => resolveV2StudentWorkTarget({ bookId: "book-1", moduleId: "module-1", type: "ANSWER", target: { questionId: "teacher-note-field" }, payload: validateStudentWorkPayload("ANSWER", { optionIds: ["iron"] }).value, document }), "INVALID_TARGET");
  assertPolicyError(() => resolveV2StudentWorkTarget({ bookId: "book-1", moduleId: "module-1", type: "ANSWER", target: { questionId: "missing-question" }, payload: validateStudentWorkPayload("ANSWER", { optionIds: ["iron"] }).value, document }), "INVALID_TARGET");
});

test("child frames retain parent-controlled identity and answer-independent local ordering", () => {
  const document = studentView();
  const resolved = resolveV2StudentWorkTarget({ bookId: "book-1", moduleId: "module-1", type: "NOTE", target: { pageId: "page-1", frameId: "container-frame", childFrameId: "child-frame" }, payload: validateStudentWorkPayload("NOTE", { text: "Child note." }).value, document });
  assert.equal(resolved.target.childFrameId, "child-frame");
  assert.match(resolved.targetKey, /CHILD|child-frame/u);
  assertPolicyError(() => resolveV2StudentWorkTarget({ bookId: "book-1", moduleId: "module-1", type: "NOTE", target: { pageId: "page-1", frameId: "text-frame", childFrameId: "child-frame" }, payload: validateStudentWorkPayload("NOTE", { text: "Invalid parent." }).value, document }), "INVALID_TARGET");
});

test("Exact Replica and SEMANTIC_ONLY frames resolve without visual geometry or replica metadata", () => {
  const first = studentView();
  const second = filterDocumentForMode(studentDocument({ geometry: 700, visualMode: "EDITABLE" }), "STUDENT", []);
  const firstResolved = resolveV2StudentWorkTarget({ bookId: "book-1", moduleId: "module-1", type: "NOTE", target: { pageId: "page-1", frameId: "text-frame" }, payload: validateStudentWorkPayload("NOTE", { text: "Geometry-independent." }).value, document: first });
  const secondResolved = resolveV2StudentWorkTarget({ bookId: "book-1", moduleId: "module-1", type: "NOTE", target: { pageId: "page-1", frameId: "text-frame" }, payload: validateStudentWorkPayload("NOTE", { text: "Geometry-independent." }).value, document: second });
  assert.equal(firstResolved.targetKey, secondResolved.targetKey);
  assert.equal(firstResolved.masterSourceHash, secondResolved.masterSourceHash);
  assert.equal(firstResolved.targetSourceHash, secondResolved.targetSourceHash);
});

test("semantic wording changes the source hash and deleted targets become unavailable", () => {
  const payload = validateStudentWorkPayload("NOTE", { text: "Anchor." }).value;
  const original = resolveV2StudentWorkTarget({ bookId: "book-1", moduleId: "module-1", type: "NOTE", target: { pageId: "page-1", frameId: "text-frame" }, payload, document: studentView() });
  const changed = resolveV2StudentWorkTarget({ bookId: "book-1", moduleId: "module-1", type: "NOTE", target: { pageId: "page-1", frameId: "text-frame" }, payload, document: filterDocumentForMode(studentDocument({ text: "Magnets repel iron." }), "STUDENT", []) });
  assert.notEqual(original.targetSourceHash, changed.targetSourceHash);
  const deleted = studentView();
  deleted.pageLayout!.pages[0]!.frames = deleted.pageLayout!.pages[0]!.frames.filter((frame) => frame.id !== "text-frame");
  assertPolicyError(() => resolveV2StudentWorkTarget({ bookId: "book-1", moduleId: "module-1", type: "NOTE", target: { pageId: "page-1", frameId: "text-frame" }, payload, document: deleted }), "INVALID_TARGET");
});

test("narration segment identity uses the module scope and highlights are anchored semantically", () => {
  const document = studentView();
  const manifest = buildV2NarrationManifest(document, "STUDENT", { scopeId: "module-1" });
  const segment = manifest.segments.find((entry) => entry.frameId === "text-frame");
  assert.ok(segment);
  const otherScopeSegment = buildV2NarrationManifest(document, "STUDENT", { scopeId: "module-2" }).segments.find((entry) => entry.frameId === "text-frame");
  assert.ok(otherScopeSegment);
  assert.notEqual(segment.id, otherScopeSegment.id);
  const anchor = { start: 0, end: 7, text: segment.text.slice(0, 7) };
  const payload = validateStudentWorkPayload("HIGHLIGHT", { anchor, selectedText: anchor.text }).value;
  const resolved = resolveV2StudentWorkTarget({ bookId: "book-1", moduleId: "module-1", type: "HIGHLIGHT", target: { segmentId: segment.id }, payload, document });
  assert.equal(resolved.semanticText, segment.text);
  const other = validateStudentWorkPayload("HIGHLIGHT", { anchor: { ...anchor, start: 8, end: 14, text: segment.text.slice(8, 14) } }).value;
  const otherResolved = resolveV2StudentWorkTarget({ bookId: "book-1", moduleId: "module-1", type: "HIGHLIGHT", target: { segmentId: segment.id }, payload: other, document });
  assert.notEqual(resolved.targetKey, otherResolved.targetKey);
});

test("Student Work API rejects client-owned scope and hash fields at the boundary", () => {
  const route = readFileSync("app/api/student/books/[bookId]/work/route.ts", "utf8");
  assert.match(route, /studentId/);
  assert.match(route, /schoolId/);
  assert.match(route, /publisherId/);
  assert.match(route, /academicYearId/);
  assert.match(route, /targetKey/);
  assert.match(route, /masterSourceHash/);
  assert.match(route, /targetSourceHash/);
  const service = readFileSync("lib/student-work.ts", "utf8");
  assert.match(service, /requireStudent/);
  assert.match(service, /getStudentBook/);
  assert.match(service, /filterDocumentForMode/);
});
