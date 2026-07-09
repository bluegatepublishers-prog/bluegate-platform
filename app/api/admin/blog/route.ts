import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([]);
}

export async function POST() {
  return NextResponse.json(
    { message: "Blog module is not active yet." },
    { status: 501 }
  );
}