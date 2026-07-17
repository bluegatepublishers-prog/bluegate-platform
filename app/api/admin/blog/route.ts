import { NextResponse } from "next/server";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";

export async function GET() {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  return NextResponse.json([]);
}

export async function POST() {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  return NextResponse.json(
    { message: "Blog module is not active yet." },
    { status: 501 }
  );
}
