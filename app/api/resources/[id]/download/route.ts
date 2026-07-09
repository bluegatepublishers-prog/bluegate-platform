import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/authz";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(["TEACHER"]);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const teacher = await prisma.teacher.findUnique({ where: { userId: user.id } });
  const resource = await prisma.resource.findFirst({
    where: { id, published: true },
  });

  if (!teacher || !resource) {
    return NextResponse.json({ message: "Resource not found." }, { status: 404 });
  }

  await prisma.download.create({
    data: { teacherId: teacher.id, resourceId: resource.id },
  });

  return NextResponse.json({ url: resource.fileUrl });
}
