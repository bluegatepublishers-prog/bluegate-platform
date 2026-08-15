import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createV2PageLayout, normalizePageLayoutV2 } from "../lib/content-layout-v2";
import { normalizeContentDocument, serializeContentDocument } from "../lib/content-document";
import { createV2AssessmentLauncherPayload, getV2AssessmentLauncherPayload } from "../lib/v2-assessment-launcher";
import { canLaunchBookQuestionPractice, getBookQuestionPracticeMode } from "../lib/normalized-question";
import { gradePracticeAnswer, isSupportedPracticeQuestion, type PracticeQuestionCandidate } from "../lib/student-practice-policy";

const launcherQuestion = { id: "question-1", bookId: "book-1", chapterId: "chapter-1", questionType: "MCQ", questionText: "Which option?", options: [{ id: "a", text: "Alpha" }, { id: "b", text: "Beta" }], correctAnswer: "a", explanation: "Alpha is correct.", marks: 1, approved: true, createdAt: new Date("2026-01-01") } satisfies PracticeQuestionCandidate;

test("ASSESSMENT_LAUNCHER survives V2 normalization and document serialization", () => {
  const payload = createV2AssessmentLauncherPayload({ exerciseId: "exercise-1", groupId: "group-1" });
  const layout = createV2PageLayout({ pages: [{ id: "page-1", frames: [{ id: "frame-1", pageId: "page-1", type: "ASSESSMENT_LAUNCHER", x: 24, y: 24, width: 220, height: 72, payload }] }] });
  const document = normalizeContentDocument({ version: 2, layoutVersion: 2, blocks: [], pageLayout: layout });
  const reloaded = normalizeContentDocument(JSON.parse(serializeContentDocument(document)));
  const frame = reloaded.pageLayout?.pages[0]?.frames[0];
  assert.equal(frame?.type, "ASSESSMENT_LAUNCHER");
  assert.deepEqual(getV2AssessmentLauncherPayload(frame!), payload);
  assert.deepEqual(normalizePageLayoutV2(JSON.parse(JSON.stringify(layout)))?.pages[0].frames[0].payload, payload);
});

test("practice policy supports authoritative object options without exposing the answer", () => {
  assert.equal(isSupportedPracticeQuestion(launcherQuestion), true);
  const correct = gradePracticeAnswer(launcherQuestion, "Alpha");
  const incorrect = gradePracticeAnswer(launcherQuestion, "Beta");
  assert.equal(correct.ok && correct.correct, true);
  assert.equal(incorrect.ok && incorrect.correct, false);
});

test("authoring and delivery use the isolated MCQ launcher path", () => {
  const workspace = readFileSync("components/admin/books/editor/V2DocumentWorkspace.tsx", "utf8");
  const content = readFileSync("components/content/v2/V2FrameContent.tsx", "utf8");
  const overlay = readFileSync("components/content/v2/V2AssessmentLauncherOverlay.tsx", "utf8");
  assert.match(workspace, /openInsertSurface\("BOOK_QUESTIONS"\)/);
  assert.match(workspace, /V2BookQuestionsAuthoring/);
  assert.match(content, /frame\.type === "ASSESSMENT_LAUNCHER"/);
  assert.match(overlay, /api\/student\/practice\/launcher/);
});

test("student launcher resolution is server-side constrained to the requested approved practice type", () => {
  const source = readFileSync("lib/student-practice.ts", "utf8");
  const route = readFileSync("app/api/student/practice/launcher/route.ts", "utf8");
  assert.match(source, /exerciseGroupId:\s*input\.groupId/);
  assert.match(source, /approved: true/);
  assert.match(source, /archived: false/);
  assert.match(source, /questionType:\s*input\.questionType/);
  assert.match(source, /canLaunchBookQuestionPractice\(input\.questionType\)/);
  assert.match(route, /canLaunchBookQuestionPractice\(body\.questionType\)/);
});

