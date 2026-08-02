import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTeacherAssessmentGradingQueue, TeacherAssessmentError } from "@/lib/teacher-assessments";
import { publishAssessmentResultAction, publishAssessmentResultsBulkAction } from "../../actions";

const filters = [
  { key: "ALL", label: "All" },
  { key: "NEEDS_GRADING", label: "Needs Grading" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "GRADED", label: "Graded" },
  { key: "RESULT_PUBLISHED", label: "Result Published" },
  { key: "NOT_SUBMITTED", label: "Not Submitted" },
] as const;

export default async function TeacherAssessmentGradingPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string; assessmentId: string }>;
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>;
}) {
  const { sectionId, assessmentId } = await params;
  const query = await searchParams;

  let data: Awaited<ReturnType<typeof getTeacherAssessmentGradingQueue>>;
  try {
    data = await getTeacherAssessmentGradingQueue({
      sectionId,
      assessmentId,
      filter: query.filter,
      query: query.q,
      page: query.page ? Number(query.page) : 1,
    });
  } catch (error) {
    if (error instanceof TeacherAssessmentError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  async function publishBulk() {
    "use server";
    await publishAssessmentResultsBulkAction(sectionId, assessmentId);
    redirect(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading?filter=${data.filter}${data.query ? `&q=${encodeURIComponent(data.query)}` : ""}&page=${data.pagination.page}`);
  }

  async function publishSingle(formData: FormData) {
    "use server";
    const attemptId = String(formData.get("attemptId") ?? "").trim();
    if (!attemptId) return;
    await publishAssessmentResultAction(sectionId, assessmentId, attemptId);
    redirect(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading?filter=${data.filter}${data.query ? `&q=${encodeURIComponent(data.query)}` : ""}&page=${data.pagination.page}`);
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/teacher-dashboard/classes/${sectionId}/assessments`} className="text-sm font-semibold text-blue-700">
          ← Back to Assessments
        </Link>
        <Link
          href={`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}`}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Open Builder
        </Link>
      </div>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">Grading Workspace</p>
        <h1 className="mt-1 text-2xl font-bold">{data.assessment.title}</h1>
        <p className="mt-2 text-sm text-slate-600">Release policy: {data.assessment.releaseLabel}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Stat title="Total Students" value={data.cards.totalStudents} />
        <Stat title="Not Started" value={data.cards.notStarted} />
        <Stat title="In Progress" value={data.cards.inProgress} />
        <Stat title="Submitted" value={data.cards.submitted} />
        <Stat title="Needs Grading" value={data.cards.needsGrading} />
        <Stat title="Graded" value={data.cards.graded} />
        <Stat title="Results Published" value={data.cards.resultsPublished} />
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((item) => {
            const active = data.filter === item.key;
            const href = `?filter=${item.key}${data.query ? `&q=${encodeURIComponent(data.query)}` : ""}`;
            return (
              <Link
                key={item.key}
                href={href}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${active ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-700"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <form className="mt-4 flex flex-wrap gap-3" action="">
          <input type="hidden" name="filter" value={data.filter} />
          <input
            name="q"
            defaultValue={data.query}
            placeholder="Search by student name or roll number"
            className="min-w-72 rounded-xl border px-4 py-2"
          />
          <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">Search</button>
        </form>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-3">Student</th>
                <th className="py-2 pr-3">Roll</th>
                <th className="py-2 pr-3">Attempt</th>
                <th className="py-2 pr-3">Submitted</th>
                <th className="py-2 pr-3">Objective</th>
                <th className="py-2 pr-3">Subjective</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">Review Status</th>
                <th className="py-2 pr-3">Result Status</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.studentId} className="border-t border-slate-100">
                  <td className="py-3 pr-3 font-semibold text-slate-900">{row.studentName}</td>
                  <td className="py-3 pr-3 text-slate-600">{row.rollNumber || "-"}</td>
                  <td className="py-3 pr-3 text-slate-600">{row.attemptNumber || "-"}</td>
                  <td className="py-3 pr-3 text-slate-600">{row.submittedAt ? formatDate(row.submittedAt) : "-"}</td>
                  <td className="py-3 pr-3 text-slate-700">{row.objectiveScore}</td>
                  <td className="py-3 pr-3 text-slate-700">{row.subjectiveScore}</td>
                  <td className="py-3 pr-3 font-semibold text-slate-900">{row.totalScore}</td>
                  <td className="py-3 pr-3 text-slate-600">{row.reviewStatus}</td>
                  <td className="py-3 pr-3 text-slate-600">{row.resultStatus}</td>
                  <td className="py-3">
                    {row.attemptId ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading/${row.attemptId}`}
                          className="rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white"
                        >
                          Open Grading
                        </Link>
                        {row.canPublishResult ? (
                          <form action={publishSingle}>
                            <input type="hidden" name="attemptId" value={row.attemptId} />
                            <button type="submit" className="rounded-lg border border-blue-300 px-3 py-2 font-semibold text-blue-700">
                              Publish Result
                            </button>
                          </form>
                        ) : row.publishBlockedLabel ? (
                          <span className="text-xs font-semibold text-slate-500">{row.publishBlockedLabel}</span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-500">No Attempt</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!data.rows.length ? <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No students match this filter.</p> : null}

        <div className="mt-6 flex items-center justify-between text-sm">
          <p className="text-slate-600">Page {data.pagination.page} of {data.pagination.totalPages}</p>
          <div className="flex gap-2">
            {data.pagination.page > 1 ? (
              <Link
                href={`?filter=${data.filter}&q=${encodeURIComponent(data.query)}&page=${data.pagination.page - 1}`}
                className="rounded-lg border px-3 py-2 font-semibold"
              >
                Previous
              </Link>
            ) : null}
            {data.pagination.page < data.pagination.totalPages ? (
              <Link
                href={`?filter=${data.filter}&q=${encodeURIComponent(data.query)}&page=${data.pagination.page + 1}`}
                className="rounded-lg border px-3 py-2 font-semibold"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-6 text-sm text-slate-700 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Result Publication Readiness</h2>
        <p className="mt-2">Graded: {data.cards.graded} · Ready to publish: {data.cards.readyToPublish} · Already published: {data.cards.resultsPublished}</p>
        <p className="mt-2">Blocked from publish: {data.cards.blockedFromPublish} · Needs grading: {data.cards.needsGrading}</p>
        <form action={publishBulk} className="mt-4">
          <button
            type="submit"
            disabled={data.cards.readyToPublish === 0}
            className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            Publish All Ready Results
          </button>
        </form>
      </section>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <article className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}
