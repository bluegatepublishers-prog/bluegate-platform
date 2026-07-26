"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  gradeSubmissionAction,
  returnSubmissionAction,
  transitionAssignmentAction,
} from "@/app/teacher-dashboard/classes/[sectionId]/assignments/actions";

export function AssignmentLifecycleActions({ sectionId, assignmentId, status, hasGrades }: { sectionId: string; assignmentId: string; status: string; hasGrades: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const run = (transition: "PUBLISH" | "CLOSE" | "REOPEN" | "ARCHIVE" | "PUBLISH_RESULTS", confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    startTransition(async () => {
      const result = await transitionAssignmentAction(sectionId, assignmentId, transition);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  };
  return <div className="space-y-3"><div className="flex flex-wrap gap-2">
    {["DRAFT","SCHEDULED"].includes(status) ? <button disabled={pending} onClick={() => run("PUBLISH")} className={primary}>Publish now</button> : null}
    {["PUBLISHED","SCHEDULED"].includes(status) ? <button disabled={pending} onClick={() => run("CLOSE")} className={secondary}>Close</button> : null}
    {status === "CLOSED" ? <button disabled={pending} onClick={() => run("REOPEN")} className={secondary}>Reopen</button> : null}
    {hasGrades && ["PUBLISHED","CLOSED"].includes(status) ? <button disabled={pending} onClick={() => run("PUBLISH_RESULTS", "Release graded marks and feedback to students?")} className={primary}>Publish results</button> : null}
    {status !== "ARCHIVED" ? <button disabled={pending} onClick={() => run("ARCHIVE", "Archive this assignment? Students will no longer see it in active lists.")} className="min-h-11 rounded-xl border border-red-200 px-4 py-2 font-bold text-red-700">Archive</button> : null}
  </div>{message ? <p role="status" className="text-sm font-semibold text-blue-800">{message}</p> : null}</div>;
}

export function GradeSubmissionPanel({ sectionId, assignmentId, submissionId, totalMarks, defaultMarks, defaultFeedback, canReturn }: { sectionId: string; assignmentId: string; submissionId: string; totalMarks: number | null; defaultMarks: number | null; defaultFeedback: string | null; canReturn: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const run = (action: "grade" | "return", form: FormData) => startTransition(async () => {
    const result = action === "grade"
      ? await gradeSubmissionAction(sectionId, assignmentId, submissionId, form)
      : await returnSubmissionAction(sectionId, assignmentId, submissionId, form);
    setMessage(result.message);
    if (result.ok) router.refresh();
  });
  return <form onSubmit={(event) => { event.preventDefault(); run("grade", new FormData(event.currentTarget)); }} className="mt-4 grid gap-3 rounded-xl border bg-slate-50 p-4">
    {totalMarks !== null ? <label><span className="font-semibold">Marks awarded (out of {totalMarks})</span><input required name="marksAwarded" type="number" min={0} max={totalMarks} defaultValue={defaultMarks ?? ""} className={input} /></label> : <input type="hidden" name="marksAwarded" value="" />}
    <label><span className="font-semibold">Feedback</span><textarea name="teacherFeedback" maxLength={5000} defaultValue={defaultFeedback ?? ""} rows={3} className={input} /></label>
    <div className="flex flex-wrap gap-2"><button disabled={pending} className={primary}>Save grade</button>{canReturn ? <button type="button" disabled={pending} onClick={(event) => run("return", new FormData(event.currentTarget.form!))} className={secondary}>Return for correction</button> : null}</div>
    {message ? <p role="status" className="text-sm font-semibold text-blue-800">{message}</p> : null}
  </form>;
}

const primary = "min-h-11 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50";
const secondary = "min-h-11 rounded-xl border bg-white px-4 py-2 font-bold disabled:opacity-50";
const input = "mt-2 min-h-11 w-full rounded-xl border bg-white px-3 py-2";

