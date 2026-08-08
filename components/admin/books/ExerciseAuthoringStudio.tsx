"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { CurriculumDifficultyLevel, CurriculumExerciseType } from "@prisma/client";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  MoreHorizontal,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from "lucide-react";

import ContentReleasePanel from "@/components/admin/books/ContentReleasePanel";
import QuestionTemplateFactory from "@/components/admin/books/QuestionTemplateFactory";
import QuestionTypeGallery from "@/components/admin/books/QuestionTypeGallery";
import ExercisePreview from "@/components/content/ExercisePreview";
import type { ReleaseSummary } from "@/lib/content-release";
import type { ExerciseStudioData } from "@/lib/exercise-authoring-types";
import {
  createDraftFromQuestion,
  fieldClass,
  questionTemplateLabel,
  type QuestionStudioDraft,
  type QuestionTemplateId,
} from "@/components/admin/books/question-studio/shared";

type Lookups = {
  modules: { id: string; title: string }[];
  topics: { id: string; title: string; moduleId: string | null }[];
  outcomes: { id: string; outcome: string; moduleId: string | null; topicId: string | null }[];
  resources: { id: string; title: string; type: string; fileUrl: string; thumbnail: string | null }[];
};

type Question = ExerciseStudioData["questions"][number];

type ReleaseAction =
  | "SUBMIT_REVIEW"
  | "RETURN_DRAFT"
  | "APPROVE"
  | "PUBLISH"
  | "UNPUBLISH"
  | "ARCHIVE"
  | "RESTORE";

