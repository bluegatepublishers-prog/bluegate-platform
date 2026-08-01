import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getMentorDashboard } from "@/lib/mentor-dashboard";

type SearchParams = Promise<{
  q?: string;
  className?: string;
  section?: string;
  status?: string;
  support?: string;
}>;

function classifyStatus(score: number, gapCount: number) {
  if (gapCount >= 2 || score < 45) return "Needs Support";
  if (gapCount >= 1 || score < 60) return "Needs Attention";
  if (score < 75) return "Monitor";
  return "On Track";
}

function scoreFromMetrics(reading: number | null, practice: number | null, assessment: number | null) {
  const values = [reading, practice, assessment].filter((value): value is number => Number.isFinite(value));
  if (!values.length) return 50;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export default async function MentorStudentsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const report = await getMentorDashboard();

  const studentIds = report.assignments.map((item) => item.assignment.studentId);
  const yearIds = report.assignments.map((item) => item.assignment.academicYearId);

  const [analytics, gaps, latestSessions, nextSessions, recentSubmissions, recentAssessments] = studentIds.length
    ? await Promise.all([
        prisma.studentAnalytics.findMany({ where: { studentId: { in: studentIds }, academicYearId: { in: yearIds } }, select: { studentId: true, readingPercent: true, averagePractice: true, averageAssessment: true } }),
        prisma.studentLearningGap.findMany({ where: { studentId: { in: studentIds }, academicYearId: { in: yearIds }, status: { in: ["OPEN", "ACKNOWLEDGED"] } }, select: { id: true, studentId: true, dimension: true, severity: true } }),
        prisma.mentorSession.findMany({ where: { mentorId: report.mentor.id, studentId: { in: studentIds }, status: { in: ["COMPLETED", "CANCELLED"] } }, orderBy: { scheduledAt: "desc" }, select: { studentId: true, scheduledAt: true }, distinct: ["studentId"] }),
        prisma.mentorSession.findMany({ where: { mentorId: report.mentor.id, studentId: { in: studentIds }, status: "SCHEDULED", scheduledAt: { gte: new Date() } }, orderBy: { scheduledAt: "asc" }, select: { studentId: true, scheduledAt: true }, distinct: ["studentId"] }),
        prisma.assignmentSubmission.findMany({ where: { studentId: { in: studentIds } }, select: { studentId: true, status: true, isLate: true }, orderBy: { updatedAt: "desc" }, take: 240 }),
        prisma.assessmentResult.findMany({ where: { attempt: { studentId: { in: studentIds } }, publishedAt: { not: null } }, select: { percentage: true, attempt: { select: { studentId: true } } }, orderBy: { publishedAt: "desc" }, take: 240 }),
      ])
    : [[], [], [], [], [], []];

  const analyticsMap = new Map(analytics.map((item) => [item.studentId, item]));
  const gapMap = new Map<string, Array<{ dimension: string; severity: string }>>();
  for (const gap of gaps) {
    const current = gapMap.get(gap.studentId) ?? [];
    current.push({ dimension: gap.dimension, severity: gap.severity });
    gapMap.set(gap.studentId, current);
  }

  const lastSessionMap = new Map(latestSessions.map((item) => [item.studentId, item]));
  const nextSessionMap = new Map(nextSessions.map((item) => [item.studentId, item]));

  const submissionMap = new Map<string, { completed: number; total: number; late: number }>();
  for (const submission of recentSubmissions) {
    const current = submissionMap.get(submission.studentId) ?? { completed: 0, total: 0, late: 0 };
    current.total += 1;
    if (submission.status === "SUBMITTED" || submission.status === "GRADED") current.completed += 1;
    if (submission.isLate) current.late += 1;
    submissionMap.set(submission.studentId, current);
  }

  const assessmentMap = new Map<string, { total: number; average: number }>();
  for (const row of recentAssessments) {
    const current = assessmentMap.get(row.attempt.studentId) ?? { total: 0, average: 0 };
    const score = row.percentage ?? 0;
    current.average = ((current.average * current.total) + score) / (current.total + 1);
    current.total += 1;
    assessmentMap.set(row.attempt.studentId, current);
  }

  let rows = report.assignments.map((item) => {
    const metrics = analyticsMap.get(item.assignment.studentId);
    const score = scoreFromMetrics(metrics?.readingPercent ?? null, metrics?.averagePractice ?? null, metrics?.averageAssessment ?? null);
    const gapItems = gapMap.get(item.assignment.studentId) ?? [];
    const status = classifyStatus(score, gapItems.length);
    const assignmentProgress = submissionMap.get(item.assignment.studentId) ?? { completed: 0, total: 0, late: 0 };
    const assessment = assessmentMap.get(item.assignment.studentId);
    return {
      studentId: item.assignment.student.id,
      name: item.assignment.student.name,
      className: item.enrollment.schoolClass.name,
      sectionName: item.enrollment.section.name,
      school: item.assignment.student.school.schoolName,
      status,
      supportLevel: gapItems.some((gap) => gap.severity === "HIGH") ? "High" : gapItems.length ? "Medium" : "Low",
      gapCategory: gapItems[0]?.dimension.replaceAll("_", " ") ?? "No active gaps",
      assignmentCompletion: assignmentProgress.total ? `${assignmentProgress.completed}/${assignmentProgress.total}` : "No submissions",
      assessmentPerformance: assessment?.total ? `${Math.round(assessment.average)}%` : "Not available",
      attendanceStatus: "Not available",
      activeLearningGaps: gapItems.length,
      lastSession: lastSessionMap.get(item.assignment.studentId)?.scheduledAt,
      nextSession: nextSessionMap.get(item.assignment.studentId)?.scheduledAt,
      score,
    };
  });

  if (params.q) {
    const query = params.q.toLowerCase();
    rows = rows.filter((row) => row.name.toLowerCase().includes(query) || row.school.toLowerCase().includes(query));
  }
  if (params.className) rows = rows.filter((row) => row.className === params.className);
  if (params.section) rows = rows.filter((row) => row.sectionName === params.section);
  if (params.status) rows = rows.filter((row) => row.status.toLowerCase().replaceAll(" ", "-") === params.status);
  if (params.support) rows = rows.filter((row) => row.supportLevel.toLowerCase() === params.support!.toLowerCase());

  const classOptions = [...new Set(report.assignments.map((item) => item.enrollment.schoolClass.name))];
  const sectionOptions = [...new Set(report.assignments.map((item) => item.enrollment.section.name))];

  return (
    <main className="space-y-6">
      <header className="rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Mentor Students</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">My Students</h1>
        <p className="mt-2 text-slate-600">Only explicitly assigned students are visible here.</p>
      </header>

      <form className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-6" method="get">
        <input name="q" defaultValue={params.q ?? ""} placeholder="Search student" className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
        <select name="className" defaultValue={params.className ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Classes</option>
          {classOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select name="section" defaultValue={params.section ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Sections</option>
          {sectionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select name="status" defaultValue={params.status ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option value="on-track">On Track</option>
          <option value="monitor">Monitor</option>
          <option value="needs-attention">Needs Attention</option>
          <option value="needs-support">Needs Support</option>
        </select>
        <select name="support" defaultValue={params.support ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Support Levels</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        <button type="submit" className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">Apply</button>
      </form>

      {rows.length ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {rows.map((row) => (
            <article key={row.studentId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">{row.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{row.className} · Section {row.sectionName} · {row.school}</p>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">{row.status}</span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-slate-500">Attendance</dt><dd className="mt-1 font-semibold">{row.attendanceStatus}</dd></div>
                <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-slate-500">Assignment completion</dt><dd className="mt-1 font-semibold">{row.assignmentCompletion}</dd></div>
                <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-slate-500">Assessment performance</dt><dd className="mt-1 font-semibold">{row.assessmentPerformance}</dd></div>
                <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-slate-500">Active learning gaps</dt><dd className="mt-1 font-semibold">{row.activeLearningGaps}</dd></div>
                <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-slate-500">Last mentor session</dt><dd className="mt-1 font-semibold">{row.lastSession ? row.lastSession.toLocaleDateString("en-IN") : "Not available"}</dd></div>
                <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-slate-500">Next session</dt><dd className="mt-1 font-semibold">{row.nextSession ? row.nextSession.toLocaleDateString("en-IN") : "Not scheduled"}</dd></div>
              </dl>

              <p className="mt-3 text-sm text-slate-600">Support level: {row.supportLevel} · Gap category: {row.gapCategory}</p>
              <Link href={`/mentor-dashboard/students/${row.studentId}`} className="mt-4 inline-block font-semibold text-indigo-700">Open Workspace</Link>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">No assigned students match these filters.</section>
      )}
    </main>
  );
}
