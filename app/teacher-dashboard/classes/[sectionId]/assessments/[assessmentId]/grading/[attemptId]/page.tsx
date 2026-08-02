import Link from "next/link";
import { redirect } from "next/navigation";
import {
  completeAssessmentGradingAction,
  publishAssessmentResultAction,
  reopenAssessmentGradingAction,
  saveAssessmentGradingDraftAction,
} from "../../../actions";
import {
  getTeacherAssessmentGradingAttempt,
  TeacherAssessmentError,
} from "@/lib/teacher-assessments";

export default async function TeacherAssessmentAttemptGradingPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string; assessmentId: string; attemptId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { sectionId, assessmentId, attemptId } = await params;
  const q = Number((await searchParams).q ?? "1");

  let data: Awaited<ReturnType<typeof getTeacherAssessmentGradingAttempt>>;
  try {
    data = await getTeacherAssessmentGradingAttempt({ sectionId, assessmentId, attemptId });
  } catch (error) {
    if (error instanceof TeacherAssessmentError) {
      return (
        <main className="rounded-3xl border bg-white p-8 shadow-sm">
          <Link
            href={`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading`}
            className="text-sm font-semibold text-blue-700"
          >
            ← Back to Grading Queue
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Grading unavailable</h1>
          <p className="mt-2 text-slate-600">{error.message}</p>
        </main>
      );
    }
    throw error;
  }

  const selectedIndex = Number.isInteger(q) && q > 0 ? Math.min(data.questions.length - 1, Math.max(0, q - 1)) : 0;
  const question = data.questions[selectedIndex];
  const nextIndex = Math.min(data.questions.length, selectedIndex + 2);

  async function saveDraft(formData: FormData) {
    "use server";
    await saveAssessmentGradingDraftAction(sectionId, assessmentId, attemptId, formData);
    const next = Number(String(formData.get("nextQuestion") ?? "0"));
    if (Number.isInteger(next) && next > 0) {
      redirect(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading/${attemptId}?q=${next}`);
    }
    redirect(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading/${attemptId}?q=${selectedIndex + 1}`);
  }

  async function completeGrading() {
    "use server";
    await completeAssessmentGradingAction(sectionId, assessmentId, attemptId);
    redirect(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading/${attemptId}`);
  }

  async function reopenGrading(formData: FormData) {
    "use server";
    await reopenAssessmentGradingAction(sectionId, assessmentId, attemptId, formData);
    redirect(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading/${attemptId}`);
  }

  async function publishResult() {
    "use server";
    await publishAssessmentResultAction(sectionId, assessmentId, attemptId);
    redirect(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading/${attemptId}`);
  }

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border bg-white p-6 shadow-sm">
        <Link
          href={`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading`}
          className="text-sm font-semibold text-blue-700"
        >
          ← Back to Grading Queue
        </Link>
        <h1 className="mt-3 text-2xl font-bold">{data.assessment.title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {data.attempt.studentName} · {data.assessment.className} · Attempt {data.attempt.attemptNumber}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Submitted {data.attempt.submittedAt ? formatDate(data.attempt.submittedAt) : "Not available"} · {data.attempt.statusLabel} · {data.attempt.resultStatusLabel}
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="space-y-3 rounded-3xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold">Question Navigator</h2>
          <div className="grid gap-2">
            {data.questions.map((item, index) => {
              const active = index === selectedIndex;
              const pending = item.subjective && item.reviewStatus !== "REVIEWED";
              return (
                <Link
                  key={item.responseId}
                  href={`?q=${index + 1}`}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${active ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}
                >
                  Q{index + 1} · {item.subjective ? "Subjective" : "Objective"} · {pending ? "Pending" : "Reviewed"}
                </Link>
              );
            })}
          </div>
        </aside>

        <section className="space-y-4 rounded-3xl border bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700">Question {selectedIndex + 1} of {data.questions.length}</p>
          <h2 className="text-xl font-bold leading-8">{question.questionText}</h2>
          <p className="text-sm text-slate-600">
            Type: {question.questionType} · Maximum marks: {question.maxMarks}
          </p>

          <article className="rounded-2xl border bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Student response</p>
            <p className="mt-2 text-slate-800">{displayAnswer(question.studentResponse)}</p>
          </article>

          <article className="rounded-2xl border bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Correct answer (Teacher only)</p>
            <p className="mt-2 text-slate-800">{question.correctAnswer ?? "Not configured"}</p>
          </article>

          {question.explanation ? (
            <article className="rounded-2xl border bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">Explanation</p>
              <p className="mt-2 text-slate-800">{question.explanation}</p>
            </article>
          ) : null}

          {question.autoGraded ? (
            <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Objective question is auto-graded. Manual override is disabled in this phase.
              <p className="mt-2 font-semibold">Auto-awarded marks: {question.marksAwarded ?? 0}</p>
            </article>
          ) : (
            <form action={saveDraft} className="space-y-4 rounded-2xl border p-4">
              <input type="hidden" name="responseId" value={question.responseId} />
              <input type="hidden" name="nextQuestion" value={nextIndex} />
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Marks Awarded</span>
                <input
                  name="marksAwarded"
                  type="number"
                  min={0}
                  max={question.maxMarks}
                  step="0.5"
                  defaultValue={question.marksAwarded ?? 0}
                  className="rounded-xl border px-3 py-2"
                  required
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Feedback</span>
                <textarea
                  name="feedback"
                  rows={4}
                  defaultValue={question.feedback ?? ""}
                  className="rounded-xl border px-3 py-2"
                  placeholder="Per-question feedback"
                />
              </label>
              {!hasAnswer(question.studentResponse) ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                  Blank response detected. You may assign zero marks and save.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white">
                  Save Draft
                </button>
                <button
                  type="submit"
                  name="nextQuestion"
                  value={nextIndex}
                  className="rounded-xl border border-emerald-300 px-4 py-2 font-semibold text-emerald-700"
                >
                  Save & Next
                </button>
              </div>
            </form>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold">Summary</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>Objective: {data.summary.objectiveMarks}</p>
              <p>Subjective: {data.summary.subjectiveMarks}</p>
              <p>Total: {data.summary.totalAwarded}/{data.summary.totalMaximum}</p>
              <p>Percentage: {data.summary.percentage}%</p>
              <p>Progress: {data.summary.progressPercent}%</p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${data.summary.progressPercent}%` }} />
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold">Grading Controls</h3>
            <div className="mt-3 space-y-3 text-sm">
              <form action={completeGrading}>
                <button
                  type="submit"
                  disabled={!data.attempt.canComplete}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
                >
                  Complete Grading
                </button>
              </form>

              {data.attempt.canReopen ? (
                <form action={reopenGrading} className="space-y-2">
                  <label className="grid gap-2">
                    <span className="font-semibold">Reopen Reason</span>
                    <input name="reason" minLength={3} required className="rounded-xl border px-3 py-2" />
                  </label>
                  <button type="submit" className="w-full rounded-xl border border-amber-300 px-4 py-2 font-semibold text-amber-700">
                    Reopen Grading
                  </button>
                </form>
              ) : (
                <p className="rounded-xl bg-slate-100 px-3 py-2 text-slate-600">
                  Reopen is available only for unpublished graded attempts.
                </p>
              )}

              <form action={publishResult}>
                <button
                  type="submit"
                  disabled={!data.attempt.canPublishResult}
                  className="w-full rounded-xl border border-blue-300 px-4 py-2 font-semibold text-blue-700 disabled:opacity-50"
                >
                  Publish Result
                </button>
              </form>
              {!data.attempt.canPublishResult && data.attempt.publishBlockedLabel ? (
                <p className="rounded-xl bg-slate-100 px-3 py-2 text-slate-600">{data.attempt.publishBlockedLabel}</p>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function displayAnswer(value: unknown) {
  if (value === null || value === undefined) return "Not answered";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return Object.entries(value).map(([left, right]) => `${left} -> ${String(right)}`).join("; ");
  return String(value);
}

function hasAnswer(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}
