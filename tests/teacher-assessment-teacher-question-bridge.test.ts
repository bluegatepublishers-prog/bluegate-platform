import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  isTeacherQuestionAssessmentContextCompatible,
  mapTeacherQuestionAssessmentType,
  mapTeacherQuestionToAssessmentSnapshot,
} from "../lib/teacher-assessment-question-bridge";

const service = readFileSync("lib/teacher-assessments.ts", "utf8");
const page = readFileSync("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/page.tsx", "utf8");
const actions = readFileSync("app/teacher-dashboard/classes/[sectionId]/assessments/actions.ts", "utf8");

function source(overrides: Record<string, unknown> = {}) {
  return {
    id: "teacher-question-1",
    publisherId: "publisher-1",
    schoolId: "school-1",
    teacherId: "teacher-1",
    sectionSubjectId: "section-subject-1",
    bookId: "book-1",
    chapterId: "chapter-1",
    moduleId: null,
    questionType: "MCQ",
    questionText: "Which material is magnetic?",
    options: [
      { id: "iron", text: "Iron" },
      { id: "wood", text: "Wood" },
    ],
    correctAnswer: "iron",
    explanation: "Iron is magnetic.",
    marks: 2,
    competency: "OBSERVE",
    difficulty: "EASY",
    tags: ["science", "magnetism"],
    ...overrides,
  };
}

test("TeacherQuestion assessment compatibility is explicit and fail-closed", () => {
  for (const type of [
    "MCQ",
    "TRUE_FALSE",
    "FILL_BLANK",
    "MATCH",
    "MULTIPLE_SELECT",
    "SHORT_ANSWER",
    "LONG_ANSWER",
    "CASE_BASED",
    "COMPETENCY",
    "HOTS",
  ]) {
    assert.equal(mapTeacherQuestionAssessmentType(type), type);
  }
  for (const type of ["ORDERING", "PICTURE_BASED", "ASSERTION_REASON", "PRACTICAL", "PROJECT", "CUSTOM", "UNSUPPORTED"]) {
    assert.equal(mapTeacherQuestionAssessmentType(type), null);
  }
});

test("TeacherQuestion MCQ content maps to the AssessmentQuestion runtime contract", () => {
  const snapshot = mapTeacherQuestionToAssessmentSnapshot(source());
  assert.deepEqual(snapshot, {
    id: "teacher-question-1",
    questionType: "MCQ",
    questionText: "Which material is magnetic?",
    options: ["Iron", "Wood"],
    correctAnswer: "Iron",
    marks: 2,
    explanation: "Iron is magnetic.",
    competency: "OBSERVE",
  });
});

test("TeacherQuestion multiple-select and match answers are normalized for assessment delivery", () => {
  const multiple = mapTeacherQuestionToAssessmentSnapshot(source({
    questionType: "MULTIPLE_SELECT",
    correctAnswer: JSON.stringify(["iron", "wood"]),
  }));
  assert.deepEqual(multiple?.options, ["Iron", "Wood"]);
  assert.equal(multiple?.correctAnswer, JSON.stringify(["Iron", "Wood"]));

  const match = mapTeacherQuestionToAssessmentSnapshot(source({
    questionType: "MATCH",
    options: [
      { left: "Iron", right: "Metal" },
      { left: "Wood", right: "Plant" },
    ],
    correctAnswer: JSON.stringify([{ Iron: "Metal" }, { Wood: "Plant" }]),
  }));
  assert.deepEqual(match?.options, { left: ["Iron", "Wood"], right: ["Metal", "Plant"] });
  assert.equal(match?.correctAnswer, JSON.stringify({ Iron: "Metal", Wood: "Plant" }));
});

test("snapshot content remains immutable after the TeacherQuestion source changes", () => {
  const original = source();
  const snapshot = mapTeacherQuestionToAssessmentSnapshot(original);
  original.questionText = "Changed after selection";
  (original.options as Array<{ id: string; text: string }>)[0].text = "Changed option";
  assert.equal(snapshot?.questionText, "Which material is magnetic?");
  assert.deepEqual(snapshot?.options, ["Iron", "Wood"]);
});

test("optional TeacherQuestion hierarchy metadata is compatible when absent, but mismatches fail", () => {
  const assessment = { sectionSubjectId: "section-subject-1", bookId: "book-1", chapterId: "chapter-1" };
  assert.equal(isTeacherQuestionAssessmentContextCompatible({
    question: { sectionSubjectId: null, bookId: null, chapterId: null },
    assessment,
  }), true);
  assert.equal(isTeacherQuestionAssessmentContextCompatible({
    question: { sectionSubjectId: "section-subject-2", bookId: "book-1", chapterId: "chapter-1" },
    assessment,
  }), false);
  assert.equal(isTeacherQuestionAssessmentContextCompatible({
    question: { sectionSubjectId: "section-subject-1", bookId: "book-2", chapterId: "chapter-1" },
    assessment,
  }), false);
  assert.equal(isTeacherQuestionAssessmentContextCompatible({
    question: { sectionSubjectId: "section-subject-1", bookId: "book-1", chapterId: "chapter-2" },
    assessment,
  }), false);
});

test("My Questions read model is teacher-owned, active, supported, and context-filtered", () => {
  assert.match(service, /teacherId: scope\.teacher\.id/);
  assert.match(service, /status: TeacherQuestionStatus\.ACTIVE/);
  assert.match(service, /questionType: \{ in: TEACHER_QUESTION_ASSESSMENT_TYPES \}/);
  assert.match(service, /sectionSubjectId: assessment\.sectionSubjectId/);
  assert.match(service, /bookId: assessment\.bookId/);
  assert.match(service, /tags: \{ has: search \}/);
});

test("My Questions mutation rejects forged ownership/status/type and is atomic", () => {
  assert.match(service, /id: \{ in: uniqueIds \}/);
  assert.match(service, /publisherId: scope\.publisherId/);
  assert.match(service, /schoolId: scope\.schoolId/);
  assert.match(service, /teacherId: scope\.teacher\.id/);
  assert.match(service, /status: TeacherQuestionStatus\.ACTIVE/);
  assert.match(service, /sourceRows\.length !== uniqueIds\.length/);
  assert.match(service, /await prisma\.\$transaction\(async \(tx\) => \{/);
  assert.match(service, /questionId: anchor\.id/);
});

test("builder distinguishes My Questions from Previous Assessment Questions", () => {
  assert.match(page, /<h4 className="font-bold">My Questions<\/h4>/);
  assert.match(page, /name="teacherQuestionId"/);
  assert.match(page, /<h4 className="font-bold">Previous Assessment Questions<\/h4>/);
  assert.match(page, /addPreviousAssessmentQuestionsAction/);
  assert.match(actions, /addMyQuestionsAction/);
  assert.match(actions, /addTeacherQuestionsToAssessment/);
});

test("publisher BookQuestion and previous AssessmentQuestion flows remain present", () => {
  assert.match(service, /export async function addPublisherQuestionsToAssessment/);
  assert.match(service, /appendBookQuestions/);
  assert.match(service, /export async function addSnapshotQuestionsToAssessment/);
  assert.match(actions, /addSnapshotQuestionsToAssessment/);
});

test("manual questions remain assessment snapshots and are not auto-saved to TeacherQuestion", () => {
  assert.match(service, /export async function addManualQuestionToAssessment/);
  assert.match(service, /fileOperation: "manual_question"/);
  assert.doesNotMatch(service, /addManualQuestionToAssessment[\s\S]*teacherQuestion\.create/);
});