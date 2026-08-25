import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addManualQuestionAction,
  addPublisherQuestionsAction,
  addSelectedQuestionsAction,
  addMyQuestionsAction,
  addPreviousAssessmentQuestionsAction,
  closeAssessmentAction,
  duplicateQuestionAction,
  moveQuestionAction,
  publishAssessmentAction,
  removeQuestionAction,
  shuffleQuestionsAction,
  updateAssessmentSettingsAction,
  updateQuestionMarksAction,
} from "../actions";
import {
  getTeacherAssessmentEditor,
  getTeacherAssessmentBuilderOptions,
  TeacherAssessmentError,
  type TeacherAssessmentLifecycleStatus,
} from "@/lib/teacher-assessments";

const STATUS_LABEL: Record<TeacherAssessmentLifecycleStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

export default async function TeacherAssessmentEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string; assessmentId: string }>;
  searchParams: Promise<{ subject?: string; q?: string; chapter?: string; source?: string; module?: string; exercise?: string; type?: string; difficulty?: string; returnTo?: string }>;
}) {
  const { sectionId, assessmentId } = await params;
  const query = await searchParams;
  const returnTo = query.returnTo && query.returnTo.startsWith("/teacher-dashboard/classes/" + sectionId + "/teach") ? query.returnTo : null;
  const search = (query.q ?? "").trim();
  const chapter = (query.chapter ?? "").trim();
  const source = (query.source ?? "ALL").trim();
  const moduleId = (query.module ?? "").trim();
  const exerciseId = (query.exercise ?? "").trim();
  const questionType = (query.type ?? "").trim();
  const difficulty = (query.difficulty ?? "").trim();

  let editor: Awaited<ReturnType<typeof getTeacherAssessmentEditor>>;
  try {
    editor = await getTeacherAssessmentEditor({
      sectionId,
      assessmentId,
      search,
      chapterId: chapter,
      source: source as "ALL" | "BOOK" | "PUBLISHER" | "MY",
      moduleId,
      exerciseId,
      questionType,
      difficulty,
    });
  } catch (error) {
    if (error instanceof TeacherAssessmentError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const options = await getTeacherAssessmentBuilderOptions(sectionId, editor.subject.id);

  async function updateSettings(formData: FormData) {
    "use server";
    await updateAssessmentSettingsAction(sectionId, assessmentId, formData);
  }

  async function publish(formData: FormData) {
    "use server";
    await publishAssessmentAction(sectionId, assessmentId, formData);
  }

  async function closeAssessment() {
    "use server";
    await closeAssessmentAction(sectionId, assessmentId);
  }

  async function addManualQuestion(formData: FormData) {
    "use server";
    await addManualQuestionAction(sectionId, assessmentId, formData);
  }

  const lifecycle = editor.assessment.status === "DRAFT"
    ? "DRAFT"
    : editor.assessment.status === "ARCHIVED"
      ? "ARCHIVED"
      : editor.assessment.status === "CLOSED"
        ? "CLOSED"
        : editor.assessment.opensAt && new Date(editor.assessment.opensAt) > new Date()
          ? "SCHEDULED"
          : editor.assessment.dueAt && new Date(editor.assessment.dueAt) <= new Date()
            ? "CLOSED"
            : "ACTIVE";

  const totalMarks = editor.assessment.questions.reduce((sum, question) => sum + question.marks, 0);
  const questionTypeOptions = ["MCQ", "TRUE_FALSE", "FILL_BLANK", "MATCH", "MULTIPLE_SELECT", "ORDERING", "SHORT_ANSWER", "LONG_ANSWER", "CASE_BASED", "COMPETENCY", "HOTS"];
  const activeSource = ["BOOK", "PUBLISHER", "MY"].includes(source) ? source : "ALL";
  const selectedChapter = editor.selectedBook.chapters.find((chapterItem) => chapterItem.id === editor.selectedChapterId) ?? editor.assessment.chapter;
  const questionBankHref = (nextSource: string) => {
    const params = new URLSearchParams({ subject: editor.subject.id, source: nextSource });
    if (editor.selectedChapterId) params.set("chapter", editor.selectedChapterId);
    if (moduleId) params.set("module", moduleId);
    if (exerciseId) params.set("exercise", exerciseId);
    if (questionType) params.set("type", questionType);
    if (difficulty) params.set("difficulty", difficulty);
    if (search) params.set("q", search);
    return "/teacher-dashboard/classes/" + sectionId + "/assessments/" + assessmentId + "?" + params.toString();
  };

  return (
    <main className="space-y-6">
      <Link href={`/teacher-dashboard/classes/${sectionId}/assessments?subject=${editor.subject.id}`} className="text-sm font-semibold text-blue-700">
        - Back to Assessments
      {returnTo ? <Link href={returnTo} className="ml-4 text-sm font-semibold text-teal-700">← Back to Teach</Link> : null}
      </Link>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-violet-700">{STATUS_LABEL[lifecycle]}</p>
            <h1 className="mt-1 text-2xl font-bold">Assessment: {editor.assessment.title}</h1>
            <p className="mt-2 text-sm text-slate-700">
              {editor.assessment.section.schoolClass.name} - {editor.assessment.section.name} &middot; {editor.assessment.sectionSubject.subject.name}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Book: {editor.selectedBook.title} &middot; Chapter: {selectedChapter ? "Chapter " + selectedChapter.chapterNumber + " - " + selectedChapter.title : "All chapters"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {editor.assessment.questions.length} question(s) &middot; {totalMarks} marks &middot; {editor.assessment._count.attempts} attempt(s)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading?subject=${editor.subject.id}`}
              className="rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700"
            >
              Grading
            </Link>
            <Link
              href={`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/preview?subject=${editor.subject.id}`}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Preview
            </Link>
            <Link
              href={`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/analytics`}
              className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700"
            >
              Analytics
            </Link>
            <form action={publish}>
              <input type="hidden" name="maximumMarks" value={totalMarks} />
              <button type="submit" className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white">Publish</button>
            </form>
            <form action={closeAssessment}>
              <button type="submit" className="rounded-xl border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700">Close</button>
            </form>
          </div>
        </div>
      </section>

      {editor.assessment.teachingPeriod ? (
        <section className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950" aria-label="Locked period context">
          <span className="font-semibold">Period context:</span> {editor.assessment.teachingPeriod.timetableEntry ? editor.assessment.teachingPeriod.timetableEntry.weekday + " - " + editor.assessment.teachingPeriod.timetableEntry.periodSlot.label : editor.assessment.teachingPeriod.title}
          {editor.assessment.teachingPeriod.plannedDate ? " - " + new Date(editor.assessment.teachingPeriod.plannedDate).toLocaleDateString() : ""}
          <span className="ml-1 text-xs">Class, subject, book, and period are locked to this assessment.</span>
        </section>
      ) : null}

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Configure</h2>
        <form action={updateSettings} className="mt-5 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="sectionSubjectId" value={editor.subject.id} />
          <label className="grid gap-2">
            <span className="text-sm font-semibold">Assessment Name</span>
            <input name="title" defaultValue={editor.assessment.title} required minLength={3} maxLength={160} className="rounded-xl border px-4 py-2" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold">Assessment Type</span>
            <select name="type" defaultValue={editor.assessment.type} className="rounded-xl border px-4 py-2">
              <option value="CHAPTER">Chapter</option>
              <option value="UNIT">Unit</option>
              <option value="TERM">Term</option>
              <option value="CUSTOM">Practice</option><option value="CUSTOM">Custom</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Book</span>
            <select name="bookId" defaultValue={editor.assessment.bookId} className="rounded-xl border px-4 py-2" disabled={!editor.canEditQuestions}>
              {options.books.map((book) => (
                <option key={book.id} value={book.id}>{book.title}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Chapter</span>
            <select name="chapterId" defaultValue={editor.assessment.chapterId ?? ""} className="rounded-xl border px-4 py-2" disabled={!editor.canEditQuestions || editor.assessment.type === "CHAPTER"}>
              <option value="">All chapters</option>
              {(options.books.find((book) => book.id === editor.assessment.bookId)?.chapters ?? []).map((chapterItem) => (
                <option key={chapterItem.id} value={chapterItem.id}>
                  Chapter {chapterItem.chapterNumber}: {chapterItem.title}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 sm:col-span-2">
            <span className="text-sm font-semibold">Instructions</span>
            <textarea name="instructions" rows={4} defaultValue={editor.assessment.instructions ?? ""} className="rounded-xl border px-4 py-2" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Duration (minutes)</span>
            <input name="durationMinutes" type="number" min={1} max={300} defaultValue={editor.assessment.durationMinutes ?? ""} className="rounded-xl border px-4 py-2" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Attempts Allowed</span>
            <input
              name="maxAttempts"
              type="number"
              min={1}
              max={20}
              defaultValue={editor.assessment.settings?.maxAttempts ?? 1}
              className="rounded-xl border px-4 py-2"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Start Date</span>
            <input name="opensAt" type="datetime-local" defaultValue={toLocalDateTime(editor.assessment.opensAt)} className="rounded-xl border px-4 py-2" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">End Date</span>
            <input name="dueAt" type="datetime-local" defaultValue={toLocalDateTime(editor.assessment.dueAt)} className="rounded-xl border px-4 py-2" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Result Release</span>
            <select name="resultRelease" defaultValue={editor.assessment.settings?.resultRelease ?? "IMMEDIATE"} className="rounded-xl border px-4 py-2">
              <option value="IMMEDIATE">Immediate</option>
              <option value="AFTER_DUE_DATE">After Due Date</option>
              <option value="NEVER">Never</option>
            </select>
          </label>

          <div className="grid gap-2 text-sm font-semibold">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" name="showScore" defaultChecked={editor.assessment.settings?.showScore ?? true} />
              Show Score
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" name="showCorrectAnswers" defaultChecked={editor.assessment.settings?.showCorrectAnswers ?? false} />
              Show Answers
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" name="showExplanations" defaultChecked={editor.assessment.settings?.showExplanations ?? false} />
              Show Explanation
            </label>
          </div>

          <div className="sm:col-span-2">
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">Save Configuration</button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Question Builder</h2>
          <form action={shuffleQuestionsAction.bind(null, sectionId, assessmentId)}>
            <button type="submit" disabled={!editor.canEditQuestions} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Shuffle Order</button>
          </form>
        </div>

        {editor.assessment.questions.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2 pr-3">Question</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Marks</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {editor.assessment.questions.map((question) => (
                  <tr key={question.id} className="border-t border-slate-100 align-top">
                    <td className="py-3 pr-3 font-semibold">{question.sequence}</td>
                    <td className="py-3 pr-3 text-slate-700">{question.questionText}</td>
                    <td className="py-3 pr-3 text-slate-600">{question.questionType}</td>
                    <td className="py-3 pr-3">
                      <form action={updateQuestionMarksAction.bind(null, sectionId, assessmentId, question.id)} className="flex items-center gap-2">
                        <input type="number" name="marks" min={1} max={100} defaultValue={question.marks} className="w-20 rounded border px-2 py-1" disabled={!editor.canEditQuestions} />
                        <button type="submit" className="rounded border px-2 py-1 font-semibold" disabled={!editor.canEditQuestions}>Save</button>
                      </form>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <form action={moveQuestionAction.bind(null, sectionId, assessmentId, question.id, "UP")}>
                          <button type="submit" className="rounded border px-2 py-1 font-semibold" disabled={!editor.canEditQuestions}>Up</button>
                        </form>
                        <form action={moveQuestionAction.bind(null, sectionId, assessmentId, question.id, "DOWN")}>
                          <button type="submit" className="rounded border px-2 py-1 font-semibold" disabled={!editor.canEditQuestions}>Down</button>
                        </form>
                        <form action={duplicateQuestionAction.bind(null, sectionId, assessmentId, question.id)}>
                          <button type="submit" className="rounded border px-2 py-1 font-semibold" disabled={!editor.canEditQuestions}>Duplicate</button>
                        </form>
                        <form action={removeQuestionAction.bind(null, sectionId, assessmentId, question.id)}>
                          <button type="submit" className="rounded border border-rose-300 px-2 py-1 font-semibold text-rose-700" disabled={!editor.canEditQuestions}>Remove</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No questions selected yet.</p>
        )}
      </section>

      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Question Bank</h2>
            <p className="mt-1 text-sm text-slate-600">Choose questions for this assessment, then add them to the selected list.</p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <div><span className="font-semibold">Selected:</span> {editor.assessment.questions.length}</div>
            <div><span className="font-semibold">Marks:</span> {totalMarks}</div>
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap gap-2 border-b pb-3" aria-label="Question sources">
          {[
            ["ALL", "All"],
            ["BOOK", "Book Questions"],
            ["PUBLISHER", "Publisher Questions"],
            ["MY", "My Questions"],
          ].map(([value, label]) => (
            <Link key={value} href={questionBankHref(value)} aria-current={activeSource === value ? "page" : undefined} className={activeSource === value ? "rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white" : "rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"}>
              {label}
            </Link>
          ))}
        </nav>

        <form action={"/teacher-dashboard/classes/" + sectionId + "/assessments/" + assessmentId} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input type="hidden" name="subject" value={editor.subject.id} />
          <input type="hidden" name="source" value={activeSource} />
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chapter</span>
            {editor.assessment.chapterId ? (
              <input value={selectedChapter ? "Chapter " + selectedChapter.chapterNumber + ": " + selectedChapter.title : "Selected chapter"} readOnly aria-label="Chapter (locked)" className="rounded-xl border bg-slate-50 px-3 py-2 text-sm" />
            ) : (
              <select name="chapter" defaultValue={editor.selectedChapterId} className="rounded-xl border px-3 py-2">
                <option value="">All chapters</option>
                {editor.selectedBook.chapters.map((chapterItem) => (
                  <option key={chapterItem.id} value={chapterItem.id}>Chapter {chapterItem.chapterNumber}: {chapterItem.title}</option>
                ))}
              </select>
            )}
          </label>
          {editor.modules.length ? (
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Module</span>
              <select name="module" defaultValue={moduleId} className="rounded-xl border px-3 py-2">
                <option value="">All Modules</option>
                {editor.modules.map((item: { id: string; title: string }) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>
          ) : null}
          {editor.exercises.length ? (
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exercise</span>
              <select name="exercise" defaultValue={exerciseId} className="rounded-xl border px-3 py-2">
                <option value="">All Exercises</option>
                {editor.exercises.map((item: { id: string; title: string }) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>
          ) : null}
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</span>
            <select name="type" defaultValue={questionType} className="rounded-xl border px-3 py-2">
              <option value="">All</option>
              {questionTypeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Difficulty</span>
            <select name="difficulty" defaultValue={difficulty} className="rounded-xl border px-3 py-2">
              <option value="">All</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Moderate</option>
              <option value="DIFFICULT">Difficult</option>
            </select>
          </label>
          <label className="grid gap-1 sm:col-span-2 lg:col-span-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
            <input name="q" defaultValue={search} placeholder="Search question text, competency, Bloom level, or tags" className="rounded-xl border px-3 py-2" />
          </label>
          <button type="submit" className="self-end rounded-xl border px-4 py-2 font-semibold">Apply Filters</button>
        </form>

        {editor.assessment.type !== "CHAPTER" && !editor.assessment.chapterId ? (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Multi-chapter assessment scope will be added later.</p>
        ) : null}
        {editor.myQuestionFilterNote ? <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">{editor.myQuestionFilterNote}</p> : null}
        {editor.publisherQuestionFilterNote ? <p className="mt-2 text-xs text-slate-500">{editor.publisherQuestionFilterNote}</p> : null}

        <form action={addSelectedQuestionsAction.bind(null, sectionId, assessmentId)} className="mt-4 space-y-3">
          <input type="hidden" name="questionBankChapterId" value={editor.selectedChapterId} />
          <input type="hidden" name="questionBankModuleId" value={moduleId} />
          <input type="hidden" name="questionBankExerciseId" value={exerciseId} />
          <input type="hidden" name="questionBankType" value={questionType} />
          <input type="hidden" name="questionBankDifficulty" value={difficulty} />

          <div className="overflow-hidden rounded-2xl border">
            {(activeSource === "ALL" || activeSource === "BOOK") ? (
              <div className="border-b last:border-b-0">
                <div className="bg-slate-50 px-3 py-2 text-sm font-bold">Book Questions</div>
                {editor.bookQuestions.length ? editor.bookQuestions.map((question) => (
                  <label key={question.id} className="flex gap-3 border-t px-3 py-3 text-sm">
                    <input type="checkbox" name="questionId" value={question.id} disabled={question.alreadyAdded || !editor.canEditQuestions} className="mt-1" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2"><strong>{question.questionType}</strong><span className="text-slate-500">&middot; {question.marks} mark(s) &middot; {question.difficulty || "Difficulty not specified"}</span></span>
                      <span className="mt-1 block text-slate-700">{question.questionText}</span>
                      <span className="mt-1 block text-xs text-slate-500">Source: Book Question{question.alreadyAdded ? " - Added" : ""}</span>
                      <details className="mt-1 text-xs"><summary className="cursor-pointer text-blue-700">Preview</summary><span className="block pt-1">{question.options ? "Options: " + JSON.stringify(question.options) + " - " : ""}{question.correctAnswer ? "Answer: " + question.correctAnswer + " - " : ""}{question.explanation ? "Explanation: " + question.explanation : "No explanation"}</span></details>
                    </span>
                  </label>
                )) : <p className="px-3 py-4 text-sm text-slate-600">No questions match the current filters.</p>}
              </div>
            ) : null}
            {(activeSource === "ALL" || activeSource === "PUBLISHER") ? (
              <div className="border-b last:border-b-0">
                <div className="bg-slate-50 px-3 py-2 text-sm font-bold">Publisher Questions</div>
                {editor.publisherQuestions.length ? editor.publisherQuestions.map((question) => (
                  <label key={question.id} className="flex gap-3 border-t px-3 py-3 text-sm">
                    <input type="checkbox" name="questionId" value={question.id} disabled={question.alreadyAdded || !editor.canEditQuestions} className="mt-1" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2"><strong>{question.questionType}</strong><span className="text-slate-500">&middot; {question.marks} mark(s) &middot; {question.difficulty || "Difficulty not specified"}</span></span>
                      <span className="mt-1 block text-slate-700">{question.questionText}</span>
                      <span className="mt-1 block text-xs text-slate-500">Source: Publisher Question{question.alreadyAdded ? " - Added" : ""}</span>
                      <details className="mt-1 text-xs"><summary className="cursor-pointer text-blue-700">Preview</summary><span className="block pt-1">{question.options ? "Options: " + JSON.stringify(question.options) + " - " : ""}{question.correctAnswer ? "Answer: " + question.correctAnswer + " - " : ""}{question.explanation ? "Explanation: " + question.explanation : "No explanation"}</span></details>
                    </span>
                  </label>
                )) : <p className="px-3 py-4 text-sm text-slate-600">No questions match the current filters.</p>}
              </div>
            ) : null}
            {(activeSource === "ALL" || activeSource === "MY") ? (
              <div>
                <div className="bg-slate-50 px-3 py-2 text-sm font-bold">My Questions</div>
                {editor.myQuestions.length ? editor.myQuestions.map((question) => (
                  <label key={question.id} className="flex gap-3 border-t px-3 py-3 text-sm">
                    <input type="checkbox" name="teacherQuestionId" value={question.id} disabled={question.alreadyAdded || !editor.canEditQuestions} className="mt-1" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2"><strong>{question.questionType}</strong><span className="text-slate-500">&middot; {question.marks} mark(s) &middot; {question.difficulty || "Difficulty not specified"}</span></span>
                      <span className="mt-1 block text-slate-700">{question.questionText}</span>
                      <span className="mt-1 block text-xs text-slate-500">Source: My Question - Module/Exercise metadata may be unavailable{question.alreadyAdded ? " - Added" : ""}</span>
                      <details className="mt-1 text-xs"><summary className="cursor-pointer text-blue-700">Preview</summary><span className="block pt-1">{question.options ? "Options: " + JSON.stringify(question.options) + " - " : ""}{question.correctAnswer ? "Answer: " + question.correctAnswer + " - " : ""}{question.explanation ? "Explanation: " + question.explanation : "No explanation"}</span></details>
                    </span>
                  </label>
                )) : <p className="px-3 py-4 text-sm text-slate-600">No questions match the current filters.</p>}
              </div>
            ) : null}
          </div>

          <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-sm">
            <span><span className="font-semibold">Selected:</span> {editor.assessment.questions.length} <span className="ml-3 font-semibold">Marks:</span> {totalMarks}</span>
            <button type="submit" disabled={!editor.canEditQuestions} className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50">Add Selected Questions</button>
          </div>
        </form>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border p-4">
            <h4 className="font-bold">Previous Assessment Questions</h4>
            <form action={addPreviousAssessmentQuestionsAction.bind(null, sectionId, assessmentId)} className="mt-3 space-y-3">
              <div className="max-h-64 space-y-2 overflow-auto rounded-xl border p-3">
                {editor.previousSnapshots.length ? editor.previousSnapshots.map((question) => (
                  <label key={question.id} className="flex gap-2 text-sm">
                    <input type="checkbox" name="snapshotId" value={question.id} disabled={question.alreadyAdded || !editor.canEditQuestions} />
                    <span><strong>{question.assessmentTitle}</strong> - {question.questionText}</span>
                  </label>
                )) : <p className="text-sm text-slate-500">No previous assessment questions found.</p>}
              </div>
              <button type="submit" disabled={!editor.canEditQuestions} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">Add Previous Questions</button>
            </form>
          </article>
          <article className="rounded-2xl border p-4">
            <h4 className="font-bold">AI Question Generator</h4>
            <p className="mt-2 text-sm text-slate-600">Automatic/random selection is not part of the current builder; use the existing AI paper workflow when appropriate.</p>
            <Link href="/teacher-dashboard/ai/question-paper" className="mt-4 inline-flex rounded-lg border border-violet-300 px-3 py-2 text-sm font-semibold text-violet-700">Open AI Question Paper</Link>
          </article>
        </div>
      </section>
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold">Manual Question</h3>
        <p className="mt-2 text-sm text-slate-600">Manual questions are saved as snapshot content using an approved anchor question from the selected chapter.</p>
        <form action={addManualQuestion} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold">Anchor Question</span>
            <select name="anchorQuestionId" className="rounded-xl border px-4 py-2" disabled={!editor.canEditQuestions}>
              <option value="">Select anchor</option>
              {[...editor.bookQuestions, ...editor.publisherQuestions].slice(0, 60).map((question) => (
                <option key={question.id} value={question.id}>{question.questionType} - {question.questionText.slice(0, 60)}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Question Type</span>
            <select name="questionType" defaultValue="SHORT_ANSWER" className="rounded-xl border px-4 py-2" disabled={!editor.canEditQuestions}>
              <option value="MCQ">MCQ</option>
              <option value="TRUE_FALSE">True/False</option>
              <option value="FILL_BLANK">Fill Blank</option>
              <option value="MATCH">Match</option>
              <option value="MULTIPLE_SELECT">Multiple Select</option>
              <option value="SHORT_ANSWER">Short Answer</option>
              <option value="LONG_ANSWER">Long Answer</option>
              <option value="CASE_BASED">Case Based</option>
              <option value="COMPETENCY">Competency</option>
              <option value="HOTS">HOTS</option>
            </select>
          </label>

          <label className="grid gap-2 sm:col-span-2">
            <span className="text-sm font-semibold">Question Text</span>
            <textarea name="questionText" rows={3} className="rounded-xl border px-4 py-2" disabled={!editor.canEditQuestions} />
          </label>

          <label className="grid gap-2 sm:col-span-2">
            <span className="text-sm font-semibold">Options (one per line; use Left =&gt; Right for MATCH)</span>
            <textarea name="options" rows={4} className="rounded-xl border px-4 py-2" disabled={!editor.canEditQuestions} />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Correct Answer</span>
            <input name="correctAnswer" className="rounded-xl border px-4 py-2" disabled={!editor.canEditQuestions} />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Marks</span>
            <input name="marks" type="number" min={1} max={100} defaultValue={1} className="rounded-xl border px-4 py-2" disabled={!editor.canEditQuestions} />
          </label>

          <label className="grid gap-2 sm:col-span-2">
            <span className="text-sm font-semibold">Explanation</span>
            <textarea name="explanation" rows={3} className="rounded-xl border px-4 py-2" disabled={!editor.canEditQuestions} />
          </label>

          <div className="sm:col-span-2">
            <button type="submit" disabled={!editor.canEditQuestions} className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50">Add Manual Question</button>
          </div>
        </form>
      </section>
    </main>
  );
}

function toLocalDateTime(value: Date | null) {
  if (!value) return "";
  const local = new Date(value);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
}
