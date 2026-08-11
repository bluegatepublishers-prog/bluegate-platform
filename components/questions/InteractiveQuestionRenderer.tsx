"use client";

import NextImage from "next/image";

import type { NormalizedQuestion } from "@/lib/normalized-question";

type Props = {
  question: NormalizedQuestion;
  response: unknown;
  onChange: (response: unknown) => void;
  disabled?: boolean;
  readOnly?: boolean;
  evaluation?: { correct: boolean | null };
};

export function InteractiveQuestionRenderer({ question, response, onChange, disabled = false, readOnly = false, evaluation }: Props) {
  const blocked = disabled || readOnly;
  const selectable = question.options;
  const imageId = question.resourceIds[0];
  const responseList = Array.isArray(response) ? response.filter((item): item is string => typeof item === "string") : [];
  const answerMap = response && typeof response === "object" && !Array.isArray(response) ? response as Record<string, string> : {};
  const manual = ["SHORT_ANSWER", "LONG_ANSWER", "CASE_BASED", "COMPETENCY", "HOTS", "ASSERTION_REASON", "PRACTICAL", "PROJECT", "CUSTOM", "PICTURE_BASED"].includes(question.questionType);

  return <div className="space-y-4">
    <p className="whitespace-pre-wrap text-base font-semibold text-slate-900">{question.content.plainText}</p>
    {imageId ? <NextImage unoptimized width={640} height={360} src={`/api/resources/${imageId}/play`} alt="Question resource" className="max-h-64 rounded-lg object-contain" /> : null}
    {question.questionType === "MCQ" ? <div role="radiogroup" className="space-y-2">{selectable.map((option) => <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${response === option.id ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}><input type="radio" name={`question-${question.id}`} checked={response === option.id} disabled={blocked} onChange={() => onChange(option.id)} />{option.text}</label>)}</div> : null}
    {question.questionType === "TRUE_FALSE" ? <div className="flex gap-2">{[true, false].map((value) => <button key={String(value)} type="button" disabled={blocked} onClick={() => onChange(value)} className={`rounded-lg border px-4 py-2 text-sm font-bold ${response === value ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-300"}`}>{value ? "True" : "False"}</button>)}</div> : null}
    {question.questionType === "FILL_BLANK" ? <input aria-label="Type your answer here" value={typeof response === "string" ? response : ""} disabled={blocked} onChange={(event) => onChange(event.target.value)} placeholder="Type your answer here" className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" /> : null}
    {question.questionType === "MULTIPLE_SELECT" ? <div className="space-y-2">{selectable.map((option) => <label key={option.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm"><input type="checkbox" checked={responseList.includes(option.id)} disabled={blocked} onChange={(event) => onChange(event.target.checked ? [...responseList, option.id] : responseList.filter((item) => item !== option.id))} />{option.text}</label>)}</div> : null}
    {question.questionType === "MATCH" ? <div className="space-y-2">{question.answer.matches?.map((pair) => <label key={pair.left} className="grid gap-2 text-sm sm:grid-cols-2"><span className="rounded-lg bg-slate-50 p-3">{pair.left}</span><select value={answerMap[pair.left] ?? ""} disabled={blocked} onChange={(event) => onChange({ ...answerMap, [pair.left]: event.target.value })} className="rounded-lg border border-slate-300 px-3"><option value="">Choose a match</option>{question.answer.matches?.map((candidate) => <option key={candidate.right} value={candidate.right}>{candidate.right}</option>)}</select></label>)}</div> : null}
    {question.questionType === "ORDERING" ? <Ordering question={question} response={responseList} onChange={onChange} disabled={blocked} /> : null}
    {manual ? <textarea aria-label="Your response" value={typeof response === "string" ? response : ""} disabled={blocked} onChange={(event) => onChange(event.target.value)} rows={question.questionType === "SHORT_ANSWER" ? 3 : 6} placeholder="Type your response" className="w-full rounded-lg border border-slate-300 p-3 text-sm" /> : null}
    {evaluation?.correct !== null && evaluation?.correct !== undefined ? <p className={`rounded-lg p-3 text-sm font-bold ${evaluation.correct ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{evaluation.correct ? "Correct" : "Try again"}</p> : null}
  </div>;
}

function Ordering({ question, response, onChange, disabled }: { question: NormalizedQuestion; response: string[]; onChange: (value: string[]) => void; disabled: boolean }) {
  const items = response.length ? response : question.options.map((option) => option.id);
  const move = (from: number, to: number) => { const copy = [...items]; const [item] = copy.splice(from, 1); copy.splice(to, 0, item); onChange(copy); };
  return <ol className="space-y-2">{items.map((id, index) => <li key={id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm"><span className="w-5 font-bold text-slate-400">{index + 1}</span><span className="flex-1">{question.options.find((option) => option.id === id)?.text ?? id}</span><button type="button" disabled={disabled || index === 0} onClick={() => move(index, index - 1)} className="rounded border px-2 py-1 text-xs disabled:opacity-40">Up</button><button type="button" disabled={disabled || index === items.length - 1} onClick={() => move(index, index + 1)} className="rounded border px-2 py-1 text-xs disabled:opacity-40">Down</button></li>)}</ol>;
}
