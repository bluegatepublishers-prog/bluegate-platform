import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  ChartNoAxesCombined,
  Download,
  FileClock,
  FolderOpen,
  GraduationCap,
  Sparkles,
  UsersRound,
} from "lucide-react";

import ResourceActions from "@/components/dashboard/ResourceActions";
import { getTeacherDashboard } from "@/lib/teacher-dashboard";
import { getTeacherOpenGapProjection } from "@/lib/gaps/teacher";
import { getTeacherRemedialPlans } from "@/lib/remedials/teacher";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Teacher Dashboard | Bluegate Publishers" };

export default async function TeacherDashboardPage() {
  const dashboard = await getTeacherDashboard();
  const { teacher, stats, latestResources, recentDownloads, recentBookmarks, recentGenerations, assignedClasses, features } = dashboard;
  const insightsEnabled = Boolean(features?.GAP_ANALYSIS);
  const remedialsEnabled = Boolean(features?.REMEDIALS);
  const [gapProjection, remedialPlans] = await Promise.all([
    insightsEnabled ? getTeacherOpenGapProjection() : null,
    remedialsEnabled ? getTeacherRemedialPlans() : null,
  ]);
  const displayName = teacher.user.name.split(" ")[0] || teacher.user.name;
  const schoolName = teacher.school?.schoolName ?? teacher.schoolName;
  const currentAssignment = assignedClasses.find((assignment) => assignment.academicYear.current) ?? assignedClasses[0];
  const cards = [
    { label: "Assigned classes", value: stats.assignedClasses, icon: UsersRound, href: "#assigned-classes" },
    { label: "Assigned subjects", value: stats.assignedSubjects, icon: BookOpen, href: "#assigned-classes" },
    ...(features?.RESOURCES ? [{ label: "Available resources", value: stats.resources, icon: FolderOpen, href: "/teacher-dashboard/resources" }] : []),
    ...(features?.RESOURCES ? [{ label: "Downloads", value: stats.downloads, icon: Download, href: "/teacher-dashboard/downloads" }] : []),
    ...(features?.RESOURCES ? [{ label: "Bookmarks", value: stats.bookmarks, icon: Bookmark, href: "/teacher-dashboard/bookmarks" }] : []),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <section className="border-b border-slate-200 pb-7">
        <p className="text-sm font-semibold text-blue-700">{schoolName}</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">Good morning, {displayName}</h1>
        <p className="mt-2 max-w-2xl text-slate-600">Here is your teaching overview for today.</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
          {teacher.designation ? <span>{teacher.designation}</span> : null}
          {currentAssignment ? <span>{currentAssignment.academicYear.name}</span> : null}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => <Stat key={card.label} {...card} />)}
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Quick actions" description="Start with the work you do most often.">
          <div className="grid gap-3 sm:grid-cols-2">
            {features?.RESOURCES ? <Action href="/teacher-dashboard/resources" icon={FolderOpen} label="Browse resources" /> : null}
            {features?.AI_STUDIO ? <Action href="/teacher-dashboard/ai" icon={Sparkles} label="Create with AI" /> : null}
            {features?.RESOURCES ? <Action href="/teacher-dashboard/bookmarks" icon={Bookmark} label="View bookmarks" /> : null}
            {insightsEnabled ? <Action href="/teacher-dashboard/gaps" icon={ChartNoAxesCombined} label="Review student insights" /> : null}
          </div>
        </Panel>
        {(insightsEnabled || remedialsEnabled) ? <Panel title="Student learning insights" description="A focused view of learners who may need support.">
          <div className="grid gap-3 sm:grid-cols-3">
            {gapProjection ? <Insight value={gapProjection.studentsWithOpenGaps} label="Students needing attention" /> : null}
            {gapProjection ? <Insight value={gapProjection.openGapCount} label="Open learning gaps" /> : null}
            {remedialPlans ? <Insight value={remedialPlans.filter((plan) => plan.status === "ACTIVE").length} label="Active support plans" /> : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {insightsEnabled ? <TextLink href="/teacher-dashboard/gaps">View learning gaps</TextLink> : null}
            {remedialsEnabled ? <TextLink href="/teacher-dashboard/remedials">View support plans</TextLink> : null}
          </div>
        </Panel> : null}
      </section>

      <section id="assigned-classes" className="scroll-mt-20 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div><h2 className="text-xl font-bold text-slate-900">My classes and subjects</h2><p className="mt-1 text-slate-600">Your active teaching assignments and the approved content available for them.</p></div>
        {assignedClasses.length ? <div className="mt-5 grid gap-4 xl:grid-cols-2">{assignedClasses.map((assignment) => <article key={assignment.id} className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-semibold text-blue-700">{assignment.academicYear.name}</p><h3 className="mt-1 text-lg font-bold text-slate-900">{assignment.schoolClass.name} · Section {assignment.section.name}</h3><p className="mt-1 text-slate-600">{assignment.subject?.name ?? "Class teacher"}</p>
          {assignment.content?.book ? <div className="mt-4 border-t border-slate-100 pt-4"><p className="text-sm font-semibold text-slate-800">Approved book</p><p className="mt-1 text-sm text-slate-600">{assignment.content.book.title}</p><Link href={`/api/books/${assignment.content.book.id}/full-pdf`} target="_blank" className="mt-3 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-900">Open book <ArrowRight className="ml-1 h-4 w-4" /></Link></div> : <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">An approved book will appear here when it is ready for this class.</p>}
        </article>)}</div> : <Empty title="No classes have been assigned yet." text="Your school administrator can assign classes and subjects to your account." />}
      </section>

      {features?.RESOURCES ? <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-900">Recently added resources</h2><p className="mt-1 text-slate-600">Teaching material available to your current assignments.</p></div><TextLink href="/teacher-dashboard/resources">View all</TextLink></div>
        {latestResources.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {latestResources.map((resource) => <article key={resource.id} className="rounded-lg border border-slate-200 p-4"><p className="text-xs font-bold uppercase text-blue-700">{resource.type}</p><h3 className="mt-2 font-bold text-slate-900">{resource.title}</h3><p className="mt-1 text-sm text-slate-600">{resource.classRef?.name ?? resource.classLevel} · {resource.subjectRef?.name ?? resource.subject}</p><ResourceActions resourceId={resource.id} /></article>)}
          </div>
        ) : <Empty title="No teaching resources are available yet." text="New resources for your assignments will appear here." />}
      </section> : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Recent activity" description="Your latest downloads, saved resources, and AI materials.">
          {recentDownloads.length || recentBookmarks.length || recentGenerations.length ? <ul className="divide-y divide-slate-100">{[
            ...recentDownloads.map((item) => ({ id: `download-${item.id}`, title: item.resource.title, detail: "Downloaded resource", href: "/teacher-dashboard/downloads", icon: Download })),
            ...recentBookmarks.map((item) => ({ id: `bookmark-${item.id}`, title: item.resource.title, detail: "Saved resource", href: "/teacher-dashboard/bookmarks", icon: Bookmark })),
            ...recentGenerations.map((item) => ({ id: `generation-${item.id}`, title: item.title, detail: `${item.tool} draft`, href: `/teacher-dashboard/ai/generations/${item.id}`, icon: Sparkles })),
          ].slice(0, 6).map((item) => <li key={item.id}><Link href={item.href} className="flex items-center gap-3 py-3 hover:text-blue-800"><item.icon className="h-4 w-4 text-blue-700" aria-hidden="true" /><span className="min-w-0 flex-1 truncate font-semibold">{item.title}</span><span className="hidden text-sm text-slate-500 sm:block">{item.detail}</span><ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" /></Link></li>)}</ul> : <Empty title="No recent activity yet." text="Your downloads, bookmarks, and saved AI materials will appear here." compact />}
        </Panel>
        <Panel title="Training and notifications" description="Updates from your school and publisher will appear here.">
          <div className="flex flex-col items-start gap-3 rounded-lg bg-slate-50 p-5"><GraduationCap className="h-6 w-6 text-blue-700" aria-hidden="true" /><div><h3 className="font-semibold text-slate-900">Nothing new right now</h3><p className="mt-1 text-sm text-slate-600">Training opportunities and notices will appear when they are available.</p></div><div className="flex flex-wrap gap-3"><TextLink href="/teacher-dashboard/training">View training</TextLink>{features?.NOTIFICATIONS ? <TextLink href="/teacher-dashboard/notifications">View notifications</TextLink> : null}</div></div>
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold text-slate-900">{title}</h2><p className="mt-1 text-slate-600">{description}</p><div className="mt-5">{children}</div></section>; }
function Stat({ icon: Icon, label, value, href }: { icon: typeof Download; label: string; value: number; href: string }) { return <Link href={href} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><Icon className="h-5 w-5 text-blue-700" aria-hidden="true" /><p className="mt-4 text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-sm text-slate-600">{label}</p></Link>; }
function Action({ href, icon: Icon, label }: { href: string; icon: typeof FolderOpen; label: string }) { return <Link href={href} className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 font-semibold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><Icon className="h-5 w-5 text-blue-700" aria-hidden="true" />{label}<ArrowRight className="ml-auto h-4 w-4 text-slate-400" aria-hidden="true" /></Link>; }
function Insight({ value, label }: { value: number; label: string }) { return <div className="rounded-lg bg-slate-50 p-4"><p className="text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-sm text-slate-600">{label}</p></div>; }
function Empty({ title, text, compact = false }: { title: string; text: string; compact?: boolean }) { return <div className={`rounded-lg bg-slate-50 text-center ${compact ? "p-5" : "mt-5 p-8"}`}><FileClock className="mx-auto h-7 w-7 text-slate-400" aria-hidden="true" /><h3 className="mt-3 font-semibold text-slate-900">{title}</h3><p className="mt-1 text-sm text-slate-600">{text}</p></div>; }
function TextLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link href={href} className="inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{children}<ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" /></Link>; }