export default function ExerciseAuthoringStudio({
  exercises,
  lookups,
  saveExerciseAction,
  saveGroupAction,
  saveQuestionAction,
  moveQuestionAction,
  duplicateQuestionAction,
  archiveQuestionAction,
  archiveExerciseAction,
  releaseSummaries = {},
  transitionReleaseAction,
  rollbackReleaseAction,
  previewBaseHref,
  initialExerciseId,
  onSaveComplete,
  defaultModuleId,
  defaultTopicId,
  bookTitle,
  chapterTitle,
  moduleTitle,
  topicTitle,
  currentScopeLabel,
}: {
  exercises: ExerciseStudioData[];
  lookups: Lookups;
  saveExerciseAction: (data: FormData) => Promise<string>;
  saveGroupAction: (exerciseId: string, data: FormData) => Promise<void>;
  saveQuestionAction: (exerciseId: string, data: FormData) => Promise<void>;
  moveQuestionAction: (exerciseId: string, questionId: string, direction: -1 | 1) => Promise<void>;
  duplicateQuestionAction: (exerciseId: string, questionId: string) => Promise<void>;
  archiveQuestionAction: (exerciseId: string, questionId: string, archived: boolean) => Promise<void>;
  archiveExerciseAction: (exerciseId: string, archived: boolean) => Promise<void>;
  releaseSummaries?: Record<string, ReleaseSummary>;
  transitionReleaseAction?: (exerciseId: string, action: ReleaseAction, data: FormData) => Promise<void>;
  rollbackReleaseAction?: (exerciseId: string, versionId: string, data: FormData) => Promise<void>;
  previewBaseHref?: string;
  initialExerciseId?: string;
  onSaveComplete?: (exerciseId: string) => void;
  defaultModuleId?: string | null;
  defaultTopicId?: string | null;
  bookTitle?: string;
  chapterTitle?: string;
  moduleTitle?: string | null;
  topicTitle?: string | null;
  currentScopeLabel?: string;
}) {
  const editorPanelRef = useRef<QuestionEditorHandle | null>(null);
  const [activeExerciseId, setActiveExerciseId] = useState(initialExerciseId ?? exercises[0]?.id ?? "new");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewVisible, setPreviewVisible] = useState(true);
  const [showAnswers, setShowAnswers] = useState(true);
  const [message, setMessage] = useState("Ready");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const activeExercise = exercises.find((exercise) => exercise.id === activeExerciseId) ?? null;
  const filteredQuestions = useMemo(() => {
    if (!activeExercise) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activeExercise.questions;
    return activeExercise.questions.filter((question) => {
      const text = [question.questionText, question.explanation ?? "", question.questionType].join(" ").toLowerCase();
      return text.includes(query);
    });
  }, [activeExercise, searchQuery]);

  const selectedQuestion =
    activeExercise?.questions.find((question) => question.id === selectedQuestionId) ?? null;
  const nextDisplayOrder =
    (activeExercise?.questions[activeExercise.questions.length - 1]?.displayOrder ?? -10) + 10;

  function run(label: string, action: () => Promise<void>) {
    setMessage(label);
    setError("");
    startTransition(async () => {
      try {
        await action();
        setMessage("Saved");
      } catch (cause) {
        setMessage("Save failed");
        setError(cause instanceof Error ? cause.message : "Unable to save question studio changes.");
      }
    });
  }

  function chooseTemplate(templateId: QuestionTemplateId) {
    setGalleryOpen(false);
    setSelectedQuestionId(null);
    setMessage(`${questionTemplateLabel(templateId)} template ready`);
    setError("");
  }

  function archiveCurrentQuestion() {
    if (!activeExercise || !selectedQuestion) return;
    run("Archiving question...", async () => {
      await archiveQuestionAction(activeExercise.id, selectedQuestion.id, true);
      setSelectedQuestionId(null);
    });
  }

  function duplicateCurrentQuestion() {
    if (!activeExercise || !selectedQuestion) return;
    run("Duplicating question...", () => duplicateQuestionAction(activeExercise.id, selectedQuestion.id));
  }

  function moveCurrentQuestion(direction: -1 | 1) {
    if (!activeExercise || !selectedQuestion) return;
    run("Moving question...", () => moveQuestionAction(activeExercise.id, selectedQuestion.id, direction));
  }

  return (
    <section className="flex min-h-[38rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header className="border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Question Authoring Studio</p>
            <p className="mt-1 text-sm text-slate-600">
              {activeExercise?.title ?? "New Exercise"} · {currentScopeLabel ?? "Chapter scope"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
              Draft
            </span>
            <button type="button" onClick={() => editorPanelRef.current?.save()} disabled={isPending || !activeExercise} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40">
              <Save className="mr-2 inline h-4 w-4" />
              Save
            </button>
            <button type="button" onClick={() => setPreviewVisible((current) => !current)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
              <Eye className="mr-2 inline h-4 w-4" />
              Preview
            </button>
            <button type="button" onClick={archiveCurrentQuestion} disabled={!selectedQuestion || isPending} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-40">
              <Trash2 className="mr-2 inline h-4 w-4" />
              Delete
            </button>
            <button type="button" onClick={() => editorPanelRef.current?.undo()} disabled={!activeExercise} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40">
              <RotateCcw className="mr-2 inline h-4 w-4" />
              Undo
            </button>
            <button type="button" onClick={() => editorPanelRef.current?.redo()} disabled={!activeExercise} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40">
              <Redo2 className="mr-2 inline h-4 w-4" />
              Redo
            </button>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
              <Search className="h-4 w-4" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search"
                className="w-28 border-none bg-transparent outline-none"
              />
            </label>
            <button type="button" onClick={() => setGalleryOpen(true)} disabled={!activeExercise} className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">
              <Plus className="mr-2 inline h-4 w-4" />
              Add Question
            </button>
            <button type="button" onClick={() => setMoreOpen((current) => !current)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
              <MoreHorizontal className="mr-2 inline h-4 w-4" />
              More
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden bg-[#f7f4ed]">
        <aside className="hidden w-[280px] shrink-0 border-r border-slate-200 bg-white lg:block">
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Question List</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {exercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => {
                      setActiveExerciseId(exercise.id);
                      setSelectedQuestionId(exercise.questions[0]?.id ?? null);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                      activeExerciseId === exercise.id ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-700"
                    }`}
                  >
                    {exercise.title}
                    <span className="mt-1 block text-xs opacity-70">{exercise.questions.length} questions</span>
                  </button>
                ))}
              </div>

              {activeExercise ? (
                <div className="mt-5 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Questions</p>
                  {filteredQuestions.map((question, index) => (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => setSelectedQuestionId(question.id)}
                      className={`w-full rounded-xl px-3 py-2 text-left text-xs font-semibold ${
                        selectedQuestionId === question.id ? "bg-blue-50 text-blue-800 ring-1 ring-blue-200" : "bg-white text-slate-600 ring-1 ring-slate-200"
                      }`}
                    >
                      Q{index + 1}. {questionTemplateLabel(createDraftFromQuestion(question, question.displayOrder).templateId)}
                    </button>
                  ))}
                  {!filteredQuestions.length ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
                      No matching questions in this exercise.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-3">
          <div className="mx-auto max-w-[980px] space-y-4">
            {activeExercise ? (
              <>
                <section className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                  <ExerciseMetadataForm
                    exercise={activeExercise}
                    lookups={lookups}
                    defaultModuleId={defaultModuleId ?? null}
                    defaultTopicId={defaultTopicId ?? null}
                    disabled={isPending}
                    onSubmit={(data) =>
                      run("Saving exercise...", async () => {
                        const exerciseId = await saveExerciseAction(data);
                        setActiveExerciseId(exerciseId);
                        onSaveComplete?.(exerciseId);
                      })
                    }
                    onArchive={() => run("Archiving exercise...", () => archiveExerciseAction(activeExercise.id, true))}
                  />
                </section>

                <section className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                  <GroupManager
                    exercise={activeExercise}
                    disabled={isPending}
                    onSubmit={(data) => run("Saving group...", () => saveGroupAction(activeExercise.id, data))}
                  />
                </section>

                <section className="space-y-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
                  <QuestionEditorPanel
                    key={`${activeExercise.id}:${selectedQuestion?.id ?? `new:${nextDisplayOrder}`}`}
                    ref={editorPanelRef}
                    activeExercise={activeExercise}
                    draftSeed={createDraftFromQuestion(selectedQuestion ?? null, nextDisplayOrder)}
                    isPending={isPending}
                    lookups={lookups}
                    onRun={run}
                    questionGroups={activeExercise.questionGroups}
                    saveQuestionAction={saveQuestionAction}
                    selectedQuestion={selectedQuestion}
                  />
                </section>

                {previewVisible ? (
                  <section className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-bold text-slate-950">Exercise Preview</h3>
                      <label className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                        <input type="checkbox" checked={showAnswers} onChange={(event) => setShowAnswers(event.target.checked)} className="mr-2" />
                        Preview answers
                      </label>
                    </div>
                    <ExercisePreview exercise={activeExercise} showAnswers={showAnswers} />
                  </section>
                ) : null}
              </>
            ) : (
              <section className="rounded-xl bg-white p-4 text-center ring-1 ring-slate-200">
                <h2 className="text-lg font-semibold text-slate-950">Create an exercise first</h2>
                <p className="mt-2 text-sm text-slate-500">Question templates appear after an exercise has been created in this chapter scope.</p>
              </section>
            )}

            <footer className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              <span>{[bookTitle, chapterTitle, moduleTitle, topicTitle].filter(Boolean).join(" / ") || currentScopeLabel || "Question studio"}</span>
              <span>{message}</span>
            </footer>
            {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
          </div>
        </main>
      </div>

      <QuestionTypeGallery open={galleryOpen} onClose={() => setGalleryOpen(false)} onChoose={chooseTemplate} />
      {moreOpen && activeExercise ? (
        <QuestionMorePanel
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          activeExercise={activeExercise}
          selectedQuestion={selectedQuestion}
          onDuplicate={duplicateCurrentQuestion}
          onMoveUp={() => moveCurrentQuestion(-1)}
          onMoveDown={() => moveCurrentQuestion(1)}
          releaseSummary={releaseSummaries[activeExercise.id]}
          transitionReleaseAction={transitionReleaseAction ? transitionReleaseAction.bind(null, activeExercise.id) : undefined}
          rollbackReleaseAction={rollbackReleaseAction ? rollbackReleaseAction.bind(null, activeExercise.id) : undefined}
          previewBaseHref={previewBaseHref}
        />
      ) : null}
    </section>
  );
}

function ExerciseMetadataForm({
  exercise,
  lookups,
  defaultModuleId,
  defaultTopicId,
  disabled,
  onSubmit,
  onArchive,
}: {
  exercise: ExerciseStudioData | null;
  lookups: Lookups;
  defaultModuleId: string | null;
  defaultTopicId: string | null;
  disabled: boolean;
  onSubmit: (data: FormData) => void;
  onArchive?: () => void;
}) {
  return (
    <form
      action={async (formData) => {
        onSubmit(formData);
      }}
      className="space-y-4"
    >
      <input type="hidden" name="id" value={exercise?.id ?? ""} />
      <div className="grid gap-3 lg:grid-cols-3">
        <Label title="Title" wide><input name="title" required defaultValue={exercise?.title ?? ""} className={fieldClass()} /></Label>
        <Label title="Type"><select name="type" defaultValue={exercise?.type ?? CurriculumExerciseType.PRACTICE} className={fieldClass()}>{Object.values(CurriculumExerciseType).map((value) => <option key={value}>{value}</option>)}</select></Label>
        <Label title="Difficulty"><select name="difficulty" defaultValue={exercise?.difficulty ?? ""} className={fieldClass()}><option value="">Not set</option>{Object.values(CurriculumDifficultyLevel).map((value) => <option key={value}>{value}</option>)}</select></Label>
        <Label title="Module"><Select name="moduleId" value={exercise?.moduleId ?? defaultModuleId ?? ""} options={lookups.modules} /></Label>
        <Label title="Topic"><Select name="topicId" value={exercise?.topicId ?? defaultTopicId ?? ""} options={lookups.topics} /></Label>
        <Label title="Order"><input name="displayOrder" type="number" defaultValue={exercise?.displayOrder ?? 0} className={fieldClass()} /></Label>
        <Label title="Marks"><input name="marks" type="number" min="0" defaultValue={exercise?.marks ?? ""} className={fieldClass()} /></Label>
        <Label title="Minutes"><input name="estimatedMinutes" type="number" min="0" defaultValue={exercise?.estimatedMinutes ?? ""} className={fieldClass()} /></Label>
        <Label title="Instructions" wide><textarea name="instructions" rows={4} defaultValue={parseInstructionText(exercise?.instructions ?? null)} className={fieldClass()} /></Label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200"><input name="published" type="checkbox" defaultChecked={exercise?.published} className="mr-2" />Published</label>
        <button disabled={disabled} className="rounded-lg bg-slate-950 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Save Exercise</button>
        {onArchive ? <button type="button" onClick={onArchive} className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700">Archive</button> : null}
      </div>
    </form>
  );
}

function GroupManager({ exercise, disabled, onSubmit }: { exercise: ExerciseStudioData; disabled: boolean; onSubmit: (data: FormData) => void }) {
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-slate-950">Question Groups</h3>
      {[{ id: "", title: "", instructions: "", sortOrder: exercise.questionGroups.length * 10 }, ...exercise.questionGroups].map((group) => (
        <form key={group.id || "new"} action={onSubmit} className="grid gap-2 lg:grid-cols-[1fr_1fr_5rem_auto]">
          <input type="hidden" name="id" value={group.id} />
          <input name="title" placeholder="Group title" defaultValue={group.title} className={fieldClass()} />
          <input name="instructions" placeholder="Instructions" defaultValue={group.instructions ?? ""} className={fieldClass()} />
          <input name="sortOrder" type="number" defaultValue={group.sortOrder} className={fieldClass()} />
          <button disabled={disabled} className="mt-2 rounded-lg bg-slate-950 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">{group.id ? "Save" : "Add"}</button>
        </form>
      ))}
    </div>
  );
}

function QuestionMorePanel({
  open,
  onClose,
  activeExercise,
  selectedQuestion,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  releaseSummary,
  transitionReleaseAction,
  rollbackReleaseAction,
  previewBaseHref,
}: {
  open: boolean;
  onClose: () => void;
  activeExercise: ExerciseStudioData;
  selectedQuestion: Question | null;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  releaseSummary?: ReleaseSummary;
  transitionReleaseAction?: (action: ReleaseAction, data: FormData) => Promise<void>;
  rollbackReleaseAction?: (versionId: string, data: FormData) => Promise<void>;
  previewBaseHref?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/30 backdrop-blur-sm">
      <button type="button" aria-label="Close more panel" className="absolute inset-0" onClick={onClose} />
      <section className="relative z-10 h-full w-full max-w-[26rem] overflow-y-auto bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">More</p>
            <h3 className="mt-1 text-lg font-bold text-slate-950">Question Actions</h3>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700">Close</button>
        </div>
        <div className="mt-5 space-y-3">
          <button type="button" onClick={onDuplicate} disabled={!selectedQuestion} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 disabled:opacity-40"><Copy className="mr-2 inline h-4 w-4" />Duplicate Question</button>
          <button type="button" onClick={onMoveUp} disabled={!selectedQuestion} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 disabled:opacity-40"><ArrowUp className="mr-2 inline h-4 w-4" />Move Up</button>
          <button type="button" onClick={onMoveDown} disabled={!selectedQuestion} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 disabled:opacity-40"><ArrowDown className="mr-2 inline h-4 w-4" />Move Down</button>
        </div>
        {releaseSummary && transitionReleaseAction && rollbackReleaseAction ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <ContentReleasePanel
              summary={releaseSummary}
              transitionAction={transitionReleaseAction}
              rollbackAction={rollbackReleaseAction}
              previewBaseHref={previewBaseHref}
            />
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            Release controls are not available for this exercise yet.
          </div>
        )}
        <div className="mt-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-slate-900">Current exercise</p>
          <p className="mt-1 text-sm text-slate-600">{activeExercise.title}</p>
        </div>
      </section>
    </div>
  );
}

type QuestionEditorHandle = {
  save: () => void;
  undo: () => void;
  redo: () => void;
};

const QuestionEditorPanel = forwardRef<QuestionEditorHandle, {
  activeExercise: ExerciseStudioData;
  draftSeed: QuestionStudioDraft;
  isPending: boolean;
  lookups: Lookups;
  onRun: (label: string, action: () => Promise<void>) => void;
  questionGroups: { id: string; title: string }[];
  saveQuestionAction: (exerciseId: string, data: FormData) => Promise<void>;
  selectedQuestion: Question | null;
}>(
function QuestionEditorPanel({
  activeExercise,
  draftSeed,
  isPending,
  lookups,
  onRun,
  questionGroups,
  saveQuestionAction,
  selectedQuestion,
}, ref) {
  const [draft, setDraft] = useState<QuestionStudioDraft>(draftSeed);
  const [history, setHistory] = useState<QuestionStudioDraft[]>([]);
  const [future, setFuture] = useState<QuestionStudioDraft[]>([]);

  function updateDraft(patch: Partial<QuestionStudioDraft>) {
    setHistory((current) => [...current.slice(-49), draft]);
    setFuture([]);
    setDraft((current) => ({ ...current, ...patch }));
  }

  function undoDraft() {
    setHistory((current) => {
      if (!current.length) return current;
      const previous = current[current.length - 1];
      setFuture((futureCurrent) => [draft, ...futureCurrent].slice(0, 50));
      setDraft(previous);
      return current.slice(0, -1);
    });
  }

  function redoDraft() {
    setFuture((current) => {
      if (!current.length) return current;
      const [next, ...rest] = current;
      setHistory((historyCurrent) => [...historyCurrent.slice(-49), draft]);
      setDraft(next);
      return rest;
    });
  }

  function saveCurrentQuestion() {
    onRun("Saving question...", async () => {
      const data = buildQuestionFormData(draft);
      await saveQuestionAction(activeExercise.id, data);
    });
  }

  useImperativeHandle(ref, () => ({
    save: saveCurrentQuestion,
    undo: undoDraft,
    redo: redoDraft,
  }));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Current Template</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">{questionTemplateLabel(draft.templateId)}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {draft.questionType}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {draft.marks || "1"} marks
          </span>
          <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
            {history.length} undo / {future.length} redo
          </span>
        </div>
      </div>

      <QuestionTemplateFactory
        draft={draft}
        lookups={lookups}
        questionGroups={questionGroups}
        onChange={updateDraft}
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
          <input
            type="checkbox"
            checked={draft.approved}
            onChange={(event) => updateDraft({ approved: event.target.checked })}
            className="mr-2"
          />
          Published
        </label>
        <button type="button" onClick={saveCurrentQuestion} disabled={isPending} className="rounded-lg bg-slate-950 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {selectedQuestion ? "Save Question" : "Add Question"}
        </button>
      </div>
    </>
  );
});

function Label({ title, wide = false, children }: { title: string; wide?: boolean; children: ReactNode }) {
  return <label className={`block text-sm font-semibold text-slate-700 ${wide ? "lg:col-span-3" : ""}`}>{title}{children}</label>;
}

function Select({ name, value, options }: { name: string; value: string; options: { id: string; title?: string }[] }) {
  return (
    <select name={name} defaultValue={value} className={fieldClass()}>
      <option value="">Not set</option>
      {options.map((option) => <option key={option.id} value={option.id}>{option.title ?? option.id}</option>)}
    </select>
  );
}

function buildQuestionFormData(draft: QuestionStudioDraft) {
  const form = new FormData();
  if (draft.id) form.set("id", draft.id);
  form.set("displayOrder", String(draft.displayOrder));
  form.set("questionType", draft.questionType);
  form.set("exerciseGroupId", draft.exerciseGroupId);
  form.set("moduleId", draft.moduleId);
  form.set("topicId", draft.topicId);
  form.set("learningOutcomeId", draft.learningOutcomeId);
  form.set("imageResourceId", draft.imageResourceId);
  form.set("marks", draft.marks || "1");
  form.set("difficulty", draft.difficulty || "MEDIUM");
  form.set("bloomLevel", draft.bloomLevel);
  form.set("competency", draft.competency);
  form.set("approved", draft.approved ? "on" : "");
  form.set("tags", serializeTags(draft));

  const payload = serializeQuestionPayload(draft);
  form.set("questionText", payload.questionText);
  form.set("options", payload.options);
  form.set("correctAnswer", payload.correctAnswer);
  form.set("explanation", payload.explanation);
  return form;
}

function serializeQuestionPayload(draft: QuestionStudioDraft) {
  switch (draft.templateId) {
    case "MCQ": {
      const options = draft.mcqOptions.map((item) => item.trim()).filter(Boolean);
      return {
        questionText: draft.questionText,
        options: options.join("\n"),
        correctAnswer: options[draft.mcqCorrectIndex] ?? options[0] ?? "",
        explanation: draft.explanation,
      };
    }
    case "FILL_BLANK": {
      const accepted = draft.acceptedAnswers.map((item) => item.trim()).filter(Boolean);
      return {
        questionText: draft.questionText,
        options: accepted.join("\n"),
        correctAnswer: accepted[0] ?? "",
        explanation: draft.explanation,
      };
    }
    case "TRUE_FALSE":
      return {
        questionText: draft.questionText,
        options: "",
        correctAnswer: draft.trueFalseAnswer,
        explanation: draft.explanation,
      };
    case "MATCH": {
      const pairs = draft.matchPairs
        .map((item) => ({ left: item.left.trim(), right: item.right.trim() }))
        .filter((item) => item.left && item.right);
      return {
        questionText: draft.matchInstructions,
        options: pairs.map((item) => `${item.left} => ${item.right}`).join("\n"),
        correctAnswer: JSON.stringify(Object.fromEntries(pairs.map((item) => [item.left, item.right]))),
        explanation: draft.explanation,
      };
    }
    case "ONE_WORD": {
      const alternatives = [draft.oneWordAnswer, ...draft.oneWordAlternatives].map((item) => item.trim()).filter(Boolean);
      return {
        questionText: draft.questionText,
        options: [...new Set(alternatives)].join("\n"),
        correctAnswer: draft.oneWordAnswer.trim(),
        explanation: draft.explanation,
      };
    }
    case "VERY_SHORT":
      return {
        questionText: draft.questionText,
        options: "",
        correctAnswer: draft.veryShortAnswer.trim(),
        explanation: composeSections({ "Key Points": draft.veryShortKeyPoints }),
      };
    case "SHORT":
      return {
        questionText: draft.questionText,
        options: "",
        correctAnswer: draft.shortExpectedAnswer.trim(),
        explanation: composeSections({
          "Model Answer": draft.shortModelAnswer,
          "Marking Guidelines": draft.shortGuidelines,
        }),
      };
    case "LONG":
      return {
        questionText: draft.questionText,
        options: draft.longKeywords.map((item) => item.trim()).filter(Boolean).join("\n"),
        correctAnswer: draft.longModelAnswer.trim(),
        explanation: composeSections({ "Marking Rubric": draft.longRubric }),
      };
    case "PICTURE_BASED":
      return {
        questionText: draft.questionText,
        options: "",
        correctAnswer: draft.pictureAnswer.trim(),
        explanation: composeSections({
          Instruction: draft.pictureInstruction,
          Explanation: draft.explanation,
        }),
      };
    case "DIAGRAM":
      return {
        questionText: draft.questionText,
        options: draft.diagramLabels.map((item) => item.trim()).filter(Boolean).join("\n"),
        correctAnswer: "",
        explanation: draft.explanation,
      };
    case "ASSERTION_REASON":
      return {
        questionText: draft.assertionText.trim(),
        options: "",
        correctAnswer: draft.assertionOption,
        explanation: composeSections({
          Assertion: draft.assertionText,
          Reason: draft.assertionReason,
          Explanation: draft.explanation,
        }),
      };
    case "CASE_STUDY":
      return {
        questionText: draft.caseStudyPassage.trim(),
        options: draft.caseStudyQuestions
          .map((item) => `${item.type}::${item.prompt.trim()}`)
          .filter((item) => item.split("::")[1])
          .join("\n"),
        correctAnswer: "",
        explanation: composeSections({
          "Case Study Title": draft.caseStudyTitle,
          "Case Study Passage": draft.caseStudyPassage,
          Explanation: draft.explanation,
        }),
      };
    case "COMPETENCY":
      return {
        questionText: draft.questionText.trim(),
        options: "",
        correctAnswer: draft.competencyModelAnswer.trim(),
        explanation: composeSections({
          Scenario: draft.competencyScenario,
          "Expected Competency": draft.competencyExpected,
          Rubric: draft.competencyRubric,
        }),
      };
    case "HOTS":
      return {
        questionText: draft.questionText.trim(),
        options: "",
        correctAnswer: draft.hotsModelAnswer.trim(),
        explanation: composeSections({
          "Expected Thinking Skill": draft.hotsSkill,
          Rubric: draft.hotsRubric,
        }),
      };
    case "PRACTICAL":
      return {
        questionText: draft.practicalAssessment.trim(),
        options: "",
        correctAnswer: draft.practicalConclusion.trim(),
        explanation: composeSections({
          Aim: draft.practicalAim,
          "Materials Required": draft.practicalMaterials,
          Procedure: draft.practicalProcedure,
          Observation: draft.practicalObservation,
          Conclusion: draft.practicalConclusion,
          "Assessment Questions": draft.practicalAssessment,
        }),
      };
    case "PROJECT":
      return {
        questionText: draft.projectTitle.trim(),
        options: "",
        correctAnswer: "",
        explanation: composeSections({
          Objective: draft.projectObjective,
          Instructions: draft.projectInstructions,
          "Submission Guidelines": draft.projectSubmission,
          Rubric: draft.projectRubric,
        }),
      };
  }
}

function serializeTags(draft: QuestionStudioDraft) {
  const tags = draft.tags.split(",").map((item) => item.trim()).filter(Boolean);
  const templateTag = `template:${draft.templateId}`;
  return [...new Set([templateTag, ...tags])].join(", ");
}

function composeSections(sections: Record<string, string>) {
  return Object.entries(sections)
    .map(([label, value]) => value.trim() ? `${label}:\n${value.trim()}` : "")
    .filter(Boolean)
    .join("\n\n");
}

function parseInstructionText(value: ExerciseStudioData["instructions"]) {
  if (value && typeof value === "object" && !Array.isArray(value) && "text" in value) {
    return String(value.text ?? "");
  }
  return "";
}
