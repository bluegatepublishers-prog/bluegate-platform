import { prisma } from "@/lib/prisma";

export async function collectApprovedStructuredChapter(
  bookId: string,
  chapterId: string,
) {
  return prisma.bookChapter.findFirst({
    where: {
      id: chapterId,
      bookId,
      approved: true,
      book: {
        published: true,
      },
    },
    select: {
      id: true,
      chapterNumber: true,
      title: true,
      summary: true,
      keywords: true,
      learningOutcomes: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          outcome: true,
          bloomLevel: true,
          competency: true,
        },
      },
      questions: {
        where: {
          approved: true,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          questionText: true,
          correctAnswer: true,
          explanation: true,
        },
      },
      activities: {
        where: {
          approved: true,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          title: true,
          objective: true,
          instructions: true,
          expectedLearning: true,
        },
      },
    },
  });
}
