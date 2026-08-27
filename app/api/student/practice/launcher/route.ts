import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

import {
  getStudentPracticeAttempt,
  practiceErrorResponse,
  startStudentBookQuestionsPractice,
} from "@/lib/student-practice";
import { canLaunchBookQuestionPractice } from "@/lib/normalized-question";


export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      bookId?: unknown;
      releaseVersionId?: unknown;
      exerciseId?: unknown;
      groupId?: unknown;
      questionType?: unknown;
      questionIds?: unknown;
    };

    if (
      typeof body.exerciseId !== "string" ||
      !body.exerciseId.trim() ||
      typeof body.groupId !== "string" ||
      !body.groupId.trim() ||
      typeof body.questionType !== "string" ||
      !canLaunchBookQuestionPractice(body.questionType)
    ) {
      throw new Error("invalid");
    }

    const questionIds = Array.isArray(body.questionIds)
      ? [
          ...new Set(
            body.questionIds
              .filter(
                (id): id is string =>
                  typeof id === "string",
              )
              .map((id) => id.trim())
              .filter(Boolean),
          ),
        ].slice(0, 50)
      : [];

    const result =
      await startStudentBookQuestionsPractice({
        bookId: typeof body.bookId === "string" ? body.bookId : undefined,
        releaseVersionId: typeof body.releaseVersionId === "string" ? body.releaseVersionId : undefined,
        exerciseId: body.exerciseId,
        groupId: body.groupId,
        questionType: body.questionType as
          | "MCQ"
          | "TRUE_FALSE"
          | "FILL_BLANK"
          | "MULTIPLE_SELECT"
          | "SHORT_ANSWER",
        questionIds,
      });

    const attempt =
      await getStudentPracticeAttempt(
        result.attemptId,
      );

    return NextResponse.json({
      ok: true,
      ...result,
      attempt,
    });
  } catch (error) {
    unstable_rethrow(error);
    const safe = practiceErrorResponse(error);

    return NextResponse.json(
      {
        ok: false,
        message: safe.message,
      },
      {
        status: safe.status,
      },
    );
  }
}