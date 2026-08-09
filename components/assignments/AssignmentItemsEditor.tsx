"use client";

import { useMemo, useState, useTransition } from "react";

import {
  createAssignmentItemAction,
  deleteAssignmentItemAction,
  getAssignmentItemsAction,
  listPublisherAssignmentQuestionsAction,
  reorderAssignmentItemsAction,
  updateAssignmentItemAction,
} from "@/app/teacher-dashboard/classes/[sectionId]/assignments/actions";
import {
  getTeachingPlanPageAvailabilityAction,
  getTeachingPlanPagePreviewAction,
} from "@/app/teacher-dashboard/classes/[sectionId]/plan/teaching-actions";
import V2ContentDocumentRenderer from "@/components/content/V2ContentDocumentRenderer";

type ItemType = "PUBLISHER_PAGE" | "PUBLISHER_QUESTION" | "INSTRUCTION" | "TEACHER_QUESTION";
type PickerMode = ItemType | "CHOOSER";
type ItemState = "CURRENT" | "SOURCE_CHANGED" | "MISSING_TARGET";
type AssignmentItem = {
  id: string; type: ItemType; sequence: number; state: ItemState;
  moduleId: string | null; pageId: string | null; frameId: string | null; childFrameId: string | null; questionId: string | null;
  targetLabelSnapshot: string | null; payload: unknown;
};
type Page = Awaited<ReturnType<typeof getTeachingPlanPageAvailabilityAction>>["pages"][number];
type Preview = Awaited<ReturnType<typeof getTeachingPlanPagePreviewAction>>;
type PublisherQuestion = Awaited<ReturnType<typeof listPublisherAssignmentQuestionsAction>>[number];

