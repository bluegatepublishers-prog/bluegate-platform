import Link from "next/link";
import { ClipboardCheck, FileWarning, FolderOpen, UsersRound } from "lucide-react";
import TeacherClassChat from "@/components/classroom/TeacherClassChat";
import { getTeacherWorkspaceData } from "@/lib/teacher-experience";

export default async function TeacherClassOverviewPage({ params, searchParams }: { params: Promise<{ sectionId: string }>; searchParams: Promise<{ subject?: string }> }) {
  const { sectionId } = await params;
  const data = await getTeacherWorkspaceData(sectionId, (await searchParams).subject);
  const planHref = `/teacher-dashboard/classes/${sectionId}/plan?subject=${data.subject.id}`;
  const current = data.plans.find((item) => item.currentDate <= data.now && !["COMPLETED", "SKIPPED", "CANCELLED"].includes(item.status));
  const upcoming = data.plans.filter((item) => item !== current && item.currentDate >= data.now);
  const pendingAssignments = data.assignments.reduce((sum, item) => sum + item.submissions.length, 0);
  const pendingAssessments = data.assessments.reduce((sum, item) => sum + item.attempts.filter((attempt) => ["PENDING_REVIEW", "SUBMITTED"].includes(attempt.status)).length, 0);

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.65fr)]"><div className="space-y-6">
    <section className="rounded-3xl border bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-blue-600">Today&apos;s Plan · {data.subject.subject.name}</p><h2 className="mt-2 text-2xl font-bold">{current?.title ?? "No active lesson"}</h2>{current ? <p className="mt-2 text-slate-500">{current.description}</p> : null}</div>{current ? <Link href={planHref} className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-white">Continue Teaching</Link> : null}</div></section>
    <section data-testid="teacher-v2-content-entry" className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Publisher content</p><h2 className="mt-2 text-lg font-bold">Teaching Plan &amp; Published Book Pages</h2><p className="mt-2 text-sm text-slate-600">Map V2 pages to periods, preview them, teach from the shared read-only renderer, and create Classwork or Homework from the class context.</p><Link href={planHref} className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Open Teaching Plan</Link></section>
    <section className="rounded-3xl border bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Upcoming Lessons</h2><Link href={planHref} className="text-sm font-semibold text-blue-600">View Plan</Link></div>{upcoming.length ? <div className="mt-4 divide-y">{upcoming.slice(0, 4).map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-4"><div><strong>{item.title}</strong><p className="mt-1 text-sm text-slate-500">{item.currentDate.toLocaleString("en-IN")}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{item.status}</span></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No upcoming lessons.</p>}</section>
    <div className="grid gap-4 sm:grid-cols-2"><Metric icon={ClipboardCheck} label="Assignments Pending Review" value={pendingAssignments} href={`/teacher-dashboard/classes/${sectionId}/assignments?subject=${data.subject.id}`} /><Metric icon={FileWarning} label="Assessments To Grade" value={pendingAssessments} href={`/teacher-dashboard/classes/${sectionId}/assessments?subject=${data.subject.id}`} /><Metric icon={UsersRound} label="Students Need Attention" value={data.attention} href={`/teacher-dashboard/classes/${sectionId}/progress?subject=${data.subject.id}`} /><Metric icon={FolderOpen} label="Class Materials" value={data.materials} href={`/teacher-dashboard/classes/${sectionId}/materials?subject=${data.subject.id}`} /></div>
  </div><aside><TeacherClassChat sectionId={sectionId} compact /></aside></div>;
}

function Metric({ icon: Icon, label, value, href }: { icon: typeof ClipboardCheck; label: string; value: number; href: string }) { return <Link href={href} className="rounded-3xl border bg-white p-5 shadow-sm"><Icon className="h-7 w-7 text-blue-600" /><p className="mt-4 text-3xl font-bold">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></Link>; }
