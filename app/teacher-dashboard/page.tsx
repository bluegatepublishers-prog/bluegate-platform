import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, MessageSquare } from "lucide-react";

import { getTeacherHomeData } from "@/lib/teacher-experience";
import { getTeacherPlannerData } from "@/lib/teacher-planner";

export const dynamic = "force-dynamic";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Teacher";
}

function clock(minutes: number) {
  return String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
}

function dateLabel(value: string) {
  return new Date(value + "T12:00:00.000Z").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

export default async function TeacherDashboardPage() {
  const [data, today, week] = await Promise.all([
    getTeacherHomeData(),
    getTeacherPlannerData("today"),
    getTeacherPlannerData("week"),
  ]);
  const feature = (key: keyof typeof data.featureAccess) => Boolean(data.featureAccess[key]);
  const firstOccurrence = today.occurrences[0];
  const plannedCount = week.occurrences.filter((occurrence) => Boolean(occurrence.period?.meaningfullyPlanned)).length;
  const unplannedCount = week.occurrences.filter((occurrence) => !occurrence.period?.meaningfullyPlanned).length;
  const plannerHref = firstOccurrence
    ? "/teacher-dashboard/classes/" + firstOccurrence.entry.sectionId + "/plan?subject=" + encodeURIComponent(firstOccurrence.entry.sectionSubjectId)
    : "/teacher-dashboard/planner";
  const firstReviewClass = data.classes[0];
  const firstReviewSubject = firstReviewClass?.subjects[0];
  const reviewHref = firstReviewClass
    ? "/teacher-dashboard/classes/" + firstReviewClass.sectionId + (data.reviewCounts.assignmentSubmissions > 0 ? "/assignments" : "/assessments") + (firstReviewSubject ? "?subject=" + encodeURIComponent(firstReviewSubject.id) : "")
    : "/teacher-dashboard/classes";

  return (
    <main className="space-y-5 bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Teacher Home</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Good morning, {firstName(data.teacher.user.name)}</h1>
          <p className="mt-1 text-sm text-slate-500">{data.teacher.school?.schoolName ?? data.teacher.schoolName}</p>
        </div>
        <Link href="/teacher-dashboard/classes" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-teal-300 hover:text-teal-700">My Classes <ArrowRight className="h-4 w-4" /></Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Teacher attention summary">
        <SummaryTile icon={CalendarDays} label="Today" value={today.occurrences.length} detail="timetable classes" />
        <SummaryTile icon={CheckCircle2} label="Planned this week" value={plannedCount} detail={unplannedCount ? unplannedCount + " still to plan" : "all scheduled"} />
        <SummaryTile icon={ClipboardCheck} label="Work to review" value={feature("HOMEWORK") ? data.assignmentReview : 0} detail={feature("HOMEWORK") ? "homework submissions" : "not enabled"} />
        <SummaryTile icon={MessageSquare} label="Messages" value={data.messages.length} detail="recent class messages" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Review attention">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Needs review</p>
            {data.reviewCounts.total ? (
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold text-slate-700">
                {data.reviewCounts.assignmentSubmissions ? <span>{data.reviewCounts.assignmentSubmissions} assignment submission{data.reviewCounts.assignmentSubmissions === 1 ? "" : "s"}</span> : null}
                {data.reviewCounts.assessmentResponses ? <span>{data.reviewCounts.assessmentResponses} assessment response{data.reviewCounts.assessmentResponses === 1 ? "" : "s"}</span> : null}
              </div>
            ) : <p className="mt-1 text-sm text-slate-500">All caught up.</p>}
          </div>
          {data.reviewCounts.total ? <Link href={reviewHref} className="min-h-11 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800">Review</Link> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Today</p><h2 className="mt-1 text-lg font-bold text-slate-950">Your timetable</h2></div>
          <Link href="/teacher-dashboard/planner" className="text-sm font-bold text-teal-700 hover:text-teal-800">Open Planner</Link>
        </div>
        {today.occurrences.length ? (
          <div className="divide-y divide-slate-100">
            {today.occurrences.map((occurrence) => {
              const book = occurrence.book ?? occurrence.eligibleBooks[0];
              const base = "/teacher-dashboard/classes/" + occurrence.entry.sectionId;
              const query = "?subject=" + encodeURIComponent(occurrence.entry.sectionSubjectId);
              const planHref = base + "/plan" + query + (book ? "&bookId=" + encodeURIComponent(book.id) : "");
              const teachHref = base + "/teach" + query + (book ? "&bookId=" + encodeURIComponent(book.id) : "") + (occurrence.period ? "&periodId=" + encodeURIComponent(occurrence.period.id) : "");
              return (
                <div key={occurrence.date + "-" + occurrence.entry.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="w-24 shrink-0 text-sm font-bold text-slate-700">{clock(occurrence.entry.periodSlot.startMinute)}–{clock(occurrence.entry.periodSlot.endMinute)}</div>
                  <div className="min-w-[180px] flex-1"><p className="font-bold text-slate-950">{occurrence.entry.section.schoolClass.name}-{occurrence.entry.section.name}</p><p className="text-sm text-slate-500">{occurrence.entry.sectionSubject.subject.name} · {occurrence.entry.periodSlot.label}</p></div>
                  <span className={"rounded-full px-2.5 py-1 text-xs font-bold " + (occurrence.period?.meaningfullyPlanned ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{occurrence.period?.meaningfullyPlanned ? "Planned" : "Not planned"}</span>
                  {occurrence.period ? <Link href={teachHref} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800">Teach</Link> : book ? <Link href={planHref} className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100">Plan</Link> : <span className="text-xs font-semibold text-slate-400">No eligible book</span>}
                </div>
              );
            })}
          </div>
        ) : <div className="px-4 py-8 text-center text-sm text-slate-500">No teaching periods are scheduled for today.</div>}
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Next 7 days</p><h2 className="mt-1 text-lg font-bold text-slate-950">Planning status</h2></div><Link href="/teacher-dashboard/planner" className="text-sm font-bold text-teal-700">Open Planner</Link></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-emerald-50 p-4"><p className="text-2xl font-bold text-emerald-800">{plannedCount}</p><p className="mt-1 text-sm font-semibold text-emerald-700">Planned classes</p></div><div className="rounded-xl bg-amber-50 p-4"><p className="text-2xl font-bold text-amber-800">{unplannedCount}</p><p className="mt-1 text-sm font-semibold text-amber-700">Not planned yet</p></div></div>
          <Link href={plannerHref} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-teal-700">Review timetable planning <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Messages</p><h2 className="mt-1 text-lg font-bold text-slate-950">Recent class messages</h2></div><Link href="/teacher-dashboard/messages" className="text-sm font-bold text-teal-700">View all</Link></div>
          {data.messages.length ? <div className="mt-4 space-y-3">{data.messages.slice(0, 3).map((message) => <div key={message.id} className="rounded-xl bg-slate-50 p-3"><div className="flex justify-between gap-3"><strong className="text-sm text-slate-800">{message.sender.name}</strong><span className="text-xs text-slate-400">{dateLabel(message.createdAt.toISOString().slice(0, 10))}</span></div><p className="mt-1 line-clamp-2 text-sm text-slate-600">{message.text}</p></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No recent messages.</p>}
        </div>
      </section>
    </main>
  );
}

function SummaryTile({ icon: Icon, label, value, detail }: { icon: typeof CalendarDays; label: string; value: number; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-teal-700"><Icon className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-wide">{label}</span></div><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p><p className="text-xs text-slate-500">{detail}</p></div>;
}
