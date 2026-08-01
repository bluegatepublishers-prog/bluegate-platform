import { createMentorNoteAction, reviseMentorNoteAction } from "@/app/mentor-dashboard/students/actions";
import { getMentorDashboard } from "@/lib/mentor-dashboard";

export default async function MentorNotesPage() {
  const dashboard = await getMentorDashboard();

  const studentOptions = dashboard.assignments.map((item) => ({
    studentId: item.assignment.student.id,
    name: item.assignment.student.name,
  }));

  const notes = dashboard.recentNotes;

  return (
    <main className="space-y-6">
      <header className="rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Mentor Notes</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Notes</h1>
        <p className="mt-2 text-slate-600">Private professional records for assigned students only.</p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Create Note</h2>
        <form action={createMentorNoteAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <select name="studentId" required className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select assigned student</option>
            {studentOptions.map((student) => <option key={student.studentId} value={student.studentId}>{student.name}</option>)}
          </select>
          <select name="type" defaultValue="OBSERVATION" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="OBSERVATION">Observation</option>
            <option value="ENCOURAGEMENT">Encouragement</option>
            <option value="ACTION_PLAN">Support Recommendation</option>
            <option value="PARENT_NOTE">Career Guidance</option>
            <option value="PRIVATE_NOTE">Follow-up</option>
          </select>
          <textarea name="body" minLength={5} maxLength={2000} required rows={4} placeholder="Write mentor note" className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
          <button type="submit" className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white md:col-span-2">Create</button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Recent Notes</h2>
        {notes.length ? (
          <ul className="mt-4 space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{note.type.replaceAll("_", " ")}</p>
                <p className="mt-1 font-semibold text-slate-900">{note.student.name}</p>
                <p className="mt-2 text-sm text-slate-700">{note.body.slice(0, 150)}</p>
                <p className="mt-1 text-xs text-slate-500">Created {note.createdAt.toLocaleString("en-IN")}</p>
                <form action={reviseMentorNoteAction} className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                  <input type="hidden" name="studentId" value={note.studentId} />
                  <input type="hidden" name="noteId" value={note.id} />
                  <input type="hidden" name="type" value={note.type} />
                  <input name="body" minLength={5} maxLength={2000} required placeholder="Revise note (creates immutable amendment)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Save Revision</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No mentor notes created yet.</p>
        )}
      </section>
    </main>
  );
}
