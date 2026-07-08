"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Hash,
} from "lucide-react";

import { Book } from "@/types/book";

interface BookCardProps {
  book: Book;
}

export default function BookCard({ book }: BookCardProps) {
  return (
    <div className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">

      {/* Cover */}

      <div className="relative bg-gradient-to-br from-slate-100 via-white to-slate-50 p-6">

        {book.featured && (
          <div className="absolute left-5 top-5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
            Featured
          </div>
        )}

        <div className="absolute right-5 top-5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
          Class {book.class}
        </div>

        <div className="mx-auto flex justify-center">
          <Image
            src={book.cover}
            alt={book.title}
            width={220}
            height={310}
            className="rounded-xl shadow-xl transition duration-500 group-hover:scale-105"
          />
        </div>

      </div>

      {/* Body */}

      <div className="p-6">

        <div className="mb-4 flex flex-wrap gap-2">

          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
            {book.subject}
          </span>

          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
            {book.series}
          </span>

        </div>

        <h3 className="text-xl font-bold text-slate-900">
          {book.title}
        </h3>

        <p className="mt-2 text-sm text-slate-600">
          {book.subtitle}
        </p>

        <div className="mt-6 space-y-3">

          <Feature text="NEP 2020 Aligned" />
          <Feature text="Competency Based Learning" />
          <Feature text="Teacher Resource Support" />

        </div>

        <div className="mt-6 flex justify-between border-t border-slate-200 pt-5">

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <BookOpen size={16} />
            {book.pages} Pages
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Hash size={16} />
            {book.isbn}
          </div>

        </div>

      </div>

      {/* Footer */}

      <Link
        href={`/books/${book.slug}`}
        className="flex items-center justify-center gap-2 border-t border-slate-200 py-5 font-semibold text-blue-600 transition hover:bg-blue-50"
      >
        View Details
        <ArrowRight size={18} />
      </Link>

    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <CheckCircle2
        size={16}
        className="text-emerald-500"
      />
      {text}
    </div>
  );
}