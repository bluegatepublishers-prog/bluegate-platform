"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
} from "lucide-react";

import { Book } from "@/types/book";

interface RelatedBooksProps {
  currentBook: Book;
  books: Book[];
}

export default function RelatedBooks({
  currentBook,
  books,
}: RelatedBooksProps) {
  const relatedBooks = books
    .filter(
      (book) =>
        book.slug !== currentBook.slug &&
        (book.subject === currentBook.subject ||
          book.class === currentBook.class ||
          book.series === currentBook.series)
    )
    .slice(0, 4);

  if (!relatedBooks.length) return null;

  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-6">
        {/* Heading */}

        <div className="mb-12 text-center">
          <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-[#0B5ED7]">
            YOU MAY ALSO LIKE
          </span>

          <h2 className="mt-5 text-4xl font-bold text-slate-900">
            Related Books
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Discover more curriculum-aligned books from the
            same subject, class and series.
          </p>
        </div>

        {/* Cards */}

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          {relatedBooks.map((book) => (
            <article
              key={book.id}
              className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >
              {/* Cover */}

              <div className="relative flex h-72 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
                <Image
                  src={book.cover}
                  alt={book.title}
                  width={180}
                  height={250}
                  className="transition duration-500 group-hover:scale-105"
                />

                {book.featured && (
                  <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-900">
                    Featured
                  </span>
                )}
              </div>

              {/* Content */}

              <div className="p-6">
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    Class {book.class}
                  </span>

                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                    {book.subject}
                  </span>
                </div>

                <h3 className="line-clamp-2 min-h-[56px] text-xl font-bold text-slate-900">
                  {book.title}
                </h3>

                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                  {book.description}
                </p>

                {/* Footer */}

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <BookOpen size={16} />
                    {book.series || "Bluegate"}
                  </div>

                  <Link
                    href={`/books/${book.slug}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0B5ED7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#083A75]"
                  >
                    Details

                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}