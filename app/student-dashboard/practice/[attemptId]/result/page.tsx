import Link from "next/link";
import { notFound } from "next/navigation";
import StudentPracticeStart from "@/components/student/StudentPracticeStart";
import { getStudentPracticeResult } from "@/lib/student-practice";

export default async function PracticeResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const result = await loadResult(attemptId);

  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl bg-slate-950 p-8 text-white">
        <p className="text-blue-300">
          {result.bookTitle} &middot; Chapter {result.chapterNumber}
        </p>
        <h1 className="mt-2 text-3xl font-bold">Practice Result</h1>
        <p className="mt-4 text-5xl font-bold">{result.scorePercent}%</p>
        <p className="mt-3 text-slate-300">
          {result.correctCount} correct out of {result.totalQuestions} &middot;{" "}
          {result.attemptedCount} attempted
        </p>
        <p className="mt-4 font-semibold text-blue-100">
          Practice complete. Review your answers, then try again when you are ready.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Question Review</h2>
        {result.responses.map((item) => (
          <article
            key={item.questionNumber}
            className="rounded-3xl border bg-white p-6 shadow-sm"
          >
            <p
              className={`font-bold ${
                item.correct ? "text-green-700" : "text-amber-700"
              }`}
            >
              Question {item.questionNumber} &middot;{" "}
              {item.correct ? "Correct" : "Needs another look"}
            </p>
            <h3 className="mt-3 text-lg font-bold">{item.questionText}</h3>
            <p className="mt-4">
              <strong>Your answer:</strong> {String(item.studentAnswer)}
            </p>
            <p className="mt-2">
              <strong>Correct answer:</strong> {item.correctAnswer}
            </p>
            {item.explanation && (
              <p className="mt-3 leading-7 text-slate-600">{item.explanation}</p>
            )}
          </article>
        ))}
      </section>

      <div className="flex flex-wrap gap-4">
        <StudentPracticeStart
          bookId={result.bookId}
          chapterId={result.chapterId}
          label="Retry Practice"
        />
        <Link
          href={`/student-dashboard/books/${result.bookId}/chapters/${result.chapterId}/revision`}
          className="inline-flex min-h-12 items-center rounded-xl border px-6 py-3 font-bold"
        >
          Back to Revision Hub
        </Link>
      </div>
    </main>
  );
}

async function loadResult(attemptId: string) {
  try {
    return await getStudentPracticeResult(attemptId);
  } catch {
    notFound();
  }
}
