"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Hash,
  Star,
  Eye,
} from "lucide-react";

import { Book } from "@/types/book";

interface BookCardProps {
  book: Book;
}

export default function BookCard({
  book,
}: BookCardProps) {
  return (
    <article className="group overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">

      {/* Top */}

      <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 px-6 pb-8 pt-6">

        {book.featured && (
          <div className="absolute left-5 top-5 flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-900 shadow">
            <Star size={12} fill="currentColor" />
            Featured
          </div>
        )}

        <div className="absolute right-5 top-5 rounded-full bg-[#0B5ED7] px-3 py-1 text-xs font-bold text-white shadow">
          Class {book.class}
        </div>

        <div className="flex justify-center">
          <Image
            src={book.cover}
            alt={book.title}
            width={190}
            height={270}
            className="rounded-2xl shadow-2xl transition duration-500 group-hover:scale-105 group-hover:rotate-1"
          />
        </div>
      </div>

      {/* Content */}

      <div className="p-6">

        <div className="mb-4 flex flex-wrap gap-2">

          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
            {book.subject}
          </span>

          {book.series && (
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
              {book.series}
            </span>
          )}

        </div>

        <h3 className="line-clamp-2 min-h-[60px] text-xl font-bold text-slate-900">
          {book.title}
        </h3>

        {book.subtitle && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
            {book.subtitle}
          </p>
        )}

        {/* Description */}

        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">
          {book.description}
        </p>

        {/* Meta */}

        <div className="mt-6 grid grid-cols-2 gap-3">

          <MetaCard
            icon={<BookOpen size={16} />}
            title="Pages"
            value={book.pages ? String(book.pages) : "-"}
          />

          <MetaCard
            icon={<Hash size={16} />}
            title="ISBN"
            value={book.isbn ? "Available" : "-"}
          />

        </div>

        {/* Features */}

        <div className="mt-6 space-y-2">

          <Feature text="NEP 2020 Aligned" />

          <Feature text="Activity Based Learning" />

          <Feature text="Teacher Resource Support" />

        </div>

        {/* Buttons */}

        <div className="mt-7 flex gap-3">

          <Link
            href={`/books/${book.slug}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0B5ED7] py-3 font-semibold text-white transition hover:bg-[#083A75]"
          >
            <Eye size={18} />

            Details
          </Link>

          <Link
            href={`/books/${book.slug}`}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:border-[#0B5ED7] hover:bg-blue-50"
          >
            <ArrowRight
              size={18}
              className="text-[#0B5ED7]"
            />
          </Link>

        </div>

      </div>

    </article>
  );
}

function MetaCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">

      <div className="mb-2 flex items-center gap-2 text-slate-500">

        {icon}

        <span className="text-xs font-semibold uppercase">
          {title}
        </span>

      </div>

      <p className="text-sm font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}

function Feature({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">

      <GraduationCap
        size={16}
        className="text-[#0B5ED7]"
      />

      <span>{text}</span>

    </div>
  );
}