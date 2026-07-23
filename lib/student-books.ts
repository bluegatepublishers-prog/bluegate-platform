import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student-dashboard";
import { getStudentSubjects } from "@/lib/student-subjects";
import { getBookEntitlementForAuthenticatedUser } from "@/lib/entitlements/book";
import { buildStudentBookLibrary } from "@/lib/student-book-policy";
import { LearningActivityType } from "@prisma/client";
import { recordLearningActivity } from "@/lib/analytics";
import { refreshLearningSupportBestEffort } from "@/lib/learning-support";
import { completeReadingRemedialSteps } from "@/lib/remedials/completion";
import {
  saveReadingProgressWithDependencies,
  togglePageBookmarkWithDependencies,
  type TrustedReadingContext,
} from "@/lib/student-reading-service";

export interface StudentBookViewModel {
  id: string;
  title: string;
  coverImage: string | null;
  series: string | null;
  className: string;
  subjectName: string;
  sectionSubjectId: string;
  progress: {
    lastPage: number;
    totalPages: number | null;
    percent: number | null;
    completed: boolean;
    lastReadAt: string;
  } | null;
}

export const getStudentBooks = cache(async (): Promise<StudentBookViewModel[]> => {
  const identity = await requireStudent();
  const subjects = await getStudentSubjects();
  const approvedIds = [...new Set(subjects.filter((subject) => subject.book).map((subject) => subject.book!.id))];
  const progress = approvedIds.length ? await prisma.studentBookProgress.findMany({
    where: {
      studentId: identity.student.id,
      academicYearId: identity.academicYear.id,
      bookId: { in: approvedIds },
    },
    select: {
      bookId: true,
      lastPage: true,
      totalPages: true,
      completedAt: true,
      lastReadAt: true,
    },
  }) : [];
  const library = buildStudentBookLibrary(
    subjects.map((subject) => ({
      ...subject,
      book: subject.book && approvedIds.includes(subject.book.id) ? subject.book : null,
    })),
    progress,
  );
  return library;
});

export async function getStudentBook(bookId: string) {
  const identity = await requireStudent();
  const book = (await getStudentBooks()).find((item) => item.id === bookId);
  if (!book || !identity.student.userId) return null;
  const decision = await getBookEntitlementForAuthenticatedUser(
    { id: identity.student.userId, role: "STUDENT" },
    {
      bookId,
      academicYearId: identity.academicYear.id,
      sectionId: identity.enrollment.sectionId,
      sectionSubjectId: book.sectionSubjectId,
    },
  );
  if (!decision.allowed) return null;
  const bookmarks = await prisma.studentBookBookmark.findMany({
    where: {
      studentId: identity.student.id,
      academicYearId: identity.academicYear.id,
      bookId,
    },
    select: { pageNumber: true },
    orderBy: { pageNumber: "asc" },
  });
  return { ...book, bookmarkPages: bookmarks.map((item) => item.pageNumber) };
}

async function trustedContext(): Promise<TrustedReadingContext> {
  const identity = await requireStudent();
  return { studentId: identity.student.id, academicYearId: identity.academicYear.id };
}

async function authorizeBook(bookId: string, context: TrustedReadingContext) {
  const identity = await requireStudent();
  if (context.studentId !== identity.student.id || context.academicYearId !== identity.academicYear.id) return false;
  return Boolean(await getStudentBook(bookId));
}

export function saveStudentReadingProgress(input: { bookId: string; currentPage: unknown; totalPages: unknown }) {
  return saveReadingProgressWithDependencies(input, {
    getContext: trustedContext,
    authorizeBook,
    async upsert(data) {
      const now = new Date();
      const completedAt = data.completed ? now : null;
      const progress = await prisma.$transaction(async (tx) => {
        const context = await tx.student.findUnique({ where: { id: data.studentId }, select: { schoolId: true, school: { select: { publisherId: true } } } });
        const book = await tx.book.findUnique({ where: { id: data.bookId }, select: { title: true, subjectId: true, publisherId: true } });
        if (!context?.school.publisherId || !book || book.publisherId !== context.school.publisherId) throw new Error("Reading analytics context is unavailable.");
        const progress = await tx.studentBookProgress.upsert({
        where: {
          studentId_bookId_academicYearId: {
            studentId: data.studentId,
            bookId: data.bookId,
            academicYearId: data.academicYearId,
          },
        },
        create: {
          studentId: data.studentId,
          bookId: data.bookId,
          academicYearId: data.academicYearId,
          lastPage: data.lastPage,
          totalPages: data.totalPages,
          completedAt,
          lastReadAt: now,
        },
        update: {
          lastPage: data.lastPage,
          totalPages: data.totalPages,
          completedAt: data.completed ? now : undefined,
          lastReadAt: now,
        },
          select: { id: true, lastPage: true, totalPages: true, completedAt: true, lastReadAt: true },
        });
        await recordLearningActivity(tx, {
          eventKey: `reading:${progress.id}:${now.getTime()}`,
          publisherId: context.school.publisherId,
          schoolId: context.schoolId,
          studentId: data.studentId,
          academicYearId: data.academicYearId,
          activityType: LearningActivityType.READING,
          title: `Read ${book.title}`,
          sourceType: "StudentBookProgress",
          sourceId: progress.id,
          occurredAt: now,
          subjectId: book.subjectId,
          bookId: data.bookId,
          completed: Boolean(progress.completedAt),
          progressValue: progress.lastPage,
          totalValue: progress.totalPages,
        });
        return progress;
      });
      await completeReadingRemedialSteps({ studentId: data.studentId, academicYearId: data.academicYearId, bookId: data.bookId, lastPage: progress.lastPage, bookCompleted: Boolean(progress.completedAt), sourceId: progress.id });
      if (progress.completedAt) await refreshLearningSupportBestEffort({ studentId: data.studentId, academicYearId: data.academicYearId });
      return progress;
    },
  });
}

export function toggleStudentBookBookmark(input: { bookId: string; pageNumber: unknown; totalPages?: number | null }) {
  return togglePageBookmarkWithDependencies(input, {
    getContext: trustedContext,
    authorizeBook,
    async toggle(data) {
      const key = {
        studentId: data.studentId,
        bookId: data.bookId,
        academicYearId: data.academicYearId,
        pageNumber: data.pageNumber,
      };
      const existing = await prisma.studentBookBookmark.findUnique({
        where: { studentId_bookId_academicYearId_pageNumber: key },
        select: { id: true },
      });
      if (existing) {
        await prisma.studentBookBookmark.delete({ where: { id: existing.id } });
        return { bookmarked: false, pageNumber: data.pageNumber };
      }
      await prisma.studentBookBookmark.create({ data: key });
      return { bookmarked: true, pageNumber: data.pageNumber };
    },
  });
}
