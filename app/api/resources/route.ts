import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/authz";

export async function GET() {
  if (!(await getApiUser(["TEACHER"]))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    await prisma.resource.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
    })
  );
}
