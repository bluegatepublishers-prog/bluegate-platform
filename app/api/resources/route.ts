import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return NextResponse.json(
    await prisma.resource.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
    })
  );
}
