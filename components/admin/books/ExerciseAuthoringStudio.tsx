"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { CurriculumDifficultyLevel, CurriculumExerciseType } from "@prisma/client";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";

import ContentReleasePanel from "@/components/admin/books/ContentReleasePanel";
import ExercisePreview from "@/components/content/ExercisePreview";
import type { ReleaseSummary } from "@/lib/content-release";
import {
  EXERCISE_QUESTION_TYPES,
  parseInstructionText,
  type ExerciseStudioData,
} from "@/lib/exercise-authoring-types";

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

const field =
  "mt-2 w-full rounded-[1.1rem] border border-transparent bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-200";

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
}: {
  exercises: ExerciseStudioData[];
  lookups: Lookups;
  saveExerciseAction: (data: FormData) => Promise<void>;
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
}) {
  const [activeExerciseId, setActiveExerciseId] = useState(exercises[0]?.id ?? "new");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [message, setMessage] = useState("Ready");
  const [error, setError] = useState("");
  const [showAnswers, setShowAnswers] = useState(true);
  const [isPending, startTransition] = useTransition();

  const activeExercise = exercises.find((exercise) => exercise.id === activeExerciseId) ?? null;
  const selectedQuestion =
    activeExercise?.questions.find((question) => question.id === selectedQuestionId) ?? null;

  function run(label: string, action: () => Promise<void>) {
    setMessage(label);
    setError("");
    startTransition(async () => {
      try {
        await action();
        setMessage("Saved");
      } catch (cause) {
        setMessage("Save failed");
        setError(cause instanceof Error ? cause.message : "Unable to save exercise studio changes.");
      }
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)_19rem]">
      <aside className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-950">Exercise Outline</h3>
          <button type="button" onClick={() => setActiveExerciseId("new")} className="rounded-full bg-slate-950 p-2 text-white">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {exercises.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              onClick={() => {
                setActiveExerciseId(exercise.id);
                setSelectedQuestionId(exercise.questions[0]?.id ?? null);
              }}
              className={`w-full rounded-2xl px-3 py-2 text-left text-sm font-semibold ${
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
            {activeExercise.questions.map((question, index) => (
              <button
                key={question.id}
                type="button"
                onClick={() => setSelectedQuestionId(question.id)}
                className={`w-full rounded-xl px-3 py-2 text-left text-xs font-semibold ${
                  selectedQuestionId === question.id ? "bg-blue-50 text-blue-800 ring-1 ring-blue-200" : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                Q{index + 1}. {question.questionType}
              </button>
            ))}
          </div>
        ) : null}
      </aside>

      <main className="space-y-4">
        <section className="rounded-[2rem] bg-[#fcfaf5] p-5 shadow-sm ring-1 ring-slate-200">
          <ExerciseMetadataForm
            exercise={activeExercise}
            lookups={lookups}
            disabled={isPending}
            onSubmit={(data) => run("Saving exercise...", () => saveExerciseAction(data))}
            onArchive={
              activeExercise
                ? () => run("Archiving exercise...", () => archiveExerciseAction(activeExercise.id, true))
                : undefined
            }
          />
        </section>

        {activeExercise ? (
          <>
            <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <GroupManager
                exercise={activeExercise}
                disabled={isPending}
                onSubmit={(data) => run("Saving group...", () => saveGroupAction(activeExercise.id, data))}
              />
            </section>
            <section className="space-y-4 rounded-[2rem] bg-[#fcfaf5] p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-bold text-slate-950">Question Canvas</h3>
                <button
                  type="button"
                  onClick={() => setSelectedQuestionId(null)}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                >
                  Add Question
                </button>
              </div>
              <QuestionEditor
                key={selectedQuestion?.id ?? "new"}
                exercise={activeExercise}
                question={selectedQuestion}
                lookups={lookups}
                disabled={isPending}
                onSubmit={(data) => run("Saving question...", () => saveQuestionAction(activeExercise.id, data))}
                onMove={(question, direction) => run("Moving question...", () => moveQuestionAction(activeExercise.id, question.id, direction))}
                onDuplicate={(question) => run("Duplicating question...", () => duplicateQuestionAction(activeExercise.id, question.id))}
                onArchive={(question) => run("Archiving question...", () => archiveQuestionAction(activeExercise.id, question.id, true))}
              />
            </section>
            <ExercisePreview exercise={activeExercise} showAnswers={showAnswers} />
          </>
        ) : null}
        <p className="text-sm font-semibold text-slate-500">{message}</p>
        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      </main>

      <aside className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h3 className="font-bold text-slate-950">Inspector</h3>
        <dl className="mt-4 space-y-3 text-sm text-slate-600">
          <Summary label="Exercise" value={activeExercise?.title ?? "New exercise"} />
          <Summary label="Status" value={activeExercise?.published ? "Published" : "Draft"} />
          <Summary label="Questions" value={String(activeExercise?.questions.length ?? 0)} />
          <Summary label="Selected Type" value={selectedQuestion?.questionType ?? "None"} />
          <Summary label="Marks" value={String(selectedQuestion?.marks ?? activeExercise?.marks ?? 0)} />
          <Summary label="Difficulty" value={selectedQuestion?.difficulty ?? activeExercise?.difficulty ?? "Not set"} />
          <Summary label="Bloom" value={selectedQuestion?.bloomLevel ?? "Not set"} />
          <Summary label="Competency" value={selectedQuestion?.competency ?? "Not set"} />
        </dl>
        <label className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
          <input type="checkbox" checked={showAnswers} onChange={(event) => setShowAnswers(event.target.checked)} />
          Preview answers
        </label>
        {activeExercise && releaseSummaries[activeExercise.id] && transitionReleaseAction && rollbackReleaseAction ? (
          <div className="mt-5 rounded-[1.5rem] bg-slate-50 p-3 ring-1 ring-slate-200">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Release</h4>
            <ContentReleasePanel
              summary={releaseSummaries[activeExercise.id]}
              transitionAction={transitionReleaseAction.bind(null, activeExercise.id)}
              rollbackAction={rollbackReleaseAction.bind(null, activeExercise.id)}
              previewBaseHref={previewBaseHref}
            />
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function ExerciseMetadataForm({
  exercise,
  lookups,
  disabled,
  onSubmit,
  onArchive,
}: {
  exercise: ExerciseStudioData | null;
  lookups: Lookups;
  disabled: boolean;
  onSubmit: (data: FormData) => void;
  onArchive?: () => void;
}) {
  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="id" value={exercise?.id ?? ""} />
      <div className="grid gap-3 lg:grid-cols-3">
        <Label title="Title" wide><input name="title" required defaultValue={exercise?.title ?? ""} className={field} /></Label>
        <Label title="Type"><select name="type" defaultValue={exercise?.type ?? CurriculumExerciseType.PRACTICE} className={field}>{Object.values(CurriculumExerciseType).map((value) => <option key={value}>{value}</option>)}</select></Label>
        <Label title="Difficulty"><select name="difficulty" defaultValue={exercise?.difficulty ?? ""} className={field}><option value="">Not set</option>{Object.values(CurriculumDifficultyLevel).map((value) => <option key={value}>{value}</option>)}</select></Label>
        <Label title="Module"><Select name="moduleId" value={exercise?.moduleId ?? ""} options={lookups.modules} /></Label>
        <Label title="Topic"><Select name="topicId" value={exercise?.topicId ?? ""} options={lookups.topics} /></Label>
        <Label title="Order"><input name="displayOrder" type="number" defaultValue={exercise?.displayOrder ?? 0} className={field} /></Label>
        <Label title="Marks"><input name="marks" type="number" min="0" defaultValue={exercise?.marks ?? ""} className={field} /></Label>
        <Label title="Minutes"><input name="estimatedMinutes" type="number" min="0" defaultValue={exercise?.estimatedMinutes ?? ""} className={field} /></Label>
        <Label title="Instructions" wide><textarea name="instructions" rows={5} defaultValue={exercise ? parseInstructionText(exercise.instructions) : ""} className={field} /></Label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"><input name="published" type="checkbox" defaultChecked={exercise?.published} className="mr-2" />Published</label>
        <button disabled={disabled} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Save Exercise</button>
        {onArchive ? <button type="button" onClick={onArchive} className="rounded-full border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700">Archive</button> : null}
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
          <input name="title" placeholder="Group title" defaultValue={group.title} className={field} />
          <input name="instructions" placeholder="Instructions" defaultValue={group.instructions ?? ""} className={field} />
          <input name="sortOrder" type="number" defaultValue={group.sortOrder} className={field} />
          <button disabled={disabled} className="mt-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{group.id ? "Save" : "Add"}</button>
        </form>
      ))}
    </div>
  );
}

