import Link from "next/link";
import { notFound } from "next/navigation";
import StudentPdfReader from "@/components/student/StudentPdfReader";
import { requireStudent } from "@/lib/student-dashboard";
import { getStudentBook } from "@/lib/student-books";
import { getStudentRevisionChapters } from "@/lib/student-revision";

export default async function StudentBookReaderPage({ params }: { params: Promise<{ bookId: string }> }) {
  await requireStudent();
  const { bookId } = await params;
  const book = await getStudentBook(bookId);
  if (!book) notFound();
  const chapters = await getStudentRevisionChapters(bookId);
  return (
    <main className="space-y-5 p-3 sm:p-5 lg:p-7">
      <header><p className="text-sm font-bold text-blue-700">{book.subjectName} · {book.className}</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">{book.title}</h1><p className="mt-2 text-sm text-slate-600">Your reading position is saved after page changes. Downloads are not provided in the student reader.</p></header>
      <StudentPdfReader
        bookId={book.id}
        title={book.title}
        subjectPath={`/student-dashboard/subjects/${book.sectionSubjectId}`}
        initialPage={book.progress?.lastPage ?? 1}
        initialTotalPages={book.progress?.totalPages ?? null}
        initialBookmarks={book.bookmarkPages}
      />
      <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold">Chapter Revision Hubs</h2>
        <p className="mt-2 text-slate-600">Review approved chapter summaries, keywords, learning outcomes, and revision cards.</p>
        {chapters.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{chapters.map((chapter) => <Link key={chapter.id} href={`/student-dashboard/books/${book.id}/chapters/${chapter.id}/revision`} className="rounded-2xl border bg-slate-50 p-5 focus-visible:outline-2 focus-visible:outline-blue-700"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Chapter {chapter.chapterNumber}</p><h3 className="mt-2 font-bold">{chapter.title}</h3>{chapter.revisionCompleted && <p className="mt-3 text-sm font-semibold text-green-700">Revision Completed</p>}</Link>)}</div> : <p className="mt-5 rounded-2xl border border-dashed bg-slate-50 p-5 text-slate-500">No approved chapter revision content is available yet.</p>}
      </section>
    </main>
  );
}
