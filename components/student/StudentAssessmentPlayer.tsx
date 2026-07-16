"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock3 } from "lucide-react";

type Question = {
  assessmentQuestionId: string;
  questionNumber: number;
  questionType: "MCQ" | "TRUE_FALSE" | "FILL_BLANK" | "MATCH" | "MULTIPLE_SELECT" | "SHORT_ANSWER" | "LONG_ANSWER" | "CASE_BASED" | "COMPETENCY" | "HOTS";
  questionText: string;
  options: string[] | { left: string[]; right: string[] };
  marks: number;
  subjective: boolean;
  answer: unknown;
  savedAt: string | null;
};

export default function StudentAssessmentPlayer({ attempt }: { attempt: { id: string; title: string; expiresAt: string | null; serverNow: string; questions: Question[] } }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => Object.fromEntries(attempt.questions.map((question) => [question.assessmentQuestionId, question.answer])));
  const [dirtyId, setDirtyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const initialRemaining = attempt.expiresAt ? Math.max(0, new Date(attempt.expiresAt).getTime() - new Date(attempt.serverNow).getTime()) : null;
  const [remainingMs, setRemainingMs] = useState<number | null>(initialRemaining);
  const question = attempt.questions[index];
  const answeredCount = useMemo(() => attempt.questions.filter((item) => !emptyAnswer(answers[item.assessmentQuestionId])).length, [answers, attempt.questions]);

  const saveAnswer = useCallback(async (id: string) => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/student/assessment-attempts/${attempt.id}/responses`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentQuestionId: id, answer: answers[id] }),
      });
      const result = await response.json() as { ok?: boolean; message?: string; code?: string };
      if (!response.ok || !result.ok) {
        if (result.code === "TIME_EXPIRED") {
          router.push(`/student-dashboard/assessment-attempts/${attempt.id}/result`);
          return;
        }
        throw new Error(result.message);
      }
      setDirtyId((current) => current === id ? null : current);
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : "We could not save your answer. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [answers, attempt.id, router]);

  function setAnswer(answer: unknown) {
    setAnswers((current) => ({ ...current, [question.assessmentQuestionId]: answer }));
    setDirtyId(question.assessmentQuestionId);
  }

  const finish = useCallback(async (automatic = false) => {
    if (!automatic && !window.confirm(`Submit this assessment? ${attempt.questions.length - answeredCount} unanswered question(s) will be marked skipped.`)) return;
    if (dirtyId) await saveAnswer(dirtyId);
    setSaving(true);
    try {
      const response = await fetch(`/api/student/assessment-attempts/${attempt.id}/submit`, { method: "POST" });
      const result = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message);
      router.push(`/student-dashboard/assessment-attempts/${attempt.id}/result`);
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : "We could not submit this assessment. Please try again.");
      setSaving(false);
    }
  }, [answeredCount, attempt.id, attempt.questions.length, dirtyId, router, saveAnswer]);

  useEffect(() => {
    if (initialRemaining === null) return;
    const started = Date.now();
    const interval = window.setInterval(() => setRemainingMs(Math.max(0, initialRemaining - (Date.now() - started))), 1000);
    return () => window.clearInterval(interval);
  }, [initialRemaining]);

  useEffect(() => {
    if (!dirtyId) return;
    const timer = window.setTimeout(() => void saveAnswer(dirtyId), 700);
    return () => window.clearTimeout(timer);
  }, [dirtyId, saveAnswer]);

  useEffect(() => {
    if (remainingMs !== 0) return;
    const timer = window.setTimeout(() => void finish(true), 0);
    return () => window.clearTimeout(timer);
  }, [finish, remainingMs]);

  if (!question) return <p>This assessment has no available questions.</p>;
  return <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold text-indigo-700">Question {index + 1} of {attempt.questions.length}</p><div className="flex items-center gap-4 text-sm font-semibold text-slate-600"><span>{question.marks} {question.marks === 1 ? "mark" : "marks"}</span>{remainingMs !== null && <span className={remainingMs < 300_000 ? "inline-flex items-center gap-2 text-red-700" : "inline-flex items-center gap-2"}><Clock3 className="h-4 w-4" />{formatRemaining(remainingMs)}</span>}</div></div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-indigo-600" style={{ width: `${((index + 1) / attempt.questions.length) * 100}%` }} /></div>
    <h1 className="mt-7 text-2xl font-bold leading-9">{question.questionText}</h1>
    <div className="mt-6"><AnswerControl question={question} value={answers[question.assessmentQuestionId]} onChange={setAnswer} /></div>
    <div className="mt-5 flex items-center justify-between gap-4 text-sm"><p aria-live="polite" className={message ? "font-semibold text-red-700" : "text-slate-500"}>{message || (saving ? "Saving…" : dirtyId ? "Waiting to save…" : "Answer saved")}</p><p className="font-semibold text-slate-500">{answeredCount}/{attempt.questions.length} answered</p></div>
    <div className="mt-8 flex flex-wrap justify-between gap-3"><button type="button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)} className={navClass}><ChevronLeft className="h-5 w-5" />Previous</button>{index < attempt.questions.length - 1 ? <button type="button" onClick={() => setIndex((value) => value + 1)} className={navClass}>Next<ChevronRight className="h-5 w-5" /></button> : <button type="button" disabled={saving} onClick={() => void finish(false)} className="min-h-12 rounded-xl bg-green-700 px-6 py-3 font-bold text-white disabled:opacity-50">Submit Assessment</button>}</div>
  </section>;
}

function AnswerControl({ question, value, onChange }: { question: Question; value: unknown; onChange: (value: unknown) => void }) {
  if (question.questionType === "MCQ" || question.questionType === "TRUE_FALSE") {
    const options = question.options as string[];
    return <div role="radiogroup" aria-label="Answer options" className="grid gap-3">{options.map((option) => <button key={option} type="button" role="radio" aria-checked={value === option} onClick={() => onChange(option)} className={`${optionClass} ${value === option ? selectedClass : "bg-white"}`}>{option}</button>)}</div>;
  }
  if (question.questionType === "MULTIPLE_SELECT") {
    const selected = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    return <fieldset><legend className="mb-3 font-semibold text-slate-600">Select all that apply</legend><div className="grid gap-3">{(question.options as string[]).map((option) => <label key={option} className={`${optionClass} flex cursor-pointer items-center gap-3 ${selected.includes(option) ? selectedClass : "bg-white"}`}><input type="checkbox" checked={selected.includes(option)} onChange={() => onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option])} className="h-5 w-5" />{option}</label>)}</div></fieldset>;
  }
  if (question.questionType === "MATCH") {
    const options = question.options as { left: string[]; right: string[] };
    const current = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, string> : {};
    return <fieldset><legend className="mb-3 font-semibold text-slate-600">Match each item</legend><div className="grid gap-4">{options.left.map((left) => <label key={left} className="grid gap-2 rounded-2xl border p-4 sm:grid-cols-2 sm:items-center"><span className="font-semibold">{left}</span><select value={current[left] ?? ""} onChange={(event) => onChange({ ...current, [left]: event.target.value })} className="min-h-12 rounded-xl border px-4"><option value="">Choose a match</option>{options.right.map((right) => <option key={right}>{right}</option>)}</select></label>)}</div></fieldset>;
  }
  const long = ["LONG_ANSWER", "CASE_BASED", "COMPETENCY", "HOTS"].includes(question.questionType);
  return <label className="block font-semibold text-slate-700">Your answer{long ? <textarea value={typeof value === "string" ? value : ""} maxLength={5000} rows={8} onChange={(event) => onChange(event.target.value)} className="mt-3 w-full rounded-xl border px-4 py-3 leading-7 focus-visible:outline-2 focus-visible:outline-indigo-700" /> : <input value={typeof value === "string" ? value : ""} maxLength={2000} onChange={(event) => onChange(event.target.value)} className="mt-3 min-h-12 w-full rounded-xl border px-4 focus-visible:outline-2 focus-visible:outline-indigo-700" />}</label>;
}

function emptyAnswer(value: unknown) { return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0) || (typeof value === "object" && value !== null && Object.keys(value).length === 0); }
function formatRemaining(ms: number) { const seconds = Math.ceil(ms / 1000); const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); const rest = seconds % 60; return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}` : `${minutes}:${String(rest).padStart(2, "0")}`; }
const navClass = "inline-flex min-h-12 items-center gap-2 rounded-xl border px-5 py-3 font-bold disabled:opacity-40";
const optionClass = "min-h-14 rounded-2xl border p-4 text-left font-semibold focus-visible:outline-2 focus-visible:outline-indigo-700";
const selectedClass = "border-indigo-600 bg-indigo-50 text-indigo-950";
