import { NextResponse } from "next/server";

import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import {
  getPublisherQuestion,
  publisherQuestionErrorResponse,
  updatePublisherQuestion,
} from "@/lib/publisher-question-bank";

export async function GET(_request: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  try {
    const { questionId } = await params;
    return NextResponse.json({ ok: true, question: await getPublisherQuestion(access.actor.publisherId, questionId) });
  } catch (error) {
    const response = publisherQuestionErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  try {
    const { questionId } = await params;
    return NextResponse.json({ ok: true, question: await updatePublisherQuestion(access.actor.publisherId, questionId, await request.json()) });
  } catch (error) {
    const response = publisherQuestionErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
