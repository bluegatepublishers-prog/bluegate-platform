import type { Prisma, ResourceAudience, ResourceType } from "@prisma/client";
import { ResourceAudience as Audience } from "@prisma/client";

export function getTeacherVisibleResourceWhere(
  publisherId: string,
): Prisma.ResourceWhereInput {
  return { publisherId, published: true };
}

export function getStudentVisibleResourceWhere(
  publisherId: string,
): Prisma.ResourceWhereInput {
  return {
    publisherId,
    published: true,
    audience: { in: [Audience.STUDENT, Audience.BOTH] },
  };
}

export interface TeacherAssignmentResourceScope {
  sectionId: string;
  subjectId: string | null;
  academicYearId: string;
}

export function buildActiveTeacherAssignmentsWhere(
  teacherId: string,
  schoolId: string,
): Prisma.TeacherAssignmentWhereInput {
  return {
    teacherId,
    schoolId,
    active: true,
    subjectId: { not: null },
    academicYear: { active: true },
    schoolClass: { active: true },
    section: { active: true },
  };
}

export function buildEntitledSectionSubjectsWhere(
  assignments: TeacherAssignmentResourceScope[],
  schoolId: string,
  publisherId: string,
): Prisma.SectionSubjectWhereInput {
  return {
    active: true,
    OR: assignments.map((item) => ({
      sectionId: item.sectionId,
      subjectId: item.subjectId!,
      bookAdoptions: {
        some: {
          schoolId,
          publisherId,
          academicYearId: item.academicYearId,
          status: "APPROVED",
          active: true,
          academicYear: { active: true },
          book: { publisherId },
        },
      },
    })),
  };
}

export function buildTeacherResourceWhere(
  publisherId: string,
  sectionSubjectIds: string[],
): Prisma.ResourceWhereInput {
  return {
    publisherId,
    published: true,
    sectionSubjects: { some: { id: { in: sectionSubjectIds } } },
  };
}

export function buildSchoolResourceWhere(
  publisherId: string,
  schoolId: string,
): Prisma.ResourceWhereInput {
  return {
    publisherId,
    published: true,
    sectionSubjects: {
      some: {
        active: true,
        section: {
          active: true,
          schoolClass: {
            schoolId,
            active: true,
            academicYear: { active: true },
          },
        },
        bookAdoptions: {
          some: {
            schoolId,
            publisherId,
            status: "APPROVED",
            active: true,
            academicYear: { active: true },
            book: { publisherId },
          },
        },
      },
    },
  };
}

export function buildAdminResourceWhere(
  publisherId: string,
  input: {
    query?: string;
    type?: ResourceType;
    audience?: ResourceAudience;
    classId?: string;
    subjectId?: string;
    seriesId?: string;
    bookId?: string;
    published?: boolean;
  },
): Prisma.ResourceWhereInput {
  return {
    publisherId,
    type: input.type,
    audience: input.audience,
    classId: input.classId,
    subjectId: input.subjectId,
    seriesId: input.seriesId,
    bookId: input.bookId,
    published: input.published,
    OR: input.query
      ? [
          { title: { contains: input.query, mode: "insensitive" } },
          { subject: { contains: input.query, mode: "insensitive" } },
          { classLevel: { contains: input.query, mode: "insensitive" } },
        ]
      : undefined,
  };
}
