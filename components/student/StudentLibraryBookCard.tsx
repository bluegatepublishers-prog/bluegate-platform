import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { StudentBookViewModel } from "@/lib/student-books";

export default function StudentLibraryBookCard({ book }: { book: StudentBookViewModel }) {
  const action = book.progress?.completed
    ? "Read Again"
    : book.progress
      ? "Continue Reading"
      : "Read Book";
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="flex min-h-56 items-center justify-center bg-slate-50 p-6">
        {book.coverImage ? (
          <Image src={book.coverImage} alt={`${book.title} cover`} width={144} height={204} className="h-51 w-36 rounded-xl object-cover shadow" unoptimized />
        ) : (
          <div className="flex h-51 w-36 items-center justify-center rounded-xl bg-white shadow-sm"><BookOpen className="h-10 w-10 text-slate-300" /></div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">{book.subjectName}</p>
        <h2 className="mt-2 text-xl font-bold">{book.title}</h2>
        <p className="mt-2 text-sm text-slate-600">{book.series ?? "Series not specified"} · {book.className}</p>
        {book.progress && (
          <p className="mt-4 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
            {book.progress.completed
              ? "Completed"
              : `Last read: page ${book.progress.lastPage}${book.progress.totalPages ? ` of ${book.progress.totalPages}` : ""}`}
          </p>
        )}
        <Link href={`/student-dashboard/books/${book.id}`} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">{action}</Link>
      </div>
    </article>
  );
}
