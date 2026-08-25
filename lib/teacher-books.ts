import "server-only";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-dashboard";
import { getBookEntitlementForAuthenticatedUser } from "@/lib/entitlements/book";
import { getPublisherTeacherResourceForDelivery } from "@/lib/publisher-teacher-resources";
import { bookCoverPath } from "@/lib/storage/book-asset-path";
import { resolveTeacherBookEligibility } from "@/lib/teacher-book-eligibility";

export async function getTeacherBooks() {
  const teacher = await requireTeacher();
  if (!teacher.schoolId || !teacher.school?.publisherId) return [];

  const assignments = await prisma.teacherAssignment.findMany({
    where: {
      teacherId: teacher.id,
      schoolId: teacher.schoolId,
      active: true,
      type: "SUBJECT_TEACHER",
      academicYear: { current: true, active: true },
      schoolClass: { active: true },
      section: { active: true },
    },
    select: {
      academicYearId: true,
      sectionId: true,
      subjectId: true,
      section: { select: { name: true, schoolClass: { select: { name: true } } } },
      subject: { select: { name: true } },
    },
  });
  const sectionSubjects = await prisma.sectionSubject.findMany({
    where: {
      active: true,
      sectionId: { in: [...new Set(assignments.map((assignment) => assignment.sectionId))] },
      subjectId: { in: [...new Set(assignments.map((assignment) => assignment.subjectId).filter((id): id is string => Boolean(id)))] },
    },
    select: { id: true, sectionId: true, subjectId: true },
  });
  const scoped = assignments.flatMap((assignment) => {
    const subject = sectionSubjects.find((item) => item.sectionId === assignment.sectionId && item.subjectId === assignment.subjectId);
    return subject ? [{ assignment, sectionSubjectId: subject.id }] : [];
  });
  const eligible = await Promise.all(scoped.map(async ({ assignment, sectionSubjectId }) => ({
    assignment,
    eligibility: await resolveTeacherBookEligibility(teacher, {
      sectionId: assignment.sectionId,
      sectionSubjectId,
      academicYearId: assignment.academicYearId,
    }),
  })));
  const bookIds = [...new Set(eligible.flatMap((item) => item.eligibility?.books.map((book) => book.id) ?? []))];
  if (!bookIds.length) return [];
  const books = await prisma.book.findMany({
    where: { id: { in: bookIds }, publisherId: teacher.school.publisherId, published: true, archived: false },
    select: {
      id: true,
      title: true,
      coverImage: true,
      class: { select: { name: true } },
      subject: { select: { name: true } },
      series: { select: { name: true } },
    },
  });
  const contextsByBook = new Map<string, Array<{ className: string; sectionName: string; subjectName: string }>>();
  for (const item of eligible) {
    if (!item.eligibility) continue;
    for (const book of item.eligibility.books) {
      const contexts = contextsByBook.get(book.id) ?? [];
      contexts.push({
        className: item.assignment.section.schoolClass.name,
        sectionName: item.assignment.section.name,
        subjectName: item.assignment.subject?.name ?? "",
      });
      contextsByBook.set(book.id, contexts);
    }
  }
  return books.map((book) => ({
    id: book.id,
    title: book.title,
    coverImage: bookCoverPath(book.id, book.coverImage),
    className: book.class.name,
    subjectName: book.subject.name,
    series: book.series?.name ?? null,
    contexts: [...new Map((contextsByBook.get(book.id) ?? []).map((context) => [
      `${context.className}:${context.sectionName}:${context.subjectName}`,
      context,
    ])).values()],
  })).filter((book) => book.contexts.length).sort((left, right) => left.title.localeCompare(right.title));
}
export async function getTeacherBook(
  bookId: string,
  options?: { trace?: (stage: string) => void },
) {
  const trace = options?.trace;
  trace?.("auth started");
  const teacher = await requireTeacher();
  trace?.("auth completed");
  trace?.("teacher auth started");
  const decision = await getBookEntitlementForAuthenticatedUser(
    { id: teacher.userId, role: "TEACHER" },
    { bookId },
    { trace },
  );
  trace?.("teacher auth completed");
  if (!decision.allowed || !teacher.schoolId || !teacher.school?.publisherId) return null;

  trace?.("authorized book lookup started");
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
  trace?.("authorized book lookup completed");
  if (!book) return null;

  trace?.("teacher resource queries started");
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
  trace?.("teacher resource queries completed");
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
