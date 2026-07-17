import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";

export async function GET() {
  try {
    const access = await authorizePublisherAdminApi();
    if (access.response) return access.response;
    const classes = await prisma.class.findMany({
      where: {
        active: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Unable to load classes.",
      },
      {
        status: 500,
      }
    );
  }
}
