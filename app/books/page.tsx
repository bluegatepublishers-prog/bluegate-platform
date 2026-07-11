import BooksHero from "@/components/books/BooksHero";
import BookPageClient from "@/components/books/BookPageClient";

import { prisma } from "@/lib/prisma";
import { Book } from "@/types/book";

interface BooksPageProps {
  searchParams: Promise<{
    class?: string;
    subject?: string;
  }>;
}

export default async function BooksPage({
  searchParams,
}: BooksPageProps) {
  const params = await searchParams;

  const dbBooks = await prisma.book.findMany({
    where: {
      published: true,
    },
    select: {
      id:true,slug:true,title:true,subtitle:true,description:true,coverImage:true,publicPreviewPdf:true,samplePdf:true,featured:true,isbn:true,
      class:{select:{name:true}},
      subject:{select:{name:true}},
      series:{select:{name:true}},
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
    publicPreviewPdf: book.publicPreviewPdf || book.samplePdf || "",
    description: book.description ?? "",
    featured: book.featured,
  }));

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <BooksHero />

      {/* Catalogue */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900">
            Bluegate Book Catalogue
          </h1>

          <p className="mt-3 max-w-2xl text-lg text-slate-600">
            Explore our curriculum-aligned books designed for schools,
            teachers and students. Browse by class, subject and series to
            discover the perfect learning resources.
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
