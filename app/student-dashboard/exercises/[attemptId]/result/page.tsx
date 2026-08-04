import Link from "next/link";
import { notFound } from "next/navigation";

import { getStudentExerciseResult } from "@/lib/student-exercise";

export default async function StudentExerciseResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const result = await loadResult(attemptId);
  if (!result) notFound();

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="rounded-[2rem] bg-slate-950 p-8 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
          {result.bookTitle} · Chapter {result.chapterNumber}
        </p>
        <h1 className="mt-3 text-3xl font-bold">{result.exerciseTitle}</h1>
        <p className="mt-5 text-5xl font-bold">{result.scorePercent}%</p>
        <p className="mt-3 text-slate-300">
          {result.marksAwarded}/{result.totalMarks} marks · {result.attemptedCount}/
          {result.totalQuestions} answered
        </p>
        <p className="mt-2 text-slate-300">
          {result.pendingReviewCount
            ? `${result.pendingReviewCount} response(s) still need teacher review.`
            : "Auto-checking is complete for this attempt."}
        </p>
      </header>

      <section className="space-y-4">
        {result.responses.map((response) => (
          <article
            key={`${response.questionNumber}-${response.questionType}`}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Q{response.questionNumber} · {response.questionType}
            </p>
            <h2 className="mt-2 text-lg font-bold text-slate-950">
              {response.questionText}
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">
              <strong>Your answer:</strong> {String(response.studentAnswer ?? "")}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {response.marksAwarded ?? 0}/{response.totalMarks} marks ·{" "}
              {response.reviewStatus.replaceAll("_", " ")}
            </p>
            {response.feedback ? (
              <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <strong>Teacher feedback:</strong> {response.feedback}
              </p>
            ) : null}
          </article>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/student-dashboard/subjects`}
          className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 px-5 py-3 font-bold"
        >
          Back to Subjects
        </Link>
      </div>
    </main>
  );
}

async function loadResult(attemptId: string) {
  try {
    return await getStudentExerciseResult(attemptId);
  } catch {
    return null;
  }
}
