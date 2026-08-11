import { NextResponse } from "next/server";

import { createPublisherWorksheetPdf, worksheetFilename } from "@/lib/worksheet-export";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { loadPublisherWorksheetOutput } from "@/lib/publisher-worksheet-output";

export async function GET(request: Request, { params }: { params: Promise<{ worksheetId: string }> }) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const bookId = new URL(request.url).searchParams.get("bookId");
  if (!bookId) return NextResponse.json({ ok: false, message: "bookId is required." }, { status: 400 });
  try {
    const { worksheetId } = await params;
    const worksheet = await loadPublisherWorksheetOutput({ publisherId: access.actor.publisherId, bookId, worksheetId, preferPublished: true });
    const pdf = createPublisherWorksheetPdf(worksheet);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${worksheetFilename(worksheet.title)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Worksheet PDF is unavailable." }, { status: 400 });
  }
}
