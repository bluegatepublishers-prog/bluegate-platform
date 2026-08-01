import Link from "next/link";

import { getMentorStudentProfile } from "@/lib/mentor-dashboard";

function percent(value: number | null | undefined) {
  return value == null ? "Not available" : `${Math.round(value)}%`;
}

export default async function MentorStudentOverviewPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const profile = await getMentorStudentProfile(studentId);

  const upcomingSession = profile.sessions.find((item) => item.status === "SCHEDULED" && item.scheduledAt >= new Date());
  const recentNotes = profile.notes.slice(0, 3);
  const teacherRemarks = profile.assignments
    .flatMap((assignment) => assignment.submissions)
    .filter((submission) => submission.teacherFeedback)
    .slice(0, 3);

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,.95fr)]">
      <div className="space-y-6">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Student Overview</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Current academic year</dt><dd className="mt-1 font-semibold">{profile.assignment.academicYear.name}</dd></div>
            <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Overall learning status</dt><dd className="mt-1 font-semibold">{percent(profile.analytics?.averageAssessment ?? profile.analytics?.averagePractice ?? profile.analytics?.readingPercent ?? null)}</dd></div>
            <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Attendance summary</dt><dd className="mt-1 font-semibold">{profile.latestReportCard?.attendanceSnapshot ? "Published in report card" : "Not available"}</dd></div>
            <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Assignment completion</dt><dd className="mt-1 font-semibold">{profile.assignments.length ? `${profile.assignments.filter((item) => item.submissions[0]?.status === "SUBMITTED" || item.submissions[0]?.status === "GRADED").length}/${profile.assignments.length}` : "No assignments"}</dd></div>
            <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Assessment performance</dt><dd className="mt-1 font-semibold">{percent(profile.analytics?.averageAssessment ?? null)}</dd></div>
            <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Active learning gaps</dt><dd className="mt-1 font-semibold">{profile.gaps.length}</dd></div>
            <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Active remedials</dt><dd className="mt-1 font-semibold">{profile.remedials.filter((item) => item.status === "ACTIVE").length}</dd></div>
            <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Upcoming mentor session</dt><dd className="mt-1 font-semibold">{upcomingSession ? upcomingSession.scheduledAt.toLocaleString("en-IN") : "Not scheduled"}</dd></div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/mentor-dashboard/students/${studentId}/notes`} className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">Add Mentor Note</Link>
            <Link href={`/mentor-dashboard/students/${studentId}/sessions`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Schedule Session</Link>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Published Teacher Remarks</h2>
          {teacherRemarks.length ? (
            <ul className="mt-4 space-y-3">
              {teacherRemarks.map((remark) => (
                <li key={remark.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-700">{remark.teacherFeedback}</p>
                  <p className="mt-1 text-xs text-slate-500">{remark.gradedAt ? remark.gradedAt.toLocaleDateString("en-IN") : "Published"}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No released teacher remarks are available yet.</p>
          )}
        </article>
      </div>

      <div className="space-y-6">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Recent Mentor Notes</h2>
          {recentNotes.length ? (
            <ul className="mt-4 space-y-3">
              {recentNotes.map((note) => (
                <li key={note.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{note.type.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-sm text-slate-700">{note.body.slice(0, 140)}</p>
                  <p className="mt-1 text-xs text-slate-500">{note.createdAt.toLocaleString("en-IN")}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No mentor notes yet.</p>
          )}
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Support Snapshot</h2>
          {profile.gaps.length ? (
            <ul className="mt-4 space-y-3">
              {profile.gaps.slice(0, 5).map((gap) => (
                <li key={gap.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-semibold text-amber-900">{gap.subject?.name ?? gap.chapter?.title ?? gap.skillLabel ?? "Support area"}</p>
                  <p className="mt-1 text-sm text-amber-800">{gap.severity} · {gap.status}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No active learning gaps are currently open.</p>
          )}
        </article>
      </div>
    </section>
  );
}
