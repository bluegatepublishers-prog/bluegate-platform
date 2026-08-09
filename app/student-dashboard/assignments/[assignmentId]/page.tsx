import Link from "next/link";

import SubmissionEditor from "@/components/assignments/SubmissionEditor";
import StudentAssignmentWork from "@/components/assignments/StudentAssignmentWork";
import { getStudentAssignmentDelivery, AssignmentItemServiceError } from "@/lib/assignments/assignment-items";
import { deriveAssignmentWorkCompletion } from "@/lib/assignments/assignment-completion";
import { getStudentAssignmentDetail } from "@/lib/assignments/queries";
import { assignmentWindow } from "@/lib/assignments/timing";

export default async function Page({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const { assignment, currentSubmission, resultsReleased } = await getStudentAssignmentDetail(assignmentId);
  const window = assignmentWindow(assignment);
  let delivery: Awaited<ReturnType<typeof getStudentAssignmentDelivery>> | null = null;
  let deliveryError = "Assignment Work is unavailable right now.";
  try {
    delivery = await getStudentAssignmentDelivery(assignmentId);
  } catch (error) {
    if (error instanceof AssignmentItemServiceError && error.code === "BOOK_NOT_ENTITLED") {
      deliveryError = "This book is no longer available.";
    }
  }

  const completion = delivery ? deriveAssignmentWorkCompletion({ items: delivery.items, work: delivery.work }) : null;
  const workEditable = window.acceptsSubmission && (!currentSubmission || ["DRAFT", "RETURNED"].includes(currentSubmission.status));

  return <main className="space-y-5 p-4 sm:p-6 lg:p-8">
    <header className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <Link href="/student-dashboard/assignments" className="font-bold text-blue-700">← Assignments</Link>
      <div className="mt-4 flex flex-wrap gap-2"><Badge value={assignment.assignmentType} /><Badge value={assignment.status} /></div>
      <h1 className="mt-3 break-words text-3xl font-bold">{assignment.title}</h1>
      <p className="mt-2 text-slate-600">{assignment.teacher.user.name} · {assignment.subject?.name ?? "General class work"}</p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {info("Due", assignment.dueAt)}
        {info("Closes", assignment.closeAt)}
        {info("Submission", `${assignment.allowTextSubmission ? "Text" : ""}${assignment.allowTextSubmission && assignment.allowFileSubmission ? " and " : ""}${assignment.allowFileSubmission ? "Files" : ""}`)}
        {info("Attempts", assignment.maximumAttempts)}
      </dl>
      {assignment.instructions ? <div className="mt-5 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4">{assignment.instructions}</div> : null}
    </header>

    {delivery ? <StudentAssignmentWork
      assignmentId={assignment.id}
      bookId={assignment.bookId}
      sectionSubjectId={assignment.sectionSubjectId}
      items={delivery.items}
      initialWork={delivery.work}
    completion={completion!}
    editable={workEditable}
    /> : <section aria-labelledby="assignment-work-heading" className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 id="assignment-work-heading" className="text-xl font-bold">Assignment Work</h2>
      <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900">{deliveryError}</p>
    </section>}

    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">Assignment attachments</h2>
      {assignment.attachments.length ? <ul className="mt-3 space-y-2">{assignment.attachments.map((item) => <li key={item.id} className="break-words rounded-xl bg-slate-50 p-3"><a href={`/api/assignments/attachments/${item.id}/open`} target="_blank" rel="noreferrer" className="font-semibold text-blue-700">{item.label ?? item.originalFileName ?? item.resource?.title ?? item.classMaterial?.title ?? item.bookChapter?.title ?? "Open attachment"}</a></li>)}</ul> : <p className="mt-2 text-slate-500">No attachments.</p>}
    </section>

    <SubmissionEditor
      assignmentId={assignment.id}
      allowText={assignment.allowTextSubmission}
      allowFiles={assignment.allowFileSubmission}
      acceptedFileTypes={assignment.acceptedFileTypes}
      maximumFileSizeBytes={assignment.maximumFileSizeBytes}
      maximumFiles={assignment.maximumFiles}
      allowResubmission={assignment.allowResubmission}
      maximumAttempts={assignment.maximumAttempts}
      acceptsSubmission={window.acceptsSubmission}
      submission={currentSubmission}
      resultsReleased={resultsReleased}
      totalMarks={assignment.totalMarks}
    assignmentType={assignment.assignmentType}
    completion={completion}
    />
  </main>;
}

function info(label: string, value: Date | string | number | null) {
  return <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs font-bold uppercase text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{value instanceof Date ? value.toLocaleString("en-IN") : value ?? "Not set"}</dd></div>;
}

function Badge({ value }: { value: string }) {
  return <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{value.toLowerCase().replaceAll("_", " ")}</span>;
}
