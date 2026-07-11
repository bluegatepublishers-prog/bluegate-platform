import BookDetailsHero from "@/components/books/BookDetailsHero";
import BookFeatures from "@/components/books/BookFeatures";
import { Book } from "@/types/book";

const demoBook: Book = {
  id: "1",
  slug: "sample-book",
  title: "Sample Book",
  subtitle: "Coming Soon",
  class: "6",
  board: "CBSE",
  subject: "Science",
  series: "Bluegate Foundation",
  isbn: "9780000000000",
  pages: 120,
  cover: "/books/sample-book.jpg",
  publicPreviewPdf: "/sample.pdf",
  description:
    "This is a temporary placeholder book used until the dynamic Prisma-powered Book Details page is completed.",
  featured: true,
};

export default function BookDetailsPage() {
  return (
    <main className="min-h-screen bg-[#F8FBFF]">
      <BookDetailsHero book={demoBook} />
      <BookFeatures />
    </main>
  );
}
