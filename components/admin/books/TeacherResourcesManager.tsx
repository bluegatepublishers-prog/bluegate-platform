"use client";

import { FileText, Folder, FolderPlus, LoaderCircle, Upload, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { uploadFileToR2 } from "@/lib/storage/client-upload";

type Result = { ok: true } | { ok: false; message: string };
type FolderRow = { id: string; parentFolderId: string | null; name: string; updatedAt?: Date };
type ResourceRow = { id: string; folderId: string; title: string; originalFileName: string; sizeBytes: string; published: boolean; updatedAt: Date };
type Workspace = { currentFolder: FolderRow | null; breadcrumb: FolderRow[]; folders: FolderRow[]; resources: ResourceRow[]; folderOptions: FolderRow[] };
type UploadState = { id: string; name: string; status: "Waiting" | "Uploading" | "Complete" | "Failed"; message?: string };

const isPdf = (file: File) => file.name.toLowerCase().endsWith(".pdf") && (!file.type || file.type.toLowerCase() === "application/pdf");
const formatSize = (bytes: string) => `${(Number(bytes) / (1024 * 1024)).toFixed(Number(bytes) >= 10 * 1024 * 1024 ? 0 : 1)} MB`;

export default function TeacherResourcesManager({ bookId, workspace, createFolder, renameFolder, createResource, renameResource, setPublished, moveResource, archiveResource }: {
  bookId: string; workspace: Workspace;
  createFolder: (parentFolderId: string | null, name: string) => Promise<Result>;
  renameFolder: (folderId: string, name: string) => Promise<Result>;
  createResource: (input: { folderId: string; objectKey: string; originalFileName: string; contentType: string; sizeBytes: number }) => Promise<Result>;
  renameResource: (resourceId: string, title: string) => Promise<Result>;
  setPublished: (resourceId: string, published: boolean) => Promise<Result>;
  moveResource: (resourceId: string, folderId: string) => Promise<Result>;
  archiveResource: (resourceId: string) => Promise<Result>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [folderName, setFolderName] = useState("");
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [message, setMessage] = useState("");
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const currentFolderId = workspace.currentFolder?.id ?? null;

  function openFolder(folderId: string | null) { router.push(folderId ? `/admin/books/${bookId}/content/teacher-resources?folder=${encodeURIComponent(folderId)}` : `/admin/books/${bookId}/content/teacher-resources`); }
  function run(action: () => Promise<Result>) { startTransition(async () => { const result = await action(); if (!result.ok) setMessage(result.message); else router.refresh(); }); }
  function submitFolder() { const name = folderName.trim(); if (!name) return; run(async () => { const result = await createFolder(currentFolderId, name); if (result.ok) { setFolderName(""); setShowFolderDialog(false); } return result; }); }
  async function uploadFiles(files: File[]) {
    if (!currentFolderId) { setMessage("Create or open a folder before uploading PDFs."); return; }
    const entries = files.map((file, index) => ({ id: `${file.name}-${file.lastModified}-${index}`, name: file.name, status: "Waiting" as const }));
    setUploads((current) => [...entries, ...current]);
    await Promise.all(files.map(async (file, index) => {
      const id = entries[index].id;
      if (!isPdf(file)) { setUploads((current) => current.map((entry) => entry.id === id ? { ...entry, status: "Failed", message: "PDF files only." } : entry)); return; }
      setUploads((current) => current.map((entry) => entry.id === id ? { ...entry, status: "Uploading" } : entry));
      try {
        const uploaded = await uploadFileToR2({ file, scope: "teacher-resource-pdf", targetId: bookId, transport: "SAME_ORIGIN_PROXY", failurePrefix: "TEACHER_RESOURCE" });
        const result = await createResource({ folderId: currentFolderId, objectKey: uploaded.objectKey, originalFileName: file.name, contentType: uploaded.contentType, sizeBytes: uploaded.sizeBytes });
        if (!result.ok) throw new Error(result.message);
        setUploads((current) => current.map((entry) => entry.id === id ? { ...entry, status: "Complete" } : entry));
        router.refresh();
      } catch (error) { setUploads((current) => current.map((entry) => entry.id === id ? { ...entry, status: "Failed", message: error instanceof Error ? error.message : "Upload failed." } : entry)); }
    }));
  }
  function renameFolderPrompt() { if (!workspace.currentFolder) return; const name = window.prompt("Folder name", workspace.currentFolder.name); if (name) run(() => renameFolder(workspace.currentFolder!.id, name)); }
  function renameResourcePrompt(resource: ResourceRow) { const title = window.prompt("Resource title", resource.title); if (title) run(() => renameResource(resource.id, title)); }

  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><nav aria-label="Teacher Resource folder" className="flex flex-wrap items-center gap-1 text-sm"><button type="button" onClick={() => openFolder(null)} className="font-semibold text-indigo-700">Teacher Resources</button>{workspace.breadcrumb.map((folder) => <span key={folder.id} className="flex items-center gap-1"><span className="text-slate-400">/</span><button type="button" onClick={() => openFolder(folder.id)} className="font-semibold text-indigo-700">{folder.name}</button></span>)}</nav><div className="flex gap-2"><button type="button" onClick={() => setShowFolderDialog(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-bold"><FolderPlus className="h-4 w-4" />New Folder</button><button type="button" onClick={() => inputRef.current?.click()} disabled={!currentFolderId} className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-bold text-white disabled:opacity-50"><Upload className="h-4 w-4" />Upload PDF</button></div></div>
    {workspace.currentFolder ? <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="text-sm text-slate-600">Current folder: <strong>{workspace.currentFolder.name}</strong></span><button type="button" onClick={renameFolderPrompt} className="text-sm font-semibold text-indigo-700">Rename folder</button></div> : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Create a folder, then open it to upload teacher-only PDFs.</p>}
    <input ref={inputRef} className="hidden" type="file" accept="application/pdf,.pdf" multiple onChange={(event) => { const files = Array.from(event.target.files ?? []); event.currentTarget.value = ""; void uploadFiles(files); }} />
    <div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={(event) => { event.preventDefault(); setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); void uploadFiles(Array.from(event.dataTransfer.files)); }} className={`rounded-xl border-2 border-dashed p-7 text-center transition ${dragging ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-slate-50"} ${currentFolderId ? "cursor-pointer" : "opacity-60"}`} onClick={() => currentFolderId && inputRef.current?.click()}><Upload className="mx-auto h-6 w-6 text-indigo-600" /><p className="mt-2 font-semibold text-slate-800">Drag & drop PDF files here</p><p className="mt-1 text-sm text-slate-500">or click to browse · PDF files only · 50 MB maximum</p></div>
    {message ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{message}</p> : null}
    {uploads.length ? <div className="space-y-1 rounded-lg border p-3">{uploads.map((upload) => <div key={upload.id} className="flex items-center justify-between gap-3 text-sm"><span className="truncate">{upload.name}</span><span className={upload.status === "Failed" ? "font-semibold text-rose-700" : upload.status === "Complete" ? "font-semibold text-emerald-700" : "text-slate-500"}>{upload.status}{upload.message ? ` — ${upload.message}` : ""}</span></div>)}</div> : null}
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]"><section><h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Folders</h2><div className="mt-2 space-y-1">{workspace.folders.length ? workspace.folders.map((folder) => <button key={folder.id} type="button" onClick={() => openFolder(folder.id)} className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50"><Folder className="h-4 w-4 text-amber-500" />{folder.name}</button>) : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No folders here yet.</p>}</div></section><section><h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Current Folder Files</h2><div className="mt-2 space-y-2">{workspace.resources.length ? workspace.resources.map((resource) => <article key={resource.id} className="rounded-lg border border-slate-200 p-3"><div className="flex gap-3"><FileText className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" /><div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-900">{resource.title}</p><p className="mt-1 text-xs text-slate-500">{resource.originalFileName} · {formatSize(resource.sizeBytes)} · {resource.published ? "Published" : "Draft"} · Updated {new Date(resource.updatedAt).toLocaleDateString()}</p><div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold"><a href={`/api/admin/teacher-resources/${resource.id}/preview`} target="_blank" rel="noreferrer" className="rounded border px-2 py-1 text-indigo-700">Preview</a><a href={`/api/admin/teacher-resources/${resource.id}/download`} className="rounded border px-2 py-1 text-indigo-700">Download</a><button type="button" onClick={() => run(() => setPublished(resource.id, !resource.published))} disabled={pending} className="rounded border px-2 py-1">{resource.published ? "Unpublish" : "Publish"}</button><button type="button" onClick={() => renameResourcePrompt(resource)} disabled={pending} className="rounded border px-2 py-1">Rename</button><select aria-label={`Move ${resource.title}`} defaultValue={resource.folderId} disabled={pending} onChange={(event) => { if (event.target.value !== resource.folderId) run(() => moveResource(resource.id, event.target.value)); }} className="rounded border px-2 py-1"><option value={resource.folderId}>Move to…</option>{workspace.folderOptions.filter((folder) => folder.id !== resource.folderId).map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select><button type="button" onClick={() => { if (window.confirm(`Archive ${resource.title}?`)) run(() => archiveResource(resource.id)); }} disabled={pending} className="rounded border border-rose-200 px-2 py-1 text-rose-700">Archive</button></div></div></div></article>) : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No PDFs in this folder yet.</p>}</div></section></div>
    {showFolderDialog ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"><form onSubmit={(event) => { event.preventDefault(); submitFolder(); }} className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"><div className="flex items-center justify-between"><h2 className="font-bold">New Folder</h2><button type="button" onClick={() => setShowFolderDialog(false)} aria-label="Close"><X className="h-5 w-5" /></button></div><label className="mt-4 block text-sm font-semibold">Folder Name<input autoFocus value={folderName} onChange={(event) => setFolderName(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" maxLength={160} /></label><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setShowFolderDialog(false)} className="rounded-lg border px-3 py-2 text-sm font-bold">Cancel</button><button disabled={!folderName.trim() || pending} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Create Folder</button></div></form></div> : null}
  </section>;
}
