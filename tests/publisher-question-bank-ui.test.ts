import assert from "node:assert/strict";
import test from "node:test";

import {
  addPublisherChoice,
  createPublisherQuestionDraft,
  formatPublisherChapterLabel,
  normalizePublisherChoices,
  removePublisherChoice,
  validatePublisherQuestionDraft,
} from "../lib/publisher-question-bank-ui";

test("publisher MCQ choices start with two stable rows and cannot be removed below two", () => {
  const initial = createPublisherQuestionDraft("chapter-1");
  assert.equal(initial.difficulty, "");
  assert.deepEqual(initial.options.map((choice) => choice.id), ["option-1", "option-2"]);
  assert.equal(removePublisherChoice(initial, "option-1"), initial);

  const expanded = addPublisherChoice(initial);
  assert.deepEqual(expanded.options.map((choice) => choice.id), ["option-1", "option-2", "option-3"]);
  const selected = { ...expanded, correctAnswer: "option-3", correctAnswers: ["option-2", "option-3"] };
  const reduced = removePublisherChoice(selected, "option-3");
  assert.equal(reduced.correctAnswer, "");
  assert.deepEqual(reduced.correctAnswers, ["option-2"]);
});

test("publisher objective validation requires structured choices and type-specific correct answers", () => {
  const draft = createPublisherQuestionDraft("chapter-1");
  draft.questionText = "Which is correct?";
  draft.options = [{ id: "a", text: "A" }, { id: "b", text: "B" }];
  assert.equal(validatePublisherQuestionDraft(draft), "Select one correct option.");
  draft.correctAnswer = "a";
  assert.equal(validatePublisherQuestionDraft(draft), null);

  const multiple = { ...draft, questionType: "MULTIPLE_SELECT", correctAnswer: "", correctAnswers: [] };
  assert.equal(validatePublisherQuestionDraft(multiple), "Select at least one correct option.");
  assert.equal(validatePublisherQuestionDraft({ ...multiple, correctAnswers: ["a"] }), null);
});

test("legacy option arrays are normalized to stable structured publisher choice rows", () => {
  assert.deepEqual(normalizePublisherChoices(["Copper", { label: "Wood" }, { id: "glass", text: "Glass" }]), [
    { id: "option-1", text: "Copper" },
    { id: "option-2", text: "Wood" },
    { id: "glass", text: "Glass" },
  ]);
});

test("publisher chapter labels include a chapter prefix exactly once", () => {
  assert.equal(formatPublisherChapterLabel(1, "Family And Friends"), "Chapter 1: Family And Friends");
  assert.equal(formatPublisherChapterLabel(1, "Chapter 1: Family And Friends"), "Chapter 1: Family And Friends");
});
