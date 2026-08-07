"use client";

import { useState } from "react";
import type { ContentBlock, WorksheetBlock } from "@/lib/content-document";
import {
  createWorksheetQuestion,
  defaultAssertionOptions,
  createWorksheetPair,
  createWorksheetSubQuestion,
  WORKSHEET_QUESTION_LABELS,
  WORKSHEET_QUESTION_TYPES,
  type WorksheetOption,
  type WorksheetPair,
  type WorksheetQuestion,
  type WorksheetQuestionType,
  type WorksheetSubQuestion,
} from "@/lib/worksheet-object";
import { createWorksheetPdf, worksheetFilename, worksheetToPrintableHtml } from "@/lib/worksheet-export";

export type ResourceOption = { id: string; title: string; type?: string | null };
type Props = { block: WorksheetBlock; resources: ResourceOption[]; onUpdatePatch: (patch: Partial<ContentBlock>) => void };

const field = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
const control = "rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";

export default function WorksheetBlockEditor({ block, resources, onUpdatePatch }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(Boolean(block.description || block.marks !== undefined || block.difficulty || block.duration || block.teacherNote));
  const updateQuestions = (questions: WorksheetQuestion[]) => onUpdatePatch({ questions });
  const updateQuestion = (id: string, patch: Partial<WorksheetQuestion>) => updateQuestions(block.questions.map((question) => question.id === id ? { ...question, ...patch } : question));
  const addQuestion = (type: WorksheetQuestionType) => { updateQuestions([...block.questions, createWorksheetQuestion(type)]); setPickerOpen(false); };
  const removeQuestion = (id: string) => updateQuestions(block.questions.filter((question) => question.id !== id));
  const moveQuestion = (id: string, direction: -1 | 1) => {
    const questions = [...block.questions]; const index = questions.findIndex((question) => question.id === id); const next = index + direction;
    if (index < 0 || next < 0 || next >= questions.length) return; [questions[index], questions[next]] = [questions[next], questions[index]]; updateQuestions(questions);
  };
  const duplicateQuestion = (id: string) => {
    const index = block.questions.findIndex((question) => question.id === id); if (index < 0) return;
    const source = block.questions[index]; const copy = cloneQuestion(source); const questions = [...block.questions]; questions.splice(index + 1, 0, copy); updateQuestions(questions);
  };
  const downloadPdf = (includeAnswers = false) => {
    const blob = new Blob([createWorksheetPdf(block, { includeAnswers })], { type: "application/pdf" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = worksheetFilename(block.title ?? "worksheet", includeAnswers); link.click(); URL.revokeObjectURL(url);
  };
  const printWorksheet = (includeAnswers = false) => {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) return;
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(block.title ?? "Worksheet")}</title><style>body{font-family:Arial,sans-serif;color:#111827;margin:36px;line-height:1.55}.worksheet-print p{margin:0 0 8px;white-space:pre-wrap}.worksheet-print p:nth-child(1){font-size:12px;font-weight:700;letter-spacing:.12em;color:#5b21b6}.worksheet-print p:nth-child(3){font-size:24px;font-weight:700;margin-bottom:16px}@media print{body{margin:18mm}}</style></head><body>${worksheetToPrintableHtml(block, { includeAnswers })}</body></html>`);
    popup.document.close(); popup.focus(); popup.print();
  };
  const previewWorksheet = () => {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) return;
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(block.title ?? "Worksheet preview")}</title><style>body{font-family:Arial,sans-serif;background:#f1f5f9;color:#111827;margin:0;padding:40px}.worksheet-print{max-width:760px;margin:auto;background:#fff;padding:40px;box-shadow:0 8px 30px #cbd5e1}.worksheet-print p{margin:0 0 8px;white-space:pre-wrap;line-height:1.55}.worksheet-print p:nth-child(1){font-size:12px;font-weight:700;letter-spacing:.12em;color:#5b21b6}.worksheet-print p:nth-child(3){font-size:24px;font-weight:700;margin-bottom:16px}@media print{body{background:#fff;padding:0}.worksheet-print{box-shadow:none;max-width:none}}</style></head><body>${worksheetToPrintableHtml(block)}</body></html>`);
    popup.document.close(); popup.focus();
  };

  return (
    <div className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50/50 p-4" onPointerDown={(event) => event.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-violet-800"><span>Worksheet</span><span className="text-violet-500">{block.questions.length} questions</span><div className="ml-auto flex gap-1 normal-case tracking-normal"><button type="button" className={control} onClick={previewWorksheet}>Preview</button><button type="button" className={control} onClick={() => printWorksheet(false)}>Print</button><button type="button" className={control} onClick={() => downloadPdf(false)}>Download PDF</button>{block.answerKeyEnabled !== false ? <><button type="button" className={control} onClick={() => printWorksheet(true)}>Print key</button><button type="button" className={control} onClick={() => downloadPdf(true)}>Answer key PDF</button></> : null}</div></div>
      <input value={block.title ?? ""} onChange={(event) => onUpdatePatch({ title: event.target.value || undefined })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg font-bold text-slate-900 outline-none focus:border-violet-400" placeholder="Worksheet title (optional)" />
      <textarea value={block.instructions ?? ""} onChange={(event) => onUpdatePatch({ instructions: event.target.value || undefined })} rows={2} className={field} placeholder="Instructions (optional)" />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="rounded-xl border border-dashed border-violet-400 bg-white px-3 py-2 text-sm font-bold text-violet-800 hover:bg-violet-50" onClick={() => setPickerOpen((value) => !value)}>+ Add Question</button>
        <button type="button" className={control} onClick={() => setMetadataOpen((value) => !value)}>{metadataOpen ? "Hide metadata" : "Add metadata"}</button>
        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={block.answerKeyEnabled !== false} onChange={(event) => onUpdatePatch({ answerKeyEnabled: event.target.checked })} />Teacher answer key</label>
      </div>
      {pickerOpen ? <div className="grid grid-cols-2 gap-2 rounded-xl border border-violet-200 bg-white p-3 sm:grid-cols-3">{WORKSHEET_QUESTION_TYPES.map((type) => <button key={type} type="button" onClick={() => addQuestion(type)} className="rounded-lg px-2 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-violet-50">{WORKSHEET_QUESTION_LABELS[type]}</button>)}</div> : null}
      {metadataOpen ? <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-600">Description<input value={block.description ?? ""} onChange={(event) => onUpdatePatch({ description: event.target.value || undefined })} className={field} /></label>
        <label className="text-xs font-bold text-slate-600">Marks<input type="number" min={0} value={block.marks ?? ""} onChange={(event) => onUpdatePatch({ marks: event.target.value === "" ? undefined : Number(event.target.value) })} className={field} /></label>
        <label className="text-xs font-bold text-slate-600">Difficulty<input value={block.difficulty ?? ""} onChange={(event) => onUpdatePatch({ difficulty: event.target.value || undefined })} className={field} placeholder="Foundational, moderate..." /></label>
        <label className="text-xs font-bold text-slate-600">Duration<input value={block.duration ?? ""} onChange={(event) => onUpdatePatch({ duration: event.target.value || undefined })} className={field} placeholder="30 minutes" /></label>
        <label className="text-xs font-bold text-slate-600 sm:col-span-2">Teacher note<textarea value={block.teacherNote ?? ""} onChange={(event) => onUpdatePatch({ teacherNote: event.target.value || undefined })} rows={2} className={field} placeholder="Visible to teachers/admins only" /></label>
      </div> : null}
      {block.questions.map((question, index) => <QuestionEditor key={question.id} question={question} index={index} total={block.questions.length} resources={resources} onUpdate={(patch) => updateQuestion(question.id, patch)} onMove={(direction) => moveQuestion(question.id, direction)} onDuplicate={() => duplicateQuestion(question.id)} onRemove={() => removeQuestion(question.id)} />)}
      <p className="text-xs text-slate-500">Metadata, marks, and answers are optional. Question numbers follow the saved order.</p>
    </div>
  );
}

export function QuestionEditor({ question, index, total, resources, onUpdate, onMove, onDuplicate, onRemove }: { question: WorksheetQuestion; index: number; total: number; resources: ResourceOption[]; onUpdate: (patch: Partial<WorksheetQuestion>) => void; onMove: (direction: -1 | 1) => void; onDuplicate: () => void; onRemove: () => void }) {
  const updateOptions = (options: WorksheetOption[]) => onUpdate({ options });
  const updatePairs = (pairs: WorksheetPair[]) => onUpdate({ pairs });
  const updateSubQuestions = (subQuestions: WorksheetSubQuestion[]) => onUpdate({ subQuestions });
  return <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="flex flex-wrap items-center gap-2"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-800">{index + 1}</span><select value={question.type} onChange={(event) => onUpdate({ type: event.target.value as WorksheetQuestionType })} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700">{WORKSHEET_QUESTION_TYPES.map((type) => <option key={type} value={type}>{WORKSHEET_QUESTION_LABELS[type]}</option>)}</select><div className="ml-auto flex gap-1"><button type="button" className={control} disabled={index === 0} onClick={() => onMove(-1)}>Up</button><button type="button" className={control} disabled={index === total - 1} onClick={() => onMove(1)}>Down</button><button type="button" className={control} onClick={onDuplicate}>Duplicate</button><button type="button" className="rounded-lg px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50" onClick={onRemove}>Delete</button></div></div>
    <textarea value={question.prompt} onChange={(event) => onUpdate({ prompt: event.target.value })} rows={2} className={field} placeholder="Question prompt" />
    {question.type === "mcq" ? <OptionsEditor options={question.options ?? []} correctOption={question.correctOption} onChange={updateOptions} onCorrect={(value) => onUpdate({ correctOption: value || undefined })} /> : null}
    {question.type === "fillBlank" ? <input value={(question.blanks ?? []).join(" | ")} onChange={(event) => onUpdate({ blanks: event.target.value.split("|").map((value) => value.trim()).filter(Boolean) })} className={field} placeholder="Optional answers, separated by |" /> : null}
    {question.type === "trueFalse" ? <select value={question.trueFalseAnswer ?? ""} onChange={(event) => onUpdate({ trueFalseAnswer: event.target.value === "" ? undefined : event.target.value as "true" | "false" })} className={field}><option value="">Correct answer (optional)</option><option value="true">True</option><option value="false">False</option></select> : null}
    {question.type === "match" ? <PairsEditor pairs={question.pairs ?? []} onChange={updatePairs} /> : null}
    {question.type === "assertionReason" ? <div className="grid gap-2 sm:grid-cols-2"><textarea value={question.assertion ?? ""} onChange={(event) => onUpdate({ assertion: event.target.value || undefined })} rows={2} className={field} placeholder="Assertion" /><textarea value={question.reason ?? ""} onChange={(event) => onUpdate({ reason: event.target.value || undefined })} rows={2} className={field} placeholder="Reason" /><OptionsEditor options={question.assertionOptions ?? defaultAssertionOptions()} correctOption={question.correctAssertionOption} onChange={(options) => onUpdate({ assertionOptions: options })} onCorrect={(value) => onUpdate({ correctAssertionOption: value || undefined })} /></div> : null}
    {question.type === "caseBased" ? <CaseEditor caseText={question.caseText} subQuestions={question.subQuestions ?? []} onCaseText={(value) => onUpdate({ caseText: value || undefined })} onSubQuestions={updateSubQuestions} /> : null}
    <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-slate-500">Answer and visibility (optional)</summary><div className="mt-2 grid gap-2 sm:grid-cols-2"><textarea value={question.answer ?? ""} onChange={(event) => onUpdate({ answer: event.target.value || undefined })} rows={2} className={field} placeholder="Suggested answer" /><textarea value={question.explanation ?? ""} onChange={(event) => onUpdate({ explanation: event.target.value || undefined })} rows={2} className={field} placeholder="Explanation" /><input type="number" min={0} value={question.marks ?? ""} onChange={(event) => onUpdate({ marks: event.target.value === "" ? undefined : Number(event.target.value) })} className={field} placeholder="Marks" /><select value={question.resourceId ?? ""} onChange={(event) => onUpdate({ resourceId: event.target.value || undefined })} className={field}><option value="">Question resource (optional)</option>{resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.title}</option>)}</select><textarea value={question.instructions ?? ""} onChange={(event) => onUpdate({ instructions: event.target.value || undefined })} rows={2} className={`${field} sm:col-span-2`} placeholder="Question instructions (optional)" /><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={question.visibility?.student !== false} onChange={(event) => onUpdate({ visibility: { student: event.target.checked, teacher: question.visibility?.teacher !== false } })} />Visible to students</label><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={question.visibility?.teacher !== false} onChange={(event) => onUpdate({ visibility: { student: question.visibility?.student !== false, teacher: event.target.checked } })} />Visible to teachers</label></div></details>
  </section>;
}

function OptionsEditor({ options, correctOption, onChange, onCorrect }: { options: WorksheetOption[]; correctOption?: string; onChange: (options: WorksheetOption[]) => void; onCorrect: (value: string) => void }) { return <div className="grid gap-2 sm:col-span-2">{options.map((option, index) => <div key={option.id} className="flex gap-2"><input value={option.text} onChange={(event) => onChange(options.map((entry) => entry.id === option.id ? { ...entry, text: event.target.value } : entry))} className={field} placeholder={`Option ${String.fromCharCode(65 + index)}`} /><button type="button" className={control} onClick={() => onChange(options.filter((entry) => entry.id !== option.id))}>Remove</button></div>)}<div className="flex flex-wrap gap-2"><button type="button" className={control} onClick={() => onChange([...options, { id: createId(), text: "" }])}>+ Option</button><select value={correctOption ?? ""} onChange={(event) => onCorrect(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs"><option value="">Correct option (optional)</option>{options.map((option, index) => <option key={option.id} value={option.id}>Option {String.fromCharCode(65 + index)}</option>)}</select></div></div>; }

function PairsEditor({ pairs, onChange }: { pairs: WorksheetPair[]; onChange: (pairs: WorksheetPair[]) => void }) { return <div className="grid gap-2"><div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase text-slate-400"><span>Column A</span><span>Column B</span></div>{pairs.map((pair) => <div key={pair.id} className="grid grid-cols-[1fr_1fr_auto] gap-2"><input value={pair.left} onChange={(event) => onChange(pairs.map((entry) => entry.id === pair.id ? { ...entry, left: event.target.value } : entry))} className={field} /><input value={pair.right} onChange={(event) => onChange(pairs.map((entry) => entry.id === pair.id ? { ...entry, right: event.target.value } : entry))} className={field} /><button type="button" className={control} onClick={() => onChange(pairs.filter((entry) => entry.id !== pair.id))}>Remove</button></div>)}<button type="button" className={control} onClick={() => onChange([...pairs, createWorksheetPair()])}>+ Pair</button></div>; }

function CaseEditor({ caseText, subQuestions, onCaseText, onSubQuestions }: { caseText?: string; subQuestions: WorksheetSubQuestion[]; onCaseText: (value: string) => void; onSubQuestions: (value: WorksheetSubQuestion[]) => void }) { return <div className="grid gap-2 sm:col-span-2"><textarea value={caseText ?? ""} onChange={(event) => onCaseText(event.target.value)} rows={3} className={field} placeholder="Case, passage, or scenario" />{subQuestions.map((entry, index) => <div key={entry.id} className="grid grid-cols-[auto_1fr_auto] gap-2"><span className="pt-3 text-xs font-bold text-slate-500">{index + 1}.</span><input value={entry.prompt} onChange={(event) => onSubQuestions(subQuestions.map((item) => item.id === entry.id ? { ...item, prompt: event.target.value } : item))} className={field} placeholder="Sub-question" /><button type="button" className={control} onClick={() => onSubQuestions(subQuestions.filter((item) => item.id !== entry.id))}>Remove</button></div>)}<button type="button" className={control} onClick={() => onSubQuestions([...subQuestions, createWorksheetSubQuestion()])}>+ Sub-question</button></div>; }

function cloneQuestion(question: WorksheetQuestion): WorksheetQuestion { return { ...question, id: createId(), visibility: question.visibility ? { ...question.visibility } : undefined, options: question.options?.map((option) => ({ ...option, id: createId() })), assertionOptions: question.assertionOptions?.map((option) => ({ ...option, id: createId() })), pairs: question.pairs?.map((pair) => ({ ...pair, id: createId() })), subQuestions: question.subQuestions?.map((entry) => ({ ...entry, id: createId() })) }; }
function createId() { return `worksheet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function escapeHtml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;"); }
