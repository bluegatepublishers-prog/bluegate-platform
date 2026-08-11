import assert from "node:assert/strict";
import test from "node:test";

import {
  adaptAssessmentQuestion,
  adaptBookQuestion,
  adaptPublisherAssignmentQuestion,
  adaptTeacherAssignmentQuestion,
  adaptWorksheetQuestion,
  createNormalizedQuestionRenderInput,
  gradingForQuestionType,
  normalizeQuestionType,
} from "../lib/normalized-question";

test("BookQuestion adapts publisher identity, metadata, image resource, and MCQ answer without mutation", () => {
  const source = {
    id: "book-question-1", bookId: "book-1", chapterId: "chapter-1", moduleId: "module-1", imageResourceId: "resource-image-1",
    questionType: "MCQ", questionText: "Which is magnetic?", options: [{ id: "A", label: "Iron" }, { id: "B", label: "Wood" }],
    correctAnswer: "Iron", explanation: "Iron is magnetic.", marks: 2, difficulty: "EASY", bloomLevel: "Remember", competency: "Observation",
  };
  const before = structuredClone(source);
  const question = adaptBookQuestion(source);
  assert.deepEqual(source, before);
  assert.equal(question.source.type, "PUBLISHER");
  assert.equal(question.snapshot.kind, "MASTER");
  assert.deepEqual(question.resourceIds, ["resource-image-1"]);
  assert.deepEqual(question.answer, { kind: "SINGLE_OPTION", correctOptionIds: ["A"], acceptedAnswers: ["Iron"] });
  assert.equal(question.competency, "Observation");
});

test("AssessmentQuestion preserves its issued snapshot and maps objective formats", () => {
  const base = { id: "assessment-question-1", assessmentId: "assessment-1", questionId: "book-question-1", bookId: "book-1", chapterId: "chapter-1", questionText: "Prompt", explanation: null, marks: 3, competency: null, learningOutcome: null };
  const mcq = adaptAssessmentQuestion({ ...base, questionType: "MCQ", options: ["A", "B"], correctAnswer: "A" });
  const truth = adaptAssessmentQuestion({ ...base, id: "assessment-question-2", questionType: "TRUE_FALSE", options: null, correctAnswer: "true" });
  const fill = adaptAssessmentQuestion({ ...base, id: "assessment-question-3", questionType: "FILL_BLANK", options: ["New Delhi"], correctAnswer: "New Delhi" });
  const match = adaptAssessmentQuestion({ ...base, id: "assessment-question-4", questionType: "MATCH", options: { left: ["L1", "L2"], right: ["R1", "R2"] }, correctAnswer: JSON.stringify({ L1: "R2", L2: "R1" }) });
  assert.equal(mcq.snapshot.immutable, true);
  assert.deepEqual(mcq.answer.correctOptionIds, ["option-1"]);
  assert.equal(truth.answer.correctBoolean, true);
  assert.deepEqual(fill.answer.acceptedAnswers, ["New Delhi"]);
  assert.deepEqual(match.answer.matches, [{ left: "L1", right: "R2" }, { left: "L2", right: "R1" }]);
});

test("short, long, case, competency, and HOTS source names map without being lost", () => {
  const expected = new Map([
    ["SHORT", "SHORT_ANSWER"], ["LONG", "LONG_ANSWER"], ["CASE_STUDY", "CASE_BASED"], ["MULTIPLE_SELECT", "MULTIPLE_SELECT"], ["DIAGRAM", "PICTURE_BASED"], ["ASSERTION_REASON", "ASSERTION_REASON"], ["COMPETENCY", "COMPETENCY"], ["HOTS", "HOTS"], ["PRACTICAL", "PRACTICAL"], ["PROJECT", "PROJECT"],
  ]);
  for (const [source, normalized] of expected) {
    assert.equal(normalizeQuestionType(source), normalized);
    assert.equal(adaptBookQuestion({ id: source, bookId: "book", chapterId: "chapter", questionType: source, questionText: "Prompt" }).originalQuestionType, source);
  }
});

