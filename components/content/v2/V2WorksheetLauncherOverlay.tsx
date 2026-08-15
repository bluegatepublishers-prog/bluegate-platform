"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { InteractiveQuestionRenderer } from "@/components/questions/InteractiveQuestionRenderer";
import {
  getBookQuestionPracticeMode,
  type InteractiveQuestion,
  type NormalizedQuestion,
} from "@/lib/normalized-question";
import { evaluateObjectiveQuestionResponse } from "@/lib/question-response-evaluator";

export type V2WorksheetLauncherOverlayMode = "PREVIEW" | "STUDENT";

type Feedback = {
  correct: boolean | null;
  correctAnswer: string | null;
  explanation: string | null;
  marksAwarded: number | null;
};

type RuntimeQuestion = {
  questionId: string;
  position: number;
  questionNumber: number;
  marks: number;
  interactiveQuestion: InteractiveQuestion;
  previewQuestion?: NormalizedQuestion;
  response: unknown;
  feedback: Feedback | null;
};

type Worksheet = {
  id: string;
  title: string;
  instructions: string | null;
  showAnswersAfterSubmit: boolean;
};

type Attempt = {
  id: string;
  status: "IN_PROGRESS" | "SUBMITTED";
  questionCount: number;
  totalMarks: number;
  marksAwarded: number | null;
  percentage: number | null;
  worksheet: Worksheet;
  questions: RuntimeQuestion[];
};

