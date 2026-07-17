import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";

export async function GET() {
  try {
    const access = await authorizePublisherAdminApi();
    if (access.response) return access.response;
    const subjects = await prisma.subject.findMany({
      where: {
        active: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json(subjects);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Unable to load subjects.",
      },
      {
        status: 500,
      }
    );
  }
}
