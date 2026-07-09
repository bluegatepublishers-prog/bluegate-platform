import { NextResponse } from "next/server";
import { ResourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/authz";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getApiUser(["ADMIN"]))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const type = Object.values(ResourceType).includes(body.type)
    ? body.type
    : ResourceType.PDF;

  return NextResponse.json(
    await prisma.resource.update({
      where: { id },
      data: {
        title: body.title?.trim(),
        description: body.description?.trim(),
        subject: body.subject?.trim(),
        classLevel: body.classLevel?.trim(),
        type,
        fileUrl: body.fileUrl?.trim(),
        thumbnail: body.thumbnail?.trim() || null,
        featured: Boolean(body.featured),
      },
    })
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getApiUser(["ADMIN"]))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.resource.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
