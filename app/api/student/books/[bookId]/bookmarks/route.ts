import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { toggleStudentBookBookmark } from "@/lib/student-books";

export async function POST(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  try {
    const { bookId } = await params;
    const body = await request.json() as { pageNumber?: unknown; totalPages?: unknown };
    const result = await toggleStudentBookBookmark({
      bookId,
      pageNumber: body.pageNumber,
      totalPages: typeof body.totalPages === "number" ? body.totalPages : null,
    });
    return NextResponse.json(
      result.ok ? { ok: true, ...result.value } : { ok: false, message: result.message },
      { status: result.ok ? 200 : result.message.startsWith("This book") ? 404 : 400 },
    );
  } catch (error) {
    unstable_rethrow(error);
    return NextResponse.json(
      { ok: false, message: "We could not save this page bookmark." },
      { status: 400 },
    );
  }
}
