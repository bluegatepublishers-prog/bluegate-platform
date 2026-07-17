import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";

export async function GET() {
  try {
    const access = await authorizePublisherAdminApi();
    if (access.response) return access.response;
    const series = await prisma.bookSeries.findMany({
      where: {
        active: true,
        publisherId: access.actor.publisherId,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(series);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Unable to load book series.",
      },
      {
        status: 500,
      }
    );
  }
}