test("Book Questions authoring and grouped practice keep one launcher, one window, and one submit", () => {
  const authoring = readFileSync("components/admin/books/editor/V2BookQuestionsAuthoring.tsx", "utf8");
  const overlay = readFileSync("components/content/v2/V2AssessmentLauncherOverlay.tsx", "utf8");
  const service = readFileSync("lib/book-questions.ts", "utf8");
  for (const type of ["MCQ", "TRUE_FALSE", "FILL_BLANK", "MULTIPLE_SELECT", "MATCH", "ORDERING", "SHORT_ANSWER", "LONG_ANSWER", "PICTURE_BASED", "CASE_BASED", "COMPETENCY", "HOTS", "ASSERTION_REASON", "PRACTICAL", "PROJECT", "CUSTOM"]) assert.match(authoring, new RegExp(`"${type}"`));
  assert.match(authoring, /PublisherQuestionAuthoringEditor/);
  assert.match(authoring, /canLaunchBookQuestionPractice/);
  assert.match(authoring, /Practice player coming next/);
  assert.match(authoring, /exerciseGroupId/);
  assert.match(service, /BOOK_QUESTIONS_MCQ/);
  assert.match(service, /bookExerciseQuestionGroup/);
  assert.doesNotMatch(service, /questionType:\s*\{\s*in:/);
  assert.match(overlay, /for \(const question of questions\)/);
  assert.match(overlay, /attemptId/);
  assert.match(overlay, /Try Again/);
  assert.doesNotMatch(overlay, /scorePercent|rank|pass|fail/);
});

test("practice capability and launcher payload keep Multiple Select isolated per frame", () => {
  for (const type of ["MCQ", "TRUE_FALSE", "FILL_BLANK", "MULTIPLE_SELECT"]) assert.equal(getBookQuestionPracticeMode(type), "AUTO_GRADED");
  assert.equal(getBookQuestionPracticeMode("SHORT_ANSWER"), "MANUAL_RESPONSE");
  assert.equal(canLaunchBookQuestionPractice("SHORT_ANSWER"), true);
  for (const type of ["MATCH", "ORDERING", "CUSTOM"]) assert.equal(canLaunchBookQuestionPractice(type), false);
  const first = createV2AssessmentLauncherPayload({ exerciseId: "exercise-1", groupId: "group-1", questionType: "MULTIPLE_SELECT", questionIds: ["q-1", "q-2"] });
  const second = createV2AssessmentLauncherPayload({ exerciseId: "exercise-1", groupId: "group-1", questionType: "MULTIPLE_SELECT", questionIds: ["q-3", "q-4", "q-5"] });
  assert.deepEqual(first.target.questionIds, ["q-1", "q-2"]);
  assert.deepEqual(second.target.questionIds, ["q-3", "q-4", "q-5"]);
  assert.equal(first.target.questionType, "MULTIPLE_SELECT");
  assert.equal(second.target.questionType, "MULTIPLE_SELECT");
});

test("Short Answer launcher payload survives independently with manual-response rendering", () => {
  const first = createV2AssessmentLauncherPayload({ exerciseId: "exercise-1", groupId: "group-1", questionType: "SHORT_ANSWER", questionIds: ["short-1", "short-2"] });
  const second = createV2AssessmentLauncherPayload({ exerciseId: "exercise-1", groupId: "group-1", questionType: "SHORT_ANSWER", questionIds: ["short-3"] });
  assert.equal(first.display.label, "SHORT ANSWER");
  assert.deepEqual(first.target.questionIds, ["short-1", "short-2"]);
  assert.deepEqual(second.target.questionIds, ["short-3"]);
  const overlay = readFileSync("components/content/v2/V2AssessmentLauncherOverlay.tsx", "utf8");
  assert.match(overlay, /Response recorded/);
  assert.match(overlay, /MANUAL_RESPONSE/);
  assert.match(overlay, /getBookQuestionPracticeMode/);
});
test("V2 overlay reuses the shared normalized interactive renderer", () => {
  const overlay = readFileSync("components/content/v2/V2AssessmentLauncherOverlay.tsx", "utf8");
  assert.match(overlay, /<InteractiveQuestionRenderer/);
  assert.match(overlay, /interactiveQuestion/);
  assert.doesNotMatch(overlay, /function AnswerControl/);
});

test("student safe attempt feedback is gated on final submission", () => {
  const source = readFileSync("lib/student-practice.ts", "utf8");
  assert.match(source, /response\.answeredAt \? \(attempt\.status === PracticeAttemptStatus\.SUBMITTED/);
  assert.match(source, /return \{ saved: true \}/);
});

test("Book Questions resolves hierarchy classification and optional difficulty", () => {
  const panel = readFileSync("components/admin/books/editor/V2BookQuestionsAuthoring.tsx", "utf8");
  const editor = readFileSync("components/admin/books/PublisherQuestionAuthoringEditor.tsx", "utf8");
  const publisher = readFileSync("lib/publisher-question-bank.ts", "utf8");
  assert.match(panel, /moduleId\?: string \| null/);
  assert.match(panel, /question\.moduleId/);
  assert.match(panel, /question\.difficulty/);
  assert.match(editor, /scope\?\.moduleId/);
  assert.match(editor, /Not specified/);
  assert.match(editor, /options\.length === 1/);
  assert.match(publisher, /raw\.difficulty === undefined \? existing\?\.difficulty \?\? ""/);
  assert.match(publisher, /chapterId: semantics\.chapterId/);
  assert.match(publisher, /bookModule\.findFirst/);
});
