import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/authz";
import {
  authorizeAndCreateResourceBookmark,
  authorizeAndRemoveResourceBookmark,
} from "@/lib/resource-mutations";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(["TEACHER"]);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const bookmark = await authorizeAndCreateResourceBookmark(user.id!, id);
  if (!bookmark) {
    return NextResponse.json({ message: "Resource not found." }, { status: 404 });
  }
  return NextResponse.json(bookmark);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(["TEACHER"]);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await authorizeAndRemoveResourceBookmark(user.id!, id);
  if (!result) {
    return NextResponse.json({ message: "Resource not found." }, { status: 404 });
  }
  return NextResponse.json(result);
}
