import {
  BookContentTargetType,
  PlatformFeatureKey,
  Prisma,
  ResourceAudience,
} from "@prisma/client";
import { NextResponse } from "next/server";

import {
  attachResourceToBookContent,
  BookResourceLinkError,
  detachResourceFromBookContent,
  updateBookResourceLink,
} from "@/lib/book-resource-links";
import {
  buildResourceLibraryWhere,
  normalizeResourceLibraryQuery,
} from "@/lib/admin-resource-library";
import { prisma } from "@/lib/prisma";
import {
  authorizePublisherAdminApi,
  publisherAdminNotFound,
} from "@/lib/publisher-admin-authorization";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";

type PublicTargetType =
  | "Book"
  | "BookPart"
  | "BookUnit"
  | "BookChapter"
  | "BookModule"
  | "BookTopic";

const TARGET_TYPES: Record<PublicTargetType, BookContentTargetType> = {
  Book: BookContentTargetType.BOOK,
  BookPart: BookContentTargetType.PART,
  BookUnit: BookContentTargetType.UNIT,
  BookChapter: BookContentTargetType.CHAPTER,
  BookModule: BookContentTargetType.MODULE,
  BookTopic: BookContentTargetType.TOPIC,
};

const ENUM_TARGET_TYPES: Record<BookContentTargetType, PublicTargetType> = {
  [BookContentTargetType.BOOK]: "Book",
  [BookContentTargetType.PART]: "BookPart",
  [BookContentTargetType.UNIT]: "BookUnit",
  [BookContentTargetType.CHAPTER]: "BookChapter",
  [BookContentTargetType.MODULE]: "BookModule",
  [BookContentTargetType.TOPIC]: "BookTopic",
};

const LINK_SELECT = {
  id: true,
  bookId: true,
  resourceId: true,
  targetType: true,
  partId: true,
  unitId: true,
  chapterId: true,
  moduleId: true,
  topicId: true,
  audienceOverride: true,
  qrEligible: true,
  displayOrder: true,
  resource: {
    select: {
      title: true,
      type: true,
      audience: true,
      published: true,
      archived: true,
      originalFileName: true,
      fileUrl: true,
    },
  },
} as const;

type LinkRecord = Prisma.BookResourceLinkGetPayload<{
  select: typeof LINK_SELECT;
}>;

type ResolvedTarget = {
  publicType: PublicTargetType;
  internalType: BookContentTargetType;
  targetId: string;
  title: string;
  bookId: string;
  bookTitle: string;
  targetKey: string;
};

