"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Eye,
  FileText,
  Pencil,
} from "lucide-react";

import type { BookTableItem } from "@/types/admin-book";

export default function BookTable({
  books,
  filtered = false,
}: {
  books: BookTableItem[];
  filtered?: boolean;
}) {
  if (!books.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center">
        <BookOpen className="mx-auto h-9 w-9 text-slate-300" />
        <h2 className="mt-3 text-base font-semibold text-slate-900">
          {filtered
            ? "No matching books"
            : "No books yet"}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {filtered
            ? "Try changing your search or filters."
            : "Create the first book to get started."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-2 md:hidden">
        {books.map((book) => (
          <MobileCard
            key={book.id}
            book={book}
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
        <table className="w-full table-fixed text-xs">
          <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-[0.11em] text-slate-500">
            <tr>
              <th className="w-[36%] px-3 py-2.5">
                Book
              </th>
              <th className="w-[28%] px-3 py-2.5">
                Classification
              </th>
              <th className="w-[12%] px-3 py-2.5">
                Preview
              </th>
              <th className="w-[11%] px-3 py-2.5">
                Status
              </th>
              <th className="w-[13%] px-3 py-2.5 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {books.map((book) => (
              <tr
                key={book.id}
                className="border-t border-slate-100 align-middle transition hover:bg-blue-50/30"
              >
                <td className="px-3 py-2">
                  <BookName book={book} />
                </td>

                <td className="px-3 py-2">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {book.class.name} ·{" "}
                    {book.subject.name}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500">
                    {[
                      book.board,
                      book.series?.name,
                    ]
                      .filter(Boolean)
                      .join(" · ") ||
                      "No board or series"}
                  </p>
                </td>

                <td className="px-3 py-2">
                  {book.publicPreviewAvailable ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                      <FileText className="h-3 w-3" />
                      Ready
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      Missing
                    </span>
                  )}
                </td>

                <td className="px-3 py-2">
                  <Badge book={book} />
                </td>

                <td className="px-3 py-2">
                  <Actions book={book} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MobileCard({
  book,
}: {
  book: BookTableItem;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex gap-3">
        <BookCover book={book} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-slate-900">
            {book.title}
          </p>

          <p className="mt-1 text-[10px] text-slate-500">
            {book.class.name} ·{" "}
            {book.subject.name}
          </p>

          <div className="mt-2">
            <Badge book={book} />
          </div>
        </div>
      </div>

      <div className="mt-3">
        <Actions book={book} mobile />
      </div>
    </article>
  );
}

function BookName({
  book,
}: {
  book: BookTableItem;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <BookCover book={book} />

      <div className="min-w-0">
        <Link
          href={`/admin/books/${book.id}/content`}
          className="block truncate text-xs font-bold text-slate-900 hover:text-blue-700"
        >
          {book.title}
        </Link>

        <p className="mt-0.5 truncate text-[10px] text-slate-500">
          {book.author ||
            book.isbn ||
            "No author or ISBN"}
        </p>

        <p className="mt-0.5 text-[9px] text-slate-400">
          Updated{" "}
          {formatDate(book.updatedAt)}
        </p>
      </div>
    </div>
  );
}

function BookCover({
  book,
}: {
  book: BookTableItem;
}) {
  if (book.coverImage) {
    return (
      <Image
        src={book.coverImage}
        alt={`${book.title} cover`}
        width={40}
        height={54}
        className="h-[54px] w-10 shrink-0 rounded-md border border-slate-200 object-cover"
      />
    );
  }

  return (
    <span className="flex h-[54px] w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400">
      <BookOpen className="h-4 w-4" />
    </span>
  );
}

function Actions({
  book,
  mobile = false,
}: {
  book: BookTableItem;
  mobile?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1 ${
        mobile
          ? "justify-start"
          : "justify-end"
      }`}
    >
      <Link
        href={`/admin/books/${book.id}/content`}
        className="whitespace-nowrap rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-bold text-white"
      >
        Content
      </Link>

      <Link
        aria-label={`Edit ${book.title}`}
        title="Edit book"
        href={`/admin/books/${book.id}/edit`}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
      >
        <Pencil className="h-3 w-3" />
      </Link>

      <Link
        aria-label={`Preview ${book.title}`}
        title="Preview book"
        href={
          book.published
            ? `/books/${book.slug}`
            : `/admin/books/${book.id}/preview`
        }
        target="_blank"
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
      >
        <Eye className="h-3 w-3" />
      </Link>
    </div>
  );
}

function Badge({
  book,
}: {
  book: BookTableItem;
}) {
  const label = book.archived
    ? "Archived"
    : book.published
      ? "Published"
      : "Draft";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${
        book.archived
          ? "bg-slate-200 text-slate-600"
          : book.published
            ? "bg-emerald-100 text-emerald-700"
            : "bg-amber-100 text-amber-700"
      }`}
    >
      {label}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    },
  ).format(new Date(value));
}
