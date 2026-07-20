import type { Book } from "@/types/book";

type CatalogBookRecord = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  coverImage: string | null;
  publicPreviewPdf: string | null;
  samplePdf: string | null;
  featured: boolean;
  isbn: string | null;
  pages: number | null;
  board: string | null;
  price: unknown;
  class: { name: string };
  subject: { name: string };
  series: { name: string } | null;
};

export function mapBookToCatalogBook(book: CatalogBookRecord): Book {
  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    subtitle: book.subtitle ?? "",
    class: book.class.name,
    board: book.board ?? "",
    subject: book.subject.name,
    series: book.series?.name ?? "",
    isbn: book.isbn ?? "",
    pages: book.pages ?? 0,
    cover: book.coverImage || "/images/book-placeholder.jpg",
    publicPreviewPdf: book.publicPreviewPdf || book.samplePdf || "",
    description: book.description ?? "",
    featured: book.featured,
    publisherId: undefined,
    features: [],
    learningOutcomes: [],
    tableOfContents: [],
    weight: undefined,
    price:
      book.price === null || book.price === undefined
        ? ""
        : String(book.price),
  };
}
