import { NextResponse } from "next/server";
import { deleteStudentClassMessage } from "@/lib/student-class-chat";

export async function DELETE(_request: Request, context: { params: Promise<{ messageId: string }> }) {
  try {
    const { messageId } = await context.params;
    await deleteStudentClassMessage(messageId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Message could not be deleted." }, { status: 403 });
  }
}
