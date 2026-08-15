import { NextResponse } from "next/server";

import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const access = await authorizePublisherAdminApi();

  if (access.response) {
    return access.response;
  }

  try {
    const { id: bookId } = await params;

    const searchParams = new URL(request.url).searchParams;

    const chapterId =
      searchParams.get("chapterId")?.trim() || null;

    /*
     * First verify that the requested book belongs to
     * the authenticated publisher.
     */
    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        publisherId: access.actor.publisherId,
      },
      select: {
        id: true,
      },
    });

    if (!book) {
      return NextResponse.json(
        {
          ok: false,
          message: "Book is unavailable.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * If chapter context was supplied by Content Studio,
     * verify that the chapter really belongs to this book.
     */
    if (chapterId) {
      const chapter = await prisma.bookChapter.findFirst({
        where: {
          id: chapterId,
          bookId,
        },
        select: {
          id: true,
        },
      });

      if (!chapter) {
        return NextResponse.json(
          {
            ok: false,
            message: "Chapter is unavailable.",
          },
          {
            status: 404,
          },
        );
      }
    }

    /*
     * Only worksheets that can legitimately be launched
     * by students are returned to the V2 picker.
     *
     * Draft, archived, inactive, teacher-only and
     * offline-only worksheets are deliberately excluded.
     */
    const worksheets =
      await prisma.publisherWorksheet.findMany({
        where: {
          publisherId: access.actor.publisherId,
          bookId,
          archivedAt: null,
          active: true,
          published: true,
          allowOnlineAttempt: true,
          audience: {
            in: ["STUDENT", "BOTH"],
          },
          ...(chapterId
            ? {
                chapterId,
              }
            : {}),
        },
        orderBy: [
          {
            chapter: {
              chapterNumber: "asc",
            },
          },
          {
            sortOrder: "asc",
          },
          {
            updatedAt: "desc",
          },
        ],
        select: {
          id: true,
          title: true,
          chapterId: true,
          moduleId: true,
          totalMarks: true,
          allowOnlineAttempt: true,

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

          _count: {
            select: {
              items: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        ok: true,

        worksheets: worksheets.map(
          (worksheet) => ({
            id: worksheet.id,
            title: worksheet.title,

            chapterId:
              worksheet.chapterId,

            moduleId:
              worksheet.moduleId,

            chapter: {
              id: worksheet.chapter.id,
              title: worksheet.chapter.title,
              chapterNumber:
                worksheet.chapter.chapterNumber,
            },

            module: worksheet.module
              ? {
                  id: worksheet.module.id,
                  title: worksheet.module.title,
                }
              : null,

            questionCount:
              worksheet._count.items,

            totalMarks:
              worksheet.totalMarks ?? 0,
          }),
        ),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "[worksheet-launcher-list]",
        error,
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message:
          "Worksheets are unavailable.",
      },
      {
        status: 500,
      },
    );
  }
}