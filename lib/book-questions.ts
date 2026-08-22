import {
  CurriculumExerciseType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const BOOK_QUESTIONS_EXERCISE_CODE =
  "BOOK_QUESTIONS_MCQ";

export const BOOK_QUESTIONS_EXERCISE_TITLE =
  "Book Questions";

export const BOOK_QUESTIONS_GROUP_TITLE =
  "MCQ Practice";

export class BookQuestionsError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const questionSelect = {
  id: true,
  bookId: true,
  chapterId: true,
  exerciseId: true,
  exerciseGroupId: true,
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
  tags: true,
  displayOrder: true,
  archived: true,
  approved: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BookQuestionSelect;

async function assertChapterOwnership(
  publisherId: string,
  bookId: string,
  chapterId: string,
) {
  const chapter =
    await prisma.bookChapter.findFirst({
      where: {
        id: chapterId,
        bookId,
        book: {
          publisherId,
        },
        archived: false,
      },
      select: {
        id: true,
        title: true,
        chapterNumber: true,
      },
    });

  if (!chapter) {
    throw new BookQuestionsError(
      "The selected chapter is not available for this book.",
      404,
    );
  }

  return chapter;
}

export async function ensureBookQuestionsGroup(
  input: {
    publisherId: string;
    bookId: string;
    chapterId: string;
    exerciseId?: string | null;
  },
) {
  const chapter =
    await assertChapterOwnership(
      input.publisherId,
      input.bookId,
      input.chapterId,
    );

  return prisma.$transaction(
    async (tx) => {
      let exercise =
        await tx.bookExercise.findFirst({
          where: input.exerciseId
            ? {
                id: input.exerciseId,
                bookId: input.bookId,
                chapterId:
                  input.chapterId,
                archived: false,
                book: {
                  publisherId:
                    input.publisherId,
                },
              }
            : {
                bookId: input.bookId,
                chapterId:
                  input.chapterId,
                code: BOOK_QUESTIONS_EXERCISE_CODE,
                archived: false,
              },
          select: {
            id: true,
            bookId: true,
            chapterId: true,
            title: true,
            type: true,
            published: true,
          },
        });

      /*
       * If this chapter does not yet have
       * the dedicated Book Questions
       * exercise, create it as published
       * Smart Book practice content.
       */
      if (
        !exercise &&
        !input.exerciseId
      ) {
        exercise =
          await tx.bookExercise.create({
            data: {
              bookId:
                input.bookId,
              chapterId:
                input.chapterId,
              code: BOOK_QUESTIONS_EXERCISE_CODE,
              title:
                BOOK_QUESTIONS_EXERCISE_TITLE,
              type: CurriculumExerciseType.PRACTICE,
              published: false,
              displayOrder: 0,
            },
            select: {
              id: true,
              bookId: true,
              chapterId: true,
              title: true,
              type: true,
              published: true,
            },
          });
      }

      if (!exercise) {
        throw new BookQuestionsError(
          "The selected exercise is not available for this chapter.",
          404,
        );
      }

      let group =
        await tx.bookExerciseQuestionGroup.findFirst(
          {
            where: {
              exerciseId:
                exercise.id,
              active: true,
            },
            select: {
              id: true,
              exerciseId: true,
              title: true,
              instructions: true,
              sortOrder: true,
              active: true,
            },
            orderBy: [
              {
                sortOrder: "asc",
              },
              {
                id: "asc",
              },
            ],
          },
        );

      if (!group) {
        group =
          await tx.bookExerciseQuestionGroup.create(
            {
              data: {
                exerciseId:
                  exercise.id,
                title:
                  BOOK_QUESTIONS_GROUP_TITLE,
                instructions:
                  "Choose one answer for each question.",
                sortOrder: 0,
                active: true,
              },
              select: {
                id: true,
                exerciseId: true,
                title: true,
                instructions: true,
                sortOrder: true,
                active: true,
              },
            },
          );
      }

      return {
        chapter,
        exercise,
        group,
      };
    },
  );
}

export async function loadBookQuestionsAuthoring(
  input: {
    publisherId: string;
    bookId: string;
    chapterId: string;
    exerciseId?: string | null;
  },
) {
  const chapter =
    await assertChapterOwnership(
      input.publisherId,
      input.bookId,
      input.chapterId,
    );

  const exercise =
    await prisma.bookExercise.findFirst({
      where: input.exerciseId
        ? {
            id: input.exerciseId,
            bookId: input.bookId,
            chapterId:
              input.chapterId,
            archived: false,
            book: {
              publisherId:
                input.publisherId,
            },
          }
        : {
            bookId: input.bookId,
            chapterId:
              input.chapterId,
            code: BOOK_QUESTIONS_EXERCISE_CODE,
            archived: false,
          },
      select: {
        id: true,
        bookId: true,
        chapterId: true,
        title: true,
        type: true,
        published: true,
      },
    });

  if (
    input.exerciseId &&
    !exercise
  ) {
    throw new BookQuestionsError(
      "The selected exercise is not available for this chapter.",
      404,
    );
  }

  const group = exercise
    ? await prisma.bookExerciseQuestionGroup.findFirst(
        {
          where: {
            exerciseId:
              exercise.id,
            active: true,
          },
          select: {
            id: true,
            exerciseId: true,
            title: true,
            instructions: true,
            sortOrder: true,
            active: true,
          },
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              id: "asc",
            },
          ],
        },
      )
    : null;

  const questions = group
    ? await prisma.bookQuestion.findMany({
        where: {
          bookId:
            input.bookId,
          chapterId:
            input.chapterId,
          exerciseGroupId:
            group.id,
          exerciseId: group.exerciseId,
          archived: false,
        },
        select:
          questionSelect,
        orderBy: [
          {
            displayOrder: "asc",
          },
          {
            createdAt: "asc",
          },
          {
            id: "asc",
          },
        ],
      })
    : [];

  return {
    chapter,
    exercise,
    group,
    questions,
  };
}

export function bookQuestionsErrorResponse(
  error: unknown,
) {
  if (
    error instanceof
    BookQuestionsError
  ) {
    return {
      status: error.status,
      body: {
        ok: false,
        message:
          error.message,
      },
    };
  }

  return {
    status: 500,
    body: {
      ok: false,
      message:
        "Book Questions are unavailable.",
    },
  };
}
