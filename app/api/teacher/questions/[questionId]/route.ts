import { NextResponse } from "next/server";

import { getApiUser } from "@/lib/authz";
import {
  getTeacherQuestion,
  teacherQuestionErrorResponse,
  updateTeacherQuestion,
} from "@/lib/teacher-question-bank";

async function teacherUserId() {
  const user = await getApiUser(["TEACHER"]);
  return user?.id ?? null;
}

export async function GET(_request: Request, context: { params: Promise<{ questionId: string }> }) {
  const userId = await teacherUserId();
  if (!userId) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in as a teacher." }, { status: 401 });
  try {
    const { questionId } = await context.params;
    return NextResponse.json({ ok: true, question: await getTeacherQuestion(userId, questionId) });
  } catch (error) {
    const response = teacherQuestionErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ questionId: string }> }) {
  const userId = await teacherUserId();
  if (!userId) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in as a teacher." }, { status: 401 });
  try {
    const [{ questionId }, body] = await Promise.all([context.params, request.json()]);
    return NextResponse.json({ ok: true, question: await updateTeacherQuestion(userId, questionId, body) });
  } catch (error) {
    const response = teacherQuestionErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}