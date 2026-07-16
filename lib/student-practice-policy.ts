export const SUPPORTED_PRACTICE_TYPES = ["MCQ", "TRUE_FALSE", "FILL_BLANK"] as const;
export type SupportedPracticeType = typeof SUPPORTED_PRACTICE_TYPES[number];

export interface PracticeQuestionCandidate {
  id: string;
  bookId: string;
  chapterId: string;
  questionType: string;
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

export function getStringOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
}

export function isSupportedPracticeQuestion(question: PracticeQuestionCandidate) {
  if (!question.approved || !question.questionText.trim() || !question.correctAnswer?.trim() || question.marks < 1) return false;
  if (!SUPPORTED_PRACTICE_TYPES.includes(question.questionType as SupportedPracticeType)) return false;
  if (question.questionType === "MCQ") {
    const options = getStringOptions(question.options);
    return options.length >= 2 && options.some((option) => normalizePracticeAnswer(option) === normalizePracticeAnswer(question.correctAnswer!));
  }
  if (question.questionType === "TRUE_FALSE") {
    return ["true", "false"].includes(normalizePracticeAnswer(question.correctAnswer));
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
    questionType: question.questionType as SupportedPracticeType,
    options: question.questionType === "MCQ" ? getStringOptions(question.options) : question.questionType === "TRUE_FALSE" ? ["True", "False"] : [],
    marks: question.marks,
  };
}

export type PracticeGrade =
  | { ok: true; correct: boolean; marksAwarded: number; answer: string | boolean }
  | { ok: false; message: "We could not save your answer. Please try again." };

export function gradePracticeAnswer(question: PracticeQuestionCandidate, answer: unknown): PracticeGrade {
  if (!isSupportedPracticeQuestion(question)) return { ok: false, message: "We could not save your answer. Please try again." };
  let normalized: string;
  if (question.questionType === "TRUE_FALSE" && typeof answer === "boolean") normalized = String(answer);
  else if (typeof answer === "string") normalized = normalizePracticeAnswer(answer);
  else return { ok: false, message: "We could not save your answer. Please try again." };
  if (!normalized) return { ok: false, message: "We could not save your answer. Please try again." };
  if (question.questionType === "MCQ" && !getStringOptions(question.options).some((option) => normalizePracticeAnswer(option) === normalized)) {
    return { ok: false, message: "We could not save your answer. Please try again." };
  }
  if (question.questionType === "TRUE_FALSE" && !["true", "false"].includes(normalized)) {
    return { ok: false, message: "We could not save your answer. Please try again." };
  }
  const correct = normalized === normalizePracticeAnswer(question.correctAnswer!);
  return { ok: true, correct, marksAwarded: correct ? question.marks : 0, answer: typeof answer === "boolean" ? answer : answer.trim() };
}

export function calculatePracticeResult(responses: readonly { correct: boolean | null; marksAwarded: number | null; question: { marks: number } }[]) {
  const attemptedCount = responses.filter((item) => item.correct !== null).length;
  const correctCount = responses.filter((item) => item.correct === true).length;
  const totalMarks = responses.reduce((sum, item) => sum + item.question.marks, 0);
  const marksAwarded = responses.reduce((sum, item) => sum + (item.marksAwarded ?? 0), 0);
  return {
    attemptedCount,
    correctCount,
    totalMarks,
    marksAwarded,
    scorePercent: totalMarks ? Math.round((marksAwarded / totalMarks) * 10000) / 100 : 0,
  };
}
