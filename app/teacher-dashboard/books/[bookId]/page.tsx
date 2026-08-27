import { notFound } from "next/navigation";
import SmartBookReader from "@/components/books/SmartBookReader";
import { loadTeacherSmartBookRuntime } from "@/lib/teacher-smart-book-runtime";

import { getTeacherBook } from "@/lib/teacher-books";

function UnavailableBook() {
  return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-2xl rounded-2xl border bg-white p-8 text-center"><h1 className="text-xl font-bold">This Smart Book is currently unavailable.</h1></div></main>;
}
export default async function TeacherBookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const book = await getTeacherBook(bookId);
  if (!book) notFound();
  const { contents, content } = await loadTeacherSmartBookRuntime(book);
  if (!content) return <UnavailableBook />;
  return <main className="min-h-screen bg-slate-50 p-3 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl"><SmartBookReader role="TEACHER" bookId={book.id} title={book.title} contents={contents} teacherResources={book.teacherResources} pdfUrl={content?.releaseVersionId ? `/api/books/${book.id}/full-pdf?releaseVersionId=${encodeURIComponent(content.releaseVersionId)}` : undefined} immutableRelease={Boolean(content?.releaseVersionId)} document={content?.document} linkedAssets={content?.linkedAssets} activities={content?.activities} worksheets={content?.worksheets} media={content?.media} sections={content?.sections} knowledgeDefinitions={content?.knowledgeDefinitions} resourceUrls={content?.v2ResourceUrls} /></div></main>;
}
