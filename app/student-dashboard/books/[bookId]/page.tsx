import { notFound } from "next/navigation";
import SmartBookReader from "@/components/books/SmartBookReader";
import { loadSmartBookStructuredContent } from "@/lib/content-delivery";
import { getSmartBookContents } from "@/lib/smart-book-reader";
import { getStudentBook } from "@/lib/student-books";
import { resolvePublishedSmartBookContent } from "@/lib/smart-book-release-runtime";

export default async function StudentBookPage({ params, searchParams }: { params: Promise<{ bookId: string }>; searchParams: Promise<{ page?: string }> }) {
  const { bookId } = await params;
  const book = await getStudentBook(bookId);
  if (!book) notFound();
  const requested = Number((await searchParams).page);
  const initialPage = Number.isInteger(requested) && requested >= 1 ? requested : book.progress?.lastPage ?? 1;
  const publisherId = await getStudentPublisherId();
  const release = await resolvePublishedSmartBookContent({ publisherId, bookId: book.id });
  if (!release) return <UnavailableBook />;
  const [contents, content] = await Promise.all([
    getSmartBookContents(book.id, { manifest: release.manifest }),
    loadSmartBookStructuredContent({ publisherId, bookId: book.id, mode: "STUDENT", requirePublishedRelease: true, publishedContent: release }),
  ]);
  return <main className="min-h-screen bg-slate-50 p-3 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl"><SmartBookReader role="STUDENT" bookId={book.id} title={book.title} subjectPath={`/student-dashboard/subjects/${book.sectionSubjectId}`} initialPage={initialPage} initialTotalPages={book.progress?.totalPages} initialBookmarks={book.bookmarkPages} pdfUrl={content?.releaseVersionId ? `/api/books/${book.id}/full-pdf?releaseVersionId=${encodeURIComponent(content.releaseVersionId)}` : undefined} contents={contents} immutableRelease={Boolean(content?.releaseVersionId)} document={content?.document} linkedAssets={content?.linkedAssets} activities={content?.activities} worksheets={content?.worksheets} media={content?.media} sections={content?.sections} knowledgeDefinitions={content?.knowledgeDefinitions} resourceUrls={content?.v2ResourceUrls} /></div></main>;
}

function UnavailableBook() {
  return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-2xl rounded-2xl border bg-white p-8 text-center"><h1 className="text-xl font-bold">This Smart Book is currently unavailable.</h1></div></main>;
}
async function getStudentPublisherId() {
  const { requireStudent } = await import("@/lib/student-dashboard");
  const identity = await requireStudent();
  return identity.publisher.id;
}
