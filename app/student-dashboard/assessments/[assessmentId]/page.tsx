import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { Clock3 } from "lucide-react";
import StudentAssessmentStart from "@/components/student/StudentAssessmentStart";
import { getStudentAssessmentDetails } from "@/lib/student-assessments";

export default async function StudentAssessmentDetailsPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  const detail = await safeDetails(assessmentId);

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Link href="/student-dashboard/assessments" className="font-semibold text-indigo-700">
        ← Back to Assessments
      </Link>

      <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-wider text-indigo-700">{detail.type.replaceAll("_", " ")}</p>
        <h1 className="mt-2 text-3xl font-bold">{detail.title}</h1>
        <p className="mt-2 text-slate-600">{detail.subjectName}</p>
        {detail.chapter ? <p className="mt-1 text-sm text-slate-500">{detail.chapter}</p> : null}

        <div className="mt-6 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <p>{detail.totalQuestions} questions</p>
          <p>{detail.totalMarks} total marks</p>
          <p className="inline-flex items-center gap-2">
            <Clock3 className="h-4 w-4" />
            {detail.durationMinutes ? `${detail.durationMinutes} minutes` : "Untimed"}
          </p>
          <p>Attempts {detail.attemptsUsed}/{detail.attemptsAllowed}</p>
          {detail.opensAt ? <p>Opens {formatDate(detail.opensAt)}</p> : null}
          {detail.dueAt ? <p>Due {formatDate(detail.dueAt)}</p> : null}
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Result policy</p>
          <p className="mt-1">{detail.resultReleaseMessage}</p>
          <p className="mt-1 text-slate-600">
            Score visibility: {detail.showScore ? "Visible when released" : "Hidden"}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.8fr)]">
        <article className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold">Instructions</h2>
          {detail.instructions ? (
            <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">{detail.instructions}</p>
          ) : (
            <p className="mt-4 text-slate-600">No additional instructions were provided for this assessment.</p>
          )}

          <div className="mt-6 space-y-3 text-sm text-slate-700">
            <p>Auto-save runs while you attempt the paper.</p>
            <p>You can review answers before final submission.</p>
            <p>Subjective questions are queued for teacher review only.</p>
          </div>
        </article>

        <aside className="space-y-4">
          <section className="rounded-3xl border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold">Start Options</h3>
            <div className="mt-4 space-y-3">
              {detail.startState === "START" ? (
                <StudentAssessmentStart assessmentId={detail.id} label="Start Assessment" />
              ) : detail.startState === "CONTINUE" && detail.activeAttemptId ? (
                <Link
                  href={`/student-dashboard/assessment-attempts/${detail.activeAttemptId}`}
                  className="inline-flex min-h-12 items-center rounded-xl bg-indigo-700 px-6 py-3 font-bold text-white"
                >
                  Resume Attempt
                </Link>
              ) : detail.startState === "UPCOMING" ? (
                <p className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700">This assessment has not opened yet.</p>
              ) : detail.startState === "CLOSED" ? (
                <p className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700">This assessment is closed.</p>
              ) : (
                <p className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700">No attempts remaining.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold">Attempt History</h3>
            {detail.history.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No completed attempts yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {detail.history.map((item) => (
                  <article key={item.attemptId} className="rounded-2xl bg-slate-50 p-4 text-sm">
                    <p className="font-semibold text-slate-900">Attempt {item.attemptNumber}</p>
                    <p className="mt-1 text-slate-600">{item.status}</p>
                    <p className="mt-1 text-slate-600">Submitted: {item.submittedAt ? formatDate(item.submittedAt) : "Not available"}</p>
                    {item.released ? (
                      <div className="mt-3 space-y-2">
                        {detail.showScore ? (
                          <p className="font-semibold text-indigo-800">Score: {item.score === null ? "Pending" : `${item.score}%`}</p>
                        ) : null}
                        <Link
                          href={`/student-dashboard/assessment-attempts/${item.attemptId}/result`}
                          className="inline-flex items-center rounded-lg border border-indigo-300 px-3 py-2 font-semibold text-indigo-800"
                        >
                          View Result
                        </Link>
                      </div>
                    ) : (
                      <p className="mt-2 text-slate-600">Result not released yet.</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}

async function safeDetails(assessmentId: string) {
  try {
    return await getStudentAssessmentDetails(assessmentId);
  } catch (error) {
    unstable_rethrow(error);
    notFound();
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}
