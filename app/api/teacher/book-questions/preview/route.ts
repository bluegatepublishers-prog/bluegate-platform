import { NextResponse } from "next/server";

import {
  bookQuestionsErrorResponse,
  loadBookQuestionsAuthoring,
} from "@/lib/book-questions";

import { prisma } from "@/lib/prisma";
import { canLaunchBookQuestionPractice } from '@/lib/normalized-question';
import { normalizeV2PracticeQuestionType } from '@/lib/v2-assessment-launcher';
import { getTeacherBook } from "@/lib/teacher-books";

export async function GET(request: Request) {
  try {
    const params =
      new URL(request.url).searchParams;

    const exerciseId =
      params.get("exerciseId")?.trim() ??
      "";

    const groupId =
      params.get("groupId")?.trim() ??
      "";

    const requestedQuestionType = params.get('questionType')?.trim() ?? '';
    const requestedQuestionIds = [...new Set((params.get('questionIds') ?? '').split(',').map((id) => id.trim()).filter(Boolean))];

    if (
      !exerciseId ||
      !groupId
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Book Questions are unavailable.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * First resolve the exact exercise/group.
     *
     * Do not return any information yet.
     * Teacher book authorization is checked
     * immediately afterwards.
     */
    const exercise =
      await prisma.bookExercise.findFirst({
        where: {
          id: exerciseId,

          archived: false,
          published: true,

          questionGroups: {
            some: {
              id: groupId,
              active: true,
            },
          },

          book: {
            published: true,
            archived: false,
          },
        },

        select: {
          id: true,
          bookId: true,
          chapterId: true,
        },
      });

    if (!exercise) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Book Questions are unavailable.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * This is the important authorization.
     *
     * getTeacherBook() already checks the
     * current Teacher's assigned/entitled
     * Smart Book access.
     */
    const teacherBook =
      await getTeacherBook(
        exercise.bookId,
      );

    if (!teacherBook) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Book Questions are unavailable.",
        },
        {
          status: 404,
        },
      );
    }

    const result =
      await loadBookQuestionsAuthoring({
        publisherId:
          teacherBook.publisherId,

        bookId:
          exercise.bookId,

        chapterId:
          exercise.chapterId,

        exerciseId:
          exercise.id,
      });

    if (
      !result.group ||
      result.group.id !== groupId
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Book Questions are unavailable.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Teacher Smart Book preview should expose
     * only active approved questions.
     */
    if (requestedQuestionType && !canLaunchBookQuestionPractice(requestedQuestionType)) {
      return NextResponse.json({ ok: false, message: 'Book Questions are unavailable.' }, { status: 404 });
    }

    const normalizedQuestionType = requestedQuestionType
      ? normalizeV2PracticeQuestionType(requestedQuestionType)
      : null;

    const questions =
      result.questions.filter(
        (question) =>
          question.approved &&
          !question.archived &&
          (!normalizedQuestionType || normalizeV2PracticeQuestionType(question.questionType) === normalizedQuestionType) &&
          (!requestedQuestionIds.length || requestedQuestionIds.includes(question.id)),
      );

    return NextResponse.json({
      ok: true,
      questions,
    });
  } catch (error) {
    const response =
      bookQuestionsErrorResponse(
        error,
      );

    return NextResponse.json(
      response.body,
      {
        status:
          response.status,
      },
    );
  }
}