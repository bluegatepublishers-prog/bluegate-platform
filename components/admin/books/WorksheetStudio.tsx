"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Copy, FileText, Plus, Save, Trash2 } from "lucide-react";

import ContentReleasePanel from "@/components/admin/books/ContentReleasePanel";
import WorksheetQuestionManager from "@/components/admin/books/WorksheetQuestionManager";
import StudioWorkspaceShell from "@/components/admin/books/StudioWorkspaceShell";
import { compactField } from "@/components/admin/books/compact-studio-styles";
import type { ReleaseSummary } from "@/lib/content-release";
import {
  WORKSHEET_AUDIENCES,
  WORKSHEET_DIFFICULTIES,
  WORKSHEET_TYPES,
  type WorksheetStudioRecord,
  worksheetTypeLabel,
} from "@/lib/worksheet-studio-types";

type Lookup = {
  modules: { id: string; title: string }[];
  topics: { id: string; title: string; moduleId: string | null }[];
  exercises: { id: string; title: string; published: boolean; marks: number | null; _count: { questions: number } }[];
  resources: { id: string; title: string; type: string; audience: string; published: boolean }[];
};

type ReleaseAction =
  | "SUBMIT_REVIEW"
  | "RETURN_DRAFT"
  | "APPROVE"
  | "PUBLISH"
  | "UNPUBLISH"
  | "ARCHIVE"
  | "RESTORE";

const field = compactField;
const plainArea = "w-full resize-none border-none bg-transparent text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-300";

