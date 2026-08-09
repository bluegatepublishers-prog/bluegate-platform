import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createContentDocument, type ContentBlock } from "../lib/content-document";
import { adoptLayoutV2, createV2Frame } from "../lib/content-layout-v2";
import { buildV2NarrationManifest } from "../lib/content-narration";
import type { StudentWorkClientItem } from "../lib/student-work-client";
import { getBookProgress, getModuleProgress, getPageProgress, resolveResumeLocation } from "../lib/student-work-progress";

function item(type: StudentWorkClientItem["type"], target: StudentWorkClientItem["target"], payload: unknown, status: StudentWorkClientItem["status"] = "CURRENT"): StudentWorkClientItem {
  return { id: `${type}-${target.questionId ?? target.pageId ?? "book"}`, type, target, targetKey: `${type}-key`, payload, revision: 1, status, createdAt: "now", updatedAt: "now" };
}

function documentFixture(visualMode: "EDITABLE" | "EXACT_REPLICA" = "EDITABLE") {
  const questions = [
    { id: "q-short", type: "short" as const, prompt: "Explain.", visibility: { student: true, teacher: true } },
    { id: "q-mcq", type: "mcq" as const, prompt: "Choose.", options: [{ id: "yes", text: "Yes" }, { id: "no", text: "No" }], visibility: { student: true, teacher: true } },
    { id: "q-true", type: "trueFalse" as const, prompt: "True?", visibility: { student: true, teacher: true } },
    { id: "q-teacher", type: "short" as const, prompt: "Teacher only.", visibility: { student: false, teacher: true } },
  ];
  const worksheet = { id: "worksheet-1", type: "worksheet" as const, questions };
  const blocks = [worksheet] as ContentBlock[];
  const pages = [
    { id: "page-a", order: 0, width: 600, height: 800, unit: "px" as const, visualMode, frames: [createV2Frame("TEXT", "page-a", { id: "text-a", payload: { text: "Read this page." }, readable: true })] },
    { id: "page-b", order: 1, width: 600, height: 800, unit: "px" as const, visualMode, frames: [createV2Frame("WORKSHEET", "page-b", { id: "worksheet-frame", contentRef: { blockId: "worksheet-1" }, readable: true })] },
    { id: "page-c", order: 2, width: 600, height: 800, unit: "px" as const, visualMode, frames: [createV2Frame("TEXT", "page-c", { id: "text-c", payload: { text: "Another page." }, readable: true })] },
  ];
  return adoptLayoutV2(createContentDocument(blocks), { pageSize: { width: 600, height: 800, unit: "px" }, pages });
}

function answerTarget(questionId: string) {
  return { chapterId: "chapter-1", moduleId: "module-1", pageId: "page-b", frameId: "worksheet-frame", questionId };
}

test("reading position resolves by stable page and falls back without numeric index binding", () => {
  const document = documentFixture();
  const manifest = buildV2NarrationManifest(document, "STUDENT", { scopeId: "module-1" });
  const segment = manifest.segments.find((entry) => entry.pageId === "page-b");
  assert.ok(segment);
  const position = item("READING_POSITION", { chapterId: "chapter-1", moduleId: "module-1", pageId: "page-b" }, { pageId: "page-b", segmentId: segment.id });
  const resolved = resolveResumeLocation({ document, moduleId: "module-1", item: position, manifest });
  assert.deepEqual(resolved && { pageId: resolved.pageId, pageNumber: resolved.pageNumber, segmentId: resolved.segmentId, fallback: resolved.fallback }, { pageId: "page-b", pageNumber: 2, segmentId: segment.id, fallback: false });

  const reordered = { ...document, pageLayout: { ...document.pageLayout!, pages: [document.pageLayout!.pages[1]!, document.pageLayout!.pages[0]!, document.pageLayout!.pages[2]!] } };
  const reorderedResume = resolveResumeLocation({ document: reordered, moduleId: "module-1", item: position, manifest: buildV2NarrationManifest(reordered, "STUDENT", { scopeId: "module-1" }) });
  assert.equal(reorderedResume?.pageId, "page-b");
  assert.equal(reorderedResume?.pageNumber, 1);

  const removed = { ...document, pageLayout: { ...document.pageLayout!, pages: document.pageLayout!.pages.filter((page) => page.id !== "page-b") } };
  const fallback = resolveResumeLocation({ document: removed, moduleId: "module-1", item: position, manifest: buildV2NarrationManifest(removed, "STUDENT", { scopeId: "module-1" }) });
  assert.equal(fallback?.pageId, "page-a");
  assert.equal(fallback?.fallback, true);
  assert.equal(fallback?.segmentAvailable, false);
});

test("read-only pages require explicit completion and do not complete from engagement alone", () => {
  const document = documentFixture();
  const noWork = getPageProgress({ document, moduleId: "module-1", pageId: "page-a", items: [] });
  assert.equal(noWork.state, "NOT_STARTED");
  const engaged = getPageProgress({ document, moduleId: "module-1", pageId: "page-a", items: [item("BOOKMARK", { moduleId: "module-1", pageId: "page-a" }, {})] });
  assert.equal(engaged.state, "IN_PROGRESS");
  const done = getPageProgress({ document, moduleId: "module-1", pageId: "page-a", items: [item("COMPLETION", { moduleId: "module-1", pageId: "page-a" }, { state: "COMPLETED" })] });
  assert.equal(done.state, "COMPLETED");
  assert.equal(done.completedReason, "EXPLICIT");
});

