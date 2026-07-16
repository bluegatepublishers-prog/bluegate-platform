import Link from "next/link";
import { notFound, redirect, unstable_rethrow } from "next/navigation";
import StudentAssessmentPlayer from "@/components/student/StudentAssessmentPlayer";
import { getStudentAssessmentAttempt } from "@/lib/student-assessments";

export default async function AssessmentAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const attempt = await safeAttempt(attemptId);
  if (attempt.state === "SUBMITTED") redirect(`/student-dashboard/assessment-attempts/${attempt.id}/result`);
  return <main className="space-y-6 p-4 sm:p-6 lg:p-8"><Link href="/student-dashboard/assessments" className="font-semibold text-indigo-700">← Back to Assessments</Link><header className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl sm:p-9"><p className="text-sm font-bold uppercase tracking-wider text-indigo-300">Formal Assessment</p><h1 className="mt-3 text-3xl font-bold">{attempt.title}</h1><p className="mt-3 text-slate-300">{attempt.bookTitle}{attempt.chapter ? ` · ${attempt.chapter}` : ""}</p>{attempt.instructions && <p className="mt-4 max-w-3xl leading-7 text-slate-200">{attempt.instructions}</p>}</header><StudentAssessmentPlayer attempt={attempt} /></main>;
}

async function safeAttempt(attemptId: string) {
  try { return await getStudentAssessmentAttempt(attemptId); }
  catch (error) { unstable_rethrow(error); notFound(); }
}