export default function WorksheetStudio({
  chapterId,
  bookId,
  worksheets,
  lookups,
  saveAction,
  duplicateAction,
  archiveAction,
  moveAction,
  createExerciseAction,
  releaseSummaries = {},
  transitionReleaseAction,
  rollbackReleaseAction,
  previewBaseHref,
  initialSelectedId,
  initialPreview = false,
  onSaveComplete,
  defaultModuleId,
  defaultTopicId,
  bookTitle,
  chapterTitle,
  moduleTitle,
  topicTitle,
  currentScopeLabel,
}: {
  chapterId: string;
  bookId: string;
  worksheets: WorksheetStudioRecord[];
  lookups: Lookup;
  saveAction: (data: FormData) => Promise<string>;
  duplicateAction: (worksheetId: string) => Promise<void>;
  archiveAction: (worksheetId: string) => Promise<void>;
  moveAction: (worksheetId: string, direction: -1 | 1) => Promise<void>;
  createExerciseAction: (data: FormData) => Promise<string>;
  releaseSummaries?: Record<string, ReleaseSummary>;
  transitionReleaseAction?: (worksheetId: string, action: ReleaseAction, data: FormData) => Promise<void>;
  rollbackReleaseAction?: (worksheetId: string, versionId: string, data: FormData) => Promise<void>;
  previewBaseHref?: string;
  initialSelectedId?: string;
  initialPreview?: boolean;
  onSaveComplete?: (worksheetId: string) => void;
  defaultModuleId?: string | null;
  defaultTopicId?: string | null;
  bookTitle?: string;
  chapterTitle?: string;
  moduleTitle?: string | null;
  topicTitle?: string | null;
  currentScopeLabel?: string;
}) {
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? worksheets[0]?.id ?? "new");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const selected = worksheets.find((worksheet) => worksheet.id === selectedId) ?? null;
  const draft = selected ?? createDraft(chapterId, worksheets.length, defaultModuleId ?? null, defaultTopicId ?? null);
  const formId = `worksheet-form-${draft.id}`;
  const printableResources = lookups.resources.filter((resource) => resource.type !== "ANSWER_KEY");
  const answerKeys = lookups.resources.filter((resource) => resource.type === "ANSWER_KEY");

  function submit(formData: FormData) {
    setMessage("Saving worksheet...");
    setError("");
    startTransition(async () => {
      try {
        const worksheetId = await saveAction(formData);
        setSelectedId(worksheetId);
        setMessage("Worksheet saved");
        onSaveComplete?.(worksheetId);
      } catch (cause) {
        setMessage("");
        setError(cause instanceof Error ? cause.message : "Unable to save worksheet.");
      }
    });
  }

  function openAdvancedSettings() {
    const advanced = document.getElementById("worksheet-advanced");
    if (!advanced) return;
    advanced.setAttribute("open", "");
    if (advanced.getBoundingClientRect().width > 0) return;
    advanced.closest("section")?.querySelector<HTMLButtonElement>('button[aria-label="Show inspector"], button[aria-label="Hide inspector"]')?.click();
  }
  const outline = (
    <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Worksheet Outline</p>
            <p className="mt-1 text-sm text-slate-500">{worksheets.length} reusable records</p>
          </div>
          <Plus className="h-5 w-5 text-slate-400" />
        </div>
        <div className="mt-3 space-y-2">
          <button type="button" onClick={() => setSelectedId("new")} className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${selected ? "bg-white text-slate-700 ring-1 ring-slate-200" : "bg-slate-950 text-white"}`}>
            New Worksheet
          </button>
          {worksheets.map((worksheet) => (
            <button key={worksheet.id} type="button" onClick={() => setSelectedId(worksheet.id)} className={`w-full rounded-lg px-3 py-2 text-left text-slate-700 ring-1 ring-slate-200 ${selectedId === worksheet.id ? "bg-slate-950 text-white" : "bg-white"}`}>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{worksheetTypeLabel(worksheet.type)}</p>
              <h3 className="mt-1 truncate text-sm font-bold">{worksheet.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{worksheet.published ? "Published" : "Draft"} - {worksheet.audience}</p>
            </button>
          ))}
        </div>
    </div>
  );

  const canvas = (
      <form id={formId} key={draft.id} action={submit} className="min-w-0 space-y-4">
        <input type="hidden" name="id" value={selected?.id ?? ""} />
        <input type="hidden" name="sortOrder" value={draft.sortOrder} />
        <div className="mx-auto max-w-3xl rounded-xl bg-[#fffdf7] p-4 ring-1 ring-slate-200">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-blue-800">
            <FileText className="h-4 w-4" />
            Worksheet
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-500">Chapter: {chapterTitle ?? "Current chapter"}</p>
          <label className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Title
            <input name="title" required defaultValue={draft.title} placeholder="Worksheet title" className="mt-2 h-10 w-full border-none bg-transparent text-lg font-semibold tracking-tight text-slate-950 outline-none placeholder:text-slate-300" />
          </label>
          <section className="mt-5 border-t border-slate-200 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Instructions</h3>
            <textarea name="instructions" defaultValue={draft.instructions ?? ""} rows={8} className={`${plainArea} mt-3`} placeholder="Write worksheet instructions naturally." />
          </section>
          <p className="mt-4 text-sm font-semibold text-slate-500">Add questions below. Question count and marks are calculated from the saved worksheet items.</p>
        </div>
        {selected ? <WorksheetQuestionManager bookId={bookId} worksheetId={selected.id} worksheetTitle={selected.title} instructions={selected.instructions} bookTitle={bookTitle} chapterTitle={chapterTitle} openPreviewInitially={initialPreview} /> : null}
        <button disabled={isPending} type="submit" className="mx-auto flex h-9 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white disabled:opacity-60">
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "Saving..." : "Save worksheet"}
        </button>
        {message ? <p className="mx-auto max-w-3xl text-sm font-semibold text-slate-500">{message}</p> : null}
        {error ? <p className="mx-auto max-w-3xl rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
      </form>
  );

  const inspector = (
      <details id="worksheet-advanced" className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <summary className="cursor-pointer text-sm font-bold text-slate-800">Advanced settings</summary>
        <div className="mt-3">
          <Inspector title="Scope">
          <Summary label="Book" value={bookTitle ?? "Current book"} />
          <Summary label="Chapter" value={chapterTitle ?? "Current chapter"} />
          <Summary label="Module" value={moduleTitle ?? "Chapter level"} />
          <Summary label="Topic" value={topicTitle ?? "Not narrowed"} />
          <Summary label="Current Scope" value={currentScopeLabel ?? "Chapter scope"} />
          <Summary label="Audience" value={draft.audience} />
          <Summary label="Publication" value={draft.published ? "Published" : "Draft"} />
          <Summary label="Where Used" value={selected ? "Current content scope" : "New record"} />
        </Inspector>
        <Inspector title="Properties">
          <label className="block text-sm font-semibold text-slate-700">Slug<input form={formId} name="slug" defaultValue={draft.slug} placeholder="worksheet-slug" className={field} /></label>
          <label className="block text-sm font-semibold text-slate-700">Type<select form={formId} name="type" defaultValue={draft.type} className={field}>{WORKSHEET_TYPES.map((type) => <option key={type} value={type}>{worksheetTypeLabel(type)}</option>)}</select></label>
          <label className="block text-sm font-semibold text-slate-700">Module<select form={formId} name="moduleId" defaultValue={draft.moduleId ?? ""} className={field}><option value="">Whole chapter</option>{lookups.modules.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="block text-sm font-semibold text-slate-700">Topic<select form={formId} name="topicId" defaultValue={draft.topicId ?? ""} className={field}><option value="">No topic</option>{lookups.topics.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        </Inspector>
        <Inspector title="Legacy Exercise Link">
          <label className="block text-sm font-semibold text-slate-700">Legacy linked BookExercise<select form={formId} name="exerciseId" defaultValue={draft.exerciseId ?? ""} className={field}><option value="">No exercise</option>{lookups.exercises.map((item) => <option key={item.id} value={item.id}>{item.title} ({item._count.questions} questions)</option>)}</select></label>
          <form
            action={async (formData) => {
              await createExerciseAction(formData);
            }}
            className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200"
          >
            <input type="hidden" name="title" value={draft.title || "Worksheet Exercise"} />
            <input type="hidden" name="moduleId" value={draft.moduleId ?? ""} />
            <input type="hidden" name="topicId" value={draft.topicId ?? ""} />
            <button className="text-sm font-bold text-blue-700">Create new BookExercise</button>
          </form>
          <label className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"><input form={formId} name="allowOnlineAttempt" type="checkbox" defaultChecked={draft.allowOnlineAttempt} />Allow online attempt</label>
          {draft.exerciseId ? <Link href={`?selected=FOLDER:${chapterId}:exercises`} className="text-sm font-bold text-blue-700">Open Exercise Studio</Link> : null}
        </Inspector>
        <Inspector title="Printable">
          <label className="block text-sm font-semibold text-slate-700">Printable Resource<select form={formId} name="printableResourceId" defaultValue={draft.printableResourceId ?? ""} className={field}><option value="">None</option>{printableResources.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="block text-sm font-semibold text-slate-700">Answer Key<select form={formId} name="answerKeyResourceId" defaultValue={draft.answerKeyResourceId ?? ""} className={field}><option value="">None</option>{answerKeys.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <div className="space-y-2 rounded-[1.25rem] bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Supporting Resources</p>
            {lookups.resources.slice(0, 40).map((resource) => (
              <label key={resource.id} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                <input form={formId} name="supportingResourceIds" type="checkbox" value={resource.id} defaultChecked={draft.supportingResourceIds.includes(resource.id)} className="mt-0.5" />
                <span>{resource.title} <span className="text-slate-400">({resource.type}{resource.published ? "" : ", draft"})</span></span>
              </label>
            ))}
          </div>
          <label className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"><input form={formId} name="allowPrint" type="checkbox" defaultChecked={draft.allowPrint} />Allow print/download</label>
        </Inspector>
        <Inspector title="Publishing">
          <label className="block text-sm font-semibold text-slate-700">Minutes<input form={formId} name="estimatedMinutes" type="number" min="1" defaultValue={draft.estimatedMinutes ?? ""} className={field} /></label>
          <label className="block text-sm font-semibold text-slate-700">Marks<input form={formId} name="totalMarks" type="number" min="1" defaultValue={draft.totalMarks ?? ""} className={field} /></label>
          <label className="block text-sm font-semibold text-slate-700">Difficulty<select form={formId} name="difficulty" defaultValue={draft.difficulty ?? ""} className={field}><option value="">Not set</option>{WORKSHEET_DIFFICULTIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="block text-sm font-semibold text-slate-700">Audience<select form={formId} name="audience" defaultValue={draft.audience} className={field}>{WORKSHEET_AUDIENCES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"><input form={formId} name="showAnswersAfterSubmit" type="checkbox" defaultChecked={draft.showAnswersAfterSubmit} />Show answers after submit</label>
          <label className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"><input form={formId} name="active" type="checkbox" defaultChecked={draft.active} />Active</label>
          <label className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"><input form={formId} name="published" type="checkbox" defaultChecked={draft.published} />Published</label>
        </Inspector>
        {selected && releaseSummaries[selected.id] && transitionReleaseAction && rollbackReleaseAction ? (
          <Inspector title="Release">
            <ContentReleasePanel
              summary={releaseSummaries[selected.id]}
              transitionAction={transitionReleaseAction.bind(null, selected.id)}
              rollbackAction={rollbackReleaseAction.bind(null, selected.id)}
              previewBaseHref={previewBaseHref}
            />
          </Inspector>
        ) : null}
        {selected ? <Inspector title="Lifecycle"><Action action={moveAction.bind(null, selected.id, -1)} label="Move up" icon={<ArrowUp className="h-4 w-4" />} /><Action action={moveAction.bind(null, selected.id, 1)} label="Move down" icon={<ArrowDown className="h-4 w-4" />} /><Action action={duplicateAction.bind(null, selected.id)} label="Duplicate" icon={<Copy className="h-4 w-4" />} /><Action action={archiveAction.bind(null, selected.id)} label="Archive" icon={<Trash2 className="h-4 w-4" />} danger /></Inspector> : null}
        </div>
      </details>
  );

  return (
    <StudioWorkspaceShell
      storageKey={`bluegate:worksheet-studio:${chapterId}`}
      title="Worksheet Studio"
      leftLabel="Outline"
      leftTitle="Worksheet Outline"
      left={outline}
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <button form={formId} disabled={isPending} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
            <Save className="h-4 w-4" />
            {isPending ? "Saving..." : "Save"}
          </button>
          {selected ? (
            <button type="button" onClick={openAdvancedSettings} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              Publish
            </button>
          ) : null}
          {selected && previewBaseHref ? (
            <Link href={`${previewBaseHref}/${selected.id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              Preview
            </Link>
          ) : null}
          <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            {worksheetTypeLabel(draft.type)}
          </span>
          <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            {draft.published ? "Published" : "Draft"}
          </span>
        </div>
      }
      canvas={canvas}
      statusBar={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>{currentScopeLabel ?? "Chapter scope"}</span>
          <span>{message || (error ? "Error" : "Ready")}</span>
        </div>
      }
      rightLabel="Inspector"
      rightTitle="Worksheet Inspector"
      right={inspector}
    />
  );
}

