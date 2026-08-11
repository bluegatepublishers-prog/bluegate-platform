import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { createQuestionDeliveryContext } from "../lib/question-delivery-mode";
import { adaptBookQuestion } from "../lib/normalized-question";

const root = process.cwd();
const runtime = readFileSync(path.join(root, "lib/publisher-question-bank.ts"), "utf8");
const listRoute = readFileSync(path.join(root, "app/api/admin/questions/route.ts"), "utf8");
const itemRoute = readFileSync(path.join(root, "app/api/admin/questions/[questionId]/route.ts"), "utf8");
const lifecycleRoute = readFileSync(path.join(root, "app/api/admin/questions/[questionId]/lifecycle/route.ts"), "utf8");
const page = readFileSync(path.join(root, "app/admin/books/[id]/content/assignments/questions/page.tsx"), "utf8");
const ui = readFileSync(path.join(root, "components/admin/books/PublisherQuestionBank.tsx"), "utf8");
const authoringEditor = readFileSync(path.join(root, "components/admin/books/PublisherQuestionAuthoringEditor.tsx"), "utf8");
const ribbon = readFileSync(path.join(root, "components/admin/books/editor/V2DocumentWorkspace.tsx"), "utf8");


test("publisher ownership is always constrained through Book.publisherId", () => {
  assert.match(runtime, /function publisherQuestionOwnershipWhere\(publisherId: string\)[\s\S]*book: \{ publisherId \}/u);
  assert.match(runtime, /where: \{ id, \.\.\.publisherQuestionOwnershipWhere\(publisherId\) \}/u);
  assert.match(listRoute, /authorizePublisherAdminApi/u);
});

test("BookQuestion master compatibility is preserved for normalized publisher questions", () => {
  const normalized = adaptBookQuestion({ id: "q-1", bookId: "book-1", chapterId: "chapter-1", moduleId: null, imageResourceId: null, questionType: "MCQ", questionText: "Which material conducts electricity?", options: [{ id: "copper", text: "Copper" }, { id: "wood", text: "Wood" }], correctAnswer: "copper", marks: 2, difficulty: "EASY" });
  assert.equal(normalized.source.type, "PUBLISHER");
  assert.equal(normalized.source.attribution.bookId, "book-1");
  assert.equal(normalized.questionType, "MCQ");
  assert.match(runtime, /export function validatePublisherQuestionPayload/u);
  assert.match(runtime, /prisma\.bookQuestion\.create\(\{ data: \{ \.\.\.data\(semantics\), approved: false, archived: false \}/u);
  assert.match(runtime, /prisma\.bookQuestion\.update\(\{ where: \{ id: current\.id \}, data: data\(semantics\)/u);
});

test("publisher question validation retains Fill Blank compatibility and accepted answers", () => {
  assert.match(runtime, /questionType === "FILL_BLANK"/u);
  assert.match(runtime, /parseFillBlankAnswerConfig\(options\)/u);
  assert.match(authoringEditor, /acceptedAnswers/u);
});

test("book, chapter, module, and image resource context cannot cross publisher scope", () => {
  assert.match(runtime, /id: semantics\.chapterId, bookId: semantics\.bookId, book: \{ publisherId \}/u);
  assert.match(runtime, /id: semantics\.moduleId, bookId: semantics\.bookId, chapterId: semantics\.chapterId/u);
  assert.match(runtime, /publisherId, type: ResourceType\.IMAGE, archived: false/u);
  assert.match(runtime, /OR: \[\{ bookId: semantics\.bookId \}, \{ bookId: null \}\]/u);
  assert.match(runtime, /PICTURE_BASED" && !imageResourceId/u);
});

test("search, filters, pagination, and current BookQuestion archive/approval workflow are present", () => {
  for (const field of ["bookId", "classId", "subjectId", "chapterId", "moduleId", "questionType", "difficulty", "tags", "questionText"]) assert.match(runtime, new RegExp(field, "u"));
  assert.match(runtime, /const MAX_PAGE_SIZE = 100/u);
  assert.match(runtime, /orderBy: \[\{ updatedAt: "desc" \}, \{ id: "desc" \}\]/u);
  assert.match(runtime, /action === "APPROVE" && !question\.archived && !question\.approved/u);
  assert.match(runtime, /action === "ARCHIVE" && !question\.archived/u);
  assert.match(runtime, /action === "RESTORE" && question\.archived/u);
  assert.match(lifecycleRoute, /APPROVE", "RETURN_DRAFT", "ARCHIVE", "RESTORE/u);
  assert.doesNotMatch(runtime, /bookQuestion\.delete/u);
});

test("default publisher lists include drafts and approved questions while excluding archived records", () => {
  assert.match(runtime, /statusFilter === "ARCHIVED"[\s\S]*?statusFilter === "DRAFT"[\s\S]*?: \{ archived: false \}/u);
  assert.match(runtime, /approved: false, archived: false/u);
  assert.match(ui, /page: String\(page\), pageSize: "25"/u);
  assert.match(ui, /items\?: Question\[\]; page\?: number; total\?: number; totalPages\?: number/u);
  assert.match(ui, /setEditor\(undefined\); setPage\(1\); refresh\(\)/u);
  assert.match(ui, /hidden by the current status filter/u);
});

test("publisher authoring uses type-aware structured controls instead of raw option lines", () => {
  assert.match(authoringEditor, /type=\{multiple \? "checkbox" : "radio"\}/u);
  assert.match(authoringEditor, /Add Option/u);
  assert.match(authoringEditor, /Add accepted answer/u);
  assert.match(authoringEditor, /Matching pairs/u);
  assert.match(authoringEditor, /Move up/u);
  assert.match(authoringEditor, /Authorized IMAGE resource/u);
  assert.match(authoringEditor, /Expected \/ model answer/u);
  assert.doesNotMatch(authoringEditor, /Options \(one per line\)/u);
});
test("secure publisher APIs expose list/create, read/update, and lifecycle routes", () => {
  assert.match(listRoute, /export async function GET/u); assert.match(listRoute, /export async function POST/u);
  assert.match(itemRoute, /export async function GET/u); assert.match(itemRoute, /export async function PATCH/u);
  assert.match(lifecycleRoute, /export async function POST/u);
});

test("question cards expose one Preview action and retain safe draft/archive lifecycle actions", () => {
  const card = ui.slice(ui.indexOf("function QuestionRow"), ui.indexOf("function Preview"));
  assert.match(card, />Preview</u);
  assert.match(card, /question\.status === "DRAFT"/u);
  assert.match(card, /"APPROVE"/u);
  assert.match(card, /"ARCHIVE"/u);
  assert.match(card, /"RESTORE"/u);
  assert.doesNotMatch(card, /onPreview\("PRINT"\)/u);
  assert.doesNotMatch(card, /onPreview\("ANSWER_KEY"\)/u);
});
test("preview reuses the shared delivery renderers and protects answer keys from students", () => {
  assert.throws(() => createQuestionDeliveryContext({ mode: "ANSWER_KEY", audience: "STUDENT" }));
  assert.match(ui, /InteractiveQuestionRenderer/u); assert.match(ui, /PrintQuestionRenderer/u); assert.match(ui, /audience="PUBLISHER"/u);
});

test("Question Bank is a Content Studio Assignments workspace, not a delivery builder", () => {
  assert.match(page, /requirePublisherAdminBookOwnership/u);
  for (const label of ["Worksheets", "Tests", "Exam Papers"]) assert.match(ui, new RegExp(label, "u"));
  assert.match(ribbon, /"ASSIGNMENTS"/u); assert.match(ribbon, /assignmentsHref/u);
});
