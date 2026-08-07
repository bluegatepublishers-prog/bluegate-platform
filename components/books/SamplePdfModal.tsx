"use client";

import { useEffect } from "react";
import { BookOpen, X } from "lucide-react";

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
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black/70 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onContextMenu={(event) =>
        event.preventDefault()
      }
      onCopy={(event) => event.preventDefault()}
    >
      <div
        className="flex h-[94vh] w-full max-w-[min(94vw,52rem)] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header className="flex shrink-0 items-center justify-between border-b bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-4 sm:px-8 sm:py-5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="shrink-0 rounded-xl bg-white/20 p-2.5 sm:p-3">
              <BookOpen
                className="text-white"
                size={26}
              />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-white sm:text-2xl">
                Preview Selected Pages
              </h2>

              <p className="truncate text-sm text-blue-100 sm:text-base">
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
            <X size={22} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden bg-slate-100 p-3 sm:p-5">
          {publicPreviewPdf ? (
            <div className="h-full w-full overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-200">
              <iframe
                src={`${publicPreviewPdf}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                title={`${title} sample preview`}
                className="h-full w-full border-0"
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <BookOpen
                  size={64}
                  className="mx-auto text-blue-600"
                />

                <h3 className="mt-6 text-2xl font-bold text-slate-800 sm:text-3xl">
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

        <footer className="flex shrink-0 flex-col gap-3 border-t bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800">
              Evaluation Preview
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Selected sample pages only. For an
              inspection copy, use the request option
              on the Book Details page.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white transition hover:bg-blue-700"
          >
            Close Preview
          </button>
        </footer>
      </div>
    </div>
  );
}