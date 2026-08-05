"use client";

import type { ReactNode } from "react";

type CanvasSaveState = "saved" | "dirty" | "saving" | "error";

type CanvasProps = {
  title: string;
  subtitle: string;
  description: string;

  onTitleChange: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;

  saveState: CanvasSaveState;
  dirty: boolean;
  error?: string;

  layout: "single" | "double";
  children: ReactNode;
};

export default function Canvas({
  title,
  subtitle,
  description,
  onTitleChange,
  onSubtitleChange,
  onDescriptionChange,
  saveState,
  dirty,
  error = "",
  layout,
  children,
}: CanvasProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto w-full max-w-[62rem] rounded-[2rem] bg-white px-6 py-7 shadow-sm ring-1 ring-slate-200 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-h-7" aria-hidden="true" />

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                saveState === "saving"
                  ? "bg-amber-100 text-amber-800"
                  : saveState === "error"
                    ? "bg-rose-100 text-rose-700"
                    : dirty
                      ? "bg-blue-100 text-blue-700"
                      : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {saveState === "saving"
                ? "Saving"
                : saveState === "error"
                  ? "Save failed"
                  : dirty
                    ? "Unsaved"
                    : "Saved"}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            <input
              value={title}
              onChange={(event) =>
                onTitleChange(event.target.value)
              }
              className="w-full border-none bg-transparent p-0 text-4xl font-bold tracking-tight text-slate-950 outline-none placeholder:text-slate-300"
              placeholder="Untitled"
              aria-label="Title"
            />

            <input
              value={subtitle}
              onChange={(event) =>
                onSubtitleChange(event.target.value)
              }
              className="w-full border-none bg-transparent p-0 text-lg text-slate-500 outline-none placeholder:text-slate-300"
              placeholder="Subtitle"
              aria-label="Subtitle"
            />

            <textarea
              value={description}
              onChange={(event) =>
                onDescriptionChange(event.target.value)
              }
              rows={3}
              className="w-full resize-none border-none bg-transparent p-0 text-base leading-8 text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="Write the opening guidance for this manuscript."
              aria-label="Lead text"
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div
          className={`mx-auto w-full max-w-[62rem] gap-4 ${
            layout === "double"
              ? "grid grid-cols-1 md:grid-cols-2"
              : "space-y-4"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}