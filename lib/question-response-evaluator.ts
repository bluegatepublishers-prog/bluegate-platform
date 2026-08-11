import type { NormalizedQuestion } from "@/lib/normalized-question";

export type FillBlankMatching = {
  caseSensitive: boolean;
  trimWhitespace: boolean;
  collapseWhitespace: boolean;
};

export type FillBlankAnswerConfig = {
  acceptedAnswers: string[];
  matching: FillBlankMatching;
};

export const DEFAULT_FILL_BLANK_MATCHING: FillBlankMatching = {
  caseSensitive: false,
  trimWhitespace: true,
  collapseWhitespace: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function textList(value: unknown, label: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`${label} must be an array of non-empty text values.`);
  }
  if (value.length > 20 || value.some((item) => item.length > 240)) {
    throw new Error(`${label} supports at most 20 answers of up to 240 characters.`);
  }
  return [...new Set(value.map((item) => item.trim()))];
}

export function parseFillBlankAnswerConfig(value: unknown): FillBlankAnswerConfig | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return { acceptedAnswers: textList(value, "Accepted answers"), matching: { ...DEFAULT_FILL_BLANK_MATCHING } };
  if (!isRecord(value)) throw new Error("Fill Blank options must be an accepted-answer configuration.");
  if (Object.keys(value).some((key) => key !== "acceptedAnswers" && key !== "matching")) {
    throw new Error("Fill Blank options contain an unsupported setting.");
  }
  const acceptedAnswers = value.acceptedAnswers === undefined ? [] : textList(value.acceptedAnswers, "Accepted answers");
  if (value.matching !== undefined && !isRecord(value.matching)) throw new Error("Fill Blank matching must be an object.");
  const rawMatching = value.matching ?? {};
  if (Object.keys(rawMatching).some((key) => !["caseSensitive", "trimWhitespace", "collapseWhitespace"].includes(key))) {
    throw new Error("Fill Blank matching contains an unsupported setting.");
  }
  const matching = { ...DEFAULT_FILL_BLANK_MATCHING };
  for (const key of Object.keys(matching) as Array<keyof FillBlankMatching>) {
    const candidate = rawMatching[key];
    if (candidate !== undefined && typeof candidate !== "boolean") throw new Error(`Fill Blank matching.${key} must be true or false.`);
    if (typeof candidate === "boolean") matching[key] = candidate;
  }
  return { acceptedAnswers, matching };
}

export function normalizeFillBlankComparison(value: string, matching: FillBlankMatching = DEFAULT_FILL_BLANK_MATCHING) {
  let normalized = value;
  if (matching.trimWhitespace) normalized = normalized.trim();
  if (matching.collapseWhitespace) normalized = normalized.replace(/\s+/gu, " ");
  return matching.caseSensitive ? normalized : normalized.toLocaleLowerCase();
}

export function evaluateFillBlankResponse(input: {
  response: unknown;
  correctAnswer: string | null | undefined;
  options?: unknown;
}) {
  const canonicalAnswer = input.correctAnswer?.trim() ?? "";
  if (typeof input.response !== "string" || !canonicalAnswer) return { correct: false, matchedAnswer: null as string | null };
  let config: FillBlankAnswerConfig | null;
  try {
    config = parseFillBlankAnswerConfig(input.options);
  } catch {
    // Existing questions may predate the constrained Fill Blank options shape.
    // They remain gradable by their canonical answer.
    config = null;
  }
  const matching = config?.matching ?? DEFAULT_FILL_BLANK_MATCHING;
  const answers = [canonicalAnswer, ...(config?.acceptedAnswers ?? [])];
  const response = normalizeFillBlankComparison(input.response, matching);
  const matchedAnswer = answers.find((answer) => normalizeFillBlankComparison(answer, matching) === response) ?? null;
  return { correct: Boolean(matchedAnswer), matchedAnswer };
}

export function fillBlankAcceptedAnswers(correctAnswer: string | null | undefined, options?: unknown) {
  const canonicalAnswer = correctAnswer?.trim() ?? "";
  if (!canonicalAnswer) return [];
  try {
    const config = parseFillBlankAnswerConfig(options);
    return [...new Set([canonicalAnswer, ...(config?.acceptedAnswers ?? [])])];
  } catch {
    return [canonicalAnswer];
  }
}
export function evaluateObjectiveQuestionResponse(question: NormalizedQuestion, response: unknown) {
  if (question.questionType === "FILL_BLANK") {
    return evaluateFillBlankResponse({ response, correctAnswer: question.answer.acceptedAnswers?.[0], options: question.answer.acceptedAnswers?.slice(1) });
  }
  if (question.questionType === "MCQ") return { correct: typeof response === "string" && question.answer.correctOptionIds?.includes(response) === true };
  if (question.questionType === "TRUE_FALSE") return { correct: typeof response === "boolean" && response === question.answer.correctBoolean };
  if (question.questionType === "MULTIPLE_SELECT") {
    const expected = [...(question.answer.correctOptionIds ?? [])].sort();
    const actual = Array.isArray(response) ? response.filter((value): value is string => typeof value === "string").sort() : [];
    return { correct: expected.length === actual.length && expected.every((value, index) => value === actual[index]) };
  }
  return { correct: null as boolean | null };
}
