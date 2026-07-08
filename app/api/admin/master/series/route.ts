import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const series = await prisma.bookSeries.findMany({
      where: {
        active: true,
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