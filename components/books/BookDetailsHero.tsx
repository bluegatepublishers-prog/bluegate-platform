// components/books/BookDetailsHero.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Eye,
  FileText,
  BookOpen,
  Hash,
  GraduationCap,
  Library,
  ChevronRight,
} from "lucide-react";

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
          {/* Breadcrumb */}

          <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link href="/" className="hover:text-blue-600">
              Home
            </Link>

            <ChevronRight size={16} />

            <Link href="/books" className="hover:text-blue-600">
              Books
            </Link>

            <ChevronRight size={16} />

            <span className="font-medium text-slate-700">
              {book.title}
            </span>
          </div>

          <div className="grid gap-12 lg:grid-cols-[320px_1fr]">
            {/* Cover */}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <Image
                src={book.cover}
                alt={book.title}
                width={300}
                height={420}
                className="mx-auto rounded-2xl shadow-lg"
              />
            </div>

            {/* Details */}

            <div>
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-700">
                  Class {book.class}
                </span>

                <span className="rounded-full bg-orange-100 px-4 py-1.5 text-sm font-semibold text-orange-700">
                  {book.subject}
                </span>

                <span className="rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-700">
                  {book.board}
                </span>

                <span className="rounded-full bg-purple-100 px-4 py-1.5 text-sm font-semibold text-purple-700">
                  {book.series}
                </span>
              </div>

              <h1 className="text-4xl font-bold text-slate-900">
                {book.title}
              </h1>

              {book.subtitle && (
                <p className="mt-3 text-xl text-slate-500">
                  {book.subtitle}
                </p>
              )}

              <p className="mt-6 max-w-4xl leading-8 text-slate-600">
                {book.description}
              </p>

              {/* Compact Info Cards */}

              <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <InfoCard
                  icon={<BookOpen size={20} className="text-blue-600" />}
                  label="Pages"
                  value={book.pages || "-"}
                />

                <InfoCard
                  icon={<Hash size={20} className="text-orange-600" />}
                  label="ISBN"
                  value={book.isbn || "-"}
                />

                <InfoCard
                  icon={<GraduationCap size={20} className="text-green-600" />}
                  label="Board"
                  value={book.board}
                />

                <InfoCard
                  icon={<Library size={20} className="text-purple-600" />}
                  label="Subject"
                  value={book.subject}
                />
              </div>

              {/* Buttons */}

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={() => setShowPdf(true)}
                  className="flex h-12 items-center gap-2 rounded-xl bg-[#0B5ED7] px-6 font-semibold text-white transition hover:bg-[#083A75]"
                >
                  <Eye size={18} />
                  View Sample
                </button>

                <button
                  onClick={() => setShowInspection(true)}
                  className="flex h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <FileText size={18} />
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

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function InfoCard({
  icon,
  label,
  value,
}: InfoCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
        {icon}
      </div>

      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-900 break-words">
        {value}
      </p>
    </div>
  );
}