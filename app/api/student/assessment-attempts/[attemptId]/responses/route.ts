import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { assessmentErrorResponse, saveStudentAssessmentAnswer } from "@/lib/student-assessments";

export async function PATCH(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const [{ attemptId }, body] = await Promise.all([
      params,
      request.json() as Promise<{ assessmentQuestionId?: unknown; answer?: unknown }>,
    ]);
    if (typeof body.assessmentQuestionId !== "string") throw new Error("invalid");
    const result = await saveStudentAssessmentAnswer({ attemptId, assessmentQuestionId: body.assessmentQuestionId, answer: body.answer });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    unstable_rethrow(error);
    const safe = assessmentErrorResponse(error);
    return NextResponse.json({ ok: false, message: safe.message, code: safe.code }, { status: safe.status });
  }
}
