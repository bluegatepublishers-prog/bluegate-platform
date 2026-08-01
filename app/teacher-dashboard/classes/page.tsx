import { School } from "lucide-react";

import ClassesView from "@/components/classroom/ClassesView";
import { getTeacherClasses } from "@/lib/classroom";
import { requireTeacher } from "@/lib/teacher-dashboard";

export const dynamic = "force-dynamic";

export default async function TeacherClassesPage() {
  const [classes, teacher] = await Promise.all([getTeacherClasses(), requireTeacher()]);
  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
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
