import { NextResponse } from "next/server";

import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { prisma } from "@/lib/prisma";

type AssessmentKind =
  | "CHAPTER_TEST"
  | "MULTI_CHAPTER_TEST"
  | "UNIT_TEST"
  | "TERM_TEST"
  | "MULTI_TERM_TEST"
  | "BOOK_TEST"
  | "EXAM"
  | "FINAL_EXAM"
  | "DIAGNOSTIC";

type ScopeChapter = {
  title: string;
  chapterNumber: number;
};

type ScopeAssessment = {
  kind: AssessmentKind;
  chapter: ScopeChapter | null;
  unit: {
    title: string;
  } | null;
  chapterScopes: Array<{
    position: number;
    chapter: ScopeChapter;
  }>;
};

const ASSESSMENT_LABELS: Record<
  AssessmentKind,
  string
> = {
  CHAPTER_TEST: "Chapter Test",
  MULTI_CHAPTER_TEST: "Chapter Test",
  UNIT_TEST: "Unit Test",
  TERM_TEST: "Term Test",
  MULTI_TERM_TEST: "Term Test",
  BOOK_TEST: "Book Test",
  EXAM: "Exam",
  FINAL_EXAM: "Final Exam",
  DIAGNOSTIC: "Diagnostic",
};

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const access =
    await authorizePublisherAdminApi();

  if (access.response) {
    return access.response;
  }

  try {
    const { id: bookId } =
      await params;

    /*
     * Verify that the requested book belongs to the
     * authenticated publisher.
     */
    const book =
      await prisma.book.findFirst({
        where: {
          id: bookId,
          publisherId:
            access.actor.publisherId,
        },
        select: {
          id: true,
        },
      });

    if (!book) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Book is unavailable.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    /*
     * Only published, active publisher assessments
     * belonging to this exact publisher/book are
     * eligible for the V2 Assessment picker.
     *
     * No TeacherQuestion, school Assessment or
     * student attempt data is involved here.
     */
    const assessments =
      await prisma.publisherAssessment.findMany({
        where: {
          publisherId:
            access.actor.publisherId,

          bookId,

          status: "PUBLISHED",

          archivedAt: null,
        },

        orderBy: [
          {
            updatedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],

        select: {
          id: true,
          kind: true,
          deliveryMode: true,
          totalMarks: true,
          chapterId: true,
          unitId: true,

          chapter: {
            select: {
              title: true,
              chapterNumber: true,
            },
          },

          unit: {
            select: {
              title: true,
            },
          },

          chapterScopes: {
            orderBy: [
              {
                position: "asc",
              },
              {
                id: "asc",
              },
            ],

            select: {
              position: true,

              chapter: {
                select: {
                  title: true,
                  chapterNumber: true,
                },
              },
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

        assessments:
          assessments.map(
            (assessment) => ({
              id: assessment.id,

              kind:
                assessment.kind,

              label:
                ASSESSMENT_LABELS[
                  assessment.kind
                ],

              scope:
                assessmentScopeLabel(
                  {
                    kind:
                      assessment.kind,

                    chapter:
                      assessment.chapter,

                    unit:
                      assessment.unit,

                    chapterScopes:
                      assessment.chapterScopes,
                  },
                ),

              questionCount:
                assessment._count.items,

              totalMarks:
                assessment.totalMarks ??
                0,

              deliveryMode:
                assessment.deliveryMode,
            }),
          ),
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      console.error(
        "[publisher-assessment-launcher-list]",
        error,
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message:
          "Assessments are unavailable.",
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}

function assessmentScopeLabel(
  assessment: ScopeAssessment,
) {
  const orderedScopes = [
    ...assessment.chapterScopes,
  ].sort(
    (left, right) =>
      left.position -
      right.position,
  );

  const chapters =
    orderedScopes.map(
      (entry) => entry.chapter,
    );

  switch (assessment.kind) {
    case "CHAPTER_TEST":
      return assessment.chapter
        ? chapterLabel(
            assessment.chapter,
          )
        : "Chapter";

    case "MULTI_CHAPTER_TEST":
      return chaptersLabel(
        chapters,
      );

    case "UNIT_TEST":
      return assessment.unit
        ? assessment.unit.title
        : "Unit";

    case "TERM_TEST":
      return chapters.length
        ? chaptersLabel(chapters)
        : "Term Coverage";

    case "MULTI_TERM_TEST":
      return chapters.length
        ? chaptersLabel(chapters)
        : "Term Coverage";

    case "BOOK_TEST":
      return "Whole Book";

    case "FINAL_EXAM":
      return "Whole Book";

    case "EXAM":
      return chapters.length
        ? chaptersLabel(chapters)
        : "Whole Book";

    case "DIAGNOSTIC":
      if (chapters.length) {
        return chaptersLabel(
          chapters,
        );
      }

      if (assessment.unit) {
        return assessment.unit.title;
      }

      if (assessment.chapter) {
        return chapterLabel(
          assessment.chapter,
        );
      }

      return "Whole Book";
  }
}

function chapterLabel(
  chapter: ScopeChapter,
) {
  return `Chapter ${chapter.chapterNumber}: ${chapter.title}`;
}

function chaptersLabel(
  chapters: ScopeChapter[],
) {
  if (!chapters.length) {
    return "Selected Chapters";
  }

  if (chapters.length === 1) {
    return chapterLabel(
      chapters[0],
    );
  }

  /*
   * Keep the launcher picker concise.
   *
   * For consecutive ranges:
   * Chapters 1–5
   *
   * For non-consecutive selections:
   * Chapters 1, 3, 5
   */
  const numbers =
    chapters.map(
      (chapter) =>
        chapter.chapterNumber,
    );

  const consecutive =
    numbers.every(
      (number, index) =>
        index === 0 ||
        number ===
          numbers[index - 1] + 1,
    );

  if (consecutive) {
    return `Chapters ${numbers[0]}–${numbers[numbers.length - 1]}`;
  }

  return `Chapters ${numbers.join(", ")}`;
}