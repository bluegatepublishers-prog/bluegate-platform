"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

export default function StudioBuilderDrawer({
  open,
  title,
  description,
  size = "wide",
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  size?: "compact" | "wide";
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
      <aside
        data-testid="studio-builder-drawer"
        data-builder-title={title}
        className={`relative flex h-full w-full flex-col overflow-hidden bg-slate-50 shadow-xl ring-1 ring-slate-200 ${size === "compact" ? "max-w-[30rem]" : "max-w-[34rem]"}`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Studio Builder
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-slate-950">{title}</h2>
            {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={`Close ${title}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white p-0 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
      </aside>
    </div>
  );
}
