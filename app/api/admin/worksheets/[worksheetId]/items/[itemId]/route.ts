import { NextResponse } from "next/server";

import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { movePublisherWorksheetItem, removePublisherWorksheetItem } from "@/lib/publisher-worksheet-items";

export async function DELETE(request: Request, { params }: { params: Promise<{ worksheetId: string; itemId: string }> }) {
  const access = await authorizePublisherAdminApi(); if (access.response) return access.response;
  const bookId = new URL(request.url).searchParams.get("bookId"); if (!bookId) return NextResponse.json({ ok: false, message: "bookId is required." }, { status: 400 });
  const { worksheetId, itemId } = await params; await removePublisherWorksheetItem({ publisherId: access.actor.publisherId, bookId, worksheetId, itemId }); return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ worksheetId: string; itemId: string }> }) {
  const access = await authorizePublisherAdminApi(); if (access.response) return access.response;
  const body = await request.json() as { bookId?: unknown; direction?: unknown }; if (typeof body.bookId !== "string" || (body.direction !== -1 && body.direction !== 1)) return NextResponse.json({ ok: false, message: "bookId and direction are required." }, { status: 400 });
  const { worksheetId, itemId } = await params; await movePublisherWorksheetItem({ publisherId: access.actor.publisherId, bookId: body.bookId, worksheetId, itemId, direction: body.direction }); return NextResponse.json({ ok: true });
}
