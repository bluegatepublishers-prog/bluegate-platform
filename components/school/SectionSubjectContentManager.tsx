"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { BookOpen, FolderOpen, Search } from "lucide-react";
import { saveSectionSubjectContent } from "@/app/school-dashboard/academic-actions";

type BookOption = { id: string; title: string; coverImage: string | null; subjectId: string; className: string; subjectName: string; seriesName: string | null };
type ResourceOption = { id: string; title: string; subject: string; classLevel: string; type: string };

export default function SectionSubjectContentManager({ schoolClassId, sectionSubjectId, subjectId, subjectName, teacherName, books, resources, assignedBookId, assignedResourceIds }: { schoolClassId: string; sectionSubjectId: string; subjectId: string; subjectName: string; teacherName: string | null; books: BookOption[]; resources: ResourceOption[]; assignedBookId: string; assignedResourceIds: string[] }) {
  const [bookQuery, setBookQuery] = useState("");
  const [resourceQuery, setResourceQuery] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const compatibleBooks = useMemo(() => books.filter((book) => book.subjectId === subjectId && `${book.title} ${book.seriesName ?? ""}`.toLowerCase().includes(bookQuery.toLowerCase())), [books, subjectId, bookQuery]);
  const compatibleResources = useMemo(() => resources.filter((resource) => resource.subject.toLowerCase() === subjectName.toLowerCase() && (!resourceType || resource.type === resourceType) && `${resource.title} ${resource.type}`.toLowerCase().includes(resourceQuery.toLowerCase())), [resources, subjectName, resourceQuery, resourceType]);
  const action = saveSectionSubjectContent.bind(null, schoolClassId);
  return <form action={(formData) => startTransition(async () => { await action(formData); setMessage("Assignments saved."); })} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
    <input type="hidden" name="sectionSubjectId" value={sectionSubjectId}/>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="text-lg font-bold">{subjectName}</h4><p className="mt-1 text-sm text-slate-500">Teacher: {teacherName ?? "Not assigned"}</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">Section content</span></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <section className="rounded-xl border bg-white p-4"><div className="flex items-center gap-2 font-bold"><BookOpen className="h-5 w-5 text-blue-600"/>Assigned Book</div><label className="relative mt-4 block"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={bookQuery} onChange={(event) => setBookQuery(event.target.value)} placeholder="Search compatible books" className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm"/></label><select name="bookId" defaultValue={assignedBookId} className="mt-3 w-full rounded-xl border px-3 py-3"><option value="">No Book Assigned</option>{compatibleBooks.map((book) => <option key={book.id} value={book.id}>{book.title} · {book.seriesName ?? "No series"} · {book.className} · {book.subjectName}</option>)}</select>{assignedBookId ? <div className="mt-3 flex items-center gap-3 text-sm text-slate-600">{books.find((book) => book.id === assignedBookId)?.coverImage ? <Image src={books.find((book) => book.id === assignedBookId)?.coverImage ?? ""} alt="" width={36} height={48} className="h-12 w-9 rounded object-cover"/> : null}<span>{books.find((book) => book.id === assignedBookId)?.title}</span></div> : <p className="mt-3 text-sm text-amber-700">No Book Assigned — assign a Bluegate book to begin.</p>}</section>
      <section className="rounded-xl border bg-white p-4"><div className="flex items-center gap-2 font-bold"><FolderOpen className="h-5 w-5 text-blue-600"/>Resources</div><div className="mt-4 grid gap-2 sm:grid-cols-2"><input value={resourceQuery} onChange={(event) => setResourceQuery(event.target.value)} placeholder="Search resources" className="rounded-xl border px-3 py-2.5 text-sm"/><select value={resourceType} onChange={(event) => setResourceType(event.target.value)} className="rounded-xl border px-3 text-sm"><option value="">All types</option>{["VIDEO","PDF","PPT","DOC","ZIP"].map((type) => <option key={type}>{type}</option>)}</select></div><div className="mt-3 max-h-52 space-y-2 overflow-y-auto">{compatibleResources.map((resource) => <label key={resource.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" name="resourceIds" value={resource.id} defaultChecked={assignedResourceIds.includes(resource.id)}/><span><strong>{resource.title}</strong><span className="mt-1 block text-xs text-slate-500">{resource.type} · {resource.classLevel} · {resource.subject}</span></span></label>)}</div>{compatibleResources.length === 0 && <p className="mt-3 text-sm text-slate-500">No Resources — add videos, worksheets, PPTs, or supporting files.</p>}</section>
    </div><div className="mt-5 flex items-center gap-4"><button disabled={pending} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Save content assignments"}</button>{message && <span role="status" className="text-sm font-semibold text-green-700">{message}</span>}</div>
  </form>;
}
