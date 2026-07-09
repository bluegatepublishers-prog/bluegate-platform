import { NextResponse } from "next/server";
import { ResourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/authz";

export async function GET() {
  if (!(await getApiUser(["ADMIN"]))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(
    await prisma.resource.findMany({ orderBy: { createdAt: "desc" } })
  );
}

export async function POST(request: Request) {
  if (!(await getApiUser(["ADMIN"]))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.title?.trim() || !body.fileUrl?.trim()) {
    return NextResponse.json(
      { message: "Title and file are required." },
      { status: 400 }
    );
  }

  const type = Object.values(ResourceType).includes(body.type)
    ? body.type
    : ResourceType.PDF;

  const resource = await prisma.resource.create({
    data: {
      title: body.title.trim(),
      description: body.description?.trim() || "",
      subject: body.subject?.trim() || "General",
      classLevel: body.classLevel?.trim() || "All Classes",
      type,
      fileUrl: body.fileUrl.trim(),
      thumbnail: body.thumbnail?.trim() || null,
      featured: Boolean(body.featured),
    },
  });

  return NextResponse.json(resource, { status: 201 });
}
