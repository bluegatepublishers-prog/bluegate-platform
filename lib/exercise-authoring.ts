import "server-only";

import { Prisma, ResourceType } from "@prisma/client";

import {
  EXERCISE_QUESTION_TYPES,
  type ExerciseQuestionType,
} from "@/lib/exercise-authoring-types";
import { prisma } from "@/lib/prisma";

export const exerciseStudioSelect = {
  id: true,
  title: true,
  instructions: true,
  type: true,
  marks: true,
  estimatedMinutes: true,
  difficulty: true,
  published: true,
  archived: true,
  displayOrder: true,
  moduleId: true,
  topicId: true,
  questionGroups: {
    where: { active: true },
    select: {
      id: true,
      title: true,
      instructions: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  },
  questions: {
    where: { archived: false },
    select: {
      id: true,
      exerciseGroupId: true,
      moduleId: true,
      topicId: true,
      learningOutcomeId: true,
      imageResourceId: true,
      questionType: true,
      questionText: true,
      options: true,
      correctAnswer: true,
      explanation: true,
      marks: true,
      difficulty: true,
      bloomLevel: true,
      competency: true,
      tags: true,
      displayOrder: true,
      archived: true,
      approved: true,
      imageResource: { select: { id: true, title: true, fileUrl: true, thumbnail: true, type: true } },
      learningOutcome: { select: { id: true, outcome: true } },
    },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.BookExerciseSelect;

export async function assertExerciseScope(input: {
  publisherId: string;
  bookId: string;
  chapterId: string;
  exerciseId?: string | null;
}) {
  const chapter = await prisma.bookChapter.findFirst({
    where: {
      id: input.chapterId,
      bookId: input.bookId,
      book: { publisherId: input.publisherId },
    },
    select: { id: true },
  });
  if (!chapter) throw new Error("Chapter not found.");
  if (!input.exerciseId) return;
  const exercise = await prisma.bookExercise.findFirst({
    where: { id: input.exerciseId, bookId: input.bookId, chapterId: input.chapterId },
    select: { id: true },
  });
  if (!exercise) throw new Error("Exercise not found.");
}

export async function loadExerciseStudio(bookId: string, chapterId: string) {
  return prisma.bookExercise.findMany({
    where: { bookId, chapterId, archived: false },
    select: exerciseStudioSelect,
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function loadExerciseStudioLookups(input: {
  publisherId: string;
  bookId: string;
  chapterId: string;
}) {
  const [modules, topics, outcomes, resources] = await Promise.all([
    prisma.bookModule.findMany({
      where: { bookId: input.bookId, chapterId: input.chapterId, archived: false },
      select: { id: true, title: true },
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
    }),
    prisma.bookTopic.findMany({
      where: { bookId: input.bookId, chapterId: input.chapterId, archived: false },
      select: { id: true, title: true, moduleId: true },
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
    }),
    prisma.chapterLearningOutcome.findMany({
      where: { chapterId: input.chapterId },
      select: { id: true, outcome: true, moduleId: true, topicId: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
    prisma.resource.findMany({
      where: {
        publisherId: input.publisherId,
        archived: false,
        OR: [{ bookId: input.bookId }, { bookId: null }],
        type: { in: [ResourceType.PDF, ResourceType.VIDEO, ResourceType.WORKSHEET, ResourceType.INTERACTIVE, ResourceType.LINK] },
      },
      select: { id: true, title: true, type: true, fileUrl: true, thumbnail: true },
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
      take: 100,
    }),
  ]);
  return { modules, topics, outcomes, resources };
}

export function normalizeQuestionOptions(type: ExerciseQuestionType, raw: string) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (type === "MCQ") {
    return lines.map((label, index) => ({ id: String.fromCharCode(65 + index), label }));
  }
  if (type === "MATCH") {
    return lines.map((line) => {
      const [left, right] = line.split("=>").map((part) => part.trim());
      return { left: left ?? "", right: right ?? "" };
    }).filter((item) => item.left && item.right);
  }
  if (type === "FILL_BLANK") {
    return lines;
  }
  return Prisma.JsonNull;
}

export function assertQuestionPayload(type: string, optionsText: string, correctAnswer: string) {
  if (!EXERCISE_QUESTION_TYPES.includes(type as ExerciseQuestionType)) {
    throw new Error("Question type is not supported by Exercise Studio.");
  }
  if (type === "MCQ") {
    const count = optionsText.split(/\r?\n/).filter((line) => line.trim()).length;
    if (count < 2) throw new Error("MCQ requires at least two options.");
    if (!correctAnswer.trim()) throw new Error("MCQ requires one correct answer.");
  }
  if (type === "TRUE_FALSE" && !["true", "false"].includes(correctAnswer.trim().toLowerCase())) {
    throw new Error("True/False answer must be true or false.");
  }
}

export async function assertQuestionRelations(input: {
  publisherId: string;
  bookId: string;
  chapterId: string;
  exerciseId: string;
  groupId: string | null;
  moduleId: string | null;
  topicId: string | null;
  learningOutcomeId: string | null;
  imageResourceId: string | null;
}) {
  if (input.groupId) {
    const group = await prisma.bookExerciseQuestionGroup.findFirst({
      where: { id: input.groupId, exerciseId: input.exerciseId, active: true },
      select: { id: true },
    });
    if (!group) throw new Error("Question group not found.");
  }
  if (input.moduleId) {
    const moduleNode = await prisma.bookModule.findFirst({
      where: { id: input.moduleId, bookId: input.bookId, chapterId: input.chapterId },
      select: { id: true },
    });
    if (!moduleNode) throw new Error("Module not found for this exercise.");
  }
  if (input.topicId) {
    const topic = await prisma.bookTopic.findFirst({
      where: { id: input.topicId, bookId: input.bookId, chapterId: input.chapterId },
      select: { id: true },
    });
    if (!topic) throw new Error("Topic not found for this exercise.");
  }
  if (input.learningOutcomeId) {
    const outcome = await prisma.chapterLearningOutcome.findFirst({
      where: { id: input.learningOutcomeId, chapterId: input.chapterId },
      select: { id: true },
    });
    if (!outcome) throw new Error("Learning outcome not found for this exercise.");
  }
  if (input.imageResourceId) {
    const resource = await prisma.resource.findFirst({
      where: {
        id: input.imageResourceId,
        publisherId: input.publisherId,
        archived: false,
        OR: [{ bookId: input.bookId }, { bookId: null }],
      },
      select: { id: true },
    });
    if (!resource) throw new Error("Question image resource not found for this publisher or book.");
  }
}
