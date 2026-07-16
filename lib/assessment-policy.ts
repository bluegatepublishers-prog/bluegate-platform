export const ASSESSMENT_TYPES = ["CHAPTER", "UNIT", "TERM", "CUSTOM"] as const;
export type SupportedAssessmentType = (typeof ASSESSMENT_TYPES)[number];

export const AUTO_GRADED_ASSESSMENT_TYPES = [
  "MCQ",
  "TRUE_FALSE",
  "FILL_BLANK",
  "MATCH",
  "MULTIPLE_SELECT",
] as const;

export const SUBJECTIVE_ASSESSMENT_TYPES = [
  "SHORT_ANSWER",
  "LONG_ANSWER",
  "CASE_BASED",
  "COMPETENCY",
  "HOTS",
] as const;

export type AssessmentQuestionKind =
  | (typeof AUTO_GRADED_ASSESSMENT_TYPES)[number]
  | (typeof SUBJECTIVE_ASSESSMENT_TYPES)[number];

export interface AssessmentQuestionSnapshot {
  id: string;
  questionType: string;
  questionText: string;
  options: unknown;
  correctAnswer: string | null;
  marks: number;
}

export type SafeAssessmentOptions =
  | string[]
  | { left: string[]; right: string[] };

export function normalizeAssessmentQuestionType(value: string): AssessmentQuestionKind | null {
  const normalized = value.trim().toUpperCase().replace(/[\s/-]+/g, "_");
  if (normalized === "VERY_SHORT" || normalized === "SHORT") return "SHORT_ANSWER";
  if (normalized === "LONG") return "LONG_ANSWER";
  if (normalized === "CASE_STUDY") return "CASE_BASED";
  return [...AUTO_GRADED_ASSESSMENT_TYPES, ...SUBJECTIVE_ASSESSMENT_TYPES].includes(
    normalized as AssessmentQuestionKind,
  )
    ? (normalized as AssessmentQuestionKind)
    : null;
}

export function normalizeAssessmentText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

export function getAssessmentStringOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
}

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getMatchOptions(value: unknown): { left: string[]; right: string[] } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const left = getAssessmentStringOptions(record.left);
  const right = getAssessmentStringOptions(record.right);
  return left.length > 0 && left.length === right.length ? { left, right } : null;
}

function getMatchAnswer(value: string | null): Record<string, string> | null {
  const parsed = parseJson(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const entries = Object.entries(parsed);
  if (!entries.length || entries.some(([, answer]) => typeof answer !== "string" || !answer.trim())) return null;
  return Object.fromEntries(entries.map(([left, right]) => [left.trim(), (right as string).trim()]));
}

function getMultipleAnswer(value: string | null) {
  return getAssessmentStringOptions(parseJson(value));
}

export function isValidAssessmentQuestion(question: AssessmentQuestionSnapshot) {
  const kind = normalizeAssessmentQuestionType(question.questionType);
  if (!kind || !question.questionText.trim() || !Number.isInteger(question.marks) || question.marks < 1) return false;
  if (SUBJECTIVE_ASSESSMENT_TYPES.includes(kind as (typeof SUBJECTIVE_ASSESSMENT_TYPES)[number])) return true;
  if (!question.correctAnswer?.trim()) return false;
  if (kind === "MCQ") {
    const options = getAssessmentStringOptions(question.options);
    return options.length >= 2 && options.some((option) => normalizeAssessmentText(option) === normalizeAssessmentText(question.correctAnswer!));
  }
  if (kind === "TRUE_FALSE") return ["true", "false"].includes(normalizeAssessmentText(question.correctAnswer));
  if (kind === "FILL_BLANK") return true;
  if (kind === "MULTIPLE_SELECT") {
    const options = getAssessmentStringOptions(question.options);
    const answers = getMultipleAnswer(question.correctAnswer);
    return options.length >= 2 && answers.length > 0 && answers.every((answer) => options.some((option) => normalizeAssessmentText(option) === normalizeAssessmentText(answer)));
  }
  const options = getMatchOptions(question.options);
  const answers = getMatchAnswer(question.correctAnswer);
  return Boolean(options && answers && options.left.every((left) => left in answers) && Object.keys(answers).length === options.left.length && Object.values(answers).every((right) => options.right.includes(right)));
}

export function toSafeAssessmentQuestion(question: AssessmentQuestionSnapshot, questionNumber: number) {
  const kind = normalizeAssessmentQuestionType(question.questionType);
  if (!kind || !isValidAssessmentQuestion(question)) return null;
  let options: SafeAssessmentOptions = [];
  if (kind === "MCQ" || kind === "MULTIPLE_SELECT") options = getAssessmentStringOptions(question.options);
  if (kind === "TRUE_FALSE") options = ["True", "False"];
  if (kind === "MATCH") options = getMatchOptions(question.options)!;
  return {
    assessmentQuestionId: question.id,
    questionNumber,
    questionType: kind,
    questionText: question.questionText,
    options,
    marks: question.marks,
    subjective: SUBJECTIVE_ASSESSMENT_TYPES.includes(kind as (typeof SUBJECTIVE_ASSESSMENT_TYPES)[number]),
  };
}

export type AssessmentGrade =
  | { ok: true; autoGraded: true; correct: boolean; marksAwarded: number; answer: unknown; reviewStatus: "NOT_REQUIRED" }
  | { ok: true; autoGraded: false; correct: null; marksAwarded: null; answer: string; reviewStatus: "PENDING" }
  | { ok: false };

export function isEmptyAssessmentAnswer(answer: unknown) {
  if (answer === null || answer === undefined) return true;
  if (typeof answer === "string") return !answer.trim();
  if (Array.isArray(answer)) return answer.length === 0;
  if (typeof answer === "object") return Object.keys(answer).length === 0;
  return false;
}

export function gradeAssessmentAnswer(question: AssessmentQuestionSnapshot, answer: unknown): AssessmentGrade {
  const kind = normalizeAssessmentQuestionType(question.questionType);
  if (!kind || !isValidAssessmentQuestion(question) || isEmptyAssessmentAnswer(answer)) return { ok: false };
  if (SUBJECTIVE_ASSESSMENT_TYPES.includes(kind as (typeof SUBJECTIVE_ASSESSMENT_TYPES)[number])) {
    if (typeof answer !== "string" || answer.trim().length > 5000) return { ok: false };
    return { ok: true, autoGraded: false, correct: null, marksAwarded: null, answer: answer.trim(), reviewStatus: "PENDING" };
  }
  if (kind === "MULTIPLE_SELECT") {
    const selected = getAssessmentStringOptions(answer);
    const options = getAssessmentStringOptions(question.options);
    if (!selected.length || selected.some((item) => !options.includes(item))) return { ok: false };
    const expected = getMultipleAnswer(question.correctAnswer).map(normalizeAssessmentText).sort();
    const actual = selected.map(normalizeAssessmentText).sort();
    const correct = expected.length === actual.length && expected.every((value, index) => value === actual[index]);
    return { ok: true, autoGraded: true, correct, marksAwarded: correct ? question.marks : 0, answer: selected, reviewStatus: "NOT_REQUIRED" };
  }
  if (kind === "MATCH") {
    const options = getMatchOptions(question.options)!;
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) return { ok: false };
    const actual = answer as Record<string, unknown>;
    if (Object.keys(actual).length !== options.left.length || options.left.some((left) => typeof actual[left] !== "string" || !options.right.includes((actual[left] as string).trim()))) return { ok: false };
    const expected = getMatchAnswer(question.correctAnswer)!;
    const correct = options.left.every((left) => normalizeAssessmentText(actual[left] as string) === normalizeAssessmentText(expected[left]));
    return { ok: true, autoGraded: true, correct, marksAwarded: correct ? question.marks : 0, answer: Object.fromEntries(options.left.map((left) => [left, (actual[left] as string).trim()])), reviewStatus: "NOT_REQUIRED" };
  }
  let normalized: string;
  if (kind === "TRUE_FALSE" && typeof answer === "boolean") normalized = String(answer);
  else if (typeof answer === "string" && answer.trim().length <= 2000) normalized = normalizeAssessmentText(answer);
  else return { ok: false };
  if (kind === "MCQ" && !getAssessmentStringOptions(question.options).some((option) => normalizeAssessmentText(option) === normalized)) return { ok: false };
  if (kind === "TRUE_FALSE" && !["true", "false"].includes(normalized)) return { ok: false };
  const correct = normalized === normalizeAssessmentText(question.correctAnswer!);
  return { ok: true, autoGraded: true, correct, marksAwarded: correct ? question.marks : 0, answer: typeof answer === "boolean" ? answer : answer.trim(), reviewStatus: "NOT_REQUIRED" };
}

