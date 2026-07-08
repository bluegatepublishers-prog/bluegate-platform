"use client";

import Link from "next/link";
import { BookOpen, FileText } from "lucide-react";
import { Book } from "@/types/book";

interface SamplePDFPreviewProps {
  book: Book;
}

export default function SamplePDFPreview({
  book,
}: SamplePDFPreviewProps) {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6">
        {/* Heading */}
        <div className="mb-10 text-center">
          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            Sample Book Preview
          </span>

          <h2 className="mt-5 text-4xl font-bold text-slate-900">
            Explore Inside the Book
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-lg text-slate-600">
            Browse sample pages to understand the structure,
            pedagogy, activities and learning approach before
            requesting an inspection copy.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border bg-white shadow-xl">
          <div className="flex items-center justify-between border-b bg-slate-50 px-8 py-5">
            <div className="flex items-center gap-3">
              <BookOpen
                className="text-blue-600"
                size={28}
              />

              <div>
                <h3 className="text-xl font-bold">
                  {book.title}
                </h3>

                <p className="text-sm text-slate-500">
                  Interactive PDF Preview
                </p>
              </div>
            </div>

            {book.pdf && (
              <Link
                href={book.pdf}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                <FileText size={18} />
                Open PDF
              </Link>
            )}
          </div>

          {book.pdf ? (
            <iframe
              src={`${book.pdf}#toolbar=1&navpanes=0&scrollbar=1`}
              title={book.title}
              className="h-[850px] w-full"
            />
          ) : (
            <div className="flex h-[700px] flex-col items-center justify-center bg-slate-50 text-center">
              <BookOpen
                size={70}
                className="mb-6 text-slate-300"
              />

              <h3 className="text-3xl font-bold text-slate-800">
                Sample PDF Not Available
              </h3>

              <p className="mt-4 max-w-xl text-slate-500">
                The sample PDF for this book has not been
                uploaded yet. Please request an inspection
                copy or contact Bluegate Publishers.
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