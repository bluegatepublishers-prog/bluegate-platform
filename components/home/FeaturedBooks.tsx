import Image from "next/image";
import { Star } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { bookCoverPath } from "@/lib/storage/book-asset-path";

export default async function FeaturedBooks() {
  const books = await prisma.book.findMany({
    where: { published: true, featured: true },
    select: {
      id: true,
      slug: true,
      title: true,
      coverImage: true,
      board: true,
      price: true,
      subject: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  if (!books.length) return null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100 py-20">

      {/* Background Decorations */}

      <div className="absolute left-0 top-0 h-80 w-80 rounded-full bg-blue-100 blur-3xl opacity-40" />

      <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-cyan-100 blur-3xl opacity-40" />

      <div className="mx-auto max-w-7xl px-6">

        {/* Header */}

        <div className="mx-auto mb-12 max-w-4xl text-center">

          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-semibold tracking-wide text-blue-700">

            📚 Bluegate Publications

          </span>

          <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 md:text-6xl">

            Explore Our

            <span className="block text-blue-700">

              Featured Titles

            </span>

          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">

            Discover curriculum-aligned books carefully developed
            for schools, teachers and students. Every publication
            combines engaging content, competency-based learning
            and modern teaching methodology.

          </p>

        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

          {books.map((book) => (

            <div
              key={book.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
            >

              <div className="relative bg-gradient-to-br from-slate-100 via-white to-slate-50 p-4">

                <div className="absolute left-5 top-5 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">

                  <div className="flex items-center gap-1">
                    <Star size={12} />
                    Featured
                  </div>

                </div>

                <div className="flex justify-center">

                  <Image
                    src={resolveCoverSrc(book.id, book.coverImage)}
                    alt={book.title}
                    width={180}
                    height={255}
                    className="h-auto w-[180px] max-w-full rounded-xl shadow-xl"
                  />

                </div>

              </div>

              <div className="space-y-4 p-4">

                <div className="flex flex-wrap gap-2">

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {book.subject.name}
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {book.board || "Board not specified"}
                  </span>

                </div>

                <h3 className="text-lg font-bold leading-6 text-slate-900">
                  {book.title}
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {book.price ? <Meta label="Rate" value={`₹${book.price}`} /> : null}
                  {book.board ? <Meta label="Board" value={book.board} /> : null}
                </div>

                <a
                  href={`/books/${book.slug}`}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  View Details
                </a>

              </div>

            </div>

          ))}

        </div>
      </div>

    </section>
  );
}

function resolveCoverSrc(bookId: string, coverImage: string | null) {
  const resolved = bookCoverPath(bookId, coverImage);
  if (!resolved) return "/images/book-placeholder.jpg";
  if (resolved.startsWith("/") || /^https?:\/\//.test(resolved)) return resolved;
  return "/images/book-placeholder.jpg";
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}
