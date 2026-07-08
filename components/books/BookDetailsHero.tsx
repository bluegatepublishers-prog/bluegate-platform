// components/books/BookDetailsHero.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, FileText, BookOpen, Hash, GraduationCap, ChevronRight } from "lucide-react";

import { Book } from "@/types/book";
import SamplePdfModal from "./SamplePdfModal";
import InspectionModal from "./InspectionModal";

interface Props {
  book: Book;
}

export default function BookDetailsHero({ book }: Props) {
  const [showPdf, setShowPdf] = useState(false);
  const [showInspection, setShowInspection] = useState(false);

  return (
    <>
      <section className="border-b bg-gradient-to-br from-slate-50 via-white to-sky-50">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-8 flex items-center gap-2 text-sm text-slate-500">
            <Link href="/">Home</Link>
            <ChevronRight size={16}/>
            <Link href="/books">Books</Link>
            <ChevronRight size={16}/>
            <span>{book.title}</span>
          </div>

          <div className="grid gap-12 lg:grid-cols-[360px_1fr]">
            <div className="rounded-3xl bg-white p-8 shadow-xl">
              <Image
                src={book.cover}
                alt={book.title}
                width={320}
                height={450}
                className="mx-auto rounded-xl shadow-lg"
              />
            </div>

            <div>
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">Class {book.class}</span>
                <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">{book.subject}</span>
                <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">{book.board}</span>
                <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700">{book.series}</span>
              </div>

              <h1 className="text-5xl font-bold text-slate-900">{book.title}</h1>
              <p className="mt-3 text-xl text-slate-500">{book.subtitle}</p>
              <p className="mt-8 leading-8 text-slate-600">{book.description}</p>

              <div className="mt-10 grid gap-5 sm:grid-cols-3">
                <div className="rounded-2xl border bg-white p-6">
                  <BookOpen className="mb-3 text-blue-600"/>
                  <p className="text-sm text-slate-500">Pages</p>
                  <p className="mt-2 text-2xl font-bold">{book.pages}</p>
                </div>

                <div className="rounded-2xl border bg-white p-6">
                  <Hash className="mb-3 text-orange-600"/>
                  <p className="text-sm text-slate-500">ISBN</p>
                  <p className="mt-2 break-all text-sm font-semibold">{book.isbn}</p>
                </div>

                <div className="rounded-2xl border bg-white p-6">
                  <GraduationCap className="mb-3 text-emerald-600"/>
                  <p className="text-sm text-slate-500">Board</p>
                  <p className="mt-2 text-xl font-bold">{book.board}</p>
                </div>
              </div>

              <div className="mt-10 flex flex-wrap gap-5">
                <button
                  onClick={() => setShowPdf(true)}
                  className="flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 font-semibold text-white hover:bg-blue-700"
                >
                  <Eye size={20}/>
                  View Sample
                </button>

                <button
                  onClick={() => setShowInspection(true)}
                  className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-8 py-4 font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <FileText size={20}/>
                  Request Inspection Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SamplePdfModal
        open={showPdf}
        pdf={book.pdf}
        title={book.title}
        onClose={() => setShowPdf(false)}
      />

      <InspectionModal
        open={showInspection}
        book={book}
        onClose={() => setShowInspection(false)}
      />
    </>
  );
}
