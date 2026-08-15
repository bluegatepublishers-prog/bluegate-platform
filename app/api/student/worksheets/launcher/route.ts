import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

import {
  getStudentWorksheetAttempt,
  startStudentWorksheetAttempt,
  studentWorksheetErrorResponse,
} from "@/lib/student-worksheet";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { worksheetId?: unknown };
    if (typeof body.worksheetId !== "string" || !body.worksheetId.trim()) {
      throw new Error("invalid");
    }

    const result = await startStudentWorksheetAttempt(body.worksheetId);
    const attempt = await getStudentWorksheetAttempt(result.attemptId);

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
