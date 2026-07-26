"use client";

import Link from "next/link";
import { Archive, CalendarClock, Copy, FilePlus2, Pencil, Share2, Upload, X } from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";

import {
  archiveClassMaterial,
  createClassMaterial,
  reuseClassMaterial,
  scheduleClassMaterial,
  setClassMaterialVisibility,
  updateClassMaterial,
} from "@/app/teacher-dashboard/classes/[sectionId]/materials/actions";
import { uploadFileToR2 } from "@/lib/storage/client-upload";

type SubjectOption = {
  id: string;
  subjectId: string;
  name: string;
  chapters: Array<{ id: string; title: string; chapterNumber: number }>;
  resources: Array<{ id: string; title: string; type: string }>;
};
type Material = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  source: string;
  status: string;
  scheduledAt: string | null;
  sectionSubjectId: string;
  subjectId: string;
  subjectName: string;
  chapterId: string | null;
  chapterName: string | null;
  aiGenerationId: string | null;
};
type Reusable = { id: string; title: string; kind: string; source: string };
type AiGeneration = { id: string; title: string; tool: string; status: string };

export default function MaterialManager({
  sectionId,
  subjects,
  materials,
  reusable,
  aiGenerations,
}: {
  sectionId: string;
  subjects: SubjectOption[];
  materials: Material[];
  reusable: Reusable[];
  aiGenerations: AiGeneration[];
}) {
  const [drawer, setDrawer] = useState<"create" | "reuse" | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id ?? "");
  const selected = subjects.find((item) => item.id === selectedSubject) ?? subjects[0];
  const grouped = useMemo(() => subjects.map((subject) => ({
    ...subject,
    groups: groupByChapter(materials.filter((material) => material.sectionSubjectId === subject.id)),
  })), [materials, subjects]);

  const run = (action: () => Promise<{ ok: boolean; message: string }>) => {
    setMessage("");
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
      if (result.ok) setDrawer(null);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-bold">Class Materials</h2><p className="mt-1 text-slate-600">Organized by subject and chapter. You control only your own copies.</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setDrawer("reuse")} className="inline-flex min-h-12 items-center rounded-xl border bg-white px-4 py-3 font-bold text-blue-700"><Copy className="mr-2 h-5 w-5" />Reuse</button>
          <button type="button" onClick={() => setDrawer("create")} className="inline-flex min-h-12 items-center rounded-xl bg-blue-600 px-4 py-3 font-bold text-white"><FilePlus2 className="mr-2 h-5 w-5" />Add material</button>
        </div>
      </div>
      {message ? <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 font-semibold text-blue-800">{message}</p> : null}
      {materials.length ? grouped.map((subject) => subject.groups.length ? (
        <section key={subject.id} className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-xl font-bold">{subject.name}</h3>
          <div className="mt-5 space-y-6">
            {subject.groups.map((group) => (
              <div key={group.key}>
                <h4 className="text-sm font-bold uppercase tracking-wide text-slate-500">{group.label}</h4>
                <div className="mt-3 space-y-3">
                  {group.items.map((material) => <MaterialRow key={material.id} material={material} subjects={subjects} sectionId={sectionId} pending={pending} run={run} />)}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null) : (
        <section className="rounded-2xl border bg-white p-10 text-center shadow-sm"><Upload className="mx-auto h-10 w-10 text-slate-300" /><h3 className="mt-4 text-xl font-bold">No class materials yet</h3><p className="mt-2 text-slate-600">Upload a file, link a video, attach AI work, or reuse an assigned publisher resource.</p></section>
      )}
      {drawer ? (
        <>
          <button type="button" aria-label="Close drawer" className="fixed inset-0 z-40 bg-slate-950/40" onClick={() => setDrawer(null)} />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between gap-4"><h2 className="text-2xl font-bold">{drawer === "create" ? "Add class material" : "Reuse material"}</h2><button type="button" onClick={() => setDrawer(null)} className="min-h-11 rounded-xl border p-3" aria-label="Close"><X className="h-5 w-5" /></button></div>
            {drawer === "create" ? <CreateMaterialForm sectionId={sectionId} subjects={subjects} aiGenerations={aiGenerations} pending={pending} run={run} /> : (
              <ReuseForm
                reusable={reusable}
                subjects={subjects}
                selectedSubject={selectedSubject}
                setSelectedSubject={setSelectedSubject}
                selected={selected}
                pending={pending}
                onSubmit={(materialId, chapterId) => run(() => reuseClassMaterial(sectionId, materialId, selected!.id, chapterId || null))}
              />
            )}
          </aside>
        </>
      ) : null}
    </div>
  );
}

function CreateMaterialForm({ sectionId, subjects, aiGenerations, pending, run }: { sectionId: string; subjects: SubjectOption[]; aiGenerations: AiGeneration[]; pending: boolean; run: (action: () => Promise<{ ok: boolean; message: string }>) => void }) {
  const [source, setSource] = useState("UPLOAD");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const selected = subjects.find((item) => item.id === subjectId);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError("");
    const form = new FormData(event.currentTarget);
    if (source === "UPLOAD") {
      const file = form.get("file");
      if (!(file instanceof File) || !file.size) return;
      setUploading(true);
      try {
        const uploaded = await uploadFileToR2({ file, scope: "class-material", targetId: sectionId, onProgress: setProgress });
        form.set("fileUrl", uploaded.objectKey);
        form.set("originalFileName", file.name);
        form.set("mimeType", uploaded.contentType);
        form.set("fileSizeBytes", String(uploaded.sizeBytes));
      } catch {
        setUploadError("Upload failed. Check the file type and size, then try again.");
        return;
      } finally {
        setUploading(false);
      }
    }
    form.set("source", source);
    run(() => createClassMaterial(sectionId, form));
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <Field label="Title"><input required maxLength={160} name="title" className={inputClass} /></Field>
      <Field label="Description"><textarea name="description" maxLength={1000} rows={3} className={inputClass} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Subject"><select required name="sectionSubjectId" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className={inputClass}>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Chapter"><select name="chapterId" className={inputClass}><option value="">General material</option>{selected?.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>Chapter {chapter.chapterNumber}: {chapter.title}</option>)}</select></Field>
        <Field label="Material type"><select name="kind" className={inputClass}>{["LESSON_PLAN","WORKSHEET","PDF","PPT","VIDEO","AI_GENERATED","OTHER"].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
        <Field label="Source"><select value={source} onChange={(event) => setSource(event.target.value)} className={inputClass}>{["UPLOAD","EXTERNAL_LINK","AI_GENERATION","PUBLISHER_RESOURCE"].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
      </div>
      {source === "UPLOAD" ? <Field label="File"><input required name="file" type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.mp4,.webm,.mov" className={inputClass} />{uploading ? <p className="mt-2 text-sm font-semibold text-blue-700">Uploading {progress}%</p> : null}</Field> : null}
      {source === "EXTERNAL_LINK" ? <Field label="Secure video or material link"><input required name="externalUrl" type="url" placeholder="https://…" className={inputClass} /></Field> : null}
      {source === "AI_GENERATION" ? <Field label="AI generated material"><select required name="aiGenerationId" className={inputClass}><option value="">Choose saved AI work</option>{aiGenerations.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.tool}</option>)}</select></Field> : null}
      {source === "PUBLISHER_RESOURCE" ? <Field label="Assigned publisher resource"><select required name="resourceId" className={inputClass}><option value="">Choose a resource</option>{selected?.resources.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.type}</option>)}</select></Field> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Save as"><select name="status" className={inputClass}><option value="DRAFT">Draft</option><option value="SHARED">Share now</option><option value="SCHEDULED">Schedule</option></select></Field>
        <Field label="Schedule date (if scheduled)"><input name="scheduledAt" type="datetime-local" className={inputClass} /></Field>
      </div>
      {uploadError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{uploadError}</p> : null}
      <button disabled={pending || uploading} className="min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">{uploading ? "Uploading…" : pending ? "Saving…" : "Save material"}</button>
    </form>
  );
}

function MaterialRow({ material, subjects, sectionId, pending, run }: { material: Material; subjects: SubjectOption[]; sectionId: string; pending: boolean; run: (action: () => Promise<{ ok: boolean; message: string }>) => void }) {
  const subject = subjects.find((item) => item.id === material.sectionSubjectId);
  return (
    <article className="min-w-0 rounded-xl border p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{label(material.kind)}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{material.status === "SCHEDULED" && material.scheduledAt ? `Scheduled ${new Date(material.scheduledAt).toLocaleString("en-IN")}` : label(material.status)}</span></div><h5 className="mt-3 break-words text-lg font-bold">{material.title}</h5>{material.description ? <p className="mt-1 break-words text-sm text-slate-600">{material.description}</p> : null}</div>
        <OpenMaterial material={material} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={pending} onClick={() => run(() => setClassMaterialVisibility(sectionId, material.id, material.status === "SHARED" ? "UNSHARED" : "SHARED"))} className="inline-flex min-h-11 items-center rounded-xl border px-3 py-2 text-sm font-bold"><Share2 className="mr-2 h-4 w-4" />{material.status === "SHARED" ? "Unshare" : "Share"}</button>
        <details className="rounded-xl border"><summary className="flex min-h-11 cursor-pointer list-none items-center px-3 py-2 text-sm font-bold"><CalendarClock className="mr-2 h-4 w-4" />Schedule</summary><form onSubmit={(event) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get("when") ?? ""); run(() => scheduleClassMaterial(sectionId, material.id, value)); }} className="grid gap-2 border-t p-3"><input required name="when" type="datetime-local" className={inputClass} /><button className="min-h-11 rounded-lg bg-slate-900 px-3 font-bold text-white">Set schedule</button></form></details>
        <details className="rounded-xl border"><summary className="flex min-h-11 cursor-pointer list-none items-center px-3 py-2 text-sm font-bold"><Pencil className="mr-2 h-4 w-4" />Edit</summary><form action={(form) => run(() => updateClassMaterial(sectionId, form))} className="grid gap-3 border-t p-3"><input type="hidden" name="id" value={material.id} /><input required name="title" defaultValue={material.title} className={inputClass} /><textarea name="description" defaultValue={material.description ?? ""} className={inputClass} /><select name="chapterId" defaultValue={material.chapterId ?? ""} className={inputClass}><option value="">General material</option>{subject?.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>Chapter {chapter.chapterNumber}: {chapter.title}</option>)}</select><button className="min-h-11 rounded-lg bg-slate-900 px-3 font-bold text-white">Save changes</button></form></details>
        <button disabled={pending} onClick={() => { if (window.confirm("Remove this material from the class? Reused copies will not be affected.")) run(() => archiveClassMaterial(sectionId, material.id)); }} className="inline-flex min-h-11 items-center rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-700"><Archive className="mr-2 h-4 w-4" />Delete</button>
      </div>
    </article>
  );
}

