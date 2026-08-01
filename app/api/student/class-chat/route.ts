import { NextResponse } from "next/server";
import { listStudentClassChat, sendStudentClassMessage } from "@/lib/student-class-chat";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return NextResponse.json(await listStudentClassChat(url.searchParams.get("cursor")));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Class chat is unavailable." }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { text?: unknown; replyToId?: unknown };
    if (typeof body.text !== "string" || (body.replyToId != null && typeof body.replyToId !== "string")) return NextResponse.json({ error: "Invalid message." }, { status: 400 });
    return NextResponse.json(await sendStudentClassMessage({ text: body.text, replyToId: typeof body.replyToId === "string" ? body.replyToId : null }), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Message could not be sent." }, { status: 403 });
  }
}
