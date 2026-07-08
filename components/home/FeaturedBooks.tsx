import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Star,
  BookOpen,
  Eye,
  FileText,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

export default async function FeaturedBooks() {
  const books = await prisma.book.findMany({
    where: {
      featured: true,
      published: true,
    },
    include: {
      class: true,
      subject: true,
      series: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 4,
  });

  if (books.length === 0) {
    return null;
  }

  return (
    <section className="bg-slate-50 py-24">

      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-16 text-center">

          <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-blue-700">
            Our Best Collection
          </span>

          <h2 className="mt-6 text-5xl font-bold text-slate-900">
            Featured Books
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Explore our most popular curriculum books carefully designed
            for competency-based learning, classroom engagement and
            academic excellence.
          </p>

        </div>

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

                <div className="mt-6 space-y-2">

                  <div className="flex items-center gap-2 text-sm text-slate-600">

                    <BookOpen
                      size={16}
                      className="text-emerald-600"
                    />

                    NEP 2020 Aligned

                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600">

                    <BookOpen
                      size={16}
                      className="text-emerald-600"
                    />

                    Activity Based Learning

                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600">

                    <BookOpen
                      size={16}
                      className="text-emerald-600"
                    />

                    Teacher Resource Support

                  </div>

                </div>
                                <div className="mt-8 grid grid-cols-2 gap-3">

                  <Link
                    href={`/books/${book.slug}`}
                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Eye size={16} />
                    Details
                  </Link>

                  {book.samplePdf ? (
                    <Link
                      href={`/books/${book.slug}`}
                      className="flex items-center justify-center gap-2 rounded-xl border border-blue-600 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                    >
                      <FileText size={16} />
                      Sample
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