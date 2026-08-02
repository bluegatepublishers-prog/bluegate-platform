import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ReactNode } from "react";
import { getTeacherAssessmentAnalyticsWorkspace, AssessmentAnalyticsError, retryTeacherAssessmentAnalytics } from "@/lib/assessment-analytics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeacherAssessmentAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string; assessmentId: string }>;
  searchParams: Promise<{ q?: string; band?: string; publishedDate?: string; attempt?: string; page?: string }>;
}) {
  const { sectionId, assessmentId } = await params;
  const query = await searchParams;

  let workspace: Awaited<ReturnType<typeof getTeacherAssessmentAnalyticsWorkspace>>;
  try {
    workspace = await getTeacherAssessmentAnalyticsWorkspace({
      sectionId,
      assessmentId,
      search: query.q,
      band: query.band,
      publishedDate: query.publishedDate,
      attempt: query.attempt,
      page: query.page ? Number(query.page) : 1,
    });
  } catch (error) {
    if (error instanceof AssessmentAnalyticsError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  async function retryAnalytics() {
    "use server";
    await retryTeacherAssessmentAnalytics(sectionId, assessmentId);
    revalidatePath(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/analytics`);
    revalidatePath(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}`);
    revalidatePath(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading`);
  }

  const summaryCards = [
    ["Enrolled Students", workspace.summary.enrolledStudents],
    ["Started", workspace.summary.startedStudents],
    ["Submitted", workspace.summary.submittedStudents],
    ["Graded", workspace.summary.gradedStudents],
    ["Published", workspace.summary.publishedResults],
    ["Average Score", formatPercent(workspace.summary.averageScore)],
    ["Highest Score", formatPercent(workspace.summary.highestScore)],
    ["Lowest Score", formatPercent(workspace.summary.lowestScore)],
    ["Submission Rate", `${workspace.summary.submissionRate}%`],
  ] as const;

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}`} className="text-sm font-semibold text-blue-700">
          ← Back to Assessment
        </Link>
        <form action={retryAnalytics}>
          <button type="submit" className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700">
            Retry Analytics
          </button>
        </form>
      </div>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-violet-700">{workspace.header.subjectName}</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">{workspace.header.assessmentTitle}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {workspace.header.className} · {workspace.header.sectionName}
            </p>
          </div>
          <div className="grid gap-2 text-right text-sm text-slate-600">
            <p><strong className="text-slate-950">{workspace.header.publishedResults}</strong> published result(s)</p>
            <p>Last updated: {formatDate(workspace.header.lastUpdatedAt)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map(([label, value]) => (
          <article key={label} className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Score Distribution">
          <div className="space-y-4">
            {workspace.scoreDistribution.map((row) => (
              <div key={row.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{row.label}</span>
                  <span className="text-slate-500">{row.count} · {workspace.summary.publishedResults ? `${row.percentage}%` : "0%"}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500"
                    style={{ width: `${workspace.summary.publishedResults ? Math.max(2, row.percentage) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Subject and Chapter Analytics">
          <div className="grid gap-4 lg:grid-cols-2">
            <StatBlock
              title="Subject"
              rows={[
                ["Published assessments completed", workspace.subjectAnalytics.completedAssessments],
                ["Average percentage", formatPercent(workspace.subjectAnalytics.averagePercentage)],
                ["Recent trend", workspace.subjectAnalytics.recentTrend],
                ["Strong / weak status", workspace.subjectAnalytics.strength],
              ]}
            />
            <StatBlock
              title="Chapter"
              rows={workspace.chapterAnalytics.available
                ? [
                    ["Chapter attempts", workspace.chapterAnalytics.completedAssessments],
                    ["Average marks", formatPercent(workspace.chapterAnalytics.averageMarks)],
                    ["Completion", formatPercent(workspace.chapterAnalytics.completion)],
                    ["Mastery / support", workspace.chapterAnalytics.indicator],
                  ]
                : [["Status", "Unavailable until the assessment has chapter linkage."]]}
            />
          </div>
        </Panel>
      </section>

      <Panel title="Question-wise Analytics">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-4">Q#</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Max Marks</th>
                <th className="py-2 pr-4">Attempted</th>
                <th className="py-2 pr-4">Unanswered</th>
                <th className="py-2 pr-4">Correct</th>
                <th className="py-2 pr-4">Incorrect</th>
                <th className="py-2 pr-4">Avg Awarded</th>
                <th className="py-2 pr-4">Success</th>
                <th className="py-2 pr-4">Review</th>
                <th className="py-2">Performance</th>
              </tr>
            </thead>
            <tbody>
              {workspace.questionAnalytics.map((question) => (
                <tr key={question.questionId} className="border-t border-slate-100">
                  <td className="py-3 pr-4 font-semibold text-slate-950">{question.questionNumber}</td>
                  <td className="py-3 pr-4 text-slate-600">{question.type}</td>
                  <td className="py-3 pr-4 text-slate-600">{question.maximumMarks}</td>
                  <td className="py-3 pr-4 text-slate-700">{question.attemptedCount}</td>
                  <td className="py-3 pr-4 text-slate-700">{question.unansweredCount}</td>
                  <td className="py-3 pr-4 text-slate-700">{question.correctCount}</td>
                  <td className="py-3 pr-4 text-slate-700">{question.incorrectCount}</td>
                  <td className="py-3 pr-4 text-slate-700">{formatPercent(question.averageAwardedMarks)}</td>
                  <td className="py-3 pr-4 text-slate-700">{formatPercent(question.successPercentage)}</td>
                  <td className="py-3 pr-4 text-slate-700">{formatPercent(question.manualReviewCompletion)}</td>
                  <td className="py-3">
                    <Pill tone={question.performanceLabel === "Strong" ? "emerald" : question.performanceLabel === "Moderate" ? "amber" : "rose"}>
                      {question.performanceLabel}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Student Performance">
        <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" method="get">
          <input name="q" defaultValue={query.q ?? ""} placeholder="Search student or roll number" className="rounded-xl border px-4 py-2" />
          <select name="band" defaultValue={query.band ?? "ALL"} className="rounded-xl border px-4 py-2">
            <option value="ALL">All bands</option>
            <option value="STRONG">Strong</option>
            <option value="MODERATE">Moderate</option>
            <option value="NEEDS_REVIEW">Needs Review</option>
          </select>
          <input name="publishedDate" defaultValue={query.publishedDate ?? ""} type="date" className="rounded-xl border px-4 py-2" />
          <input name="attempt" defaultValue={query.attempt ?? ""} type="number" min={1} placeholder="Attempt #" className="rounded-xl border px-4 py-2" />
          <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">Apply</button>
        </form>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-4">Student</th>
                <th className="py-2 pr-4">Roll number</th>
                <th className="py-2 pr-4">Attempt number</th>
                <th className="py-2 pr-4">Published result date</th>
                <th className="py-2 pr-4">Marks</th>
                <th className="py-2 pr-4">Percentage</th>
                <th className="py-2 pr-4">Performance status</th>
                <th className="py-2 pr-4">Question completion</th>
                <th className="py-2">Open published result</th>
              </tr>
            </thead>
            <tbody>
              {workspace.students.rows.map((row) => (
                <tr key={row.attemptId} className="border-t border-slate-100">
                  <td className="py-3 pr-4 font-semibold text-slate-950">{row.studentName}</td>
                  <td className="py-3 pr-4 text-slate-600">{row.rollNumber}</td>
                  <td className="py-3 pr-4 text-slate-700">{row.attemptNumber}</td>
                  <td className="py-3 pr-4 text-slate-700">{formatDate(row.publishedAt)}</td>
                  <td className="py-3 pr-4 text-slate-700">{formatPercent(row.marks)}</td>
                  <td className="py-3 pr-4 text-slate-700">{formatPercent(row.percentage)}</td>
                  <td className="py-3 pr-4">
                    <Pill tone={row.performanceStatus === "Strong" ? "emerald" : row.performanceStatus === "Moderate" ? "amber" : "rose"}>
                      {row.performanceStatus}
                    </Pill>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{row.questionCompletion}</td>
                  <td className="py-3">
                    <Link
                      href={`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading/${row.attemptId}`}
                      className="rounded-lg border border-blue-300 px-3 py-2 font-semibold text-blue-700"
                    >
                      Open published result
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!workspace.students.rows.length ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No published results match the current filters.</p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-slate-600">
            Page {workspace.students.pagination.page} of {workspace.students.pagination.totalPages}
          </p>
          <div className="flex gap-2">
            {workspace.students.pagination.page > 1 ? (
              <PagerLink
                page={workspace.students.pagination.page - 1}
                query={query}
                label="Previous"
              />
            ) : null}
            {workspace.students.pagination.page < workspace.students.pagination.totalPages ? (
              <PagerLink
                page={workspace.students.pagination.page + 1}
                query={query}
                label="Next"
              />
            ) : null}
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Support-needed List">
          <div className="space-y-3">
            {workspace.supportNeeded.length ? workspace.supportNeeded.map((row) => (
              <article key={row.attemptId} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-950">{row.studentName}</h3>
                    <p className="mt-1 text-sm text-slate-600">{row.primaryConcern}</p>
                  </div>
                  <Pill tone="rose">Needs attention</Pill>
                </div>
                <p className="mt-3 text-sm text-slate-600">{row.evidence}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <Link
                    href={`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading/${row.attemptId}`}
                    className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700"
                  >
                    Review result
                  </Link>
                  <span className="rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-600">{row.suggestedAction}</span>
                </div>
              </article>
            )) : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No support signals are currently detected from published results.</p>
            )}
          </div>
        </Panel>

        <Panel title="Highest-improving Students">
          <div className="space-y-3">
            {workspace.classAnalytics.highestImprovingStudents.length ? workspace.classAnalytics.highestImprovingStudents.map((row) => (
              <article key={row.attemptId} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-950">{row.studentName}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatPercent(row.fromPercentage)} → {formatPercent(row.toPercentage)}
                    </p>
                  </div>
                  <Pill tone="emerald">+{row.improvement}%</Pill>
                </div>
              </article>
            )) : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Historical improvement needs at least two published results for the same student.</p>
            )}
          </div>
        </Panel>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatBlock({ title, rows }: { title: string; rows: Array<[string, string | number | null]> }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-bold text-slate-950">{title}</h3>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2 last:border-0 last:pb-0">
            <dt className="text-slate-600">{label}</dt>
            <dd className="font-semibold text-slate-950">{typeof value === "number" ? value : value ?? "Unavailable"}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function Pill({ tone, children }: { tone: "emerald" | "amber" | "rose"; children: ReactNode }) {
  const classes = tone === "emerald"
    ? "bg-emerald-50 text-emerald-700"
    : tone === "amber"
      ? "bg-amber-50 text-amber-700"
      : "bg-rose-50 text-rose-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>{children}</span>;
}

function PagerLink({ page, query, label }: { page: number; query: { q?: string; band?: string; publishedDate?: string; attempt?: string }; label: string }) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.band) params.set("band", query.band);
  if (query.publishedDate) params.set("publishedDate", query.publishedDate);
  if (query.attempt) params.set("attempt", query.attempt);
  params.set("page", String(page));
  return (
    <Link href={`?${params.toString()}`} className="rounded-lg border px-3 py-2 font-semibold text-slate-700">
      {label}
    </Link>
  );
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 10) / 10}%`;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date);
}
