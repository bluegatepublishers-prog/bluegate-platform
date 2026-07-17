import { NextResponse } from "next/server";
import { PlatformFeatureKey, ResourceType, SecurityAuditOutcome } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { validateResourceAudience } from "@/lib/resource-audience";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { isPublisherUploadUrl } from "@/lib/storage/upload-policy";
import { publisherAdminAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";

export async function GET() {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;
  if(!await isPublisherFeatureEnabled(actor.publisherId,PlatformFeatureKey.RESOURCES))return NextResponse.json({message:"Forbidden"},{status:403});

  return NextResponse.json(
    await prisma.resource.findMany({ where:{publisherId:actor.publisherId},orderBy: { createdAt: "desc" } })
  );
}

export async function POST(request: Request) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;
  if(!await isPublisherFeatureEnabled(actor.publisherId,PlatformFeatureKey.RESOURCES))return NextResponse.json({message:"Forbidden"},{status:403});

  const body = await request.json();
  const audience = validateResourceAudience(body.audience);
  if (!body.title?.trim() || !body.fileUrl?.trim()) {
    return NextResponse.json(
      { message: "Title and file are required." },
      { status: 400 }
    );
  }
  if (!audience) return NextResponse.json({ message: "Select a valid audience." }, { status: 400 });
  if (!isPublisherUploadUrl(body.fileUrl?.trim(), actor.publisherId, ["resource-file"]) || !isPublisherUploadUrl(body.thumbnail?.trim() || null, actor.publisherId, ["resource-thumbnail"])) return NextResponse.json({ message: "Upload files through this publisher workspace." }, { status: 400 });

  const type = Object.values(ResourceType).includes(body.type)
    ? body.type
    : ResourceType.PDF;

  const resource = await prisma.$transaction(async (tx) => {
    const created = await tx.resource.create({
      data: {
        publisherId:actor.publisherId,
        title: body.title.trim(),
        description: body.description?.trim() || "",
        subject: body.subject?.trim() || "General",
        classLevel: body.classLevel?.trim() || "All Classes",
        type,
        audience,
        fileUrl: body.fileUrl.trim(),
        thumbnail: body.thumbnail?.trim() || null,
        featured: Boolean(body.featured),
        published: body.published !== false,
      },
    });
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor), action: "publisher.resource.create",
      targetType: "Resource", targetId: created.id, outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { fileCount: created.thumbnail ? 2 : 1 },
    });
    return created;
  });

  return NextResponse.json(resource, { status: 201 });
}
