import { NextResponse } from "next/server";

import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import {
  createPublisherQuestion,
  listPublisherQuestions,
  publisherQuestionErrorResponse,
} from "@/lib/publisher-question-bank";

export async function GET(request: Request) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const params = new URL(request.url).searchParams;
  try {
    return NextResponse.json(await listPublisherQuestions(access.actor.publisherId, {
      bookId: params.get("bookId") ?? undefined,
      classId: params.get("classId") ?? undefined,
      subjectId: params.get("subjectId") ?? undefined,
      chapterId: params.get("chapterId") ?? undefined,
      moduleId: params.get("moduleId") ?? undefined,
      questionType: params.get("questionType") ?? undefined,
      difficulty: params.get("difficulty") ?? undefined,
      status: params.get("status") ?? undefined,
      tags: params.getAll("tags"),
      search: params.get("search") ?? undefined,
      page: params.get("page") ?? undefined,
      pageSize: params.get("pageSize") ?? undefined,
    }));
  } catch (error) {
    const response = publisherQuestionErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function POST(request: Request) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  try {
    return NextResponse.json({ ok: true, question: await createPublisherQuestion(access.actor.publisherId, await request.json()) }, { status: 201 });
  } catch (error) {
    const response = publisherQuestionErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
