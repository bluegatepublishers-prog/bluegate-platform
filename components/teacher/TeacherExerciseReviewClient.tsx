"use client";

import { useState } from "react";

type ReviewResponse = {
  responseId: string;
  questionNumber: number;
  questionType: string;
  questionText: string;
  studentAnswer: unknown;
  marksAwarded: number | null;
  totalMarks: number;
  reviewStatus: string;
  feedback: string | null;
  canReview: boolean;
};

export default function TeacherExerciseReviewClient({
  sectionId,
  attemptId,
  responses,
}: {
  sectionId: string;
  attemptId: string;
  responses: ReviewResponse[];
}) {
  const [items, setItems] = useState(responses);
  const [message, setMessage] = useState("");

  async function save(responseId: string, marksAwarded: number, feedback: string) {
    setMessage("");
    const response = await fetch(`/api/teacher/exercises/${attemptId}/responses/${responseId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, marksAwarded, feedback }),
    });
    const result = (await response.json()) as { ok?: boolean; message?: string };
    if (!response.ok || result.ok === false) {
      setMessage(result.message ?? "We could not save this review.");
      return;
    }
    setItems((current) =>
      current.map((item) =>
        item.responseId === responseId
          ? { ...item, marksAwarded, feedback, reviewStatus: "REVIEWED", canReview: false }
          : item,
      ),
    );
    setMessage("Review saved.");
  }

  return (
    <div className="space-y-4">
      <p aria-live="polite" className="text-sm font-semibold text-slate-600">
        {message}
      </p>
      {items.map((item) => (
        <ReviewCard key={item.responseId} item={item} onSave={save} />
      ))}
    </div>
  );
}

function ReviewCard({
  item,
  onSave,
}: {
  item: ReviewResponse;
  onSave: (responseId: string, marksAwarded: number, feedback: string) => Promise<void>;
}) {
  const [marks, setMarks] = useState(String(item.marksAwarded ?? ""));
  const [feedback, setFeedback] = useState(item.feedback ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        Q{item.questionNumber} · {item.questionType}
      </p>
      <h3 className="mt-2 text-lg font-bold text-slate-950">{item.questionText}</h3>
      <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <strong>Student answer:</strong> {String(item.studentAnswer ?? "")}
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-end">
        <label className="text-sm font-semibold text-slate-700">
          Marks
          <input
            disabled={!item.canReview || busy}
            type="number"
            min="0"
            max={item.totalMarks}
            value={marks}
            onChange={(event) => setMarks(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Feedback
          <textarea
            disabled={!item.canReview || busy}
            rows={3}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="button"
          disabled={!item.canReview || busy}
          onClick={async () => {
            setBusy(true);
            await onSave(item.responseId, Number(marks || 0), feedback);
            setBusy(false);
          }}
          className="min-h-11 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-50"
        >
          {item.canReview ? (busy ? "Saving..." : "Save Review") : "Reviewed"}
        </button>
      </div>
    </article>
  );
}
