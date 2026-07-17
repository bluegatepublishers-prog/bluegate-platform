import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const { id } = await params;

  const item = await prisma.class.findUnique({
    where: { id },
  });

  if (!item) {
    return NextResponse.json(
      { message: "Class not found." },
      { status: 404 }
    );
  }

  return NextResponse.json(item);
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  void request; void params;
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  return NextResponse.json({ message: "Global master data is read-only for Publisher Admin." }, { status: 403 });
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  void request; void params;
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  return NextResponse.json({ message: "Global master data is read-only for Publisher Admin." }, { status: 403 });
}
