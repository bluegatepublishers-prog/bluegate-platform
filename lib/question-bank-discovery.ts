import "server-only";

import { Prisma, TeacherQuestionStatus } from "@prisma/client";

import { BOOK_QUESTIONS_EXERCISE_CODE } from "@/lib/book-questions";
import { normalizeQuestionType } from "@/lib/normalized-question";
import { TEACHER_QUESTION_ASSESSMENT_TYPES } from "@/lib/teacher-assessment-question-bridge";
import { prisma } from "@/lib/prisma";

export type QuestionBankSource = "ALL" | "BOOK" | "PUBLISHER" | "MY";

export type QuestionBankFilters = {
  chapterId?: string;
  moduleId?: string;
  exerciseId?: string;
  questionType?: string;
  difficulty?: string;
};

export type QuestionBankContext = {
  publisherId: string;
  schoolId: string;
  teacherId: string;
  sectionSubjectId?: string | null;
  bookId: string;
  chapterId?: string | null;
};

export type QuestionBankRow = {
  id: string;
  source: "BOOK" | "PUBLISHER" | "MY";
  bookId: string | null;
  chapterId: string | null;
  moduleId: string | null;
  exerciseId: string | null;
  questionType: string;
  questionText: string;
  options: Prisma.JsonValue | null;
  correctAnswer: string | null;
  explanation: string | null;
  marks: number;
  difficulty: string | null;
  bloomLevel: string | null;
  competency: string | null;
  sourceQuestionId: string;
  exercise: { code: string | null; title: string } | null;
};

export function normalizeQuestionBankSource(value: unknown): QuestionBankSource {
  const normalized = String(value ?? "ALL").trim().toUpperCase();
  return normalized === "BOOK" || normalized === "PUBLISHER" || normalized === "MY" ? normalized : "ALL";
}

export function normalizeQuestionBankFilters(input: QuestionBankFilters = {}) {
  const type = input.questionType?.trim() ? normalizeQuestionType(input.questionType) : "";
  return {
    chapterId: input.chapterId?.trim() ?? "",
    moduleId: input.moduleId?.trim() ?? "",
    exerciseId: input.exerciseId?.trim() ?? "",
    questionType: type === "UNSUPPORTED" ? "" : type,
    difficulty: input.difficulty?.trim().toUpperCase() ?? "",
  };
}

function searchWhere(search: string) {
  return search
    ? {
        OR: [
          { questionText: { contains: search, mode: "insensitive" as const } },
          { competency: { contains: search, mode: "insensitive" as const } },
          { bloomLevel: { contains: search, mode: "insensitive" as const } },
          { tags: { has: search } },
        ],
      }
    : {};
}

