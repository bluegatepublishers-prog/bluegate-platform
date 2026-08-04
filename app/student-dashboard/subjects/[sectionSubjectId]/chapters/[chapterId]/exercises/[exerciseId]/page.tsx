import Link from "next/link";
import { notFound } from "next/navigation";

import StudentExerciseStart from "@/components/student/StudentExerciseStart";
import { getStudentExerciseEntry } from "@/lib/student-exercise";

export default async function StudentExerciseEntryPage({
  params,
}: {
  params: Promise<{
    sectionSubjectId: string;
    chapterId: string;
    exerciseId: string;
  }>;
}) {
  const { sectionSubjectId, chapterId, exerciseId } = await params;
  const data = await loadEntry({ chapterId, exerciseId });
  if (!data) notFound();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link
        href={`/student-dashboard/subjects/${sectionSubjectId}/chapters/${chapterId}`}
        className="text-sm font-semibold text-blue-700"
      >
        Back to chapter
      </Link>
      <section className="rounded-[2rem] bg-slate-950 p-8 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
          Chapter {data.exercise.chapterNumber} · {data.exercise.bookTitle}
        </p>
        <h1 className="mt-3 text-3xl font-bold">{data.exercise.title}</h1>
        {data.exercise.instructions ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300">
            {data.exercise.instructions}
          </p>
        ) : null}
        <p className="mt-5 text-sm font-semibold text-slate-200">
          {data.exercise.totalQuestions} questions · {data.exercise.marks} total marks
          {data.exercise.estimatedMinutes
            ? ` · About ${data.exercise.estimatedMinutes} minutes`
            : ""}
        </p>
      </section>

      {!data.entitled ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 font-semibold text-amber-900">
          {data.basic
            ? "Interactive exercises are available with Premium."
            : "This exercise is not available for your account."}
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {data.activeAttemptId ? (
            <div className="space-y-4">
              <p className="font-semibold text-slate-700">
                A saved draft is ready to continue.
              </p>
              <Link
                href={`/student-dashboard/exercises/${data.activeAttemptId}`}
                className="inline-flex min-h-12 items-center rounded-xl bg-blue-600 px-6 py-3 font-bold text-white"
              >
                Continue Exercise
              </Link>
            </div>
          ) : (
            <StudentExerciseStart
              bookId={data.bookId}
              chapterId={data.chapterId}
              exerciseId={data.exercise.id}
            />
          )}
          {data.lastAttempt ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold">
                Last result: {data.lastAttempt.scorePercent ?? 0}% ·{" "}
                {data.lastAttempt.marksAwarded}/{data.lastAttempt.totalMarks}
              </p>
              <p className="mt-1">
                Status: {data.lastAttempt.status.replaceAll("_", " ")}
              </p>
              <Link
                href={`/student-dashboard/exercises/${data.lastAttempt.id}/result`}
                className="mt-3 inline-flex font-bold text-blue-700"
              >
                View last result
              </Link>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}

async function loadEntry(input: { chapterId: string; exerciseId: string }) {
  try {
    const entry = await getStudentExerciseEntry({
      bookId: await resolveBookId(input.chapterId),
      chapterId: input.chapterId,
      exerciseId: input.exerciseId,
    });
    return entry;
  } catch {
    return null;
  }
}

async function resolveBookId(chapterId: string) {
  const { prisma } = await import("@/lib/prisma");
  const chapter = await prisma.bookChapter.findUnique({
    where: { id: chapterId },
    select: { bookId: true },
  });
  if (!chapter) notFound();
  return chapter.bookId;
}
