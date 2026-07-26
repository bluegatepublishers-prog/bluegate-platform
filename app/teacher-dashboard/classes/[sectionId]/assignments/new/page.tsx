import Link from "next/link";

import AssignmentBuilder from "@/components/assignments/AssignmentBuilder";
import { requireTeacherAssignmentFeature } from "@/lib/assignments/access";
import { prisma } from "@/lib/prisma";

export default async function Page({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const scope = await requireTeacherAssignmentFeature(sectionId);
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
    return <div className="space-y-5"><header><Link href={`/teacher-dashboard/classes/${sectionId}/assignments`} className="font-bold text-blue-700">← Assignments</Link><h2 className="mt-3 text-3xl font-bold">Create assignment</h2></header><div className="rounded-3xl border bg-white p-8"><h3 className="text-xl font-bold">No subject assigned</h3><p className="mt-2 text-slate-600">Your school must assign you to a subject in this section before you can create classroom work.</p></div></div>;
  }
  return <div className="space-y-5"><header><Link href={`/teacher-dashboard/classes/${sectionId}/assignments`} className="font-bold text-blue-700">← Assignments</Link><h2 className="mt-3 text-3xl font-bold">Create assignment</h2><p className="mt-2 text-slate-600">Set the work, response rules, dates, and optional attachments.</p></header><AssignmentBuilder sectionId={sectionId} subjects={subjectOptions(scope.sectionSubjects)} materials={materials} /></div>;
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
