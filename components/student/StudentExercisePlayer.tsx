"use client";

import Image from "next/image";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { AssessmentReviewStatus } from "@prisma/client";

type ExerciseQuestion = {
  responseId: string;
  questionId: string;
  questionNumber: number;
  questionType: string;
  questionText: string;
  options: { id: string; label: string }[];
  acceptedAnswers: string[];
  marks: number;
  difficulty: string;
  imageResource: {
    id: string;
    title: string;
    fileUrl: string;
    thumbnail: string | null;
    type: string;
  } | null;
  answer: unknown;
  answered: boolean;
  autoGraded: boolean;
  reviewStatus: AssessmentReviewStatus;
  marksAwarded: number | null;
  feedback: string | null;
};

export default function StudentExercisePlayer({
  attemptId,
  exerciseTitle,
  instructions,
  initialQuestions,
}: {
  attemptId: string;
  exerciseTitle: string;
  instructions: string;
  initialQuestions: ExerciseQuestion[];
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);
  const [index, setIndex] = useState(
    Math.max(0, initialQuestions.findIndex((question) => !question.answered)),
  );
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [message, setMessage] = useState("");
  const dirtyIds = useRef<Set<string>>(new Set());
  const timerRef = useRef<number | null>(null);
  const submitRef = useRef(false);

  const answeredCount = useMemo(
    () => questions.filter((question) => hasAnswer(question.answer)).length,
    [questions],
  );
  const current = questions[index];

  async function flushDraft(force: boolean) {
    const pending = questions.filter((question) => dirtyIds.current.has(question.questionId));
    if (!pending.length && !force) return true;
    setSaveState("saving");
    setMessage("");
    try {
      const response = await fetch(`/api/student/exercises/${attemptId}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses: pending.map((question) => ({
            questionId: question.questionId,
            answer: normalizeClientAnswer(question),
          })),
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        updatedQuestions?: {
          questionId: string;
          answered: boolean;
          autoGraded: boolean;
          marksAwarded: number | null;
          reviewStatus: AssessmentReviewStatus;
        }[];
      };
      if (!response.ok || result.ok === false) throw new Error(result.message);
      const updates = new Map(
        (result.updatedQuestions ?? []).map((question) => [question.questionId, question]),
      );
      dirtyIds.current.clear();
      setQuestions((currentQuestions) =>
        currentQuestions.map((question) => {
          const update = updates.get(question.questionId);
          return update
            ? {
                ...question,
                answered: update.answered,
                autoGraded: update.autoGraded,
                marksAwarded: update.marksAwarded,
                reviewStatus: update.reviewStatus,
              }
            : question;
        }),
      );
      setSaveState("saved");
      if (!submitRef.current) setMessage("Draft saved.");
      return true;
    } catch (error) {
      setSaveState("error");
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "We could not save your draft. Please try again.",
      );
      return false;
    }
  }

  const runAutosave = useEffectEvent(() => {
    void flushDraft(false);
  });

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (saveState !== "unsaved" && saveState !== "saving") return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  useEffect(() => {
    if (saveState !== "unsaved") return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      runAutosave();
    }, 900);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [questions, saveState]);

  if (!current) {
    return <p>No published questions are available for this exercise yet.</p>;
  }

  function updateAnswer(questionId: string, answer: unknown) {
    dirtyIds.current.add(questionId);
    setQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.questionId === questionId
          ? {
              ...question,
              answer,
              answered: hasAnswer(answer),
              autoGraded: false,
              reviewStatus: hasAnswer(answer)
                ? question.questionType === "MCQ" ||
                  question.questionType === "TRUE_FALSE" ||
                  question.questionType === "FILL_BLANK" ||
                  question.questionType === "VERY_SHORT"
                  ? AssessmentReviewStatus.NOT_REQUIRED
                  : AssessmentReviewStatus.PENDING
                : AssessmentReviewStatus.NOT_REQUIRED,
              marksAwarded: null,
              feedback: null,
            }
          : question,
      ),
    );
    setSaveState("unsaved");
    setMessage("");
  }

  async function submitExercise() {
    if (!window.confirm("Submit this exercise now? You will not be able to edit this attempt after submission.")) {
      return;
    }
    submitRef.current = true;
    const saved = await flushDraft(false);
    if (!saved) {
      submitRef.current = false;
      return;
    }
    setSaveState("saving");
    setMessage("");
    try {
      const response = await fetch(`/api/student/exercises/${attemptId}/submit`, {
        method: "POST",
      });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || result.ok === false) throw new Error(result.message);
      router.push(`/student-dashboard/exercises/${attemptId}/result`);
    } catch (error) {
      submitRef.current = false;
      setSaveState("error");
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "We could not submit this exercise.",
      );
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <header className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            Continuous Exercise
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">{exerciseTitle}</h1>
          {instructions ? (
            <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {instructions}
            </p>
          ) : null}
        </div>
        <div className="space-y-2 text-sm font-semibold">
          <p className="text-slate-500">
            {answeredCount} of {questions.length} answered
          </p>
          <p
            className={
              saveState === "error"
                ? "text-red-700"
                : saveState === "saving"
                  ? "text-amber-700"
                  : saveState === "unsaved"
                    ? "text-slate-500"
                    : "text-emerald-700"
            }
          >
            {saveState === "saving"
              ? "Saving..."
              : saveState === "unsaved"
                ? "Unsaved changes"
                : saveState === "error"
                  ? "Save failed"
                  : "Saved"}
          </p>
        </div>
      </header>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600"
          style={{ width: `${(answeredCount / Math.max(questions.length, 1)) * 100}%` }}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-2 rounded-3xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Question Outline
          </p>
          {questions.map((question, questionIndex) => (
            <button
              key={question.questionId}
              type="button"
              onClick={() => setIndex(questionIndex)}
              className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-semibold ${
                questionIndex === index
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              <span>Q{question.questionNumber}</span>
              <span>
                {!hasAnswer(question.answer)
                  ? "Pending"
                  : question.reviewStatus === AssessmentReviewStatus.PENDING
                    ? "Review"
                    : "Saved"}
              </span>
            </button>
          ))}
        </aside>

        <article className="rounded-[1.7rem] bg-[#fcfaf5] p-5 ring-1 ring-slate-200 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-200">
              Question {current.questionNumber} of {questions.length}
            </p>
            <p className="text-sm font-semibold text-slate-500">
              {current.questionType} · {current.marks} marks · {current.difficulty}
            </p>
          </div>

          <h2 className="mt-5 whitespace-pre-wrap text-2xl font-bold leading-9 text-slate-950">
            {current.questionText}
          </h2>

          {current.imageResource ? (
            <Image
              src={current.imageResource.thumbnail ?? current.imageResource.fileUrl}
              alt={current.imageResource.title}
              width={960}
              height={540}
              className="mt-5 max-h-72 rounded-3xl object-contain ring-1 ring-slate-200"
            />
          ) : null}

          <div className="mt-6">
            <QuestionInput question={current} onChange={(answer) => updateAnswer(current.questionId, answer)} />
          </div>

          {current.reviewStatus === AssessmentReviewStatus.PENDING ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              This question will be marked after teacher review when you submit.
            </p>
          ) : null}
          {current.feedback ? (
            <p className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <strong>Teacher feedback:</strong> {current.feedback}
            </p>
          ) : null}

          <p aria-live="polite" className="mt-4 text-sm font-semibold text-slate-600">
            {message}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((value) => value - 1)}
              className={navClass}
            >
              <ChevronLeft className="h-5 w-5" />
              Previous
            </button>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void flushDraft(true)}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </button>
              {index < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setIndex((value) => value + 1)}
                  className={navClass}
                >
                  Next
                  <ChevronRight className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={answeredCount !== questions.length || saveState === "saving"}
                  onClick={() => void submitExercise()}
                  className="min-h-12 rounded-xl bg-emerald-700 px-6 py-3 font-bold text-white disabled:opacity-50"
                >
                  Submit Exercise
                </button>
              )}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function QuestionInput({
  question,
  onChange,
}: {
  question: ExerciseQuestion;
  onChange: (answer: unknown) => void;
}) {
  if (question.questionType === "MCQ") {
    return (
      <div className="grid gap-3">
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded-2xl border px-4 py-4 text-left font-semibold ${
              question.answer === option.id
                ? "border-blue-600 bg-blue-50 text-blue-900"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <span className="mr-2 text-slate-400">{option.id}.</span>
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  if (question.questionType === "TRUE_FALSE") {
    const selected = typeof question.answer === "boolean" ? question.answer : null;
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[true, false].map((value) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => onChange(value)}
            className={`rounded-2xl border px-4 py-4 text-left font-semibold ${
              selected === value
                ? "border-blue-600 bg-blue-50 text-blue-900"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {value ? "True" : "False"}
          </button>
        ))}
      </div>
    );
  }

  const isSingleLine =
    question.questionType === "FILL_BLANK" || question.questionType === "VERY_SHORT";
  const value = typeof question.answer === "string" ? question.answer : "";
  return isSingleLine ? (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Type your answer"
      className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
    />
  ) : (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Write your answer"
      rows={8}
      className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-4 text-base leading-7 text-slate-900"
    />
  );
}

function hasAnswer(value: unknown) {
  if (typeof value === "boolean") return true;
  if (typeof value === "string") return value.trim().length > 0;
  return false;
}

function normalizeClientAnswer(question: ExerciseQuestion) {
  if (!hasAnswer(question.answer)) return null;
  return question.answer;
}

const navClass =
  "inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 disabled:opacity-40";
