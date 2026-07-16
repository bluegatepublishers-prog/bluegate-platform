import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { saveStudentRevisionChecklist } from "@/lib/student-revision";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ bookId: string; chapterId: string }> },
) {
  try {
    const [{ bookId, chapterId }, checklist] = await Promise.all([params, request.json()]);
    const result = await saveStudentRevisionChecklist({ bookId, chapterId, checklist });
    return NextResponse.json(
      result.ok ? { ok: true } : { ok: false, message: result.message },
      { status: result.ok ? 200 : result.message.startsWith("This chapter") ? 404 : 400 },
    );
  } catch (error) {
    unstable_rethrow(error);
    return NextResponse.json(
      { ok: false, message: "We could not save your revision checklist." },
      { status: 400 },
    );
  }
}
