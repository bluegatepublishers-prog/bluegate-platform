import { NextResponse } from "next/server";
import {
  PlatformFeatureKey,
  ResourceType,
  SecurityAuditOutcome,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  authorizePublisherAdminApi,
  publisherAdminNotFound,
} from "@/lib/publisher-admin-authorization";
import { removeManagedResourceFile } from "@/lib/resource-files";
import { validateResourceAudience } from "@/lib/resource-audience";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { isPublisherUploadUrl } from "@/lib/storage/upload-policy";
import {
  publisherAdminAuditActor,
  recordTrustedDeniedAudit,
  writeSecurityAuditEvent,
} from "@/lib/security-audit";
import {
  normalizeOriginalFileName,
  normalizeResourceMimeType,
  parseResourceFileSizeBytes,
} from "@/lib/resource-helpers";
import { toResourceJson } from "@/lib/resource-json";
import { resolveResourceLinks, trimToNull } from "@/lib/resource-relations";

function hasOwn(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function readNullableId(
  payload: Record<string, unknown>,
  key: string,
  current: string | null,
) {
  if (!hasOwn(payload, key)) return current;
  return trimToNull(payload[key]);
}

async function removeIfUnreferencedFileUrl(resourceId: string, fileUrl: string | null) {
  if (!fileUrl) return;
  const count = await prisma.resource.count({
    where: { fileUrl, id: { not: resourceId } },
  });
  if (count === 0) await removeManagedResourceFile(fileUrl);
}

async function removeIfUnreferencedThumbnail(
  resourceId: string,
  thumbnail: string | null,
) {
  if (!thumbnail) return;
  const count = await prisma.resource.count({
    where: { thumbnail, id: { not: resourceId } },
  });
  if (count === 0) await removeManagedResourceFile(thumbnail);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;
  if (
    !(await isPublisherFeatureEnabled(
      actor.publisherId,
      PlatformFeatureKey.RESOURCES,
    ))
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const audience = validateResourceAudience(body.audience);
  if (!audience) {
    return NextResponse.json(
      { message: "Select a valid audience." },
      { status: 400 },
    );
  }

  const existing = await prisma.resource.findFirst({ where: { id, publisherId:actor.publisherId } });
  if (!existing) {
    await recordTrustedDeniedAudit({
      actor: publisherAdminAuditActor(actor),
      action: "publisher.resource.update",
      targetType: "Resource",
      reasonCode: "CROSS_TENANT_SCOPE",
      metadata: { scope: "publisher" },
    });
    return publisherAdminNotFound();
  }

  const title = trimToNull(body.title);
  if (!title) {
    return NextResponse.json({ message: "Title is required." }, { status: 400 });
  }

  const type = Object.values(ResourceType).includes(body.type as ResourceType)
    ? (body.type as ResourceType)
    : ResourceType.PDF;

  const fileUrl = trimToNull(body.fileUrl) ?? existing.fileUrl;
  const thumbnail = hasOwn(body, "thumbnail")
    ? trimToNull(body.thumbnail)
    : existing.thumbnail;

  if (
    (fileUrl !== existing.fileUrl &&
      !isPublisherUploadUrl(fileUrl, actor.publisherId, ["resource-file"])) ||
    (thumbnail !== existing.thumbnail &&
      !isPublisherUploadUrl(thumbnail, actor.publisherId, ["resource-thumbnail"]))
  ) {
    return NextResponse.json(
      { message: "Upload files through this publisher workspace." },
      { status: 400 },
    );
  }

  const classId = readNullableId(body, "classId", existing.classId);
  const subjectId = readNullableId(body, "subjectId", existing.subjectId);
  const seriesId = readNullableId(body, "seriesId", existing.seriesId);
  const bookId = readNullableId(body, "bookId", existing.bookId);

  const selectedClassLevel =
    typeof body.classLevel === "string" ? body.classLevel : existing.classLevel;
  const selectedSubject =
    typeof body.subject === "string" ? body.subject : existing.subject;

  const [classRecord, subjectRecord, seriesRecord, bookRecord] = await Promise.all([
    classId
      ? prisma.class.findFirst({
          where: { id: classId, active: true },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    subjectId
      ? prisma.subject.findFirst({
          where: { id: subjectId, active: true },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    seriesId
      ? prisma.bookSeries.findFirst({
          where: { id: seriesId, publisherId: actor.publisherId, active: true },
          select: { id: true },
        })
      : Promise.resolve(null),
    bookId
      ? prisma.book.findFirst({
          where: { id: bookId, publisherId: actor.publisherId },
          select: {
            id: true,
            classId: true,
            subjectId: true,
            seriesId: true,
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
        })
      : Promise.resolve(null),
  ]);

  const resolvedLinks = resolveResourceLinks({
    selected: {
      classId,
      subjectId,
      seriesId,
      bookId,
      classLevel: selectedClassLevel,
      subject: selectedSubject,
    },
    classRecord,
    subjectRecord,
    seriesRecord,
    bookRecord,
  });
  if (!resolvedLinks.ok) {
    return NextResponse.json({ message: resolvedLinks.message }, { status: 400 });
  }

  const originalFileNameInput =
    hasOwn(body, "originalFileName") && trimToNull(body.originalFileName)
      ? normalizeOriginalFileName(body.originalFileName)
      : null;
  if (hasOwn(body, "originalFileName") && trimToNull(body.originalFileName) && !originalFileNameInput) {
    return NextResponse.json(
      { message: "Provide a valid original file name." },
      { status: 400 },
    );
  }

  const mimeInputRaw = trimToNull(body.mimeType);
  const mimeTypeInput = mimeInputRaw ? normalizeResourceMimeType(mimeInputRaw) : null;
  if (mimeInputRaw && !mimeTypeInput) {
    return NextResponse.json(
      { message: "Provide a supported file type." },
      { status: 400 },
    );
  }

  const fileSizeInput = hasOwn(body, "fileSizeBytes")
    ? parseResourceFileSizeBytes(body.fileSizeBytes)
    : null;
  if (hasOwn(body, "fileSizeBytes") && trimToNull(body.fileSizeBytes) && !fileSizeInput) {
    return NextResponse.json(
      { message: "Provide a valid file size." },
      { status: 400 },
    );
  }

  const newFileUploaded = fileUrl !== existing.fileUrl;
  const newThumbnailUploaded = thumbnail !== existing.thumbnail;

  try {
    const resource = await prisma.$transaction(async (tx) => {
      const result = await tx.resource.updateMany({
        where: { id, publisherId: actor.publisherId },
        data: {
          title,
          description: trimToNull(body.description) || "",
          classLevel: resolvedLinks.data.classLevel,
          subject: resolvedLinks.data.subject,
          classId: resolvedLinks.data.classId,
          subjectId: resolvedLinks.data.subjectId,
          seriesId: resolvedLinks.data.seriesId,
          bookId: resolvedLinks.data.bookId,
          type,
          audience,
          fileUrl,
          thumbnail,
          originalFileName: originalFileNameInput ?? existing.originalFileName,
          mimeType: mimeTypeInput ?? existing.mimeType,
          fileSizeBytes: fileSizeInput ?? existing.fileSizeBytes,
          featured: Boolean(body.featured),
          published: body.published !== false,
        },
      });
      if (result.count !== 1) return null;

      const updated = await tx.resource.findFirst({
        where: { id, publisherId: actor.publisherId },
      });
      if (!updated) return null;

      const fileCount =
        Number(existing.fileUrl !== updated.fileUrl) +
        Number(existing.thumbnail !== updated.thumbnail);
      await writeSecurityAuditEvent(tx, {
        actor: publisherAdminAuditActor(actor),
        action: "publisher.resource.update",
        targetType: "Resource",
        targetId: id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: {
          changedFields: [
            "resourceMetadata",
            ...(fileCount ? ["fileAttachments"] : []),
            "publicationState",
          ],
          fileCount,
        },
      });
      return updated;
    });

    if (!resource) return publisherAdminNotFound();

    if (newFileUploaded) {
      await removeIfUnreferencedFileUrl(resource.id, existing.fileUrl);
    }
    if (newThumbnailUploaded) {
      await removeIfUnreferencedThumbnail(resource.id, existing.thumbnail);
    }

    return NextResponse.json(toResourceJson(resource));
  } catch {
    if (newFileUploaded) {
      await removeManagedResourceFile(fileUrl);
    }
    if (newThumbnailUploaded) {
      await removeManagedResourceFile(thumbnail);
    }
    console.warn("Resource update failed", { code: "UPDATE_FAILED" });
    return NextResponse.json(
      {
        message:
          "The resource could not be updated. Previous files were kept unchanged.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;
  if (
    !(await isPublisherFeatureEnabled(
      actor.publisherId,
      PlatformFeatureKey.RESOURCES,
    ))
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  if (typeof body.published !== "boolean") {
    return NextResponse.json(
      { message: "Published status is required." },
      { status: 400 },
    );
  }
  const published = body.published;

  const resource = await prisma.resource.findFirst({
    where: { id, publisherId: actor.publisherId },
  });
  if (!resource) {
    await recordTrustedDeniedAudit({
      actor: publisherAdminAuditActor(actor),
      action: "publisher.resource.update",
      targetType: "Resource",
      reasonCode: "CROSS_TENANT_SCOPE",
      metadata: { scope: "publisher" },
    });
    return publisherAdminNotFound();
  }

  const updated = await prisma.resource.update({
    where: { id: resource.id },
    data: { published },
  });

  await prisma.$transaction(async (tx) => {
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.resource.update",
      targetType: "Resource",
      targetId: resource.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: ["publicationState"], published },
    });
  });

  return NextResponse.json(toResourceJson(updated));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;
  if (
    !(await isPublisherFeatureEnabled(
      actor.publisherId,
      PlatformFeatureKey.RESOURCES,
    ))
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const resource = await prisma.$transaction(async (tx) => {
    const owned = await tx.resource.findFirst({ where: { id, publisherId:actor.publisherId } });
    if (!owned) return null;

    const deleted = await tx.resource.deleteMany({ where: { id, publisherId: actor.publisherId } });
    if (deleted.count !== 1) return null;

    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.resource.delete",
      targetType: "Resource",
      targetId: id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: {
        fileOperation: "delete_requested",
        fileCount: owned.thumbnail ? 2 : 1,
      },
    });
    return owned;
  });

  if (!resource) {
    await recordTrustedDeniedAudit({
      actor: publisherAdminAuditActor(actor),
      action: "publisher.resource.delete",
      targetType: "Resource",
      reasonCode: "CROSS_TENANT_SCOPE",
      metadata: { scope: "publisher" },
    });
    return publisherAdminNotFound();
  }

  const [fileRefCount, thumbnailRefCount] = await Promise.all([
    prisma.resource.count({ where: { fileUrl: resource.fileUrl } }),
    resource.thumbnail
      ? prisma.resource.count({ where: { thumbnail: resource.thumbnail } })
      : Promise.resolve(0),
  ]);

  if (fileRefCount === 0) {
    await removeManagedResourceFile(resource.fileUrl);
  }
  if (resource.thumbnail && thumbnailRefCount === 0) {
    await removeManagedResourceFile(resource.thumbnail);
  }

  return NextResponse.json({ success: true, message: "Resource deleted." });
}
