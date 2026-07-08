import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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