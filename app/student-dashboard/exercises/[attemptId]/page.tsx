import { notFound, redirect } from "next/navigation";

import StudentExercisePlayer from "@/components/student/StudentExercisePlayer";
import { getStudentExerciseAttempt } from "@/lib/student-exercise";

export default async function StudentExerciseAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const attempt = await loadAttempt(attemptId);
  if (!attempt) notFound();
  if (attempt.status !== "IN_PROGRESS") {
    redirect(`/student-dashboard/exercises/${attemptId}/result`);
  }
  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <StudentExercisePlayer
        attemptId={attempt.id}
        exerciseTitle={attempt.exerciseTitle}
        instructions={attempt.instructions}
        initialQuestions={attempt.questions}
      />
    </main>
  );
}

async function loadAttempt(attemptId: string) {
  try {
    return await getStudentExerciseAttempt(attemptId);
  } catch {
    return null;
  }
}
