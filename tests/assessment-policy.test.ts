import assert from "node:assert/strict";
import test from "node:test";
import {
  ASSESSMENT_TYPES,
  calculateAssessmentExpiry,
  calculateAssessmentSummary,
  canReleaseAssessmentResult,
  gradeAssessmentAnswer,
  isAssessmentExpired,
  isValidAssessmentQuestion,
  normalizeAssessmentQuestionType,
  toSafeAssessmentQuestion,
  validateAssessmentDuration,
  type AssessmentQuestionSnapshot,
} from "../lib/assessment-policy";

function question(overrides: Partial<AssessmentQuestionSnapshot> = {}): AssessmentQuestionSnapshot {
  return { id: "aq-1", questionType: "MCQ", questionText: "Choose one", options: ["Alpha", "Beta"], correctAnswer: "Alpha", marks: 2, ...overrides };
}

test("approved assessment and question vocabularies normalize legacy question-bank names", () => {
  assert.deepEqual(ASSESSMENT_TYPES, ["CHAPTER", "UNIT", "TERM", "CUSTOM"]);
  assert.equal(normalizeAssessmentQuestionType("VERY_SHORT"), "SHORT_ANSWER");
  assert.equal(normalizeAssessmentQuestionType("LONG"), "LONG_ANSWER");
  assert.equal(normalizeAssessmentQuestionType("CASE_STUDY"), "CASE_BASED");
  for (const type of ["MCQ", "TRUE_FALSE", "FILL_BLANK", "MATCH", "MULTIPLE_SELECT", "SHORT_ANSWER", "LONG_ANSWER", "CASE_BASED", "COMPETENCY", "HOTS"]) assert.ok(normalizeAssessmentQuestionType(type));
});

test("MCQ, true-false, and fill blank are exact deterministic grades", () => {
  assert.deepEqual(gradeAssessmentAnswer(question(), " alpha "), { ok: true, autoGraded: true, correct: true, marksAwarded: 2, answer: "alpha", reviewStatus: "NOT_REQUIRED" });
  assert.equal(gradeAssessmentAnswer(question({ questionType: "TRUE_FALSE", options: null, correctAnswer: "TRUE" }), false).ok, true);
  const fill = gradeAssessmentAnswer(question({ questionType: "FILL_BLANK", options: null, correctAnswer: "New Delhi" }), " new   delhi ");
  assert.equal(fill.ok && fill.correct, true);
});

test("multiple-select grading compares exact option sets", () => {
  const item = question({ questionType: "MULTIPLE_SELECT", options: ["A", "B", "C"], correctAnswer: JSON.stringify(["A", "C"]), marks: 3 });
  assert.equal(isValidAssessmentQuestion(item), true);
  const correct = gradeAssessmentAnswer(item, ["C", "A"]);
  const incorrect = gradeAssessmentAnswer(item, ["A"]);
  assert.equal(correct.ok && correct.correct, true);
  assert.equal(incorrect.ok && incorrect.correct, false);
  assert.equal(gradeAssessmentAnswer(item, ["outside"]).ok, false);
});

test("match grading validates every authored pair", () => {
  const item = question({ questionType: "MATCH", options: { left: ["L1", "L2"], right: ["R1", "R2"] }, correctAnswer: JSON.stringify({ L1: "R2", L2: "R1" }), marks: 4 });
  assert.equal(isValidAssessmentQuestion(item), true);
  const grade = gradeAssessmentAnswer(item, { L1: "R2", L2: "R1" });
  assert.equal(grade.ok && grade.correct && grade.marksAwarded === 4, true);
  assert.equal(gradeAssessmentAnswer(item, { L1: "R2" }).ok, false);
});

test("subjective answers are preserved for human review and never auto-graded", () => {
  for (const type of ["SHORT_ANSWER", "LONG_ANSWER", "CASE_BASED", "COMPETENCY", "HOTS"]) {
    const grade = gradeAssessmentAnswer(question({ questionType: type, options: null, correctAnswer: null, marks: 5 }), "Student response");
    assert.deepEqual(grade, { ok: true, autoGraded: false, correct: null, marksAwarded: null, answer: "Student response", reviewStatus: "PENDING" });
  }
});

test("unsupported or malformed questions and answers fail closed", () => {
  assert.equal(isValidAssessmentQuestion(question({ questionType: "ASSERTION_REASON" })), false);
  assert.equal(isValidAssessmentQuestion(question({ options: ["Only one"] })), false);
  assert.equal(isValidAssessmentQuestion(question({ correctAnswer: "Outside" })), false);
  assert.equal(gradeAssessmentAnswer(question(), { clientCorrect: true }).ok, false);
});

test("safe assessment question projection omits answer keys and reporting metadata", () => {
  const safe = toSafeAssessmentQuestion(question(), 1)!;
  assert.deepEqual(safe, { assessmentQuestionId: "aq-1", questionNumber: 1, questionType: "MCQ", questionText: "Choose one", options: ["Alpha", "Beta"], marks: 2, subjective: false });
  for (const hidden of ["correctAnswer", "explanation", "competency", "learningOutcome", "questionId"]) assert.equal(hidden in safe, false);
});

test("timer accepts untimed, presets, and bounded custom durations", () => {
  for (const value of [null, 1, 30, 45, 60, 300]) assert.equal(validateAssessmentDuration(value), true);
  for (const value of [0, -1, 301, 2.5]) assert.equal(validateAssessmentDuration(value), false);
});

test("server deadline is the earlier timer or assessment due date", () => {
  const start = new Date("2026-07-13T10:00:00Z");
  const due = new Date("2026-07-13T10:30:00Z");
  assert.equal(calculateAssessmentExpiry(start, 60, due)?.toISOString(), due.toISOString());
  assert.equal(calculateAssessmentExpiry(start, 30, null)?.toISOString(), due.toISOString());
  assert.equal(isAssessmentExpired(due, new Date("2026-07-13T10:30:00Z")), true);
});

test("result-release policy enforces immediate, after-due-date, and never", () => {
  const dueAt = new Date("2026-07-13T10:30:00Z");
  assert.equal(canReleaseAssessmentResult({ release: "IMMEDIATE", dueAt, now: new Date(0) }), true);
  assert.equal(canReleaseAssessmentResult({ release: "AFTER_DUE_DATE", dueAt, now: new Date("2026-07-13T10:29:59Z") }), false);
  assert.equal(canReleaseAssessmentResult({ release: "AFTER_DUE_DATE", dueAt, now: dueAt }), true);
  assert.equal(canReleaseAssessmentResult({ release: "NEVER", dueAt, now: dueAt }), false);
});

test("permanent result summary stores marks, time, correct, wrong, skipped, and subjective pending", () => {
  const summary = calculateAssessmentSummary([
    { answer: "A", correct: true, marksAwarded: 2, reviewStatus: "NOT_REQUIRED", question: { marks: 2 } },
    { answer: "B", correct: false, marksAwarded: 0, reviewStatus: "NOT_REQUIRED", question: { marks: 2 } },
    { answer: null, correct: null, marksAwarded: null, reviewStatus: "NOT_REQUIRED", question: { marks: 1 } },
    { answer: "Essay", correct: null, marksAwarded: null, reviewStatus: "PENDING", question: { marks: 5 } },
  ], new Date("2026-07-13T10:00:00Z"), new Date("2026-07-13T10:20:45Z"));
  assert.deepEqual(summary, { totalMarks: 10, awardedMarks: 2, percentage: null, correctCount: 1, wrongCount: 1, skippedCount: 1, subjectivePending: 1, timeTakenSeconds: 1245, provisional: true });
});
