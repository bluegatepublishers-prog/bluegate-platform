import { School } from "lucide-react";

import ClassesView from "@/components/classroom/ClassesView";
import { getTeacherClasses } from "@/lib/classroom";
import { requireTeacher } from "@/lib/teacher-dashboard";

export const dynamic = "force-dynamic";

export default async function TeacherClassesPage() {
  const [classes, teacher] = await Promise.all([getTeacherClasses(), requireTeacher()]);
  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="font-bold text-blue-700">Teacher classroom</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">My Classes</h1>
        <p className="mt-2 max-w-2xl text-slate-600">Only classes officially assigned by your school appear here.</p>
      </header>
      {classes.length ? (
        <ClassesView classes={classes} userId={teacher.userId} />
      ) : (
        <section className="rounded-2xl border bg-white p-10 text-center shadow-sm">
          <School className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-xl font-bold">No assigned classes yet</h2>
          <p className="mt-2 text-slate-600">Ask your school administrator to add a class or subject assignment.</p>
        </section>
      )}
    </main>
  );
}
