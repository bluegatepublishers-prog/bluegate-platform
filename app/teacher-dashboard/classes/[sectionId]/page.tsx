import Link from "next/link";
import { BookOpen, FolderOpen, UsersRound } from "lucide-react";

import { getTeacherClassOverview } from "@/lib/classroom";

export default async function TeacherClassOverviewPage({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const { scope, studentCount, materialCount, sharedMaterialCount } = await getTeacherClassOverview(sectionId);
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric icon={UsersRound} label="Students" value={studentCount} />
        <Metric icon={FolderOpen} label="Your materials" value={materialCount} />
        <Metric icon={BookOpen} label="Shared now" value={sharedMaterialCount} />
      </section>
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">Teaching subjects</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {scope.sectionSubjects.map((item) => {
            const adoption = item.bookAdoptions[0];
            return (
              <article key={item.id} className="rounded-2xl border p-5">
                <h3 className="text-lg font-bold">{item.subject.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{adoption ? `${adoption.book.title} · ${adoption.book.chapters.length} approved chapters` : "No approved book yet"}</p>
                <Link href={`/teacher-dashboard/classes/${sectionId}/materials`} className="mt-4 inline-flex min-h-11 items-center font-bold text-blue-700">Manage materials →</Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: number }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><Icon className="h-7 w-7 text-blue-600" /><p className="mt-4 text-3xl font-bold">{value}</p><p className="text-sm text-slate-600">{label}</p></div>;
}
