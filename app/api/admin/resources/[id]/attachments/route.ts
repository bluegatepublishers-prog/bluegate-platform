import { BookContentTargetType, PlatformFeatureKey } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  attachResourceToBookContent,
  BookResourceLinkError,
  detachResourceFromBookContent,
  moveBookResourceLink,
  updateBookResourceLink,
} from "@/lib/book-resource-links";
import { prisma } from "@/lib/prisma";
import {
  authorizePublisherAdminApi,
  publisherAdminNotFound,
} from "@/lib/publisher-admin-authorization";
import { validateResourceAudience } from "@/lib/resource-audience";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";

function parseTarget(body: Record<string, unknown>) {
  const targetType = Object.values(BookContentTargetType).includes(
    body.targetType as BookContentTargetType,
  )
    ? (body.targetType as BookContentTargetType)
    : null;
  const targetId =
    typeof body.targetId === "string" && body.targetId ? body.targetId : null;
  if (!targetType || (targetType !== "BOOK" && !targetId)) return null;
  return {
    targetType,
    ids: {
      partId: targetType === "PART" ? targetId : null,
      unitId: targetType === "UNIT" ? targetId : null,
      chapterId: targetType === "CHAPTER" ? targetId : null,
      moduleId: targetType === "MODULE" ? targetId : null,
      topicId: targetType === "TOPIC" ? targetId : null,
    },
  };
}

async function ownedResource(id: string, publisherId: string) {
  return prisma.resource.findFirst({
    where: { id, publisherId },
    select: { id: true },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;
  if (!(await isPublisherFeatureEnabled(actor.publisherId, PlatformFeatureKey.RESOURCES))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (!(await ownedResource(id, actor.publisherId))) return publisherAdminNotFound();
  const body = (await request.json()) as Record<string, unknown>;
  const target = parseTarget(body);
  const bookId = typeof body.bookId === "string" ? body.bookId : "";
  if (!target || !bookId) {
    return NextResponse.json({ message: "Select a book and content target." }, { status: 400 });
  }
  const audienceOverride = body.audienceOverride
    ? validateResourceAudience(body.audienceOverride)
    : null;
  if (body.audienceOverride && !audienceOverride) {
    return NextResponse.json({ message: "Select a valid audience override." }, { status: 400 });
  }
  try {
    const link = await attachResourceToBookContent({
      bookId,
      resourceId: id,
      ...target,
      audienceOverride,
      qrEligible: body.qrEligible === true,
    });
    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    return attachmentError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;
  if (!(await isPublisherFeatureEnabled(actor.publisherId, PlatformFeatureKey.RESOURCES))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (!(await ownedResource(id, actor.publisherId))) return publisherAdminNotFound();
  const body = (await request.json()) as Record<string, unknown>;
  const linkId = typeof body.linkId === "string" ? body.linkId : "";
  const bookId = typeof body.bookId === "string" ? body.bookId : "";
  if (!linkId || !bookId) {
    return NextResponse.json({ message: "Resource link not found." }, { status: 400 });
  }
  try {
    if (body.direction === -1 || body.direction === 1) {
      await moveBookResourceLink(bookId, linkId, body.direction);
    } else {
      const target = parseTarget(body);
      if (!target) {
        return NextResponse.json({ message: "Select a valid content target." }, { status: 400 });
      }
      const audienceOverride = body.audienceOverride
        ? validateResourceAudience(body.audienceOverride)
        : null;
      if (body.audienceOverride && !audienceOverride) {
        return NextResponse.json({ message: "Select a valid audience override." }, { status: 400 });
      }
      await updateBookResourceLink({
        bookId,
        linkId,
        ...target,
        audienceOverride,
        qrEligible: body.qrEligible === true,
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return attachmentError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;
  if (!(await isPublisherFeatureEnabled(actor.publisherId, PlatformFeatureKey.RESOURCES))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (!(await ownedResource(id, actor.publisherId))) return publisherAdminNotFound();
  const body = (await request.json()) as Record<string, unknown>;
  const linkId = typeof body.linkId === "string" ? body.linkId : "";
  const bookId = typeof body.bookId === "string" ? body.bookId : "";
  try {
    await detachResourceFromBookContent(bookId, linkId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return attachmentError(error);
  }
}

function attachmentError(error: unknown) {
  if (error instanceof BookResourceLinkError) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return NextResponse.json(
      { message: "This resource is already attached to that target." },
      { status: 409 },
    );
  }
  return NextResponse.json({ message: "Unable to update this attachment." }, { status: 400 });
}
