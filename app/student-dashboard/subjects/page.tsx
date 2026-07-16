import StudentSubjectCard from "@/components/student/StudentSubjectCard";
import { requireStudent } from "@/lib/student-dashboard";
import { getStudentSubjects } from "@/lib/student-subjects";

export default async function StudentSubjectsPage() {
  const identity = await requireStudent();
  const subjects = await getStudentSubjects();
  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <header><p className="text-sm font-bold text-blue-700">{identity.enrollment.schoolClass.name} · Section {identity.enrollment.section.name}</p><h1 className="mt-1 text-3xl font-bold">My Subjects</h1><p className="mt-2 text-slate-600">Open a subject to find its approved book and student learning resources.</p></header>
      {subjects.length ? <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">{subjects.map((subject) => <StudentSubjectCard key={subject.sectionSubjectId} subject={subject} />)}</section> : <section className="rounded-3xl border bg-white p-12 text-center shadow-sm"><h2 className="text-2xl font-bold">No subjects are available yet.</h2><p className="mt-3 text-slate-600">Your school will add subjects to your class.</p></section>}
    </main>
  );
}