function Inspector({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mb-3 space-y-3 rounded-xl bg-white p-3 ring-1 ring-slate-200"><h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{title}</h3>{children}</section>;
}

function Action({ action, label, icon, danger = false }: { action: () => Promise<void>; label: string; icon: ReactNode; danger?: boolean }) {
  return <form action={action} className="mb-2"><button className={`inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium ${danger ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200" : "bg-slate-50 text-slate-700 ring-1 ring-slate-200"}`}>{icon}{label}</button></form>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-700">{value}</p></div>;
}

function createDraft(
  chapterId: string,
  count: number,
  defaultModuleId: string | null,
  defaultTopicId: string | null,
): WorksheetStudioRecord {
  return {
    id: "new",
    publisherId: "",
    bookId: "",
    chapterId,
    moduleId: defaultModuleId,
    topicId: defaultTopicId,
    exerciseId: null,
    printableResourceId: null,
    answerKeyResourceId: null,
    supportingResourceIds: [],
    title: "",
    slug: "",
    type: "CLASSROOM",
    instructions: null,
    estimatedMinutes: null,
    difficulty: null,
    audience: "BOTH",
    totalMarks: null,
    allowOnlineAttempt: true,
    allowPrint: true,
    showAnswersAfterSubmit: false,
    active: true,
    published: false,
    sortOrder: count,
    archived: false,
    updatedAt: new Date(0).toISOString(),
  };
}
