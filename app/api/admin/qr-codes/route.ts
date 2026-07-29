import {
  BookContentTargetType,
  Prisma,
  QrAccessAudience,
  QrStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireQrAdmin } from "@/lib/qr/qr-authorization";
import {
  createQrCode,
  jsonObject,
  qrErrorResponse,
} from "@/lib/qr/qr-service";

export const dynamic = "force-dynamic";

const qrInclude = {
  book: {
    select: {
      id: true,
      title: true,
    },
  },
  part: {
    select: {
      id: true,
      title: true,
    },
  },
  unit: {
    select: {
      id: true,
      title: true,
    },
  },
  chapter: {
    select: {
      id: true,
      title: true,
      chapterNumber: true,
    },
  },
  module: {
    select: {
      id: true,
      title: true,
    },
  },
  topic: {
    select: {
      id: true,
      title: true,
    },
  },
  currentDestination: {
    select: {
      id: true,
      type: true,
      resourceId: true,
      bookResourceLinkId: true,
      validatedExternalUrl: true,
      externalHost: true,
      internalRoute: true,
      audience: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.DynamicQrCodeInclude;

type QrWithDisplayRelations = Prisma.DynamicQrCodeGetPayload<{
  include: typeof qrInclude;
}>;

function fallbackTarget(type: BookContentTargetType, id: string | null) {
  const label = type.charAt(0) + type.slice(1).toLowerCase();
  return {
    type,
    id,
    title: id ? `${label} · ${id}` : `${label} unavailable`,
    subtitle: label,
  };
}

function normalizeQrRecord(qrCode: QrWithDisplayRelations) {
  const {
    part,
    unit,
    chapter,
    module,
    topic,
    ...record
  } = qrCode;

  let target;
  switch (qrCode.targetType) {
    case BookContentTargetType.BOOK:
      target = {
        type: qrCode.targetType,
        id: qrCode.book.id,
        title: qrCode.book.title,
        subtitle: "Book",
      };
      break;
    case BookContentTargetType.PART:
      target = part
        ? { type: qrCode.targetType, ...part, subtitle: "Part" }
        : fallbackTarget(qrCode.targetType, qrCode.partId);
      break;
    case BookContentTargetType.UNIT:
      target = unit
        ? { type: qrCode.targetType, ...unit, subtitle: "Unit" }
        : fallbackTarget(qrCode.targetType, qrCode.unitId);
      break;
    case BookContentTargetType.CHAPTER:
      target = chapter
        ? {
            type: qrCode.targetType,
            id: chapter.id,
            title: chapter.title,
            subtitle: `Chapter ${chapter.chapterNumber}`,
          }
        : fallbackTarget(qrCode.targetType, qrCode.chapterId);
      break;
    case BookContentTargetType.MODULE:
      target = module
        ? { type: qrCode.targetType, ...module, subtitle: "Module" }
        : fallbackTarget(qrCode.targetType, qrCode.moduleId);
      break;
    case BookContentTargetType.TOPIC:
      target = topic
        ? { type: qrCode.targetType, ...topic, subtitle: "Topic" }
        : fallbackTarget(qrCode.targetType, qrCode.topicId);
      break;
  }

  return { ...record, target };
}

function invalidFilter(field: string) {
  return Response.json(
    {
      error: `${field} is invalid.`,
      reasonCode: `INVALID_${field.toUpperCase()}`,
    },
    { status: 400 },
  );
}

export async function GET(request: Request) {
  try {
    const actor = await requireQrAdmin();
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ??
      url.searchParams.get("q") ??
      "")
      .trim()
      .slice(0, 100);
    const bookId = (url.searchParams.get("bookId") ?? "").trim().slice(0, 191);
    const statusValue = url.searchParams.get("status");
    const audienceValue = url.searchParams.get("audience");
    const targetTypeValue = url.searchParams.get("targetType");
    const pageValue = Number(url.searchParams.get("page") ?? "1");
    const pageSizeValue = Number(url.searchParams.get("pageSize") ?? "25");

    if (
      statusValue &&
      !Object.values(QrStatus).includes(statusValue as QrStatus)
    ) {
      return invalidFilter("status");
    }
    if (
      audienceValue &&
      !Object.values(QrAccessAudience).includes(
        audienceValue as QrAccessAudience,
      )
    ) {
      return invalidFilter("audience");
    }
    if (
      targetTypeValue &&
      !Object.values(BookContentTargetType).includes(
        targetTypeValue as BookContentTargetType,
      )
    ) {
      return invalidFilter("targetType");
    }
    if (!Number.isInteger(pageValue) || pageValue < 1) {
      return invalidFilter("page");
    }
    if (
      !Number.isInteger(pageSizeValue) ||
      pageSizeValue < 1 ||
      pageSizeValue > 100
    ) {
      return invalidFilter("pageSize");
    }

    const status = statusValue as QrStatus | null;
    const audience = audienceValue as QrAccessAudience | null;
    const targetType = targetTypeValue as BookContentTargetType | null;
    const where: Prisma.DynamicQrCodeWhereInput = {
      ...(actor.role === "ADMIN" ? { publisherId: actor.publisherId! } : {}),
      ...(bookId ? { bookId } : {}),
      ...(status ? { status } : {}),
      ...(audience ? { audience } : {}),
      ...(targetType ? { targetType } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { publicCode: { contains: search.toUpperCase() } },
              { book: { title: { contains: search, mode: "insensitive" } } },
              { part: { title: { contains: search, mode: "insensitive" } } },
              { unit: { title: { contains: search, mode: "insensitive" } } },
              { chapter: { title: { contains: search, mode: "insensitive" } } },
              { module: { title: { contains: search, mode: "insensitive" } } },
              { topic: { title: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.dynamicQrCode.findMany({
        where,
        include: qrInclude,
        orderBy: { updatedAt: "desc" },
        skip: (pageValue - 1) * pageSizeValue,
        take: pageSizeValue,
      }),
      prisma.dynamicQrCode.count({ where }),
    ]);

    return Response.json({
      items: items.map(normalizeQrRecord),
      pagination: {
        page: pageValue,
        pageSize: pageSizeValue,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSizeValue)),
      },
    });
  } catch (error) {
    return qrErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireQrAdmin();
    const input = jsonObject(await request.json());
    const qrCode = await createQrCode(actor, input);
    const record = await prisma.dynamicQrCode.findUniqueOrThrow({
      where: { id: qrCode.id },
      include: qrInclude,
    });
    return Response.json(
      { qrCode: normalizeQrRecord(record) },
      { status: 201 },
    );
  } catch (error) {
    return qrErrorResponse(error);
  }
}
