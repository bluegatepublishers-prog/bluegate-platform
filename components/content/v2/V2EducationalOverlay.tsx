"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useV2OverlayPortalTarget } from "@/components/content/v2/V2OverlayPortalContext";
import { BookOpen } from "lucide-react";

export default function V2EducationalOverlay({
  title,
  children,
  onClose,
}: {
  title: string;
  children?: ReactNode;
  onClose: () => void;
}) {
  const portalTarget = useV2OverlayPortalTarget();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

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

  if (typeof globalThis.document === "undefined" || !portalTarget) return null;

  return createPortal(
    <div
      data-v2-educational-overlay
      role="presentation"
      className="pointer-events-auto fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(88vh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700"
            >
              <BookOpen className="h-5 w-5" />
            </span>

            <h2
              id={titleId}
              className="min-w-0 truncate text-lg font-bold text-slate-950"
            >
              {title}
            </h2>
          </div>

          <button
            ref={closeRef}
            type="button"
            data-v2-educational-overlay-close
            aria-label="Close educational content"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-xl font-bold leading-none text-slate-600 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            ×
          </button>
        </header>

        <div
          data-v2-educational-overlay-content
          className="min-h-0 overflow-y-auto p-5"
        >
          {children ?? (
            <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-5 text-sm font-semibold text-amber-900">
              This content is currently unavailable.
            </p>
          )}
        </div>
      </section>
    </div>,
    portalTarget,
  );
}