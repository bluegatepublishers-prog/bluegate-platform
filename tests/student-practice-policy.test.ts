import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePracticeResult,
  gradePracticeAnswer,
  getPracticeFeedbackAnswer,
  isSupportedPracticeQuestion,
  selectPracticeQuestions,
  toSafePracticeQuestion,
  type PracticeQuestionCandidate,
} from "../lib/student-practice-policy";

function question(overrides: Partial<PracticeQuestionCandidate> = {}): PracticeQuestionCandidate {
  return { id: "q-1", bookId: "book-1", chapterId: "chapter-1", questionType: "MCQ", questionText: "Which is correct?", options: ["Alpha", "Beta"], correctAnswer: "Alpha", explanation: "Approved explanation", marks: 2, approved: true, createdAt: new Date("2026-01-01"), ...overrides };
}

test("selector includes only approved machine-gradable question types in exact book and chapter", () => {
  const selected = selectPracticeQuestions([
    question(),
    question({ id: "pending", approved: false }),
    question({ id: "subjective", questionType: "LONG" }),
    question({ id: "wrong-book", bookId: "book-2" }),
    question({ id: "wrong-chapter", chapterId: "chapter-2" }),
  ], { bookId: "book-1", chapterId: "chapter-1", requestedCount: 10 });
  assert.deepEqual(selected.map((item) => item.id), ["q-1"]);
});

test("selection ordering and maximum limit are deterministic", () => {
  const candidates = Array.from({ length: 25 }, (_, index) => question({ id: `q-${String(index).padStart(2, "0")}`, createdAt: new Date(2026, 0, index + 1) }));
  const selected = selectPracticeQuestions(candidates.reverse(), { bookId: "book-1", chapterId: "chapter-1", requestedCount: 99 });
  assert.equal(selected.length, 20);
  assert.equal(selected[0].id, "q-00");
  assert.equal(selected[19].id, "q-19");
});

test("invalid MCQ structure and missing answer keys are excluded", () => {
  assert.equal(isSupportedPracticeQuestion(question({ options: ["Alpha" ] })), false);
  assert.equal(isSupportedPracticeQuestion(question({ correctAnswer: "Gamma" })), false);
  assert.equal(isSupportedPracticeQuestion(question({ correctAnswer: null })), false);
});

test("safe question view omits answer, explanation, approval, and tenant metadata", () => {
  const safe = toSafePracticeQuestion(question(), 1);
  assert.equal(safe.questionId, "q-1");
  assert.equal(safe.questionType, "MCQ");
  assert.deepEqual(safe.interactiveQuestion.answer, {});
  for (const hidden of ["correctAnswer", "explanation", "approved", "bookId", "chapterId", "grading"]) assert.equal(hidden in safe, false);
  for (const hidden of ["correctOptionIds", "acceptedAnswers"]) assert.equal(hidden in safe.interactiveQuestion.answer, false);
});

test("MCQ grading is exact after safe normalization and marks are server-derived", () => {
  assert.deepEqual(gradePracticeAnswer(question(), " alpha "), { ok: true, mode: "AUTO_GRADED", correct: true, marksAwarded: 2, answer: "alpha" });
  assert.deepEqual(gradePracticeAnswer(question(), "Beta"), { ok: true, mode: "AUTO_GRADED", correct: false, marksAwarded: 0, answer: "Beta" });
  assert.equal(gradePracticeAnswer(question(), "not-an-option").ok, false);
});

test("True/False grading normalizes booleans and strings", () => {
  const item = question({ questionType: "TRUE_FALSE", options: null, correctAnswer: "TRUE", marks: 1 });
  const correct = gradePracticeAnswer(item, true);
  const incorrect = gradePracticeAnswer(item, " false ");
  assert.equal(correct.ok && correct.correct, true);
  assert.equal(incorrect.ok && incorrect.correct, false);
  assert.equal(gradePracticeAnswer(item, "yes").ok, false);
});

test("fill-blank grading trims, collapses spaces, and ignores case without fuzzy matching", () => {
  const item = question({ questionType: "FILL_BLANK", options: null, correctAnswer: "New Delhi" });
  const correct = gradePracticeAnswer(item, "  new   DELHI ");
  const incorrect = gradePracticeAnswer(item, "Delhi");
  assert.equal(correct.ok && correct.correct, true);
  assert.equal(incorrect.ok && incorrect.correct, false);
});

test("Multiple Select uses exact option-id sets and safe normalized payloads", () => {
  const item = question({ questionType: "MULTIPLE_SELECT", options: [{ id: "a", text: "Alpha" }, { id: "b", text: "Beta" }, { id: "c", text: "Gamma" }], correctAnswer: JSON.stringify(["b", "c"]) });
  assert.equal(isSupportedPracticeQuestion(item), true);
  const reordered = gradePracticeAnswer(item, ["c", "b"]);
  const missing = gradePracticeAnswer(item, ["b"]);
  const extra = gradePracticeAnswer(item, ["b", "c", "a"]);
  assert.equal(reordered.ok && reordered.correct, true);
  assert.equal(missing.ok && missing.correct, false);
  assert.equal(extra.ok && extra.correct, false);
  assert.equal(gradePracticeAnswer(item, ["missing"]).ok, false);
  assert.equal(getPracticeFeedbackAnswer(item), "Beta, Gamma");
  const safe = toSafePracticeQuestion(item, 1);
  assert.deepEqual(safe.interactiveQuestion.answer, {});
  assert.deepEqual(safe.interactiveQuestion.options.map((option) => option.id), ["a", "b", "c"]);
});

test("Short Answer is an approved manual response with no automatic correctness or score", () => {
  const item = question({ questionType: "SHORT_ANSWER", options: null, correctAnswer: null, explanation: "A model response may be discussed after submission.", marks: 3 });
  assert.equal(isSupportedPracticeQuestion(item), true);
  assert.equal(isSupportedPracticeQuestion({ ...item, approved: false }), false);
  const grade = gradePracticeAnswer(item, "  My written response  ");
  assert.deepEqual(grade, { ok: true, mode: "MANUAL_RESPONSE", correct: null, marksAwarded: null, answer: "My written response" });
  const safe = toSafePracticeQuestion(item, 1);
  assert.equal(safe.questionType, "SHORT_ANSWER");
  assert.deepEqual(safe.interactiveQuestion.answer, {});
  assert.equal("correctAnswer" in safe, false);
  assert.deepEqual(calculatePracticeResult([{ correct: null, marksAwarded: null, answeredAt: new Date("2026-01-01"), answer: "My written response", question: { marks: 3 } }]), { attemptedCount: 1, correctCount: 0, totalMarks: 3, marksAwarded: 0, scorePercent: null });
});
test("malformed answers are rejected", () => {
  for (const answer of [null, undefined, 1, {}, [], ""]) assert.equal(gradePracticeAnswer(question(), answer).ok, false);
});

test("submission totals and score are computed exclusively from stored response grades", () => {
  assert.deepEqual(calculatePracticeResult([
    { correct: true, marksAwarded: 2, question: { marks: 2 } },
    { correct: false, marksAwarded: 0, question: { marks: 3 } },
  ]), { attemptedCount: 2, correctCount: 1, totalMarks: 5, marksAwarded: 2, scorePercent: 40 });
});
