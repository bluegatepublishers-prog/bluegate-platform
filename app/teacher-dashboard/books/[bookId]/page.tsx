import { notFound } from "next/navigation";
import SmartBookReader from "@/components/books/SmartBookReader";
import { loadSmartBookStructuredContent } from "@/lib/content-delivery";
import { getSmartBookContents } from "@/lib/smart-book-reader";
import { getTeacherBook } from "@/lib/teacher-books";

export default async function TeacherBookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const book = await getTeacherBook(bookId);
  if (!book) notFound();
  const [contents, content] = await Promise.all([
    getSmartBookContents(book.id),
    loadSmartBookStructuredContent({ publisherId: book.publisherId, bookId: book.id, mode: "TEACHER" }),
  ]);
  return <main className="min-h-screen bg-slate-50 p-3 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl"><SmartBookReader role="TEACHER" bookId={book.id} title={book.title} contents={contents} teacherResources={book.teacherResources} document={content?.document} linkedAssets={content?.linkedAssets} activities={content?.activities} worksheets={content?.worksheets} media={content?.media} sections={content?.sections} knowledgeDefinitions={content?.knowledgeDefinitions} resourceUrls={content?.v2ResourceUrls} /></div></main>;
}
