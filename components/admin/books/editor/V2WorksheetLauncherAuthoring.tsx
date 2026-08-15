"use client";

import { useEffect, useState } from "react";

type WorksheetChoice = {
  id: string;
  title: string;
  chapter: { title: string; chapterNumber: number };
  module: { title: string } | null;
  questionCount: number;
  totalMarks: number;
};

export default function V2WorksheetLauncherAuthoring({
  bookId,
  chapterId = null,
  moduleId = null,
  onInsert,
  onClose,
}: {
  bookId?: string;
  chapterId?: string | null;
  moduleId?: string | null;
  onInsert: (worksheetId: string) => void;
  onClose: () => void;
}) {
  const [worksheets, setWorksheets] = useState<WorksheetChoice[]>([]);
  const [loading, setLoading] = useState(Boolean(bookId));
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!bookId) return;

    let cancelled = false;
    const params = new URLSearchParams();
    if (chapterId) params.set("chapterId", chapterId);
    if (moduleId) params.set("moduleId", moduleId);

    void fetch(
      `/api/admin/books/${encodeURIComponent(bookId)}/worksheet-launcher?${params.toString()}`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        const body = await response.json() as {
          ok?: boolean;
          message?: string;
          worksheets?: WorksheetChoice[];
        };
        if (!response.ok || !body.ok) {
          throw new Error(body.message ?? "Worksheets are unavailable.");
        }
        if (!cancelled) {
          setWorksheets(body.worksheets ?? []);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Worksheets are unavailable.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookId, chapterId, moduleId]);

  return (
    <div data-v2-worksheet-launcher-picker className="space-y-2">
      <p className="text-xs text-slate-500">
        Choose a published student worksheet for this page.
      </p>

      {loading ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
          Loading worksheets…
        </p>
      ) : !bookId ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
          Save this book before inserting a worksheet launcher.
        </p>
      ) : message ? (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
          {message}
        </p>
      ) : worksheets.length ? (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {worksheets.map((worksheet) => (
            <button
              key={worksheet.id}
              type="button"
              onClick={() => onInsert(worksheet.id)}
              className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-violet-300 hover:bg-violet-50"
            >
              <span className="block font-bold text-slate-900">{worksheet.title}</span>
              <span className="mt-1 block text-xs text-slate-500">
                Chapter {worksheet.chapter.chapterNumber}: {worksheet.chapter.title}
                {worksheet.module ? ` · ${worksheet.module.title}` : ""}
              </span>
              <span className="mt-1 block text-xs font-semibold text-slate-600">
                {worksheet.questionCount} question{worksheet.questionCount === 1 ? "" : "s"} · {worksheet.totalMarks} mark{worksheet.totalMarks === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
          No published, student-facing online worksheets are available in this context.
        </p>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
          Close
        </button>
      </div>
    </div>
  );
}
