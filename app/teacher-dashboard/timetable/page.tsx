import Link from "next/link";
import { CalendarDays, Clock3 } from "lucide-react";

import { getSchoolFeatureAccessForSchool } from "@/lib/school-feature-access";
import { getWeekdayForTimeZone } from "@/lib/application-timezone";
import { requireTeacher } from "@/lib/teacher-dashboard";
import { getTeacherTimetable } from "@/lib/teacher-timetable";
import { WEEKDAYS } from "@/lib/school-timetable";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ view?: string }>;

const weekdayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function clock(minutes: number) {
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return hour + ":" + minute;
}

function todayWeekday(now = new Date()) {
  return getWeekdayForTimeZone(now);
}

function weekdayLabel(weekday: string) {
  return weekdayLabels[WEEKDAYS.indexOf(weekday as (typeof WEEKDAYS)[number])] ?? weekday;
}

function TimetableEntry({ entry, showWeekday = false }: { entry: Awaited<ReturnType<typeof getTeacherTimetable>>["entries"][number]; showWeekday?: boolean }) {
  return <article className="grid gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:grid-cols-[88px_1fr] sm:gap-3">
    <span className="text-xs font-semibold text-teal-700">{clock(entry.periodSlot.startMinute)}–{clock(entry.periodSlot.endMinute)}</span>
    <div>
      {showWeekday ? <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{weekdayLabel(entry.weekday)}</p> : null}
      <p className="text-sm font-semibold text-slate-800">{entry.section.schoolClass.name}-{entry.section.name}</p>
      <p className="text-xs text-slate-500">{entry.sectionSubject.subject.name}</p>
    </div>
  </article>;
}

export default async function TeacherTimetablePage({ searchParams }: { searchParams: SearchParams }) {
  const teacher = await requireTeacher();
  const access = teacher.school ? await getSchoolFeatureAccessForSchool(teacher.school, "TIMETABLE") : { allowed: false };
  if (!access.allowed) {
    return <main className="grid min-h-[55vh] place-items-center bg-slate-50 p-5"><section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><CalendarDays className="mx-auto h-10 w-10 text-slate-300" /><h1 className="mt-4 text-2xl font-bold text-slate-950">Timetable setup pending</h1><p className="mt-2 text-sm leading-6 text-slate-500">Your School timetable will appear here after the School enables the feature.</p></section></main>;
  }
  const params = await searchParams;
  const view = params.view === "week" ? "week" : "today";
  const data = await getTeacherTimetable();
  const today = todayWeekday();
  const todayEntries = data.entries.filter((entry) => entry.weekday === today);
  const todayIsWorkingDay = Boolean(data.config?.workingDays.includes(today));
  const weekEntries = data.entries;

  return <main className="space-y-4 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700">Read-only view</p><h1 className="mt-1 text-xl font-bold text-slate-950">My timetable</h1><p className="mt-1 text-xs text-slate-500">{data.academicYear?.name ?? "Current academic year"}</p></div>
      <Clock3 className="h-5 w-5 text-teal-700" aria-hidden="true" />
    </header>
    <nav aria-label="Timetable view" className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs font-semibold shadow-sm">
      <Link href="/teacher-dashboard/timetable?view=today" className={`rounded-md px-3 py-1.5 ${view === "today" ? "bg-teal-600 text-white" : "text-slate-600"}`}>Today</Link>
      <Link href="/teacher-dashboard/timetable?view=week" className={`rounded-md px-3 py-1.5 ${view === "week" ? "bg-teal-600 text-white" : "text-slate-600"}`}>Week</Link>
    </nav>
    {view === "today" ? <section className="max-w-2xl rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><h2 className="text-base font-bold text-slate-900">Today&apos;s Timetable</h2><p className="mt-1 text-xs text-slate-500">{weekdayLabel(today)}</p>{todayIsWorkingDay && todayEntries.length ? <div className="mt-3">{todayEntries.map((entry) => <TimetableEntry key={entry.id} entry={entry} />)}</div> : <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">No classes scheduled today.</p>}</section> : <section className="max-w-2xl rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><h2 className="text-base font-bold text-slate-900">Week view</h2>{weekEntries.length ? <div className="mt-3">{weekEntries.map((entry) => <TimetableEntry key={entry.id} entry={entry} showWeekday />)}</div> : <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">No timetable periods have been assigned to you yet.</p>}</section>}
  </main>;
}
