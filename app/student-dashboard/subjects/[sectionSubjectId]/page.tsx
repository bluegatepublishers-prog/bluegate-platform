import Link from "next/link";
import { notFound } from "next/navigation";
import StudentBookCard from "@/components/student/StudentBookCard";
import StudentResourceGroups from "@/components/student/StudentResourceGroups";
import { requireStudent } from "@/lib/student-dashboard";
import { getStudentSubject } from "@/lib/student-subjects";
import { getStudentBooks } from "@/lib/student-books";

export default async function StudentSubjectPage({ params }: { params: Promise<{ sectionSubjectId: string }> }) {
  const identity = await requireStudent();
  const { sectionSubjectId } = await params;
  const subject = await getStudentSubject(sectionSubjectId);
  if (!subject) notFound();
  const libraryBook = subject.book ? (await getStudentBooks()).find((book) => book.id === subject.book?.id) : null;
  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <header>
        <Link href="/student-dashboard/subjects" className="text-sm font-semibold text-blue-700">← My Subjects</Link>
        <h1 className="mt-3 text-3xl font-bold">{subject.subjectName}</h1>
        <p className="mt-2 text-slate-600">{identity.enrollment.schoolClass.name} · Section {identity.enrollment.section.name} · {identity.academicYear.name}</p>
        <p className="mt-2 font-semibold text-slate-700">{subject.teacherName ?? "Teacher not assigned yet"}</p>
      </header>
      <section><h2 className="mb-4 text-2xl font-bold">Book</h2><StudentBookCard book={subject.book} progress={libraryBook?.progress} /></section>
      <section><h2 className="mb-4 text-2xl font-bold">Learning Resources</h2><StudentResourceGroups resources={subject.resources} /></section>
      <section className="rounded-3xl border border-dashed bg-white p-8"><h2 className="text-xl font-bold">Chapters and learning progress</h2><p className="mt-2 text-slate-600">Chapter learning and progress will be added in a future phase. No progress is being estimated or recorded here.</p></section>
    </main>
  );
}
