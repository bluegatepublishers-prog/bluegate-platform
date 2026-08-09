import Link from "next/link";

import { AssignmentLifecycleActions } from "@/components/assignments/AssignmentTeacherActions";
import AssignmentItemsEditor from "@/components/assignments/AssignmentItemsEditor";
import SubmissionReviewList from "@/components/assignments/SubmissionReviewList";
import RemoveAssignmentAttachmentButton from "@/components/assignments/RemoveAssignmentAttachmentButton";
import { getTeacherAssignmentDetail } from "@/lib/assignments/queries";
import { listAssignmentItems } from "@/lib/assignments/assignment-items";
import { getTeachingPeriod } from "@/lib/teaching-plan";

export default async function Page({ params }: { params: Promise<{ sectionId: string; assignmentId: string }> }) {
  const { sectionId, assignmentId } = await params;
  const { assignment, students, summary } = await getTeacherAssignmentDetail(sectionId, assignmentId);
  const [items, period] = await Promise.all([
    listAssignmentItems({ sectionId, assignmentId }),
    assignment.teachingPeriodId ? getTeachingPeriod({ periodId: assignment.teachingPeriodId }).catch(() => null) : Promise.resolve(null),
  ]);
  return <div className="space-y-5">
    <header className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><Link href={`/teacher-dashboard/classes/${sectionId}/assignments`} className="font-bold text-blue-700">← Assignments</Link><div className="mt-4 flex flex-wrap gap-2"><Badge value={assignment.status} /><Badge value={assignment.assignmentType} /></div><h2 className="mt-3 break-words text-3xl font-bold">{assignment.title}</h2><p className="mt-2 text-slate-600">{assignment.subject?.name ?? "General class work"}{assignment.book ? ` · ${assignment.book.title}` : ""}{assignment.chapter ? ` · Chapter ${assignment.chapter.chapterNumber}` : ""}</p></div>{["DRAFT","SCHEDULED"].includes(assignment.status) ? <Link href={`/teacher-dashboard/classes/${sectionId}/assignments/${assignment.id}/edit`} className="min-h-11 rounded-xl border px-4 py-2 font-bold text-blue-700">Edit</Link> : null}</div>
      {assignment.instructions ? <div className="mt-5 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4">{assignment.instructions}</div> : null}
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Published", assignment.publishedAt ?? assignment.publishAt],["Due",assignment.dueAt],["Closes",assignment.closeAt],["Total marks",assignment.totalMarks]].map(([key,value]) => <div key={key as string} className="rounded-xl bg-slate-50 p-3"><dt className="text-xs font-bold uppercase text-slate-500">{key as string}</dt><dd className="mt-1 font-semibold">{value instanceof Date ? value.toLocaleString("en-IN") : value ?? "Not set"}</dd></div>)}</dl>
      <div className="mt-5"><AssignmentLifecycleActions sectionId={sectionId} assignmentId={assignment.id} status={assignment.status} hasGrades={summary.graded > 0} /></div>
    </header>
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
    />    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metric("Eligible", summary.eligible)}{metric("Submitted", summary.submitted)}{metric("Pending", summary.pending)}{metric("Late", summary.late)}{metric("Graded", summary.graded)}{metric("Returned", summary.returned)}{metric("Completion", `${summary.completionPercentage}%`)}{metric("Average marks", summary.averageMarks ?? "Not available")}</section>
    <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Attachments</h2>{assignment.attachments.length ? <ul className="mt-4 space-y-2">{assignment.attachments.map((item) => { const label = item.label ?? item.originalFileName ?? item.resource?.title ?? item.classMaterial?.title ?? item.bookChapter?.title ?? "Attachment"; return <li key={item.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><a href={`/api/assignments/attachments/${item.id}/open`} target="_blank" rel="noreferrer" className="min-w-0 break-words font-semibold text-blue-700">{label}</a><RemoveAssignmentAttachmentButton sectionId={sectionId} assignmentId={assignment.id} attachmentId={item.id} label={label} /></li>; })}</ul> : <p className="mt-2 text-slate-500">No attachments.</p>}</section>
    <SubmissionReviewList sectionId={sectionId} assignmentId={assignment.id} students={students} totalMarks={assignment.totalMarks} allowResubmission={assignment.allowResubmission} maximumAttempts={assignment.maximumAttempts} assignmentItems={items} />
  </div>;
}
function metric(label: string, value: string | number) { return <div className="rounded-2xl border bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{label}</p><strong className="mt-1 block text-2xl">{value}</strong></div>; }
function Badge({ value }: { value: string }) { return <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{value.toLowerCase().replaceAll("_"," ")}</span>; }
