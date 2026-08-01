import { getMentorStudentProfile } from "@/lib/mentor-dashboard";

export default async function MentorStudentReportsPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const profile = await getMentorStudentProfile(studentId);

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Student Reports</h2>
        <p className="mt-2 text-sm text-slate-600">Read-only progress summary for this assigned student.</p>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Learning trend</dt><dd className="mt-1 font-semibold">{profile.analytics ? `${Math.round(profile.analytics.readingPercent)}% reading` : "Not available"}</dd></div>
          <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Practice average</dt><dd className="mt-1 font-semibold">{profile.analytics?.averagePractice == null ? "Not available" : `${Math.round(profile.analytics.averagePractice)}%`}</dd></div>
          <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Assessment average</dt><dd className="mt-1 font-semibold">{profile.analytics?.averageAssessment == null ? "Not available" : `${Math.round(profile.analytics.averageAssessment)}%`}</dd></div>
          <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Open learning gaps</dt><dd className="mt-1 font-semibold">{profile.gaps.length}</dd></div>
          <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Completed remedials</dt><dd className="mt-1 font-semibold">{profile.remedials.filter((item) => item.status === "COMPLETED").length}</dd></div>
          <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Sessions completed</dt><dd className="mt-1 font-semibold">{profile.sessions.filter((item) => item.status === "COMPLETED").length}</dd></div>
        </dl>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Mentor Summary</h2>
        <p className="mt-3 text-sm text-slate-700">This summary is generated from assigned-student analytics, learning gaps, remedial progress, sessions, and mentor notes. No speculative scoring is included.</p>
      </section>
    </main>
  );
}
