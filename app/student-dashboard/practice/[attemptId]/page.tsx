import { notFound } from "next/navigation";
import StudentPracticePlayer from "@/components/student/StudentPracticePlayer";
import { requireStudent } from "@/lib/student-dashboard";
import { getStudentPracticeAttempt } from "@/lib/student-practice";

export default async function PracticeAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const attempt = await loadAttempt(attemptId);

  if (attempt.status === "SUBMITTED") notFound();

  return (
    <main className="space-y-5 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="font-bold text-blue-700">
          {attempt.bookTitle} &middot; Chapter {attempt.chapterNumber}
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          {attempt.chapterTitle} Practice
        </h1>
      </header>
      <StudentPracticePlayer
        attemptId={attempt.id}
        initialQuestions={attempt.questions}
      />
    </main>
  );
}

async function loadAttempt(attemptId: string) {
  try {
    await requireStudent();
    return await getStudentPracticeAttempt(attemptId);
  } catch {
    notFound();
  }
}
