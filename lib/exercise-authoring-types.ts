import type { CurriculumDifficultyLevel, CurriculumExerciseType, Prisma, ResourceType } from "@prisma/client";

export const EXERCISE_QUESTION_TYPES = [
  "MCQ",
  "TRUE_FALSE",
  "FILL_BLANK",
  "MATCH",
  "VERY_SHORT",
  "SHORT",
  "LONG",
  "ASSERTION_REASON",
  "CASE_STUDY",
  "COMPETENCY",
  "HOTS",
  "DIAGRAM",
  "PRACTICAL",
  "PROJECT",
] as const;

export type ExerciseQuestionType = (typeof EXERCISE_QUESTION_TYPES)[number];

export type ExerciseStudioData = {
  id: string;
  title: string;
  instructions: Prisma.JsonValue | null;
  type: CurriculumExerciseType;
  marks: number | null;
  estimatedMinutes: number | null;
  difficulty: CurriculumDifficultyLevel | null;
  published: boolean;
  archived: boolean;
  displayOrder: number;
  moduleId: string | null;
  topicId: string | null;
  questionGroups: {
    id: string;
    title: string;
    instructions: string | null;
    sortOrder: number;
  }[];
  questions: {
    id: string;
    exerciseGroupId: string | null;
    moduleId: string | null;
    topicId: string | null;
    learningOutcomeId: string | null;
    imageResourceId: string | null;
    questionType: string;
    questionText: string;
    options: Prisma.JsonValue | null;
    correctAnswer: string | null;
    explanation: string | null;
    marks: number;
    difficulty: string;
    bloomLevel: string | null;
    competency: string | null;
    tags: string[];
    displayOrder: number;
    archived: boolean;
    approved: boolean;
    imageResource: { id: string; title: string; fileUrl: string; thumbnail: string | null; type: ResourceType } | null;
    learningOutcome: { id: string; outcome: string } | null;
  }[];
};

export function parseInstructionText(value: Prisma.JsonValue | null) {
  if (value && typeof value === "object" && !Array.isArray(value) && "text" in value) {
    return String(value.text ?? "");
  }
  return "";
}
