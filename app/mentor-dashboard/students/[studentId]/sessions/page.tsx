import { cancelMentorSessionAction, completeMentorSessionAction, scheduleMentorSessionAction } from "../../actions";
import { getMentorStudentProfile } from "@/lib/mentor-dashboard";

export default async function MentorStudentSessionsPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const profile = await getMentorStudentProfile(studentId);

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Schedule Session</h2>
        <form action={scheduleMentorSessionAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="studentId" value={studentId} />
          <input type="text" name="topic" placeholder="Session title" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input type="datetime-local" name="scheduledAt" required className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" name="durationMinutes" min={10} max={240} defaultValue={45} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white md:col-span-2">Schedule Session</button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Session History</h2>
        {profile.sessions.length ? (
          <div className="mt-4 space-y-4">
            {profile.sessions.map((session) => (
              <article key={session.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{session.topic ?? "Mentor Session"}</p>
                    <p className="mt-1 text-sm text-slate-600">{session.status} · {session.scheduledAt.toLocaleString("en-IN")} · {session.durationMinutes ?? 45} min</p>
                  </div>
                </div>

                {session.status === "SCHEDULED" ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <form action={completeMentorSessionAction} className="space-y-2 rounded-2xl bg-slate-50 p-3">
                      <input type="hidden" name="studentId" value={studentId} />
                      <input type="hidden" name="sessionId" value={session.id} />
                      <textarea name="summary" rows={2} placeholder="Session summary" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      <button type="submit" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Mark Completed</button>
                    </form>

                    <form action={cancelMentorSessionAction} className="space-y-2 rounded-2xl bg-slate-50 p-3">
                      <input type="hidden" name="studentId" value={studentId} />
                      <input type="hidden" name="sessionId" value={session.id} />
                      <input name="reason" minLength={5} maxLength={500} required placeholder="Cancellation reason" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      <button type="submit" className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white">Cancel Session</button>
                    </form>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No sessions are available for this student yet.</p>
        )}
      </section>
    </main>
  );
}
