import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  FileQuestion,
  Library,
  MessageSquare,
  School,
  TimerReset,
  UsersRound,
} from "lucide-react";

import {
  TeacherEmptyState,
  TeacherFeatureTile,
  TeacherMetricTile,
  TeacherSection,
  TeacherStatusBadge,
  teacherTypography,
} from "@/components/teacher/TeacherUI";
import { getTeacherHomeData } from "@/lib/teacher-experience";

export const dynamic = "force-dynamic";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Teacher";
}

export default async function TeacherDashboardPage() {
  const data = await getTeacherHomeData();
  const firstAssignment = data.assignments[0];
  const feature = (key: keyof typeof data.featureAccess) => Boolean(data.featureAccess[key]);
  const assignedWorkspace = firstAssignment
    ? `/teacher-dashboard/classes/${firstAssignment.sectionId}?subject=${encodeURIComponent(firstAssignment.subjectId)}`
    : undefined;
  const plannerHref = firstAssignment
    ? `/teacher-dashboard/classes/${firstAssignment.sectionId}/plan?subject=${encodeURIComponent(firstAssignment.subjectId)}`
    : undefined;
  const attendanceHref = firstAssignment
    ? `/teacher-dashboard/attendance?view=mark&sectionId=${encodeURIComponent(firstAssignment.sectionId)}&subject=${encodeURIComponent(firstAssignment.subjectId)}`
    : undefined;
  const assessmentHref = firstAssignment
    ? `/teacher-dashboard/classes/${firstAssignment.sectionId}/assessments/new?subject=${encodeURIComponent(firstAssignment.subjectId)}`
    : undefined;
  const assignmentHref = firstAssignment
    ? `/teacher-dashboard/classes/${firstAssignment.sectionId}/assignments/new?subject=${encodeURIComponent(firstAssignment.subjectId)}`
    : undefined;
  const homeworkHref = firstAssignment
    ? `/teacher-dashboard/classes/${firstAssignment.sectionId}/assignments?subject=${encodeURIComponent(firstAssignment.subjectId)}`
    : undefined;

  return <main className="space-y-7 bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 p-6 text-white shadow-lg sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">Daily teaching workspace</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Good morning, {firstName(data.teacher.user.name)}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Your assigned classes, teaching plans, and classroom follow-up in one place.</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-slate-200">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">School workspace</p>
          <p className="mt-1 font-semibold">{data.teacher.school?.schoolName ?? data.teacher.schoolName}</p>
        </div>
      </div>
      <div className="mt-7 flex flex-wrap gap-3">
        {assignedWorkspace ? <Link href={assignedWorkspace} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-teal-300"><School className="h-4 w-4" />Open my first class</Link> : <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-slate-200">No active class assignment</span>}
        <Link href="/teacher-dashboard/profile" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10">View profile</Link>
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <TeacherMetricTile icon={UsersRound} value={data.assignments.length} label="Assigned subjects" detail="School assignments" tone="blue" href="/teacher-dashboard/classes" />
      <TeacherMetricTile icon={BookOpenCheck} value={data.teachingPlanCount} label="Teaching plans" detail="Current academic year" tone="teal" href={feature("PLANNER") ? "/teacher-dashboard/planner" : undefined} />
      <TeacherMetricTile icon={CheckSquare} value={feature("HOMEWORK") ? data.assignmentReview : "—"} label="Work to review" detail={feature("HOMEWORK") ? "Submitted classroom work" : "Homework unavailable"} tone="amber" href={feature("HOMEWORK") ? "/teacher-dashboard/classes" : undefined} />
      <TeacherMetricTile icon={ClipboardCheck} value={feature("ASSESSMENTS") ? data.assessmentGrade : "—"} label="Assessments to grade" detail={feature("ASSESSMENTS") ? "Pending responses" : "Assessments unavailable"} tone="violet" href={feature("ASSESSMENTS") ? "/teacher-dashboard/classes" : undefined} />
    </section>

    <TeacherSection title="Today's workspace" eyebrow="TIMETABLE" description="Timetable is not operational yet, so no class schedule is fabricated here.">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><TimerReset className="h-5 w-5" /></span><div><h3 className={teacherTypography.cardTitle}>Timetable setup pending</h3><p className={`mt-1 ${teacherTypography.helper}`}>Use your assigned subjects below until the school timetable is available.</p></div></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-teal-700" /><h3 className={teacherTypography.cardTitle}>Next seven days</h3></div><p className={`mt-2 ${teacherTypography.body}`}>{data.plans.length ? `${data.plans.length} persisted teaching item${data.plans.length === 1 ? "" : "s"} are scheduled.` : "No teaching items are scheduled for the next seven days."}</p>{plannerHref ? <Link href={plannerHref} className="mt-3 inline-flex text-xs font-bold text-teal-700">Open subject planner <span className="ml-1" aria-hidden="true">→</span></Link> : null}</div>
      </div>
    </TeacherSection>

    <TeacherSection title="Quick actions" eyebrow="FEATURES" description="Each action opens an existing teacher workflow and follows the school's effective feature access.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TeacherFeatureTile icon={ClipboardCheck} label="Mark attendance" description="Open the existing attendance workflow." href={attendanceHref} enabled={feature("ATTENDANCE") && Boolean(attendanceHref)} tone="teal" status={feature("ATTENDANCE") ? undefined : "Unavailable for this school"} />
        <TeacherFeatureTile icon={BookOpen} label="Subject planner" description="Plan content for an assigned subject." href={plannerHref} enabled={feature("PLANNER") && Boolean(plannerHref)} tone="blue" status={feature("PLANNER") ? undefined : "Unavailable for this school"} />
        <TeacherFeatureTile icon={CalendarDays} label="Timetable" description="School timetable setup is not available yet." enabled={false} tone="slate" status="Setup pending" />
        <TeacherFeatureTile icon={FileQuestion} label="Create assessment" description="Build an assessment for an assigned subject." href={assessmentHref} enabled={feature("ASSESSMENTS") && Boolean(assessmentHref)} tone="violet" status={feature("ASSESSMENTS") ? undefined : "Unavailable for this school"} />
        <TeacherFeatureTile icon={ClipboardCheck} label="Create assignment" description="Create classroom work for your assigned class." href={assignmentHref} enabled={feature("HOMEWORK") && Boolean(assignmentHref)} tone="amber" status={feature("HOMEWORK") ? undefined : "Unavailable for this school"} />
        <TeacherFeatureTile icon={MessageSquare} label="Publish homework" description="Open the existing assignment publishing workspace." href={homeworkHref} enabled={feature("HOMEWORK") && Boolean(homeworkHref)} tone="rose" status={feature("HOMEWORK") ? undefined : "Unavailable for this school"} />
        <TeacherFeatureTile icon={Library} label="Resources" description="Browse publisher resources available to teachers." href="/teacher-dashboard/resources" enabled={feature("TEACHER_RESOURCES")} tone="teal" status={feature("TEACHER_RESOURCES") ? undefined : "Unavailable for this school"} />
        <TeacherFeatureTile icon={FileQuestion} label="Question bank" description="Create and reuse your private teacher questions." href="/teacher-dashboard/question-bank" tone="blue" />
      </div>
    </TeacherSection>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
      <TeacherSection title="My teaching" eyebrow="ASSIGNMENTS" description="These are the School-owned assignments currently available to you.">
        {data.assignments.length ? <div className="grid gap-3 sm:grid-cols-2">{data.assignments.map((item) => <Link key={`${item.sectionId}-${item.subjectId}`} href={`/teacher-dashboard/classes/${item.sectionId}?subject=${encodeURIComponent(item.subjectId)}`} className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-white hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className={teacherTypography.cardTitle}>{item.className}-{item.sectionName}</h3><p className="mt-1 text-sm font-semibold text-teal-700">{item.subjectName}</p></div><School className="h-5 w-5 text-slate-300 transition group-hover:text-teal-600" /></div><div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><BookOpen className="h-3.5 w-3.5" />{item.book ? `Book: ${item.book.title}` : "No book assigned by School"}</div></Link>)}</div> : <TeacherEmptyState icon={School} title="No active assignments yet" description="Ask your School administrator to assign a class or subject before starting teacher work." />}
      </TeacherSection>

      <div className="space-y-6">
        <TeacherSection title="Planned teaching" action={feature("PLANNER") ? { label: "View planner", href: "/teacher-dashboard/planner" } : undefined}>
          {data.plans.length ? <div className="space-y-3">{data.plans.slice(0, 5).map((item) => <div key={item.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className={teacherTypography.cardTitle}>{item.title}</h3><p className={`mt-1 ${teacherTypography.helper}`}>{item.section?.schoolClass.name}-{item.section?.name} · {item.sectionSubject?.subject.name}</p></div><TeacherStatusBadge tone={item.status === "COMPLETED" ? "teal" : item.status === "RESCHEDULED" ? "amber" : "slate"}>{item.status.replaceAll("_", " ")}</TeacherStatusBadge></div><p className={`mt-3 ${teacherTypography.helper}`}>{item.currentDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p></div>)}</div> : <TeacherEmptyState icon={CalendarDays} title="No planned teaching items" description="Open an assigned subject to create or manage the existing teaching plan." action={plannerHref ? { label: "Open subject planner", href: plannerHref } : undefined} />}
        </TeacherSection>
        <TeacherSection title="Recent class messages" action={{ label: "Open messages", href: "/teacher-dashboard/messages" }}>
          {data.messages.length ? <div className="space-y-3">{data.messages.slice(0, 3).map((message) => <div key={message.id} className="rounded-2xl border border-slate-100 bg-teal-50/60 p-3"><div className="flex items-start justify-between gap-3"><strong className="text-sm text-slate-800">{message.sender.name}</strong><span className="text-[0.68rem] text-slate-400">{message.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div><p className="mt-1 line-clamp-2 text-sm text-slate-600">{message.text}</p></div>)}</div> : <TeacherEmptyState icon={MessageSquare} title="No recent messages" description="Messages from your assigned class rooms will appear here." />}
        </TeacherSection>
      </div>
    </div>

    {feature("REPORTS") ? <TeacherSection title="Results and reports" eyebrow="INSIGHTS" description="Review persisted learning analytics for your assigned learners." action={{ label: "Open reports", href: "/teacher-dashboard/reports" }}><div className="flex items-center gap-4 rounded-2xl border border-violet-100 bg-violet-50 p-4"><BarChart3 className="h-5 w-5 text-violet-700" /><p className={teacherTypography.body}>Reports are available for the classes and subjects assigned by your School.</p></div></TeacherSection> : null}
  </main>;
}