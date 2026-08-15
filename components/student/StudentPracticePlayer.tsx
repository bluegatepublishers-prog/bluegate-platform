"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Question = {
  questionId: string; questionNumber: number; questionText: string; questionType: "MCQ" | "TRUE_FALSE" | "FILL_BLANK" | "MULTIPLE_SELECT" | "SHORT_ANSWER";
  options: string[]; marks: number; answered: boolean; studentAnswer: unknown;
  feedback: { correct: boolean | null; correctAnswer: string | null; explanation: string | null } | null;
};

export default function StudentPracticePlayer({ attemptId, initialQuestions }: { attemptId: string; initialQuestions: Question[] }) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);
  const [index, setIndex] = useState(Math.max(0, initialQuestions.findIndex((item) => !item.answered)));
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const question = questions[index];
  if (!question) return <p>No practice questions are available for this chapter yet.</p>;

  async function submitAnswer() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/student/practice/${attemptId}/answer`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: question.questionId, answer }) });
      const result = await response.json() as { ok?: boolean; correct?: boolean; correctAnswer?: string; explanation?: string | null; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message);
      setQuestions((current) => current.map((item) => item.questionId === question.questionId ? { ...item, answered: true, studentAnswer: answer, feedback: { correct: result.correct === true, correctAnswer: result.correctAnswer ?? null, explanation: result.explanation ?? null } } : item));
      setAnswer("");
    } catch (error) { setMessage(error instanceof Error && error.message ? error.message : "We could not save your answer. Please try again."); }
    finally { setBusy(false); }
  }

  async function finish() {
    if (!window.confirm("Submit this completed practice? Answers cannot be changed afterwards.")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/student/practice/${attemptId}/submit`, { method: "POST" });
      const result = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message);
      router.push(`/student-dashboard/practice/${attemptId}/result`);
    } catch (error) { setMessage(error instanceof Error && error.message ? error.message : "Please answer all questions before submitting."); setBusy(false); }
  }

  const allAnswered = questions.every((item) => item.answered);
  return <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-8"><div className="flex items-center justify-between gap-4"><p className="font-bold text-blue-700">Question {index + 1} of {questions.length}</p><p className="text-sm text-slate-500">{question.marks} {question.marks === 1 ? "mark" : "marks"}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-blue-600" style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div><h1 className="mt-7 text-2xl font-bold leading-9">{question.questionText}</h1>
  {question.answered ? <Feedback question={question} /> : question.questionType === "FILL_BLANK" ? <label className="mt-6 block font-semibold">Your answer<input value={answer} onChange={(event) => setAnswer(event.target.value)} className="mt-3 min-h-12 w-full rounded-xl border px-4 focus-visible:outline-2 focus-visible:outline-blue-700" /></label> : <div role="radiogroup" aria-label="Answer options" className="mt-6 grid gap-3">{question.options.map((option) => <button key={option} type="button" role="radio" aria-checked={answer === option} onClick={() => setAnswer(option)} className={`min-h-14 rounded-2xl border p-4 text-left font-semibold focus-visible:outline-2 focus-visible:outline-blue-700 ${answer === option ? "border-blue-600 bg-blue-50 text-blue-900" : "bg-white"}`}>{option}</button>)}</div>}
  {!question.answered && <button type="button" disabled={busy || !answer.trim()} onClick={() => void submitAnswer()} className="mt-6 min-h-12 rounded-xl bg-slate-950 px-6 py-3 font-bold text-white disabled:opacity-50">Submit Answer</button>}<p aria-live="polite" className="mt-3 text-sm font-semibold text-red-700">{message}</p><div className="mt-8 flex flex-wrap justify-between gap-3"><button type="button" disabled={index === 0} onClick={() => { setIndex((value) => value - 1); setAnswer(""); setMessage(""); }} className={navClass}><ChevronLeft className="h-5 w-5" />Previous</button>{index < questions.length - 1 ? <button type="button" onClick={() => { setIndex((value) => value + 1); setAnswer(""); setMessage(""); }} className={navClass}>Next<ChevronRight className="h-5 w-5" /></button> : <button type="button" disabled={!allAnswered || busy} onClick={() => void finish()} className="min-h-12 rounded-xl bg-green-700 px-6 py-3 font-bold text-white disabled:opacity-50">Submit Practice</button>}</div></section>;
}

function Feedback({ question }: { question: Question }) { const feedback = question.feedback!; return <div className={`mt-6 rounded-2xl p-5 ${feedback.correct ? "bg-green-50 text-green-900" : "bg-amber-50 text-amber-950"}`}><p className="text-lg font-bold">{feedback.correct ? "Correct" : "Needs another look"}</p><p className="mt-3"><strong>Your answer:</strong> {String(question.studentAnswer)}</p><p className="mt-2"><strong>Correct answer:</strong> {feedback.correctAnswer}</p>{feedback.explanation && <p className="mt-3 leading-7">{feedback.explanation}</p>}</div>; }
const navClass = "inline-flex min-h-12 items-center gap-2 rounded-xl border px-5 py-3 font-bold disabled:opacity-40";
