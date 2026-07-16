import { NextResponse } from "next/server";
import { resolveStudentResource } from "@/lib/student-subjects";
import { requireStudent } from "@/lib/student-dashboard";

const safeHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resourceId: string }> },
) {
  const { resourceId } = await params;
  const identity = await requireStudent();
  const resource = await resolveStudentResource(resourceId, identity);
  if (!resource) {
    return NextResponse.json(
      { message: "This learning resource is not available for your account." },
      { status: 404, headers: safeHeaders },
    );
  }
  const response = NextResponse.redirect(resource.fileUrl, { status: 307 });
  for (const [name, value] of Object.entries(safeHeaders)) response.headers.set(name, value);
  return response;
}
