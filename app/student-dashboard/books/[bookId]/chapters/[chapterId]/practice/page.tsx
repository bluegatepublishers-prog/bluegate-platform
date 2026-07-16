import Link from "next/link";
import { notFound } from "next/navigation";
import StudentPracticeStart from "@/components/student/StudentPracticeStart";
import { requireStudent } from "@/lib/student-dashboard";
import { getStudentRevisionHub } from "@/lib/student-revision";
import { getStudentPracticeAvailability } from "@/lib/student-practice";

export default async function PracticeEntryPage({ params }: { params: Promise<{ bookId: string; chapterId: string }> }) {
  await requireStudent(); const { bookId, chapterId } = await params;
  const [hub, availability] = await Promise.all([getStudentRevisionHub(bookId, chapterId), getStudentPracticeAvailability(bookId, chapterId)]);
  if (!hub) notFound();
  return <main className="space-y-7 p-4 sm:p-6 lg:p-8"><Link href={`/student-dashboard/books/${bookId}/chapters/${chapterId}/revision`} className="font-semibold text-blue-700">← Back to Revision Hub</Link><section className="rounded-3xl bg-slate-950 p-8 text-white shadow-xl sm:p-10"><p className="text-sm font-bold uppercase tracking-wider text-blue-300">Chapter {hub.chapter.chapterNumber} Practice</p><h1 className="mt-3 text-3xl font-bold">{hub.chapter.title}</h1><p className="mt-3 text-slate-300">Five deterministic questions from the approved question bank.</p></section><section className="rounded-3xl border bg-white p-7 shadow-sm"><h2 className="text-2xl font-bold">Practice</h2><div className="mt-5">{availability.state === "LOCKED" ? <p className="rounded-2xl bg-amber-50 p-5 font-semibold text-amber-900">{availability.basic ? "Practice is available with Premium." : "This practice activity is not available for your account."}</p> : availability.state === "EMPTY" ? <p>No practice questions are available for this chapter yet.</p> : availability.state === "UNAVAILABLE" ? <p>This practice activity is not available for your account.</p> : availability.state === "CONTINUE" ? <Link href={`/student-dashboard/practice/${availability.attemptId}`} className="inline-flex min-h-12 items-center rounded-xl bg-blue-600 px-6 py-3 font-bold text-white">Continue Practice</Link> : <div className="flex flex-wrap gap-4"><StudentPracticeStart bookId={bookId} chapterId={chapterId} label={availability.state === "RETRY" ? "Retry Practice" : "Start Practice"} />{availability.state === "RETRY" && <Link href={`/student-dashboard/practice/${availability.resultAttemptId}/result`} className="inline-flex min-h-12 items-center rounded-xl border px-6 py-3 font-bold">View Last Result</Link>}</div>}</div></section></main>;
}
