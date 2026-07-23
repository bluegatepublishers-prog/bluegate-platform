import Link from "next/link";
import { BookOpen, LibraryBig, Users, FileText } from "lucide-react";
import { requireStudent } from "@/lib/student-dashboard";
import { getStudentSubjects } from "@/lib/student-subjects";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentSubjectsPage() {
  const identity = await requireStudent();
  const subjects = await getStudentSubjects();
  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-sm font-bold text-blue-700">{identity.enrollment.schoolClass.name} · Section {identity.enrollment.section.name}</p>
        <h1 className="mt-1 text-3xl font-bold">My Subjects</h1>
        <p className="mt-2 text-slate-600">Open a subject to find its approved book and student learning resources.</p>
      </header>

      {subjects.length ? (
        <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {subjects.map((subject) => (
            <Link key={subject.sectionSubjectId} href={`/student-dashboard/subjects/${subject.sectionSubjectId}`} className="group block rounded-3xl border bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-900 group-hover:text-indigo-700">{subject.subjectName}</h2>
                  {subject.teacherName && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                      <Users className="h-4 w-4" />
                      <span>Teacher: {subject.teacherName}</span>
                    </p>
                  )}
                </div>
                <LibraryBig className="h-8 w-8 text-slate-300 group-hover:text-indigo-600" />
              </div>

              {subject.book ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="font-semibold text-slate-900">{subject.book.title}</p>
                      {subject.book.series && <p className="text-sm text-slate-500">{subject.book.series}</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No approved book yet.</p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600">{subject.totalStudentResources} resource{subject.totalStudentResources !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600">{subject.hasApprovedBook ? "Book assigned" : "No book"}</span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {subject.resources.slice(0, 3).map((resource) => (
                  <span key={resource.id} className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800">
                    {resource.type}
                  </span>
                ))}
                {subject.totalStudentResources > 3 && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    +{subject.totalStudentResources - 3} more
                  </span>
                )}
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="rounded-3xl border bg-white p-12 text-center shadow-sm">
          <LibraryBig className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-2xl font-bold">No subjects are available yet.</h2>
          <p className="mt-3 text-slate-600">Your school will add subjects to your class.</p>
        </section>
      )}
    </main>
  );
}
