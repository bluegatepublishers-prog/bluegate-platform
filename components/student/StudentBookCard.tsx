import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { StudentSubjectViewModel } from "@/lib/student-subject-policy";
import type { StudentBookViewModel } from "@/lib/student-books";

export default function StudentBookCard({ book, progress }: { book: StudentSubjectViewModel["book"]; progress?: StudentBookViewModel["progress"] }) {
  if (!book) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">No approved book is available for this subject yet.</div>;
  }
  return (
    <article className="grid gap-6 rounded-3xl border bg-white p-6 shadow-sm sm:grid-cols-[144px_1fr]">
      {book.coverImage ? (
        <Image src={book.coverImage} alt={`${book.title} cover`} width={144} height={204} className="mx-auto h-51 w-36 rounded-xl object-cover shadow" unoptimized />
      ) : (
        <div className="mx-auto flex h-51 w-36 items-center justify-center rounded-xl bg-slate-100"><BookOpen className="h-10 w-10 text-slate-300" /></div>
      )}
      <div className="self-center">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Approved Book</p>
        <h2 className="mt-2 text-2xl font-bold">{book.title}</h2>
        <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <div><dt className="font-semibold text-slate-900">Series</dt><dd>{book.series ?? "Not specified"}</dd></div>
          <div><dt className="font-semibold text-slate-900">Class</dt><dd>{book.className}</dd></div>
          <div><dt className="font-semibold text-slate-900">Subject</dt><dd>{book.subjectName}</dd></div>
        </dl>
        {progress && <p className="mt-4 text-sm font-semibold text-blue-800">{progress.completed ? "Completed" : `Last read: page ${progress.lastPage}${progress.totalPages ? ` of ${progress.totalPages}` : ""}`}</p>}
        <Link href={`/student-dashboard/books/${book.id}`} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">{progress && !progress.completed ? "Continue Reading" : "Read Full Book"}</Link>
      </div>
    </article>
  );
}