const labels: Record<ItemType, string> = {
  PUBLISHER_PAGE: "Book Page", PUBLISHER_QUESTION: "Book Question", INSTRUCTION: "Instruction", TEACHER_QUESTION: "Teacher Question",
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function textFor(item: AssignmentItem) {
  const payload = record(item.payload);
  if (item.type === "INSTRUCTION") return typeof payload?.text === "string" ? payload.text : "Instruction";
  if (item.type === "TEACHER_QUESTION") return typeof payload?.prompt === "string" ? payload.prompt : "Teacher question";
  return item.targetLabelSnapshot ?? "Book content";
}
function friendly(message: string) {
  if (/Select a book|book is not available/i.test(message)) return "Select a book before adding this item.";
  if (/publisher target|V2 page|no longer available/i.test(message)) return "This book content is no longer available.";
  if (/student responses|students have already/i.test(message)) return "Students have already started this item.";
  if (/Published, closed, or archived|cannot be changed/i.test(message)) return "This assignment can no longer be changed.";
  return message || "The assignment item could not be saved.";
}

export default function AssignmentItemsEditor({ sectionId, assignment, initialItems, period }: {
  sectionId: string;
  assignment: { id: string; status: string; bookId: string | null; sectionSubjectId: string | null };
  initialItems: AssignmentItem[];
  period?: { sequence: number; title: string; pages: string; pageKeys: string[] } | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [mode, setMode] = useState<PickerMode | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [questions, setQuestions] = useState<PublisherQuestion[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState("");
  const [notice, setNotice] = useState("");
  const [instruction, setInstruction] = useState("");
  const [prompt, setPrompt] = useState("");
  const [responseType, setResponseType] = useState("SHORT_TEXT");
  const [options, setOptions] = useState(["", ""]);
  const [editing, setEditing] = useState<AssignmentItem | null>(null);
  const [pending, startTransition] = useTransition();

  const editable = assignment.status === "DRAFT" || assignment.status === "SCHEDULED";
  const bookReady = Boolean(assignment.bookId && assignment.sectionSubjectId);
  const modules = useMemo(() => [...new Map(pages.map((page) => [page.moduleId, page.moduleTitle])).entries()], [pages]);
  const periodPageKeys = useMemo(() => new Set(period?.pageKeys ?? []), [period?.pageKeys]);
  const shownPages = pages.filter((page) => (moduleFilter === "all" || page.moduleId === moduleFilter) && (page.title + " " + page.moduleTitle + " " + page.displayPageNumber).toLowerCase().includes(search.trim().toLowerCase())).sort((left, right) => Number(periodPageKeys.has(left.moduleId + ":" + left.pageId)) - Number(periodPageKeys.has(right.moduleId + ":" + right.pageId)) || left.displayPageNumber - right.displayPageNumber);

  async function refreshItems() {
    try { setItems(await getAssignmentItemsAction(sectionId, assignment.id)); } catch { setNotice("The assignment items could not be refreshed."); }
  }
  async function loadPages() {
    if (!bookReady || !assignment.bookId || !assignment.sectionSubjectId) return;
    setLoading("pages");
    try { setPages((await getTeachingPlanPageAvailabilityAction({ sectionSubjectId: assignment.sectionSubjectId, bookId: assignment.bookId })).pages); }
    catch (error) { setNotice(friendly(error instanceof Error ? error.message : "")); }
    finally { setLoading(""); }
  }
  async function previewPage(page: Page) {
    if (!assignment.bookId || !assignment.sectionSubjectId) return;
    setSelectedPage(page); setLoading("preview");
    try { setPreview(await getTeachingPlanPagePreviewAction({ sectionSubjectId: assignment.sectionSubjectId, bookId: assignment.bookId, moduleId: page.moduleId, pageId: page.pageId })); }
    catch (error) { setNotice(friendly(error instanceof Error ? error.message : "")); }
    finally { setLoading(""); }
  }
  async function loadQuestions(page: Page) {
    await previewPage(page); setLoading("questions");
    try { setQuestions(await listPublisherAssignmentQuestionsAction(sectionId, assignment.id, { moduleId: page.moduleId, pageId: page.pageId })); }
    catch (error) { setNotice(friendly(error instanceof Error ? error.message : "")); }
    finally { setLoading(""); }
  }
  function open(type: PickerMode) {
    if (!editable) { setNotice("This assignment can no longer be changed."); return; }
    if (type === "CHOOSER") { setMode(type); setEditing(null); return; }
    if (type !== "INSTRUCTION" && !bookReady) { setNotice("Select a book to add book content or answerable teacher questions."); return; }
    setMode(type); setSelectedPage(null); setQuestions([]); setPreview(null); setInstruction(""); setPrompt(""); setResponseType("SHORT_TEXT"); setOptions(["", ""]);
    if (type === "PUBLISHER_PAGE" || type === "PUBLISHER_QUESTION") void loadPages();
  }
  function create(item: unknown) {
    startTransition(async () => {
      const result = await createAssignmentItemAction(sectionId, assignment.id, item);
      setNotice(result.message);
      if (result.ok) { await refreshItems(); setMode(null); }
    });
  }
  function remove(item: AssignmentItem) {
    startTransition(async () => {
      const result = await deleteAssignmentItemAction(sectionId, assignment.id, item.id);
      setNotice(result.message); if (result.ok) await refreshItems();
    });
  }
  function move(item: AssignmentItem, direction: -1 | 1) {
    const current = items.findIndex((entry) => entry.id === item.id); const next = current + direction;
    if (current < 0 || next < 0 || next >= items.length) return;
    const ordered = items.map((entry) => entry.id); [ordered[current], ordered[next]] = [ordered[next], ordered[current]];
    startTransition(async () => {
      const result = await reorderAssignmentItemsAction(sectionId, assignment.id, ordered);
      setNotice(result.message); if (result.ok) setItems(result.data as AssignmentItem[]);
    });
  }
  function edit(item: AssignmentItem) {
    const payload = record(item.payload); setEditing(item); setMode(item.type);
    setInstruction(typeof payload?.text === "string" ? payload.text : "");
    setPrompt(typeof payload?.prompt === "string" ? payload.prompt : "");
    setResponseType(typeof payload?.responseType === "string" ? payload.responseType : "SHORT_TEXT");
    setOptions(Array.isArray(payload?.options) ? payload.options.map((option) => String(record(option)?.label ?? "")).filter(Boolean) : ["", ""]);
  }
  function saveEdit() {
    if (!editing) return;
    const item = editing.type === "INSTRUCTION"
      ? { type: "INSTRUCTION", payload: { text: instruction } }
      : { type: "TEACHER_QUESTION", payload: { prompt, responseType, ...(responseType === "MCQ" ? { options: options.map((label) => ({ label })) } : {}) } };
    startTransition(async () => {
      const result = await updateAssignmentItemAction(sectionId, assignment.id, editing.id, item);
      setNotice(result.message); if (result.ok) { await refreshItems(); setEditing(null); setMode(null); }
    });
  }

  return <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Assignment Work</h2><p className="mt-1 text-sm text-slate-600">Ordered pages, questions, and teacher-authored steps.</p></div><button type="button" onClick={() => open("CHOOSER")} disabled={!editable} className="min-h-11 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 font-bold text-blue-800 disabled:opacity-50">+ Add Item</button></div>
    {period ? <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950"><strong>Teaching Period {period.sequence}: {period.title}</strong>{period.pages ? " · " + period.pages : ""}</p> : null}
    {!bookReady ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950">Select a book to add book content or answerable teacher questions. Instructions can still be added.</p> : null}
    {notice ? <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950">{friendly(notice)}</p> : null}
    {items.length ? <ol className="mt-5 space-y-3">{items.map((item, index) => <li key={item.id} className="rounded-xl border bg-slate-50 p-3"><div className="flex flex-wrap items-start gap-3"><span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-slate-200 px-2 text-sm font-bold">{item.sequence}</span><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{labels[item.type]}</p><p className="mt-1 break-words font-semibold">{textFor(item)}</p>{item.state === "CURRENT" && item.type.startsWith("PUBLISHER") ? <p className="mt-2 text-xs text-emerald-700">Current</p> : null}{item.state === "SOURCE_CHANGED" ? <p className="mt-2 text-sm font-medium text-amber-800">Publisher content updated</p> : null}{item.state === "MISSING_TARGET" ? <p className="mt-2 text-sm font-medium text-rose-800">{item.targetLabelSnapshot ?? "Content no longer available"}</p> : null}</div><div className="flex flex-wrap gap-2">{item.moduleId && item.pageId ? <button type="button" onClick={() => { const page = pages.find((entry) => entry.moduleId === item.moduleId && entry.pageId === item.pageId); if (page) void previewPage(page); else { setMode("PUBLISHER_PAGE"); void loadPages(); } }} className="min-h-9 rounded-lg border px-3 text-sm font-semibold">Preview</button> : null}{editable && (item.type === "INSTRUCTION" || item.type === "TEACHER_QUESTION") ? <button type="button" onClick={() => edit(item)} className="min-h-9 rounded-lg border px-3 text-sm font-semibold">Edit</button> : null}{editable ? <button type="button" onClick={() => move(item, -1)} disabled={pending || index === 0} aria-label={"Move item " + item.sequence + " earlier"} className="min-h-9 rounded-lg border px-3 text-sm font-semibold disabled:opacity-40">↑</button> : null}{editable ? <button type="button" onClick={() => move(item, 1)} disabled={pending || index === items.length - 1} aria-label={"Move item " + item.sequence + " later"} className="min-h-9 rounded-lg border px-3 text-sm font-semibold disabled:opacity-40">↓</button> : null}{editable ? <button type="button" onClick={() => remove(item)} disabled={pending} aria-label={"Remove " + textFor(item)} className="min-h-9 rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-700 disabled:opacity-40">Remove</button> : null}</div></div></li>)}</ol> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No assignment items yet.</p>}
    {mode ? <div role="dialog" aria-modal="true" aria-labelledby="assignment-item-picker-title" className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="assignment-item-picker-title" className="text-lg font-bold">Add to Assignment</h3><p className="mt-1 text-sm text-slate-600">Choose an ordered work item.</p></div><button type="button" onClick={() => { setMode(null); setEditing(null); }} className="min-h-10 rounded-lg border bg-white px-3 font-semibold">Close</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{(["PUBLISHER_PAGE", "PUBLISHER_QUESTION", "INSTRUCTION", "TEACHER_QUESTION"] as ItemType[]).map((type) => <button key={type} type="button" onClick={() => open(type)} disabled={!editable || (type !== "INSTRUCTION" && !bookReady)} className={"min-h-12 rounded-xl border px-4 text-left font-bold " + (mode === type ? "border-blue-600 bg-blue-600 text-white" : "bg-white") + " disabled:cursor-not-allowed disabled:opacity-45"}>{labels[type]}</button>)}</div>
      {mode === "INSTRUCTION" ? <div className="mt-5"><label className="block font-semibold">Instruction<textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={5000} rows={4} className="mt-2 w-full rounded-xl border bg-white p-3" placeholder="Complete Questions 1–3 in your notebook." /></label><button type="button" disabled={pending || !instruction.trim()} onClick={() => editing ? saveEdit() : create({ type: "INSTRUCTION", payload: { text: instruction } })} className="mt-3 min-h-11 rounded-xl bg-blue-700 px-4 font-bold text-white disabled:opacity-50">{pending ? "Saving…" : editing ? "Save Instruction" : "Add Instruction"}</button></div> : null}
      {mode === "TEACHER_QUESTION" ? <QuestionEditor prompt={prompt} responseType={responseType} options={options} pending={pending} onPrompt={setPrompt} onResponse={setResponseType} onOptions={setOptions} onSave={() => editing ? saveEdit() : create({ type: "TEACHER_QUESTION", payload: { prompt, responseType, ...(responseType === "MCQ" ? { options: options.map((label) => ({ label })) } : {}) } })} /> : null}
      {mode === "PUBLISHER_PAGE" || mode === "PUBLISHER_QUESTION" ? <div className="mt-5 space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Module<select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2"><option value="all">All modules</option>{modules.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label><label className="text-sm font-semibold">Find page<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Page or title" className="mt-1 w-full rounded-lg border bg-white p-2" /></label></div>{loading === "pages" ? <p className="text-sm font-semibold">Loading pages…</p> : <div className="max-h-64 space-y-2 overflow-auto pr-1">{shownPages.map((page) => <div key={page.moduleId + page.pageId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-3"><div><strong>Page {page.displayPageNumber}</strong><span className="ml-2 text-sm text-slate-600">{page.title}</span><p className="text-xs text-slate-500">{page.moduleTitle}</p></div><div className="flex gap-2"><button type="button" onClick={() => void previewPage(page)} className="min-h-9 rounded-lg border px-3 text-sm font-semibold">Preview</button>{mode === "PUBLISHER_PAGE" ? <button type="button" onClick={() => create({ type: "PUBLISHER_PAGE", moduleId: page.moduleId, pageId: page.pageId })} disabled={pending} className="min-h-9 rounded-lg bg-blue-700 px-3 text-sm font-bold text-white">Add</button> : <button type="button" onClick={() => void loadQuestions(page)} className="min-h-9 rounded-lg bg-blue-700 px-3 text-sm font-bold text-white">Questions</button>}</div></div>)}</div>}{mode === "PUBLISHER_QUESTION" && selectedPage ? <div className="rounded-xl border bg-white p-3"><p className="font-semibold">Questions on Page {selectedPage.displayPageNumber}</p>{loading === "questions" ? <p className="mt-2 text-sm">Loading questions…</p> : questions.length ? <div className="mt-3 space-y-2">{questions.map((question, index) => <div key={question.questionId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><div className="min-w-0"><p className="font-semibold">Question {index + 1}</p><p className="max-w-2xl break-words text-sm text-slate-700">{question.prompt}</p><p className="text-xs text-slate-500">{question.responseType ?? "Response"}</p></div><button type="button" disabled={pending} onClick={() => create({ type: "PUBLISHER_QUESTION", moduleId: question.moduleId, pageId: question.pageId, frameId: question.frameId, ...(question.childFrameId ? { childFrameId: question.childFrameId } : {}), questionId: question.questionId })} className="min-h-9 rounded-lg bg-blue-700 px-3 text-sm font-bold text-white">Add</button></div>)}</div> : <p className="mt-2 text-sm text-slate-600">No student-assignable questions on this page.</p>}</div> : null}</div> : null}
      {preview ? <div className="mt-5 rounded-xl border bg-white p-3"><h4 className="font-bold">Preview current content</h4>{loading === "preview" ? <p className="mt-2 text-sm">Loading preview…</p> : <V2ContentDocumentRenderer document={preview.document} mode="TEACHER" linkedAssets={preview.linkedAssets} activities={preview.activities} worksheets={preview.worksheets} media={preview.media} sectionDefinitions={preview.sectionDefinitions} knowledgeDefinitions={preview.knowledgeDefinitions} resourceUrls={preview.resourceUrls} pageNumberOffset={preview.metadata.displayPageNumber - 1} className="mt-3" />}</div> : null}
    </div> : null}
  </section>;
}

function QuestionEditor({ prompt, responseType, options, pending, onPrompt, onResponse, onOptions, onSave }: {
  prompt: string; responseType: string; options: string[]; pending: boolean;
  onPrompt: (value: string) => void; onResponse: (value: string) => void; onOptions: (value: string[]) => void; onSave: () => void;
}) {
  return <div className="mt-5 space-y-3"><label className="block font-semibold">Prompt<textarea value={prompt} onChange={(event) => onPrompt(event.target.value)} maxLength={5000} rows={3} className="mt-2 w-full rounded-xl border bg-white p-3" /></label><label className="block font-semibold">Response type<select value={responseType} onChange={(event) => onResponse(event.target.value)} className="mt-2 w-full rounded-xl border bg-white p-3"><option value="SHORT_TEXT">Short text</option><option value="LONG_TEXT">Long text</option><option value="MCQ">Multiple choice</option><option value="TRUE_FALSE">True / False</option></select></label>{responseType === "MCQ" ? <fieldset className="space-y-2"><legend className="font-semibold">Options</legend>{options.map((option, index) => <div key={index} className="flex gap-2"><input aria-label={"Option " + (index + 1)} value={option} onChange={(event) => onOptions(options.map((value, current) => current === index ? event.target.value : value))} maxLength={250} className="min-h-10 flex-1 rounded-lg border p-2" /><button type="button" aria-label={"Remove option " + (index + 1)} onClick={() => onOptions(options.filter((_, current) => current !== index))} disabled={options.length <= 2} className="min-h-10 rounded-lg border px-3">Remove</button></div>)}<button type="button" onClick={() => onOptions([...options, ""])} disabled={options.length >= 12} className="min-h-10 rounded-lg border px-3 font-semibold">Add option</button></fieldset> : null}<button type="button" disabled={pending || !prompt.trim() || (responseType === "MCQ" && options.some((option) => !option.trim()))} onClick={onSave} className="min-h-11 rounded-xl bg-blue-700 px-4 font-bold text-white disabled:opacity-50">{pending ? "Saving…" : "Save Teacher Question"}</button></div>;
}