function OpenMaterial({ material }: { material: Material }) {
  if (material.aiGenerationId) return <Link href={`/teacher-dashboard/ai/generations/${material.aiGenerationId}`} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border px-4 py-2 font-bold text-blue-700">Open</Link>;
  return <a href={`/api/class-materials/${material.id}/open`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border px-4 py-2 font-bold text-blue-700">Open</a>;
}

function ReuseForm({ reusable, subjects, selectedSubject, setSelectedSubject, selected, pending, onSubmit }: { reusable: Reusable[]; subjects: SubjectOption[]; selectedSubject: string; setSelectedSubject: (value: string) => void; selected?: SubjectOption; pending: boolean; onSubmit: (materialId: string, chapterId: string) => void }) {
  return <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSubmit(String(form.get("materialId") ?? ""), String(form.get("chapterId") ?? "")); }} className="mt-6 space-y-5"><Field label="Your existing material"><select required name="materialId" className={inputClass}><option value="">Choose material</option>{reusable.map((item) => <option key={item.id} value={item.id}>{item.title} · {label(item.kind)}</option>)}</select></Field><Field label="Destination subject"><select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)} className={inputClass}>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Destination chapter"><select name="chapterId" className={inputClass}><option value="">General material</option>{selected?.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>Chapter {chapter.chapterNumber}: {chapter.title}</option>)}</select></Field><p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">A separate draft will be created. Editing, sharing, or deleting it will not change the original.</p><button disabled={pending} className="min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Reuse as draft</button></form>;
}

function groupByChapter(items: Material[]) {
  const groups = new Map<string, { key: string; label: string; items: Material[] }>();
  for (const item of items) {
    const key = item.chapterId ?? "general";
    const group = groups.get(key) ?? { key, label: item.chapterName ?? "General materials", items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}
const inputClass = "mt-2 min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-3";
function Field({ label: fieldLabel, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-bold text-slate-700">{fieldLabel}{children}</label>; }
function label(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()); }
