import BooksHero from "@/components/books/BooksHero";
import BookPageClient from "@/components/books/BookPageClient";

import { prisma } from "@/lib/prisma";
import { Book } from "@/types/book";

interface PageProps {
  searchParams: Promise<{
    class?: string;
    subject?: string;
  }>;
}

export default async function BooksPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const dbBooks = await prisma.book.findMany({
    where: {
      published: true,
    },
    include: {
      class: true,
      subject: true,
      series: true,
    },
    orderBy: {
      title: "asc",
    },
  });

  const books: Book[] = dbBooks.map((book) => ({
    id: book.id,
    slug: book.slug,
    title: book.title,
    subtitle: book.subtitle ?? "",
    class: book.class.name,
    board: "CBSE",
    subject: book.subject.name,
    series: book.series?.name ?? "",
    isbn: book.isbn ?? "",
    pages: 0,
    cover: book.coverImage || "/images/book-placeholder.jpg",
    pdf: book.samplePdf || "",
    description: book.description ?? "",
    featured: book.featured,
  }));

  return (
    <main className="min-h-screen bg-slate-50">
      <BooksHero />

      <section className="mx-auto max-w-7xl px-6 py-16">

        <div className="mb-8">
          <h2 className="text-4xl font-bold text-slate-900">
            Book Catalogue
          </h2>

          <p className="mt-3 text-lg text-slate-600">
            Browse books by class, subject and series.
          </p>
        </div>

        <BookPageClient
          books={books}
          initialClass={params.class ?? ""}
          initialSubject={params.subject ?? ""}
        />

      </section>
    </main>
  );
}