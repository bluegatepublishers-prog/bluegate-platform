import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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