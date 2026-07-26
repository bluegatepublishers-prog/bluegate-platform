import Link from "next/link";

import {
  AnalyticsPlaceholders,
  EmptyAnalytics,
  MetricGrid,
  ProgressBars,
  ReportHero,
  Timeline,
  displayPercent,
} from "@/components/analytics/AnalyticsVisuals";
import { getStudentAnalyticsReport } from "@/lib/analytics-reports";
import { getStudentHistoricalReportCards } from "@/lib/report-card-retention";
import { requireStudentDashboardAccess } from "@/lib/student-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentReportsPage() {
  const [access, reportCards] = await Promise.all([
    requireStudentDashboardAccess(),
    getStudentHistoricalReportCards(),
  ]);
  if (access.status !== "READY") {
    return <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <ReportHero eyebrow="Historical records" title="My issued report cards" description="Active learning is unavailable, but issued personal records remain accessible." />
      <ReportCardHistory rows={reportCards} />
    </main>;
  }

  const report = await getStudentAnalyticsReport();
  if (report.state !== "READY") {
    return <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <ReportHero eyebrow="Learning reports" title="My progress" description="Your factual learning record across reading, revision, practice, assessments, and the learning assistant." />
      <ReportCardHistory rows={reportCards} />
      <section className="rounded-3xl border bg-white p-10 text-center shadow-sm">
        <h2 className="text-xl font-bold">{report.state === "LOCKED" ? "Reports are available with Premium." : "Reports are not enabled on this platform."}</h2>
        <p className="mt-2 text-slate-600">Your learning activity remains available in its original tools.</p>
      </section>
    </main>;
  }

  const summary = report.summary;
  const metrics = summary ? [
    { label: "Books completed", value: `${summary.booksCompleted}/${summary.booksStarted}` },
    { label: "Pages read", value: summary.pagesRead },
    { label: "Study time", value: `${Math.round(summary.timeStudiedSeconds / 60)} min` },
    { label: "Current streak", value: `${summary.currentStreak} days`, detail: `Longest: ${summary.longestStreak} days` },
    { label: "Reading", value: displayPercent(summary.readingPercent) },
    { label: "Revision", value: displayPercent(summary.revisionPercent) },
    { label: "Practice average", value: displayPercent(summary.averagePractice) },
    { label: "Assessment average", value: displayPercent(summary.averageAssessment) },
    { label: "AI sessions", value: summary.aiSessions },
    { label: "AI requests", value: summary.aiRequests },
    { label: "Practice completion", value: displayPercent(summary.practicePercent) },
    { label: "Assessment completion", value: displayPercent(summary.assessmentPercent) },
  ] : [];

  return <main className="space-y-7 p-4 sm:p-6 lg:p-8">
    <ReportHero eyebrow={report.year} title="My learning progress" description="Stored educational metrics updated after successful learning activity. This page does not recalculate raw history." />
    <ReportCardHistory rows={reportCards} />
    {report.gapEnabled ? <Link href="/student-dashboard/gaps" className="inline-flex rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white">My learning gaps · {report.openGapCount} open</Link> : null}
    {summary ? <>
      <MetricGrid metrics={metrics} />
      <ProgressBars title="Subject completion" rows={report.subjects.map((row) => ({ label: row.subject.name, value: row.completionPercent, detail: `${Math.round(row.completionPercent)}% complete` }))} />
      <ProgressBars title="Chapter completion" rows={report.chapters.map((row) => ({ label: `${row.book.title} · Chapter ${row.chapter.chapterNumber}: ${row.chapter.title}`, value: row.completionPercent }))} />
      <Timeline rows={report.timeline} />
      <AnalyticsPlaceholders />
    </> : <EmptyAnalytics />}
  </main>;
}

function ReportCardHistory({ rows }: { rows: Awaited<ReturnType<typeof getStudentHistoricalReportCards>> }) {
  return <section className="rounded-3xl border bg-white p-6 shadow-sm">
    <h2 className="text-xl font-bold">Issued report cards</h2>
    <p className="mt-2 text-sm text-slate-600">These permanent snapshots remain available after a transfer or school lifecycle change.</p>
    <ul className="mt-4 divide-y">
      {rows.map((row) => <li key={row.id} className="py-3">
        <p className="break-words font-semibold">{row.schoolDisplayName} · {row.academicYearName}</p>
        <p className="text-sm text-slate-500">{row.classDisplayName} / {row.sectionDisplayName} · Issued {row.issuedAt.toLocaleDateString("en-IN")} · Version {row.version}</p>
      </li>)}
      {!rows.length ? <li className="py-4 text-sm text-slate-500">No issued report cards yet.</li> : null}
    </ul>
  </section>;
}
