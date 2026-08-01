import { mentorRemedialAction } from "../../actions";
import { getMentorStudentProfile } from "@/lib/mentor-dashboard";

export default async function MentorStudentSupportPlanPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const profile = await getMentorStudentProfile(studentId);

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Support Plan</h2>
        <p className="mt-2 text-sm text-slate-600">Existing gap and remedial plans only. Mentor actions are tracked non-destructively.</p>

        {profile.gaps.length ? (
          <ul className="mt-4 space-y-3">
            {profile.gaps.map((gap) => (
              <li key={gap.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-semibold text-amber-950">{gap.subject?.name ?? gap.chapter?.title ?? gap.skillLabel ?? "Learning gap"}</p>
                <p className="mt-1 text-sm text-amber-900">{gap.dimension.replaceAll("_", " ")} · {gap.severity} · {gap.status}</p>
                <p className="mt-1 text-sm text-amber-900">Recommended support: Review remedial plan and add mentor recommendation.</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No active learning gaps are currently open.</p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Remedial Actions</h2>
        {profile.remedials.length ? (
          <div className="mt-4 space-y-4">
            {profile.remedials.map((plan) => (
              <article key={plan.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">{plan.gap.subject?.name ?? plan.gap.chapter?.title ?? plan.gap.skillLabel ?? "Support pathway"}</p>
                    <p className="mt-1 text-sm text-slate-600">Status: {plan.status} · Progress: {plan.steps.filter((step) => step.status === "COMPLETED" || step.status === "TEACHER_CLOSED").length}/{plan.steps.length}</p>
                    <p className="mt-1 text-sm text-slate-600">Review date: {plan.dueAt.toLocaleDateString("en-IN")}</p>
                  </div>
                  <form action={mentorRemedialAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="studentId" value={studentId} />
                    <input type="hidden" name="planId" value={plan.id} />
                    <button name="action" value="REVIEW" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Mark Mentor Action Complete</button>
                    <button name="action" value="RECOMMEND_COMPLETION" className="rounded-xl bg-indigo-700 px-3 py-2 text-sm font-semibold text-white">Recommend Completion</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No remedial plan is available for this student.</p>
        )}
      </section>
    </main>
  );
}
