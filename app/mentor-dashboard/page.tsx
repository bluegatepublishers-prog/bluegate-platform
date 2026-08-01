import Link from "next/link";
import { AlertTriangle, CalendarClock, NotebookPen, TrendingDown, TriangleAlert, UsersRound } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getMentorDashboard } from "@/lib/mentor-dashboard";

function classifyProgress(reading: number | null, practice: number | null, assessment: number | null) {
  const values = [reading, practice, assessment].filter((value): value is number => Number.isFinite(value));
  if (!values.length) return "Needs Practice" as const;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (average >= 85) return "Excellent" as const;
  if (average >= 65) return "On Track" as const;
  if (average >= 45) return "Needs Practice" as const;
  return "Needs Support" as const;
}

function formatDateTime(value: Date) {
  return value.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function toPercent(value: number | null | undefined) {
  return value == null ? "Not available" : `${Math.round(value)}%`;
}

export default async function MentorDashboardPage() {
  const report = await getMentorDashboard();
  const now = new Date();

  const assignedStudentIds = report.assignments.map((item) => item.assignment.studentId);
  const assignmentIds = report.assignments.map((item) => item.assignment.id);
  const sectionIds = [...new Set(report.assignments.map((item) => item.enrollment.sectionId))];

  const [analytics, openGaps, latestReportCards, overdueAssignments, recentPublishedResults, cancelledOrMissedSessions] = assignedStudentIds.length
    ? await Promise.all([
        prisma.studentAnalytics.findMany({ where: { studentId: { in: assignedStudentIds }, academicYearId: { in: report.assignments.map((item) => item.assignment.academicYearId) } }, select: { studentId: true, readingPercent: true, averagePractice: true, averageAssessment: true } }),
        prisma.studentLearningGap.findMany({ where: { studentId: { in: assignedStudentIds }, academicYearId: { in: report.assignments.map((item) => item.assignment.academicYearId) }, status: { in: ["OPEN", "ACKNOWLEDGED"] } }, select: { id: true, studentId: true, severity: true, updatedAt: true } }),
        prisma.reportCardSnapshot.findMany({ where: { studentId: { in: assignedStudentIds } }, orderBy: { issuedAt: "desc" }, take: 120, select: { studentId: true, attendanceSnapshot: true, issuedAt: true } }),
        prisma.assignmentSubmission.findMany({ where: { studentId: { in: assignedStudentIds }, assignment: { sectionId: { in: sectionIds }, status: { in: ["PUBLISHED", "CLOSED"] }, dueAt: { lt: now } } }, include: { assignment: { select: { title: true, dueAt: true } }, student: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 20 }),
        prisma.assessmentResult.findMany({ where: { publishedAt: { gte: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7) }, attempt: { studentId: { in: assignedStudentIds } } }, include: { attempt: { include: { student: { select: { name: true } }, assessment: { select: { title: true } } } } }, orderBy: { publishedAt: "desc" }, take: 20 }),
        prisma.mentorSession.findMany({ where: { mentorId: report.mentor.id, assignmentId: { in: assignmentIds }, OR: [{ status: "CANCELLED" }, { status: "SCHEDULED", scheduledAt: { lt: now } }] }, include: { student: { select: { name: true } } }, orderBy: { scheduledAt: "desc" }, take: 20 }),
      ])
    : [[], [], [], [], [], []];

  const analyticsMap = new Map(analytics.map((item) => [item.studentId, item]));
  const gapsByStudent = new Map<string, number>();
  for (const gap of openGaps) gapsByStudent.set(gap.studentId, (gapsByStudent.get(gap.studentId) ?? 0) + 1);

  const latestAttendanceByStudent = new Map<string, { label: string; issuedAt: Date }>();
  for (const row of latestReportCards) {
    if (latestAttendanceByStudent.has(row.studentId)) continue;
    const snapshot = row.attendanceSnapshot as { attendancePercent?: number } | null;
    const percent = snapshot?.attendancePercent;
    latestAttendanceByStudent.set(
      row.studentId,
      { label: percent == null ? "Not published" : `${Math.round(percent)}% attendance`, issuedAt: row.issuedAt },
    );
  }

  const computed = report.assignments.reduce((acc, item) => {
    const metrics = analyticsMap.get(item.assignment.studentId);
    const baseStatus = classifyProgress(metrics?.readingPercent ?? null, metrics?.averagePractice ?? null, metrics?.averageAssessment ?? null);
    const gapCount = gapsByStudent.get(item.assignment.studentId) ?? 0;
    const status = gapCount >= 2 && baseStatus !== "Needs Support" ? "Needs Support" : baseStatus;

    acc.progressCounts[status] += 1;
    if (status === "Excellent" || status === "On Track") acc.studentsOnTrack += 1;
    if (status === "Needs Practice" || status === "Needs Support") acc.studentsNeedingAttention += 1;

    acc.studentRows.push({
      id: item.assignment.student.id,
      name: item.assignment.student.name,
      classLabel: `${item.enrollment.schoolClass.name} - ${item.enrollment.section.name}`,
      school: item.assignment.student.school.schoolName,
      status,
      attendance: latestAttendanceByStudent.get(item.assignment.studentId)?.label ?? "Not available",
      gapCount,
      reading: toPercent(metrics?.readingPercent ?? null),
      practice: toPercent(metrics?.averagePractice ?? null),
      assessment: toPercent(metrics?.averageAssessment ?? null),
    });
    return acc;
  }, {
    progressCounts: { Excellent: 0, "On Track": 0, "Needs Practice": 0, "Needs Support": 0 },
    studentsOnTrack: 0,
    studentsNeedingAttention: 0,
    studentRows: [] as Array<{ id: string; name: string; classLabel: string; school: string; status: "Excellent" | "On Track" | "Needs Practice" | "Needs Support"; attendance: string; gapCount: number; reading: string; practice: string; assessment: string }>,
  });

  const { progressCounts, studentsOnTrack, studentsNeedingAttention, studentRows } = computed;

  const studentsNeedingAttentionRows = studentRows
    .filter((row) => row.status === "Needs Practice" || row.status === "Needs Support")
    .slice(0, 6);

  const alerts = [
    ...studentRows.filter((row) => row.attendance.includes("%") && Number.parseInt(row.attendance, 10) < 75).slice(0, 3).map((row) => ({
      label: "Low attendance",
      detail: `${row.name} has ${row.attendance}`,
      actionHref: `/mentor-dashboard/students/${row.id}`,
      icon: AlertTriangle,
      tone: "text-red-600 bg-red-50 border-red-100",
    })),
    ...overdueAssignments.filter((row) => row.status !== "SUBMITTED" && row.status !== "GRADED").slice(0, 3).map((row) => ({
      label: "Overdue assignment",
      detail: `${row.student.name} · ${row.assignment.title}`,
      actionHref: `/mentor-dashboard/students/${row.studentId}/assignments`,
      icon: TriangleAlert,
      tone: "text-amber-700 bg-amber-50 border-amber-100",
    })),
    ...recentPublishedResults.slice(0, 3).map((row) => ({
      label: "New published result",
      detail: `${row.attempt.student.name} · ${row.attempt.assessment.title}`,
      actionHref: `/mentor-dashboard/students/${row.attempt.studentId}/assessments`,
      icon: TrendingDown,
      tone: "text-blue-700 bg-blue-50 border-blue-100",
    })),
    ...cancelledOrMissedSessions.slice(0, 2).map((row) => ({
      label: row.status === "CANCELLED" ? "Missed mentor session" : "Session not closed",
      detail: `${row.student.name} · ${formatDateTime(row.scheduledAt)}`,
      actionHref: `/mentor-dashboard/students/${row.studentId}/sessions`,
      icon: CalendarClock,
      tone: "text-violet-700 bg-violet-50 border-violet-100",
    })),
  ].slice(0, 8);

  const upcomingSessions = report.upcomingSessions.slice(0, 6);
  const recentNotes = report.recentNotes.slice(0, 6);

  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Mentor Home</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Which students need support today?</h1>
        <p className="mt-2 text-slate-600">Assignment-scoped student progress, sessions, notes, and alerts only.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Assigned Students", value: studentRows.length, hint: "Current active assignments" },
          { label: "Students On Track", value: studentsOnTrack, hint: "Excellent and On Track" },
          { label: "Students Needing Attention", value: studentsNeedingAttention, hint: "Needs Practice or Support" },
          { label: "Sessions This Month", value: report.sessionsThisMonth, hint: "Scheduled, completed, or cancelled" },
        ].map((card) => (
          <article key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{card.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{card.hint}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,.95fr)]">
        <div className="space-y-6">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-950">Student Progress Overview</h2>
              <Link href="/mentor-dashboard/reports" className="text-sm font-semibold text-indigo-700">View detailed report</Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {Object.entries(progressCounts).map(([label, count]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{count}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-950">Students Needing Attention</h2>
              <Link href="/mentor-dashboard/students?status=needs-attention" className="text-sm font-semibold text-indigo-700">View all</Link>
            </div>
            {studentsNeedingAttentionRows.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Student</th>
                      <th className="py-2 pr-3">Class</th>
                      <th className="py-2 pr-3">Primary concern</th>
                      <th className="py-2 pr-3">Last activity</th>
                      <th className="py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsNeedingAttentionRows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="py-3 pr-3 font-semibold text-slate-900">{row.name}</td>
                        <td className="py-3 pr-3 text-slate-600">{row.classLabel}</td>
                        <td className="py-3 pr-3 text-slate-700">{row.status === "Needs Support" ? "Needs support" : "Needs practice"}</td>
                        <td className="py-3 pr-3 text-slate-500">{row.assessment}</td>
                        <td className="py-3">
                          <Link href={`/mentor-dashboard/students/${row.id}`} className="font-semibold text-indigo-700">Open student</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No students currently need attention.</p>
            )}
          </article>
        </div>

        <div className="space-y-6">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-950">Upcoming Sessions</h2>
              <Link href="/mentor-dashboard/sessions" className="text-sm font-semibold text-indigo-700">Open sessions</Link>
            </div>
            {upcomingSessions.length ? (
              <ul className="mt-4 space-y-3">
                {upcomingSessions.map((session) => (
                  <li key={session.id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-950">{session.topic ?? "Mentor Session"}</p>
                    <p className="mt-1 text-sm text-slate-600">{session.student.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatDateTime(session.scheduledAt)} · {session.durationMinutes ?? 45} min</p>
                    <Link href={`/mentor-dashboard/students/${session.studentId}/sessions`} className="mt-2 inline-block text-sm font-semibold text-indigo-700">Open session</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No upcoming sessions are scheduled.</p>
            )}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-950">Alerts & Notifications</h2>
              <Link href="/mentor-dashboard/students" className="text-sm font-semibold text-indigo-700">View all students</Link>
            </div>
            {alerts.length ? (
              <ul className="mt-4 space-y-3">
                {alerts.map((alert, index) => {
                  const Icon = alert.icon;
                  return (
                    <li key={`${alert.label}-${index}`} className={`rounded-2xl border p-4 ${alert.tone}`}>
                      <div className="flex items-start gap-3">
                        <Icon className="mt-0.5 h-4 w-4" />
                        <div>
                          <p className="font-semibold">{alert.label}</p>
                          <p className="mt-1 text-sm">{alert.detail}</p>
                          <Link href={alert.actionHref} className="mt-2 inline-block text-sm font-semibold text-indigo-700">Open student</Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No active alerts at the moment.</p>
            )}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-950">Recent Notes</h2>
              <Link href="/mentor-dashboard/notes" className="text-sm font-semibold text-indigo-700">View notes</Link>
            </div>
            {recentNotes.length ? (
              <ul className="mt-4 space-y-3">
                {recentNotes.map((note) => (
                  <li key={note.id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{note.type.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-sm text-slate-900">{note.student.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{note.body.slice(0, 110)}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(note.createdAt)}</p>
                    <Link href={`/mentor-dashboard/students/${note.studentId}/notes`} className="mt-2 inline-block text-sm font-semibold text-indigo-700">Open note</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No notes yet.</p>
            )}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Quick Actions</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { href: "/mentor-dashboard/notes", label: "Add Note", icon: NotebookPen },
                { href: "/mentor-dashboard/sessions", label: "Schedule Session", icon: CalendarClock },
                { href: "/mentor-dashboard/reports", label: "Create Report", icon: UsersRound },
                { href: "/mentor-dashboard/resources", label: "Open Resources", icon: UsersRound },
                { href: "/mentor-dashboard/students", label: "View All Students", icon: UsersRound },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.label} href={item.href} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">
                    <Icon className="mb-2 h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
