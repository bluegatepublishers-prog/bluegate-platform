import "server-only";

import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student-dashboard";
import { getStudentBook, getStudentBooks } from "@/lib/student-books";
import { collectApprovedStructuredChapter } from "@/lib/ai/knowledge-collector";
import { buildStudentRevisionContent } from "@/lib/student-revision-policy";
import { LearningActivityType } from "@prisma/client";
import { recordLearningActivity } from "@/lib/analytics";
import { refreshLearningSupportBestEffort } from "@/lib/learning-support";
import { completeMatchingRemedialSteps } from "@/lib/remedials/completion";
import {
  saveRevisionChecklistWithDependencies,
  type TrustedRevisionContext,
} from "@/lib/student-revision-service";

const emptyChecklist = {
  summaryRead: false,
  keywordsRead: false,
  mindMapRead: false,
  revisionCompleted: false,
};

export async function getStudentRevisionHub(bookId: string, chapterId: string) {
  const identity = await requireStudent();
  const book = await getStudentBook(bookId);
  if (!book) return null;
  const [chapter, progress] = await Promise.all([
    collectApprovedStructuredChapter(bookId, chapterId),
    prisma.studentRevisionProgress.findUnique({
      where: {
        studentId_chapterId_academicYearId: {
          studentId: identity.student.id,
          chapterId,
          academicYearId: identity.academicYear.id,
        },
      },
      select: { summaryRead: true, keywordsRead: true, mindMapRead: true, revisionCompleted: true },
    }),
  ]);
  if (!chapter) return null;
  return {
    book: {
      id: book.id,
      title: book.title,
      subjectName: book.subjectName,
      sectionSubjectId: book.sectionSubjectId,
    },
    chapter: buildStudentRevisionContent(chapter),
    checklist: progress ?? emptyChecklist,
  };
}

export async function getStudentRevisionChapters(bookId: string) {
  const identity = await requireStudent();
  const book = await getStudentBook(bookId);
  if (!book) return [];
  const chapters = await prisma.bookChapter.findMany({
    where: { bookId, approved: true },
    orderBy: [{ sortOrder: "asc" }, { chapterNumber: "asc" }],
    select: {
      id: true,
      chapterNumber: true,
      title: true,
      studentRevisionProgress: {
        where: { studentId: identity.student.id, academicYearId: identity.academicYear.id },
        select: { revisionCompleted: true },
        take: 1,
      },
    },
  });
  return chapters.map((chapter) => ({
    id: chapter.id,
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    revisionCompleted: chapter.studentRevisionProgress[0]?.revisionCompleted ?? false,
  }));
}

export async function getStudentCompletedRevisions() {
  const identity = await requireStudent();
  const books = await getStudentBooks();
  const bookIds = books.map((book) => book.id);
  if (!bookIds.length) return [];
  return prisma.studentRevisionProgress.findMany({
    where: {
      studentId: identity.student.id,
      academicYearId: identity.academicYear.id,
      revisionCompleted: true,
      chapter: { bookId: { in: bookIds }, approved: true },
    },
    orderBy: { updatedAt: "desc" },
    take: 4,
    select: {
      updatedAt: true,
      chapter: { select: { id: true, chapterNumber: true, title: true, bookId: true, book: { select: { title: true } } } },
    },
  });
}

async function trustedContext(): Promise<TrustedRevisionContext> {
  const identity = await requireStudent();
  return { studentId: identity.student.id, academicYearId: identity.academicYear.id };
}

async function authorizeRevision(bookId: string, chapterId: string, context: TrustedRevisionContext) {
  const identity = await requireStudent();
  if (identity.student.id !== context.studentId || identity.academicYear.id !== context.academicYearId) return false;
  if (!(await getStudentBook(bookId))) return false;
  return Boolean(await prisma.bookChapter.findFirst({ where: { id: chapterId, bookId, approved: true }, select: { id: true } }));
}

export function saveStudentRevisionChecklist(input: { bookId: string; chapterId: string; checklist: unknown }) {
  return saveRevisionChecklistWithDependencies(input, {
    getContext: trustedContext,
    authorize: authorizeRevision,
    async upsert(data) {
      const progress = await prisma.$transaction(async (tx) => {
        const context = await tx.student.findUnique({ where: { id: data.studentId }, select: { schoolId: true, school: { select: { publisherId: true } } } });
        const chapter = await tx.bookChapter.findUnique({ where: { id: data.chapterId }, select: { title: true, bookId: true, book: { select: { subjectId: true, publisherId: true } } } });
        if (!context?.school.publisherId || !chapter || chapter.book.publisherId !== context.school.publisherId) throw new Error("Revision analytics context is unavailable.");
        const progress = await tx.studentRevisionProgress.upsert({
        where: {
          studentId_chapterId_academicYearId: {
            studentId: data.studentId,
            chapterId: data.chapterId,
            academicYearId: data.academicYearId,
          },
        },
        create: { studentId: data.studentId, chapterId: data.chapterId, academicYearId: data.academicYearId, ...data.checklist },
        update: data.checklist,
          select: { id: true, summaryRead: true, keywordsRead: true, mindMapRead: true, revisionCompleted: true, updatedAt: true },
        });
        const checked = [progress.summaryRead, progress.keywordsRead, progress.mindMapRead, progress.revisionCompleted].filter(Boolean).length;
        await recordLearningActivity(tx, {
          eventKey: `revision:${progress.id}:${progress.updatedAt.getTime()}`,
          publisherId: context.school.publisherId,
          schoolId: context.schoolId,
          studentId: data.studentId,
          academicYearId: data.academicYearId,
          activityType: LearningActivityType.REVISION,
          title: `Revised ${chapter.title}`,
          sourceType: "StudentRevisionProgress",
          sourceId: progress.id,
          occurredAt: progress.updatedAt,
          subjectId: chapter.book.subjectId,
          bookId: chapter.bookId,
          chapterId: data.chapterId,
          completed: progress.revisionCompleted,
          progressValue: checked,
          totalValue: 4,
        });
        return progress;
      });
      if (progress.revisionCompleted) { await completeMatchingRemedialSteps({ studentId: data.studentId, academicYearId: data.academicYearId, type: "REVISION_HUB", bookId: input.bookId, chapterId: data.chapterId, sourceId: progress.id }); await refreshLearningSupportBestEffort({ studentId: data.studentId, academicYearId: data.academicYearId }); }
      return progress;
    },
  });
}
