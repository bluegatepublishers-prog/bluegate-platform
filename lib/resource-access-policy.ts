import type { Prisma, ResourceAudience, ResourceType } from "@prisma/client";
import { ResourceAudience as Audience } from "@prisma/client";

export function getTeacherVisibleResourceWhere(
  publisherId: string,
): Prisma.ResourceWhereInput {
  return { publisherId, published: true, archived: false };
}

export function getStudentVisibleResourceWhere(
  publisherId: string,
): Prisma.ResourceWhereInput {
  return {
    publisherId,
    published: true,
    archived: false,
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
    academicYear: { active: true, current: true },
    schoolClass: { active: true },
    section: { active: true },
  };
}

export function buildEntitledSectionSubjectsWhere(
  assignments: TeacherAssignmentResourceScope[],
): Prisma.SectionSubjectWhereInput {
  return {
    active: true,
    OR: assignments.map((item) => ({
      sectionId: item.sectionId,
      subjectId: item.subjectId!,
    })),
  };
}

export function buildTeacherResourceWhere(
  publisherId: string,
  schoolId: string,
  sectionSubjectIds: string[],
): Prisma.ResourceWhereInput {
  return {
    publisherId,
    published: true,
    archived: false,
    sectionSubjects: { some: { id: { in: sectionSubjectIds } } },
    schoolEntitlements: { some: { schoolId, publisherId, status: "ACTIVE" } },
    AND: [
      {
        OR: [
          { bookId: null },
          {
            book: {
              schoolEntitlements: {
                some: { schoolId, publisherId, status: "ACTIVE" },
              },
            },
          },
        ],
      },
    ],
  };
}

export function buildSchoolResourceWhere(
  publisherId: string,
  schoolId: string,
): Prisma.ResourceWhereInput {
  return {
    publisherId,
    published: true,
    archived: false,
    schoolEntitlements: { some: { schoolId, publisherId, status: "ACTIVE" } },
    AND: [
      {
        OR: [
          { bookId: null },
          {
            book: {
              schoolEntitlements: {
                some: { schoolId, publisherId, status: "ACTIVE" },
              },
            },
          },
        ],
      },
    ],
    sectionSubjects: {
      some: {
        active: true,
        section: {
          active: true,
          schoolClass: {
            schoolId,
            active: true,
            academicYear: { active: true, current: true },
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
    archived: false,
    OR: input.query
      ? [
          { title: { contains: input.query, mode: "insensitive" } },
          { subject: { contains: input.query, mode: "insensitive" } },
          { classLevel: { contains: input.query, mode: "insensitive" } },
        ]
      : undefined,
  };
}
