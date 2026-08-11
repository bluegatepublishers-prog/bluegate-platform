import assert from "node:assert/strict";
import test from "node:test";

import { createQuestionDeliveryContext } from "../lib/question-delivery-mode";
import { adaptTeacherQuestion } from "../lib/normalized-question";
import { evaluateFillBlankResponse, evaluateObjectiveQuestionResponse } from "../lib/question-response-evaluator";

const fill = (response: unknown, options?: unknown) => evaluateFillBlankResponse({ response, correctAnswer: "New Delhi", options }).correct;

test("Fill Blank normalizes case and whitespace without changing the stored answer", () => {
  for (const response of ["New Delhi", "new delhi", "NEW DELHI", "New delhi", "  new delhi", "new   delhi"]) assert.equal(fill(response), true);
  assert.equal(fill("New Deli"), false);
  assert.equal(fill("Mumbai"), false);
});

test("Fill Blank supports validated alternate answers and matching overrides", () => {
  const options = { acceptedAnswers: ["CO2"], matching: { caseSensitive: true, trimWhitespace: true, collapseWhitespace: true } };
  assert.equal(evaluateFillBlankResponse({ response: "CO2", correctAnswer: "Carbon dioxide", options }).correct, true);
  assert.equal(evaluateFillBlankResponse({ response: "co2", correctAnswer: "Carbon dioxide", options }).correct, false);
});

test("legacy Fill Blank with only correctAnswer remains normalized", () => {
  const question = adaptTeacherQuestion({ id: "q", publisherId: "p", schoolId: "s", teacherId: "t", questionType: "FILL_BLANK", questionText: "Capital", correctAnswer: "New Delhi", sourceHash: "hash", revision: 1 });
  assert.deepEqual(question.answer.acceptedAnswers, ["New Delhi"]);
});

test("objective evaluator handles MCQ, True False, and Multiple Select", () => {
  const base = { id: "q", publisherId: "p", schoolId: "s", teacherId: "t", questionText: "Question", sourceHash: "hash", revision: 1 };
  const mcq = adaptTeacherQuestion({ ...base, questionType: "MCQ", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], correctAnswer: "a" });
  const truth = adaptTeacherQuestion({ ...base, questionType: "TRUE_FALSE", correctAnswer: "true" });
  const multiple = adaptTeacherQuestion({ ...base, questionType: "MULTIPLE_SELECT", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], correctAnswer: JSON.stringify(["a", "b"]) });
  assert.equal(evaluateObjectiveQuestionResponse(mcq, "a").correct, true);
  assert.equal(evaluateObjectiveQuestionResponse(truth, false).correct, false);
  assert.equal(evaluateObjectiveQuestionResponse(multiple, ["b", "a"]).correct, true);
});

test("students cannot construct answer-key delivery mode", () => {
  assert.throws(() => createQuestionDeliveryContext({ mode: "ANSWER_KEY", audience: "STUDENT" }));
  assert.equal(createQuestionDeliveryContext({ mode: "ANSWER_KEY", audience: "TEACHER" }).answerVisibility, "VISIBLE");
});
