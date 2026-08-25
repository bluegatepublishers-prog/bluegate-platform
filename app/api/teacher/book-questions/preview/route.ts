import { NextResponse } from "next/server";

import {
  bookQuestionsErrorResponse,
  loadBookQuestionsAuthoring,
} from "@/lib/book-questions";

import { prisma } from "@/lib/prisma";
import { canLaunchBookQuestionPractice } from "@/lib/normalized-question";
import { normalizeV2PracticeQuestionType } from "@/lib/v2-assessment-launcher";
import { getTeacherBook } from "@/lib/teacher-books";

const PREVIEW_TIMEOUT_MS = 8_000;

class BookQuestionPreviewTimeoutError extends Error {
  constructor() {
    super("Book Question preview timed out.");
    this.name = "BookQuestionPreviewTimeoutError";
  }
}

function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new BookQuestionPreviewTimeoutError());
    }, timeoutMs);
  });

  return Promise.race([operation, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  let lastStage = "route entered";

  const trace = (stage: string) => {
    lastStage = stage;

    if (process.env.NODE_ENV === "development") {
      console.info(
        `[BookQuestionPreview] +${Date.now() - startedAt}ms ${stage}`,
      );
    }
  };

  const respond = (
    body: Record<string, unknown>,
    status?: number,
  ) => {
    trace("response serialization started");
    const response = NextResponse.json(
      body,
      status === undefined ? undefined : { status },
    );
    trace("response returned");
    return response;
  };

  trace("route entered");

  try {
    const params = new URL(request.url).searchParams;

    const exerciseId =
      params.get("exerciseId")?.trim() ?? "";
    const groupId =
      params.get("groupId")?.trim() ?? "";
    const requestedQuestionType =
      params.get("questionType")?.trim() ?? "";
    const requestedQuestionIds = [
      ...new Set(
        (params.get("questionIds") ?? "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];

    if (!exerciseId || !groupId) {
      return respond(
        {
          ok: false,
          message: "Book Questions are unavailable.",
        },
        404,
      );
    }

    const result = await withTimeout(
      (async () => {
        trace("exercise/group lookup started");
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
        trace("exercise/group lookup completed");

        if (!exercise) {
          return null;
        }

        const teacherBook = await getTeacherBook(
          exercise.bookId,
          { trace },
        );

        if (!teacherBook) {
          return null;
        }

        trace("question query started");
        const authoring =
          await loadBookQuestionsAuthoring({
            publisherId: teacherBook.publisherId,
            bookId: exercise.bookId,
            chapterId: exercise.chapterId,
            exerciseId: exercise.id,
            trace,
          });
        trace("question query completed");

        if (
          !authoring.group ||
          authoring.group.id !== groupId
        ) {
          return null;
        }

        if (
          requestedQuestionType &&
          !canLaunchBookQuestionPractice(
            requestedQuestionType,
          )
        ) {
          return null;
        }

        const normalizedQuestionType =
          requestedQuestionType
            ? normalizeV2PracticeQuestionType(
                requestedQuestionType,
              )
            : null;

        const questions = authoring.questions.filter(
          (question) =>
            question.approved &&
            !question.archived &&
            (!normalizedQuestionType ||
              normalizeV2PracticeQuestionType(
                question.questionType,
              ) === normalizedQuestionType) &&
            (!requestedQuestionIds.length ||
              requestedQuestionIds.includes(
                question.id,
              )),
        );

        return questions;
      })(),
      PREVIEW_TIMEOUT_MS,
    );

    if (result === null) {
      return respond(
        {
          ok: false,
          message: "Book Questions are unavailable.",
        },
        404,
      );
    }

    return respond({
      ok: true,
      questions: result,
    });
  } catch (error) {
    if (error instanceof BookQuestionPreviewTimeoutError) {
      trace(
        `preview timeout after ${PREVIEW_TIMEOUT_MS}ms at ${lastStage}`,
      );
      return respond(
        {
          ok: false,
          message:
            "Book Questions are temporarily unavailable. Please try again.",
        },
        503,
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.warn("[BookQuestionPreview] route failed", {
        stage: lastStage,
        error:
          error instanceof Error
            ? error.message.slice(0, 180)
            : "Unknown error",
      });
    }

    const response = bookQuestionsErrorResponse(error);
    return respond(response.body, response.status);
  }
}