import { CircleUserRound } from "lucide-react";
import { requireStudent } from "@/lib/student-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentProfilePage() {
  const { student, enrollment, school, academicYear, effectivePlan } = await requireStudent();
  const fields = [
    ["Full name", student.name],
    ["Admission number", student.admissionNumber],
    ["Email", student.email ?? "Not provided"],
    ["School", school.schoolName],
    ["Class", enrollment.schoolClass.name],
    ["Section", enrollment.section.name],
    ["Roll number", enrollment.rollNumber ?? "Not assigned"],
    ["Academic year", academicYear.name],
    ["Access plan", formatPlan(effectivePlan.plan)],
  ];
  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="mt-2 text-slate-600">Your school-managed identity and current enrollment. Contact your school to request changes.</p>
      </header>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
            <CircleUserRound className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{student.name}</h2>
            <p className="text-slate-600">{formatPlan(effectivePlan.plan)}</p>
          </div>
        </div>
      </section>

      <dl className="grid gap-4 rounded-3xl border bg-white p-6 shadow-sm md:grid-cols-2">
        {fields.map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-2 font-semibold text-slate-900">{value}</dd></div>)}
      </dl>


    </main>
  );
}

function formatPlan(plan: string) {
  return plan.split("_").map((part) => part[0] + part.slice(1).toLowerCase()).join(" ");
}
