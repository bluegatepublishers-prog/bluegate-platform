import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeacherAssessmentPreview, TeacherAssessmentError } from "@/lib/teacher-assessments";

export default async function TeacherAssessmentPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string; assessmentId: string }>;
  searchParams: Promise<{ subject?: string }>;
}) {
  const { sectionId, assessmentId } = await params;
  const query = await searchParams;

  let preview: Awaited<ReturnType<typeof getTeacherAssessmentPreview>>;
  try {
    preview = await getTeacherAssessmentPreview(sectionId, assessmentId);
  } catch (error) {
    if (error instanceof TeacherAssessmentError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  return (
    <main className="space-y-6">
      <Link href={`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}?subject=${query.subject ?? ""}`} className="text-sm font-semibold text-blue-700">
        ← Back to Builder
      </Link>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-violet-700">Student Preview</p>
        <h1 className="mt-1 text-2xl font-bold">{preview.assessment.title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {preview.assessment.durationMinutes ? `${preview.assessment.durationMinutes} minutes` : "Untimed"} · {preview.questions.length} question(s) · {preview.questions.reduce((sum, question) => sum + question.marks, 0)} marks
        </p>
        {preview.assessment.instructions ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">{preview.assessment.instructions}</div>
        ) : null}
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Questions</h2>
        <div className="mt-5 space-y-4">
          {preview.questions.map((question) => (
            <article key={question.assessmentQuestionId} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-violet-700">Question {question.questionNumber}</p>
                <p className="text-sm font-semibold text-slate-600">{question.marks} mark(s)</p>
              </div>
              <h3 className="mt-2 font-semibold text-slate-900">{question.questionText}</h3>

              {Array.isArray(question.options) ? (
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {question.options.map((option) => (
                    <li key={option} className="rounded-lg border border-slate-200 px-3 py-2">{option}</li>
                  ))}
                </ul>
              ) : question.options && !Array.isArray(question.options) && "left" in question.options ? (
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {(question.options as { left: string[]; right: string[] }).left.map((leftItem, index) => (
                    <div key={`${leftItem}-${index}`} className="rounded-lg border border-slate-200 px-3 py-2">
                      {leftItem} ↔ {(question.options as { left: string[]; right: string[] }).right[index]}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Student answer field will be shown here.</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
