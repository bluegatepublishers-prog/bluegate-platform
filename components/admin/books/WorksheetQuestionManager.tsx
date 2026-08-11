"use client";

import { ArrowDown, ArrowUp, Eye, FileDown, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import WorksheetLaunchCard from "@/components/admin/books/WorksheetLaunchCard";
import { InteractiveQuestionRenderer } from "@/components/questions/InteractiveQuestionRenderer";
import { PrintQuestionRenderer } from "@/components/questions/PrintQuestionRenderer";
import { adaptBookQuestion, type BookQuestionSource, type NormalizedQuestion } from "@/lib/normalized-question";
import { formatPublisherChapterLabel } from "@/lib/publisher-question-bank-ui";

type Question = BookQuestionSource & {
  exerciseId: string | null;
  chapter: { title: string; chapterNumber: number };
  module: { title: string } | null;
};
type Item = { id: string; questionId: string; position: number; question: Question };
type Candidate = {
  id: string;
  context: { chapterId: string; moduleId: string | null; chapter: { title: string; chapterNumber: number }; module: { title: string } | null };
  question: Question;
  normalized: NormalizedQuestion;
};
type PreviewMode = "INTERACTIVE" | "PRINT" | "ANSWER_KEY";
type Filters = { search: string; chapterId: string; moduleId: string; questionType: string; difficulty: string; tags: string };

const questionTypes = ["MCQ", "TRUE_FALSE", "FILL_BLANK", "MATCH", "MULTIPLE_SELECT", "ORDERING", "SHORT_ANSWER", "LONG_ANSWER", "PICTURE_BASED", "CASE_BASED", "COMPETENCY", "HOTS", "ASSERTION_REASON", "PRACTICAL", "PROJECT", "CUSTOM"];
const difficulties = ["EASY", "MEDIUM", "HARD"];
const emptyFilters: Filters = { search: "", chapterId: "", moduleId: "", questionType: "", difficulty: "", tags: "" };

export default function WorksheetQuestionManager({ bookId, worksheetId, worksheetTitle, instructions, bookTitle, chapterTitle, openPreviewInitially = false }: {
  bookId: string;
  worksheetId: string;
  worksheetTitle: string;
  instructions?: string | null;
  bookTitle?: string;
  chapterTitle?: string;
  openPreviewInitially?: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(openPreviewInitially);
  const [launchPreviewOpen, setLaunchPreviewOpen] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: "error" | "success" } | null>(null);

  const loadItems = useCallback(async () => {
    const response = await fetch(`/api/admin/worksheets/${worksheetId}/items?bookId=${encodeURIComponent(bookId)}`, { cache: "no-store" });
    const body = await response.json() as { items?: Item[]; message?: string };
    if (!response.ok) throw new Error(body.message ?? "Unable to load worksheet questions.");
    setItems(body.items ?? []);
  }, [bookId, worksheetId]);

  useEffect(() => {
    void loadItems().catch((error: unknown) => setFeedback({ message: error instanceof Error ? error.message : "Unable to load worksheet questions.", tone: "error" }));
  }, [loadItems]);

  useEffect(() => {
    if (!pickerOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingCandidates(true);
      const params = new URLSearchParams({ bookId, status: "APPROVED", pageSize: "100" });
      for (const [key, value] of Object.entries(filters)) if (value.trim()) params.set(key, value.trim());
      try {
        const response = await fetch(`/api/admin/questions?${params}`, { signal: controller.signal, cache: "no-store" });
        const body = await response.json() as { items?: Candidate[]; message?: string };
        if (!response.ok) throw new Error(body.message ?? "Unable to load approved questions.");
        setCandidates(body.items ?? []);
      } catch (error) {
        if (!controller.signal.aborted) setFeedback({ message: error instanceof Error ? error.message : "Unable to load approved questions.", tone: "error" });
      } finally {
        if (!controller.signal.aborted) setLoadingCandidates(false);
      }
    }, filters.search.trim() ? 220 : 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [bookId, filters, pickerOpen]);

  const added = useMemo(() => new Set(items.map((item) => item.questionId)), [items]);
  const totalMarks = items.reduce((total, item) => total + (item.question.marks ?? 0), 0);
  const previewQuestions = useMemo(() => items.map((item) => adaptBookQuestion({ ...item.question, bookId, chapterId: item.question.chapterId })), [bookId, items]);
  const chapterOptions = useMemo(() => Array.from(new Map(candidates.map((candidate) => [candidate.context.chapterId, candidate.context.chapter])).entries()), [candidates]);
  const moduleOptions = useMemo(() => Array.from(new Map(candidates.filter((candidate) => !filters.chapterId || candidate.context.chapterId === filters.chapterId).flatMap((candidate) => candidate.context.module ? [[candidate.context.moduleId!, candidate.context.module] as const] : [])).entries()), [candidates, filters.chapterId]);

  async function mutate(url: string, init: RequestInit) {
    setBusy(true);
    try {
      const response = await fetch(url, init);
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Worksheet update failed.");
      await loadItems();
      setFeedback(null);
    } finally {
      setBusy(false);
    }
  }

  async function addSelected() {
    if (!selectedIds.length) return;
    try {
      await mutate(`/api/admin/worksheets/${worksheetId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, questionIds: selectedIds }),
      });
      setFeedback({ message: `${selectedIds.length} question${selectedIds.length === 1 ? "" : "s"} added to this worksheet.`, tone: "success" });
      setSelectedIds([]);
      setPickerOpen(false);
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "Unable to add questions.", tone: "error" });
    }
  }

  function openPicker() {
    setFilters(emptyFilters);
    setSelectedIds([]);
    setCandidates([]);
    setFeedback(null);
    setPickerOpen(true);
  }
  function updateFilters(next: Partial<Filters>) {
    setSelectedIds([]);
    setFilters((current) => ({ ...current, ...next }));
  }

  return <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="font-bold text-slate-900">Questions</h3>
        <p className="text-xs text-slate-500">Questions: {items.length} | Total Marks: {totalMarks}</p>
      </div>
      <div className="flex gap-2">
        {items.length ? <><button type="button" onClick={() => setPreviewOpen(true)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"><Eye className="h-4 w-4" />Preview</button><button type="button" onClick={() => setLaunchPreviewOpen(true)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">Student button preview</button></> : null}
        <button type="button" onClick={openPicker} className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" />Add Questions</button>
      </div>
    </div>
    {items.length ? <div className="mt-3 divide-y divide-slate-100">{items.map((item, index) => <article key={item.id} className="flex flex-wrap items-center gap-2 py-3 text-sm">
      <b className="text-slate-700">Q{index + 1}</b>
      <div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-900">{item.question.questionText}</p><p className="text-xs text-slate-500">{displayType(item.question.questionType)} | {item.question.difficulty} | {item.question.marks} marks</p></div>
      <button type="button" disabled={busy || index === 0} aria-label={`Move question ${index + 1} up`} onClick={() => void mutateItem(item.id, -1)} className="rounded border p-1.5 disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
      <button type="button" disabled={busy || index === items.length - 1} aria-label={`Move question ${index + 1} down`} onClick={() => void mutateItem(item.id, 1)} className="rounded border p-1.5 disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button>
      <button type="button" disabled={busy} aria-label={`Remove question ${index + 1}`} onClick={() => void removeItem(item.id)} className="rounded border border-rose-200 p-1.5 text-rose-700 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
    </article>)}</div> : <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No questions added yet.</div>}
    {feedback ? <p role="alert" className={`mt-3 text-sm ${feedback.tone === "error" ? "text-rose-700" : "text-emerald-700"}`}>{feedback.message}</p> : null}
    {pickerOpen ? <PickerDialog /> : null}
    {previewOpen ? <WorksheetPreview /> : null}
    {launchPreviewOpen ? <StudentLaunchPreview /> : null}
  </section>;

  async function mutateItem(itemId: string, direction: -1 | 1) {
    try {
      await mutate(`/api/admin/worksheets/${worksheetId}/items/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookId, direction }) });
    } catch (error) { setFeedback({ message: error instanceof Error ? error.message : "Unable to reorder the question.", tone: "error" }); }
  }

  async function removeItem(itemId: string) {
    try {
      await mutate(`/api/admin/worksheets/${worksheetId}/items/${itemId}?bookId=${encodeURIComponent(bookId)}`, { method: "DELETE" });
      setFeedback({ message: "Question removed from this worksheet.", tone: "success" });
    } catch (error) { setFeedback({ message: error instanceof Error ? error.message : "Unable to remove the question.", tone: "error" }); }
  }

  function PickerDialog() {
    return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4"><section role="dialog" aria-modal="true" aria-label="Add approved Publisher Questions" className="mx-auto max-w-4xl rounded-xl bg-white p-5 shadow-2xl">
      <header className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Add Questions</h2><p className="text-sm text-slate-500">Approved, active Publisher Question Bank items from this book only.</p></div><button type="button" aria-label="Close" onClick={() => setPickerOpen(false)} className="rounded p-1"><X className="h-5 w-5" /></button></header>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><input value={filters.search} onChange={(event) => updateFilters({ search: event.target.value })} placeholder="Search question text or tags" className="h-10 rounded border border-slate-300 px-3 text-sm sm:col-span-2 lg:col-span-3" />
        <Select label="Chapter" value={filters.chapterId} onChange={(value) => updateFilters({ chapterId: value, moduleId: "" })} options={chapterOptions.map(([id, chapter]) => [id, formatPublisherChapterLabel(chapter.chapterNumber, chapter.title)])} />
        <Select label="Module" value={filters.moduleId} onChange={(value) => updateFilters({ moduleId: value })} options={moduleOptions.map(([id, module]) => [id, module.title])} />
        <Select label="Question Type" value={filters.questionType} onChange={(value) => updateFilters({ questionType: value })} options={questionTypes.map((type) => [type, displayType(type)])} />
        <Select label="Difficulty" value={filters.difficulty} onChange={(value) => updateFilters({ difficulty: value })} options={difficulties.map((difficulty) => [difficulty, titleCase(difficulty)])} />
        <label><span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Tags</span><input value={filters.tags} onChange={(event) => updateFilters({ tags: event.target.value })} placeholder="Filter tag" className="h-9 w-full rounded border border-slate-300 px-3 text-sm" /></label>
      </div>
      <div className="mt-4 max-h-[50vh] divide-y divide-slate-100 overflow-y-auto">{loadingCandidates ? <p className="p-5 text-sm text-slate-500">Loading approved questions...</p> : candidates.length ? candidates.map((candidate) => {
        const isAdded = added.has(candidate.id); const isSelected = selectedIds.includes(candidate.id);
        return <label key={candidate.id} className={`flex gap-3 p-3 text-sm ${isAdded ? "bg-slate-50 text-slate-500" : "cursor-pointer"}`}><input type="checkbox" disabled={isAdded || busy} checked={isSelected} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, candidate.id] : current.filter((id) => id !== candidate.id))} /><span className="min-w-0 flex-1"><strong className="block text-slate-900">{candidate.question.questionText}</strong><span className="mt-1 block text-xs text-slate-500">Type: {displayType(candidate.question.questionType)} | {candidate.question.marks} marks | {candidate.question.difficulty} | Source: {candidate.question.exerciseId ? "Chapter Exercise" : "Question Bank"}</span><span className="mt-1 block text-xs text-slate-500">{formatPublisherChapterLabel(candidate.context.chapter.chapterNumber, candidate.context.chapter.title)}{candidate.context.module ? ` | ${candidate.context.module.title}` : ""}</span></span>{isAdded ? <em className="text-xs font-semibold">Already added</em> : null}</label>;
      }) : <p className="p-5 text-sm text-slate-500">No approved questions match these filters.</p>}</div>
      <footer className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setPickerOpen(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold">Cancel</button><button type="button" disabled={busy || !selectedIds.length} onClick={() => void addSelected()} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Add Selected</button></footer>
    </section></div>;
  }

  function StudentLaunchPreview() {
    return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"><section role="dialog" aria-modal="true" aria-label="Student worksheet button preview" className="w-full max-w-md rounded-xl bg-slate-100 p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">Student button preview</h2><button type="button" aria-label="Close" onClick={() => setLaunchPreviewOpen(false)} className="rounded bg-white p-2"><X className="h-5 w-5" /></button></div><div className="mt-5 flex justify-center"><WorksheetLaunchCard title={worksheetTitle} context={chapterTitle ?? "Chapter"} questionCount={items.length} totalMarks={totalMarks} onOpen={() => { setLaunchPreviewOpen(false); setPreviewOpen(true); }} /></div></section></div>;
  }
  function WorksheetPreview() {
    const [mode, setMode] = useState<PreviewMode>("INTERACTIVE");
    const [responses, setResponses] = useState<Record<string, unknown>>({});
    return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4"><section role="dialog" aria-modal="true" aria-label="Worksheet preview" className="mx-auto max-w-4xl rounded-xl bg-slate-100 p-4 shadow-2xl sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Bluegate Worksheet</p><h2 className="text-xl font-bold text-slate-900">{worksheetTitle}</h2><p className="mt-1 text-sm text-slate-600">{bookTitle ?? "Book"}{chapterTitle ? ` | ${chapterTitle}` : ""}</p></div><button type="button" aria-label="Close preview" onClick={() => setPreviewOpen(false)} className="rounded bg-white p-2"><X className="h-5 w-5" /></button></header>
      <nav aria-label="Worksheet preview modes" className="mt-4 flex flex-wrap gap-2">{(["INTERACTIVE", "PRINT", "ANSWER_KEY"] as PreviewMode[]).map((tab) => <button key={tab} type="button" onClick={() => setMode(tab)} className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === tab ? "bg-indigo-600 text-white" : "bg-white text-slate-700"}`}>{tab === "INTERACTIVE" ? "Interactive" : tab === "PRINT" ? "PDF Preview" : "Answer Key"}</button>)}</nav>
      <main className="mt-4 rounded-xl bg-white p-4 sm:p-6"><div className="border-b border-slate-200 pb-4"><p className="font-bold text-slate-900">{worksheetTitle}</p><p className="mt-1 text-sm text-slate-600">{bookTitle ?? "Book"}{chapterTitle ? ` | ${chapterTitle}` : ""}</p>{mode === "PRINT" ? <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4"><span>Name ____________________</span><span>Class ____________________</span><span>Section ____________________</span><span>Date ____________________</span></div> : null}{instructions ? <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700"><strong>Instructions:</strong> {instructions}</p> : null}</div>
        <div className="mt-5 space-y-5">{previewQuestions.map((question, index) => <article key={question.id}><p className="mb-2 text-sm font-bold text-slate-500">Question {index + 1} {question.marks ? `(${question.marks} marks)` : ""}</p>{mode === "INTERACTIVE" ? <InteractiveQuestionRenderer question={question} response={responses[question.id] ?? ""} onChange={(value) => setResponses((current) => ({ ...current, [question.id]: value }))} /> : <><PrintQuestionRenderer question={question} mode={mode === "PRINT" ? "PRINT" : "ANSWER_KEY"} audience={mode === "PRINT" ? "STUDENT" : "PUBLISHER"} />{mode === "ANSWER_KEY" && question.explanation ? <p className="mt-2 rounded bg-amber-50 p-3 text-sm text-amber-900"><strong>Explanation:</strong> {question.explanation}</p> : null}</>}</article>)}</div>
      </main>
      <footer className="mt-4 flex flex-wrap justify-end gap-2">{mode === "INTERACTIVE" ? <button type="button" onClick={() => setResponses({})} className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm font-bold"><RotateCcw className="h-4 w-4" />Reset Answers</button> : null}{mode === "PRINT" ? <a href={`/api/admin/worksheets/${worksheetId}/pdf?bookId=${encodeURIComponent(bookId)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm font-bold"><FileDown className="h-4 w-4" />Download PDF</a> : null}<button type="button" onClick={() => setPreviewOpen(false)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">Close</button></footer>
    </section></div>;
  }
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }) {
  return <label><span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm"><option value="">All</option>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>;
}

function displayType(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function titleCase(value: string) { return value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }