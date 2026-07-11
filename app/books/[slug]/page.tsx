import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BookDetailsHero from "@/components/books/BookDetailsHero";
import BookFeatures from "@/components/books/BookFeatures";
import LearningOutcomes from "@/components/books/LearningOutcomes";
import TableOfContents from "@/components/books/TableOfContents";
import RelatedBooks from "@/components/books/RelatedBooks";

interface PageProps { params: Promise<{ slug: string }> }
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = await prisma.book.findFirst({ where: { slug, published: true }, select: { title: true, description: true, seoTitle: true, seoDescription: true, keywords: true, coverImage: true } });
  if (!book) return {};
  return { title: book.seoTitle || book.title, description: book.seoDescription || book.description || undefined, keywords: book.keywords, openGraph: book.coverImage ? { images: [book.coverImage] } : undefined };
}

export default async function BookDetailsPage({ params }: PageProps) {
  const { slug } = await params;
  const dbBook = await prisma.book.findFirst({ where: { slug, published: true }, select: { id:true,slug:true,title:true,author:true,subtitle:true,board:true,isbn:true,pages:true,coverImage:true,publicPreviewPdf:true,samplePdf:true,description:true,aboutBook:true,featured:true,edition:true,publisher:true,price:true,subjectId:true,class:{select:{name:true}},subject:{select:{name:true}},series:{select:{name:true}} } });
  if (!dbBook) notFound();
  const mapBook = (item: typeof dbBook) => ({ id: item.id, slug: item.slug, title: item.title, author: item.author ?? "", subtitle: item.subtitle ?? "", class: item.class.name, board: item.board ?? "", subject: item.subject.name, series: item.series?.name ?? "", isbn: item.isbn ?? "", pages: item.pages ?? 0, cover: item.coverImage || "/images/book-placeholder.jpg", publicPreviewPdf: item.publicPreviewPdf || item.samplePdf || "", description: item.description ?? item.aboutBook ?? "", featured: item.featured, edition: item.edition ?? "", publisher: item.publisher ?? "", price: item.price?.toString() ?? "" });
  const book = mapBook(dbBook);
  const related = await prisma.book.findMany({ where: { published: true, subjectId: dbBook.subjectId, NOT: { id: dbBook.id } }, select: { id:true,slug:true,title:true,author:true,subtitle:true,board:true,isbn:true,pages:true,coverImage:true,publicPreviewPdf:true,samplePdf:true,description:true,aboutBook:true,featured:true,edition:true,publisher:true,price:true,subjectId:true,class:{select:{name:true}},subject:{select:{name:true}},series:{select:{name:true}} }, take: 4 });
  return <main className="min-h-screen bg-slate-50"><BookDetailsHero book={book}/><section className="mx-auto max-w-5xl space-y-6 px-6 py-12"><LearningOutcomes/><BookFeatures/><TableOfContents/></section><RelatedBooks currentBook={book} books={related.map(mapBook)}/></main>;
}
