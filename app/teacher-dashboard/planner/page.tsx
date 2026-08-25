import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, LibraryBig } from "lucide-react";

import { getTeacherPlannerData } from "@/lib/teacher-planner";
import { completeTeacherTimetableOccurrenceAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ view?: string }>;
type PlannerView = "today" | "week" | "month" | "completed";
type PlannerPeriod = NonNullable<Awaited<ReturnType<typeof getTeacherPlannerData>>["occurrences"][number]["period"]>;
type PlannerOccurrence = Awaited<ReturnType<typeof getTeacherPlannerData>>["occurrences"][number] | Awaited<ReturnType<typeof getTeacherPlannerData>>["completed"][number];

const STATUS_LABELS: Record<PlannerPeriod["status"], string> = {
  PLANNED: "Planned",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
  RESCHEDULED: "Rescheduled",
};

function selectedView(value: string | undefined): PlannerView {
  return value === "week" || value === "month" || value === "completed" ? value : "today";
}

function dateLabel(value: string) {
  return new Date(value + "T12:00:00.000Z").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

function clock(minutes: number) {
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return hour + ":" + minute;
}

function planLink(sectionId: string, sectionSubjectId: string, bookId: string) {
  return "/teacher-dashboard/classes/" + encodeURIComponent(sectionId) + "/plan?subject=" + encodeURIComponent(sectionSubjectId) + "&bookId=" + encodeURIComponent(bookId);
}

function composerLink(sectionId: string, sectionSubjectId: string, date: string, timetableEntryId: string, bookId?: string | null) {
  const params = new URLSearchParams({ subject: sectionSubjectId, date, timetableEntryId });
  if (bookId) params.set("bookId", bookId);
  return "/teacher-dashboard/classes/" + encodeURIComponent(sectionId) + "/plan?" + params.toString();
}

function smartBookLink(sectionId: string, sectionSubjectId: string, bookId: string, period: { chapterId: string | null; pageRefs: Array<{ chapterId: string | null; deepLink: { moduleId: string; pageId: string; query: string; anchor: string } }> }) {
  const ref = period.pageRefs[0];
  const chapterId = ref?.chapterId ?? period.chapterId;
  if (!ref || !chapterId) return planLink(sectionId, sectionSubjectId, bookId);
  return "/teacher-dashboard/classes/" + encodeURIComponent(sectionId) + "/content/" + encodeURIComponent(chapterId) + "?subject=" + encodeURIComponent(sectionSubjectId) + "&bookId=" + encodeURIComponent(bookId) + "&moduleId=" + encodeURIComponent(ref.deepLink.moduleId) + "&pageId=" + encodeURIComponent(ref.deepLink.pageId) + "#" + ref.deepLink.anchor;
}

function teachLink(sectionId: string, sectionSubjectId: string, bookId: string, periodId: string) {
  return "/teacher-dashboard/classes/" + encodeURIComponent(sectionId) + "/teach?subject=" + encodeURIComponent(sectionSubjectId) + "&bookId=" + encodeURIComponent(bookId) + "&periodId=" + encodeURIComponent(periodId);
}

function stateLabel(period: PlannerPeriod | null) {
  if (!period) return "Not planned";
  if (period?.status === "COMPLETED") return "Completed";
  if (period?.status === "PLANNED") return period?.meaningfullyPlanned ? "Planned" : "Not planned";
  return STATUS_LABELS[period.status];
}

function stateClass(label: string) {
  if (label === "Planned") return "bg-blue-50 text-blue-700";
  if (label === "Completed") return "bg-emerald-50 text-emerald-700";
  if (label === "Skipped" || label === "Rescheduled") return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

function PeriodSummary({ period, compact = false }: { period: PlannerPeriod; compact?: boolean }) {
  const page = period.pageRefs.find((ref) => ref.state !== "MISSING_PAGE" && typeof ref.displayPageNumber === "number");
  const moduleTitle = period.pageRefs.find((ref) => ref.moduleTitle)?.moduleTitle;
  const counts = [
    period.activities.length ? period.activities.length + (period.activities.length === 1 ? " Activity" : " Activities") : null,
    period.assignmentCount ? period.assignmentCount + (period.assignmentCount === 1 ? " Assignment" : " Assignments") : null,
    period.assessmentCount ? period.assessmentCount + (period.assessmentCount === 1 ? " Assessment" : " Assessments") : null,
  ].filter(Boolean).join(" · ");
  return <div className="mt-2 space-y-0.5 text-xs text-slate-600">
    {period.chapterTitle ? <p className="font-semibold text-slate-800">{period.chapterTitle}</p> : null}
    {moduleTitle || page ? <p>{moduleTitle ? moduleTitle + " · " : null}{page ? "Book page " + page.displayPageNumber : "Smart Book page unavailable"}</p> : period.pageRefs.length ? <p>Smart Book page unavailable</p> : null}
    {counts ? <p>{counts}</p> : null}
    {!compact && period.objective ? <p><span className="font-semibold text-slate-700">Objective:</span> {period.objective}</p> : null}
  </div>;
}

function OccurrenceCard({ occurrence, compact = false }: { occurrence: PlannerOccurrence; compact?: boolean }) {
  const { entry, period, book, date } = occurrence;
  if (!entry) {
    return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-teal-700">{date ? dateLabel(date) : "Historical teaching period"}</p>
          <h2 className="mt-1 text-base font-bold text-slate-950">{period?.title ?? "Completed teaching period"}</h2>
          <p className="mt-1 text-xs text-slate-500">{book?.title ?? "Book access unavailable"}</p>
          {period ? <PeriodSummary period={period} compact={compact} /> : null}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Completed</span>
      </div>
    </article>;
  }

  const subject = entry.sectionSubject.subject.name;
  const classLabel = entry.section.schoolClass.name + "-" + entry.section.name;
  const eligibleBooks = occurrence.eligibleBooks;
  const label = stateLabel(period);
  const planned = period?.meaningfullyPlanned;

  return <article className={"rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" + (compact ? " sm:p-3" : "")}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-teal-700">{dateLabel(date)} - {entry.periodSlot.label}</p>
        <h2 className="mt-1 text-base font-bold text-slate-950">{classLabel} - {subject}</h2>
        <p className="mt-1 text-xs text-slate-500">{clock(entry.periodSlot.startMinute)}-{clock(entry.periodSlot.endMinute)} - {book?.title ?? "No eligible book"}</p>
        {!compact && period ? <PeriodSummary period={period} /> : null}
      </div>
      <span className={"rounded-full px-2.5 py-1 text-[11px] font-bold " + stateClass(label)}>{label}</span>
    </div>
    {compact && period ? <PeriodSummary period={period} compact /> : null}
    {!eligibleBooks.length ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">No eligible book is assigned to this class and subject.</p> : planned && period ? <div className="mt-4 flex flex-wrap gap-2">
      {book ? <><Link href={teachLink(entry.sectionId, entry.sectionSubjectId, book.id, period.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Teach</Link><Link href={smartBookLink(entry.sectionId, entry.sectionSubjectId, book.id, period)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white"><LibraryBig className="h-3.5 w-3.5" />{period.pageRefs.length ? "Open mapped Smart Book" : "Map Smart Book pages"}</Link></> : <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Teaching period retained; book access unavailable.</span>}
      {period.status === "PLANNED" ? <form action={completeTeacherTimetableOccurrenceAction}><input type="hidden" name="periodId" value={period.id} /><button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Mark completed</button></form> : null}
      <Link href={composerLink(entry.sectionId, entry.sectionSubjectId, date, entry.id, book?.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Edit plan</Link>
    </div> : <Link href={composerLink(entry.sectionId, entry.sectionSubjectId, date, entry.id, book?.id)} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"><CalendarDays className="h-3.5 w-3.5" />Plan period</Link>}
  </article>;
}

export default async function TeacherPlannerPage({ searchParams }: { searchParams: SearchParams }) {
  const view = selectedView((await searchParams).view);
  const data = await getTeacherPlannerData(view);
  if (!data.plannerEnabled) return <main className="grid min-h-[55vh] place-items-center bg-slate-50 p-5"><section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><CalendarDays className="mx-auto h-10 w-10 text-slate-300" /><h1 className="mt-4 text-2xl font-bold text-slate-950">Planner setup pending</h1><p className="mt-2 text-sm leading-6 text-slate-500">Your School must enable the Planner feature before timetable classes can be planned.</p></section></main>;
  if (!data.timetableEnabled) return <main className="grid min-h-[55vh] place-items-center bg-slate-50 p-5"><section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><Clock3 className="mx-auto h-10 w-10 text-slate-300" /><h1 className="mt-4 text-2xl font-bold text-slate-950">Timetable setup pending</h1><p className="mt-2 text-sm leading-6 text-slate-500">The Planner follows your School timetable. Ask the School to enable and complete it.</p></section></main>;
  const items = view === "completed" ? data.completed : data.occurrences;
  return <main className="space-y-5 bg-slate-50 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">Teacher planner</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Plan from your timetable</h1><p className="mt-1 text-sm text-slate-500">Class, subject, teacher, and period timing come from the School timetable.</p></div><CalendarDays className="h-6 w-6 text-teal-700" aria-hidden="true" /></header>
    <nav aria-label="Planner view" className="flex w-fit flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs font-bold shadow-sm"><Link href="/teacher-dashboard/planner?view=today" className={"rounded-lg px-3 py-2 " + (view === "today" ? "bg-teal-700 text-white" : "text-slate-600")}>Today</Link><Link href="/teacher-dashboard/planner?view=week" className={"rounded-lg px-3 py-2 " + (view === "week" ? "bg-teal-700 text-white" : "text-slate-600")}>Weekly</Link><Link href="/teacher-dashboard/planner?view=month" className={"rounded-lg px-3 py-2 " + (view === "month" ? "bg-teal-700 text-white" : "text-slate-600")}>Monthly</Link><Link href="/teacher-dashboard/planner?view=completed" className={"rounded-lg px-3 py-2 " + (view === "completed" ? "bg-teal-700 text-white" : "text-slate-600")}>Completed</Link></nav>
    {data.overlays.length ? <section className="space-y-2">{data.overlays.map((overlay) => <article key={overlay.date + ":" + overlay.type} className={"rounded-2xl border p-4 shadow-sm " + (overlay.type === "EMERGENCY_HOLIDAY" ? "border-rose-200 bg-rose-50" : overlay.type === "HOLIDAY" ? "border-amber-200 bg-amber-50" : "border-violet-200 bg-violet-50")}><p className="text-[11px] font-bold uppercase tracking-wide">{dateLabel(overlay.date)} - {overlay.type.replaceAll("_", " ")}</p><h2 className="mt-1 text-sm font-bold">{overlay.type === "EMERGENCY_HOLIDAY" ? "School Closed" : overlay.title}</h2>{overlay.description || overlay.type === "EMERGENCY_HOLIDAY" ? <p className="mt-1 text-xs">{overlay.description ?? overlay.title}</p> : null}</article>)}</section> : null}
    {view === "completed" ? <section className="space-y-3">{items.length ? items.map((item) => <OccurrenceCard key={item.period?.id ?? item.entry?.id ?? item.date} occurrence={item} />) : <EmptyState text="Completed timetable classes will appear here." />}</section> : <section className="space-y-3">{items.length ? items.map((item) => <OccurrenceCard key={item.date + ":" + (item.entry?.id ?? item.period?.id ?? "historical")} occurrence={item} compact={view !== "today"} />) : <EmptyState text={view === "today" ? "No teaching periods are scheduled today." : view === "month" ? "No teaching periods are scheduled this month." : "No teaching periods are scheduled this week."} />}</section>}
  </main>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{text}</div>;
}