export async function discoverQuestionBank(input: {
  context: QuestionBankContext;
  source?: QuestionBankSource;
  filters?: QuestionBankFilters;
  search?: string;
}) {
  const source = normalizeQuestionBankSource(input.source);
  const filters = normalizeQuestionBankFilters({
    ...input.filters,
    chapterId: input.context.chapterId ?? input.filters?.chapterId,
  });
  const search = (input.search ?? "").trim();
  const chapterId = filters.chapterId || undefined;

  const bookWhere: Prisma.BookQuestionWhereInput = {
    approved: true,
    archived: false,
    bookId: input.context.bookId,
    book: { publisherId: input.context.publisherId, published: true, archived: false },
    chapter: { approved: true, published: true, archived: false },
    ...(chapterId ? { chapterId } : {}),
    ...(filters.moduleId ? { moduleId: filters.moduleId } : {}),
    ...(filters.exerciseId ? { exerciseId: filters.exerciseId } : {}),
    ...searchWhere(search),
  };

  const teacherWhere: Prisma.TeacherQuestionWhereInput = {
    publisherId: input.context.publisherId,
    schoolId: input.context.schoolId,
    teacherId: input.context.teacherId,
    status: TeacherQuestionStatus.ACTIVE,
    questionType: { in: TEACHER_QUESTION_ASSESSMENT_TYPES },
    AND: [
      { OR: [{ sectionSubjectId: input.context.sectionSubjectId ?? "__none__" }, { sectionSubjectId: null }] },
      { OR: [{ bookId: input.context.bookId }, { bookId: null }] },
      ...(chapterId ? [{ OR: [{ chapterId }, { chapterId: null }] }] : []),
      ...(filters.moduleId ? [{ OR: [{ moduleId: filters.moduleId }, { moduleId: null }] }] : []),
      ...(search ? [searchWhere(search)] : []),
    ],
  };

  const [modules, exercises, bookRows, myRows] = await Promise.all([
    chapterId
      ? prisma.bookModule.findMany({
          where: { bookId: input.context.bookId, chapterId, published: true, archived: false },
          select: { id: true, title: true, displayOrder: true },
          orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        })
      : Promise.resolve([]),
    chapterId
      ? prisma.bookExercise.findMany({
          where: { bookId: input.context.bookId, chapterId, published: true, archived: false },
          select: { id: true, title: true, code: true, moduleId: true, displayOrder: true },
          orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        })
      : Promise.resolve([]),
    source === "MY"
      ? Promise.resolve([])
      : prisma.bookQuestion.findMany({
          where: bookWhere,
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
          take: 240,
          select: {
            id: true,
            bookId: true,
            chapterId: true,
            moduleId: true,
            exerciseId: true,
            questionType: true,
            questionText: true,
            options: true,
            correctAnswer: true,
            explanation: true,
            marks: true,
            difficulty: true,
            bloomLevel: true,
            competency: true,
            exercise: { select: { code: true, title: true } },
          },
        }),
    source === "BOOK" || source === "PUBLISHER"
      ? Promise.resolve([])
      : prisma.teacherQuestion.findMany({
          where: teacherWhere,
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
          take: 120,
          select: {
            id: true,
            bookId: true,
            chapterId: true,
            moduleId: true,
            questionType: true,
            questionText: true,
            options: true,
            correctAnswer: true,
            explanation: true,
            marks: true,
            difficulty: true,
            bloomLevel: true,
            competency: true,
          },
        }),
  ]);

  const passes = (type: string, difficulty: string | null | undefined) =>
    (!filters.questionType || normalizeQuestionType(type) === filters.questionType) &&
    (!filters.difficulty || (difficulty ?? "").trim().toUpperCase() === filters.difficulty);

  const mapBook = (row: (typeof bookRows)[number], rowSource: "BOOK" | "PUBLISHER"): QuestionBankRow | null => {
    if (!passes(row.questionType, row.difficulty)) return null;
    return {
      ...row,
      source: rowSource,
      sourceQuestionId: row.id,
      questionType: normalizeQuestionType(row.questionType),
      exercise: row.exercise,
    };
  };

  const bookQuestions = bookRows
    .filter((row) => row.exercise?.code === BOOK_QUESTIONS_EXERCISE_CODE)
    .map((row) => mapBook(row, "BOOK"))
    .filter((row): row is QuestionBankRow => Boolean(row));
  const publisherQuestions = bookRows
    .filter((row) => row.exercise?.code !== BOOK_QUESTIONS_EXERCISE_CODE)
    .map((row) => mapBook(row, "PUBLISHER"))
    .filter((row): row is QuestionBankRow => Boolean(row));
  const myQuestions = myRows
    .filter((row) => passes(row.questionType, row.difficulty))
    .map((row) => ({
      ...row,
      source: "MY" as const,
      sourceQuestionId: row.id,
      questionType: normalizeQuestionType(row.questionType),
      exerciseId: null,
      exercise: null,
    }))
    .filter((row) => row.questionType !== "UNSUPPORTED");

  return {
    source,
    filters,
    search,
    chapterId,
    modules,
    exercises,
    bookQuestions,
    publisherQuestions,
    myQuestions,
    publisherQuestionFilterNote: "Publisher Questions are the approved BookQuestion master bank; publisher extras have no separate Prisma model.",
    myQuestionFilterNote: source === "MY" || source === "ALL"
      ? "Module/Exercise filtering is not available for some My Questions. My Questions have no exerciseId metadata."
      : "",
  };
}