test("assignment adapters preserve source attribution, target hash, label, and inline payload shape", () => {
  const teacher = adaptTeacherAssignmentQuestion(
    { id: "item-teacher", assignmentId: "assignment-1", type: "TEACHER_QUESTION", targetSourceHash: "hash-teacher", targetLabelSnapshot: "Teacher prompt" },
    { prompt: "Explain the result.", responseType: "LONG_TEXT" },
  );
  const publisher = adaptPublisherAssignmentQuestion(
    { id: "item-publisher", assignmentId: "assignment-1", type: "PUBLISHER_QUESTION", moduleId: "module-1", pageId: "page-1", frameId: "frame-1", questionId: "v2-question-1", targetSourceHash: "hash-v2", targetLabelSnapshot: "Page 1 — Question" },
    { id: "v2-question-1", responseType: "MCQ", prompt: "Choose", options: [{ id: "a", text: "One" }, { id: "b", text: "Two" }] },
  );
  assert.equal(teacher.source.type, "INLINE");
  assert.equal(teacher.snapshot.sourceHash, "hash-teacher");
  assert.equal(teacher.questionType, "LONG_ANSWER");
  assert.equal(publisher.source.masterId, "v2-question-1");
  assert.equal(publisher.snapshot.kind, "REFERENCE");
  assert.equal(publisher.snapshot.label, "Page 1 — Question");
  assert.equal(publisher.source.attribution.frameId, "frame-1");
});

test("worksheet questions adapt current payloads while preserving print-friendly matching data", () => {
  const question = adaptWorksheetQuestion({
    id: "worksheet-question-1", type: "match", prompt: "Match the columns", marks: 2,
    pairs: [{ id: "pair-1", left: "Iron", right: "Metal" }, { id: "pair-2", left: "Wood", right: "Non-metal" }],
  });
  assert.equal(question.questionType, "MATCH");
  assert.deepEqual(question.answer, { kind: "MATCH", matches: [{ left: "Iron", right: "Metal" }, { left: "Wood", right: "Non-metal" }] });
});

test("grading metadata reflects current assessment runtime rather than future assumptions", () => {
  assert.deepEqual(gradingForQuestionType("MCQ"), { capability: "AUTO", assessmentRuntime: "SUPPORTED", requiresAnswerDefinition: true });
  assert.deepEqual(gradingForQuestionType("SHORT_ANSWER"), { capability: "MANUAL", assessmentRuntime: "SUPPORTED", requiresAnswerDefinition: false });
  assert.deepEqual(gradingForQuestionType("ORDERING"), { capability: "AUTO", assessmentRuntime: "NOT_IMPLEMENTED", requiresAnswerDefinition: true });
  assert.deepEqual(gradingForQuestionType("PICTURE_BASED"), { capability: "HYBRID", assessmentRuntime: "NOT_IMPLEMENTED", requiresAnswerDefinition: false });
});

test("one renderer contract governs interactive, print, and answer-key consumers", () => {
  const question = adaptBookQuestion({ id: "book-question-1", bookId: "book", chapterId: "chapter", questionType: "MCQ", questionText: "Choose", options: ["A", "B"], correctAnswer: "A" });
  assert.equal(createNormalizedQuestionRenderInput({ question, mode: "INTERACTIVE", audience: "STUDENT" }).answerVisibility, "HIDDEN");
  assert.equal(createNormalizedQuestionRenderInput({ question, mode: "PRINT", audience: "TEACHER" }).answerVisibility, "HIDDEN");
  assert.equal(createNormalizedQuestionRenderInput({ question, mode: "ANSWER_KEY", audience: "PUBLISHER" }).answerVisibility, "VISIBLE");
  assert.throws(() => createNormalizedQuestionRenderInput({ question, mode: "ANSWER_KEY", audience: "STUDENT" }));
});
