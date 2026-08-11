import { NextResponse } from "next/server";

import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { addPublisherWorksheetQuestions, listPublisherWorksheetItems } from "@/lib/publisher-worksheet-items";

export async function GET(request: Request, { params }: { params: Promise<{ worksheetId: string }> }) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const bookId = new URL(request.url).searchParams.get("bookId");
  if (!bookId) return NextResponse.json({ ok: false, message: "bookId is required." }, { status: 400 });
  try { const { worksheetId } = await params; return NextResponse.json({ ok: true, items: await listPublisherWorksheetItems(access.actor.publisherId, bookId, worksheetId) }); }
  catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Worksheet items are unavailable." }, { status: 400 }); }
}

export async function POST(request: Request, { params }: { params: Promise<{ worksheetId: string }> }) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const body = await request.json() as { bookId?: unknown; questionIds?: unknown };
  if (typeof body.bookId !== "string" || !Array.isArray(body.questionIds) || body.questionIds.some((id) => typeof id !== "string")) return NextResponse.json({ ok: false, message: "A book and question IDs are required." }, { status: 400 });
  try { const { worksheetId } = await params; await addPublisherWorksheetQuestions({ publisherId: access.actor.publisherId, bookId: body.bookId, worksheetId, questionIds: body.questionIds }); return NextResponse.json({ ok: true }, { status: 201 }); }
  catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to add worksheet questions." }, { status: 400 }); }
}
