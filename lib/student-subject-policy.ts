import { normalizeAcademicName } from "@/lib/section-subject-content-policy";
import { bookCoverPath } from "@/lib/storage/book-asset-path";

export type StudentResourceType = "PDF" | "PPT" | "DOC" | "VIDEO" | "ZIP";
export type StudentResourceAudience = "STUDENT" | "BOTH" | "TEACHER_ONLY";

export interface StudentSubjectContext {
  schoolId: string;
  publisherId: string;
  academicYearId: string;
  schoolClassId: string;
  className: string;
  sectionId: string;
  resourcesEnabled: boolean;
}

export interface StudentSubjectCandidate {
  id: string;
  sectionId: string;
  active: boolean;
  sortOrder: number;
  subject: { id: string; name: string; code: string; active: boolean };
  adoptions: Array<{
    schoolId: string;
    publisherId: string | null;
    academicYearId: string;
    schoolClassId: string;
    sectionId: string;
    sectionSubjectId: string;
    status: string;
    active: boolean;
    book: {
      id: string;
      publisherId: string | null;
      subjectId: string;
      title: string;
      coverImage: string | null;
      published: boolean;
      class: { name: string };
      subject: { name: string };
      series: { name: string } | null;
    };
  }>;
  resources: Array<{
    id: string;
    publisherId: string | null;
    title: string;
    description: string;
    subject: string;
    classLevel: string;
    type: StudentResourceType;
    audience: StudentResourceAudience;
    thumbnail: string | null;
    published: boolean;
  }>;
  assignments: Array<{
    schoolId: string;
    academicYearId: string;
    schoolClassId: string;
    sectionId: string;
    subjectId: string | null;
    type: string;
    active: boolean;
    teacher: { active: boolean; schoolId: string | null; user: { name: string } };
  }>;
}

export interface StudentSubjectViewModel {
  sectionSubjectId: string;
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  teacherName: string | null;
  book: {
    id: string;
    title: string;
    coverImage: string | null;
    series: string | null;
    className: string;
    subjectName: string;
  } | null;
  resources: Array<{
    id: string;
    title: string;
    description: string;
    type: StudentResourceType;
    thumbnail: string | null;
    openPath: string;
  }>;
  resourceCounts: { videos: number; worksheets: number; ppts: number; pdfs: number; other: number };
  totalStudentResources: number;
  hasApprovedBook: boolean;
}

export function buildStudentSubjectViewModels(
  context: StudentSubjectContext,
  candidates: readonly StudentSubjectCandidate[],
): StudentSubjectViewModel[] {
  const classKey = normalizeAcademicName(context.className);
  return candidates
    .filter((candidate) => candidate.active && candidate.subject.active && candidate.sectionId === context.sectionId)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.subject.name.localeCompare(right.subject.name))
    .map((candidate) => {
      const adoption = candidate.adoptions.find((item) =>
        item.active &&
        item.status === "APPROVED" &&
        item.schoolId === context.schoolId &&
        item.publisherId === context.publisherId &&
        item.academicYearId === context.academicYearId &&
        item.schoolClassId === context.schoolClassId &&
        item.sectionId === context.sectionId &&
        item.sectionSubjectId === candidate.id &&
        item.book.published &&
        item.book.publisherId === context.publisherId &&
        item.book.subjectId === candidate.subject.id &&
        normalizeAcademicName(item.book.class.name) === classKey,
      );
      const assignment = candidate.assignments.find((item) =>
        item.active &&
        item.type === "SUBJECT_TEACHER" &&
        item.schoolId === context.schoolId &&
        item.academicYearId === context.academicYearId &&
        item.schoolClassId === context.schoolClassId &&
        item.sectionId === context.sectionId &&
        item.subjectId === candidate.subject.id &&
        item.teacher.active &&
        item.teacher.schoolId === context.schoolId,
      );
      const resources = context.resourcesEnabled && adoption
        ? candidate.resources
            .filter((resource) =>
              resource.published &&
              resource.publisherId === context.publisherId &&
              (resource.audience === "STUDENT" || resource.audience === "BOTH") &&
              normalizeAcademicName(resource.classLevel) === classKey &&
              normalizeAcademicName(resource.subject) === normalizeAcademicName(candidate.subject.name),
            )
            .map((resource) => ({
              id: resource.id,
              title: resource.title,
              description: resource.description,
              type: resource.type,
              thumbnail: resource.thumbnail,
              openPath: `/api/student/resources/${resource.id}/open`,
            }))
        : [];
      const count = (type: StudentResourceType) => resources.filter((resource) => resource.type === type).length;
      return {
        sectionSubjectId: candidate.id,
        subjectId: candidate.subject.id,
        subjectName: candidate.subject.name,
        subjectSlug: candidate.subject.code.toLowerCase().replaceAll("_", "-"),
        teacherName: assignment?.teacher.user.name ?? null,
        book: adoption ? {
          id: adoption.book.id,
          title: adoption.book.title,
          coverImage: bookCoverPath(adoption.book.id, adoption.book.coverImage),
          series: adoption.book.series?.name ?? null,
          className: adoption.book.class.name,
          subjectName: adoption.book.subject.name,
        } : null,
        resources,
        resourceCounts: {
          videos: count("VIDEO"),
          worksheets: count("DOC"),
          ppts: count("PPT"),
          pdfs: count("PDF"),
          other: count("ZIP"),
        },
        totalStudentResources: resources.length,
        hasApprovedBook: Boolean(adoption),
      };
    });
}

export function findStudentSubjectViewModel(
  context: StudentSubjectContext,
  candidates: readonly StudentSubjectCandidate[],
  sectionSubjectId: string,
) {
  return buildStudentSubjectViewModels(context, candidates).find(
    (subject) => subject.sectionSubjectId === sectionSubjectId,
  ) ?? null;
}
