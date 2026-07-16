import Link from "next/link";
import { ClipboardCheck, Clock3 } from "lucide-react";
import StudentAssessmentStart from "@/components/student/StudentAssessmentStart";
import { getStudentAssessments } from "@/lib/student-assessments";

export default async function StudentAssessmentsPage() {
  const data = await getStudentAssessments();
  return <main className="space-y-7 p-4 sm:p-6 lg:p-8">
    <section className="rounded-3xl bg-gradient-to-br from-indigo-700 to-violet-700 p-7 text-white shadow-xl sm:p-10"><div className="flex items-center gap-3"><ClipboardCheck className="h-8 w-8" /><p className="font-bold uppercase tracking-wider text-indigo-100">Assessment Engine</p></div><h1 className="mt-4 text-3xl font-bold sm:text-4xl">My Assessments</h1><p className="mt-3 max-w-2xl text-indigo-100">Formal measurements assigned to your current class. Saved answers and submitted results become part of your academic record.</p></section>
    {data.state === "LOCKED" ? <Notice title="Assessments are available with Premium." body="Your approved books and learning tools remain available." /> : data.state === "FEATURE_DISABLED" ? <Notice title="This feature is not available on your platform." body="Your publisher has not enabled Assessments." /> : data.state === "UNAVAILABLE" ? <Notice title="Assessments are unavailable." body="Please try again later." /> : data.assessments.length === 0 ? <Notice title="No assessments are available yet." body="Published assessments for your current class will appear here." /> : <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{data.assessments.map((assessment) => <article key={assessment.id} className="flex flex-col rounded-3xl border bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-800">{assessment.type.replaceAll("_", " ")}</span><span className="text-sm font-semibold text-slate-500">{assessment.totalMarks} marks</span></div><h2 className="mt-5 text-xl font-bold">{assessment.title}</h2><p className="mt-2 text-slate-600">{assessment.bookTitle}</p>{assessment.chapter && <p className="mt-1 text-sm text-slate-500">{assessment.chapter}</p>}<div className="mt-5 grid gap-2 text-sm text-slate-600"><p>{assessment.totalQuestions} questions</p><p className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{assessment.durationMinutes ? `${assessment.durationMinutes} minutes` : "Untimed"}</p>{assessment.dueAt && <p>Due {formatDate(assessment.dueAt)}</p>}</div><div className="mt-auto pt-6"><AssessmentAction assessment={assessment} /></div></article>)}</section>}
  </main>;
}

function AssessmentAction({ assessment }: { assessment: Awaited<ReturnType<typeof getStudentAssessments>> extends { assessments: infer T } ? T extends Array<infer I> ? I : never : never }) {
  if (assessment.availability === "START") return <StudentAssessmentStart assessmentId={assessment.id} />;
  if (assessment.availability === "CONTINUE" && assessment.attemptId) return <Link href={`/student-dashboard/assessment-attempts/${assessment.attemptId}`} className="inline-flex min-h-12 items-center rounded-xl bg-indigo-700 px-6 py-3 font-bold text-white">Resume Assessment</Link>;
  if (assessment.availability === "RESULT" && assessment.attemptId) return <Link href={`/student-dashboard/assessment-attempts/${assessment.attemptId}/result`} className="inline-flex min-h-12 items-center rounded-xl border border-indigo-300 px-6 py-3 font-bold text-indigo-800">View Result</Link>;
  const label = assessment.availability === "UPCOMING" ? `Opens ${assessment.opensAt ? formatDate(assessment.opensAt) : "later"}` : assessment.availability === "CLOSED" ? "Assessment closed" : "Submitted";
  return <p className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-600">{label}</p>;
}

function Notice({ title, body }: { title: string; body: string }) { return <section className="rounded-3xl border bg-white p-10 text-center shadow-sm"><h2 className="text-xl font-bold">{title}</h2><p className="mt-2 text-slate-600">{body}</p></section>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value)); }
