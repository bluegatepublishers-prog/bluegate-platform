"use client";

import { useEffect } from "react";
import { BookOpen, X } from "lucide-react";
import PublicSamplePdfViewer from "./PublicSamplePdfViewer";

interface SamplePdfModalProps {
  open: boolean;
  publicPreviewPdf?: string;
  title: string;
  onClose: () => void;
}

export default function SamplePdfModal({
  open,
  publicPreviewPdf,
  title,
  onClose,
}: SamplePdfModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior =
      document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior =
        previousOverscrollBehavior;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview selected pages from ${title}`}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black/70 p-2 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
      onCopy={(event) => event.preventDefault()}
    >
      <div
        className="flex h-[96dvh] w-full max-w-[min(96vw,46rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[94dvh] sm:rounded-3xl"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header className="flex shrink-0 items-center justify-between border-b bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="shrink-0 rounded-xl bg-white/20 p-2">
              <BookOpen
                className="text-white"
                size={22}
              />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-white sm:text-xl">
                Preview Selected Pages
              </h2>

              <p className="truncate text-xs text-blue-100 sm:text-sm">
                {title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="shrink-0 rounded-full bg-white/20 p-2.5 text-white transition hover:bg-white/30"
          >
            <X size={21} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden bg-slate-100">
          {publicPreviewPdf ? (
            <PublicSamplePdfViewer
              pdfUrl={publicPreviewPdf}
              title={title}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-center">
                <BookOpen
                  size={56}
                  className="mx-auto text-blue-600"
                />

                <h3 className="mt-5 text-2xl font-bold text-slate-800">
                  Preview Coming Soon
                </h3>

                <p className="mt-3 text-slate-500">
                  Preview selected pages from this book
                  when they become available.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}