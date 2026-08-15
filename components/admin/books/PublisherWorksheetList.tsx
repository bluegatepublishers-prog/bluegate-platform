"use client";

import Link from "next/link";
import { Archive, Eye, FileDown, Pencil, Plus, RotateCcw } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { formatPublisherChapterLabel } from "@/lib/publisher-question-bank-ui";

type Worksheet = {
  id: string;
  title: string;
  chapter: { title: string; chapterNumber: number };
  module: { title: string } | null;
  questionCount: number;
  totalMarks: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  updatedAt: string;
};

export default function PublisherWorksheetList({ bookId, worksheets, chapters, archiveAction, restoreAction, publishAction, initialChapterId }: {
  bookId: string;
  worksheets: Worksheet[];
  chapters: { id: string; title: string; chapterNumber: number }[];
  archiveAction: (worksheetId: string) => Promise<void>;
  restoreAction: (worksheetId: string) => Promise<void>;
  publishAction: (worksheetId: string) => Promise<void>;
  initialChapterId?: string;
}) {
  const router = useRouter();
  const [chapterId, setChapterId] = useState(chapters.some((chapter) => chapter.id === initialChapterId) ? initialChapterId! : chapters[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const base = `/admin/books/${bookId}/content/assignments/worksheets`;

  function mutate(action: (worksheetId: string) => Promise<void>, worksheetId: string) {
    startTransition(async () => { await action(worksheetId); router.refresh(); });
  }

  return <main className="space-y-4 p-4 sm:p-6">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Content Studio / Assignments</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Worksheets</h1><p className="mt-1 text-sm text-slate-600">Create ordered question-bank worksheets and publish immutable releases.</p></div>
      <div className="flex gap-2"><select aria-label="Chapter for new worksheet" value={chapterId} onChange={(event) => setChapterId(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{formatPublisherChapterLabel(chapter.chapterNumber, chapter.title)}</option>)}</select><button type="button" disabled={!chapterId} onClick={() => router.push(`${base}/new?chapterId=${encodeURIComponent(chapterId)}`)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" />Create Worksheet</button></div>
    </header>
    <nav aria-label="Assignments workspace" className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1"><Link href={`/admin/books/${bookId}/content/assignments/questions`} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600">Question Bank</Link><span className="rounded-md bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700">Worksheets</span><span className="rounded-md px-3 py-2 text-sm text-slate-400">Tests — Coming next</span><span className="rounded-md px-3 py-2 text-sm text-slate-400">Exam Papers — Coming next</span></nav>
    {worksheets.length ? <section className="divide-y rounded-lg border border-slate-200 bg-white">{worksheets.map((worksheet) => {
      const editHref = `${base}/${worksheet.id}`;
      return <article key={worksheet.id} className="flex flex-wrap items-center gap-3 p-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-sm font-bold text-slate-900">{worksheet.title}</h2><Status value={worksheet.status} /></div><p className="mt-1 text-xs text-slate-500">{formatPublisherChapterLabel(worksheet.chapter.chapterNumber, worksheet.chapter.title)}{worksheet.module ? ` | ${worksheet.module.title}` : ""} | Questions: {worksheet.questionCount} | Total Marks: {worksheet.totalMarks} | Updated {new Date(worksheet.updatedAt).toLocaleDateString("en-IN")}</p></div><div className="flex flex-wrap gap-1">{worksheet.status !== "ARCHIVED" ? <><Link href={`${editHref}?preview=1`} className="rounded-md border px-2 py-1 text-xs font-bold"><Eye className="mr-1 inline h-3.5 w-3.5" />Preview</Link><Link href={editHref} className="rounded-md border px-2 py-1 text-xs font-bold text-indigo-700"><Pencil className="mr-1 inline h-3.5 w-3.5" />Edit</Link>{worksheet.status === "DRAFT" ? <button type="button" disabled={isPending} onClick={() => mutate(publishAction, worksheet.id)} className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white disabled:opacity-60">Publish</button> : <a href={`/api/admin/worksheets/${worksheet.id}/pdf?bookId=${encodeURIComponent(bookId)}`} className="rounded-md border px-2 py-1 text-xs font-bold"><FileDown className="mr-1 inline h-3.5 w-3.5" />Download PDF</a>}<button type="button" disabled={isPending} onClick={() => mutate(archiveAction, worksheet.id)} className="rounded-md border border-rose-200 px-2 py-1 text-xs font-bold text-rose-700"><Archive className="mr-1 inline h-3.5 w-3.5" />Archive</button></> : <><Link href={`${editHref}?preview=1`} className="rounded-md border px-2 py-1 text-xs font-bold"><Eye className="mr-1 inline h-3.5 w-3.5" />Preview</Link><button type="button" disabled={isPending} onClick={() => mutate(restoreAction, worksheet.id)} className="rounded-md border px-2 py-1 text-xs font-bold"><RotateCcw className="mr-1 inline h-3.5 w-3.5" />Restore</button></>}</div></article>;
    })}</section> : <section className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-bold text-slate-800">No worksheets yet</h2><p className="mt-1 text-sm text-slate-500">Choose a chapter and create a draft worksheet to begin.</p></section>}
  </main>;
}

function Status({ value }: { value: Worksheet["status"] }) {
  const tone = value === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : value === "ARCHIVED" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>{value}</span>;
}
