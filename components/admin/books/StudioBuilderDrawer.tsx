"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

export default function StudioBuilderDrawer({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  function requestClose() {
    const dirty = document.querySelector("[data-builder-dirty='true']");
    if (dirty && !confirm("Discard unsaved builder changes?")) return;
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Close builder drawer"
        className="absolute inset-0"
        onClick={requestClose}
      />
      <aside className="relative flex h-full w-full max-w-[92rem] flex-col overflow-hidden bg-[#f8f5ee] shadow-2xl ring-1 ring-slate-200">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Studio Builder
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={`Close ${title}`}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">{children}</div>
      </aside>
    </div>
  );
}
