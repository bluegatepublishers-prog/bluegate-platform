import { getMentorDashboard, getMentorReport } from "@/lib/mentor-dashboard";

type SearchParams = Promise<{
  className?: string;
  section?: string;
  student?: string;
  subject?: string;
  supportStatus?: string;
}>;

export default async function MentorReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [report, dashboard] = await Promise.all([getMentorReport(), getMentorDashboard()]);

  const classOptions = [...new Set(dashboard.assignments.map((item) => item.enrollment.schoolClass.name))];
  const sectionOptions = [...new Set(dashboard.assignments.map((item) => item.enrollment.section.name))];

  const scopeByStudent = new Map(
    dashboard.assignments.map((item) => [
      item.assignment.student.id,
      {
        className: item.enrollment.schoolClass.name,
        sectionName: item.enrollment.section.name,
      },
    ]),
  );

  let rows = report.rows.map((row) => ({ ...row, scope: scopeByStudent.get(row.id) }));

  if (params.className) rows = rows.filter((row) => row.scope?.className === params.className);
  if (params.section) rows = rows.filter((row) => row.scope?.sectionName === params.section);
  if (params.student) rows = rows.filter((row) => row.id === params.student);
  if (params.supportStatus) rows = rows.filter((row) => params.supportStatus === "has-gaps" ? row.openGaps > 0 : row.openGaps === 0);

  return (
    <main className="space-y-6">
      <header className="rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Mentor Reports</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Reports</h1>
        <p className="mt-2 text-slate-600">Assigned Student Summary, Progress, Learning Gaps, Remedial Progress, Session Summary, Follow-up Due, and Support Outcomes.</p>
      </header>

      <form className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-6" method="get">
        <select name="className" defaultValue={params.className ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Classes</option>
          {classOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select name="section" defaultValue={params.section ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Sections</option>
          {sectionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select name="student" defaultValue={params.student ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Students</option>
          {report.rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
        <input name="subject" defaultValue={params.subject ?? ""} placeholder="Subject filter" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        <select name="supportStatus" defaultValue={params.supportStatus ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Support Status</option>
          <option value="has-gaps">Has Active Gaps</option>
          <option value="stable">No Active Gaps</option>
        </select>
        <button type="submit" className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">Apply</button>
      </form>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Assigned Student Summary", report.studentsAssigned],
          ["Remedial Progress", report.completedRemedials],
          ["Learning Gaps", report.openGaps],
        ].map(([label, value]) => (
          <article key={String(label)} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
          </article>
        ))}
      </section>

      {rows.length ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {rows.map((row) => (
            <article key={row.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">{row.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{row.scope?.className ?? row.className} · Section {row.scope?.sectionName ?? row.sectionName}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-slate-500">Student Progress</dt><dd className="mt-1 font-semibold">{row.trend}</dd></div>
                <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-slate-500">Session Summary</dt><dd className="mt-1 font-semibold">{row.studyConsistency}</dd></div>
                <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-slate-500">Support Outcomes</dt><dd className="mt-1 font-semibold">{row.completedRemedials} closed</dd></div>
                <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-slate-500">Follow-up Due</dt><dd className="mt-1 font-semibold">{row.openGaps > 0 ? `${row.openGaps} open` : "No open follow-ups"}</dd></div>
              </dl>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">No report rows match the selected filters.</section>
      )}
    </main>
  );
}
