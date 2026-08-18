import "server-only";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-dashboard";
import {
  getBookEntitlementForAuthenticatedUser,
  getTeacherEntitledBookIds,
} from "@/lib/entitlements/book";
import { getPublisherTeacherResourceForDelivery } from "@/lib/publisher-teacher-resources";
import { bookCoverPath } from "@/lib/storage/book-asset-path";

export async function getTeacherBooks() {
  const teacher = await requireTeacher();
  const bookIds = await getTeacherEntitledBookIds(teacher.userId);
  if (!bookIds.length || !teacher.schoolId || !teacher.school?.publisherId) return [];

  const [assignments, sectionSubjects, books] = await Promise.all([
    prisma.teacherAssignment.findMany({
      where: {
        teacherId: teacher.id,
        schoolId: teacher.schoolId,
        active: true,
        academicYear: { current: true, active: true },
        schoolClass: { active: true },
        section: { active: true },
      },
      select: { sectionId: true, subjectId: true, academicYearId: true, type: true },
    }),
    prisma.sectionSubject.findMany({
      where: {
        bookId: { in: bookIds },
        active: true,
        section: {
          active: true,
          schoolClass: {
            schoolId: teacher.schoolId,
            active: true,
            academicYear: { current: true, active: true },
          },
        },
      },
      select: {
        bookId: true,
        sectionId: true,
        subjectId: true,
        section: { select: { name: true, schoolClass: { select: { name: true, academicYearId: true } } } },
        subject: { select: { name: true } },
      },
    }),
    prisma.book.findMany({
      where: {
        id: { in: bookIds },
        published: true,
        archived: false,
        publisherId: teacher.school.publisherId,
      },
      select: {
        id: true,
        title: true,
        coverImage: true,
        class: { select: { name: true } },
        subject: { select: { name: true } },
        series: { select: { name: true } },
      },
    }),
  ]);

  const cards = new Map<string, {
    id: string;
    title: string;
    coverImage: string | null;
    className: string;
    subjectName: string;
    series: string | null;
    contexts: Array<{ className: string; sectionName: string; subjectName: string }>;
  }>();
  for (const book of books) {
    const contexts = sectionSubjects
      .filter((item) => item.bookId === book.id && assignments.some((assignment) =>
        assignment.sectionId === item.sectionId &&
        assignment.academicYearId === item.section.schoolClass.academicYearId &&
        (assignment.type === "CLASS_TEACHER" || assignment.subjectId === item.subjectId),
      ))
      .map((item) => ({ className: item.section.schoolClass.name, sectionName: item.section.name, subjectName: item.subject.name }));
    if (contexts.length) {
      cards.set(book.id, {
        id: book.id,
        title: book.title,
        coverImage: bookCoverPath(book.id, book.coverImage),
        className: book.class.name,
        subjectName: book.subject.name,
        series: book.series?.name ?? null,
        contexts,
      });
    }
  }
  return [...cards.values()].sort((left, right) => left.title.localeCompare(right.title));
}

export async function getTeacherBook(bookId: string) {
  const teacher = await requireTeacher();
  const decision = await getBookEntitlementForAuthenticatedUser(
    { id: teacher.userId, role: "TEACHER" },
    { bookId },
  );
  if (!decision.allowed || !teacher.schoolId || !teacher.school?.publisherId) return null;

  const book = await prisma.book.findFirst({
    where: {
      id: bookId,
      published: true,
      archived: false,
      publisherId: teacher.school.publisherId,
      schoolEntitlements: { some: { schoolId: teacher.schoolId, publisherId: teacher.school.publisherId, status: "ACTIVE" } },
    },
    select: { id: true, title: true, coverImage: true, fullBookPdf: true },
  });
  if (!book) return null;

  const [folders, resources] = await Promise.all([
    prisma.publisherTeacherResourceFolder.findMany({
      where: { publisherId: teacher.school.publisherId, bookId, archivedAt: null },
      select: { id: true, parentFolderId: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.publisherTeacherResource.findMany({
      where: { publisherId: teacher.school.publisherId, bookId, published: true, archivedAt: null },
      select: { id: true, folderId: true, title: true, originalFileName: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
  ]);
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const folderLabel = (folderId: string) => {
    const names: string[] = [];
    const seen = new Set<string>();
    let current = folderById.get(folderId);
    while (current && !seen.has(current.id)) {
      names.unshift(current.name);
      seen.add(current.id);
      current = current.parentFolderId ? folderById.get(current.parentFolderId) : undefined;
    }
    return names.join(" / ") || "Other Resources";
  };

  return {
    ...book,
    publisherId: teacher.school.publisherId,
    teacherResources: resources.map((resource) => ({
      id: resource.id,
      title: resource.title,
      fileName: resource.originalFileName,
      category: folderLabel(resource.folderId),
      openPath: `/api/teacher/books/${encodeURIComponent(bookId)}/resources/${encodeURIComponent(resource.id)}/open`,
    })),
  };
}

export async function getTeacherBookResource(userId: string, bookId: string, resourceId: string) {
  const teacher = await getTeacherBookAccessForResource(userId, bookId);
  if (!teacher) return null;
  return getPublisherTeacherResourceForDelivery({
    publisherId: teacher.publisherId,
    bookId,
    resourceId,
  });
}

async function getTeacherBookAccessForResource(userId: string, bookId: string) {
  const teacher = await prisma.teacher.findFirst({
    where: { userId, active: true, status: "APPROVED", school: { status: "APPROVED", publisher: { active: true } } },
    select: { id: true, schoolId: true, school: { select: { publisherId: true } } },
  });
  const publisherId = teacher?.school?.publisherId;
  if (!teacher?.schoolId || !publisherId) return null;
  const decision = await getBookEntitlementForAuthenticatedUser({ id: userId, role: "TEACHER" }, { bookId });
  return decision.allowed ? { teacherId: teacher.id, publisherId } : null;
}
