"use client";

import { FormEvent, useEffect, useState } from "react";

import type { QrAudience, QrStatus } from "@/components/admin/qr/QrList";

export type QrFilterValues = {
  q: string;
  bookId: string;
  status: "" | QrStatus;
  audience: "" | QrAudience;
  targetType: "" | "BOOK" | "PART" | "UNIT" | "CHAPTER" | "MODULE" | "TOPIC";
};

type QrFiltersProps = {
  values: QrFilterValues;
  books: Array<{ id: string; title: string }>;
  loading: boolean;
  onApply: (values: QrFilterValues) => void;
  onReset: () => void;
};

const controlClass =
  "mt-1.5 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

export default function QrFilters({
  values,
  books,
  loading,
  onApply,
  onReset,
}: QrFiltersProps) {
  const [draft, setDraft] = useState(values);

  useEffect(() => {
    setDraft(values);
  }, [values]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply({ ...draft, q: draft.q.trim() });
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Narrow the publisher QR catalog.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
      >
        <label className="block text-xs font-medium text-slate-700">
          Search
          <input
            type="search"
            value={draft.q}
            onChange={(event) =>
              setDraft((current) => ({ ...current, q: event.target.value }))
            }
            placeholder="Name, code, or Book"
            className={controlClass}
          />
        </label>

        <label className="block text-xs font-medium text-slate-700">
          Book
          <select
            value={draft.bookId}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                bookId: event.target.value,
              }))
            }
            className={controlClass}
          >
            <option value="">All Books</option>
            {draft.bookId &&
            !books.some((book) => book.id === draft.bookId) ? (
              <option value={draft.bookId}>Selected Book</option>
            ) : null}
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-slate-700">
          Status
          <select
            value={draft.status}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                status: event.target.value as QrFilterValues["status"],
              }))
            }
            className={controlClass}
          >
            <option value="">All statuses</option>
            {["DRAFT", "ACTIVE", "PAUSED", "EXPIRED", "ARCHIVED", "SUSPENDED"].map(
              (status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="block text-xs font-medium text-slate-700">
          Audience
          <select
            value={draft.audience}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                audience: event.target.value as QrFilterValues["audience"],
              }))
            }
            className={controlClass}
          >
            <option value="">All audiences</option>
            {[
              "PUBLIC",
              "AUTHENTICATED",
              "SCHOOL_MEMBER",
              "TEACHER_ONLY",
              "STUDENT_ONLY",
              "TEACHER_OR_STUDENT",
            ].map((audience) => (
              <option key={audience} value={audience}>
                {audience.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-slate-700">
          Target type
          <select
            value={draft.targetType}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                targetType: event.target
                  .value as QrFilterValues["targetType"],
              }))
            }
            className={controlClass}
          >
            <option value="">All targets</option>
            {["BOOK", "PART", "UNIT", "CHAPTER", "MODULE", "TOPIC"].map(
              (target) => (
                <option key={target} value={target}>
                  {target}
                </option>
              ),
            )}
          </select>
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Apply
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setDraft({
                q: "",
                bookId: "",
                status: "",
                audience: "",
                targetType: "",
              });
              onReset();
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </form>
    </section>
  );
}
