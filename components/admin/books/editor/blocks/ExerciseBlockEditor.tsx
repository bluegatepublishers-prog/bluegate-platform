"use client";

import { useState } from "react";
import type { ContentBlock, ExerciseBlock } from "@/lib/content-document";
import {
  addExerciseGroup,
  addExerciseQuestion,
  createExerciseGroup,
  createExerciseQuestion,
  duplicateExerciseQuestion,
  moveExerciseGroup,
  moveExerciseQuestion,
  removeExerciseGroup,
  removeExerciseQuestion,
  updateExerciseGroup,
  type ExerciseGroup,
} from "@/lib/exercise-object";
import { WORKSHEET_QUESTION_LABELS, WORKSHEET_QUESTION_TYPES, type WorksheetQuestion, type WorksheetQuestionType } from "@/lib/worksheet-object";
import { QuestionEditor, type ResourceOption } from "@/components/admin/books/editor/blocks/WorksheetBlockEditor";

const field = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100";
const control = "rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";

export default function ExerciseBlockEditor({ block, resources, onUpdatePatch }: { block: ExerciseBlock; resources: ResourceOption[]; onUpdatePatch: (patch: Partial<ContentBlock>) => void }) {
  const [pickerTarget, setPickerTarget] = useState<"flat" | string | null>(null);
  const [metadataOpen, setMetadataOpen] = useState(Boolean(block.introduction || block.teacherNote || block.difficulty || block.suggestedTime));
  const update = (next: ExerciseBlock) => onUpdatePatch({ questions: next.questions, groups: next.groups, title: next.title, introduction: next.introduction, instructions: next.instructions, teacherNote: next.teacherNote, difficulty: next.difficulty, suggestedTime: next.suggestedTime, showAnswersToStudent: next.showAnswersToStudent });
  const addQuestion = (type: WorksheetQuestionType, groupId?: string) => { update(addExerciseQuestion(block, createExerciseQuestion(type), groupId)); setPickerTarget(null); };
  const updateQuestion = (questionId: string, patch: Partial<WorksheetQuestion>) => update({ ...block, questions: block.questions.map((question) => question.id === questionId ? { ...question, ...patch } : question), groups: block.groups.map((group) => ({ ...group, questions: group.questions.map((question) => question.id === questionId ? { ...question, ...patch } : question) })) });
  const duplicateQuestion = (id: string) => update(duplicateExerciseQuestion(block, id));
  const removeQuestion = (id: string) => update(removeExerciseQuestion(block, id));
  const moveQuestion = (id: string, direction: -1 | 1) => update(moveExerciseQuestion(block, id, direction));
  const addGroup = () => update(addExerciseGroup(block, createExerciseGroup()));
  const preview = (includeAnswers: boolean) => {
    const popup = window.open("", "_blank", "noopener,noreferrer"); if (!popup) return;
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(block.title ?? "Exercise")}</title><style>body{font-family:Arial,sans-serif;background:#f1f5f9;color:#1f2937;margin:0;padding:40px}.exercise{max-width:780px;margin:auto;background:white;padding:40px;box-shadow:0 8px 30px #cbd5e1}.eyebrow{font-size:12px;font-weight:700;letter-spacing:.14em;color:#92400e}.question{margin:18px 0;padding:14px;border-left:3px solid #f59e0b;background:#fffbeb}.group{margin-top:28px}.group h2{font-size:18px;margin-bottom:6px}.answer{margin-top:8px;padding:8px;background:#ecfdf5;color:#065f46}@media print{body{background:white;padding:0}.exercise{box-shadow:none;max-width:none}}</style></head><body>${exercisePreviewHtml(block, includeAnswers)}</body></html>`); popup.document.close(); popup.focus();
  };

  return <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4" onPointerDown={(event) => event.stopPropagation()}>
    <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-800"><span>Exercise</span><span className="text-amber-600">{questionCount(block)} questions</span><div className="ml-auto flex gap-1 normal-case tracking-normal"><button type="button" className={control} onClick={() => preview(false)}>Preview questions</button><button type="button" className={control} onClick={() => preview(true)}>Preview + answers</button></div></div>
    <input value={block.title ?? ""} onChange={(event) => onUpdatePatch({ title: event.target.value || undefined })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg font-bold text-slate-900 outline-none focus:border-amber-400" placeholder="Exercise title (optional)" />
    <textarea value={block.introduction ?? ""} onChange={(event) => onUpdatePatch({ introduction: event.target.value || undefined })} rows={2} className={field} placeholder="Introduction (optional)" />
    <textarea value={block.instructions ?? ""} onChange={(event) => onUpdatePatch({ instructions: event.target.value || undefined })} rows={2} className={field} placeholder="Instructions (optional)" />
    <div className="flex flex-wrap gap-2"><button type="button" className="rounded-xl border border-dashed border-amber-500 bg-white px-3 py-2 text-sm font-bold text-amber-800 hover:bg-amber-50" onClick={() => setPickerTarget("flat")}>+ Add Question</button><button type="button" className={control} onClick={addGroup}>+ Add Group</button><button type="button" className={control} onClick={() => setMetadataOpen((value) => !value)}>{metadataOpen ? "Hide metadata" : "Add metadata"}</button></div>
    {pickerTarget === "flat" ? <QuestionPicker onPick={(type) => addQuestion(type)} /> : null}
    {metadataOpen ? <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Difficulty<input value={block.difficulty ?? ""} onChange={(event) => onUpdatePatch({ difficulty: event.target.value || undefined })} className={field} placeholder="Easy, Medium, Hard" /></label><label className="text-xs font-bold text-slate-600">Suggested time<input value={block.suggestedTime ?? ""} onChange={(event) => onUpdatePatch({ suggestedTime: event.target.value || undefined })} className={field} placeholder="15 minutes" /></label><label className="text-xs font-bold text-slate-600 sm:col-span-2">Teacher note<textarea value={block.teacherNote ?? ""} onChange={(event) => onUpdatePatch({ teacherNote: event.target.value || undefined })} rows={2} className={field} placeholder="Visible to teachers/admins only" /></label></div> : null}
    {block.questions.length ? <ExerciseQuestionList title="Ungrouped questions" questions={block.questions} resources={resources} onUpdate={updateQuestion} onMove={moveQuestion} onDuplicate={duplicateQuestion} onRemove={removeQuestion} /> : null}
    {block.groups.map((group, index) => <GroupEditor key={group.id} group={group} index={index} total={block.groups.length} resources={resources} pickerOpen={pickerTarget === group.id} onTogglePicker={() => setPickerTarget(pickerTarget === group.id ? null : group.id)} onAddQuestion={(type) => addQuestion(type, group.id)} onUpdate={(patch) => update(updateExerciseGroup(block, group.id, patch))} onMove={(direction) => update(moveExerciseGroup(block, group.id, direction))} onRemove={() => update(removeExerciseGroup(block, group.id))} onUpdateQuestion={updateQuestion} onMoveQuestion={moveQuestion} onDuplicateQuestion={duplicateQuestion} onRemoveQuestion={removeQuestion} />)}
    <p className="text-xs text-slate-500">Groups are optional. Removing a group returns its questions to the ungrouped list.</p>
  </div>;
}

function GroupEditor({ group, index, total, resources, pickerOpen, onTogglePicker, onAddQuestion, onUpdate, onMove, onRemove, onUpdateQuestion, onMoveQuestion, onDuplicateQuestion, onRemoveQuestion }: { group: ExerciseGroup; index: number; total: number; resources: ResourceOption[]; pickerOpen: boolean; onTogglePicker: () => void; onAddQuestion: (type: WorksheetQuestionType) => void; onUpdate: (patch: Partial<ExerciseGroup>) => void; onMove: (direction: -1 | 1) => void; onRemove: () => void; onUpdateQuestion: (id: string, patch: Partial<WorksheetQuestion>) => void; onMoveQuestion: (id: string, direction: -1 | 1) => void; onDuplicateQuestion: (id: string) => void; onRemoveQuestion: (id: string) => void }) {
  return <section className="rounded-2xl border border-amber-200 bg-white p-3"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">Group {index + 1}</span><div className="ml-auto flex gap-1"><button type="button" className={control} disabled={index === 0} onClick={() => onMove(-1)}>Up</button><button type="button" className={control} disabled={index === total - 1} onClick={() => onMove(1)}>Down</button><button type="button" className="rounded-lg px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50" onClick={onRemove}>Remove group</button></div></div><input value={group.title ?? ""} onChange={(event) => onUpdate({ title: event.target.value || undefined })} className={field} placeholder="Group title (optional)" /><textarea value={group.instructions ?? ""} onChange={(event) => onUpdate({ instructions: event.target.value || undefined })} rows={2} className={field} placeholder="Group instructions (optional)" />{group.questions.length ? <ExerciseQuestionList title="Questions" questions={group.questions} resources={resources} onUpdate={onUpdateQuestion} onMove={onMoveQuestion} onDuplicate={onDuplicateQuestion} onRemove={onRemoveQuestion} /> : null}<button type="button" className="mt-3 rounded-xl border border-dashed border-amber-400 px-3 py-2 text-sm font-bold text-amber-800" onClick={onTogglePicker}>+ Add Question</button>{pickerOpen ? <QuestionPicker onPick={onAddQuestion} /> : null}</section>;
}

function ExerciseQuestionList({ title, questions, resources, onUpdate, onMove, onDuplicate, onRemove }: { title: string; questions: WorksheetQuestion[]; resources: ResourceOption[]; onUpdate: (id: string, patch: Partial<WorksheetQuestion>) => void; onMove: (id: string, direction: -1 | 1) => void; onDuplicate: (id: string) => void; onRemove: (id: string) => void }) {
  return <div className="mt-3 space-y-2"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{title}</p>{questions.map((question, index) => <QuestionEditor key={question.id} question={question} index={index} total={questions.length} resources={resources} onUpdate={(patch) => onUpdate(question.id, patch)} onMove={(direction) => onMove(question.id, direction)} onDuplicate={() => onDuplicate(question.id)} onRemove={() => onRemove(question.id)} />)}</div>;
}

function QuestionPicker({ onPick }: { onPick: (type: WorksheetQuestionType) => void }) { return <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-amber-200 bg-white p-3 sm:grid-cols-3">{WORKSHEET_QUESTION_TYPES.map((type) => <button key={type} type="button" className="rounded-lg px-2 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-amber-50" onClick={() => onPick(type)}>{WORKSHEET_QUESTION_LABELS[type]}</button>)}</div>; }

function questionCount(block: ExerciseBlock) { return block.questions.length + block.groups.reduce((sum, group) => sum + group.questions.length, 0); }
function exercisePreviewHtml(block: ExerciseBlock, includeAnswers: boolean) { let number = 0; const renderQuestion = (question: WorksheetQuestion) => { number += 1; const answer = includeAnswers && (question.answer || question.correctOption || question.trueFalseAnswer || question.explanation) ? `<div class="answer"><strong>Answer:</strong> ${escapeHtml(question.answer ?? question.trueFalseAnswer ?? question.correctOption ?? "")}${question.explanation ? `<br><strong>Explanation:</strong> ${escapeHtml(question.explanation)}` : ""}</div>` : ""; return `<div class="question"><strong>${number}. ${escapeHtml(WORKSHEET_QUESTION_LABELS[question.type])}</strong><p>${escapeHtml(question.prompt || "Untitled question")}</p>${question.options?.map((option, index) => `<div>${String.fromCharCode(65 + index)}. ${escapeHtml(option.text)}</div>`).join("") ?? ""}${answer}</div>`; }; return `<main class="exercise"><p class="eyebrow">EXERCISE</p><h1>${escapeHtml(block.title ?? "Exercise")}</h1>${block.introduction ? `<p>${escapeHtml(block.introduction)}</p>` : ""}${block.instructions ? `<p><strong>Instructions:</strong> ${escapeHtml(block.instructions)}</p>` : ""}${block.questions.map(renderQuestion).join("")}${block.groups.map((group) => `<section class="group"><h2>${escapeHtml(group.title ?? "Exercise group")}</h2>${group.instructions ? `<p>${escapeHtml(group.instructions)}</p>` : ""}${group.questions.map(renderQuestion).join("")}</section>`).join("")}</main>`; }
function escapeHtml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;"); }
