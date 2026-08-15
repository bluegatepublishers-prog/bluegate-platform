import { NextResponse } from "next/server";

import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { loadPublisherQuestionBankOptions } from "@/lib/publisher-question-bank";
import {
  bookQuestionsErrorResponse,
  ensureBookQuestionsGroup,
  loadBookQuestionsAuthoring,
} from "@/lib/book-questions";
import { prisma } from "@/lib/prisma";
import { normalizeQuestionType } from "@/lib/normalized-question";


function required(
  value: string | null,
  label: string,
) {
  if (!value?.trim()) {
    throw new Error(
      `${label} is required.`,
    );
  }

  return value.trim();
}

export async function GET(
  request: Request,
) {
  const access =
    await authorizePublisherAdminApi();

  if (access.response) {
    return access.response;
  }

  try {
    const params = new URL(
      request.url,
    ).searchParams;

    const bookId = required(
      params.get("bookId"),
      "Book",
    );

    const chapterId = required(
      params.get("chapterId"),
      "Chapter",
    );

    const exerciseId =
      params
        .get("exerciseId")
        ?.trim() || null;

    const [authoring, options] =
      await Promise.all([
        loadBookQuestionsAuthoring({
          publisherId:
            access.actor.publisherId,
          bookId,
          chapterId,
          exerciseId,
        }),
        loadPublisherQuestionBankOptions(
          access.actor.publisherId,
          bookId,
        ),
      ]);

    return NextResponse.json({
      ok: true,
      ...authoring,
      options,
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

export async function POST(
  request: Request,
) {
  const access =
    await authorizePublisherAdminApi();

  if (access.response) {
    return access.response;
  }

  try {
    const body =
      (await request.json()) as {
        bookId?: unknown;
        chapterId?: unknown;
        exerciseId?: unknown;
      };

    const bookId = required(
      typeof body.bookId ===
        "string"
        ? body.bookId
        : null,
      "Book",
    );

    const chapterId = required(
      typeof body.chapterId ===
        "string"
        ? body.chapterId
        : null,
      "Chapter",
    );

    const exerciseId =
      typeof body.exerciseId ===
      "string"
        ? body.exerciseId.trim() ||
          null
        : null;

    return NextResponse.json(
      {
        ok: true,
        ...(await ensureBookQuestionsGroup(
          {
            publisherId:
              access.actor
                .publisherId,
            bookId,
            chapterId,
            exerciseId,
          },
        )),
      },
      {
        status: 201,
      },
    );
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

export async function PATCH(
  request: Request,
) {
  const access =
    await authorizePublisherAdminApi();

  if (access.response) {
    return access.response;
  }

  try {
    const body =
      (await request.json()) as {
        bookId?: unknown;
        chapterId?: unknown;
        exerciseId?: unknown;
        groupId?: unknown;
        questionId?: unknown;
        questionType?: unknown;
        approved?: unknown;
      };

    const bookId = required(
      typeof body.bookId ===
        "string"
        ? body.bookId
        : null,
      "Book",
    );

    const chapterId = required(
      typeof body.chapterId ===
        "string"
        ? body.chapterId
        : null,
      "Chapter",
    );

    const exerciseId = required(
      typeof body.exerciseId ===
        "string"
        ? body.exerciseId
        : null,
      "Exercise",
    );

    const groupId = required(
      typeof body.groupId ===
        "string"
        ? body.groupId
        : null,
      "Question group",
    );

    const questionId = required(
      typeof body.questionId ===
        "string"
        ? body.questionId
        : null,
      "Question",
    );

    const questionType =
      required(
        typeof body.questionType ===
          "string"
          ? body.questionType
          : null,
        "Question type",
      );
    const normalizedQuestionType = normalizeQuestionType(questionType);
    if (normalizedQuestionType === "UNSUPPORTED") {
      throw new Error("Question type is not supported by the publisher question bank.");
    }


    if (
      typeof body.approved !==
      "boolean"
    ) {
      throw new Error(
        "Approved status is required.",
      );
    }

    const ownedBook =
      await prisma.book.findFirst({
        where: {
          id: bookId,
          publisherId:
            access.actor.publisherId,
        },
        select: {
          id: true,
        },
      });

    if (!ownedBook) {
      throw new Error(
        "Book not found.",
      );
    }

    const group =
      await prisma.bookExerciseQuestionGroup.findFirst(
        {
          where: {
            id: groupId,
            exerciseId,
            active: true,
            exercise: {
              id: exerciseId,
              bookId,
              chapterId,
              archived: false,
            },
          },
          select: {
            id: true,
          },
        },
      );

    if (!group) {
      throw new Error(
        "Book Questions collection not found.",
      );
    }

    const question =
      await prisma.bookQuestion.findFirst(
        {
          where: {
            id: questionId,
            bookId,
            chapterId,
            exerciseId,
            exerciseGroupId:
              groupId,
            archived: false,
            questionType: normalizedQuestionType,
          },
          select: {
            id: true,
          },
        },
      );

    if (!question) {
      throw new Error(
        "Question not found.",
      );
    }

    await prisma.bookQuestion.update(
      {
        where: {
          id: question.id,
        },
        data: {
          approved:
            body.approved,
        },
      },
    );

    return NextResponse.json({
      ok: true,
      questionId:
        question.id,
      questionType: normalizedQuestionType,
      approved:
        body.approved,
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