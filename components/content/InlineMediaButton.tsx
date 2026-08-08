"use client";

import { useEffect, useState } from "react";
import type { MediaKind } from "@/lib/content-document";

export default function InlineMediaButton({
  href,
  label,
  title,
  mediaKind,
  poster,
  controls = true,
}: {
  href: string;
  label: string;
  title: string;
  mediaKind: MediaKind;
  poster?: string;
  controls?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="mt-2 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <span aria-hidden="true">▶</span> {label}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-4xl rounded-2xl bg-white p-4 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="min-w-0 truncate text-lg font-bold text-slate-950">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100"
                aria-label="Close media"
              >
                ×
              </button>
            </div>
            {mediaKind === "video" ? (
              <video
                src={href}
                poster={poster}
                controls={controls}
                autoPlay
                playsInline
                className="max-h-[75vh] w-full rounded-xl bg-slate-950"
              />
            ) : mediaKind === "audio" ? (
              <audio src={href} controls={controls} autoPlay className="w-full" />
            ) : (
              <iframe
                title={title}
                src={href}
                allow="fullscreen"
                allowFullScreen
                className="h-[70vh] w-full rounded-xl border border-slate-200 bg-white"
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