function QuestionEditor({
  exercise,
  question,
  lookups,
  disabled,
  onSubmit,
  onMove,
  onDuplicate,
  onArchive,
}: {
  exercise: ExerciseStudioData;
  question: Question | null;
  lookups: Lookups;
  disabled: boolean;
  onSubmit: (data: FormData) => void;
  onMove: (question: Question, direction: -1 | 1) => void;
  onDuplicate: (question: Question) => void;
  onArchive: (question: Question) => void;
}) {
  const optionsText = stringifyOptions(question?.options);
  return (
    <form action={onSubmit} className="space-y-4 rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
      <input type="hidden" name="id" value={question?.id ?? ""} />
      <input type="hidden" name="displayOrder" value={question?.displayOrder ?? exercise.questions.length * 10} />
      <div className="flex flex-wrap gap-2">
        {question ? (
          <>
            <button type="button" onClick={() => onMove(question, -1)} className="rounded-full border px-3 py-1.5 text-xs font-semibold"><ArrowUp className="mr-1 inline h-3 w-3" />Move</button>
            <button type="button" onClick={() => onMove(question, 1)} className="rounded-full border px-3 py-1.5 text-xs font-semibold"><ArrowDown className="mr-1 inline h-3 w-3" />Move</button>
            <button type="button" onClick={() => onDuplicate(question)} className="rounded-full border px-3 py-1.5 text-xs font-semibold"><Copy className="mr-1 inline h-3 w-3" />Duplicate</button>
            <button type="button" onClick={() => onArchive(question)} className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"><Trash2 className="mr-1 inline h-3 w-3" />Archive</button>
          </>
        ) : null}
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <Label title="Question Type"><select name="questionType" defaultValue={question?.questionType ?? "MCQ"} className={field}>{EXERCISE_QUESTION_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Label>
        <Label title="Group"><Select name="exerciseGroupId" value={question?.exerciseGroupId ?? ""} options={exercise.questionGroups} /></Label>
        <Label title="Marks"><input name="marks" type="number" min="1" defaultValue={question?.marks ?? 1} className={field} /></Label>
        <Label title="Question" wide><textarea name="questionText" required rows={5} defaultValue={question?.questionText ?? ""} className={field} /></Label>
        <Label title="Options / Accepted Answers" wide><textarea name="options" rows={5} defaultValue={optionsText} className={field} placeholder="MCQ: one option per line. Match: left => right. Fill blank: one accepted answer per line." /></Label>
        <Label title="Correct Answer" wide><textarea name="correctAnswer" rows={2} defaultValue={question?.correctAnswer ?? ""} className={field} /></Label>
        <Label title="Explanation" wide><textarea name="explanation" rows={3} defaultValue={question?.explanation ?? ""} className={field} /></Label>
        <Label title="Difficulty"><input name="difficulty" defaultValue={question?.difficulty ?? "MEDIUM"} className={field} /></Label>
        <Label title="Bloom"><input name="bloomLevel" defaultValue={question?.bloomLevel ?? ""} className={field} /></Label>
        <Label title="Competency"><input name="competency" defaultValue={question?.competency ?? ""} className={field} /></Label>
        <Label title="Learning Outcome"><Select name="learningOutcomeId" value={question?.learningOutcomeId ?? ""} options={lookups.outcomes.map((item) => ({ id: item.id, title: item.outcome }))} /></Label>
        <Label title="Module"><Select name="moduleId" value={question?.moduleId ?? ""} options={lookups.modules} /></Label>
        <Label title="Topic"><Select name="topicId" value={question?.topicId ?? ""} options={lookups.topics} /></Label>
        <Label title="Image / Resource"><Select name="imageResourceId" value={question?.imageResourceId ?? ""} options={lookups.resources} /></Label>
        <Label title="Tags" wide><input name="tags" defaultValue={question?.tags.join(", ") ?? ""} className={field} /></Label>
      </div>
      <div className="flex items-center gap-3">
        <label className="rounded-full bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"><input name="approved" type="checkbox" defaultChecked={question?.approved} className="mr-2" />Published</label>
        <button disabled={disabled} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{question ? "Save Question" : "Add Question"}</button>
      </div>
    </form>
  );
}

function Label({ title, wide = false, children }: { title: string; wide?: boolean; children: ReactNode }) {
  return <label className={`block text-sm font-semibold text-slate-700 ${wide ? "lg:col-span-3" : ""}`}>{title}{children}</label>;
}

function Select({ name, value, options }: { name: string; value: string; options: { id: string; title?: string; label?: string; outcome?: string }[] }) {
  return (
    <select name={name} defaultValue={value} className={field}>
      <option value="">Not set</option>
      {options.map((option) => <option key={option.id} value={option.id}>{option.title ?? option.label ?? option.outcome ?? option.id}</option>)}
    </select>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd></div>;
}

function stringifyOptions(options: unknown) {
  if (!Array.isArray(options)) return "";
  return options.map((option) => {
    if (typeof option === "string") return option;
    if (isRecord(option) && "label" in option) return String(option.label ?? "");
    if (isRecord(option) && "left" in option) return `${String(option.left ?? "")} => ${String(option.right ?? "")}`;
    return JSON.stringify(option);
  }).join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