export default function V2WorksheetLauncherOverlay({
  worksheetId,
  mode,
  onClose,
}: {
  worksheetId: string;
  mode: V2WorksheetLauncherOverlayMode;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [questions, setQuestions] = useState<RuntimeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [previewSubmitted, setPreviewSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submitted = mode === "PREVIEW"
    ? previewSubmitted
    : attempt?.status === "SUBMITTED";
  const feedbackVisible = mode === "PREVIEW" || worksheet?.showAnswersAfterSubmit === true;

  useEffect(() => {
    const previousOverflow = globalThis.document.body.style.overflow;
    globalThis.document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    globalThis.document.addEventListener("keydown", onKeyDown);
    return () => {
      globalThis.document.removeEventListener("keydown", onKeyDown);
      globalThis.document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const request = mode === "PREVIEW"
      ? fetch(`/api/admin/worksheets/${encodeURIComponent(worksheetId)}/launcher-preview`, { cache: "no-store" })
      : fetch("/api/student/worksheets/launcher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ worksheetId }),
        });

    void request
      .then(async (response) => {
        const body = await response.json() as {
          ok?: boolean;
          message?: string;
          worksheet?: Worksheet;
          questions?: RuntimeQuestion[];
          attempt?: Attempt;
        };
        if (!response.ok || !body.ok) {
          throw new Error(body.message ?? "This worksheet is unavailable.");
        }

        const loadedAttempt = mode === "STUDENT" ? body.attempt ?? null : null;
        const loadedWorksheet = mode === "STUDENT"
          ? loadedAttempt?.worksheet ?? null
          : body.worksheet ?? null;
        const loadedQuestions = mode === "STUDENT"
          ? loadedAttempt?.questions ?? []
          : body.questions ?? [];
        if (!loadedWorksheet || !loadedQuestions.length) {
          throw new Error("This worksheet has no questions available yet.");
        }

        if (!cancelled) {
          setAttempt(loadedAttempt);
          setWorksheet(loadedWorksheet);
          setQuestions(loadedQuestions);
          setAnswers(Object.fromEntries(loadedQuestions.map((question) => [question.questionId, question.response ?? null])));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "This worksheet is unavailable.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, worksheetId]);

  function hasAnswer(question: RuntimeQuestion) {
    const value = answers[question.questionId];
    if (typeof value === "string") return Boolean(value.trim());
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined;
  }

  function applyAttempt(nextAttempt: Attempt) {
    setAttempt(nextAttempt);
    setWorksheet(nextAttempt.worksheet);
    setQuestions(nextAttempt.questions);
    setAnswers(Object.fromEntries(nextAttempt.questions.map((question) => [question.questionId, question.response ?? null])));
  }

  async function submit() {
    if (busy || submitted || questions.some((question) => !hasAnswer(question))) return;
    setBusy(true);
    setMessage("");

    try {
      if (mode === "PREVIEW") {
        setQuestions((current) => current.map((question) => ({
          ...question,
          response: answers[question.questionId],
          feedback: previewFeedback(question, answers[question.questionId]),
        })));
        setPreviewSubmitted(true);
        return;
      }

      if (!attempt) throw new Error("This worksheet is unavailable.");
      for (const question of questions) {
        const response = await fetch(
          `/api/student/worksheets/${encodeURIComponent(attempt.id)}/response`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionId: question.questionId,
              response: answers[question.questionId],
            }),
          },
        );
        const body = await response.json() as { ok?: boolean; message?: string; attempt?: Attempt };
        if (!response.ok || !body.ok) {
          throw new Error(body.message ?? "We could not save your responses.");
        }
      }

      const response = await fetch(
        `/api/student/worksheets/${encodeURIComponent(attempt.id)}/submit`,
        { method: "POST" },
      );
      const body = await response.json() as { ok?: boolean; message?: string; attempt?: Attempt };
      if (!response.ok || !body.ok || !body.attempt) {
        throw new Error(body.message ?? "We could not submit this worksheet.");
      }
      applyAttempt(body.attempt);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not submit this worksheet.");
    } finally {
      setBusy(false);
    }
  }

  if (typeof globalThis.document === "undefined") return null;

  return createPortal(
    <div
      data-v2-worksheet-launcher-overlay
      role="presentation"
      className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700">{mode === "PREVIEW" ? "Publisher Preview" : "Worksheet"}</p>
            <h2 id={titleId} className="text-lg font-bold text-slate-950">{worksheet?.title ?? "WORKSHEET"}</h2>
            <p className="text-xs text-slate-500">{questions.length ? `${questions.length} question${questions.length === 1 ? "" : "s"} · answer all, then submit once.` : "Answer all questions, then submit once."}</p>
          </div>
          <button ref={closeRef} type="button" aria-label="Close worksheet" onClick={onClose} className="rounded-lg px-3 py-1 text-xl font-bold leading-none text-slate-600 hover:bg-slate-200">×</button>
        </header>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
          {loading ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Loading worksheet…</p> : message ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{message}</p> : <>
            {worksheet?.instructions ? <p className="rounded-xl bg-violet-50 p-4 text-sm leading-6 text-violet-950">{worksheet.instructions}</p> : null}
            {submitted && !feedbackVisible ? <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-900">Worksheet submitted</p> : null}
            {questions.map((question) => (
              <article key={question.questionId} className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-500">Question {question.questionNumber} · {question.marks} mark{question.marks === 1 ? "" : "s"}</p>
                <div className="mt-2">
                  <InteractiveQuestionRenderer
                    question={question.interactiveQuestion}
                    response={answers[question.questionId] ?? ""}
                    onChange={(value) => setAnswers((current) => ({ ...current, [question.questionId]: value }))}
                    disabled={Boolean(submitted)}
                  />
                </div>
                {question.feedback && (mode === "PREVIEW" || (submitted && feedbackVisible)) ? <FeedbackCard feedback={question.feedback} /> : null}
              </article>
            ))}

            {submitted && attempt ? <Summary attempt={attempt} /> : null}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-500">{questions.length} question{questions.length === 1 ? "" : "s"}</span>
              {!submitted ? <button type="button" disabled={busy || questions.some((question) => !hasAnswer(question))} onClick={() => void submit()} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{busy ? "Submitting…" : "Submit"}</button> : null}
            </div>
          </>}
        </div>
      </section>
    </div>,
    globalThis.document.body,
  );
}

function previewFeedback(question: RuntimeQuestion, response: unknown): Feedback {
  const mode = getBookQuestionPracticeMode(question.interactiveQuestion.questionType);
  if (mode === "MANUAL_RESPONSE") {
    return { correct: null, correctAnswer: null, explanation: null, marksAwarded: null };
  }
  const previewQuestion = question.previewQuestion;
  if (!previewQuestion) {
    return { correct: null, correctAnswer: null, explanation: null, marksAwarded: null };
  }
  const evaluation = evaluateObjectiveQuestionResponse(previewQuestion, response);
  return {
    correct: evaluation.correct,
    correctAnswer: formatCorrectAnswer(previewQuestion),
    explanation: previewQuestion.explanation ?? null,
    marksAwarded: evaluation.correct === true ? question.marks : 0,
  };
}

function FeedbackCard({ feedback }: { feedback: Feedback }) {
  const manual = feedback.correct === null;
  return <div className={`mt-4 rounded-xl p-3 text-sm ${manual ? "bg-slate-50 text-slate-900" : feedback.correct ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
    <p className="font-bold">{manual ? "Response recorded" : feedback.correct ? "Correct" : "Incorrect"}</p>
    {!manual && !feedback.correct && feedback.correctAnswer ? <p className="mt-1">Correct answer: {feedback.correctAnswer}</p> : null}
    {feedback.explanation ? <p className="mt-2 leading-6">{feedback.explanation}</p> : null}
  </div>;
}

function Summary({ attempt }: { attempt: Attempt }) {
  return <div data-v2-worksheet-summary className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
    <p className="font-bold text-slate-900">Worksheet submitted</p>
    <p className="mt-1">{attempt.questionCount} question{attempt.questionCount === 1 ? "" : "s"} · {attempt.totalMarks} total marks</p>
    {attempt.marksAwarded !== null ? <p>Marks awarded: {attempt.marksAwarded}</p> : null}
    {attempt.percentage !== null ? <p>Percentage: {attempt.percentage}%</p> : null}
  </div>;
}

function formatCorrectAnswer(question: NormalizedQuestion) {
  if (question.questionType === "TRUE_FALSE") {
    return question.answer.correctBoolean === undefined ? null : question.answer.correctBoolean ? "True" : "False";
  }
  if (question.answer.correctOptionIds?.length) {
    return question.answer.correctOptionIds
      .map((id) => question.options.find((option) => option.id === id)?.text ?? id)
      .join(", ");
  }
  return question.answer.acceptedAnswers?.join(" / ") ?? null;
}