export async function GET(request: Request) {
  const access = await authorizeRequest();
  if (access.response) return access.response;

  const searchParams = new URL(request.url).searchParams;
  const publicType = parseTargetType(searchParams.get("targetType"));
  const targetId = searchParams.get("targetId")?.trim() ?? "";
  if (!publicType || !targetId) {
    return NextResponse.json(
      { message: "Select a valid resource target." },
      { status: 400 },
    );
  }

  const target = await resolveTarget(
    publicType,
    targetId,
    access.publisherId,
  );
  if (!target) return publisherAdminNotFound();

  const query = normalizeResourceLibraryQuery({
    query: searchParams.get("q") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    sort: "title_asc",
  });
  const resourceWhere = buildResourceLibraryWhere(
    access.publisherId,
    query,
  );

  const [attachments, total] = await Promise.all([
    prisma.bookResourceLink.findMany({
      where: {
        publisherId: access.publisherId,
        bookId: target.bookId,
        targetKey: target.targetKey,
        active: true,
      },
      select: LINK_SELECT,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.resource.count({ where: resourceWhere }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, totalPages);
  const resources = await prisma.resource.findMany({
    where: resourceWhere,
    select: {
      id: true,
      title: true,
      type: true,
      audience: true,
      published: true,
      archived: true,
    },
    orderBy: [{ title: "asc" }, { id: "asc" }],
    skip: (page - 1) * query.pageSize,
    take: query.pageSize,
  });
  const attachedResourceIds = new Set(
    attachments.map((attachment) => attachment.resourceId),
  );

  return NextResponse.json({
    target: targetResponse(target),
    attachments: attachments.map(linkResponse),
    resources: resources.map((resource) => ({
      resourceId: resource.id,
      title: resource.title,
      type: resource.type,
      audience: resource.audience,
      published: resource.published,
      archived: resource.archived,
      alreadyAttached: attachedResourceIds.has(resource.id),
    })),
    pagination: {
      page,
      pageSize: query.pageSize,
      total,
      totalPages,
    },
  });
}

export async function POST(request: Request) {
  const access = await authorizeRequest();
  if (access.response) return access.response;

  const body = await requestBody(request);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }
  const publicType = parseTargetType(body.targetType);
  const targetId = stringValue(body.targetId);
  const resourceId = stringValue(body.resourceId);
  if (!publicType || !targetId || !resourceId) {
    return NextResponse.json(
      { message: "Select a valid target and resource." },
      { status: 400 },
    );
  }

  const [target, resource] = await Promise.all([
    resolveTarget(publicType, targetId, access.publisherId),
    prisma.resource.findFirst({
      where: {
        id: resourceId,
        publisherId: access.publisherId,
        archived: false,
      },
      select: { id: true },
    }),
  ]);
  if (!target || !resource) return publisherAdminNotFound();

  const audience = parseAudienceOverride(body);
  const displayOrder = parseDisplayOrder(body);
  if (!audience.valid || !displayOrder.valid) {
    return NextResponse.json(
      {
        message: !audience.valid
          ? "Select a valid audience override."
          : "Display order must be a non-negative integer.",
      },
      { status: 400 },
    );
  }
  if (
    Object.hasOwn(body, "qrEligible") &&
    typeof body.qrEligible !== "boolean"
  ) {
    return NextResponse.json(
      { message: "QR eligibility must be true or false." },
      { status: 400 },
    );
  }

  const duplicate = await prisma.bookResourceLink.findFirst({
    where: {
      publisherId: access.publisherId,
      resourceId,
      targetKey: target.targetKey,
      active: true,
    },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json(
      { message: "This resource is already attached to that target." },
      { status: 409 },
    );
  }

  try {
    const link = await attachResourceToBookContent({
      bookId: target.bookId,
      resourceId,
      targetType: target.internalType,
      ids: targetIds(target),
      audienceOverride: audience.value,
      qrEligible: body.qrEligible === true,
    });
    if (displayOrder.supplied) {
      await prisma.bookResourceLink.update({
        where: { id: link.id },
        data: { displayOrder: displayOrder.value },
      });
    }
    const saved = await ownedLink(link.id, access.publisherId);
    return NextResponse.json(
      { link: saved ? linkResponse(saved) : null },
      { status: 201 },
    );
  } catch (error) {
    return mutationError(error);
  }
}

export async function PATCH(request: Request) {
  const access = await authorizeRequest();
  if (access.response) return access.response;

  const body = await requestBody(request);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }
  const linkId = stringValue(body.linkId);
  if (!linkId) {
    return NextResponse.json(
      { message: "Resource link not found." },
      { status: 400 },
    );
  }
  const link = await ownedLink(linkId, access.publisherId);
  if (!link) return publisherAdminNotFound();

  const audience = parseAudienceOverride(body);
  const displayOrder = parseDisplayOrder(body);
  if (!audience.valid || !displayOrder.valid) {
    return NextResponse.json(
      {
        message: !audience.valid
          ? "Select a valid audience override."
          : "Display order must be a non-negative integer.",
      },
      { status: 400 },
    );
  }
  const qrSupplied = Object.hasOwn(body, "qrEligible");
  if (qrSupplied && typeof body.qrEligible !== "boolean") {
    return NextResponse.json(
      { message: "QR eligibility must be true or false." },
      { status: 400 },
    );
  }
  if (!audience.supplied && !qrSupplied && !displayOrder.supplied) {
    return NextResponse.json(
      { message: "No supported changes were supplied." },
      { status: 400 },
    );
  }

  try {
    if (audience.supplied || qrSupplied) {
      await updateBookResourceLink({
        bookId: link.bookId,
        linkId: link.id,
        targetType: link.targetType,
        ids: {
          partId: link.partId,
          unitId: link.unitId,
          chapterId: link.chapterId,
          moduleId: link.moduleId,
          topicId: link.topicId,
        },
        audienceOverride: audience.supplied
          ? audience.value
          : link.audienceOverride,
        qrEligible: qrSupplied ? body.qrEligible === true : link.qrEligible,
      });
    }
    if (displayOrder.supplied) {
      await prisma.bookResourceLink.update({
        where: { id: link.id },
        data: { displayOrder: displayOrder.value },
      });
    }
    const saved = await ownedLink(link.id, access.publisherId);
    return NextResponse.json({ link: saved ? linkResponse(saved) : null });
  } catch (error) {
    return mutationError(error);
  }
}

export async function DELETE(request: Request) {
  const access = await authorizeRequest();
  if (access.response) return access.response;

  const body = await requestBody(request);
  const linkId = body ? stringValue(body.linkId) : "";
  if (!linkId) {
    return NextResponse.json(
      { message: "Resource link not found." },
      { status: 400 },
    );
  }
  const link = await ownedLink(linkId, access.publisherId);
  if (!link) return publisherAdminNotFound();

  try {
    await detachResourceFromBookContent(link.bookId, link.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return mutationError(error);
  }
}

async function authorizeRequest() {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return { publisherId: "", response };
  if (
    !(await isPublisherFeatureEnabled(
      actor.publisherId,
      PlatformFeatureKey.RESOURCES,
    ))
  ) {
    return {
      publisherId: "",
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }
  return { publisherId: actor.publisherId, response: null };
}

function parseTargetType(value: unknown): PublicTargetType | null {
  if (typeof value !== "string") return null;
  if (value in TARGET_TYPES) return value as PublicTargetType;
  return Object.values(BookContentTargetType).includes(
    value as BookContentTargetType,
  )
    ? ENUM_TARGET_TYPES[value as BookContentTargetType]
    : null;
}

async function resolveTarget(
  publicType: PublicTargetType,
  targetId: string,
  publisherId: string,
): Promise<ResolvedTarget | null> {
  const internalType = TARGET_TYPES[publicType];
  if (internalType === BookContentTargetType.BOOK) {
    const book = await prisma.book.findFirst({
      where: { id: targetId, publisherId, archived: false },
      select: { id: true, title: true },
    });
    return book
      ? {
          publicType,
          internalType,
          targetId: book.id,
          title: book.title,
          bookId: book.id,
          bookTitle: book.title,
          targetKey: `${internalType}:${book.id}`,
        }
      : null;
  }

  const node =
    internalType === BookContentTargetType.PART
      ? await prisma.bookPart.findFirst({
          where: { id: targetId, archived: false },
          select: { id: true, title: true, bookId: true },
        })
      : internalType === BookContentTargetType.UNIT
        ? await prisma.bookUnit.findFirst({
            where: { id: targetId, archived: false },
            select: { id: true, title: true, bookId: true },
          })
        : internalType === BookContentTargetType.CHAPTER
          ? await prisma.bookChapter.findFirst({
              where: { id: targetId, archived: false },
              select: { id: true, title: true, bookId: true },
            })
          : internalType === BookContentTargetType.MODULE
            ? await prisma.bookModule.findFirst({
                where: { id: targetId, archived: false },
                select: { id: true, title: true, bookId: true },
              })
            : await prisma.bookTopic.findFirst({
                where: { id: targetId, archived: false },
                select: { id: true, title: true, bookId: true },
              });
  if (!node) return null;

  const book = await prisma.book.findFirst({
    where: { id: node.bookId, publisherId, archived: false },
    select: { id: true, title: true },
  });
  return book
    ? {
        publicType,
        internalType,
        targetId: node.id,
        title: node.title,
        bookId: book.id,
        bookTitle: book.title,
        targetKey: `${internalType}:${node.id}`,
      }
    : null;
}

async function ownedLink(id: string, publisherId: string) {
  return prisma.bookResourceLink.findFirst({
    where: {
      id,
      publisherId,
      active: true,
      book: { publisherId },
      resource: { publisherId },
    },
    select: LINK_SELECT,
  });
}

function targetIds(target: ResolvedTarget) {
  return {
    partId:
      target.internalType === BookContentTargetType.PART
        ? target.targetId
        : null,
    unitId:
      target.internalType === BookContentTargetType.UNIT
        ? target.targetId
        : null,
    chapterId:
      target.internalType === BookContentTargetType.CHAPTER
        ? target.targetId
        : null,
    moduleId:
      target.internalType === BookContentTargetType.MODULE
        ? target.targetId
        : null,
    topicId:
      target.internalType === BookContentTargetType.TOPIC
        ? target.targetId
        : null,
  };
}

function targetResponse(target: ResolvedTarget) {
  return {
    targetType: target.publicType,
    targetId: target.targetId,
    title: target.title,
    bookId: target.bookId,
    bookTitle: target.bookTitle,
  };
}

function linkResponse(link: LinkRecord) {
  return {
    linkId: link.id,
    resourceId: link.resourceId,
    title: link.resource.title,
    type: link.resource.type,
    audience: link.resource.audience,
    audienceOverride: link.audienceOverride,
    published: link.resource.published,
    archived: link.resource.archived,
    qrEligible: link.qrEligible,
    displayOrder: link.displayOrder,
    fileName: link.resource.originalFileName,
    externalHost:
      link.resource.originalFileName === null
        ? safeExternalHost(link.resource.fileUrl)
        : null,
  };
}

function safeExternalHost(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.hostname : null;
  } catch {
    return null;
  }
}

function parseAudienceOverride(body: Record<string, unknown>) {
  const supplied = Object.hasOwn(body, "audienceOverride");
  if (!supplied) {
    return { supplied: false, valid: true, value: null as ResourceAudience | null };
  }
  const value = body.audienceOverride;
  if (value === null || value === "") {
    return { supplied: true, valid: true, value: null as ResourceAudience | null };
  }
  const valid =
    typeof value === "string" &&
    Object.values(ResourceAudience).includes(value as ResourceAudience);
  return {
    supplied: true,
    valid,
    value: valid ? (value as ResourceAudience) : null,
  };
}

function parseDisplayOrder(body: Record<string, unknown>) {
  const supplied = Object.hasOwn(body, "displayOrder");
  if (!supplied) {
    return { supplied: false, valid: true, value: 0 };
  }
  const value = body.displayOrder;
  return {
    supplied: true,
    valid:
      typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0,
    value: typeof value === "number" ? value : 0,
  };
}

async function requestBody(request: Request) {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function mutationError(error: unknown) {
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
  return NextResponse.json(
    { message: "Unable to update this resource attachment." },
    { status: 400 },
  );
}
