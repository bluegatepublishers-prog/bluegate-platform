"use client";

import { BookOpen } from "lucide-react";
import { Book } from "@/types/book";

interface SamplePDFPreviewProps {
  book: Book;
}

export default function SamplePDFPreview({
  book,
}: SamplePDFPreviewProps) {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            Preview Selected Pages
          </span>

          <h2 className="mt-5 text-3xl font-bold text-slate-900 sm:text-4xl">
            Explore Inside the Book
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-base text-slate-600 sm:text-lg">
            Browse selected sample pages to understand
            the structure, pedagogy, activities and
            learning approach before requesting an
            inspection copy.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-3 border-b bg-slate-50 px-5 py-4 sm:px-8 sm:py-5">
            <BookOpen
              className="shrink-0 text-blue-600"
              size={26}
            />

            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                {book.title}
              </h3>

              <p className="text-sm text-slate-500">
                Sample page preview
              </p>
            </div>
          </div>

          {book.publicPreviewPdf ? (
            <div
              className="h-[72vh] min-h-[560px] overflow-hidden bg-slate-100"
              onContextMenu={(event) =>
                event.preventDefault()
              }
              onCopy={(event) =>
                event.preventDefault()
              }
            >
              <iframe
                src={`${book.publicPreviewPdf}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                title={`${book.title} sample preview`}
                className="h-full w-full border-0"
              />
            </div>
          ) : (
            <div className="flex h-[560px] flex-col items-center justify-center bg-slate-50 px-6 text-center">
              <BookOpen
                size={64}
                className="mb-6 text-slate-300"
              />

              <h3 className="text-2xl font-bold text-slate-800 sm:text-3xl">
                Preview Coming Soon
              </h3>

              <p className="mt-4 max-w-xl text-slate-500">
                Selected preview pages will appear here
                when available.
              </p>
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Preview is provided for evaluation purposes only.
        </p>
      </div>
    </section>
  );
}