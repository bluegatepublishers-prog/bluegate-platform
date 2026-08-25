import Link from "next/link";
import { ClipboardCheck, FileWarning, FolderOpen, UsersRound } from "lucide-react";

import TeacherClassChat from "@/components/classroom/TeacherClassChat";
import { getTeacherWorkspaceData } from "@/lib/teacher-experience";
import { getTeachingPlanTimetableOccurrences } from "@/lib/teaching-plan";

export default async function TeacherClassOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<{ subject?: string }>;
}) {
  const { sectionId } = await params;
  const data = await getTeacherWorkspaceData(sectionId, (await searchParams).subject);
  const subjectQuery = "?subject=" + encodeURIComponent(data.subject.id);
  const planHref = "/teacher-dashboard/classes/" + sectionId + "/plan" + subjectQuery;
  const timetableOccurrences = await getTeachingPlanTimetableOccurrences({ sectionId, sectionSubjectId: data.subject.id, days: 31 });
  const nextClass = timetableOccurrences.find((occurrence) => !occurrence.closed);
  const pendingAssignments = data.reviewCounts.assignmentSubmissions;
  const pendingAssessments = data.reviewCounts.assessmentResponses;
  const nextBook = nextClass?.book;
  const nextPlanContext = nextClass?.period ? formatPlanContext(nextBook?.title ?? null, nextClass.period) : null;
  const teachHref = nextClass?.period && nextBook
    ? "/teacher-dashboard/classes/" + sectionId + "/teach" + subjectQuery + "&bookId=" + encodeURIComponent(nextBook.id) + "&periodId=" + encodeURIComponent(nextClass.period.id)
    : null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.65fr)]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-teal-700">Next class</p>
              {nextClass ? <><h2 className="mt-1 text-lg font-bold text-slate-950">{data.subject.subject.name} · {nextClass.entry.periodSlot.label}</h2><p className="mt-1 text-sm text-slate-500">{formatDate(nextClass.date)} · {clock(nextClass.entry.periodSlot.startMinute)}–{clock(nextClass.entry.periodSlot.endMinute)}</p><p className="mt-1 text-xs text-slate-500">{nextClass.period ? nextClass.period.title + " · " + nextClass.period.pageRefs.length + " mapped page" + (nextClass.period.pageRefs.length === 1 ? "" : "s") : nextBook ? "Ready to plan from " + nextBook.title : "No eligible book is assigned to this class and subject."}</p></> : <h2 className="mt-1 text-lg font-bold text-slate-950">No upcoming timetable class</h2>}
            </div>
            <div className="flex flex-wrap gap-2">
              {teachHref ? <Link href={teachHref} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white">Teach</Link> : null}
              <Link href={planHref} className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800">Open Planner</Link>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Class overview</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">{data.subject.subject.name} · {data.studentCount} students</h2>
          <p className="mt-1 text-sm text-slate-500">Use the workspace tabs above for classroom execution, planning, materials, and progress.</p>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <Metric icon={ClipboardCheck} label="Assignments Pending Review" value={pendingAssignments} href={"/teacher-dashboard/classes/" + sectionId + "/assignments" + subjectQuery} />
          <Metric icon={FileWarning} label="Assessments To Grade" value={pendingAssessments} href={"/teacher-dashboard/classes/" + sectionId + "/assessments" + subjectQuery} />
          <Metric icon={UsersRound} label="Students Need Attention" value={data.attention} href={"/teacher-dashboard/classes/" + sectionId + "/progress" + subjectQuery} />
          <Metric icon={FolderOpen} label="Class Materials" value={data.materials} href={"/teacher-dashboard/classes/" + sectionId + "/materials" + subjectQuery} />
        </div>
      </div>
      <aside><TeacherClassChat sectionId={sectionId} compact /></aside>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value + "T12:00:00.000Z").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

function clock(minutes: number) {
  return String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
}

function Metric({ icon: Icon, label, value, href }: { icon: typeof ClipboardCheck; label: string; value: number; href: string }) {
  return <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-teal-300"><Icon className="h-6 w-6 text-teal-700" /><p className="mt-3 text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></Link>;
}


function formatPlanContext(bookTitle: string | null, period: Awaited<ReturnType<typeof getTeachingPlanTimetableOccurrences>>[number]["period"]) {
  if (!period) return null;
  const moduleTitles = [...new Set(period.pageRefs.map((page) => page.moduleTitle).filter(Boolean))];
  const pages = period.pageRefs.map((page) => page.displayPageNumber).filter((page): page is number => page !== null);
  return [bookTitle, period.chapterTitle, moduleTitles.length ? "Module: " + moduleTitles.join(", ") : null, pages.length ? "Pages " + pages.join(", ") : null].filter(Boolean).join(" · ");
}