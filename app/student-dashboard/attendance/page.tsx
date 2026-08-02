import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CircleX,
  Info,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import { getStudentAttendanceExperience } from "@/lib/attendance";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  month?: string;
  status?: string;
  sessionType?: string;
  subject?: string;
  page?: string;
}>;

function asMonth(value?: string) {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : undefined;
}

function asPositivePage(value?: string) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function toneForStatus(status: string) {
  if (status === "Present") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "Absent") return "bg-rose-50 text-rose-700 border-rose-200";
  if (status === "Late") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "Half Day") return "bg-violet-50 text-violet-700 border-violet-200";
  if (status === "On Leave") return "bg-purple-50 text-purple-700 border-purple-200";
  if (status === "Excused") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (status === "Holiday") return "bg-cyan-50 text-cyan-700 border-cyan-200";
  if (status === "Not Submitted") return "bg-slate-50 text-slate-700 border-slate-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function monthInputDefault() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function StudentAttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const data = await getStudentAttendanceExperience({
    month: asMonth(query.month),
    status: query.status,
    sessionType: query.sessionType,
    subject: query.subject,
    page: asPositivePage(query.page),
  });

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-3">
        <Link href="/student-dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
          <span aria-hidden>←</span>
          Back to Dashboard
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Attendance</h1>
            <p className="mt-1 text-sm text-slate-600">{data.studentName} · {data.classSection} · {data.academicYear}</p>
          </div>
          <form className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <label htmlFor="month" className="text-sm font-semibold text-slate-600">Month</label>
            <input id="month" name="month" type="month" defaultValue={data.monthKey || monthInputDefault()} className="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
            <button type="submit" className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white">Load</button>
          </form>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <Metric label="Attendance Percentage" value={`${data.summary.percentage.toFixed(1)}%`} icon={ShieldCheck} tone="bg-blue-50 text-blue-700" />
        <Metric label="Present" value={String(data.summary.present)} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
        <Metric label="Absent" value={String(data.summary.absent)} icon={CircleX} tone="bg-rose-50 text-rose-700" />
        <Metric label="Late" value={String(data.summary.late)} icon={Clock3} tone="bg-amber-50 text-amber-700" />
        <Metric label="Half Day" value={String(data.summary.halfDay)} icon={CalendarDays} tone="bg-violet-50 text-violet-700" />
        <Metric label="On Leave" value={String(data.summary.onLeave)} icon={Info} tone="bg-purple-50 text-purple-700" />
        <Metric label="Excused" value={String(data.summary.excused)} icon={UserCheck} tone="bg-indigo-50 text-indigo-700" />
      </section>

      {data.empty ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          No attendance has been submitted for this period.
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Today&apos;s Attendance</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
          <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${toneForStatus(data.today.label)}`}>
            <p>{data.today.label}</p>
            <p className="mt-1 text-xs font-medium opacity-80">{new Date(`${data.today.date}T00:00:00.000Z`).toLocaleDateString("en-IN")}</p>
            <p className="mt-1 text-xs font-medium opacity-80">{data.today.sessionType}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            {data.today.periods.length ? (
              <div className="space-y-2">
                {data.today.periods.map((row, index) => (
                  <details key={`${data.today.date}-${index}`} className="rounded-lg border border-slate-200 bg-white p-2">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                      {row.subject ?? "Subject"} · {row.period ?? "Session"} · {row.statusLabel}
                    </summary>
                    <p className="mt-2 text-xs text-slate-600">Teacher submitted status: {row.statusLabel}</p>
                    {row.remark ? <p className="mt-1 text-xs text-slate-600">Remark: {row.remark}</p> : null}
                  </details>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">Not Submitted</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Attendance Calendar</h2>
        <div className="mt-4 hidden grid-cols-7 gap-2 md:grid">
          {data.calendar.map((day) => (
            <article key={day.date} className={`rounded-xl border p-2 ${toneForStatus(day.statusLabel)}`} aria-label={`${day.date} ${day.statusLabel}`}>
              <p className="text-xs font-bold">{day.day}</p>
              <p className="mt-1 text-[11px] font-medium">{day.statusLabel}</p>
              {day.sessionType === "PERIOD" && day.periods.length > 0 ? (
                <details className="mt-1">
                  <summary className="cursor-pointer text-[10px] font-semibold">Periods</summary>
                  <div className="mt-1 space-y-1 text-[10px]">
                    {day.periods.map((period, index) => (
                      <p key={`${day.date}-${index}`}>{period.subject ?? "Subject"} · {period.period ?? "Session"} · {period.statusLabel}</p>
                    ))}
                  </div>
                </details>
              ) : null}
            </article>
          ))}
        </div>
        <div className="mt-3 space-y-2 md:hidden">
          {data.calendar.map((day) => (
            <article key={`mobile-${day.date}`} className={`rounded-xl border p-3 ${toneForStatus(day.statusLabel)}`}>
              <p className="text-sm font-semibold">{new Date(`${day.date}T00:00:00.000Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
              <p className="mt-1 text-xs">{day.statusLabel}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Monthly Trend</h2>
        <div className="mt-4 space-y-3">
          {data.trend.map((item) => (
            <article key={item.monthKey} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                <p className="text-sm font-bold text-blue-700">{item.percentage.toFixed(1)}%</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, item.percentage))}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-600">Present {item.present} · Absent {item.absent} · Late {item.late}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Attendance Requirement</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <article className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">School Requirement</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{data.policy.minimumAttendancePercentage}%</p>
          </article>
          <article className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Your Current</p>
            <p className="mt-1 text-xl font-bold text-blue-700">{data.summary.percentage.toFixed(1)}%</p>
          </article>
          <article className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Difference</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{data.requirement.delta >= 0 ? "+" : ""}{data.requirement.delta.toFixed(1)}%</p>
          </article>
        </div>
        <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">{data.requirement.label}: {data.requirement.message}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Attendance History</h2>
        <form className="mt-4 grid gap-3 lg:grid-cols-5">
          <input type="month" name="month" defaultValue={data.monthKey || monthInputDefault()} className="min-h-10 rounded-xl border border-slate-300 px-3 text-sm" />
          <select name="status" defaultValue={data.history.filters.status} className="min-h-10 rounded-xl border border-slate-300 px-3 text-sm">
            <option value="ALL">All Status</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Late</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="EXCUSED">Excused</option>
          </select>
          <select name="sessionType" defaultValue={data.history.filters.sessionType} className="min-h-10 rounded-xl border border-slate-300 px-3 text-sm">
            <option value="ALL">All Session Types</option>
            <option value="DAILY">Daily</option>
            <option value="PERIOD">Period</option>
            <option value="ASSEMBLY">Assembly</option>
            <option value="ACTIVITY">Activity</option>
            <option value="EXAM">Exam</option>
          </select>
          <select name="subject" defaultValue={data.history.filters.subject} className="min-h-10 rounded-xl border border-slate-300 px-3 text-sm">
            <option value="ALL">All Subjects</option>
            {data.subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
          <button type="submit" className="min-h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white">Apply Filters</button>
        </form>

        <div className="mt-4 space-y-2">
          {data.history.items.length ? data.history.items.map((item, index) => (
            <article key={`${item.date}-${item.sessionType}-${item.period ?? "session"}-${index}`} className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">{new Date(`${item.date}T00:00:00.000Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {item.statusLabel}</p>
              <p className="mt-1 text-xs text-slate-600">{item.subject ?? "Subject"} · {item.period ?? "Session"} · {item.sessionType}</p>
              {item.remark ? <p className="mt-1 text-xs text-slate-600">Remark: {item.remark}</p> : null}
            </article>
          )) : <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">No attendance history for this filter.</p>}
        </div>

        {data.history.totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between">
            <Link
              href={buildPageHref({ month: data.monthKey, status: data.history.filters.status, sessionType: data.history.filters.sessionType, subject: data.history.filters.subject, page: Math.max(1, data.history.page - 1) })}
              className={`rounded-lg border px-3 py-1 text-sm ${data.history.page <= 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              Previous
            </Link>
            <p className="text-xs text-slate-500">Page {data.history.page} of {data.history.totalPages}</p>
            <Link
              href={buildPageHref({ month: data.monthKey, status: data.history.filters.status, sessionType: data.history.filters.sessionType, subject: data.history.filters.subject, page: Math.min(data.history.totalPages, data.history.page + 1) })}
              className={`rounded-lg border px-3 py-1 text-sm ${data.history.page >= data.history.totalPages ? "pointer-events-none opacity-40" : ""}`}
            >
              Next
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function buildPageHref(input: {
  month?: string;
  status: string;
  sessionType: string;
  subject: string;
  page: number;
}) {
  const query = new URLSearchParams();
  if (input.month) query.set("month", input.month);
  query.set("status", input.status);
  query.set("sessionType", input.sessionType);
  query.set("subject", input.subject);
  query.set("page", String(input.page));
  return `/student-dashboard/attendance?${query.toString()}`;
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof ShieldCheck;
  tone: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </article>
  );
}
