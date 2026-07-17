import { NextResponse } from "next/server";
import { PlatformFeatureKey, ResourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizePublisherAdminApi, publisherAdminNotFound } from "@/lib/publisher-admin-authorization";
import { removeManagedResourceFile } from "@/lib/resource-files";
import { validateResourceAudience } from "@/lib/resource-audience";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { isPublisherUploadUrl } from "@/lib/storage/upload-policy";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;
  if(!await isPublisherFeatureEnabled(actor.publisherId,PlatformFeatureKey.RESOURCES))return NextResponse.json({message:"Forbidden"},{status:403});

  const { id } = await params;
  const body = await request.json();
  const audience=validateResourceAudience(body.audience);
  if(!audience)return NextResponse.json({message:"Select a valid audience."},{status:400});
  const type = Object.values(ResourceType).includes(body.type)
    ? body.type
    : ResourceType.PDF;

  const existing = await prisma.resource.findFirst({ where: { id, publisherId:actor.publisherId } });
  if (!existing) return publisherAdminNotFound();
  const nextFileUrl = body.fileUrl?.trim();
  const nextThumbnail = body.thumbnail?.trim() || null;
  if ((nextFileUrl !== existing.fileUrl && !isPublisherUploadUrl(nextFileUrl, actor.publisherId, ["resource-file"])) || (nextThumbnail !== existing.thumbnail && !isPublisherUploadUrl(nextThumbnail, actor.publisherId, ["resource-thumbnail"]))) return NextResponse.json({ message: "Upload files through this publisher workspace." }, { status: 400 });

  const result = await prisma.resource.updateMany({
      where: { id, publisherId: actor.publisherId },
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
  if (result.count !== 1) return publisherAdminNotFound();
  const resource = await prisma.resource.findFirst({ where: { id, publisherId: actor.publisherId } });
  if (!resource) return publisherAdminNotFound();

  if (existing.fileUrl !== resource.fileUrl) await removeManagedResourceFile(existing.fileUrl);
  if (existing.thumbnail !== resource.thumbnail) await removeManagedResourceFile(existing.thumbnail);
  return NextResponse.json(resource);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;
  if(!await isPublisherFeatureEnabled(actor.publisherId,PlatformFeatureKey.RESOURCES))return NextResponse.json({message:"Forbidden"},{status:403});

  const { id } = await params;
  const resource = await prisma.resource.findFirst({ where: { id, publisherId:actor.publisherId } });
  if (!resource) return publisherAdminNotFound();
  const deleted = await prisma.resource.deleteMany({ where: { id, publisherId: actor.publisherId } });
  if (deleted.count !== 1) return publisherAdminNotFound();
  await Promise.all([removeManagedResourceFile(resource.fileUrl), removeManagedResourceFile(resource.thumbnail)]);
  return NextResponse.json({ success: true });
}
