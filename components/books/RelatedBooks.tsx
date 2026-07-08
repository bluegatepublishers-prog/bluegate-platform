"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

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

  if (relatedBooks.length === 0) return null;

  return (
    <section className="bg-white py-20">

      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-12 text-center">

          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            Recommended Books
          </span>

          <h2 className="mt-5 text-4xl font-bold text-slate-900">
            Related Books
          </h2>

          <p className="mt-4 text-lg text-slate-600">
            Explore more books from the same series,
            subject and class.
          </p>

        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

          {relatedBooks.map((book) => (

            <div
              key={book.id}
              className="overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
            >

              <div className="relative h-72 bg-slate-100">

                <Image
                  src={book.cover}
                  alt={book.title}
                  fill
                  className="object-contain p-5"
                />

              </div>

              <div className="p-6">

                <div className="mb-3 flex flex-wrap gap-2">

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    Class {book.class}
                  </span>

                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                    {book.subject}
                  </span>

                </div>

                <h3 className="line-clamp-2 text-xl font-bold text-slate-900">
                  {book.title}
                </h3>

                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                  {book.description}
                </p>

                <Link
                  href={`/books/${book.slug}`}
                  className="mt-6 inline-flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700"
                >
                  View Details

                  <ArrowRight size={18} />

                </Link>

              </div>

            </div>

          ))}

        </div>

      </div>

    </section>
  );
}