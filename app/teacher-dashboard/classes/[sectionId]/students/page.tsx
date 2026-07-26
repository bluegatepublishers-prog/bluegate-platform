import { UsersRound } from "lucide-react";

import { getTeacherClassStudents } from "@/lib/classroom";

export default async function TeacherClassStudentsPage({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const { enrollments } = await getTeacherClassStudents(sectionId);
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3"><UsersRound className="h-6 w-6 text-blue-600" /><div><h2 className="text-2xl font-bold">Students</h2><p className="text-sm text-slate-600">Current active enrolments in this section.</p></div></div>
      {enrollments.length ? (
        <div className="mt-6 space-y-3">
          {enrollments.map((enrollment) => (
            <article key={enrollment.id} className="grid min-w-0 gap-2 rounded-xl border p-4 sm:grid-cols-[80px_1fr_auto] sm:items-center">
              <p className="text-sm font-bold text-slate-500">Roll {enrollment.rollNumber ?? "—"}</p>
              <div className="min-w-0"><h3 className="break-words font-bold">{enrollment.student.name}</h3><p className="break-words text-sm text-slate-600">{enrollment.student.admissionNumber}</p></div>
              <p className="text-sm text-slate-500">{enrollment.student.userId ? "Login active" : "Login not activated"}</p>
            </article>
          ))}
        </div>
      ) : <p className="mt-6 rounded-xl bg-slate-50 p-8 text-center text-slate-600">No active students are enrolled in this section.</p>}
    </section>
  );
}
