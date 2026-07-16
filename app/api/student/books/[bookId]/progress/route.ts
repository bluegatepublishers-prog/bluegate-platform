import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { saveStudentReadingProgress } from "@/lib/student-books";

export async function POST(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  try {
    const { bookId } = await params;
    const body = await request.json() as { currentPage?: unknown; totalPages?: unknown };
    const result = await saveStudentReadingProgress({
      bookId,
      currentPage: body.currentPage,
      totalPages: body.totalPages,
    });
    return NextResponse.json(
      result.ok ? { ok: true } : { ok: false, message: result.message },
      { status: result.ok ? 200 : result.message.startsWith("This book") ? 404 : 400 },
    );
  } catch (error) {
    unstable_rethrow(error);
    return NextResponse.json(
      { ok: false, message: "We could not save your reading position." },
      { status: 400 },
    );
  }
}
