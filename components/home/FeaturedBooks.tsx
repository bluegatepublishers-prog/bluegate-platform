import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Star,
  Eye,
  FileText,
  BookOpen,
  GraduationCap,
  Layers3,
  Sparkles,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

export default async function FeaturedBooks() {
  const books = await prisma.book.findMany({
  where: { published: true, featured: true },
  select: {
    id: true, slug: true, title: true, subtitle: true, description: true,
    coverImage: true, samplePdf: true,
    class: { select: { name: true } },
    subject: { select: { name: true } },
    series: { select: { name: true } },
  },
  orderBy: {
    createdAt: "desc",
  },
  take: 4,
  });

  if (!books.length) return null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100 py-24">

      {/* Background Decorations */}

      <div className="absolute left-0 top-0 h-80 w-80 rounded-full bg-blue-100 blur-3xl opacity-40" />

      <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-cyan-100 blur-3xl opacity-40" />

      <div className="mx-auto max-w-7xl px-6">

        {/* Header */}

        <div className="mx-auto mb-18 max-w-4xl text-center">

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

        {/* Quick Browse */}

        <div className="mb-14 flex flex-wrap justify-center gap-3">

          <Link
            href="/books"
            className="rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            All Books
          </Link>

          <Link
            href="/books?class=primary"
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-600 hover:text-blue-700"
          >
            Primary
          </Link>

          <Link
            href="/books?class=middle"
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-600 hover:text-blue-700"
          >
            Middle
          </Link>

          <Link
            href="/books?class=secondary"
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-600 hover:text-blue-700"
          >
            Secondary
          </Link>

          <Link
            href="/books?subject=english"
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-600 hover:text-blue-700"
          >
            English
          </Link>

          <Link
            href="/books?subject=mathematics"
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-600 hover:text-blue-700"
          >
            Mathematics
          </Link>

          <Link
            href="/books?subject=science"
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-600 hover:text-blue-700"
          >
            Science
          </Link>

        </div>

        {/* Books Grid */}

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">

          {books.map((book) => (

            <div
              key={book.id}
              className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >

              <div className="relative bg-gradient-to-br from-slate-100 via-white to-slate-50 p-6">

                <div className="absolute left-5 top-5 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">

                  <div className="flex items-center gap-1">
                    <Star size={12} />
                    Featured
                  </div>

                </div>

                <div className="absolute right-5 top-5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  {book.class.name}
                </div>

                <div className="flex justify-center">

                  <Image
                    src={
                      book.coverImage ||
                      "/images/book-placeholder.jpg"
                    }
                    alt={book.title}
                    width={220}
                    height={310}
                    className="rounded-xl shadow-xl transition duration-500 group-hover:scale-105"
                  />

                </div>

              </div>

              <div className="p-6">

                <div className="mb-4 flex flex-wrap gap-2">

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {book.subject.name}
                  </span>

                  {book.series && (

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      {book.series.name}
                    </span>

                  )}

                </div>

                <h3 className="text-xl font-bold text-slate-900">
                  {book.title}
                </h3>

                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                  {book.subtitle || book.description}
                </p>

                <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">

  <div className="flex items-center gap-3 text-sm text-slate-700">

    <GraduationCap
      size={18}
      className="text-blue-600"
    />

    <span>

      <strong>Class:</strong> {book.class.name}

    </span>

  </div>

  <div className="flex items-center gap-3 text-sm text-slate-700">

    <BookOpen
      size={18}
      className="text-emerald-600"
    />

    <span>

      <strong>Subject:</strong> {book.subject.name}

    </span>

  </div>

  {book.series && (

    <div className="flex items-center gap-3 text-sm text-slate-700">

      <Layers3
        size={18}
        className="text-violet-600"
      />

      <span>

        <strong>Series:</strong> {book.series.name}

      </span>

    </div>

  )}

  <div className="flex items-center gap-3 text-sm text-slate-700">

    <Sparkles
      size={18}
      className="text-amber-500"
    />

    <span>

      NEP 2020 & NCF Aligned

    </span>

  </div>

</div>
<div className="mt-6 rounded-xl bg-blue-50 px-4 py-3 text-center text-sm font-medium text-blue-700">

  Designed for Modern Classrooms • NEP 2020

</div>
                                <div className="mt-8 grid grid-cols-2 gap-3">

                  <Link
                    href={`/books/${book.slug}`}
                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Eye size={16} />
                    View Book
                  </Link>

                  {book.samplePdf ? (
                    <Link
                      href={`/books/${book.slug}`}
                      className="flex items-center justify-center gap-2 rounded-xl border border-blue-600 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                    >
                      <FileText size={16} />
                      Sample PDF
                    </Link>
                  ) : (
                    <Link
                      href={`/books/${book.slug}`}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      <FileText size={16} />
                      Preview
                    </Link>
                  )}

                </div>

              </div>

            </div>

          ))}

        </div>

        {/* Bottom Button */}

        <div className="mt-16 text-center">

          <Link
            href="/books"
            className="inline-flex items-center gap-3 rounded-2xl bg-blue-700 px-10 py-4 text-lg font-semibold text-white transition hover:bg-blue-800"
          >
            View Complete Catalogue

            <ArrowRight
              size={20}
            />

          </Link>

        </div>

      </div>

    </section>
  );
}
