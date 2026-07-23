import Link from "next/link";
import { Plus } from "lucide-react";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import BookTable from "@/components/admin/books/BookTable";
import type { BookTableItem } from "@/types/admin-book";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { bookCoverPath } from "@/lib/storage/book-asset-path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Books | Bluegate Admin",
};

type BookWithRelations = Prisma.BookGetPayload<{
  include: {
    class: true;
    subject: true;
    series: true;
  };
}>;

export default async function BooksPage() {
  const actor = await requireLivePublisherAdmin();
  if (!process.env.DATABASE_URL) {
    return (
      <div className="space-y-8 p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-slate-900">
          <h1 className="text-3xl font-bold">Database configuration required</h1>
          <p className="mt-4 text-slate-700">
            The admin books page cannot load because the database is not configured.
            Check the <code>DATABASE_URL</code> environment variable and try again.
          </p>
        </div>
      </div>
    );
  }

  let books: BookWithRelations[] = [];
  let errorMessage: string | null = null;

  try {
    books = await prisma.book.findMany({
      where: { publisherId: actor.publisherId },
      include: {
        class: true,
        subject: true,
        series: true,
      },
      orderBy: [
        { featured: "desc" },
        { featuredOrder: "asc" },
        { updatedAt: "desc" },
        { id: "asc" },
      ],
    });
  } catch {
    errorMessage = "Database connection is unavailable. Check the DATABASE_URL environment variable.";
  }

  if (errorMessage) {
    return (
      <div className="space-y-8 p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-slate-900">
          <h1 className="text-3xl font-bold">Unable to load books</h1>
          <p className="mt-4 text-slate-700">{errorMessage}</p>
        </div>
      </div>
    );
  }

  const tableBooks: BookTableItem[] = books.map((book) => ({
  id: book.id,

  title: book.title,
  slug: book.slug,
  author: book.author,
  isbn: book.isbn,
  edition: book.edition,
  price: book.price?.toString() ?? null,
  subtitle: book.subtitle,

  coverImage: bookCoverPath(book.id, book.coverImage),

  featured: book.featured,
  featuredOrder: book.featuredOrder,
  published: book.published,
  publicPreviewAvailable: Boolean(book.publicPreviewPdf || book.samplePdf),
  fullBookAvailable: Boolean(book.fullBookPdf),
  createdAt: book.createdAt.toISOString(),
  updatedAt: book.updatedAt.toISOString(),

  class: {
    name: book.class.name,
  },

  subject: {
    name: book.subject.name,
  },

  series: book.series
    ? {
        name: book.series.name,
      }
    : null,
}));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Books</h1>

          <p className="mt-2 text-slate-600">
            Manage all Bluegate Publisher books.
          </p>
        </div>

        <Link
          href="/admin/books/new"
          className="inline-flex items-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Book
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total Books</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {books.length}
          </h2>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Published</p>
          <h2 className="mt-2 text-3xl font-bold text-green-700">
            {books.filter((b) => b.published).length}
          </h2>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Draft</p>
          <h2 className="mt-2 text-3xl font-bold text-amber-700">
            {books.filter((b) => !b.published).length}
          </h2>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Featured</p>
          <h2 className="mt-2 text-3xl font-bold text-blue-700">
            {books.filter((b) => b.featured).length}
          </h2>
        </div>
      </div>

      <BookTable books={tableBooks} />
    </div>
  );
}