test("answerable page progress counts valid current responses, not correctness", () => {
  const document = documentFixture();
  const target = (questionId: string) => answerTarget(questionId);
  const empty = getPageProgress({ document, moduleId: "module-1", pageId: "page-b", items: [] });
  assert.deepEqual([empty.answerable, empty.answered, empty.state], [3, 0, "NOT_STARTED"]);
  const one = getPageProgress({ document, moduleId: "module-1", pageId: "page-b", items: [item("ANSWER", target("q-short"), { value: "Any valid response", status: "DRAFT" })] });
  assert.deepEqual([one.answerable, one.answered, one.state], [3, 1, "IN_PROGRESS"]);
  const all = getPageProgress({ document, moduleId: "module-1", pageId: "page-b", items: [
    item("ANSWER", target("q-short"), { value: "Any valid response", status: "DRAFT" }),
    item("ANSWER", target("q-mcq"), { optionIds: ["no"], status: "DRAFT" }),
    item("ANSWER", target("q-true"), { optionIds: ["false"], status: "DRAFT" }),
  ] });
  assert.deepEqual([all.answered, all.state], [3, "COMPLETED"]);
});

test("stale answers remain preserved but do not complete the current page", () => {
  const document = documentFixture();
  const items = [
    item("ANSWER", answerTarget("q-short"), { value: "old", status: "DRAFT" }, "STALE"),
    item("ANSWER", answerTarget("q-mcq"), { optionIds: ["yes"], status: "DRAFT" }),
    item("ANSWER", answerTarget("q-true"), { optionIds: ["true"], status: "DRAFT" }),
  ];
  const progress = getPageProgress({ document, moduleId: "module-1", pageId: "page-b", items });
  assert.equal(progress.answered, 2);
  assert.equal(progress.staleRequired, 1);
  assert.notEqual(progress.state, "COMPLETED");
  assert.equal(items[0]?.status, "STALE");
});

test("teacher-only, removed, and newly added questions change the current denominator safely", () => {
  const document = documentFixture();
  const allAnswers = [
    item("ANSWER", answerTarget("q-short"), { value: "one", status: "DRAFT" }),
    item("ANSWER", answerTarget("q-mcq"), { optionIds: ["yes"], status: "DRAFT" }),
    item("ANSWER", answerTarget("q-true"), { optionIds: ["true"], status: "DRAFT" }),
    item("ANSWER", answerTarget("q-teacher"), { value: "ignored", status: "DRAFT" }),
  ];
  const completed = getPageProgress({ document, moduleId: "module-1", pageId: "page-b", items: allAnswers });
  assert.deepEqual([completed.answerable, completed.answered, completed.state], [3, 3, "COMPLETED"]);
  const worksheet = document.blocks[0] as Extract<ContentBlock, { type: "worksheet" }>;
  const removed = { ...document, blocks: [{ ...worksheet, questions: worksheet.questions.filter((question) => question.id !== "q-short") }] as ContentBlock[] };
  const afterRemoval = getPageProgress({ document: removed, moduleId: "module-1", pageId: "page-b", items: allAnswers });
  assert.deepEqual([afterRemoval.answerable, afterRemoval.answered], [2, 2]);
  const added = { ...document, blocks: [{ ...worksheet, questions: [...worksheet.questions, { id: "q-new", type: "short" as const, prompt: "New", visibility: { student: true, teacher: true } }] }] as ContentBlock[] };
  const afterAddition = getPageProgress({ document: added, moduleId: "module-1", pageId: "page-b", items: allAnswers });
  assert.deepEqual([afterAddition.answerable, afterAddition.answered, afterAddition.state], [4, 3, "IN_PROGRESS"]);
});

test("book progress is deterministic across mixed Editable and Exact Replica modules", () => {
  const editable = documentFixture("EDITABLE");
  const replica = documentFixture("EXACT_REPLICA");
  const items = [item("COMPLETION", { moduleId: "module-editable", pageId: "page-a" }, { state: "COMPLETED" })];
  const progress = getBookProgress([{ moduleId: "module-editable", document: editable }, { moduleId: "module-replica", document: replica }], items);
  assert.equal(progress.totalPages, 6);
  assert.equal(progress.completedPages, 1);
  assert.equal(progress.percentage, 17);
  assert.equal(getModuleProgress("module-editable", editable, items).completedPages, 1);
  assert.equal(getModuleProgress("module-replica", replica, items).completedPages, 0);
});

test("position persistence and resume controls do not autoplay Read Aloud", () => {
  const book = readFileSync("components/content/StudentWorkBook.tsx", "utf8");
  const provider = readFileSync("components/content/V2NarrationProvider.tsx", "utf8");
  const player = readFileSync("components/content/V2ReadAloudPlayer.tsx", "utf8");
  assert.match(book, /READING_POSITION/);
  assert.match(book, /1200/);
  assert.match(book, /Resume Read Aloud/);
  assert.match(provider, /requestSegment/);
  assert.match(player, /requestedSegment/);
  assert.doesNotMatch(player, /requestedSegment[\s\S]{0,500}audio\.play\(\)/);
});