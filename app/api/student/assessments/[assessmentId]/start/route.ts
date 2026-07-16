import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { assessmentErrorResponse, startStudentAssessment } from "@/lib/student-assessments";

export async function POST(_request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  try {
    const { assessmentId } = await params;
    const result = await startStudentAssessment(assessmentId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    unstable_rethrow(error);
    const safe = assessmentErrorResponse(error);
    return NextResponse.json({ ok: false, message: safe.message, code: safe.code }, { status: safe.status });
  }
}
