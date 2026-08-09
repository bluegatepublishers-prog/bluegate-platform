"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import {
  addSubmissionAttachmentAction,
  removeSubmissionAttachmentAction,
  saveSubmissionDraftAction,
  submitAssignmentAction,
} from "@/app/student-dashboard/assignments/actions";
import { uploadFileToR2 } from "@/lib/storage/client-upload";
import type { AssignmentCompletionSummary } from "@/lib/assignments/assignment-completion";

type Submission = {
  id: string;
  status: string;
  attemptNumber: number;
  textResponse: string | null;
  submittedAt: Date | string | null;
  isLate: boolean;
  teacherFeedback: string | null;
  marksAwarded: number | null;
  attachments: Array<{ id: string; originalFileName: string; fileSizeBytes: number }>;
} | null;

export default function SubmissionEditor({ assignmentId, allowText, allowFiles, acceptedFileTypes, maximumFileSizeBytes, maximumFiles, allowResubmission, maximumAttempts, acceptsSubmission, submission, resultsReleased, totalMarks, assignmentType, completion }: {
  assignmentId: string;
  allowText: boolean;
  allowFiles: boolean;
  acceptedFileTypes: string[];
  maximumFileSizeBytes: number;
  maximumFiles: number;
  allowResubmission: boolean;
  maximumAttempts: number;
  acceptsSubmission: boolean;
  submission: Submission;
  resultsReleased: boolean;
  totalMarks: number | null;
  assignmentType: string;
  completion: AssignmentCompletionSummary | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [submitAfterSave, setSubmitAfterSave] = useState(false);
  const editable = acceptsSubmission && (!submission || ["DRAFT","RETURNED"].includes(submission.status));
  const draftFileCount = submission?.status === "DRAFT" ? submission.attachments.length : 0;
  const homeworkBlocked = assignmentType === "HOMEWORK" && Boolean(completion && completion.totalAnswerable > 0 && !completion.canSubmit);
  async function save(event: FormEvent<HTMLFormElement>, submitAfter: boolean) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const saved = await saveSubmissionDraftAction(assignmentId, form);
      if (!saved.ok) { setMessage(saved.message); return; }
      const file = form.get("file");
      if (file instanceof File && file.size > 0) {
        try {
          const uploaded = await uploadFileToR2({ file, scope: "submission-attachment", targetId: assignmentId, onProgress: setProgress });
          const attached = await addSubmissionAttachmentAction(assignmentId, {
            objectKey: uploaded.objectKey,
            originalFileName: file.name,
            mimeType: uploaded.contentType,
            fileSizeBytes: uploaded.sizeBytes,
          });
          if (!attached.ok) { setMessage(attached.message); return; }
        } catch {
          setMessage("Your draft was saved, but the file upload failed.");
          return;
        }
      }
      if (submitAfter) {
        if (!window.confirm("Submit this work now? You cannot overwrite it after submission unless your teacher returns it.")) return;
        const submitted = await submitAssignmentAction(assignmentId);
        setMessage(submitted.message);
      } else {
        setMessage("Draft saved.");
      }
      router.refresh();
    });
  }
  if (!editable) return <section className="rounded-2xl border bg-white p-5 shadow-sm">
    <h2 className="text-xl font-bold">Your submission</h2>
    {submission ? <div className="mt-4 space-y-3"><Status value={submission.status} />{submission.submittedAt ? <p>Submitted {new Date(submission.submittedAt).toLocaleString("en-IN")}{submission.isLate ? " · Late" : ""}</p> : null}{submission.textResponse ? <div className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4">{submission.textResponse}</div> : null}<Files files={submission.attachments} />{submission.teacherFeedback ? <div className="rounded-xl bg-blue-50 p-4"><strong>Teacher feedback</strong><p className="mt-1 whitespace-pre-wrap">{submission.teacherFeedback}</p></div> : null}{resultsReleased && submission.marksAwarded !== null ? <p className="rounded-xl bg-emerald-50 p-4 font-bold text-emerald-800">Marks: {submission.marksAwarded}{totalMarks !== null ? ` / ${totalMarks}` : ""}</p> : null}</div> : <p className="mt-3 text-slate-600">The submission window is closed.</p>}
  </section>;
  return <form onSubmit={(event) => save(event, submitAfterSave)} className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
    <h2 className="text-xl font-bold">{submission?.status === "RETURNED" ? "Correct and resubmit" : "Your work"}</h2>
    {submission?.status === "RETURNED" && submission.teacherFeedback ? <div className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-950"><strong>Teacher feedback</strong><p className="mt-1 whitespace-pre-wrap">{submission.teacherFeedback}</p></div> : null}
    {allowText ? <label className="mt-5 block"><span className="font-semibold">Written response</span><textarea name="textResponse" maxLength={20000} rows={10} defaultValue={submission?.status === "RETURNED" ? submission.textResponse ?? "" : submission?.textResponse ?? ""} className="mt-2 w-full rounded-xl border p-4" /></label> : <input type="hidden" name="textResponse" value="" />}
    <Files files={submission?.attachments ?? []} assignmentId={assignmentId} removable={submission?.status === "DRAFT"} />
    {allowFiles && draftFileCount < maximumFiles ? <label className="mt-5 block"><span className="font-semibold">Add a file</span><input name="file" type="file" accept={acceptedFileTypes.join(",")} className="mt-2 min-h-12 w-full rounded-xl border p-3" /><span className="mt-1 block text-sm text-slate-500">Maximum {Math.round(maximumFileSizeBytes / 1024 / 1024)} MB · up to {maximumFiles} file(s)</span></label> : null}
    {progress ? <p className="mt-3 text-sm font-semibold text-blue-700">Uploading {progress}%</p> : null}
    {allowResubmission ? <p className="mt-4 text-sm text-slate-600">Attempt {(submission?.attemptNumber ?? 0) + (submission?.status === "RETURNED" ? 1 : 0)} of {maximumAttempts}</p> : null}
    {homeworkBlocked ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{completion?.staleAnswerable ? "Review saved answers after the book update before submitting." : `Answer ${completion?.remainingAnswerable ?? 0} remaining question${completion?.remainingAnswerable === 1 ? "" : "s"} before submitting.`}</p> : null}
    {message ? <p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 font-semibold text-blue-800">{message}</p> : null}
    <div className="mt-5 flex flex-wrap gap-3"><button type="submit" onClick={() => setSubmitAfterSave(false)} disabled={pending} className="min-h-12 rounded-xl border bg-white px-5 py-3 font-bold">Save draft</button><button type="submit" onClick={() => setSubmitAfterSave(true)} disabled={pending || homeworkBlocked} className="min-h-12 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">{submission?.status === "RETURNED" ? "Resubmit" : "Submit"}</button></div>
  </form>;
}

function Files({ files, assignmentId, removable = false }: { files: Array<{ id: string; originalFileName: string; fileSizeBytes: number }>; assignmentId?: string; removable?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return files.length ? <div className="mt-4"><strong>Files</strong><ul className="mt-2 space-y-2">{files.map((file) => <li key={file.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm"><a href={`/api/assignments/submissions/attachments/${file.id}/open`} target="_blank" rel="noreferrer" className="min-w-0 break-words font-semibold text-blue-700">{file.originalFileName}</a><span>{Math.max(1, Math.round(file.fileSizeBytes / 1024))} KB</span>{removable && assignmentId ? <button type="button" disabled={pending} onClick={() => startTransition(async () => { await removeSubmissionAttachmentAction(assignmentId, file.id); router.refresh(); })} aria-label={`Remove ${file.originalFileName}`} className="min-h-10 rounded-lg border border-red-200 px-3 font-bold text-red-700">Remove</button> : null}</li>)}</ul></div> : null;
}
function Status({ value }: { value: string }) { return <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{value.toLowerCase().replaceAll("_", " ")}</span>; }
