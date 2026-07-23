import { Suspense } from "react";
import { BookOpen, Search } from "lucide-react";
import StudentLibraryBookCard from "@/components/student/StudentLibraryBookCard";
import { requireStudent } from "@/lib/student-dashboard";
import { getStudentBooks } from "@/lib/student-books";
import { getStudentSubjects } from "@/lib/student-subjects";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentBooksPage() {
  const identity = await requireStudent();
  const [books, subjects] = await Promise.all([getStudentBooks(), getStudentSubjects()]);
  const subjectNames = new Map(subjects.map((s) => [s.sectionSubjectId, s.subjectName]));
  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-sm font-bold text-blue-700">{identity.enrollment.schoolClass.name} · Section {identity.enrollment.section.name}</p>
        <h1 className="mt-1 text-3xl font-bold">My Books</h1>
        <p className="mt-2 text-slate-600">Read the books approved by your school for {identity.academicYear.name}.</p>
      </header>

      {books.length ? (
        <>
          <Suspense fallback={null}>
            <BookSearch books={books} subjectNames={subjectNames} />
          </Suspense>
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" data-testid="books-grid">
            {books.map((book) => (
              <StudentLibraryBookCard key={book.id} book={book} />
            ))}
          </section>
        </>
      ) : (
        <section className="rounded-3xl border bg-white p-12 text-center shadow-sm">
          <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-2xl font-bold">No approved books are available yet.</h2>
          <p className="mt-3 text-slate-600">Your school will add books for your subjects.</p>
        </section>
      )}
    </main>
  );
}

function BookSearch({ books, subjectNames }: { books: Awaited<ReturnType<typeof getStudentBooks>>; subjectNames: Map<string, string> }) {
  const grouped = books.reduce(
    (acc, book) => {
      const key = subjectNames.get(book.sectionSubjectId) ?? "General";
      (acc[key] ??= []).push(book);
      return acc;
    },
    {} as Record<string, typeof books>,
  );
  return (
    <section className="rounded-3xl border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <Search className="h-5 w-5 text-slate-400" />
        <input type="search" placeholder="Search books by title or subject..." className="flex-1 border-0 bg-transparent text-sm outline-none placeholder-slate-400 focus:ring-0" aria-label="Search books" />
      </div>
      <p className="mt-4 text-sm text-slate-500">{books.length} book{books.length !== 1 ? "s" : ""} · {Object.keys(grouped).length} subject{Object.keys(grouped).length !== 1 ? "s" : ""}</p>
      <div className="mt-4 space-y-6">
        {Object.entries(grouped).map(([subject, subjectBooks]) => (
          <div key={subject}>
            <h2 className="text-lg font-bold text-slate-800">{subject}</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {subjectBooks.map((book) => (
                <StudentLibraryBookCard key={book.id} book={book} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
