import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  calculateStudentWorksheetAttempt,
  gradeStudentWorksheetResponse,
  isAvailableStudentWorksheetQuestion,
  isStudentWorksheetAudience,
  toSafeStudentWorksheetQuestion,
} from "../lib/student-worksheet-policy";

const root = process.cwd();
const source = readFileSync(path.join(root, "lib/student-worksheet.ts"), "utf8");
const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  path.join(
    root,
    "prisma/migrations/20260815010000_student_worksheet_attempt_foundation/migration.sql",
  ),
  "utf8",
);

function question(overrides: Partial<{
  id: string;
  questionType: string;
  options: unknown;
  correctAnswer: string | null;
  marks: number;
  approved: boolean;
  archived: boolean;
  questionText: string;
}> = {}) {
  return {
    id: "question-1",
    bookId: "book-1",
    chapterId: "chapter-1",
    moduleId: null,
    imageResourceId: null,
    questionType: "MCQ",
    questionText: "Choose the correct answer.",
    options: [
      { id: "a", text: "First" },
      { id: "b", text: "Second" },
    ],
    correctAnswer: "a",
    explanation: "Secret explanation.",
    marks: 2,
    approved: true,
    archived: false,
    createdAt: new Date("2026-08-15T00:00:00.000Z"),
    ...overrides,
  };
}

test("worksheet attempt Prisma models are additive, scoped, and indexed", () => {
  const attempt = schema.slice(
    schema.indexOf("model StudentWorksheetAttempt {"),
    schema.indexOf("model StudentWorksheetResponse {"),
  );
  assert.match(attempt, /worksheetId\s+String/u);
  assert.match(attempt, /studentId\s+String/u);
  assert.match(attempt, /schoolId\s+String/u);
  assert.match(attempt, /academicYearId\s+String/u);
  assert.match(attempt, /publisherId\s+String/u);
  assert.match(attempt, /bookId\s+String/u);
  assert.match(attempt, /status\s+StudentWorksheetAttemptStatus/u);
  assert.match(attempt, /@@index\(\[studentId, academicYearId, status\]\)/u);
  assert.match(attempt, /@@index\(\[worksheetId, status\]\)/u);
  assert.match(attempt, /@@index\(\[academicYearId, submittedAt\]\)/u);
  assert.match(schema, /worksheetResponses\s+StudentWorksheetResponse\[\]/u);
  assert.match(schema, /attempts\s+StudentWorksheetAttempt\[\]/u);
  assert.match(migration, /CREATE TABLE "StudentWorksheetAttempt"/u);
  assert.match(migration, /CREATE TABLE "StudentWorksheetResponse"/u);
  assert.match(migration, /FOREIGN KEY/u);
  assert.doesNotMatch(migration, /\bDROP\s+(?:TABLE|COLUMN|TYPE)\b|\bDELETE\s+FROM\b|\bTRUNCATE\s+TABLE\b/iu);
});

test("worksheet service constrains attempts to the authenticated student and live student-visible worksheet", () => {
  assert.match(source, /await requireStudent\(\)/u);
  assert.match(source, /await getStudentBook\(worksheet\.bookId\)/u);
  assert.match(source, /studentId: identity\.student\.id/u);
  assert.match(source, /schoolId: identity\.school\.id/u);
  assert.match(source, /academicYearId: identity\.academicYear\.id/u);
  assert.match(source, /publisherId: identity\.publisher\.id/u);
  assert.match(source, /active: true/u);
  assert.match(source, /published: true/u);
  assert.match(source, /archivedAt: null/u);
  assert.match(source, /allowOnlineAttempt: true/u);
  assert.match(source, /audience: \{ in: \["STUDENT", "BOTH"\] \}/u);
  assert.match(source, /if \(!questions\.length\)/u);
});

test("worksheet audience and valid-question filtering reject non-student, unpublished, or inactive content", () => {
  assert.equal(isStudentWorksheetAudience("STUDENT"), true);
  assert.equal(isStudentWorksheetAudience("BOTH"), true);
  assert.equal(isStudentWorksheetAudience("TEACHER"), false);
  assert.equal(isAvailableStudentWorksheetQuestion(question()), true);
  assert.equal(isAvailableStudentWorksheetQuestion(question({ approved: false })), false);
  assert.equal(isAvailableStudentWorksheetQuestion(question({ archived: true })), false);
  assert.equal(isAvailableStudentWorksheetQuestion(question({ correctAnswer: null })), false);
});

test("worksheet launch payload keeps saved order and omits answer keys", () => {
  const second = toSafeStudentWorksheetQuestion(question({ id: "question-2" }), 20, 2);
  const first = toSafeStudentWorksheetQuestion(question({ id: "question-1" }), 10, 1);
  assert.deepEqual([first.position, second.position], [10, 20]);
  assert.deepEqual([first.questionNumber, second.questionNumber], [1, 2]);
  const payload = JSON.stringify(first);
  assert.doesNotMatch(payload, /secret-key|Secret explanation|correctAnswer|correctOptionIds/u);
  assert.match(source, /toSafeStudentWorksheetQuestion/u);
});

test("worksheet objective grading reuses normalized evaluation and manual responses remain ungraded", () => {
  const objective = gradeStudentWorksheetResponse(question(), "a");
  assert.deepEqual(objective, {
    ok: true,
    mode: "AUTO_GRADED",
    correct: true,
    marksAwarded: 2,
    answer: "a",
  });

  const manual = gradeStudentWorksheetResponse(
    question({ questionType: "SHORT_ANSWER", correctAnswer: null }),
    "A thoughtful response.",
  );
  assert.deepEqual(manual, {
    ok: true,
    mode: "MANUAL_RESPONSE",
    correct: null,
    marksAwarded: null,
    answer: "A thoughtful response.",
  });
});

test("worksheet submission totals fully auto-graded answers and retains null percentage when manual grading remains", () => {
  const auto = question();
  const automatic = calculateStudentWorksheetAttempt(
    [auto],
    [{ questionId: auto.id, response: "a", correct: true, marksAwarded: 2 }],
  );
  assert.deepEqual(automatic, {
    questionCount: 1,
    totalMarks: 2,
    marksAwarded: 2,
    percentage: 100,
  });

  const manual = question({ id: "question-2", questionType: "SHORT_ANSWER", correctAnswer: null, marks: 3 });
  const mixed = calculateStudentWorksheetAttempt(
    [auto, manual],
    [
      { questionId: auto.id, response: "a", correct: true, marksAwarded: 2 },
      { questionId: manual.id, response: "Written response", correct: null, marksAwarded: null },
    ],
  );
  assert.deepEqual(mixed, {
    questionCount: 2,
    totalMarks: 5,
    marksAwarded: 2,
    percentage: null,
  });
});

test("worksheet responses are membership-checked, complete-before-submit, and immutable after submission", () => {
  assert.match(source, /scope\.questions\.find\(\(item\) => item\.question\.id === questionId\)/u);
  assert.match(source, /studentWorksheetResponse\.upsert/u);
  assert.match(source, /attempt\.status !== StudentWorksheetAttemptStatus\.IN_PROGRESS/u);
  assert.match(source, /Please answer all questions before submitting\./u);
  assert.match(source, /status: StudentWorksheetAttemptStatus\.SUBMITTED/u);
  assert.doesNotMatch(source, /input\.studentId|input\.schoolId|input\.academicYearId|input\.marksAwarded|input\.correct/u);
});