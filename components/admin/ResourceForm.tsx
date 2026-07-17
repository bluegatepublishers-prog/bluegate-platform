"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import Image from "next/image";
import { ResourceAudience, type Resource, type ResourceType } from "@prisma/client";
import { uploadPresigned } from "@vercel/blob/client";
import { publisherUploadPath, validateDirectUpload } from "@/lib/storage/upload-policy";
import { usePublisherAdminId } from "@/components/admin/PublisherAdminContext";
import { RESOURCE_AUDIENCE_OPTIONS } from "@/lib/resource-audience-ui";

const ACCEPTED_FILES = ".pdf,.ppt,.pptx,.doc,.docx,.zip,.mp4,.webm,.mov";

type FormState = Pick<Resource, "title" | "description" | "subject" | "classLevel" | "type" | "audience" | "fileUrl" | "thumbnail" | "featured" | "published">;

export default function ResourceForm({ resource }: { resource?: Resource }) {
  const publisherId = usePublisherAdminId();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [form, setForm] = useState<FormState>({
    title: resource?.title ?? "", description: resource?.description ?? "",
    subject: resource?.subject ?? "", classLevel: resource?.classLevel ?? "",
    type: resource?.type ?? "PDF", audience: resource?.audience ?? ResourceAudience.TEACHER_ONLY, fileUrl: resource?.fileUrl ?? "",
    thumbnail: resource?.thumbnail ?? null, featured: resource?.featured ?? false,
    published: resource?.published ?? true,
  });

  async function upload(file: File, scope: "resource-file" | "resource-thumbnail") { setError("");setUploadMessage("");setProgress(0);const validation=validateDirectUpload(file,scope);if(!validation.ok){setError(validation.message);return}try{const blob=await uploadPresigned(publisherUploadPath(publisherId,scope,file.name),file,{access:"public",handleUploadUrl:"/api/upload",clientPayload:JSON.stringify({scope,originalName:file.name}),multipart:file.size>5*1024*1024,onUploadProgress:event=>setProgress(Math.max(1,Math.round(event.percentage)))});if(scope==="resource-file")setForm(value=>({...value,fileUrl:blob.url,type:inferType(file.name)}));else setForm(value=>({...value,thumbnail:blob.url}));setUploadMessage("Upload complete.");setProgress(100)}catch{setError("The file could not be uploaded. Please try again.");setProgress(0)}}

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    const response = await fetch(resource ? `/api/admin/resources/${resource.id}` : "/api/admin/resources", {
      method: resource ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setSaving(false);
    if (!response.ok) { setError((await response.json()).message ?? "Unable to save resource."); return; }
    router.push("/admin/resources"); router.refresh();
  }

  return <form onSubmit={submit} className="space-y-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); const file=e.dataTransfer.files[0]; if(file) upload(file,"resource-file"); }} className={`rounded-2xl border-2 border-dashed p-8 text-center ${dragging ? "border-blue-500 bg-blue-50" : "border-slate-300"}`}>
      <UploadCloud className="mx-auto h-10 w-10 text-blue-600" /><h2 className="mt-3 font-bold">Drop a resource file here</h2><p className="mt-1 text-sm text-slate-500">PDF, PPTX, DOCX, ZIP or MP4 · maximum 100 MB</p>
      <input ref={fileInput} type="file" accept={ACCEPTED_FILES} className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "resource-file")} />
      <button type="button" onClick={() => fileInput.current?.click()} className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white">Choose file</button>
      {form.fileUrl ? <p className="mt-3 break-all text-sm text-green-700">Uploaded: {form.fileUrl}</p> : null}
      {progress > 0 && progress < 100 ? <div className="mx-auto mt-4 max-w-md"><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-blue-600" style={{ width: `${progress}%` }} /></div><p className="mt-1 text-sm">{progress}%</p></div> : null}
      {progress > 0 && progress < 100 ? <p className="mt-2 text-sm font-semibold text-blue-700">Uploading…</p> : null}
      {uploadMessage ? <p role="status" className="mt-3 text-sm font-semibold text-emerald-700">{uploadMessage}</p> : null}
    </div>
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} required />
      <Field label="Subject" value={form.subject} onChange={(subject) => setForm({ ...form, subject })} required />
      <Field label="Class" value={form.classLevel} onChange={(classLevel) => setForm({ ...form, classLevel })} required />
      <label className="text-sm font-semibold text-slate-700">Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ResourceType })} className="mt-2 w-full rounded-xl border px-4 py-3">{["PDF","PPT","DOC","ZIP","VIDEO"].map((type)=><option key={type}>{type}</option>)}</select></label>
    </div>
    <fieldset className="rounded-2xl border border-slate-200 p-5"><legend className="px-2 font-bold">Audience</legend><p className="mb-4 text-sm text-slate-600">Required. File type does not determine who may use this resource.</p><div className="space-y-3">{RESOURCE_AUDIENCE_OPTIONS.map(({value,label,description})=><label key={value} className="flex gap-3 rounded-xl border p-4"><input required type="radio" name="audience" value={value} checked={form.audience===value} onChange={()=>setForm({...form,audience:value})}/><span><strong>{label}</strong><span className="mt-1 block text-sm font-normal text-slate-500">{description}</span></span></label>)}</div></fieldset>
    <label className="block text-sm font-semibold text-slate-700">Description<textarea rows={5} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className="mt-2 w-full rounded-xl border px-4 py-3" /></label>
    <label className="block text-sm font-semibold text-slate-700">Thumbnail<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e)=>e.target.files?.[0]&&upload(e.target.files[0],"resource-thumbnail")} className="mt-2 block w-full rounded-xl border p-3" /></label>
    {form.thumbnail ? <Image src={form.thumbnail} alt="Resource thumbnail preview" width={192} height={128} className="h-32 w-48 rounded-xl border object-cover" /> : null}
    <div className="flex flex-wrap gap-6"><Check label="Featured" checked={form.featured} onChange={(featured)=>setForm({...form,featured})}/><Check label="Published" checked={form.published} onChange={(published)=>setForm({...form,published})}/></div>
    {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
    <button disabled={saving || !form.fileUrl || (progress > 0 && progress < 100)} className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : resource ? "Update resource" : "Create resource"}</button>
  </form>;
}

function inferType(name: string): ResourceType { const ext=name.toLowerCase().split(".").pop(); if(ext==="ppt"||ext==="pptx")return "PPT"; if(ext==="doc"||ext==="docx")return "DOC"; if(ext==="mp4"||ext==="webm"||ext==="mov")return "VIDEO"; if(ext==="zip")return "ZIP"; return "PDF"; }
function Field({label,value,onChange,required}:{label:string;value:string;onChange:(value:string)=>void;required?:boolean}) { return <label className="text-sm font-semibold text-slate-700">{label}<input required={required} value={value} onChange={(e)=>onChange(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3" /></label>; }
function Check({label,checked,onChange}:{label:string;checked:boolean;onChange:(value:boolean)=>void}) { return <label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={checked} onChange={(e)=>onChange(e.target.checked)} />{label}</label>; }
