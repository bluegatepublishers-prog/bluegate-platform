import { NextResponse } from "next/server";

import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import {
  publisherQuestionErrorResponse,
  transitionPublisherQuestion,
} from "@/lib/publisher-question-bank";

const ACTIONS = ["APPROVE", "RETURN_DRAFT", "ARCHIVE", "RESTORE"] as const;

export async function POST(request: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  try {
    const body = await request.json() as { action?: unknown };
    if (!ACTIONS.includes(body.action as (typeof ACTIONS)[number])) return NextResponse.json({ ok: false, code: "INVALID_INPUT", message: "Choose a valid lifecycle action." }, { status: 400 });
    const { questionId } = await params;
    return NextResponse.json({ ok: true, question: await transitionPublisherQuestion(access.actor.publisherId, questionId, body.action as (typeof ACTIONS)[number]) });
  } catch (error) {
    const response = publisherQuestionErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
