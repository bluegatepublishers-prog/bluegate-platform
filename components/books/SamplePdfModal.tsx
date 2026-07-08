"use client";

import { X, BookOpen } from "lucide-react";

interface SamplePdfModalProps {
  open: boolean;
  pdf?: string;
  title: string;
  onClose: () => void;
}

export default function SamplePdfModal({
  open,
  pdf,
  title,
  onClose,
}: SamplePdfModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-5">

      <div className="flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* Header */}

        <div className="flex items-center justify-between border-b bg-gradient-to-r from-blue-600 to-sky-500 px-8 py-5">

          <div className="flex items-center gap-4">

            <div className="rounded-xl bg-white/20 p-3">

              <BookOpen className="text-white" size={28} />

            </div>

            <div>

              <h2 className="text-2xl font-bold text-white">
                Sample Book Preview
              </h2>

              <p className="text-blue-100">
                {title}
              </p>

            </div>

          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-white/20 p-3 text-white transition hover:bg-white/30"
          >
            <X size={24} />
          </button>

        </div>

        {/* PDF */}

        <div className="flex-1 bg-slate-100">

          {pdf ? (

            <iframe
              src={`${pdf}#toolbar=1&navpanes=0&scrollbar=1`}
              title={title}
              className="h-full w-full border-0"
            />

          ) : (

            <div className="flex h-full items-center justify-center">

              <div className="text-center">

                <BookOpen
                  size={70}
                  className="mx-auto text-blue-600"
                />

                <h3 className="mt-6 text-3xl font-bold text-slate-800">
                  Sample PDF Not Available
                </h3>

                <p className="mt-3 text-slate-500">
                  This title currently has no sample PDF uploaded.
                </p>

              </div>

            </div>

          )}

        </div>

        {/* Footer */}

        <div className="flex items-center justify-between border-t bg-white px-8 py-5">

          <div>

            <h3 className="font-semibold text-slate-800">
              Evaluation Copy
            </h3>

            <p className="text-sm text-slate-500">
              This preview is provided for evaluation purposes only.
              For a complete inspection copy, please use the
              "Request Inspection Copy" option on the Book Details page.
            </p>

          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Close Preview
          </button>

        </div>

      </div>

    </div>
  );
}