export function validateAssessmentDuration(value: number | null) {
  return value === null || (Number.isInteger(value) && value >= 1 && value <= 300);
}

export function calculateAssessmentExpiry(startedAt: Date, durationMinutes: number | null, dueAt: Date | null) {
  const timerExpiry = durationMinutes === null ? null : new Date(startedAt.getTime() + durationMinutes * 60_000);
  if (!timerExpiry) return dueAt;
  if (!dueAt) return timerExpiry;
  return timerExpiry < dueAt ? timerExpiry : dueAt;
}

export function isAssessmentExpired(expiresAt: Date | null, now = new Date()) {
  return Boolean(expiresAt && now.getTime() >= expiresAt.getTime());
}

export function canReleaseAssessmentResult(input: { release: "IMMEDIATE" | "AFTER_DUE_DATE" | "NEVER"; dueAt: Date | null; now?: Date }) {
  if (input.release === "NEVER") return false;
  if (input.release === "IMMEDIATE") return true;
  return Boolean(input.dueAt && (input.now ?? new Date()).getTime() >= input.dueAt.getTime());
}

export function calculateAssessmentSummary(
  responses: readonly { answer: unknown; correct: boolean | null; marksAwarded: number | null; reviewStatus: "NOT_REQUIRED" | "PENDING" | "REVIEWED"; question: { marks: number } }[],
  startedAt: Date,
  submittedAt: Date,
) {
  const answered = responses.filter((response) => !isEmptyAssessmentAnswer(response.answer));
  const subjectivePending = answered.filter((response) => response.reviewStatus === "PENDING").length;
  const totalMarks = responses.reduce((sum, response) => sum + response.question.marks, 0);
  const awardedMarks = responses.reduce((sum, response) => sum + (response.marksAwarded ?? 0), 0);
  return {
    totalMarks,
    awardedMarks,
    percentage: subjectivePending ? null : totalMarks ? Math.round((awardedMarks / totalMarks) * 10000) / 100 : 0,
    correctCount: answered.filter((response) => response.correct === true).length,
    wrongCount: answered.filter((response) => response.correct === false).length,
    skippedCount: responses.length - answered.length,
    subjectivePending,
    timeTakenSeconds: Math.max(0, Math.floor((submittedAt.getTime() - startedAt.getTime()) / 1000)),
    provisional: subjectivePending > 0,
  };
}
