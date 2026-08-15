import { NextResponse } from "next/server";

import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import {
  bookQuestionsErrorResponse,
  loadBookQuestionsAuthoring,
} from "@/lib/book-questions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const access =
    await authorizePublisherAdminApi();

  if (access.response) {
    return access.response;
  }

  try {
    const params = new URL(
      request.url,
    ).searchParams;

    const exerciseId =
      params.get("exerciseId")?.trim() ??
      "";

    const groupId =
      params.get("groupId")?.trim() ??
      "";

    if (!exerciseId || !groupId) {
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

    const exercise =
      await prisma.bookExercise.findFirst({
        where: {
          id: exerciseId,
          archived: false,
          questionGroups: {
            some: {
              id: groupId,
              active: true,
            },
          },
          book: {
            publisherId:
              access.actor.publisherId,
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

    const result =
      await loadBookQuestionsAuthoring({
        publisherId:
          access.actor.publisherId,
        bookId: exercise.bookId,
        chapterId:
          exercise.chapterId,
        exerciseId: exercise.id,
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

    return NextResponse.json({
      ok: true,
      questions: result.questions,
    });
  } catch (error) {
    const response =
      bookQuestionsErrorResponse(
        error,
      );

    return NextResponse.json(
      response.body,
      {
        status: response.status,
      },
    );
  }
}