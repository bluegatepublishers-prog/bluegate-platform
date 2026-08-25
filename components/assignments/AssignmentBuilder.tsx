"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import {
  addReferencedAssignmentAttachmentAction,
  addUploadedAssignmentAttachmentAction,
  createAssignmentAction,
  transitionAssignmentAction,
  updateAssignmentAction,
} from "@/app/teacher-dashboard/classes/[sectionId]/assignments/actions";
import { uploadFileToR2 } from "@/lib/storage/client-upload";

type SubjectOption = {
  id: string;
  name: string;
  books: Array<{ id: string; title: string; chapters: Array<{ id: string; title: string; chapterNumber: number }> }>;
  resources: Array<{ id: string; title: string }>;
};
type MaterialOption = { id: string; title: string };
type Initial = {
  id: string;
  title: string;
  instructions: string | null;
  assignmentType: string;
  status: string;
  sectionSubjectId: string | null;
  bookId: string | null;
  chapterId: string | null;
  totalMarks: number | null;
  allowTextSubmission: boolean;
  allowFileSubmission: boolean;
  allowMultipleFiles: boolean;
  maximumFiles: number;
  maximumFileSizeBytes: number;
  acceptedFileTypes: string[];
  allowLateSubmission: boolean;
  allowResubmission: boolean;
  maximumAttempts: number;
  publishAt: string | null;
  dueAt: string | null;
  closeAt: string | null;
};

