import Link from "next/link";
import { redirect } from "next/navigation";
import { createAssessmentAction } from "../actions";
import { getTeacherAssessmentBuilderOptions } from "@/lib/teacher-assessments";

export default async function TeacherAssessmentNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<{ subject?: string }>;
}) {
  const { sectionId } = await params;
  const selected = (await searchParams).subject;
  const data = await getTeacherAssessmentBuilderOptions(sectionId, selected);

  async function action(formData: FormData) {
    "use server";
    const result = await createAssessmentAction(sectionId, formData);
    if (result.ok) {
      redirect(`/teacher-dashboard/classes/${sectionId}/assessments/${result.assessmentId}?subject=${data.subject.id}`);
    }
  }

  const firstBook = data.books[0] ?? null;

  return (
    <main className="space-y-6">
      <Link href={`/teacher-dashboard/classes/${sectionId}/assessments?subject=${data.subject.id}`} className="text-sm font-semibold text-blue-700">
        ← Back to Assessments
      </Link>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Create Assessment</h1>
        <p className="mt-2 text-sm text-slate-600">Set up assessment details first, then add and configure questions in the builder.</p>

        <form action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="sectionSubjectId" value={data.subject.id} />

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Assessment Name</span>
            <input name="title" required minLength={3} maxLength={160} className="rounded-xl border px-4 py-2" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Assessment Type</span>
            <select name="type" defaultValue="CUSTOM" className="rounded-xl border px-4 py-2">
              <option value="CHAPTER">Chapter</option>
              <option value="UNIT">Unit</option>
              <option value="TERM">Term</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Subject</span>
            <input value={data.subject.subject.name} disabled className="rounded-xl border bg-slate-50 px-4 py-2" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Book</span>
            <select name="bookId" defaultValue={firstBook?.id ?? ""} className="rounded-xl border px-4 py-2">
              {data.books.map((book) => (
                <option key={book.id} value={book.id}>{book.title}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 sm:col-span-2">
            <span className="text-sm font-semibold">Instructions</span>
            <textarea name="instructions" rows={4} maxLength={4000} className="rounded-xl border px-4 py-2" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Chapter</span>
            <select name="chapterId" defaultValue="" className="rounded-xl border px-4 py-2">
              <option value="">All chapters</option>
              {(firstBook?.chapters ?? []).map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  Chapter {chapter.chapterNumber}: {chapter.title}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Duration (minutes)</span>
            <input name="durationMinutes" type="number" min={1} max={300} className="rounded-xl border px-4 py-2" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Maximum Marks (validation target)</span>
            <input name="maximumMarks" type="number" min={1} max={1000} className="rounded-xl border px-4 py-2" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Passing Marks (advisory)</span>
            <input name="passingMarks" type="number" min={1} max={1000} className="rounded-xl border px-4 py-2" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Start Date</span>
            <input name="opensAt" type="datetime-local" className="rounded-xl border px-4 py-2" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">End Date</span>
            <input name="dueAt" type="datetime-local" className="rounded-xl border px-4 py-2" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Attempts Allowed</span>
            <input name="maxAttempts" type="number" min={1} max={20} defaultValue={1} required className="rounded-xl border px-4 py-2" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Result Release</span>
            <select name="resultRelease" defaultValue="IMMEDIATE" className="rounded-xl border px-4 py-2">
              <option value="IMMEDIATE">Immediate</option>
              <option value="AFTER_DUE_DATE">After Due Date</option>
              <option value="NEVER">Never</option>
            </select>
          </label>

          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="showScore" defaultChecked />
            Show Score
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="showCorrectAnswers" />
            Show Answers
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="showExplanations" />
            Show Explanation
          </label>

          <div className="sm:col-span-2 flex flex-wrap gap-3 pt-2">
            <button type="submit" name="intent" value="DRAFT" className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">
              Save Draft
            </button>
            <button type="submit" name="intent" value="PUBLISH" className="rounded-xl bg-violet-700 px-4 py-2 font-semibold text-white">
              Publish
            </button>
          </div>
        </form>
      </section>
    </main>
  );
 }
