"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { GradeSubmissionPanel } from "./AssignmentTeacherActions";

type StudentRow = {
  studentId: string;
  name: string;
  admissionNumber: string;
  rollNumber: string | null;
  assignmentWork: Array<{ assignmentItemId: string | null; payload: unknown; targetSourceHash: string | null; updatedAt: string }>;
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

export default function SubmissionReviewList({ sectionId, assignmentId, students, totalMarks, allowResubmission, maximumAttempts, assignmentItems }: { sectionId: string; assignmentId: string; students: StudentRow[]; totalMarks: number | null; allowResubmission: boolean; maximumAttempts: number; assignmentItems: Array<{ id: string; sequence: number; type: string; targetLabelSnapshot: string | null; state: string; targetSourceHash: string | null }> }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const visible = useMemo(() => students.filter((student) => {
    const current = student.submission?.status ?? "NOT_SUBMITTED";
    const matchesStatus = status === "ALL"
      || (status === "NEEDS_REVIEW" && ["SUBMITTED", "RESUBMITTED"].includes(current))
      || current === status;
    return matchesStatus && `${student.name} ${student.admissionNumber}`.toLowerCase().includes(query.trim().toLowerCase());
  }), [query, status, students]);
  return <section className="rounded-2xl border bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Student submissions</h2><p className="mt-1 text-sm text-slate-600">Only students actively enrolled in this section are shown.</p></div></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]"><label className="relative"><span className="sr-only">Search students</span><Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student" className="min-h-12 w-full rounded-xl border py-3 pl-11 pr-4" /></label><label><span className="sr-only">Filter submission status</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-12 w-full rounded-xl border px-4"><option value="ALL">All</option><option value="NEEDS_REVIEW">Needs Review</option><option value="RETURNED">Returned</option><option value="RESUBMITTED">Resubmitted</option><option value="GRADED">Graded</option></select></label></div>
    <div className="mt-5 space-y-3">{visible.map((student) => <details key={student.studentId} className="min-w-0 rounded-xl border">
      <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><strong className="break-words">{student.name}</strong><p className="text-sm text-slate-500">{student.rollNumber ? `Roll ${student.rollNumber} · ` : ""}{student.admissionNumber}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{label(student.submission?.status ?? "NOT_SUBMITTED")}</span></summary>
      <div className="border-t p-4">{student.submission ? <div className="space-y-3"><p className="text-sm text-slate-600">Attempt {student.submission.attemptNumber}{student.submission.submittedAt ? ` · Submitted ${new Date(student.submission.submittedAt).toLocaleString("en-IN")}` : ""}{student.submission.isLate ? " · Late" : ""}</p>{student.submission.textResponse ? <div className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4">{student.submission.textResponse}</div> : <p className="text-slate-500">No written response.</p>}{student.submission.attachments.length ? <ul className="space-y-2">{student.submission.attachments.map((file) => <li key={file.id} className="break-words rounded-xl bg-slate-50 p-3"><a target="_blank" rel="noreferrer" href={`/api/assignments/submissions/attachments/${file.id}/open`} className="font-semibold text-blue-700">{file.originalFileName}</a></li>)}</ul> : null}{student.submission.status !== "DRAFT" ? <AssignmentWorkReview items={assignmentItems} work={student.assignmentWork} /> : null}{["SUBMITTED","RESUBMITTED","GRADED"].includes(student.submission.status) ? <GradeSubmissionPanel sectionId={sectionId} assignmentId={assignmentId} submissionId={student.submission.id} totalMarks={totalMarks} defaultMarks={student.submission.marksAwarded} defaultFeedback={student.submission.teacherFeedback} canReturn={allowResubmission && student.submission.attemptNumber < maximumAttempts} /> : student.submission.status === "RETURNED" ? <p className="rounded-xl bg-amber-50 p-3 text-amber-900">Waiting for correction and resubmission.</p> : <p className="text-slate-500">Drafts are private until the student submits.</p>}</div> : <p className="text-slate-500">No submission yet.</p>}</div>
    </details>)}</div>
  </section>;
}
function label(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase()); }


function AssignmentWorkReview({ items, work }: { items: Array<{ id: string; sequence: number; type: string; targetLabelSnapshot: string | null; state: string; targetSourceHash: string | null }>; work: StudentRow["assignmentWork"] }) {
  const questions = items.filter((item) => item.type === "PUBLISHER_QUESTION" || item.type === "TEACHER_QUESTION");
  if (!questions.length) return null;
  const responses = new Map(work.filter((item) => item.assignmentItemId).map((item) => [item.assignmentItemId as string, item]));
  return <section className="rounded-xl border border-slate-200 bg-slate-50 p-3"><h3 className="font-bold">Assignment Work</h3><ol className="mt-3 space-y-2">{questions.map((item) => {
    const response = responses.get(item.id);
    const text = answerPreview(response?.payload);
    const stale = Boolean(response?.targetSourceHash && item.state === "SOURCE_CHANGED" && response.targetSourceHash === item.targetSourceHash);
    return <li key={item.id} className="rounded-lg bg-white p-3 text-sm"><p className="font-semibold">{item.sequence}. {item.targetLabelSnapshot ?? (item.type === "TEACHER_QUESTION" ? "Teacher question" : "Book question")}</p>{item.state === "MISSING_TARGET" ? <p className="mt-1 text-amber-800">Source content is no longer available.</p> : null}{stale ? <p className="mt-1 text-amber-800">Saved before the current book update.</p> : null}<p className="mt-1 whitespace-pre-wrap break-words text-slate-700">{text || "No saved answer."}</p></li>;
  })}</ol></section>;
}

function answerPreview(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  const value = payload as Record<string, unknown>;
  if (typeof value.value === "string") return value.value;
  if (typeof value.text === "string") return value.text;
  if (Array.isArray(value.optionIds)) return value.optionIds.filter((id): id is string => typeof id === "string").join(", ");
  return "";
}