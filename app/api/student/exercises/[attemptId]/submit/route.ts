import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

import {
  studentExerciseErrorResponse,
  submitStudentExerciseAttempt,
} from "@/lib/student-exercise";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await params;
    const result = await submitStudentExerciseAttempt({ attemptId });
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
