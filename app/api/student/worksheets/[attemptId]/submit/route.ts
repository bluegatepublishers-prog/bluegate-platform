import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

import {
  getStudentWorksheetAttempt,
  studentWorksheetErrorResponse,
  submitStudentWorksheetAttempt,
} from "@/lib/student-worksheet";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await params;
    const result = await submitStudentWorksheetAttempt(attemptId);
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
