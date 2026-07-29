import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireQrAdmin } from "@/lib/qr/qr-authorization";
import { qrErrorResponse } from "@/lib/qr/qr-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireQrAdmin();
    const bookId = (request.nextUrl.searchParams.get("bookId") ?? "").trim();

    if (!bookId) {
      return NextResponse.json({ error: "bookId is required." }, { status: 400 });
    }

    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        archived: false,
        ...(actor.role === "ADMIN"
          ? { publisherId: actor.publisherId ?? "__missing_publisher__" }
          : {}),
      },
      select: { id: true, title: true },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    }

    const [parts, units, chapters, modules, topics] = await Promise.all([
      prisma.bookPart.findMany({
        where: { bookId, archived: false },
        select: {
          id: true,
          title: true,
          subtitle: true,
          displayOrder: true,
        },
        orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
      }),
      prisma.bookUnit.findMany({
        where: { bookId, archived: false },
        select: {
          id: true,
          partId: true,
          title: true,
          subtitle: true,
          displayOrder: true,
        },
        orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
      }),
      prisma.bookChapter.findMany({
        where: { bookId, archived: false },
        select: {
          id: true,
          partId: true,
          unitId: true,
          chapterNumber: true,
          title: true,
          subtitle: true,
          sortOrder: true,
        },
        orderBy: [{ sortOrder: "asc" }, { chapterNumber: "asc" }],
      }),
      prisma.bookModule.findMany({
        where: { bookId, archived: false },
        select: {
          id: true,
          chapterId: true,
          title: true,
          subtitle: true,
          displayOrder: true,
        },
        orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
      }),
      prisma.bookTopic.findMany({
        where: { bookId, archived: false },
        select: {
          id: true,
          chapterId: true,
          moduleId: true,
          title: true,
          subtitle: true,
          displayOrder: true,
        },
        orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
      }),
    ]);

    return NextResponse.json({
      book: {
        id: book.id,
        type: "BOOK",
        title: book.title,
        subtitle: "Book",
        parentId: null,
        displayOrder: 0,
      },
      parts: parts.map((part) => ({
        id: part.id,
        type: "PART",
        title: part.title,
        subtitle: part.subtitle ?? "Part",
        parentId: book.id,
        displayOrder: part.displayOrder,
      })),
      units: units.map((unit) => ({
        id: unit.id,
        type: "UNIT",
        title: unit.title,
        subtitle: unit.subtitle ?? "Unit",
        parentId: unit.partId ?? book.id,
        displayOrder: unit.displayOrder,
      })),
      chapters: chapters.map((chapter) => ({
        id: chapter.id,
        type: "CHAPTER",
        title: chapter.title,
        subtitle:
          chapter.subtitle ??
          (chapter.chapterNumber > 0
            ? `Chapter ${chapter.chapterNumber}`
            : "Chapter"),
        parentId: chapter.unitId ?? chapter.partId ?? book.id,
        displayOrder: chapter.sortOrder,
      })),
      modules: modules.map((module) => ({
        id: module.id,
        type: "MODULE",
        title: module.title,
        subtitle: module.subtitle ?? "Module",
        parentId: module.chapterId,
        displayOrder: module.displayOrder,
      })),
      topics: topics.map((topic) => ({
        id: topic.id,
        type: "TOPIC",
        title: topic.title,
        subtitle: topic.subtitle ?? "Topic",
        parentId: topic.moduleId ?? topic.chapterId,
        displayOrder: topic.displayOrder,
      })),
    });
  } catch (error) {
    return qrErrorResponse(error);
  }
}
