import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

import {
  startStudentExerciseAttempt,
  studentExerciseErrorResponse,
} from "@/lib/student-exercise";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      bookId?: unknown;
      chapterId?: unknown;
      exerciseId?: unknown;
    };
    if (
      typeof body.bookId !== "string" ||
      typeof body.chapterId !== "string" ||
      typeof body.exerciseId !== "string"
    ) {
      throw new Error("invalid");
    }
    const result = await startStudentExerciseAttempt({
      bookId: body.bookId,
      chapterId: body.chapterId,
      exerciseId: body.exerciseId,
    });
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
