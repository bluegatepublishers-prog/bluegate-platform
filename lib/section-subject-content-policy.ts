import type { Prisma } from "@prisma/client";

export function normalizeAcademicName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b(class|grade|standard|std)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function buildSectionSubjectContentScopeWhere(
  schoolId: string,
  schoolClassId: string,
  sectionSubjectId: string,
): Prisma.SectionSubjectWhereInput {
  return {
    id: sectionSubjectId,
    active: true,
    section: { schoolClass: { id: schoolClassId, schoolId } },
  };
}

export function buildAssignableBookWhere(
  publisherId: string,
  schoolId: string,
  academicYearId: string,
  sectionSubjectId: string,
  bookId: string,
  subjectId: string,
): Prisma.BookWhereInput {
  return {
    id: bookId,
    publisherId,
    published: true,
    archived: false,
    subjectId,
    schoolEntitlements: {
      some: { publisherId, schoolId, status: "ACTIVE" },
    },
  };
}

export function buildAssignableResourcesWhere(
  publisherId: string,
  schoolId: string,
  resourceIds: string[],
): Prisma.ResourceWhereInput {
  return {
    id: { in: resourceIds },
    publisherId,
    published: true,
    archived: false,
    schoolEntitlements: {
      some: { publisherId, schoolId, status: "ACTIVE" },
    },
    AND: [
      {
        OR: [
          { bookId: null },
          {
            book: {
              schoolEntitlements: {
                some: { publisherId, schoolId, status: "ACTIVE" },
              },
            },
          },
        ],
      },
    ],
  };
}

interface CompatibleBook {
  publisherId: string | null;
  subjectId: string;
  class: { name: string };
}

interface CompatibleResource {
  id: string;
  publisherId: string | null;
  classLevel: string;
  subject: string;
}

export function isSectionSubjectContentSelectionValid(input: {
  publisherId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  requestedBookId: string | null;
  requestedResourceIds: string[];
  book: CompatibleBook | null;
  resources: CompatibleResource[];
}) {
  const classKey = normalizeAcademicName(input.className);
  if (
    input.requestedBookId &&
    (!input.book ||
      input.book.publisherId !== input.publisherId ||
      input.book.subjectId !== input.subjectId ||
      normalizeAcademicName(input.book.class.name) !== classKey)
  ) {
    return false;
  }

  if (input.resources.length !== input.requestedResourceIds.length) return false;
  return input.resources.every(
    (resource) =>
      input.requestedResourceIds.includes(resource.id) &&
      resource.publisherId === input.publisherId &&
      normalizeAcademicName(resource.classLevel) === classKey &&
      normalizeAcademicName(resource.subject) ===
        normalizeAcademicName(input.subjectName),
  );
}

export function buildSectionSubjectContentUpdate(
  bookId: string | null,
  resourceIds: string[],
){
  return {
    bookId,
    resources: { set: resourceIds.map((id) => ({ id })) },
  };
}
