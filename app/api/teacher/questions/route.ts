import { NextResponse } from "next/server";

import { getApiUser } from "@/lib/authz";
import {
  createTeacherQuestion,
  listTeacherQuestions,
  teacherQuestionErrorResponse,
} from "@/lib/teacher-question-bank";

async function teacherUserId() {
  const user = await getApiUser(["TEACHER"]);
  return user?.id ?? null;
}

export async function GET(request: Request) {
  const userId = await teacherUserId();
  if (!userId) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in as a teacher." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  try {
    return NextResponse.json(await listTeacherQuestions(userId, {
      status: params.get("status") ?? undefined,
      questionType: params.get("questionType") ?? undefined,
      difficulty: params.get("difficulty") ?? undefined,
      sectionSubjectId: params.get("sectionSubjectId") ?? undefined,
      bookId: params.get("bookId") ?? undefined,
      chapterId: params.get("chapterId") ?? undefined,
      moduleId: params.get("moduleId") ?? undefined,
      tags: params.getAll("tags"),
      search: params.get("search") ?? undefined,
      page: params.has("page") ? Number(params.get("page")) : undefined,
      pageSize: params.has("pageSize") ? Number(params.get("pageSize")) : undefined,
    }));
  } catch (error) {
    const response = teacherQuestionErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function POST(request: Request) {
  const userId = await teacherUserId();
  if (!userId) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in as a teacher." }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, question: await createTeacherQuestion(userId, await request.json()) }, { status: 201 });
  } catch (error) {
    const response = teacherQuestionErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}