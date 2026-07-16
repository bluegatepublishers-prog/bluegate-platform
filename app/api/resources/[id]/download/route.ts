import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/authz";
import { authorizeAndRecordResourceDownload } from "@/lib/resource-mutations";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(["TEACHER"]);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await authorizeAndRecordResourceDownload(user.id!, id);
  if (!result) {
    return NextResponse.json({ message: "Resource not found." }, { status: 404 });
  }
  return NextResponse.json(result);
}
