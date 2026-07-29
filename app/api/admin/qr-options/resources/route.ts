import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireQrAdmin } from "@/lib/qr/qr-authorization";
import { qrErrorResponse } from "@/lib/qr/qr-service";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_SEARCH_LENGTH = 100;

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
    const q = (searchParams.get("q") ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
    const page = positiveInteger(searchParams.get("page"), 1);
    const pageSize = positiveInteger(
      searchParams.get("pageSize"),
      DEFAULT_PAGE_SIZE,
    );

    if (!bookId) {
      return NextResponse.json({ error: "bookId is required." }, { status: 400 });
    }
    if (page === null || pageSize === null || pageSize > MAX_PAGE_SIZE) {
      return NextResponse.json(
        { error: `page and pageSize must be positive integers; pageSize may not exceed ${MAX_PAGE_SIZE}.` },
        { status: 400 },
      );
    }

    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        archived: false,
        ...(actor.role === "ADMIN"
          ? { publisherId: actor.publisherId ?? "__missing_publisher__" }
          : {}),
      },
      select: { publisherId: true },
    });

    if (!book?.publisherId) {
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    }

    const where = {
      publisherId: book.publisherId,
      archived: false,
      OR: [{ bookId: null }, { bookId }],
      ...(q
        ? {
            AND: [
              {
                OR: [
                  { title: { contains: q, mode: "insensitive" as const } },
                  { description: { contains: q, mode: "insensitive" as const } },
                ],
              },
            ],
          }
        : {}),
    };

    const [resources, total] = await prisma.$transaction([
      prisma.resource.findMany({
        where,
        select: {
          id: true,
          title: true,
          type: true,
          audience: true,
          published: true,
        },
        orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.resource.count({ where }),
    ]);

    return NextResponse.json({
      items: resources,
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
