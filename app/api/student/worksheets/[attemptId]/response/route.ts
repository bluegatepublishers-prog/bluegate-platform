import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

import {
  getStudentWorksheetAttempt,
  saveStudentWorksheetResponse,
  studentWorksheetErrorResponse,
} from "@/lib/student-worksheet";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const [{ attemptId }, body] = await Promise.all([
      params,
      request.json() as Promise<{ questionId?: unknown; response?: unknown }>,
    ]);
    if (typeof body.questionId !== "string" || !body.questionId.trim()) {
      throw new Error("invalid");
    }

    const result = await saveStudentWorksheetResponse(
      attemptId,
      body.questionId,
      body.response,
    );
    const attempt = await getStudentWorksheetAttempt(attemptId);

    return NextResponse.json({ ok: true, ...result, attempt });
  } catch (error) {
    unstable_rethrow(error);
    const safe = studentWorksheetErrorResponse(error);
    return NextResponse.json(
      { ok: false, message: safe.message },
      { status: safe.status },
    );
  }
}
