import { adaptBookQuestion, getBookQuestionPracticeMode, toSafeInteractiveQuestion } from "@/lib/normalized-question";
import { isExactMultipleSelectResponse } from "@/lib/question-response-evaluator";

export interface PracticeQuestionCandidate {
  id: string;
  bookId: string;
  chapterId: string;
  questionType: string;
  moduleId?: string | null;
  imageResourceId?: string | null;
  questionText: string;
  options: unknown;
  correctAnswer: string | null;
  explanation: string | null;
  marks: number;
  approved: boolean;
  createdAt: Date;
}

export function normalizePracticeAnswer(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

type PracticeOption = { id: string; text: string };

function getPracticeOptions(value: unknown): PracticeOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (typeof item === "string" && item.trim()) return [{ id: `option-${index + 1}`, text: item.trim() }];
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const text = [record.text, record.label, record.value].find((candidate) => typeof candidate === "string" && candidate.trim());
    if (typeof text !== "string") return [];
    const id = typeof record.id === "string" && record.id.trim() ? record.id.trim() : `option-${index + 1}`;
    return [{ id, text: text.trim() }];
  });
}

export function getStringOptions(value: unknown) {
  return [...new Set(getPracticeOptions(value).map((option) => option.text))];
}

function matchesPracticeOption(value: string, option: PracticeOption) {
  const normalized = normalizePracticeAnswer(value);
  return normalized === normalizePracticeAnswer(option.id) || normalized === normalizePracticeAnswer(option.text);
}

function multipleSelectCorrectOptionIds(correctAnswer: string | null) {
  try {
    const parsed = JSON.parse(correctAnswer ?? "") as unknown;
    return Array.isArray(parsed) ? [...new Set(parsed.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean))] : [];
  } catch {
    return [];
  }
}
export function getPracticeFeedbackAnswer(question: PracticeQuestionCandidate) {
  if (question.questionType !== "MULTIPLE_SELECT") return question.correctAnswer;
  const optionById = new Map(getPracticeOptions(question.options).map((option) => [option.id, option.text]));
  const answers = multipleSelectCorrectOptionIds(question.correctAnswer)
    .map((id) => optionById.get(id))
    .filter((value): value is string => Boolean(value));
  return answers.length ? answers.join(", ") : null;
}

export function isSupportedPracticeQuestion(question: PracticeQuestionCandidate) {
  const mode = getBookQuestionPracticeMode(question.questionType);
  if (mode === "UNSUPPORTED" || !question.approved || !question.questionText.trim() || question.marks < 1) return false;
  if (mode === "MANUAL_RESPONSE") return true;
  if (!question.correctAnswer?.trim()) return false;
  if (question.questionType === "MCQ") {
    const options = getPracticeOptions(question.options);
    return options.length >= 2 && options.some((option) => matchesPracticeOption(question.correctAnswer!, option));
  }
  if (question.questionType === "TRUE_FALSE") {
    return ["true", "false"].includes(normalizePracticeAnswer(question.correctAnswer));
  }
  if (question.questionType === "MULTIPLE_SELECT") {
    const options = getPracticeOptions(question.options);
    const correctIds = multipleSelectCorrectOptionIds(question.correctAnswer);
    return options.length >= 2 && correctIds.length >= 1 && correctIds.every((id) => options.some((option) => option.id === id));
  }
  return true;
}

export function selectPracticeQuestions(
  candidates: readonly PracticeQuestionCandidate[],
  input: { bookId: string; chapterId: string; requestedCount?: unknown },
) {
  const count = Number.isInteger(input.requestedCount)
    ? Math.min(20, Math.max(1, Number(input.requestedCount)))
    : 5;
  return candidates
    .filter((question) => question.bookId === input.bookId && question.chapterId === input.chapterId && isSupportedPracticeQuestion(question))
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id))
    .slice(0, count);
}

export function toSafePracticeQuestion(question: PracticeQuestionCandidate, questionNumber: number) {
  return {
    questionId: question.id,
    questionNumber,
    questionText: question.questionText,
    questionType: question.questionType,
    interactiveQuestion: toSafeInteractiveQuestion(adaptBookQuestion(question)),
    options: question.questionType === "MCQ" || question.questionType === "MULTIPLE_SELECT"
      ? getStringOptions(question.options)
      : question.questionType === "TRUE_FALSE" ? ["True", "False"] : [],
    ...(question.questionType === "MULTIPLE_SELECT"
      ? { optionRecords: getPracticeOptions(question.options) }
      : {}),
    marks: question.marks,
  };
}

