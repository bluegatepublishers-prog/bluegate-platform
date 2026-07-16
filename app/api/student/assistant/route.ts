import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import {
  runStudentAiRequest,
  studentAiErrorResponse,
} from "@/lib/student-ai";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const result = await runStudentAiRequest(body);
    return NextResponse.json(result);
  } catch (error) {
    unstable_rethrow(error);
    const safe = studentAiErrorResponse(error);
    return NextResponse.json(
      { ok: false, message: safe.message },
      { status: safe.status },
    );
  }
}
