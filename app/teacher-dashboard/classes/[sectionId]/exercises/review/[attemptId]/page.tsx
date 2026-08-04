import Link from "next/link";
import { notFound } from "next/navigation";

import TeacherExerciseReviewClient from "@/components/teacher/TeacherExerciseReviewClient";
import { getTeacherExerciseReviewAttempt } from "@/lib/student-exercise";

export default async function TeacherExerciseReviewPage({
  params,
}: {
  params: Promise<{ sectionId: string; attemptId: string }>;
}) {
  const { sectionId, attemptId } = await params;
  const data = await loadReview(sectionId, attemptId);
  if (!data) notFound();

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link
        href={`/teacher-dashboard/classes/${sectionId}`}
        className="text-sm font-semibold text-blue-700"
      >
        Back to class
      </Link>
      <header className="rounded-[2rem] bg-slate-950 p-8 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
          Exercise Review
        </p>
        <h1 className="mt-3 text-3xl font-bold">{data.attempt.exercise?.title}</h1>
        <p className="mt-3 text-slate-300">
          {data.attempt.student.user?.name ?? "Student"} · {data.attempt.book.title} · Chapter{" "}
          {data.attempt.chapter.chapterNumber}
        </p>
      </header>
      <TeacherExerciseReviewClient
        sectionId={sectionId}
        attemptId={attemptId}
        responses={data.responses}
      />
    </main>
  );
}

async function loadReview(sectionId: string, attemptId: string) {
  try {
    return await getTeacherExerciseReviewAttempt(sectionId, attemptId);
  } catch {
    return null;
  }
}
