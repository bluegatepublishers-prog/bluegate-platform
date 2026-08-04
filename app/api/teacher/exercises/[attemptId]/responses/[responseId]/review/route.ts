import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

import {
  saveTeacherExerciseResponseReview,
  studentExerciseErrorResponse,
} from "@/lib/student-exercise";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ attemptId: string; responseId: string }>;
  },
) {
  try {
    const { attemptId, responseId } = await params;
    const body = (await request.json()) as {
      sectionId?: unknown;
      marksAwarded?: unknown;
      feedback?: unknown;
    };
    if (
      typeof body.sectionId !== "string" ||
      typeof body.marksAwarded !== "number"
    ) {
      throw new Error("invalid");
    }
    const result = await saveTeacherExerciseResponseReview({
      sectionId: body.sectionId,
      attemptId,
      responseId,
      marksAwarded: body.marksAwarded,
      feedback: typeof body.feedback === "string" ? body.feedback : null,
    });
    return NextResponse.json(result);
  } catch (error) {
    unstable_rethrow(error);
    const safe = studentExerciseErrorResponse(error);
    return NextResponse.json(
      { ok: false, message: safe.message },
      { status: safe.status },
    );
  }
}
