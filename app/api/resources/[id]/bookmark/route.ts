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
  if (!teacher) return NextResponse.json({ message: "Teacher not found." }, { status: 404 });

  const bookmark = await prisma.bookmark.upsert({
    where: {
      teacherId_resourceId: { teacherId: teacher.id, resourceId: id },
    },
    update: {},
    create: { teacherId: teacher.id, resourceId: id },
  });

  return NextResponse.json(bookmark);
}
