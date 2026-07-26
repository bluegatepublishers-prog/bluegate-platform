"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { GradeSubmissionPanel } from "./AssignmentTeacherActions";

type StudentRow = {
  studentId: string;
  name: string;
  admissionNumber: string;
  rollNumber: string | null;
  submission: null | {
    id: string;
    attemptNumber: number;
    status: string;
    submittedAt: string | null;
    isLate: boolean;
    marksAwarded: number | null;
    textResponse: string | null;
    teacherFeedback: string | null;
    attachments: Array<{ id: string; originalFileName: string; fileSizeBytes: number }>;
  };
};

export default function SubmissionReviewList({ sectionId, assignmentId, students, totalMarks, allowResubmission, maximumAttempts }: { sectionId: string; assignmentId: string; students: StudentRow[]; totalMarks: number | null; allowResubmission: boolean; maximumAttempts: number }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const visible = useMemo(() => students.filter((student) => {
    const current = student.submission?.status ?? "NOT_SUBMITTED";
    return (!status || current === status) && `${student.name} ${student.admissionNumber}`.toLowerCase().includes(query.trim().toLowerCase());
  }), [query, status, students]);
  return <section className="rounded-2xl border bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Student submissions</h2><p className="mt-1 text-sm text-slate-600">Only students actively enrolled in this section are shown.</p></div></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]"><label className="relative"><span className="sr-only">Search students</span><Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student" className="min-h-12 w-full rounded-xl border py-3 pl-11 pr-4" /></label><label><span className="sr-only">Filter submission status</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-12 w-full rounded-xl border px-4"><option value="">All statuses</option>{["NOT_SUBMITTED","DRAFT","SUBMITTED","RESUBMITTED","RETURNED","GRADED"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label></div>
    <div className="mt-5 space-y-3">{visible.map((student) => <details key={student.studentId} className="min-w-0 rounded-xl border">
      <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><strong className="break-words">{student.name}</strong><p className="text-sm text-slate-500">{student.rollNumber ? `Roll ${student.rollNumber} · ` : ""}{student.admissionNumber}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{label(student.submission?.status ?? "NOT_SUBMITTED")}</span></summary>
      <div className="border-t p-4">{student.submission ? <div className="space-y-3"><p className="text-sm text-slate-600">Attempt {student.submission.attemptNumber}{student.submission.submittedAt ? ` · Submitted ${new Date(student.submission.submittedAt).toLocaleString("en-IN")}` : ""}{student.submission.isLate ? " · Late" : ""}</p>{student.submission.textResponse ? <div className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4">{student.submission.textResponse}</div> : <p className="text-slate-500">No written response.</p>}{student.submission.attachments.length ? <ul className="space-y-2">{student.submission.attachments.map((file) => <li key={file.id} className="break-words rounded-xl bg-slate-50 p-3"><a target="_blank" rel="noreferrer" href={`/api/assignments/submissions/attachments/${file.id}/open`} className="font-semibold text-blue-700">{file.originalFileName}</a></li>)}</ul> : null}{["SUBMITTED","RESUBMITTED","GRADED"].includes(student.submission.status) ? <GradeSubmissionPanel sectionId={sectionId} assignmentId={assignmentId} submissionId={student.submission.id} totalMarks={totalMarks} defaultMarks={student.submission.marksAwarded} defaultFeedback={student.submission.teacherFeedback} canReturn={allowResubmission && student.submission.attemptNumber < maximumAttempts} /> : student.submission.status === "RETURNED" ? <p className="rounded-xl bg-amber-50 p-3 text-amber-900">Waiting for correction and resubmission.</p> : <p className="text-slate-500">Drafts are private until the student submits.</p>}</div> : <p className="text-slate-500">No submission yet.</p>}</div>
    </details>)}</div>
  </section>;
}
function label(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase()); }

