"use client";

import { useState } from "react";
import { BookOpen, LoaderCircle, Send, Sparkles } from "lucide-react";

type Intent =
  | "EXPLAIN_CONCEPT"
  | "SIMPLIFY_TOPIC"
  | "REAL_LIFE_EXAMPLE"
  | "REVISION_SUMMARY"
  | "VOCABULARY_HELP"
  | "ASK_ME_QUESTIONS"
  | "DOUBT_SOLVER"
  | "EXPLAIN_IN_HINDI";

type Mode = {
  intent: string;
  label: string;
  description: string;
  freeTextAllowed: boolean;
  maxInputLength: number;
  scope: "SELECTION" | "KEYWORD" | "CHAPTER" | "DOUBT";
};

type HistoryMessage = {
  id: string;
  intent: string;
  mode: string;
  question: string;
  answer: string;
  refused: boolean;
  createdAt: string;
};

type InitialData = {
  bookTitle: string;
  chapterTitle: string;
  chapterNumber: number;
  planLabel: string;
  quota: {
    limit: number;
    used: number;
    remaining: number;
    resetAt: string;
    timezone: string;
  };
  modes: Mode[];
  selections: string[];
  keywords: string[];
  history: HistoryMessage[];
};

export default function StudentLearningAssistant({
  bookId,
  chapterId,
  initialData,
}: {
  bookId: string;
  chapterId: string;
  initialData: InitialData;
}) {
  const [selectedIntent, setSelectedIntent] = useState<Intent | null>(null);
  const [reference, setReference] = useState("");
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState(initialData.history);
  const [remaining, setRemaining] = useState(initialData.quota.remaining);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedMode = initialData.modes.find(
    (mode) => mode.intent === selectedIntent,
  );

  function chooseMode(intent: Intent) {
    setSelectedIntent(intent);
    setReference("");
    setQuestion("");
    setFollowUps([]);
    setError("");
  }

  async function submit() {
    if (!selectedMode || remaining < 1) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/student/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          chapterId,
          intent: selectedMode.intent,
          requestId: crypto.randomUUID(),
          ...(selectedMode.scope === "DOUBT" ? { question } : {}),
          ...(selectedMode.scope === "SELECTION" || selectedMode.scope === "KEYWORD"
            ? { reference }
            : {}),
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: HistoryMessage | string;
        followUpPrompts?: string[];
        remaining?: number;
      };
      if (!response.ok || !result.ok || typeof result.message === "string") {
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "The learning assistant is temporarily unavailable. Please try again.",
        );
      }
      setHistory((current) => [...current, result.message as HistoryMessage]);
      setFollowUps(result.followUpPrompts ?? []);
      setRemaining(result.remaining ?? remaining);
      setQuestion("");
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "The learning assistant is temporarily unavailable. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const options = selectedMode?.scope === "KEYWORD"
    ? initialData.keywords
    : initialData.selections;
  const ready = selectedMode
    ? selectedMode.scope === "DOUBT"
      ? Boolean(question.trim()) && question.length <= selectedMode.maxInputLength
      : selectedMode.scope === "CHAPTER"
        ? true
        : Boolean(reference)
    : false;

  return (
    <>
      <header className="rounded-3xl bg-gradient-to-br from-blue-800 to-indigo-800 p-7 text-white shadow-xl sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-200">
              Bluegate Learning Assistant
            </p>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              {initialData.chapterTitle}
            </h1>
            <p className="mt-3 text-blue-100">
              {initialData.bookTitle} &middot; Chapter {initialData.chapterNumber}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-5 py-4 text-right">
            <p className="text-sm font-semibold text-blue-100">{initialData.planLabel}</p>
            <p className="mt-1 text-2xl font-bold">{remaining} remaining today</p>
          </div>
        </div>
        <p className="mt-6 max-w-3xl leading-7 text-blue-100">
          Choose a learning tool. Answers stay within this approved chapter.
        </p>
      </header>

      <section aria-labelledby="learning-tools-heading">
        <h2 id="learning-tools-heading" className="text-2xl font-bold">
          How can I help you learn?
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {initialData.modes.map((mode) => (
            <button
              key={mode.intent}
              type="button"
              onClick={() => chooseMode(mode.intent as Intent)}
              aria-pressed={selectedIntent === mode.intent}
              className={`min-h-44 rounded-3xl border p-6 text-left shadow-sm transition focus-visible:outline-2 focus-visible:outline-blue-700 ${
                selectedIntent === mode.intent
                  ? "border-blue-600 bg-blue-50 text-blue-950"
                  : "bg-white hover:border-blue-300"
              }`}
            >
              <Sparkles className="h-7 w-7 text-blue-700" aria-hidden="true" />
              <span className="mt-5 block text-lg font-bold">{mode.label}</span>
              <span className="mt-2 block text-sm leading-6 text-slate-600">
                {mode.description}
              </span>
            </button>
          ))}
        </div>
      </section>

      {selectedMode && (
        <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-blue-700" aria-hidden="true" />
            <h2 className="text-2xl font-bold">{selectedMode.label}</h2>
          </div>
          <p className="mt-2 text-slate-600">{selectedMode.description}</p>

          {(selectedMode.scope === "SELECTION" || selectedMode.scope === "KEYWORD") && (
            <label className="mt-6 block font-semibold">
              Choose from this chapter
              <select
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                className="mt-3 min-h-12 w-full rounded-xl border bg-white px-4 focus-visible:outline-2 focus-visible:outline-blue-700"
              >
                <option value="">Select an approved topic</option>
                {options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          )}

          {selectedMode.scope === "DOUBT" && (
            <label className="mt-6 block font-semibold">
              What is your doubt about this chapter?
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={selectedMode.maxInputLength}
                rows={5}
                placeholder="Ask a short question about this chapter only."
                className="mt-3 w-full rounded-xl border p-4 leading-7 focus-visible:outline-2 focus-visible:outline-blue-700"
              />
              <span className="mt-2 block text-right text-sm font-normal text-slate-500">
                {question.length} / {selectedMode.maxInputLength}
              </span>
            </label>
          )}

          <button
            type="button"
            disabled={!ready || busy || remaining < 1}
            onClick={() => void submit()}
            className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-blue-700 px-6 py-3 font-bold text-white disabled:opacity-50"
          >
            {busy ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
            {busy ? "Thinking…" : "Help Me Learn"}
          </button>
          {remaining < 1 && (
            <p className="mt-4 rounded-xl bg-amber-50 p-4 font-semibold text-amber-900">
              You have reached today’s Learning Assistant limit.
            </p>
          )}
          <p aria-live="polite" className="mt-4 font-semibold text-red-700">
            {error}
          </p>
        </section>
      )}

      {followUps.length > 0 && (
        <aside className="rounded-3xl border bg-blue-50 p-6">
          <h2 className="font-bold text-blue-950">You could explore next</h2>
          <ul className="mt-3 space-y-2 text-blue-900">
            {followUps.map((prompt) => <li key={prompt}>&bull; {prompt}</li>)}
          </ul>
        </aside>
      )}

      <section aria-labelledby="chapter-history-heading" className="space-y-4">
        <div>
          <h2 id="chapter-history-heading" className="text-2xl font-bold">
            This chapter’s conversation
          </h2>
          <p className="mt-2 text-slate-600">
            History is private to your account and does not continue into another chapter.
          </p>
        </div>
        {history.length ? history.map((message) => (
          <article key={message.id} className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold text-blue-700">{message.mode}</p>
              <time className="text-sm text-slate-500" dateTime={message.createdAt}>
                {new Date(message.createdAt).toLocaleString("en-IN")}
              </time>
            </div>
            <p className="mt-4 font-semibold text-slate-900">{message.question}</p>
            <div className={`mt-4 whitespace-pre-wrap rounded-2xl p-5 leading-7 ${message.refused ? "bg-amber-50 text-amber-950" : "bg-slate-50 text-slate-700"}`}>
              {message.answer}
            </div>
          </article>
        )) : (
          <p className="rounded-3xl border border-dashed bg-slate-50 p-8 text-center text-slate-500">
            Choose a learning tool above to begin this chapter’s guided conversation.
          </p>
        )}
      </section>
    </>
  );
}
