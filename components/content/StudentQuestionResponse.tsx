"use client";

import { useMemo, useState } from "react";
import type { StudentWorkTargetInput } from "@/lib/student-work-policy";
import { payloadOptionIds, payloadText } from "@/lib/student-work-client";
import { useStudentWork } from "@/components/content/StudentWorkProvider";
export type StudentQuestion = { id: string; type: string; prompt: string; instructions?: string; options?: Array<{ id: string; text: string }> };


export default function StudentQuestionResponse({ question, target }: { question: StudentQuestion; target: StudentWorkTargetInput }) {
  const { getWork } = useStudentWork();
  const current = getWork("ANSWER", target);
  return <StudentQuestionEditor key={`${current?.id ?? "empty"}:${current?.revision ?? 0}`} question={question} target={target} />;
}

function StudentQuestionEditor({ question, target }: { question: StudentQuestion; target: StudentWorkTargetInput }) {
  const { getWork, getState, save, remove, reload } = useStudentWork();
  const current = getWork("ANSWER", target);
  const state = getState("ANSWER", target);
  const initialValue = useMemo(() => payloadText(current?.payload), [current?.payload]);
  const initialOptions = useMemo(() => payloadOptionIds(current?.payload), [current?.payload]);
  const [value, setValue] = useState(initialValue);
  const [selectedOption, setSelectedOption] = useState(initialOptions[0] ?? "");
  const stale = current?.status === "STALE";
  const saveText = () => {
    if (!value.trim()) {
      if (current && !current.id.startsWith("local-")) void remove(current);
      return;
    }
    void save({ type: "ANSWER", target, payload: { value, status: "DRAFT" } });
  };
  const saveOption = (optionId: string) => {
    setSelectedOption(optionId);
    void save({ type: "ANSWER", target, payload: { optionIds: [optionId], status: "DRAFT" } });
  };
  const clear = () => {
    setValue("");
    setSelectedOption("");
    if (current && !current.id.startsWith("local-")) void remove(current);
  };
  const normalizedType = question.type.toLowerCase();
  const isChoice = ["mcq", "truefalse", "true_false"].includes(normalizedType);
  const isText = ["fillblank", "fill_blank", "oneword", "veryshort", "short", "long", "custom", "observation", "result", "reflection"].includes(normalizedType);
  const isLong = ["long", "custom"].includes(normalizedType);
  const options = question.options ?? (normalizedType.includes("true") ? [{ id: "true", text: "True" }, { id: "false", text: "False" }] : []);
  const stateLabel = state === "SAVING" ? "Saving…" : state === "SAVED" ? "Saved" : state === "NOT_SAVED" ? "Not saved · Retry" : state === "CONFLICT" ? "Conflict" : "";
  if (!isChoice && !isText) return <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-500" data-student-question-id={question.id}>This question type is read-only for now.</div>
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/90 p-2 text-left" data-student-question-id={question.id}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Your answer</p>
      {isChoice ? <div className="mt-1 space-y-1">{options.map((option) => <label key={option.id} className="flex items-center gap-2 text-xs text-slate-700"><input type="radio" name={`student-answer-${question.id}`} value={option.id} checked={selectedOption === option.id} onChange={() => saveOption(option.id)} /><span>{option.text}</span></label>)}</div> : <textarea aria-label={`Your answer to ${question.prompt}`} value={value} onChange={(event) => setValue(event.target.value)} rows={isLong ? 3 : 1} maxLength={20000} className="mt-1 w-full resize-y rounded border border-blue-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-300" placeholder="Type your answer" />}
      {stale ? <p className="mt-1 text-[11px] font-semibold text-amber-700">Question changed since you answered.</p> : null}
      {stateLabel ? <p aria-live="polite" className={`mt-1 text-[11px] font-semibold ${state === "NOT_SAVED" || state === "CONFLICT" ? "text-rose-700" : "text-slate-500"}`}>{stateLabel}{state === "CONFLICT" ? " · This answer was changed in another tab or device." : ""}</p> : null}{state === "CONFLICT" ? <button type="button" onClick={() => void reload()} className="mt-1 text-[11px] font-semibold text-rose-700 underline">Reload saved version</button> : null}
      <div className="mt-1 flex items-center justify-between gap-2">{!isChoice ? <button type="button" onClick={saveText} className="rounded bg-blue-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-blue-700">Save answer</button> : state === "NOT_SAVED" && selectedOption ? <button type="button" onClick={() => saveOption(selectedOption)} className="rounded bg-blue-600 px-2 py-1 text-[11px] font-bold text-white">Retry</button> : <span />}{(value || selectedOption) ? <button type="button" onClick={clear} className="text-[11px] font-semibold text-slate-500 hover:text-slate-800">Clear</button> : null}</div>
    </div>
  );
}
