"use client";

import type {
  CSSProperties,
  ReactNode,
} from "react";

import DocumentPage from "@/components/admin/books/editor/DocumentPage";

type DocumentSaveState =
  | "saved"
  | "dirty"
  | "saving"
  | "error";

type DocumentWorkspaceProps = {
  title: string;
  subtitle: string;
  description: string;

  onTitleChange: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;

  saveState: DocumentSaveState;
  dirty: boolean;
  error?: string;

  layout: "single" | "double";
  wordCount: number;

  showRuler?: boolean;
  showGrid?: boolean;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;

  children: ReactNode;
};

export default function DocumentWorkspace({
  title,
  onTitleChange,
  saveState,
  dirty,
  error = "",
  layout,
  wordCount,
  showRuler = true,
  showGrid = false,
  zoom = 100,
  onZoomIn,
  onZoomOut,
  children,
}: DocumentWorkspaceProps) {
  const saveLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "error"
        ? "Save failed"
        : dirty
          ? "Unsaved changes"
          : "Saved";

  const workspaceStyle: CSSProperties =
    showGrid
      ? {
          backgroundImage:
            "linear-gradient(to right, rgba(100,116,139,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.12) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }
      : {};

  const zoomStyle = {
    zoom: zoom / 100,
  } as CSSProperties;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#e7ebf0]"
      style={workspaceStyle}
    >
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto min-w-[860px] px-10 pb-20 pt-8">
          {showRuler ? (
            <div className="mx-auto mb-2 w-[794px]">
              <div className="relative h-7 border border-slate-300 bg-white shadow-sm">
                <div className="absolute inset-x-0 bottom-0 flex h-4 items-end justify-between px-2 text-[9px] font-medium text-slate-400">
                  {Array.from(
                    { length: 21 },
                    (_, index) => (
                      <span
                        key={index}
                        className="relative flex h-full items-end"
                      >
                        <span className="absolute bottom-0 left-1/2 h-2 border-l border-slate-400" />

                        {index % 2 === 0 ? (
                          <span className="translate-y-[-9px]">
                            {index / 2}
                          </span>
                        ) : null}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div
            className="mx-auto w-fit"
            style={zoomStyle}
          >
            <DocumentPage moduleTitle={title}>
              <input
                value={title}
                onChange={(event) =>
                  onTitleChange(
                    event.target.value,
                  )
                }
                className="sr-only"
                aria-label="Module title"
              />

              {error ? (
                <div
                  role="alert"
                  className="mb-6 border-l-4 border-rose-500 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
                >
                  {error}
                </div>
              ) : null}

              <section
                className={
                  layout === "double"
                    ? "grid min-w-0 grid-cols-2 gap-10"
                    : "min-w-0 space-y-2"
                }
              >
                {children}
              </section>
            </DocumentPage>
          </div>
        </div>
      </div>

      <footer className="flex h-8 shrink-0 items-center border-t border-slate-300 bg-white px-4 text-xs font-medium text-slate-600">
        <span>
          {wordCount.toLocaleString("en-IN")} words
        </span>

        <span className="mx-3 text-slate-300">
          |
        </span>

        <span>English</span>

        <div className="ml-auto flex items-center gap-4">
          <span
            className={
              saveState === "error"
                ? "font-semibold text-rose-700"
                : saveState === "saving" ||
                    dirty
                  ? "font-semibold text-amber-700"
                  : "font-semibold text-emerald-700"
            }
          >
            {saveLabel}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onZoomOut}
              disabled={!onZoomOut || zoom <= 50}
              aria-label="Zoom out"
              className="flex h-5 w-5 items-center justify-center rounded text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              −
            </button>

            <div className="h-1 w-24 rounded-full bg-slate-200">
              <div
                className="h-1 rounded-full bg-blue-600"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      ((zoom - 50) / 150) *
                        100,
                    ),
                  )}%`,
                }}
              />
            </div>

            <button
              type="button"
              onClick={onZoomIn}
              disabled={!onZoomIn || zoom >= 200}
              aria-label="Zoom in"
              className="flex h-5 w-5 items-center justify-center rounded text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              +
            </button>

            <span>{zoom}%</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
