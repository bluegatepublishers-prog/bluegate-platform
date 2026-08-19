import {
  isValidAssessmentQuestion,
  type AssessmentQuestionSnapshot,
} from "@/lib/assessment-policy";
import { normalizeQuestionType as normalizeTeacherQuestionType } from "@/lib/normalized-question";

const TEACHER_QUESTION_ASSESSMENT_TYPE_MAP = {
  MCQ: "MCQ",
  TRUE_FALSE: "TRUE_FALSE",
  FILL_BLANK: "FILL_BLANK",
  MATCH: "MATCH",
  MULTIPLE_SELECT: "MULTIPLE_SELECT",
  SHORT_ANSWER: "SHORT_ANSWER",
  LONG_ANSWER: "LONG_ANSWER",
  CASE_BASED: "CASE_BASED",
  COMPETENCY: "COMPETENCY",
  HOTS: "HOTS",
} as const;

export type TeacherQuestionAssessmentType = keyof typeof TEACHER_QUESTION_ASSESSMENT_TYPE_MAP;

export const TEACHER_QUESTION_ASSESSMENT_TYPES = Object.keys(
  TEACHER_QUESTION_ASSESSMENT_TYPE_MAP,
) as TeacherQuestionAssessmentType[];

export function mapTeacherQuestionAssessmentType(questionType: string) {
  const normalized = normalizeTeacherQuestionType(questionType);
  return TEACHER_QUESTION_ASSESSMENT_TYPE_MAP[
    normalized as TeacherQuestionAssessmentType
  ] ?? null;
}

export type TeacherQuestionAssessmentSource = {
  id: string;
  publisherId: string;
  schoolId: string;
  teacherId: string;
  sectionSubjectId: string | null;
  bookId: string | null;
  chapterId: string | null;
  moduleId: string | null;
  questionType: string;
  questionText: string;
  options: unknown;
  correctAnswer: string | null;
  explanation: string | null;
  marks: number;
  competency: string | null;
  difficulty?: string | null;
  tags?: string[];
};

function parseQuestionJson(value: unknown) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function optionEntries(value: unknown) {
  const parsed = parseQuestionJson(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((entry) => {
    if (typeof entry === "string") return [{ id: entry, text: entry }];
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const record = entry as Record<string, unknown>;
      if (typeof record.text === "string" && record.text.trim()) {
        return [{ id: typeof record.id === "string" ? record.id : record.text, text: record.text }];
      }
    }
    return [];
  });
}

function mapTeacherQuestionContent(source: TeacherQuestionAssessmentSource) {
  const questionType = mapTeacherQuestionAssessmentType(source.questionType);
  if (!questionType) return null;

  let options: unknown = source.options;
  let correctAnswer = source.correctAnswer;
  const entries = optionEntries(source.options);
  const answerText = new Map(entries.map((entry) => [entry.id, entry.text]));

  if (questionType === "MCQ") {
    options = entries.map((entry) => entry.text);
    correctAnswer = answerText.get(correctAnswer ?? "") ?? correctAnswer;
  } else if (questionType === "MULTIPLE_SELECT") {
    options = entries.map((entry) => entry.text);
    const selected = parseQuestionJson(correctAnswer);
    const selectedIds = Array.isArray(selected) ? selected : [];
    correctAnswer = JSON.stringify(selectedIds.map((answer) => answerText.get(String(answer)) ?? String(answer)));
  } else if (questionType === "TRUE_FALSE") {
    options = null;
    correctAnswer = correctAnswer?.trim().toLocaleLowerCase("en") ?? null;
  } else if (questionType === "MATCH") {
    const parsedOptions = parseQuestionJson(source.options);
    const pairs = Array.isArray(parsedOptions)
      ? parsedOptions.flatMap((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
          const record = entry as Record<string, unknown>;
          return typeof record.left === "string" && typeof record.right === "string"
            ? [{ left: record.left, right: record.right }]
            : [];
        })
      : [];
    options = { left: pairs.map((pair) => pair.left), right: pairs.map((pair) => pair.right) };
    const rawAnswer = parseQuestionJson(correctAnswer);
    const answerRecord: Record<string, string> = {};
    if (Array.isArray(rawAnswer)) {
      for (const item of rawAnswer) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          for (const [left, right] of Object.entries(item as Record<string, unknown>)) {
            if (typeof right === "string") answerRecord[left] = right;
          }
        }
      }
    } else if (rawAnswer && typeof rawAnswer === "object" && !Array.isArray(rawAnswer)) {
      for (const [left, right] of Object.entries(rawAnswer as Record<string, unknown>)) {
        if (typeof right === "string") answerRecord[left] = right;
      }
    }
    correctAnswer = JSON.stringify(answerRecord);
  }

  const snapshot: AssessmentQuestionSnapshot = {
    id: source.id,
    questionType,
    questionText: source.questionText,
    options,
    correctAnswer,
    marks: source.marks,
  };
  return isValidAssessmentQuestion(snapshot)
    ? { ...snapshot, explanation: source.explanation, competency: source.competency }
    : null;
}

export function mapTeacherQuestionToAssessmentSnapshot(source: TeacherQuestionAssessmentSource) {
  return mapTeacherQuestionContent(source);
}

export function isTeacherQuestionAssessmentContextCompatible(input: {
  question: Pick<TeacherQuestionAssessmentSource, "sectionSubjectId" | "bookId" | "chapterId">;
  assessment: Pick<TeacherQuestionAssessmentSource, "sectionSubjectId" | "bookId" | "chapterId">;
}) {
  const { question, assessment } = input;
  if (question.sectionSubjectId && question.sectionSubjectId !== assessment.sectionSubjectId) return false;
  if (question.bookId && question.bookId !== assessment.bookId) return false;
  if (question.chapterId && assessment.chapterId && question.chapterId !== assessment.chapterId) return false;
  return true;
}