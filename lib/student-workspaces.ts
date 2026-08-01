import "server-only";

import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student-dashboard";
import { getStudentSubject } from "@/lib/student-subjects";

export async function getStudentSubjectWorkspace(sectionSubjectId: string) {
  const [identity, subject] = await Promise.all([requireStudent(), getStudentSubject(sectionSubjectId)]);
  if (!subject) return null;
  const chapters = subject.book ? await prisma.bookChapter.findMany({ where: { bookId: subject.book.id, approved: true, published: true, archived: false, book: { publisherId: identity.publisher.id, published: true, archived: false } }, orderBy: [{ sortOrder: "asc" }, { chapterNumber: "asc" }], select: { id: true, chapterNumber: true, title: true, summary: true, estimatedMinutes: true, studentRevisionProgress: { where: { studentId: identity.student.id, academicYearId: identity.enrollment.academicYearId }, select: { revisionCompleted: true, updatedAt: true }, take: 1 } } }) : [];
  const upcoming = await prisma.classroomAssignment.findMany({ where: { schoolId: identity.school.id, academicYearId: identity.enrollment.academicYearId, sectionId: identity.enrollment.sectionId, sectionSubjectId, status: "PUBLISHED", OR: [{ dueAt: null }, { dueAt: { gte: new Date() } }] }, orderBy: { dueAt: "asc" }, take: 3, select: { id: true, title: true, dueAt: true } });
  const materials = await prisma.classMaterial.findMany({ where: { schoolId: identity.school.id, academicYearId: identity.enrollment.academicYearId, sectionId: identity.enrollment.sectionId, sectionSubjectId, status: "SHARED", archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 20, select: { id: true, title: true, kind: true, description: true } });
  return { identity, subject, chapters, upcoming, materials };
}

export async function getStudentChapterWorkspace(sectionSubjectId: string, chapterId: string) {
  const workspace = await getStudentSubjectWorkspace(sectionSubjectId);
  if (!workspace?.subject.book) return null;
  const chapter = await prisma.bookChapter.findFirst({
    where: { id: chapterId, bookId: workspace.subject.book.id, approved: true, published: true, archived: false },
    select: {
      id: true, bookId: true, chapterNumber: true, title: true, subtitle: true, summary: true, reviewedText: true, estimatedMinutes: true, keywords: true,
      part: { select: { title: true } }, unit: { select: { title: true } },
      modules: { where: { published: true, archived: false }, orderBy: { displayOrder: "asc" }, select: { id: true, title: true, description: true, estimatedMinutes: true } },
      topics: { where: { published: true, archived: false }, orderBy: { displayOrder: "asc" }, select: { id: true, title: true, description: true, estimatedMinutes: true } },
      activities: { where: { approved: true }, orderBy: { createdAt: "asc" }, select: { id: true, title: true, objective: true, instructions: true, durationMinutes: true } },
      exercises: { where: { published: true, archived: false }, orderBy: { displayOrder: "asc" }, select: { id: true, title: true } },
      resources: { where: { publisherId: workspace.identity.publisher.id, published: true, archived: false, audience: { in: ["STUDENT", "BOTH"] }, schoolEntitlements: { some: { schoolId: workspace.identity.school.id, publisherId: workspace.identity.publisher.id, status: "ACTIVE" } } }, select: { id: true, title: true, type: true } },
      classroomAssignments: { where: { schoolId: workspace.identity.school.id, academicYearId: workspace.identity.enrollment.academicYearId, sectionId: workspace.identity.enrollment.sectionId, status: "PUBLISHED" }, select: { id: true, title: true } },
      assessments: { where: { schoolId: workspace.identity.school.id, academicYearId: workspace.identity.enrollment.academicYearId, sectionId: workspace.identity.enrollment.sectionId, status: "PUBLISHED" }, select: { id: true, title: true } },
      studentRevisionProgress: { where: { studentId: workspace.identity.student.id, academicYearId: workspace.identity.enrollment.academicYearId }, select: { summaryRead: true, keywordsRead: true, mindMapRead: true, revisionCompleted: true }, take: 1 },
    },
  });
  if (!chapter) return null;
  const index = workspace.chapters.findIndex((item) => item.id === chapter.id);
  return { ...workspace, chapter, previous: index > 0 ? workspace.chapters[index - 1] : null, next: index >= 0 ? workspace.chapters[index + 1] ?? null : null };
}