export type PracticeGrade =
  | { ok: true; mode: "AUTO_GRADED" | "MANUAL_RESPONSE"; correct: boolean | null; marksAwarded: number | null; answer: string | boolean | string[] }
  | { ok: false; message: "We could not save your answer. Please try again." };

export function gradePracticeAnswer(question: PracticeQuestionCandidate, answer: unknown): PracticeGrade {
  if (!isSupportedPracticeQuestion(question)) return { ok: false, message: "We could not save your answer. Please try again." };
  const mode = getBookQuestionPracticeMode(question.questionType);
  if (mode === "MANUAL_RESPONSE") {
    if (typeof answer !== "string" || !answer.trim()) return { ok: false, message: "We could not save your answer. Please try again." };
    return { ok: true, mode: "MANUAL_RESPONSE", correct: null, marksAwarded: null, answer: answer.trim() };
  }
  if (mode !== "AUTO_GRADED") return { ok: false, message: "We could not save your answer. Please try again." };
  if (question.questionType === "MULTIPLE_SELECT") {
    const selectedIds = Array.isArray(answer) ? [...new Set(answer.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean))] : [];
    const optionIds = new Set(getPracticeOptions(question.options).map((option) => option.id));
    if (!selectedIds.length || selectedIds.some((id) => !optionIds.has(id))) return { ok: false, message: "We could not save your answer. Please try again." };
    const correct = isExactMultipleSelectResponse(multipleSelectCorrectOptionIds(question.correctAnswer), selectedIds);
    return { ok: true, mode: "AUTO_GRADED", correct, marksAwarded: correct ? question.marks : 0, answer: selectedIds };
  }
  let normalized: string;
  if (question.questionType === "TRUE_FALSE" && typeof answer === "boolean") normalized = String(answer);
  else if (typeof answer === "string") normalized = normalizePracticeAnswer(answer);
  else return { ok: false, message: "We could not save your answer. Please try again." };
  if (!normalized) return { ok: false, message: "We could not save your answer. Please try again." };
  if (question.questionType === "MCQ" && !getPracticeOptions(question.options).some((option) => matchesPracticeOption(normalized, option))) {
    return { ok: false, message: "We could not save your answer. Please try again." };
  }
  if (question.questionType === "TRUE_FALSE" && !["true", "false"].includes(normalized)) {
    return { ok: false, message: "We could not save your answer. Please try again." };
  }
  const selectedOption = question.questionType === "MCQ"
    ? getPracticeOptions(question.options).find((option) => matchesPracticeOption(normalized, option))
    : undefined;
  const correct = question.questionType === "MCQ"
    ? Boolean(selectedOption && matchesPracticeOption(question.correctAnswer!, selectedOption))
    : normalized === normalizePracticeAnswer(question.correctAnswer!);
  return { ok: true, mode: "AUTO_GRADED", correct, marksAwarded: correct ? question.marks : 0, answer: typeof answer === "boolean" ? answer : answer.trim() };
}
export function calculatePracticeResult(responses: readonly { correct: boolean | null; marksAwarded: number | null; answeredAt?: Date | null; answer?: unknown; question: { marks: number } }[]) {
  const attemptedCount = responses.filter((item) => item.answeredAt !== undefined ? item.answeredAt !== null : item.correct !== null || item.answer !== null && item.answer !== undefined).length;
  const correctCount = responses.filter((item) => item.correct === true).length;
  const totalMarks = responses.reduce((sum, item) => sum + item.question.marks, 0);
  const marksAwarded = responses.reduce((sum, item) => sum + (item.marksAwarded ?? 0), 0);
  const automaticallyGradedMarks = responses.filter((item) => item.correct !== null).reduce((sum, item) => sum + item.question.marks, 0);
  return {
    attemptedCount,
    correctCount,
    totalMarks,
    marksAwarded,
    scorePercent: automaticallyGradedMarks ? Math.round((marksAwarded / automaticallyGradedMarks) * 10000) / 100 : null,
  };
}
