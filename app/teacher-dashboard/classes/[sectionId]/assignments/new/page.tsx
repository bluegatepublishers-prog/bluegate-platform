import Link from "next/link";

import AssignmentBuilder from "@/components/assignments/AssignmentBuilder";
import { requireTeacherAssignmentFeature } from "@/lib/assignments/access";
import { prisma } from "@/lib/prisma";
import { requireTeacherSubject } from "@/lib/teacher-experience";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<{ subject?: string; bookId?: string; chapterId?: string }>;
}) {
  const { sectionId } = await params;
  const query = await searchParams;
  const scope = await requireTeacherAssignmentFeature(sectionId);
  if (query.subject) await requireTeacherSubject(sectionId, query.subject);

  const subjects = subjectOptions(scope.sectionSubjects);
  const contextualSubject = query.subject ? subjects.find((item) => item.id === query.subject) : undefined;
  const materials = await prisma.classMaterial.findMany({
    where: {
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      academicYearId: scope.academicYear.id,
      sectionId,
      teacherId: scope.teacher.id,
      archivedAt: null,
    },
    select: { id: true, title: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  if (!scope.sectionSubjects.length) {
    return <div className="space-y-4"><header><Link href={"/teacher-dashboard/classes/" + sectionId + "/assignments"} className="font-bold text-blue-700">← Assignments</Link><h2 className="mt-3 text-2xl font-bold">Create assignment</h2></header><div className="rounded-2xl border bg-white p-6"><h3 className="text-lg font-bold">No subject assigned</h3><p className="mt-2 text-slate-600">Your school must assign you to a subject in this section before you can create classroom work.</p></div></div>;
  }

  return <div className="space-y-4"><header><Link href={"/teacher-dashboard/classes/" + sectionId + "/assignments" + (query.subject ? "?subject=" + encodeURIComponent(query.subject) : "")} className="font-bold text-blue-700">← Assignments</Link><h2 className="mt-3 text-2xl font-bold">Create assignment</h2><p className="mt-2 text-sm text-slate-600">Set the work, response rules, dates, and optional attachments.</p></header><AssignmentBuilder sectionId={sectionId} subjects={subjects} materials={materials} contextSubjectId={contextualSubject?.id} contextSubjectName={contextualSubject?.name} initialBookId={query.bookId} initialChapterId={query.chapterId} /></div>;
}

export function subjectOptions(sectionSubjects: Awaited<ReturnType<typeof requireTeacherAssignmentFeature>>["sectionSubjects"]) {
  return sectionSubjects.map((item) => ({
    id: item.id,
    name: item.subject.name,
    resources: item.resources.map((resource) => ({ id: resource.id, title: resource.title })),
    books: [...new Map(item.bookAdoptions.map((adoption) => [adoption.book.id, {
      id: adoption.book.id,
      title: adoption.book.title,
      chapters: adoption.book.chapters.map((chapter) => ({ id: chapter.id, title: chapter.title, chapterNumber: chapter.chapterNumber })),
    }])).values()],
  }));
}