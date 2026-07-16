import { getMentorDashboard } from "@/lib/mentor-dashboard";

export default async function MentorSessionsPage() {
  const report = await getMentorDashboard();
  return <main className="space-y-6 p-4 sm:p-6 lg:p-8"><header><p className="font-bold text-indigo-700">Architecture placeholder</p><h1 className="mt-2 text-3xl font-bold">Mentor Sessions</h1><p className="mt-2 text-slate-600">Session records support Scheduled, Completed and Cancelled states. Live meetings, chat, video and calling are intentionally absent.</p></header>{report.upcomingSessions.length?<section className="grid gap-4 md:grid-cols-2">{report.upcomingSessions.map(session=><article key={session.id} className="rounded-2xl border bg-white p-6"><p className="font-bold">{session.student.name}</p><p className="mt-2 text-slate-600">{session.topic ?? "Mentor session"}</p><p className="mt-2 text-sm text-slate-500">{session.scheduledAt.toLocaleString()} · {session.status}</p></article>)}</section>:<div className="rounded-2xl border bg-white p-8 text-slate-600">No upcoming mentor session is scheduled.</div>}</main>;
}