export default function AssignmentBuilder({ sectionId, subjects, materials, initial, hasAssignmentItems = false, contextSubjectId, contextSubjectName, initialBookId, initialChapterId }: {
  sectionId: string;
  subjects: SubjectOption[];
  materials: MaterialOption[];
  initial?: Initial;
  hasAssignmentItems?: boolean;
  contextSubjectId?: string;
  contextSubjectName?: string;
  initialBookId?: string;
  initialChapterId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [subjectId, setSubjectId] = useState(initial?.sectionSubjectId ?? contextSubjectId ?? "");
  const [bookId, setBookId] = useState(initial?.bookId ?? initialBookId ?? "");
  const subject = subjects.find((item) => item.id === subjectId);
  const books = subject?.books ?? [];
  const book = books.find((item) => item.id === bookId);
  const datetime = (value: string | null | undefined) => value ? new Date(value).toISOString().slice(0, 16) : "";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const file = form.get("attachment");
    const resourceId = String(form.get("resourceAttachmentId") ?? "");
    const materialId = String(form.get("materialAttachmentId") ?? "");
    const intended = String(form.get("intent") ?? "DRAFT");
    startTransition(async () => {
      if (initial) {
        const result = await updateAssignmentAction(sectionId, initial.id, form);
        setMessage(result.message);
        if (result.ok) router.push(`/teacher-dashboard/classes/${sectionId}/assignments/${initial.id}`);
        return;
      }
      const createForm = new FormData();
      for (const [key, value] of form.entries()) if (key !== "attachment") createForm.append(key, value);
      const needsSecondStep = (file instanceof File && file.size > 0) || resourceId || materialId;
      if (needsSecondStep && intended !== "DRAFT") createForm.set("intent", "DRAFT");
      const created = await createAssignmentAction(sectionId, createForm);
      if (!created.ok) { setMessage(created.message); return; }
      const assignmentId = created.data.id;
      if (file instanceof File && file.size > 0) {
        try {
          const uploaded = await uploadFileToR2({ file, scope: "assignment-attachment", targetId: assignmentId, onProgress: setProgress });
          const attached = await addUploadedAssignmentAttachmentAction(sectionId, assignmentId, {
            objectKey: uploaded.objectKey,
            originalFileName: file.name,
            mimeType: uploaded.contentType,
            fileSizeBytes: uploaded.sizeBytes,
          });
          if (!attached.ok) { setMessage(attached.message); return; }
        } catch {
          setMessage("The assignment draft was saved, but the attachment upload failed.");
          router.push(`/teacher-dashboard/classes/${sectionId}/assignments/${assignmentId}/edit`);
          return;
        }
      }
      if (resourceId) {
        const attached = await addReferencedAssignmentAttachmentAction(sectionId, assignmentId, "RESOURCE", resourceId);
        if (!attached.ok) { setMessage(attached.message); return; }
      }
      if (materialId) {
        const attached = await addReferencedAssignmentAttachmentAction(sectionId, assignmentId, "CLASS_MATERIAL", materialId);
        if (!attached.ok) { setMessage(attached.message); return; }
      }
      if (needsSecondStep && intended === "PUBLISHED") await transitionAssignmentAction(sectionId, assignmentId, "PUBLISH");
      if (needsSecondStep && intended === "SCHEDULED") {
        const scheduled = await updateAssignmentAction(sectionId, assignmentId, form);
        if (!scheduled.ok) { setMessage(scheduled.message); return; }
      }
      router.push(`/teacher-dashboard/classes/${sectionId}/assignments/${assignmentId}`);
    });
  }
  const allowedResources = subject?.resources ?? [];
  const field = "min-h-10 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2";
  return <form onSubmit={submit} className="space-y-4">
    <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-bold">Assignment details</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="font-semibold">Title</span><input required maxLength={160} name="title" defaultValue={initial?.title} className={`mt-2 ${field}`} /></label>
        <label><span className="font-semibold">Type</span><select name="assignmentType" defaultValue={initial?.assignmentType ?? "HOMEWORK"} className={`mt-2 ${field}`}>{["HOMEWORK","CLASSWORK","PROJECT","WORKSHEET","READING","PRACTICAL","OTHER"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
<label><span className="font-semibold">Assigned subject</span>{contextSubjectId ? <><input type="hidden" name="sectionSubjectId" value={contextSubjectId} /><p className="mt-2 min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">{contextSubjectName ?? subject?.name}</p></> : <select name="sectionSubjectId" required value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setBookId(""); }} className={"mt-2 " + field}><option value="">Choose assigned subject</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</label>
        <label><span className="font-semibold">Book</span><select name="bookId" value={bookId} onChange={(event) => setBookId(event.target.value)} disabled={!subjectId || hasAssignmentItems} className={`mt-2 ${field}`}><option value="">No book</option>{books.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <>{hasAssignmentItems ? <p className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">Remove book-bound Assignment Items before changing the Assignment Book.</p> : null}</>
        <label><span className="font-semibold">Chapter</span><select name="chapterId" defaultValue={initial?.chapterId ?? initialChapterId ?? ""} disabled={!bookId} className={`mt-2 ${field}`}><option value="">No chapter</option>{book?.chapters.map((item) => <option key={item.id} value={item.id}>Chapter {item.chapterNumber}: {item.title}</option>)}</select></label>
        <label className="sm:col-span-2"><span className="font-semibold">Instructions</span><textarea name="instructions" defaultValue={initial?.instructions ?? ""} maxLength={10000} rows={7} className={`mt-2 ${field}`} /></label>
        <label><span className="font-semibold">Total marks</span><input name="totalMarks" type="number" min={1} max={10000} defaultValue={initial?.totalMarks ?? ""} className={`mt-2 ${field}`} /></label>
      </div>
    </section>
    <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-bold">How students respond</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Check name="allowTextSubmission" label="Allow written response" defaultChecked={initial?.allowTextSubmission ?? true} />
        <Check name="allowFileSubmission" label="Allow file upload" defaultChecked={initial?.allowFileSubmission ?? false} />
        <Check name="allowMultipleFiles" label="Allow multiple files" defaultChecked={initial?.allowMultipleFiles ?? false} />
        <Check name="allowLateSubmission" label="Allow late submission" defaultChecked={initial?.allowLateSubmission ?? false} />
        <Check name="allowResubmission" label="Allow correction and resubmission" defaultChecked={initial?.allowResubmission ?? false} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label><span className="font-semibold">Maximum files</span><input name="maximumFiles" type="number" min={1} max={10} defaultValue={initial?.maximumFiles ?? 1} className={`mt-2 ${field}`} /></label>
        <label><span className="font-semibold">Maximum file size (MB)</span><input name="maximumFileSizeMb" type="number" min={1} max={25} defaultValue={initial ? Math.round(initial.maximumFileSizeBytes / 1024 / 1024) : 10} className={`mt-2 ${field}`} /></label>
        <label><span className="font-semibold">Maximum attempts</span><input name="maximumAttempts" type="number" min={1} max={10} defaultValue={initial?.maximumAttempts ?? 1} className={`mt-2 ${field}`} /></label>
      </div>
      <fieldset className="mt-5"><legend className="font-semibold">Accepted file types</legend><div className="mt-3 flex flex-wrap gap-3">{[
        ["application/pdf","PDF"],["image/jpeg","JPG"],["image/png","PNG"],["image/webp","WebP"],["application/msword","DOC"],["application/vnd.openxmlformats-officedocument.wordprocessingml.document","DOCX"],["application/vnd.ms-powerpoint","PPT"],["application/vnd.openxmlformats-officedocument.presentationml.presentation","PPTX"],
      ].map(([value, text]) => <label key={value} className="flex min-h-11 items-center gap-2 rounded-xl border px-3"><input type="checkbox" name="acceptedFileTypes" value={value} defaultChecked={initial?.acceptedFileTypes.includes(value) ?? ["application/pdf","image/jpeg","image/png"].includes(value)} />{text}</label>)}</div></fieldset>
    </section>
    {!initial ? <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5"><h2 className="text-lg font-bold">Attachments</h2><p className="mt-1 text-sm text-slate-600">Optional. Files remain private and are opened through protected links.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label><span className="font-semibold">Upload a file</span><input name="attachment" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.ppt,.pptx" className={`mt-2 ${field}`} /></label><label><span className="font-semibold">Class material</span><select name="materialAttachmentId" className={`mt-2 ${field}`}><option value="">None</option>{materials.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label><span className="font-semibold">Protected resource</span><select name="resourceAttachmentId" className={`mt-2 ${field}`}><option value="">None</option>{allowedResources.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>{progress ? <p className="mt-3 text-sm font-semibold text-blue-700">Uploading {progress}%</p> : null}</section> : null}
    <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-bold">Publishing and dates</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label><span className="font-semibold">Save as</span><select name="intent" defaultValue={initial?.status === "SCHEDULED" ? "SCHEDULED" : initial?.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"} className={`mt-2 ${field}`}><option value="DRAFT">Draft</option><option value="PUBLISHED">Publish now</option><option value="SCHEDULED">Schedule</option></select></label>
        <label><span className="font-semibold">Publish date</span><input name="publishAt" type="datetime-local" defaultValue={datetime(initial?.publishAt)} className={`mt-2 ${field}`} /></label>
        <label><span className="font-semibold">Due date</span><input name="dueAt" type="datetime-local" defaultValue={datetime(initial?.dueAt)} className={`mt-2 ${field}`} /></label>
        <label><span className="font-semibold">Close date</span><input name="closeAt" type="datetime-local" defaultValue={datetime(initial?.closeAt)} className={`mt-2 ${field}`} /></label>
      </div>
    </section>
    {message ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-900">{message}</p> : null}
    <div className="flex flex-wrap gap-3"><button disabled={pending} className="min-h-12 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-50">{pending ? "Saving…" : initial ? "Save changes" : "Create assignment"}</button><button type="button" onClick={() => router.back()} className="min-h-12 rounded-xl border bg-white px-6 py-3 font-bold">Cancel</button></div>
  </form>;
}

function Check({ name, label: text, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return <label className="flex min-h-12 items-center gap-3 rounded-xl border p-3"><input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-5 w-5" /><span className="font-semibold">{text}</span></label>;
}
function label(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase()); }
