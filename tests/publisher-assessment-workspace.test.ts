import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts: string[]) => readFileSync(path.join(root, ...parts), "utf8").replace(/\r/g, "");
const navigation = read("components/admin/books/AssignmentsWorkspaceNav.tsx");
const studio = read("components/admin/books/PublisherAssessmentStudio.tsx");
const list = read("components/admin/books/PublisherAssessmentList.tsx");
const actions = read("app/admin/books/[id]/content/assignments/assessments/actions.ts");
const page = read("app/admin/books/[id]/content/assignments/assessments/page.tsx");
const editor = read("app/admin/books/[id]/content/assignments/assessments/[assessmentId]/page.tsx");
const service = read("lib/publisher-assessment.ts");
const preview = read("components/admin/books/PublisherAssessmentPreview.tsx");

test("Assignments navigation exposes one unified Assessments workspace", () => {
  assert.match(navigation, /label: "Assessments", path: "assessments"/u);
  assert.doesNotMatch(navigation, /Tests.*Coming next|Exam Papers.*Coming next/u);
  assert.match(list, /Create chapter tests, unit tests, term tests, exams and diagnostic assessments/u);
});

test("publisher assessment routes are book-owned and publisher-scoped", () => {
  assert.match(page, /requirePublisherAdminBookOwnership\(bookId\)/u);
  assert.match(page, /listPublisherAssessments\(\{ publisherId: actor\.publisherId, bookId \}\)/u);
  assert.match(editor, /requirePublisherAdminBookOwnership\(bookId\)/u);
  assert.match(editor, /getPublisherAssessment\(\{ publisherId: actor\.publisherId, bookId, assessmentId \}\)/u);
  assert.match(actions, /requireLivePublisherAdmin\(\)/u);
  assert.match(actions, /requirePublisherAdminBookOwnership\(bookId\)/u);
});

test("studio presents the supported kind-specific scope controls without a part or term entity", () => {
  for (const kind of ["CHAPTER_TEST", "MULTI_CHAPTER_TEST", "UNIT_TEST", "TERM_TEST", "MULTI_TERM_TEST", "BOOK_TEST", "EXAM", "FINAL_EXAM", "DIAGNOSTIC"]) {
    assert.match(studio, new RegExp(`"${kind}"`, "u"));
  }
  assert.match(studio, /Select Chapters Covered by This Term/u);
  assert.match(studio, /Scope: Whole Book/u);
  assert.match(studio, /chapterIds\.length >= chapterCountMinimum\(\)/u);
  assert.doesNotMatch(studio, /BookPart|PublisherAssessmentPartScope|TeacherQuestion/u);
});

test("question selection uses approved canonical BookQuestions and stable service ordering", () => {
  assert.match(studio, /status: "APPROVED"/u);
  assert.match(studio, /\/api\/admin\/questions/u);
  assert.match(studio, /allowedChapterIds\.has\(question\.chapterId\)/u);
  assert.match(studio, /moveItemAction/u);
  assert.match(service, /approved: true, archived: false/u);
  assert.match(service, /Selected questions must belong to the assessment chapter coverage\./u);
  assert.match(service, /Selected questions must belong to the assessment unit\./u);
  assert.match(service, /position: \(last\._max\.position \?\? -1\) \+ index \+ 1/u);
});

test("normal preview is rendered from safe normalized questions without answers or explanations", () => {
  assert.match(editor, /toSafeInteractiveQuestion\(adaptBookQuestion\(item\.question\)\)/u);
  assert.match(preview, /InteractiveQuestionRenderer\s+question=\{item\.preview\}/u);
  assert.doesNotMatch(preview, /PrintQuestionRenderer|correctAnswer|explanation/u);
});
