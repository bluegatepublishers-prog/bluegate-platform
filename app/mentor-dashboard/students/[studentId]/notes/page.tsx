import { createMentorNoteAction, reviseMentorNoteAction } from "../../actions";
import { getMentorStudentProfile } from "@/lib/mentor-dashboard";

const noteTypes = [
  "OBSERVATION",
  "ENCOURAGEMENT",
  "ACTION_PLAN",
  "PARENT_NOTE",
  "PRIVATE_NOTE",
] as const;

export default async function MentorStudentNotesPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const profile = await getMentorStudentProfile(studentId);

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Add Mentor Note</h2>
        <p className="mt-2 text-sm text-slate-600">Mentor notes are private and remain within mentor workflows.</p>

        <form action={createMentorNoteAction} className="mt-4 space-y-3">
          <input type="hidden" name="studentId" value={studentId} />
          <select name="type" defaultValue="OBSERVATION" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {noteTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
          </select>
          <textarea name="body" minLength={5} maxLength={2000} required rows={4} placeholder="Write note" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">Save Note</button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Mentor Notes</h2>
        {profile.notes.length ? (
          <ul className="mt-4 space-y-3">
            {profile.notes.map((note) => (
              <li key={note.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{note.type.replaceAll("_", " ")}</p>
                <p className="mt-2 text-sm text-slate-700">{note.body}</p>
                <p className="mt-1 text-xs text-slate-500">Created: {note.createdAt.toLocaleString("en-IN")}</p>
                <form action={reviseMentorNoteAction} className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                  <input type="hidden" name="studentId" value={studentId} />
                  <input type="hidden" name="noteId" value={note.id} />
                  <input type="hidden" name="type" value={note.type} />
                  <input name="body" minLength={5} maxLength={2000} required placeholder="Amend note (non-destructive revision)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Save Revision</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No notes are available for this student.</p>
        )}
      </section>
    </main>
  );
}
