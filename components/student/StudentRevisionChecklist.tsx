"use client";

import { useState } from "react";
import { Check, Circle } from "lucide-react";
import type { RevisionChecklist } from "@/lib/student-revision-policy";

const items: Array<{ key: keyof RevisionChecklist; label: string }> = [
  { key: "summaryRead", label: "Read Summary" },
  { key: "keywordsRead", label: "Read Keywords" },
  { key: "mindMapRead", label: "Reviewed Mind Map" },
  { key: "revisionCompleted", label: "Revision Complete" },
];

export default function StudentRevisionChecklist({
  bookId,
  chapterId,
  initialValue,
}: {
  bookId: string;
  chapterId: string;
  initialValue: RevisionChecklist;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function toggle(key: keyof RevisionChecklist) {
    if (saving) return;
    const next = { ...value, [key]: !value[key] };
    setValue(next);
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/student/books/${bookId}/chapters/${chapterId}/revision-progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("save failed");
      setMessage("Checklist saved");
    } catch {
      setValue(value);
      setMessage("We could not save your revision checklist.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-slate-950">Revision Checklist</h2>
      <p className="mt-2 text-slate-600">This is your personal revision record. It is not graded.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const checked = value[item.key];
          return (
            <button
              key={item.key}
              type="button"
              role="checkbox"
              aria-checked={checked}
              disabled={saving}
              onClick={() => void toggle(item.key)}
              className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-left font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-70 ${checked ? "border-green-300 bg-green-100 text-green-900" : "border-slate-200 bg-white text-slate-800"}`}
            >
              {checked ? <Check className="h-6 w-6 shrink-0" aria-hidden="true" /> : <Circle className="h-6 w-6 shrink-0" aria-hidden="true" />}
              {item.label}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="mt-4 min-h-6 text-sm font-semibold text-slate-700">{saving ? "Saving…" : message}</p>
    </section>
  );
}
