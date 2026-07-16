import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { practiceErrorResponse, submitStudentPractice } from "@/lib/student-practice";
export async function POST(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) { try { const { attemptId } = await params; const result = await submitStudentPractice(attemptId); return NextResponse.json({ ok: true, ...result }); } catch (error) { unstable_rethrow(error); const safe = practiceErrorResponse(error); return NextResponse.json({ ok: false, message: safe.message }, { status: safe.status }); } }
