import { NextResponse } from "next/server";
import {
  PlatformFeatureKey,
  ResourceType,
  SecurityAuditOutcome,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { validateResourceAudience } from "@/lib/resource-audience";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { isPublisherStorageValue } from "@/lib/storage/upload-policy";
import {
  publisherAdminAuditActor,
  writeSecurityAuditEvent,
} from "@/lib/security-audit";
import { removeManagedResourceFile } from "@/lib/resource-files";
import {
  normalizeOriginalFileName,
  normalizeResourceMimeType,
  parseResourceFileSizeBytes,
} from "@/lib/resource-helpers";
import {
  toResourceJson,
  toResourceJsonList,
} from "@/lib/resource-json";
import {
  isSafeExternalResourceUrl,
  listPublisherResources,
  normalizeResourceLibraryQuery,
  type ResourceLibraryQueryInput,
} from "@/lib/admin-resource-library";
import {
  resolveResourceLinks,
  trimToNull,
} from "@/lib/resource-relations";

export async function GET(request: Request) {
  const { actor, response } =
    await authorizePublisherAdminApi();

  if (response) return response;

  if (
    !(await isPublisherFeatureEnabled(
      actor.publisherId,
      PlatformFeatureKey.RESOURCES,
    ))
  ) {
    return NextResponse.json(
      { message: "Forbidden" },
      { status: 403 },
    );
  }

  const url = new URL(request.url);

  if (url.searchParams.get("paginated") === "true") {
    const input = Object.fromEntries(
      url.searchParams,
    ) as ResourceLibraryQueryInput;

    const query = normalizeResourceLibraryQuery(input);
    const result = await listPublisherResources(
      actor.publisherId,
      query,
    );

    return NextResponse.json(result);
  }

  const resources = await prisma.resource.findMany({
    where: { publisherId: actor.publisherId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(toResourceJsonList(resources));
}

export async function POST(request: Request) {
  const { actor, response } =
    await authorizePublisherAdminApi();

  if (response) return response;

  if (
    !(await isPublisherFeatureEnabled(
      actor.publisherId,
      PlatformFeatureKey.RESOURCES,
    ))
  ) {
    return NextResponse.json(
      { message: "Forbidden" },
      { status: 403 },
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const audience = validateResourceAudience(body.audience);
  const title = trimToNull(body.title);
  const fileUrl = trimToNull(body.fileUrl);

  if (!title || !fileUrl) {
    return NextResponse.json(
      { message: "Title and file are required." },
      { status: 400 },
    );
  }

  if (!audience) {
    return NextResponse.json(
      { message: "Select a valid audience." },
      { status: 400 },
    );
  }

  const inputType = body.type as ResourceType;
  const type = Object.values(ResourceType).includes(inputType)
    ? inputType
    : ResourceType.PDF;

  const thumbnail = trimToNull(body.thumbnail);
  const validPrimaryValue =
    type === ResourceType.LINK
      ? isSafeExternalResourceUrl(fileUrl)
      : isPublisherStorageValue(
          fileUrl,
          actor.publisherId,
          ["resource-file"],
        );

  const validThumbnail = isPublisherStorageValue(
    thumbnail,
    actor.publisherId,
    ["resource-thumbnail"],
  );

  if (!validPrimaryValue || !validThumbnail) {
    return NextResponse.json(
      {
        message:
          type === ResourceType.LINK
            ? "Enter a valid HTTPS link."
            : "Upload files through this publisher workspace.",
      },
      { status: 400 },
    );
  }

  const classId = trimToNull(body.classId);
  const subjectId = trimToNull(body.subjectId);
  const seriesId = trimToNull(body.seriesId);
  const bookId = trimToNull(body.bookId);
  const classLevel = String(body.classLevel ?? "");
  const subject = String(body.subject ?? "");

  const [classRecord, subjectRecord, seriesRecord, bookRecord] =
    await Promise.all([
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
            where: {
              id: seriesId,
              publisherId: actor.publisherId,
              active: true,
            },
            select: { id: true },
          })
        : Promise.resolve(null),

      bookId
        ? prisma.book.findFirst({
            where: {
              id: bookId,
              publisherId: actor.publisherId,
            },
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
      classLevel,
      subject,
    },
    classRecord,
    subjectRecord,
    seriesRecord,
    bookRecord,
  });

  if (!resolvedLinks.ok) {
    return NextResponse.json(
      { message: resolvedLinks.message },
      { status: 400 },
    );
  }

  const originalFileName = normalizeOriginalFileName(
    body.originalFileName,
  );
  const mimeRaw = trimToNull(body.mimeType);
  const mimeType = mimeRaw
    ? normalizeResourceMimeType(mimeRaw)
    : null;

  if (mimeRaw && !mimeType) {
    return NextResponse.json(
      { message: "Provide a supported file type." },
      { status: 400 },
    );
  }

  if (
    type === ResourceType.IMAGE &&
    !mimeType?.startsWith("image/")
  ) {
    return NextResponse.json(
      { message: "Image resources require an image file." },
      { status: 400 },
    );
  }

  const hasFileSize = Object.prototype.hasOwnProperty.call(
    body,
    "fileSizeBytes",
  );
  const fileSizeBytes = hasFileSize
    ? parseResourceFileSizeBytes(body.fileSizeBytes)
    : null;

  if (
    hasFileSize &&
    trimToNull(body.fileSizeBytes) &&
    !fileSizeBytes
  ) {
    return NextResponse.json(
      { message: "Provide a valid file size." },
      { status: 400 },
    );
  }

  try {
    const resource = await prisma.$transaction(async (tx) => {
      const created = await tx.resource.create({
        data: {
          publisherId: actor.publisherId,
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
          originalFileName,
          mimeType,
          fileSizeBytes,
          featured: Boolean(body.featured),
          published: body.published !== false,
          publishedAt:
            body.published !== false ? new Date() : null,
        },
      });

      await writeSecurityAuditEvent(tx, {
        actor: publisherAdminAuditActor(actor),
        action: "publisher.resource.create",
        targetType: "Resource",
        targetId: created.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: {
          fileCount: created.thumbnail ? 2 : 1,
        },
      });

      return created;
    });

    return NextResponse.json(toResourceJson(resource), {
      status: 201,
    });
  } catch (error) {
    console.error(
      "Publisher resource creation failed:",
      error,
    );

    await Promise.all([
      fileUrl
        ? removeManagedResourceFile(fileUrl)
        : Promise.resolve(),
      thumbnail
        ? removeManagedResourceFile(thumbnail)
        : Promise.resolve(),
    ]);

    return NextResponse.json(
      {
        message:
          process.env.NODE_ENV === "development" &&
          error instanceof Error
            ? `Resource creation failed: ${error.message}`
            : "The resource could not be created. Uploaded files were cleaned up.",
      },
      { status: 400 },
    );
  }
}