import { notFound } from "next/navigation";
import SmartBookReader from "@/components/books/SmartBookReader";
import { loadSmartBookStructuredContent } from "@/lib/content-delivery";
import { getSmartBookContents } from "@/lib/smart-book-reader";
import { getStudentBook } from "@/lib/student-books";

export default async function StudentBookPage({ params, searchParams }: { params: Promise<{ bookId: string }>; searchParams: Promise<{ page?: string }> }) {
  const { bookId } = await params;
  const book = await getStudentBook(bookId);
  if (!book) notFound();
  const requested = Number((await searchParams).page);
  const initialPage = Number.isInteger(requested) && requested >= 1 ? requested : book.progress?.lastPage ?? 1;
  const [contents, content] = await Promise.all([
    getSmartBookContents(book.id),
    loadSmartBookStructuredContent({ publisherId: await getStudentPublisherId(), bookId: book.id, mode: "STUDENT", requirePublishedRelease: true }),
  ]);
  return <main className="min-h-screen bg-slate-50 p-3 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl"><SmartBookReader role="STUDENT" bookId={book.id} title={book.title} subjectPath={`/student-dashboard/subjects/${book.sectionSubjectId}`} initialPage={initialPage} initialTotalPages={book.progress?.totalPages} initialBookmarks={book.bookmarkPages} contents={contents} document={content?.document} linkedAssets={content?.linkedAssets} activities={content?.activities} worksheets={content?.worksheets} media={content?.media} sections={content?.sections} knowledgeDefinitions={content?.knowledgeDefinitions} resourceUrls={content?.v2ResourceUrls} /></div></main>;
}

async function getStudentPublisherId() {
  const { requireStudent } = await import("@/lib/student-dashboard");
  const identity = await requireStudent();
  return identity.publisher.id;
}
