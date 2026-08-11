"use client";

import Link from "next/link";
import { Eye, FileText, Pencil, Plus, RotateCcw, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { InteractiveQuestionRenderer } from "@/components/questions/InteractiveQuestionRenderer";
import { PrintQuestionRenderer } from "@/components/questions/PrintQuestionRenderer";
import PublisherQuestionAuthoringEditor from "@/components/admin/books/PublisherQuestionAuthoringEditor";
import type { NormalizedQuestion } from "@/lib/normalized-question";
import { formatPublisherChapterLabel } from "@/lib/publisher-question-bank-ui";

const QUESTION_TYPES = [
  ["MCQ", "Multiple choice"], ["TRUE_FALSE", "True / False"], ["FILL_BLANK", "Fill in the blank"], ["MATCH", "Match the following"], ["MULTIPLE_SELECT", "Multiple select"], ["ORDERING", "Ordering / sequence"], ["PICTURE_BASED", "Picture-based"], ["SHORT_ANSWER", "Short answer"], ["LONG_ANSWER", "Long answer"], ["CASE_BASED", "Case-based"], ["COMPETENCY", "Competency"], ["HOTS", "HOTS"], ["ASSERTION_REASON", "Assertion / reason"], ["PRACTICAL", "Practical"], ["PROJECT", "Project"], ["CUSTOM", "Custom"],
] as const;

type Option = { id: string; title: string; chapterId?: string; chapterNumber?: number; type?: string; mimeType?: string | null; thumbnail?: string | null };
type BankOptions = { book: { id: string; title: string; class: { id: string; name: string }; subject: { id: string; name: string } }; chapters: Option[]; modules: Option[]; images: Option[] };
type Question = { id: string; context: { bookId: string; chapterId: string; moduleId: string | null; book: { title: string }; chapter: { title: string; chapterNumber: number }; module: { title: string } | null }; question: { questionType: string; questionText: string; options: unknown; correctAnswer: string | null; explanation: string | null; marks: number; difficulty: string; bloomLevel: string | null; competency: string | null; tags: string[] }; imageResource: { id: string; title: string; type: string; mimeType: string | null; thumbnail: string | null } | null; status: "DRAFT" | "APPROVED" | "ARCHIVED"; normalized: NormalizedQuestion; updatedAt: string };
export default function PublisherQuestionBank({ options }: { options: BankOptions }) {
  const [items, setItems] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ chapterId: "", moduleId: "", questionType: "", difficulty: "", status: "", tags: "" });
  const [editor, setEditor] = useState<Question | null | undefined>(undefined);
  const [preview, setPreview] = useState<{ question: Question; mode: "STUDENT" | "PRINT" | "ANSWER_KEY" } | null>(null);
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ bookId: options.book.id, page: String(page), pageSize: "25" });
      if (query.trim()) params.set("search", query.trim());
      for (const [key, value] of Object.entries(filters)) if (value.trim()) params.set(key === "tags" ? "tags" : key, value.trim());
      try {
        const response = await fetch(`/api/admin/questions?${params}`, { signal: controller.signal, cache: "no-store" });
        const body = await response.json() as { items?: Question[]; page?: number; total?: number; totalPages?: number; message?: string };
        if (!response.ok) throw new Error(body.message ?? "Question Bank is unavailable.");
        setItems(body.items ?? []); setPageInfo({ total: body.total ?? 0, totalPages: Math.max(body.totalPages ?? 1, 1) }); setMessage("");
      } catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Question Bank is unavailable."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, query.trim() ? 250 : 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [filters, options.book.id, page, query, reload]);

  const moduleOptions = useMemo(() => filters.chapterId ? options.modules.filter((module) => module.chapterId === filters.chapterId) : options.modules, [filters.chapterId, options.modules]);
  const refresh = () => setReload((value) => value + 1);
  const updateFilters = (next: Partial<typeof filters>) => { setPage(1); setFilters((current) => ({ ...current, ...next })); };

  async function transition(question: Question, action: "APPROVE" | "RETURN_DRAFT" | "ARCHIVE" | "RESTORE") {
    const response = await fetch(`/api/admin/questions/${question.id}/lifecycle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const body = await response.json() as { message?: string };
    if (!response.ok) { setMessage(body.message ?? "Unable to update question."); return; }
    refresh();
  }

  return <main className="space-y-4 p-4 sm:p-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Content Studio / Assignments</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Question Bank</h1><p className="mt-1 text-sm text-slate-600">Publisher master questions for worksheets, homework, classwork, tests and exam papers.</p><p className="mt-1 text-xs font-semibold text-slate-500">{options.book.title} · {options.book.class.name} · {options.book.subject.name}</p></div><button type="button" onClick={() => setEditor(null)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Create Question</button></header>
    <nav aria-label="Assignments workspace" className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1"><span className="rounded-md bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700">Question Bank</span><Link href={`/admin/books/${options.book.id}/content/assignments/worksheets`} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600">Worksheets</Link><span className="rounded-md px-3 py-2 text-sm text-slate-400">Tests — Coming next</span><span className="rounded-md px-3 py-2 text-sm text-slate-400">Exam Papers — Coming next</span></nav>
    <section className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4"><label className="relative sm:col-span-2"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Search question text or tags" className="h-9 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm" /></label><Filter value={filters.chapterId} label="Chapter" options={options.chapters.map((chapter) => [chapter.id, formatPublisherChapterLabel(chapter.chapterNumber, chapter.title)])} onChange={(value) => updateFilters({ chapterId: value, moduleId: "" })} /><Filter value={filters.moduleId} label="Module" options={moduleOptions.map((module) => [module.id, module.title])} onChange={(value) => updateFilters({ moduleId: value })} /><Filter value={filters.questionType} label="Type" options={QUESTION_TYPES.map(([value, label]) => [value, label])} onChange={(value) => updateFilters({ questionType: value })} /><Filter value={filters.difficulty} label="Difficulty" options={[["EASY", "Easy"], ["MEDIUM", "Medium"], ["HARD", "Hard"]]} onChange={(value) => updateFilters({ difficulty: value })} /><Filter value={filters.status} label="Status" options={[["DRAFT", "Draft"], ["APPROVED", "Approved"], ["ARCHIVED", "Archived"]]} onChange={(value) => updateFilters({ status: value })} /><label><span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Tag</span><input value={filters.tags} onChange={(event) => updateFilters({ tags: event.target.value })} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" placeholder="Filter tag" /></label></section>
    {message ? <div role="alert" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900"><span className="flex-1">{message}</span><button type="button" onClick={() => setMessage("")} aria-label="Dismiss"><X className="h-4 w-4" /></button></div> : null}
    {loading ? <div className="rounded-lg border bg-white p-8 text-center text-sm text-slate-500">Loading questions…</div> : items.length ? <><section className="divide-y rounded-lg border border-slate-200 bg-white">{items.map((question) => <QuestionRow key={question.id} question={question} onEdit={() => setEditor(question)} onPreview={(mode) => setPreview({ question, mode })} onTransition={transition} />)}</section><Pagination page={page} total={pageInfo.total} totalPages={pageInfo.totalPages} onPageChange={setPage} /></> : <section className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center"><FileText className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 font-bold text-slate-800">No publisher questions found</h2><p className="mt-1 text-sm text-slate-500">Create an extra publisher master question for this book, or adjust your filters.</p></section>}
    {editor !== undefined ? <PublisherQuestionAuthoringEditor options={options} question={editor} onClose={() => setEditor(undefined)} onSaved={() => { setEditor(undefined); setPage(1); refresh(); if (filters.status && filters.status !== "DRAFT") setMessage("Question saved as DRAFT. It is hidden by the current status filter."); }} /> : null}
    {preview ? <Preview preview={preview} onClose={() => setPreview(null)} onMode={(mode) => setPreview((current) => current ? { ...current, mode } : current)} /> : null}
  </main>;
}

function Filter({ label, value, options, onChange }: { label: string; value: string; options: ReadonlyArray<readonly [string, string]> | string[][]; onChange: (value: string) => void }) { return <label><span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="">All</option>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>; }

function Pagination({ page, total, totalPages, onPageChange }: { page: number; total: number; totalPages: number; onPageChange: (page: number) => void }) { return <div className="flex items-center justify-between text-xs text-slate-600"><span>{total} question{total === 1 ? "" : "s"} · page {page} of {totalPages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} className="rounded border px-2 py-1 disabled:opacity-40">Previous</button><button type="button" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))} className="rounded border px-2 py-1 disabled:opacity-40">Next</button></div></div>; }

function QuestionRow({ question, onEdit, onPreview, onTransition }: { question: Question; onEdit: () => void; onPreview: (mode: "STUDENT" | "PRINT" | "ANSWER_KEY") => void; onTransition: (question: Question, action: "APPROVE" | "RETURN_DRAFT" | "ARCHIVE" | "RESTORE") => void }) {
  const tone = question.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : question.status === "ARCHIVED" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800";
  return <article className="flex flex-wrap items-center gap-3 p-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-1.5"><span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">{label(question.question.questionType)}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>{question.status}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{question.question.difficulty}</span></div><p className="mt-1 truncate text-sm font-bold text-slate-900">{question.question.questionText}</p><p className="mt-1 text-xs text-slate-500">{formatPublisherChapterLabel(question.context.chapter.chapterNumber, question.context.chapter.title)}{question.context.module ? ` - ${question.context.module.title}` : ""} - {question.question.marks} mark{question.question.marks === 1 ? "" : "s"}</p></div><div className="flex flex-wrap gap-1"><button type="button" onClick={() => onPreview("STUDENT")} className="rounded-md border px-2 py-1 text-xs font-bold"><Eye className="mr-1 inline h-3.5 w-3.5" />Preview</button><button type="button" onClick={onEdit} className="rounded-md border px-2 py-1 text-xs font-bold text-indigo-700"><Pencil className="mr-1 inline h-3.5 w-3.5" />Edit</button>{question.status === "DRAFT" ? <button type="button" onClick={() => onTransition(question, "APPROVE")} className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white">Approve</button> : null}{question.status !== "ARCHIVED" ? <button type="button" onClick={() => onTransition(question, "ARCHIVE")} className="rounded-md border border-rose-200 px-2 py-1 text-xs font-bold text-rose-700">Archive</button> : <button type="button" onClick={() => onTransition(question, "RESTORE")} className="rounded-md border px-2 py-1 text-xs font-bold"><RotateCcw className="mr-1 inline h-3.5 w-3.5" />Restore</button>}</div></article>;
}

function Preview({ preview, onClose, onMode }: { preview: { question: Question; mode: "STUDENT" | "PRINT" | "ANSWER_KEY" }; onClose: () => void; onMode: (mode: "STUDENT" | "PRINT" | "ANSWER_KEY") => void }) { const [response, setResponse] = useState<unknown>(""); return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 sm:p-6"><section role="dialog" aria-modal="true" className="mx-auto max-w-2xl rounded-xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{preview.mode === "STUDENT" ? "Student View" : preview.mode === "PRINT" ? "Print Preview" : "Answer Key"}</h2><button type="button" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button></div><div className="mt-4">{preview.mode === "STUDENT" ? <InteractiveQuestionRenderer question={preview.question.normalized} response={response} onChange={setResponse} /> : <PrintQuestionRenderer question={preview.question.normalized} mode={preview.mode === "PRINT" ? "PRINT" : "ANSWER_KEY"} audience="PUBLISHER" />}</div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => onMode("STUDENT")} className="rounded-md border px-3 py-2 text-sm font-bold">Student</button><button type="button" onClick={() => onMode("PRINT")} className="rounded-md border px-3 py-2 text-sm font-bold">Print</button><button type="button" onClick={() => onMode("ANSWER_KEY")} className="rounded-md border px-3 py-2 text-sm font-bold">Answer Key</button></div></section></div>; }
function label(value: string) { return QUESTION_TYPES.find(([type]) => type === value)?.[1] ?? value.replaceAll("_", " "); }
