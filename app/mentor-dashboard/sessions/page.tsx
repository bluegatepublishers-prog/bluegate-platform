import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getMentorDashboard } from "@/lib/mentor-dashboard";
import { cancelMentorSessionAction, completeMentorSessionAction, scheduleMentorSessionAction } from "@/app/mentor-dashboard/students/actions";

type SearchParams = Promise<{ view?: string }>;

function isToday(value: Date) {
  const now = new Date();
  return value.getFullYear() === now.getFullYear() && value.getMonth() === now.getMonth() && value.getDate() === now.getDate();
}

export default async function MentorSessionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const view = params.view ?? "upcoming";
  const report = await getMentorDashboard();

  const assignmentIds = report.assignments.map((item) => item.assignment.id);
  const studentOptions = report.assignments.map((item) => ({ id: item.assignment.student.id, name: item.assignment.student.name }));

  const sessions = assignmentIds.length
    ? await prisma.mentorSession.findMany({
        where: { mentorId: report.mentor.id, assignmentId: { in: assignmentIds } },
        include: { student: { select: { id: true, name: true } } },
        orderBy: { scheduledAt: "desc" },
      })
    : [];

  const filtered = sessions.filter((session) => {
    if (view === "all") return true;
    if (view === "today") return isToday(session.scheduledAt);
    if (view === "completed") return session.status === "COMPLETED";
    if (view === "cancelled") return session.status === "CANCELLED";
    return session.status === "SCHEDULED" && session.scheduledAt >= new Date();
  });

  return (
    <main className="space-y-6">
      <header className="rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Mentor Sessions</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Sessions</h1>
        <p className="mt-2 text-slate-600">Mentor-scoped sessions for assigned students only.</p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Schedule Session</h2>
        <form action={scheduleMentorSessionAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <select name="studentId" required className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select assigned student</option>
            {studentOptions.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
          </select>
          <input type="text" name="topic" placeholder="Session title" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input type="datetime-local" name="scheduledAt" required className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" name="durationMinutes" min={10} max={240} defaultValue={45} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white md:col-span-2">Schedule</button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            ["upcoming", "Upcoming"],
            ["today", "Today"],
            ["completed", "Completed"],
            ["cancelled", "Cancelled"],
            ["all", "All"],
          ].map(([key, label]) => (
            <Link key={key} href={`/mentor-dashboard/sessions?view=${key}`} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === key ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-700"}`}>
              {label}
            </Link>
          ))}
        </div>

        {filtered.length ? (
          <div className="mt-4 space-y-4">
            {filtered.map((session) => (
              <article key={session.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{session.topic ?? "Mentor Session"}</p>
                    <p className="mt-1 text-sm text-slate-600">{session.student.name} · {session.scheduledAt.toLocaleString("en-IN")} · {session.durationMinutes ?? 45} min</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{session.status}</p>
                  </div>
                  <Link href={`/mentor-dashboard/students/${session.studentId}/sessions`} className="text-sm font-semibold text-indigo-700">Open student session</Link>
                </div>

                {session.status === "SCHEDULED" ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <form action={completeMentorSessionAction} className="rounded-2xl bg-slate-50 p-3">
                      <input type="hidden" name="studentId" value={session.studentId} />
                      <input type="hidden" name="sessionId" value={session.id} />
                      <textarea name="summary" rows={2} placeholder="Session summary" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      <button type="submit" className="mt-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Mark Completed</button>
                    </form>

                    <form action={cancelMentorSessionAction} className="rounded-2xl bg-slate-50 p-3">
                      <input type="hidden" name="studentId" value={session.studentId} />
                      <input type="hidden" name="sessionId" value={session.id} />
                      <input name="reason" minLength={5} maxLength={500} required placeholder="Cancellation reason" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      <button type="submit" className="mt-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white">Cancel Session</button>
                    </form>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No sessions found in this view.</p>
        )}
      </section>
    </main>
  );
}
