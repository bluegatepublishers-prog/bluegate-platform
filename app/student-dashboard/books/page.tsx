import StudentLibraryBookCard from "@/components/student/StudentLibraryBookCard";
import { requireStudent } from "@/lib/student-dashboard";
import { getStudentBooks } from "@/lib/student-books";

export default async function StudentBooksPage() {
  const identity = await requireStudent();
  const books = await getStudentBooks();
  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <header><p className="text-sm font-bold text-blue-700">{identity.enrollment.schoolClass.name} · Section {identity.enrollment.section.name}</p><h1 className="mt-1 text-3xl font-bold">My Books</h1><p className="mt-2 text-slate-600">Read the books approved by your school for {identity.academicYear.name}.</p></header>
      {books.length ? <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{books.map((book) => <StudentLibraryBookCard key={book.id} book={book} />)}</section> : <section className="rounded-3xl border bg-white p-12 text-center shadow-sm"><h2 className="text-2xl font-bold">No approved books are available yet.</h2><p className="mt-3 text-slate-600">Your school will add books for your subjects.</p></section>}
    </main>
  );
}
