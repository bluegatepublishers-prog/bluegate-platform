import Link from "next/link";
import SchoolFeatureUnavailable from "@/components/school/SchoolFeatureUnavailable";
import { redirect } from "next/navigation";
import { AttendanceSessionType } from "@prisma/client";

import {
  getSchoolAttendanceDashboard,
  getSchoolAttendanceReportSuite,
} from "@/lib/attendance";
import { getSchoolFeatureAccess } from "@/lib/school-feature-access";

import {
  bulkLockAttendanceDateAction,
  lockAttendanceSessionAction,
  reviewAttendanceCorrectionAction,
} from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  date?: string;
  view?: string;
  sessionType?: string;
}>;

function toDateValue(value: string | undefined) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date().toISOString().slice(0, 10);
}

function toSessionType(value: string | undefined) {
  return Object.values(AttendanceSessionType).includes(value as AttendanceSessionType)
    ? (value as AttendanceSessionType)
    : undefined;
}

function summaryPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function SchoolAttendancePage({ searchParams }: { searchParams: SearchParams }) {
  if (!(await getSchoolFeatureAccess("ATTENDANCE")).allowed) return <SchoolFeatureUnavailable label="Attendance" />;
  const query = await searchParams;
  const date = toDateValue(query.date);
  const sessionType = toSessionType(query.sessionType);
  const view = query.view === "teacher-completion" || query.view === "reports" ? query.view : "dashboard";

  const dashboard = await getSchoolAttendanceDashboard({ date, sessionType });
  const reports = view === "reports" ? await getSchoolAttendanceReportSuite({ date }) : null;

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Attendance</h1>
          <p className="mt-2 text-sm text-slate-600">Monitor submissions, lock sessions, review corrections, and manage attendance policy.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/school-dashboard/attendance/settings" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Attendance Policy</Link>
          <Link href="/school-dashboard/academics?tab=attendance" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Open in Academics</Link>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form className="grid gap-3 md:grid-cols-[220px_220px_1fr]" action={async (formData) => {
          "use server";
          const nextDate = String(formData.get("date") ?? "").slice(0, 10);
          const nextSessionType = String(formData.get("sessionType") ?? "");
          const nextView = String(formData.get("view") ?? "dashboard");
          redirect(`/school-dashboard/attendance?date=${encodeURIComponent(nextDate)}&sessionType=${encodeURIComponent(nextSessionType)}&view=${encodeURIComponent(nextView)}`);
        }}>
          <input type="date" name="date" defaultValue={date} className="min-h-11 rounded-xl border border-slate-300 px-3" />
          <select name="sessionType" defaultValue={sessionType ?? ""} className="min-h-11 rounded-xl border border-slate-300 px-3">
            <option value="">Policy Default</option>
            {Object.values(AttendanceSessionType).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <div className="flex flex-wrap gap-2">
            <button type="submit" name="view" value="dashboard" className={`rounded-xl px-4 py-2 text-sm font-semibold ${view === "dashboard" ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>Dashboard</button>
            <button type="submit" name="view" value="teacher-completion" className={`rounded-xl px-4 py-2 text-sm font-semibold ${view === "teacher-completion" ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>Teacher Completion</button>
            <button type="submit" name="view" value="reports" className={`rounded-xl px-4 py-2 text-sm font-semibold ${view === "reports" ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>Reports</button>
          </div>
        </form>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total Students" value={String(dashboard.kpis.totalStudents)} />
        <Metric label="Present Today" value={String(dashboard.kpis.presentToday)} />
        <Metric label="Absent Today" value={String(dashboard.kpis.absentToday)} />
        <Metric label="Late Today" value={String(dashboard.kpis.lateToday)} />
        <Metric label="Attendance Percentage" value={summaryPercent(dashboard.kpis.attendancePercentage)} />
        <Metric label="Sessions Submitted" value={String(dashboard.kpis.sessionsSubmitted)} />
        <Metric label="Sessions Pending" value={String(dashboard.kpis.sessionsPending)} />
        <Metric label="Pending Corrections" value={String(dashboard.kpis.pendingCorrections)} />
      </section>

      {dashboard.empty ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No attendance assignments are available for this view yet.</p>
      ) : null}

      {view === "dashboard" ? (
        <section className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Today&apos;s Attendance Summary</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-7">
              <SummaryTile label="Present" value={dashboard.todaysSummary.present} tone="emerald" />
              <SummaryTile label="Absent" value={dashboard.todaysSummary.absent} tone="rose" />
              <SummaryTile label="Late" value={dashboard.todaysSummary.late} tone="amber" />
              <SummaryTile label="Half Day" value={dashboard.todaysSummary.halfDay} tone="violet" />
              <SummaryTile label="On Leave" value={dashboard.todaysSummary.onLeave} tone="cyan" />
              <SummaryTile label="Excused" value={dashboard.todaysSummary.excused} tone="indigo" />
              <SummaryTile label="Total" value={dashboard.todaysSummary.total} tone="slate" />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">Class Submission Status</h2>
              <form action={bulkLockAttendanceDateAction} className="flex items-center gap-2">
                <input type="hidden" name="date" value={date} />
                <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Lock All Submitted For Date</button>
              </form>
            </div>

            <div className="mt-4 hidden overflow-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Class</th>
                    <th className="px-3 py-2">Section</th>
                    <th className="px-3 py-2">Subject</th>
                    <th className="px-3 py-2">Teacher</th>
                    <th className="px-3 py-2">Session Type</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Submitted</th>
                    <th className="px-3 py-2">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.classSubmissionStatus.map((row) => (
                    <tr key={row.assignmentId} className="border-t border-slate-100">
                      <td className="px-3 py-2">{row.schoolClass}</td>
                      <td className="px-3 py-2">{row.section}</td>
                      <td className="px-3 py-2">{row.subject ?? "-"}</td>
                      <td className="px-3 py-2">{row.teacher}</td>
                      <td className="px-3 py-2">{row.sessionType}</td>
                      <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
                      <td className="px-3 py-2">{row.submittedAt ? row.submittedAt.toLocaleString("en-IN") : "-"}</td>
                      <td className="px-3 py-2">
                        {row.sessionId ? <Link href={`/school-dashboard/attendance/sessions/${row.sessionId}`} className="text-sm font-semibold text-blue-700">Open</Link> : <span className="text-slate-400">-</span>}
                        {row.sessionId && row.status === "SUBMITTED" ? (
                          <form action={lockAttendanceSessionAction} className="mt-1">
                            <input type="hidden" name="sessionId" value={row.sessionId} />
                            <button type="submit" className="text-xs font-semibold text-slate-700">Lock</button>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-3 md:hidden">
              {dashboard.classSubmissionStatus.map((row) => (
                <article key={row.assignmentId} className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">{row.schoolClass} - {row.section}</p>
                  <p className="mt-1 text-xs text-slate-600">Teacher: {row.teacher}</p>
                  <p className="mt-1 text-xs text-slate-600">Subject: {row.subject ?? "-"}</p>
                  <div className="mt-2"><StatusBadge status={row.status} /></div>
                  <p className="mt-2 text-xs text-slate-500">Submitted: {row.submittedAt ? row.submittedAt.toLocaleString("en-IN") : "-"}</p>
                  {row.sessionId ? <Link href={`/school-dashboard/attendance/sessions/${row.sessionId}`} className="mt-2 inline-flex text-sm font-semibold text-blue-700">Open</Link> : null}
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Pending Corrections</h2>
            <div className="mt-4 space-y-3">
              {dashboard.pendingCorrections.length ? dashboard.pendingCorrections.map((correction) => (
                <article key={correction.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="grid gap-2 md:grid-cols-4">
                    <p className="text-sm"><span className="font-semibold">Teacher:</span> {correction.attendanceRecord.attendanceSession.teacher.user.name}</p>
                    <p className="text-sm"><span className="font-semibold">Student:</span> {correction.attendanceRecord.studentEnrollment.student.name}</p>
                    <p className="text-sm"><span className="font-semibold">Class/Section:</span> {correction.attendanceRecord.attendanceSession.classSection.schoolClass.name} - {correction.attendanceRecord.attendanceSession.classSection.name}</p>
                    <p className="text-sm"><span className="font-semibold">Date:</span> {correction.attendanceRecord.attendanceSession.date.toLocaleDateString("en-IN")}</p>
                  </div>
                  <p className="mt-2 text-sm"><span className="font-semibold">Change:</span> {correction.previousStatus} to {correction.newStatus}</p>
                  <p className="mt-1 text-sm"><span className="font-semibold">Reason:</span> {correction.reason}</p>
                  <p className="mt-1 text-xs text-slate-500">Requested: {correction.createdAt.toLocaleString("en-IN")}</p>
                  <form action={reviewAttendanceCorrectionAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
                    <input name="decisionNote" placeholder="Decision note (optional)" className="min-h-10 rounded-xl border border-slate-300 px-3" />
                    <input type="hidden" name="correctionId" value={correction.id} />
                    <button name="decision" value="APPROVE" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Approve</button>
                    <button name="decision" value="REJECT" className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Reject</button>
                  </form>
                </article>
              )) : <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No pending corrections.</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Low Attendance Students</h2>
            <div className="mt-4 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Class/Section</th>
                    <th className="px-3 py-2">Attendance</th>
                    <th className="px-3 py-2">Absent</th>
                    <th className="px-3 py-2">Late</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.lowAttendanceStudents.map((row) => (
                    <tr key={`${row.student}-${row.classSection}`} className="border-t border-slate-100">
                      <td className="px-3 py-2">{row.student}</td>
                      <td className="px-3 py-2">{row.classSection}</td>
                      <td className="px-3 py-2">{summaryPercent(row.attendancePercentage)}</td>
                      <td className="px-3 py-2">{row.absentDays}</td>
                      <td className="px-3 py-2">{row.lateDays}</td>
                      <td className="px-3 py-2">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Recent Attendance Activity</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {dashboard.recentActivity.length ? dashboard.recentActivity.map((item) => (
                <li key={item.id} className="rounded-xl bg-slate-50 px-3 py-2">{item.action} - {item.createdAt.toLocaleString("en-IN")}</li>
              )) : <li className="rounded-xl bg-slate-50 px-3 py-2 text-slate-500">No recent attendance activity.</li>}
            </ul>
          </section>
        </section>
      ) : null}

      {view === "teacher-completion" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Teacher Completion</h2>
          <div className="mt-4 overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Teacher</th>
                  <th className="px-3 py-2">Class/Section</th>
                  <th className="px-3 py-2">Subject</th>
                  <th className="px-3 py-2">Expected</th>
                  <th className="px-3 py-2">Submitted</th>
                  <th className="px-3 py-2">Pending</th>
                  <th className="px-3 py-2">Late</th>
                  <th className="px-3 py-2">Completion</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.teacherCompletion.map((row, index) => (
                  <tr key={`${row.teacher}-${row.schoolClass}-${row.section}-${index}`} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.teacher}</td>
                    <td className="px-3 py-2">{row.schoolClass} - {row.section}</td>
                    <td className="px-3 py-2">{row.subject ?? "-"}</td>
                    <td className="px-3 py-2">{row.expectedSessions}</td>
                    <td className="px-3 py-2">{row.submittedSessions}</td>
                    <td className="px-3 py-2">{row.pendingSessions}</td>
                    <td className="px-3 py-2">{row.lateSubmissions}</td>
                    <td className="px-3 py-2">{summaryPercent(row.completionPercentage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {view === "reports" && reports ? (
        <section className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Attendance Report Views</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Daily Summary" value={reports.daily ? summaryPercent(reports.daily.totals.percentage) : "0.0%"} />
              <Metric label="Weekly Summary" value={reports.weekly ? summaryPercent(reports.weekly.totals.percentage) : "0.0%"} />
              <Metric label="Monthly Summary" value={reports.monthly ? summaryPercent(reports.monthly.totals.percentage) : "0.0%"} />
              <Metric label="Academic Year Summary" value={reports.academicYear ? summaryPercent(reports.academicYear.totals.percentage) : "0.0%"} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Correction History</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {reports.corrections.length ? reports.corrections.map((item) => (
                <p key={item.id} className="rounded-xl bg-slate-50 px-3 py-2">{item.attendanceRecord.studentEnrollment.student.name} - {item.previousStatus} to {item.newStatus} ({item.decisionStatus})</p>
              )) : <p className="rounded-xl bg-slate-50 px-3 py-2 text-slate-500">No correction history for this filter.</p>}
            </div>
          </section>
        </section>
      ) : null}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </article>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: "emerald" | "rose" | "amber" | "violet" | "cyan" | "indigo" | "slate" }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    cyan: "bg-cyan-50 text-cyan-700",
    indigo: "bg-indigo-50 text-indigo-700",
    slate: "bg-slate-100 text-slate-700",
  } as const;
  return (
    <article className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-lg font-bold ${tones[tone]}`}>{value}</p>
    </article>
  );
}

function StatusBadge({ status }: { status: "NOT_STARTED" | "DRAFT" | "SUBMITTED" | "LOCKED" }) {
  const map = {
    NOT_STARTED: "bg-slate-100 text-slate-700",
    DRAFT: "bg-amber-100 text-amber-700",
    SUBMITTED: "bg-blue-100 text-blue-700",
    LOCKED: "bg-emerald-100 text-emerald-700",
  } as const;
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${map[status]}`}>{status.replace("_", " ")}</span>;
}
