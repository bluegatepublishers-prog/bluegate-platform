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
import { isPublisherStorageValue } from "@/lib/storage/upload-policy";
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
import { isSafeExternalResourceUrl } from "@/lib/admin-resource-library";
import { findPublisherVideoContentReferences } from "@/lib/content-video-references";
import { findPublisherImageContentReferences } from "@/lib/content-image-references";

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

async function removeIfUnreferencedFileUrl(resourceId: string, fileUrl: string | null, publisherId: string) {
  if (!fileUrl) return;
  const count = await prisma.resource.count({
    where: { fileUrl, id: { not: resourceId } },
  });
  if (count === 0) await removeManagedResourceFile(fileUrl, { publisherId });
}

async function removeIfUnreferencedThumbnail(
  resourceId: string,
  thumbnail: string | null,
  publisherId: string,
) {
  if (!thumbnail) return;
  const count = await prisma.resource.count({
    where: { thumbnail, id: { not: resourceId } },
  });
  if (count === 0) await removeManagedResourceFile(thumbnail, { publisherId });
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
    !(type === ResourceType.LINK
      ? isSafeExternalResourceUrl(fileUrl)
      : isPublisherStorageValue(fileUrl, actor.publisherId, ["resource-file"])) ||
    (thumbnail !== existing.thumbnail &&
      !isPublisherStorageValue(thumbnail, actor.publisherId, ["resource-thumbnail"]))
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
          publishedAt: body.published !== false ? existing.publishedAt ?? new Date() : null,
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
      await removeIfUnreferencedFileUrl(resource.id, existing.fileUrl, actor.publisherId);
    }
    if (newThumbnailUploaded) {
      await removeIfUnreferencedThumbnail(resource.id, existing.thumbnail, actor.publisherId);
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
  const requestedAction =
    typeof body.action === "string" ? body.action : null;
  const validActions = new Set(["publish", "unpublish", "archive", "restore"]);
  if (
    typeof body.published !== "boolean" &&
    (!requestedAction || !validActions.has(requestedAction))
  ) {
    return NextResponse.json(
      { message: "A valid lifecycle action is required." },
      { status: 400 },
    );
  }

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

  const action =
    requestedAction ??
    (body.published === true ? "publish" : "unpublish");
  if (resource.archived && action !== "restore") {
    return NextResponse.json(
      { message: "Restore the resource before changing its publication state." },
      { status: 409 },
    );
  }
  const now = new Date();
  const updated = await prisma.resource.update({
    where: { id: resource.id },
    data:
      action === "archive"
        ? { archived: true, archivedAt: now, published: false }
        : action === "restore"
          ? { archived: false, archivedAt: null }
          : action === "publish"
            ? { published: true, publishedAt: resource.publishedAt ?? now }
            : { published: false, publishedAt: null },
  });

  await prisma.$transaction(async (tx) => {
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.resource.update",
      targetType: "Resource",
      targetId: resource.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: {
        changedFields:
          action === "archive" || action === "restore"
            ? ["archived", "publicationState"]
            : ["publicationState"],
        fromStatus: resource.archived
          ? "ARCHIVED"
          : resource.published
            ? "PUBLISHED"
            : "DRAFT",
        toStatus: updated.archived
          ? "ARCHIVED"
          : updated.published
            ? "PUBLISHED"
            : "DRAFT",
      },
    });
  });

  return NextResponse.json({
    ...toResourceJson(updated),
    message:
      action === "archive"
        ? "Resource archived."
        : action === "restore"
          ? "Resource restored."
          : action === "publish"
            ? "Resource published."
            : "Resource moved to draft.",
  });
}

export async function DELETE(
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
  const libraryAction = new URL(request.url).searchParams.get("library");
  const archiveFromVideoLibrary = libraryAction === "video";
  const archiveFromImageLibrary = libraryAction === "image";
  if (archiveFromImageLibrary) {
    const image = await prisma.resource.findFirst({
      where: { id, publisherId: actor.publisherId },
      select: {
        type: true,
        _count: { select: { bookResourceLinks: { where: { active: true } } } },
      },
    });
    if (!image) return publisherAdminNotFound();
    if (image.type !== ResourceType.IMAGE) {
      return NextResponse.json({ message: "This action is available only for Image resources." }, { status: 400 });
    }
    const contentReferences = await findPublisherImageContentReferences(actor.publisherId, id);
    const references = image._count.bookResourceLinks + contentReferences.length;
    if (references) {
      return NextResponse.json({
        message: "Image is currently used in " + references + " place" + (references === 1 ? "" : "s") + ".",
        references: contentReferences,
      }, { status: 409 });
    }
  }
  if (archiveFromVideoLibrary) {
    const video = await prisma.resource.findFirst({
      where: { id, publisherId: actor.publisherId },
      select: {
        type: true,
        _count: { select: { bookResourceLinks: { where: { active: true } } } },
      },
    });
    if (!video) return publisherAdminNotFound();
    if (video.type !== ResourceType.VIDEO) {
      return NextResponse.json({ message: "This action is available only for Video resources." }, { status: 400 });
    }
    const contentReferences = await findPublisherVideoContentReferences(actor.publisherId, id);
    const references = video._count.bookResourceLinks + contentReferences.length;
    if (references) {
      return NextResponse.json({
        message: "Video cannot be deleted because it is currently used in " + references + " place" + (references === 1 ? "" : "s") + ".",
        references: contentReferences,
      }, { status: 409 });
    }
  }
  if (new URL(request.url).searchParams.get("permanent") === "true") {
    const owned = await prisma.resource.findFirst({
      where: { id, publisherId: actor.publisherId },
      select: {
        _count: {
          select: {
            bookResourceLinks: true,
            schoolEntitlements: true,
            bookmarks: true,
            downloads: true,
            studentBookmarks: true,
            studentDownloads: true,
            classMaterials: true,
            assignmentAttachments: true,
          },
        },
      },
    });
    if (!owned) return publisherAdminNotFound();
    const references = Object.values(owned._count).reduce(
      (total, count) => total + count,
      0,
    );
    return NextResponse.json(
      {
        message: references
          ? `Permanent deletion is blocked because this resource has ${references} reference${references === 1 ? "" : "s"}. Archive it instead.`
          : "Permanent deletion is disabled until durable object-storage cleanup is configured. Archive the resource instead.",
      },
      { status: 409 },
    );
  }
  const resource = await prisma.$transaction(async (tx) => {
    const owned = await tx.resource.findFirst({ where: { id, publisherId:actor.publisherId } });
    if (!owned) return null;

    const archived = await tx.resource.updateMany({
      where: { id, publisherId: actor.publisherId },
      data: { archived: true, archivedAt: new Date(), published: false },
    });
    if (archived.count !== 1) return null;

    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.resource.delete",
      targetType: "Resource",
      targetId: id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: {
        changedFields: ["archived", "publicationState"],
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

  return NextResponse.json({ success: true, message: archiveFromVideoLibrary ? "Unused Video archived from the library." : archiveFromImageLibrary ? "Unused Image archived from the library." : "Resource archived." });
}
