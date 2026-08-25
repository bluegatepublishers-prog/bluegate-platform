import "server-only";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-dashboard";

export type TeacherBookScopeInput = {
  sectionId: string;
  sectionSubjectId: string;
  academicYearId?: string;
};

export type EligibleTeacherBook = {
  id: string;
  title: string;
};

export type TeacherBookEligibility = {
  academicYearId: string;
  sectionId: string;
  sectionSubjectId: string;
  subjectId: string;
  assignmentId: string;
  directBookId: string | null;
  books: EligibleTeacherBook[];
};

type TeacherRecord = Awaited<ReturnType<typeof requireTeacher>>;

export async function getTeacherBookEligibility(input: TeacherBookScopeInput) {
  const teacher = await requireTeacher();
  return resolveTeacherBookEligibility(teacher, input);
}

export async function resolveTeacherBookEligibility(
  teacher: TeacherRecord,
  input: TeacherBookScopeInput,
): Promise<TeacherBookEligibility | null> {
  if (!teacher.schoolId || !teacher.school?.publisherId) return null;

  const academicYear = await prisma.academicYear.findFirst({
    where: {
      id: input.academicYearId,
      schoolId: teacher.schoolId,
      active: true,
      ...(input.academicYearId ? {} : { current: true }),
    },
    select: { id: true },
  });
  if (!academicYear) return null;

  const sectionSubject = await prisma.sectionSubject.findFirst({
    where: {
      id: input.sectionSubjectId,
      sectionId: input.sectionId,
      active: true,
      subject: { active: true },
      section: {
        active: true,
        schoolClass: {
          schoolId: teacher.schoolId,
          academicYearId: academicYear.id,
          active: true,
        },
      },
    },
    select: { id: true, sectionId: true, subjectId: true, bookId: true },
  });
  if (!sectionSubject) return null;

  const assignment = await prisma.teacherAssignment.findFirst({
    where: {
      teacherId: teacher.id,
      schoolId: teacher.schoolId,
      academicYearId: academicYear.id,
      sectionId: sectionSubject.sectionId,
      subjectId: sectionSubject.subjectId,
      type: "SUBJECT_TEACHER",
      active: true,
      OR: [{ endedAt: null }, { endedAt: { gt: new Date() } }],
      schoolClass: { active: true, schoolId: teacher.schoolId, academicYearId: academicYear.id },
      section: { active: true },
    },
    select: { id: true },
  });
  if (!assignment) return null;

  const adoptions = await prisma.schoolBookAdoption.findMany({
    where: {
      schoolId: teacher.schoolId,
      academicYearId: academicYear.id,
      sectionId: sectionSubject.sectionId,
      sectionSubjectId: sectionSubject.id,
      status: "APPROVED",
      active: true,
      book: { publisherId: teacher.school.publisherId },
    },
    select: { bookId: true },
  });
  const candidateBookIds = [...new Set([sectionSubject.bookId, ...adoptions.map((item) => item.bookId)].filter((id): id is string => Boolean(id)))];
  if (!candidateBookIds.length) {
    return {
      academicYearId: academicYear.id,
      sectionId: sectionSubject.sectionId,
      sectionSubjectId: sectionSubject.id,
      subjectId: sectionSubject.subjectId,
      assignmentId: assignment.id,
      directBookId: null,
      books: [],
    };
  }

  const books = await prisma.book.findMany({
    where: {
      id: { in: candidateBookIds },
      publisherId: teacher.school.publisherId,
      published: true,
      archived: false,
      schoolEntitlements: {
        some: {
          schoolId: teacher.schoolId,
          publisherId: teacher.school.publisherId,
          status: "ACTIVE",
        },
      },
    },
    select: { id: true, title: true },
  });
  const byId = new Map(books.map((book) => [book.id, book]));
  const orderedBooks = candidateBookIds
    .map((id) => byId.get(id))
    .filter((book): book is EligibleTeacherBook => Boolean(book))
    .sort((left, right) => left.title.localeCompare(right.title));

  return {
    academicYearId: academicYear.id,
    sectionId: sectionSubject.sectionId,
    sectionSubjectId: sectionSubject.id,
    subjectId: sectionSubject.subjectId,
    assignmentId: assignment.id,
    directBookId: sectionSubject.bookId && byId.has(sectionSubject.bookId) ? sectionSubject.bookId : null,
    books: orderedBooks,
  };
}
