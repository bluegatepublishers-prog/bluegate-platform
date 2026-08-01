import { getMentorDashboard } from "@/lib/mentor-dashboard";

export default async function MentorHelpPage() {
  const dashboard = await getMentorDashboard();
  const firstScope = dashboard.assignments[0];

  return (
    <main className="space-y-6">
      <header className="rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Mentor Support</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Help & Support</h1>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Contact School Office</h2>
        <p className="mt-2 text-sm text-slate-600">For assignment corrections, school-access issues, or student profile concerns, contact your school office administrator.</p>
        {firstScope ? (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">School</dt><dd className="mt-1 font-semibold">{firstScope.assignment.student.school.schoolName}</dd></div>
            <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Publisher</dt><dd className="mt-1 font-semibold">{dashboard.mentor.publisher.name}</dd></div>
          </dl>
        ) : null}
      </section>
    </main>
  );
}
