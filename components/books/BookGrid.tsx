"use client";

import { Book } from "@/types/book";
import BookCard from "./BookCard";

interface BookGridProps {
  books: Book[];
}

export default function BookGrid({ books }: BookGridProps) {
  if (books.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white py-20 text-center">
        <h3 className="text-2xl font-semibold text-slate-700">
          No books found
        </h3>

        <p className="mt-3 text-slate-500">
          Try changing your search or filters.
        </p>
      </div>
    );
  }

  return (
    <section className="py-8">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
          />
        ))}
      </div>
    </section>
  );
}