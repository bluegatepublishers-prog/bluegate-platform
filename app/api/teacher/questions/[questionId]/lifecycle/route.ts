import { NextResponse } from "next/server";

import { getApiUser } from "@/lib/authz";
import {
  teacherQuestionErrorResponse,
  transitionTeacherQuestion,
} from "@/lib/teacher-question-bank";

const actions = ["ACTIVATE", "ARCHIVE", "RESTORE_DRAFT", "RESTORE_ACTIVE"] as const;

type LifecycleAction = (typeof actions)[number];

export async function POST(request: Request, context: { params: Promise<{ questionId: string }> }) {
  const user = await getApiUser(["TEACHER"]);
  if (!user?.id) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in as a teacher." }, { status: 401 });
  try {
    const [{ questionId }, body] = await Promise.all([context.params, request.json() as Promise<{ action?: unknown; expectedRevision?: unknown }>]);
    if (!actions.includes(body.action as LifecycleAction)) {
      return NextResponse.json({ ok: false, code: "INVALID_INPUT", message: "Choose a valid lifecycle action." }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      question: await transitionTeacherQuestion(user.id, questionId, body.action as LifecycleAction, body.expectedRevision),
    });
  } catch (error) {
    const response = teacherQuestionErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}