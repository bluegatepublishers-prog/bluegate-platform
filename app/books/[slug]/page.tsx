import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import BookDetailsHero from "@/components/books/BookDetailsHero";
import BookFeatures from "@/components/books/BookFeatures";
import LearningOutcomes from "@/components/books/LearningOutcomes";
import TableOfContents from "@/components/books/TableOfContents";
import RelatedBooks from "@/components/books/RelatedBooks";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function BookDetailsPage({
  params,
}: PageProps) {
  const { slug } = await params;

  const dbBook = await prisma.book.findUnique({
    where: {
      slug,
    },
    include: {
      class: true,
      subject: true,
      series: true,
    },
  });

  if (!dbBook) {
    notFound();
  }

  const book = {
    id: dbBook.id,
    slug: dbBook.slug,
    title: dbBook.title,
    subtitle: dbBook.subtitle ?? "",
    class: dbBook.class.name,
    board: "CBSE",
    subject: dbBook.subject.name,
    series: dbBook.series?.name ?? "",
    isbn: dbBook.isbn ?? "",
    pages: 0,
    cover: dbBook.coverImage || "/images/book-placeholder.jpg",
    pdf: dbBook.samplePdf || "",
    description: dbBook.description ?? "",
    featured: dbBook.featured,
  };

  const related = await prisma.book.findMany({
    where: {
      published: true,
      subjectId: dbBook.subjectId,
      NOT: {
        id: dbBook.id,
      },
    },
    include: {
      class: true,
      subject: true,
      series: true,
    },
    take: 4,
  });

  const relatedBooks = related.map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    subtitle: item.subtitle ?? "",
    class: item.class.name,
    board: "CBSE",
    subject: item.subject.name,
    series: item.series?.name ?? "",
    isbn: item.isbn ?? "",
    pages: 0,
    cover: item.coverImage || "/images/book-placeholder.jpg",
    pdf: item.samplePdf || "",
    description: item.description ?? "",
    featured: item.featured,
  }));

  return (
    <main className="min-h-screen bg-slate-50">

      <BookDetailsHero book={book} />

      <section className="mx-auto max-w-5xl px-6 py-12 space-y-6">

        <LearningOutcomes />

        <BookFeatures />

        <TableOfContents />

      </section>

      <RelatedBooks
        currentBook={book}
        books={relatedBooks}
      />

    </main>
  );
}