import Link from "next/link";
import { Bell, Bookmark, Download, FolderOpen, School } from "lucide-react";

import ResourceActions from "@/components/dashboard/ResourceActions";
import { getTeacherDashboard } from "@/lib/teacher-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Teacher Dashboard | Bluegate Publishers" };

export default async function TeacherDashboardPage() {
  const { teacher, stats, latestResources, recentDownloads } = await getTeacherDashboard();

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <section className="rounded-3xl bg-gradient-to-br from-blue-700 to-slate-900 p-7 text-white shadow-xl sm:p-10">
        <p className="font-semibold text-blue-100">Welcome back</p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{teacher.user.name}</h1>
        <p className="mt-4 flex items-center gap-2 text-blue-100"><School className="h-5 w-5" />{teacher.school?.schoolName ?? teacher.schoolName}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/teacher-dashboard/resources" className="rounded-xl bg-white px-5 py-3 font-semibold text-blue-700">Browse resources</Link>
          <Link href="/teacher-dashboard/downloads" className="rounded-xl border border-white/30 px-5 py-3 font-semibold">My downloads</Link>
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-3">
        <Stat icon={Download} label="Downloads" value={stats.downloads} />
        <Stat icon={Bookmark} label="Bookmarks" value={stats.bookmarks} />
        <Stat icon={FolderOpen} label="Available resources" value={stats.resources} />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-2xl font-bold text-slate-900">Latest Resources</h2><p className="mt-2 text-slate-600">Recently added teaching material.</p></div>
          <Link href="/teacher-dashboard/resources" className="font-semibold text-blue-700">View all</Link>
        </div>
        {latestResources.length ? (
          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {latestResources.map((resource) => (
              <article key={resource.id} className="rounded-2xl border border-slate-200 p-5">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{resource.type}</span>
                <h3 className="mt-4 font-bold text-slate-900">{resource.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{resource.classLevel} · {resource.subject}</p>
                <ResourceActions resourceId={resource.id} />
              </article>
            ))}
          </div>
        ) : <Empty text="No resources are available yet." />}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900">Recent Downloads</h2>
        {recentDownloads.length ? (
          <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[650px]"><thead><tr className="border-b text-left text-sm text-slate-500"><th className="pb-4">Resource</th><th className="pb-4">Subject</th><th className="pb-4">Type</th><th className="pb-4">Downloaded</th></tr></thead><tbody>{recentDownloads.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="py-4 font-semibold">{item.resource.title}</td><td>{item.resource.subject}</td><td>{item.resource.type}</td><td>{item.downloadedAt.toLocaleString("en-IN")}</td></tr>)}</tbody></table></div>
        ) : <Empty text="Your download history is empty." />}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Bell className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-4 text-xl font-bold">No notifications</h2><p className="mt-2 text-slate-500">You are all caught up.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Quick href="/teacher-dashboard/resources" label="Browse Resources" />
        <Quick href="/teacher-dashboard/bookmarks" label="View Bookmarks" />
        <Quick href="/teacher-dashboard/profile" label="View Profile" />
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Download; label: string; value: number }) { return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><Icon className="h-8 w-8 text-blue-700" /><p className="mt-5 text-3xl font-bold">{value}</p><p className="mt-1 text-slate-600">{label}</p></div>; }
function Empty({ text }: { text: string }) { return <p className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">{text}</p>; }
function Quick({ href, label }: { href: string; label: string }) { return <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-5 font-semibold text-blue-700 shadow-sm transition hover:border-blue-300">{label} →</Link>; }
