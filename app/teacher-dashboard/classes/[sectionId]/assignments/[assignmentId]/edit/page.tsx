import Link from "next/link";

import AssignmentBuilder from "@/components/assignments/AssignmentBuilder";
import AssignmentItemsEditor from "@/components/assignments/AssignmentItemsEditor";
import { requireOwnedTeacherAssignment } from "@/lib/assignments/access";
import { listAssignmentItems } from "@/lib/assignments/assignment-items";
import { getTeachingPeriod } from "@/lib/teaching-plan";
import { subjectOptions } from "../../new/page";

export default async function Page({ params }: { params: Promise<{ sectionId: string; assignmentId: string }> }) {
  const { sectionId, assignmentId } = await params;
  const { scope, assignment } = await requireOwnedTeacherAssignment(sectionId, assignmentId);
  const [items, period] = await Promise.all([
    listAssignmentItems({ sectionId, assignmentId }),
    assignment.teachingPeriodId ? getTeachingPeriod({ periodId: assignment.teachingPeriodId }).catch(() => null) : Promise.resolve(null),
  ]);
  return <div className="space-y-5">
    <header>
      <Link href={`/teacher-dashboard/classes/${sectionId}/assignments/${assignmentId}`} className="font-bold text-blue-700">← Assignment</Link>
      <h2 className="mt-3 text-3xl font-bold">Edit assignment</h2>
    </header>
    <AssignmentBuilder sectionId={sectionId} subjects={subjectOptions(scope.sectionSubjects)} materials={[]} hasAssignmentItems={items.some((item) => item.type !== "INSTRUCTION")} initial={{
      id: assignment.id,
      title: assignment.title,
      instructions: assignment.instructions,
      assignmentType: assignment.assignmentType,
      status: assignment.status,
      sectionSubjectId: assignment.sectionSubjectId,
      bookId: assignment.bookId,
      chapterId: assignment.chapterId,
      totalMarks: assignment.totalMarks,
      allowTextSubmission: assignment.allowTextSubmission,
      allowFileSubmission: assignment.allowFileSubmission,
      allowMultipleFiles: assignment.allowMultipleFiles,
      maximumFiles: assignment.maximumFiles,
      maximumFileSizeBytes: assignment.maximumFileSizeBytes,
      acceptedFileTypes: assignment.acceptedFileTypes,
      allowLateSubmission: assignment.allowLateSubmission,
      allowResubmission: assignment.allowResubmission,
      maximumAttempts: assignment.maximumAttempts,
      publishAt: assignment.publishAt?.toISOString() ?? null,
      dueAt: assignment.dueAt?.toISOString() ?? null,
      closeAt: assignment.closeAt?.toISOString() ?? null,
    }} />
    <AssignmentItemsEditor
      sectionId={sectionId}
      assignment={{ id: assignment.id, status: assignment.status, bookId: assignment.bookId, sectionSubjectId: assignment.sectionSubjectId }}
      initialItems={items}
      period={period ? {
        sequence: period.sequence,
        title: period.title,
        pages: period.pageRefs.length ? "Pages " + period.pageRefs.map((page) => page.displayPageNumber ?? page.sequence).join(", ") : "",
        pageKeys: period.pageRefs.map((page) => (page.moduleId ?? "") + ":" + page.pageId),
      } : null}
    />
  </div>;
}
