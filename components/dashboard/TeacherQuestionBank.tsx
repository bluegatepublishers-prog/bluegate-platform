"use client";

import { ChevronLeft, ChevronRight, Eye, FileQuestion, Loader2, Pencil, Plus, Search, X, Check, Archive, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { InteractiveQuestionRenderer } from "@/components/questions/InteractiveQuestionRenderer";
import { PrintQuestionRenderer } from "@/components/questions/PrintQuestionRenderer";
import { evaluateFillBlankResponse } from "@/lib/question-response-evaluator";
import QuestionEditor from "@/components/dashboard/TeacherQuestionEditor";
import type { BankOptions, Filters, Question } from "@/components/dashboard/teacher-question-bank-types";
import { DIFFICULTIES, EMPTY_FILTERS, QUESTION_TYPES, formatDate, friendlyError, gradingLabel, title, typeLabel } from "@/components/dashboard/teacher-question-bank-types";

export default function TeacherQuestionBank({ options }: { options: BankOptions }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [tab, setTab] = useState<"MY" | "ARCHIVED">("MY");
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editor, setEditor] = useState<Question | null | undefined>(undefined);
  const [preview, setPreview] = useState<{ question: Question; answerKey: boolean } | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), pageSize: "12" });
      const status = tab === "ARCHIVED" ? "ARCHIVED" : filters.status;
      if (query.trim()) params.set("search", query.trim());
      if (status) params.set("status", status);
      if (filters.questionType) params.set("questionType", filters.questionType);
      if (filters.difficulty) params.set("difficulty", filters.difficulty);
      if (filters.sectionSubjectId) params.set("sectionSubjectId", filters.sectionSubjectId);
      if (filters.bookId) params.set("bookId", filters.bookId);
      if (filters.chapterId) params.set("chapterId", filters.chapterId);
      if (filters.moduleId) params.set("moduleId", filters.moduleId);
      if (filters.tags.trim()) params.set("tags", filters.tags.trim());
      try {
        const response = await fetch(`/api/teacher/questions?${params}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json() as { items?: Question[]; total?: number; totalPages?: number; message?: string };
        if (!response.ok) throw new Error(friendlyError(data.message));
        setQuestions(data.items ?? []); setPageInfo({ total: data.total ?? 0, totalPages: data.totalPages ?? 0 }); setMessage("");
      } catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : friendlyError()); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, query.trim() ? 300 : 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [filters, page, query, reload, tab]);

  const labels = useMemo(() => ({
    contexts: new Map(options.contexts.map((item) => [item.id, item.label])),
    books: new Map(options.books.map((item) => [item.id, item.title])),
    chapters: new Map(options.books.flatMap((book) => book.chapters.map((chapter) => [chapter.id, chapter.title] as const))),
    modules: new Map(options.modules.map((item) => [item.id, item.title])),
  }), [options]);
  const refresh = () => setReload((value) => value + 1);
  const updateFilters = (next: Partial<Filters>) => { setPage(1); setFilters((current) => ({ ...current, ...next })); };
  const startCreate = () => setEditor(null);

  async function transition(question: Question, action: "ACTIVATE" | "ARCHIVE" | "RESTORE_DRAFT" | "RESTORE_ACTIVE") {
    if (action === "ARCHIVE" && !window.confirm("Archive this question?\n\nIt will no longer appear in normal new-question selection. Existing issued work will not be affected.")) return;
    const response = await fetch(`/api/teacher/questions/${question.id}/lifecycle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, expectedRevision: question.revision }) });
    const data = await response.json() as { message?: string };
    if (!response.ok) { setMessage(friendlyError(data.message)); return; }
    refresh();
  }

  return <main className="space-y-5 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Teacher Dashboard</p><h1 className="mt-1 text-xl font-bold text-slate-900">Question Bank</h1><p className="mt-1 text-sm text-slate-600">Create and reuse your own classroom questions. Publisher questions remain read-only.</p></div><button type="button" onClick={startCreate} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Create Question</button></header>
    <section className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3"><button type="button" onClick={() => { setTab("MY"); setPage(1); }} className={`rounded-lg px-3 py-2 text-sm font-bold ${tab === "MY" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>My Questions</button><button type="button" onClick={() => { setTab("ARCHIVED"); setPage(1); }} className={`rounded-lg px-3 py-2 text-sm font-bold ${tab === "ARCHIVED" ? "bg-slate-100 text-slate-800" : "text-slate-600 hover:bg-slate-50"}`}>Archived</button><span className="ml-auto hidden items-center text-xs text-slate-500 sm:flex">{pageInfo.total} question{pageInfo.total === 1 ? "" : "s"}</span></div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><label className="relative sm:col-span-2"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Search question text or tags" className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm" /></label><Select label="Type" value={filters.questionType} onChange={(value) => updateFilters({ questionType: value })} options={[["", "All types"], ...QUESTION_TYPES]} /><Select label="Difficulty" value={filters.difficulty} onChange={(value) => updateFilters({ difficulty: value })} options={[["", "All difficulty"], ...DIFFICULTIES.map((value) => [value, title(value)] as const)]} /><Select label="Status" value={tab === "ARCHIVED" ? "ARCHIVED" : filters.status} onChange={(value) => { if (value === "ARCHIVED") setTab("ARCHIVED"); else { setTab("MY"); updateFilters({ status: value as Filters["status"] }); } }} options={[["", "Draft + active"], ["DRAFT", "Draft"], ["ACTIVE", "Active"], ["ARCHIVED", "Archived"]]} /><Select label="Subject / class" value={filters.sectionSubjectId} onChange={(value) => updateFilters({ sectionSubjectId: value, bookId: "", chapterId: "", moduleId: "" })} options={[["", "All assigned subjects"], ...options.contexts.map((item) => [item.id, item.label] as const)]} /><Select label="Book" value={filters.bookId} onChange={(value) => updateFilters({ bookId: value, chapterId: "", moduleId: "" })} options={[["", "All books"], ...options.books.filter((book) => !filters.sectionSubjectId || book.sectionSubjectIds.includes(filters.sectionSubjectId)).map((book) => [book.id, book.title] as const)]} /><Select label="Chapter" value={filters.chapterId} onChange={(value) => updateFilters({ chapterId: value, moduleId: "" })} options={[["", "All chapters"], ...(options.books.find((book) => book.id === filters.bookId)?.chapters.map((chapter) => [chapter.id, `Chapter ${chapter.chapterNumber}: ${chapter.title}`] as const) ?? [])]} /><Select label="Module" value={filters.moduleId} onChange={(value) => updateFilters({ moduleId: value })} options={[["", "All modules"], ...options.modules.filter((item) => (!filters.bookId || item.bookId === filters.bookId) && (!filters.chapterId || item.chapterId === filters.chapterId)).map((item) => [item.id, item.title] as const)]} /><label className="lg:col-span-2"><span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Tags</span><input value={filters.tags} onChange={(event) => updateFilters({ tags: event.target.value })} placeholder="Filter by tag" className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label></div>
    </section>
    {message ? <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900"><span className="flex-1">{message}</span><button type="button" aria-label="Dismiss" onClick={() => setMessage("")}><X className="h-4 w-4" /></button></div> : null}    {loading ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" /> Loading questions...</div> : questions.length ? <div className="space-y-2">{questions.map((question) => <QuestionCard key={question.id} question={question} labels={labels} onPreview={(answerKey) => setPreview({ question, answerKey })} onEdit={() => setEditor(question)} onTransition={(action) => transition(question, action)} />)}</div> : <EmptyState archived={tab === "ARCHIVED"} hasFilters={Boolean(query || Object.values(filters).some(Boolean))} onCreate={startCreate} />}
    {pageInfo.totalPages > 1 ? <div className="flex items-center justify-between rounded-xl border bg-white p-3"><p className="text-xs text-slate-500">Page {page} of {pageInfo.totalPages}</p><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm font-semibold disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button><button type="button" disabled={page >= pageInfo.totalPages} onClick={() => setPage((value) => value + 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm font-semibold disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button></div></div> : null}
    {editor !== undefined ? <QuestionEditor options={options} question={editor} onClose={() => setEditor(undefined)} onSaved={() => { setEditor(undefined); refresh(); }} /> : null}
    {preview ? <Preview question={preview.question} answerKey={preview.answerKey} onClose={() => setPreview(null)} onToggleAnswerKey={() => setPreview((current) => current ? { ...current, answerKey: !current.answerKey } : current)} /> : null}
  </main>;
}

function QuestionCard({ question, labels, onPreview, onEdit, onTransition }: { question: Question; labels: { contexts: Map<string, string>; books: Map<string, string>; chapters: Map<string, string>; modules: Map<string, string> }; onPreview: (answerKey: boolean) => void; onEdit: () => void; onTransition: (action: "ACTIVATE" | "ARCHIVE" | "RESTORE_DRAFT" | "RESTORE_ACTIVE") => void }) {
  const metadata = [question.context.sectionSubjectId ? labels.contexts.get(question.context.sectionSubjectId) : null, question.context.bookId ? labels.books.get(question.context.bookId) : null, question.context.chapterId ? labels.chapters.get(question.context.chapterId) : null, question.context.moduleId ? labels.modules.get(question.context.moduleId) : null].filter(Boolean);
  return <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><Badge tone="blue">{typeLabel(question.question.questionType)}</Badge><Badge tone="slate">{title(question.question.difficulty)}</Badge><Badge tone={question.status === "ACTIVE" ? "green" : question.status === "ARCHIVED" ? "slate" : "amber"}>{title(question.status)}</Badge><Badge tone="violet">{gradingLabel(question.normalized.grading.capability)}</Badge></div><h2 className="mt-2 text-sm font-bold leading-5 text-slate-900">{question.question.questionText}</h2><p className="mt-1 text-xs text-slate-500">{metadata.length ? metadata.join(" | ") : "No curriculum context"} | {question.question.marks} mark{question.question.marks === 1 ? "" : "s"} | Revision {question.revision} | Updated {formatDate(question.updatedAt)}</p></div><div className="flex shrink-0 flex-wrap gap-1.5"><button type="button" onClick={() => onPreview(false)} className="inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-bold"><Eye className="h-3.5 w-3.5" /> Preview</button>{question.status !== "ARCHIVED" ? <button type="button" onClick={onEdit} className="inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-bold text-blue-700"><Pencil className="h-3.5 w-3.5" /> Edit</button> : null}{question.status === "DRAFT" ? <button type="button" onClick={() => onTransition("ACTIVATE")} className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-bold text-white"><Check className="h-3.5 w-3.5" /> Activate</button> : null}{question.status === "DRAFT" || question.status === "ACTIVE" ? <button type="button" onClick={() => onTransition("ARCHIVE")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-200 px-2.5 text-xs font-bold text-amber-800"><Archive className="h-3.5 w-3.5" /> Archive</button> : null}{question.status === "ARCHIVED" ? <><button type="button" onClick={() => onTransition("RESTORE_DRAFT")} className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-2.5 text-xs font-bold text-white"><RotateCcw className="h-3.5 w-3.5" /> Restore draft</button><button type="button" onClick={() => onTransition("RESTORE_ACTIVE")} className="inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-bold">Restore active</button></> : null}</div></div><p className="mt-2 text-[11px] font-semibold text-slate-400">Use in Worksheet/Test/Exam will appear once QuestionSet is available.</p></article>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: ReadonlyArray<readonly [string, string]> }) { return <label><span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm">{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select></label>; }
function Badge({ children, tone }: { children: React.ReactNode; tone: "blue" | "green" | "amber" | "slate" | "violet" }) { const classes = { blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-800", slate: "bg-slate-100 text-slate-700", violet: "bg-violet-50 text-violet-700" }; return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${classes[tone]}`}>{children}</span>; }
function EmptyState({ archived, hasFilters, onCreate }: { archived: boolean; hasFilters: boolean; onCreate: () => void }) { return <section className="rounded-xl border bg-white p-8 text-center"><FileQuestion className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 text-base font-bold">{hasFilters ? "No questions match these filters." : archived ? "No archived questions." : "No questions yet."}</h2><p className="mt-1 text-sm text-slate-500">{hasFilters ? "Try a different search or filter." : archived ? "Archived questions will appear here." : "Create your first reusable question."}</p>{!archived && !hasFilters ? <button type="button" onClick={onCreate} className="mt-4 h-9 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white">Create your first question</button> : null}</section>; }

function Preview({ question, answerKey, onClose, onToggleAnswerKey }: { question: Question; answerKey: boolean; onClose: () => void; onToggleAnswerKey: () => void }) {
  const [response, setResponse] = useState<unknown>("");
  const [checked, setChecked] = useState(false);
  const fillBlankResult = checked && question.normalized.questionType === "FILL_BLANK"
    ? evaluateFillBlankResponse({ response, correctAnswer: question.question.correctAnswer, options: question.question.options })
    : undefined;

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4"><section role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{answerKey ? "Answer key preview" : "Student view preview"}</h2><button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500"><X className="h-5 w-5" /></button></div><div className="mt-4 space-y-3"><div className="flex gap-1.5"><Badge tone="blue">{typeLabel(question.question.questionType)}</Badge><Badge tone="violet">{gradingLabel(question.normalized.grading.capability)}</Badge></div>{answerKey ? <PrintQuestionRenderer question={question.normalized} mode="ANSWER_KEY" audience="TEACHER" /> : <InteractiveQuestionRenderer question={question.normalized} response={response} onChange={(value) => { setResponse(value); setChecked(false); }} evaluation={fillBlankResult ? { correct: fillBlankResult.correct } : undefined} />}{!answerKey && question.normalized.questionType === "FILL_BLANK" ? <button type="button" onClick={() => setChecked(true)} className="h-9 rounded-lg border px-3 text-sm font-bold">Check</button> : null}{answerKey && question.question.explanation ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><strong>Explanation:</strong> {question.question.explanation}</p> : null}<div className="flex justify-end gap-2"><button type="button" onClick={onToggleAnswerKey} className="h-9 rounded-lg border px-3 text-sm font-bold">{answerKey ? "Student View" : "Show Answer Key"}</button><button type="button" onClick={onClose} className="h-9 rounded-lg border px-3 text-sm font-bold">Close</button></div></div></section></div>;
}