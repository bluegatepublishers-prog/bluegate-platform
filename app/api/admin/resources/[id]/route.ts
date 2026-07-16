import { NextResponse } from "next/server";
import { PlatformFeatureKey, ResourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/authz";
import { removeManagedResourceFile } from "@/lib/resource-files";
import { resolvePublisherForUser } from "@/lib/publisher-context";
import { validateResourceAudience } from "@/lib/resource-audience";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user=await getApiUser(["ADMIN"]); const publisher=user?.id?await resolvePublisherForUser(user.id):null;
  if (!publisher) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  if(!await isPublisherFeatureEnabled(publisher.id,PlatformFeatureKey.RESOURCES))return NextResponse.json({message:"Forbidden"},{status:403});

  const { id } = await params;
  const body = await request.json();
  const audience=validateResourceAudience(body.audience);
  if(!audience)return NextResponse.json({message:"Select a valid audience."},{status:400});
  const type = Object.values(ResourceType).includes(body.type)
    ? body.type
    : ResourceType.PDF;

  const existing = await prisma.resource.findFirst({ where: { id, publisherId:publisher.id } });
  if (!existing) return NextResponse.json({ message: "Resource not found." }, { status: 404 });

  const resource = await prisma.resource.update({
      where: { id },
      data: {
        title: body.title?.trim(),
        description: body.description?.trim(),
        subject: body.subject?.trim(),
        classLevel: body.classLevel?.trim(),
        type,
        audience,
        fileUrl: body.fileUrl?.trim(),
        thumbnail: body.thumbnail?.trim() || null,
        featured: Boolean(body.featured),
        published: body.published !== false,
      },
    });

  if (existing.fileUrl !== resource.fileUrl) await removeManagedResourceFile(existing.fileUrl);
  if (existing.thumbnail !== resource.thumbnail) await removeManagedResourceFile(existing.thumbnail);
  return NextResponse.json(resource);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user=await getApiUser(["ADMIN"]); const publisher=user?.id?await resolvePublisherForUser(user.id):null;
  if (!publisher) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  if(!await isPublisherFeatureEnabled(publisher.id,PlatformFeatureKey.RESOURCES))return NextResponse.json({message:"Forbidden"},{status:403});

  const { id } = await params;
  const resource = await prisma.resource.findFirst({ where: { id, publisherId:publisher.id } });
  if (!resource) return NextResponse.json({ message: "Resource not found." }, { status: 404 });
  await prisma.resource.delete({ where: { id } });
  await Promise.all([removeManagedResourceFile(resource.fileUrl), removeManagedResourceFile(resource.thumbnail)]);
  return NextResponse.json({ success: true });
}
