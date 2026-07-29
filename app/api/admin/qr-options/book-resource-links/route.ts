import { BookContentTargetType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireQrAdmin } from "@/lib/qr/qr-authorization";
import { qrErrorResponse } from "@/lib/qr/qr-service";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_SEARCH_LENGTH = 100;
const TARGET_TYPES = new Set(Object.values(BookContentTargetType));

function positiveInteger(value: string | null, fallback: number) {
  if (value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireQrAdmin();
    const { searchParams } = request.nextUrl;
    const bookId = (searchParams.get("bookId") ?? "").trim();
    const targetTypeValue = (searchParams.get("targetType") ?? "").trim();
    const targetId = (searchParams.get("targetId") ?? "").trim();
    const q = (searchParams.get("q") ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
    const page = positiveInteger(searchParams.get("page"), 1);
    const pageSize = positiveInteger(
      searchParams.get("pageSize"),
      DEFAULT_PAGE_SIZE,
    );

    if (!bookId || !targetId || !TARGET_TYPES.has(targetTypeValue as BookContentTargetType)) {
      return NextResponse.json(
        { error: "A valid bookId, targetType and targetId are required." },
        { status: 400 },
      );
    }
    if (page === null || pageSize === null || pageSize > MAX_PAGE_SIZE) {
      return NextResponse.json(
        { error: `page and pageSize must be positive integers; pageSize may not exceed ${MAX_PAGE_SIZE}.` },
        { status: 400 },
      );
    }

    const targetType = targetTypeValue as BookContentTargetType;
    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        archived: false,
        ...(actor.role === "ADMIN"
          ? { publisherId: actor.publisherId ?? "__missing_publisher__" }
          : {}),
      },
      select: { id: true, title: true, publisherId: true },
    });

    if (!book?.publisherId) {
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    }

    let targetTitle = book.title;
    let targetWhere: Record<string, string | null> = {
      targetKey: `BOOK:${book.id}`,
    };

    if (targetType === BookContentTargetType.BOOK) {
      if (targetId !== book.id) {
        return NextResponse.json({ error: "Target not found." }, { status: 404 });
      }
    } else {
      const target =
        targetType === BookContentTargetType.PART
          ? await prisma.bookPart.findFirst({
              where: { id: targetId, bookId, archived: false },
              select: { title: true },
            })
          : targetType === BookContentTargetType.UNIT
            ? await prisma.bookUnit.findFirst({
                where: { id: targetId, bookId, archived: false },
                select: { title: true },
              })
            : targetType === BookContentTargetType.CHAPTER
              ? await prisma.bookChapter.findFirst({
                  where: { id: targetId, bookId, archived: false },
                  select: { title: true },
                })
              : targetType === BookContentTargetType.MODULE
                ? await prisma.bookModule.findFirst({
                    where: { id: targetId, bookId, archived: false },
                    select: { title: true },
                  })
                : await prisma.bookTopic.findFirst({
                    where: { id: targetId, bookId, archived: false },
                    select: { title: true },
                  });

      if (!target) {
        return NextResponse.json({ error: "Target not found." }, { status: 404 });
      }

      targetTitle = target.title;
      targetWhere =
        targetType === BookContentTargetType.PART
          ? { partId: targetId }
          : targetType === BookContentTargetType.UNIT
            ? { unitId: targetId }
            : targetType === BookContentTargetType.CHAPTER
              ? { chapterId: targetId }
              : targetType === BookContentTargetType.MODULE
                ? { moduleId: targetId }
                : { topicId: targetId };
    }

    const where = {
      publisherId: book.publisherId,
      bookId,
      targetType,
      active: true,
      qrEligible: true,
      ...targetWhere,
      resource: {
        publisherId: book.publisherId,
        archived: false,
      },
      ...(q
        ? {
            resource: {
              publisherId: book.publisherId,
              archived: false,
              title: { contains: q, mode: "insensitive" as const },
            },
          }
        : {}),
    };

    const [links, total] = await prisma.$transaction([
      prisma.bookResourceLink.findMany({
        where,
        select: {
          id: true,
          audienceOverride: true,
          resource: {
            select: {
              title: true,
              type: true,
              audience: true,
            },
          },
        },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.bookResourceLink.count({ where }),
    ]);

    return NextResponse.json({
      items: links.map((link) => ({
        id: link.id,
        title: link.resource.title,
        resourceTitle: link.resource.title,
        resourceType: link.resource.type,
        audience: link.audienceOverride ?? link.resource.audience,
        target: {
          type: targetType,
          id: targetId,
          title: targetTitle,
        },
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    return qrErrorResponse(error);
  }
}
