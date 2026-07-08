"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, BookOpen } from "lucide-react";

export interface BookTableItem {
  id: string;

  title: string;
  subtitle: string | null;

  coverImage: string | null;

  featured: boolean;
  published: boolean;

  class: {
    name: string;
  };

  subject: {
    name: string;
  };

  series: {
    name: string;
  } | null;
}

interface BookTableProps {
  books: BookTableItem[];
}

export default function BookTable({
  books,
}: BookTableProps) {
  const router = useRouter();

  async function deleteBook(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this book?"
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/books/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Unable to delete book.");
        return;
      }

      alert("Book deleted successfully.");

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    }
  }

  if (books.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center shadow-sm">
        <BookOpen className="mx-auto mb-4 h-12 w-12 text-slate-300" />

        <h2 className="text-2xl font-semibold text-slate-800">
          No Books Found
        </h2>

        <p className="mt-2 text-slate-500">
          Create your first book to get started.
        </p>

        <Link
          href="/admin/books/new"
          className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Add First Book
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold">
              Book
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold">
              Class
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold">
              Subject
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold">
              Series
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold">
              Featured
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold">
              Status
            </th>
            <th className="px-6 py-4 text-right text-sm font-semibold">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {books.map((book) => (
            <tr
              key={book.id}
              className="border-t border-slate-100 hover:bg-slate-50"
            >
              <td className="px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100">
                    <BookOpen className="h-7 w-7 text-blue-700" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {book.title}
                    </h3>

                    {book.subtitle && (
                      <p className="text-sm text-slate-500">
                        {book.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              </td>

              <td className="px-6 py-5">
                {book.class.name}
              </td>

              <td className="px-6 py-5">
                {book.subject.name}
              </td>

              <td className="px-6 py-5">
                {book.series?.name ?? "-"}
              </td>

              <td className="px-6 py-5">
                {book.featured ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Yes
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                    No
                  </span>
                )}
              </td>

              <td className="px-6 py-5">
                {book.published ? (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    Published
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    Draft
                  </span>
                )}
              </td>

              <td className="px-6 py-5">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/admin/books/${book.id}/edit`}
                    className="rounded-lg border border-slate-300 p-2 hover:bg-slate-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => deleteBook(book.id)}
                    className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}