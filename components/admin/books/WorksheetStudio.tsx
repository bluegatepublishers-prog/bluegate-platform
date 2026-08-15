"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ArrowLeft, FileText, Save } from "lucide-react";

import WorksheetQuestionManager from "@/components/admin/books/WorksheetQuestionManager";
import type { WorksheetStudioRecord } from "@/lib/worksheet-studio-types";

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

const plainArea = "w-full resize-none border-none bg-transparent text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-300";

export default function WorksheetStudio({
  chapterId,
  bookId,
  worksheets,
  saveAction,
  transitionReleaseAction,
  previewBaseHref,
  initialSelectedId,
  initialPreview = false,
  onSaveComplete,
  defaultModuleId,
  defaultTopicId,
  bookTitle,
  chapterTitle,
  currentScopeLabel,
  backHref,
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
  releaseSummaries?: Record<string, unknown>;
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
  backHref?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? worksheets[0]?.id ?? "new");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const selected = worksheets.find((worksheet) => worksheet.id === selectedId) ?? null;
  const draft = selected ?? createDraft(chapterId, worksheets.length, defaultModuleId ?? null, defaultTopicId ?? null);
  const formId = `worksheet-form-${draft.id}`;
  const worksheetName = draft.title.trim() || "New Worksheet";
  const stableBackHref = backHref ?? `/admin/books/${bookId}/content/assignments/worksheets?chapterId=${encodeURIComponent(chapterId)}`;

  function save(formData: FormData) {
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

  function publish() {
    if (!selected || !transitionReleaseAction || !formRef.current) return;
    setMessage("Publishing worksheet...");
    setError("");
    startTransition(async () => {
      try {
        const worksheetId = await saveAction(new FormData(formRef.current!));
        const confirmation = new FormData();
        confirmation.set("confirm", "on");
        await transitionReleaseAction(worksheetId, "PUBLISH", confirmation);
        setSelectedId(worksheetId);
        setMessage("Published successfully.");
        onSaveComplete?.(worksheetId);
      } catch (cause) {
        setMessage("");
        setError(cause instanceof Error ? cause.message : "Unable to publish worksheet.");
      }
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={stableBackHref} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Content Studio / Assignments</p>
              <h1 className="truncate text-xl font-bold text-slate-950">{worksheetName}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button form={formId} disabled={isPending} type="submit" className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-700 px-4 text-sm font-bold text-white disabled:opacity-60">
              <Save className="h-4 w-4" />
              {isPending ? "Saving..." : "Save"}
            </button>
            {selected && previewBaseHref ? (
              <Link href={`${previewBaseHref}/${selected.id}`} className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700">Preview</Link>
            ) : null}
            {selected ? (
              <button type="button" disabled={isPending || !transitionReleaseAction} onClick={publish} className="inline-flex h-10 items-center rounded-lg border border-emerald-200 bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-60">
                {isPending ? "Publishing..." : selected.published ? "Publish update" : "Publish"}
              </button>
            ) : null}
          </div>
        </header>

        <form ref={formRef} id={formId} key={draft.id} action={save} className="space-y-5">
          <input type="hidden" name="id" value={selected?.id ?? ""} />
          <input type="hidden" name="sortOrder" value={draft.sortOrder} />
          <input type="hidden" name="moduleId" value={draft.moduleId ?? ""} />
          <input type="hidden" name="topicId" value={draft.topicId ?? ""} />
          <input type="hidden" name="exerciseId" value={draft.exerciseId ?? ""} />
          <input type="hidden" name="printableResourceId" value={draft.printableResourceId ?? ""} />
          <input type="hidden" name="answerKeyResourceId" value={draft.answerKeyResourceId ?? ""} />
          {draft.supportingResourceIds.map((resourceId) => <input key={resourceId} type="hidden" name="supportingResourceIds" value={resourceId} />)}
          <input type="hidden" name="slug" value={draft.slug} />
          <input type="hidden" name="type" value={draft.type} />
          <input type="hidden" name="estimatedMinutes" value={draft.estimatedMinutes ?? ""} />
          <input type="hidden" name="difficulty" value={draft.difficulty ?? ""} />
          <input type="hidden" name="audience" value={draft.audience} />
          <input type="hidden" name="totalMarks" value={draft.totalMarks ?? ""} />
          <input type="hidden" name="allowOnlineAttempt" value={draft.allowOnlineAttempt ? "on" : ""} />
          <input type="hidden" name="allowPrint" value={draft.allowPrint ? "on" : ""} />
          <input type="hidden" name="showAnswersAfterSubmit" value={draft.showAnswersAfterSubmit ? "on" : ""} />
          <input type="hidden" name="active" value={draft.active ? "on" : ""} />
          <input type="hidden" name="published" value={draft.published ? "on" : ""} />

          <section className="rounded-xl bg-[#fffdf7] p-5 ring-1 ring-slate-200">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-blue-800">
              <FileText className="h-4 w-4" />
              Worksheet
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-500">{currentScopeLabel ?? `Chapter: ${chapterTitle ?? "Current chapter"}`}</p>
            <label className="mt-5 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Title
              <input name="title" required defaultValue={draft.title} placeholder="Worksheet title" className="mt-2 h-10 w-full border-none bg-transparent text-lg font-semibold tracking-tight text-slate-950 outline-none placeholder:text-slate-300" />
            </label>
            <section className="mt-5 border-t border-slate-200 pt-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Instructions</h2>
              <textarea name="instructions" defaultValue={draft.instructions ?? ""} rows={8} className={`${plainArea} mt-3`} placeholder="Write worksheet instructions naturally." />
            </section>
          </section>

          <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="text-sm font-bold text-slate-950">Questions</h2>
            <p className="mt-1 text-sm text-slate-500">Select approved book questions and set their order. Question count and marks are calculated from saved worksheet items.</p>
            {selected ? <div className="mt-4"><WorksheetQuestionManager bookId={bookId} worksheetId={selected.id} worksheetTitle={selected.title} instructions={selected.instructions} bookTitle={bookTitle} chapterTitle={chapterTitle} openPreviewInitially={initialPreview} /></div> : <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Save the worksheet first, then select its questions.</p>}
          </section>
        </form>

        {message ? <p role="status" className="text-sm font-semibold text-slate-600">{message}</p> : null}
        {error ? <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
      </div>
    </main>
  );
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
