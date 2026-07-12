import { NextResponse } from "next/server";
import { ResourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/authz";
import { resolvePublisherForUser } from "@/lib/publisher-context";

export async function GET() {
  const user=await getApiUser(["ADMIN"]);const publisher=user?.id?await resolvePublisherForUser(user.id):null;if(!publisher){
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(
    await prisma.resource.findMany({ where:{publisherId:publisher.id},orderBy: { createdAt: "desc" } })
  );
}

export async function POST(request: Request) {
  const user=await getApiUser(["ADMIN"]);const publisher=user?.id?await resolvePublisherForUser(user.id):null;if(!publisher){
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
      publisherId:publisher.id,
      title: body.title.trim(),
      description: body.description?.trim() || "",
      subject: body.subject?.trim() || "General",
      classLevel: body.classLevel?.trim() || "All Classes",
      type,
      fileUrl: body.fileUrl.trim(),
      thumbnail: body.thumbnail?.trim() || null,
      featured: Boolean(body.featured),
      published: body.published !== false,
    },
  });

  return NextResponse.json(resource, { status: 201 });
}
