"use client";

import { useEffect, useState } from "react";

type AssessmentChoice = {
  id: string;
  kind: string;
  label: string;
  scope: string;
  questionCount: number;
  totalMarks: number;
  deliveryMode: "INTERACTIVE" | "PRINT" | "BOTH";
};

export default function V2PublisherAssessmentLauncherAuthoring({
  bookId,
  onInsert,
  onClose,
}: {
  bookId?: string;
  onInsert: (assessment: AssessmentChoice) => void;
  onClose: () => void;
}) {
  const [assessments, setAssessments] = useState<AssessmentChoice[]>([]);
  const [loading, setLoading] = useState(Boolean(bookId));
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    void fetch(`/api/admin/books/${encodeURIComponent(bookId)}/assessment-launcher`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as { ok?: boolean; message?: string; assessments?: AssessmentChoice[] };
        if (!response.ok || !body.ok) throw new Error(body.message ?? "Assessments are unavailable.");
        if (!cancelled) setAssessments(body.assessments ?? []);
      })
      .catch((error) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Assessments are unavailable.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [bookId]);

  return (
    <div data-v2-publisher-assessment-picker className="space-y-2">
      <p className="text-xs text-slate-500">Choose a published publisher assessment for this page.</p>
      {loading ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Loading assessments...</p> : null}
      {!loading && !bookId ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Save this book before inserting an assessment launcher.</p> : null}
      {!loading && message ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{message}</p> : null}
      {!loading && !message && assessments.length ? (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {assessments.map((assessment) => (
            <button key={assessment.id} type="button" onClick={() => onInsert(assessment)} className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-violet-300 hover:bg-violet-50">
              <span className="block font-bold text-slate-900">{assessment.label}</span>
              <span className="mt-1 block text-xs text-slate-500">{assessment.scope}</span>
              <span className="mt-1 block text-xs font-semibold text-slate-600">{assessment.questionCount} question{assessment.questionCount === 1 ? "" : "s"} · {assessment.totalMarks} mark{assessment.totalMarks === 1 ? "" : "s"} · {assessment.deliveryMode}</span>
            </button>
          ))}
        </div>
      ) : null}
      {!loading && !message && !assessments.length ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No published assessments are available for this book.</p> : null}
      <div className="flex justify-end"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Close</button></div>
    </div>
  );
}
