import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

import {
  saveStudentExerciseDraft,
  studentExerciseErrorResponse,
} from "@/lib/student-exercise";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await params;
    const body = (await request.json()) as {
      responses?: { questionId?: unknown; answer?: unknown }[];
    };
    const responses = Array.isArray(body.responses)
      ? body.responses
          .filter(
            (item): item is { questionId: string; answer: unknown } =>
              typeof item?.questionId === "string",
          )
          .map((item) => ({ questionId: item.questionId, answer: item.answer }))
      : [];
    const result = await saveStudentExerciseDraft({ attemptId, responses });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    unstable_rethrow(error);
    const safe = studentExerciseErrorResponse(error);
    return NextResponse.json(
      { ok: false, message: safe.message },
      { status: safe.status },
    );
  }
}
