import Link from "next/link";
import { Plus } from "lucide-react";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import BookTable, {
  BookTableItem,
} from "@/components/admin/books/BookTable";

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
  const books: BookWithRelations[] = await prisma.book.findMany({
    include: {
      class: true,
      subject: true,
      series: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const tableBooks: BookTableItem[] = books.map((book) => ({
  id: book.id,

  title: book.title,
  subtitle: book.subtitle,

  coverImage: book.coverImage,

  featured: book.featured,
  published: book.published,

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