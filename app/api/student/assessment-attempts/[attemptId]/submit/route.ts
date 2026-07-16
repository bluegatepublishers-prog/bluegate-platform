import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { assessmentErrorResponse, submitStudentAssessment } from "@/lib/student-assessments";

export async function POST(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const { attemptId } = await params;
    const result = await submitStudentAssessment(attemptId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    unstable_rethrow(error);
    const safe = assessmentErrorResponse(error);
    return NextResponse.json({ ok: false, message: safe.message, code: safe.code }, { status: safe.status });
  }
}
