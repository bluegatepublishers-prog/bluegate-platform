import Link from "next/link";

import { getSchoolAttendanceSessionDetail } from "@/lib/attendance";
import { lockAttendanceSessionAction, reviewAttendanceCorrectionAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function SchoolAttendanceSessionDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const data = await getSchoolAttendanceSessionDetail(sessionId);

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/school-dashboard/attendance" className="text-sm font-semibold text-blue-700">Back to Attendance</Link>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Session Detail</h1>
          <p className="mt-2 text-sm text-slate-600">
            {data.session.classSection.schoolClass.name} - {data.session.classSection.name}
            {data.session.sectionSubject?.subject.name ? ` | ${data.session.sectionSubject.subject.name}` : ""}
          </p>
          <p className="mt-1 text-sm text-slate-600">Teacher: {data.session.teacher.user.name}</p>
          <p className="mt-1 text-sm text-slate-600">Date: {data.session.date.toLocaleDateString("en-IN")} | Session Type: {data.session.sessionType} | Status: {data.status}</p>
          <p className="mt-1 text-sm text-slate-600">Locked: {data.session.locked ? "Yes" : "No"}</p>
        </div>
        {!data.session.locked && data.status === "SUBMITTED" ? (
          <form action={lockAttendanceSessionAction}>
            <input type="hidden" name="sessionId" value={data.session.id} />
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Lock Session</button>
          </form>
        ) : null}
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Roster Attendance</h2>
        <div className="mt-4 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Roll</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Remark</th>
                <th className="px-3 py-2">Marked By</th>
                <th className="px-3 py-2">Updated By</th>
                <th className="px-3 py-2">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{row.student}</td>
                  <td className="px-3 py-2">{row.rollNumber ?? "-"}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{row.remark ?? "-"}</td>
                  <td className="px-3 py-2">{row.markedBy}</td>
                  <td className="px-3 py-2">{row.updatedBy}</td>
                  <td className="px-3 py-2">{row.submittedAt ? row.submittedAt.toLocaleString("en-IN") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Correction History</h2>
        <div className="mt-4 space-y-3">
          {data.rows.some((row) => row.corrections.length > 0) ? data.rows.map((row) => row.corrections.map((correction) => (
            <article key={correction.id} className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{row.student}</p>
              <p className="mt-1 text-sm text-slate-700">{correction.previousStatus} to {correction.newStatus}</p>
              <p className="mt-1 text-sm text-slate-700">Reason: {correction.reason}</p>
              <p className="mt-1 text-xs text-slate-500">Requested: {correction.createdAt.toLocaleString("en-IN")}</p>
              <p className="mt-1 text-xs text-slate-500">Decision: {correction.decisionStatus}</p>
              {correction.decisionStatus === "PENDING" ? (
                <form action={reviewAttendanceCorrectionAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
                  <input name="decisionNote" placeholder="Decision note (optional)" className="min-h-10 rounded-xl border border-slate-300 px-3" />
                  <input type="hidden" name="correctionId" value={correction.id} />
                  <button name="decision" value="APPROVE" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Approve</button>
                  <button name="decision" value="REJECT" className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Reject</button>
                </form>
              ) : null}
            </article>
          ))) : <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">No correction history for this session.</p>}
        </div>
      </section>
    </main>
  );
}
