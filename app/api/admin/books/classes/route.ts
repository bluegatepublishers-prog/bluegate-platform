import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";

export async function GET() {
  try {
    const access = await authorizePublisherAdminApi();
    if (access.response) return access.response;
    const classes = await prisma.class.findMany({
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Failed to fetch classes." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  void request;
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  return NextResponse.json(
    { message: "Global master data is read-only for Publisher Admin." },
    { status: 403 },
  );
}
