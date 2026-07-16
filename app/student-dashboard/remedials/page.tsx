import Link from "next/link";
import { getStudentRemedialPlans } from "@/lib/remedials/student";
import { updateRemedialStepAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentRemedialsPage() {
  const report = await getStudentRemedialPlans();
  if (report.state !== "READY") return <main className="space-y-6 p-4 sm:p-6 lg:p-8"><h1 className="text-3xl font-bold">My learning path</h1><div className="rounded-2xl border bg-white p-6">{report.state === "LOCKED" ? "Personalized learning paths are available with Premium." : "This feature is not available on your platform."}</div></main>;
  return <main className="space-y-7 p-4 sm:p-6 lg:p-8">
    <header><p className="font-bold text-indigo-700">Teacher-reviewed support</p><h1 className="mt-2 text-3xl font-bold">My learning path</h1><p className="mt-2 text-slate-600">Small, focused steps using your approved books and learning resources.</p></header>
    {report.plans.length ? report.plans.map((plan) => <section key={plan.id} className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm font-bold text-indigo-700">{plan.subject}</p><h2 className="text-xl font-bold">{plan.learningArea}</h2></div><span className="text-sm font-semibold">{plan.completed}/{plan.total} required steps</span></div>
      <ol className="mt-5 space-y-3">{plan.steps.map((step) => <li key={step.id} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between gap-4"><div><p className="font-bold">{step.action}</p><p className="text-sm text-slate-600">{step.label}{step.pageStart != null ? ` · pages ${step.pageStart}–${step.pageEnd}` : ""}</p><StepLink step={step}/></div><span className="text-xs font-bold text-slate-500">{step.status.replaceAll("_", " ")}{step.resourceId && !["COMPLETED", "TEACHER_CLOSED"].includes(step.status) ? <form action={updateRemedialStepAction} className="mt-2"><input type="hidden" name="stepId" value={step.id}/><button name="action" value="COMPLETE" className="rounded-lg border px-2 py-1">Mark complete</button></form> : null}</span></div></li>)}</ol>
    </section>) : <div className="rounded-2xl border bg-white p-6">No teacher-reviewed learning path is assigned right now.</div>}
  </main>;
}

function StepLink({ step }: { step: Awaited<ReturnType<typeof getStudentRemedialPlans>> extends { plans: infer P } ? P extends Array<infer Plan> ? Plan extends { steps: Array<infer Step> } ? Step : never : never : never }) {
  const className = "mt-2 inline-block text-sm font-bold text-indigo-700";
  if (step.type === "BOOK_CHAPTER" || step.type === "SPECIFIC_PAGES") return <Link className={className} href={`/student-dashboard/books/${step.bookId}`}>Open book</Link>;
  if (step.type === "REVISION_HUB") return <Link className={className} href={`/student-dashboard/books/${step.bookId}/chapters/${step.chapterId}/revision`}>Open revision</Link>;
  if (step.type === "INTERACTIVE_PRACTICE") return <Link className={className} href={`/student-dashboard/books/${step.bookId}/chapters/${step.chapterId}/practice`}>Open practice</Link>;
  if (step.type === "ASSESSMENT_RETRY") return <Link className={className} href="/student-dashboard/assessments">Open assessments</Link>;
  if (step.resourceId) return <Link className={className} href={`/api/student/resources/${step.resourceId}/open`}>Open resource</Link>;
  return null;
}
