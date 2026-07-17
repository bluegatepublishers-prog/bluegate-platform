import { NextResponse } from "next/server";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  void request; void params;
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  return NextResponse.json(
    { message: "Publisher-scoped contact messages are unavailable." },
    { status: 403 },
  );
}
