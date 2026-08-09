"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ContentDocument } from "@/lib/content-document";
import { isActivityBlock, isExerciseBlock, isWorksheetBlock } from "@/lib/content-document";
import type { ContentRenderMode } from "@/lib/content-audience";
import { buildV2NarrationManifest, type BookNarrationManifest } from "@/lib/content-narration";
import type { LayoutV2Frame, LayoutV2Page } from "@/lib/content-layout-v2";
import type { ContentSectionDefinitionSummary, ResolvedLinkedAsset } from "@/lib/content-linked-asset-types";
import type { KnowledgeDefinitionSummary } from "@/lib/content-knowledge-types";
import type { ResolvedMediaBlock } from "@/lib/content-media-types";
import type { ResolvedActivityBlock } from "@/lib/activity-studio-types";
import type { ResolvedWorksheetBlock } from "@/lib/worksheet-studio-types";
import { useV2NarrationContext } from "@/components/content/V2NarrationProvider";
import { useStudentWork } from "@/components/content/StudentWorkProvider";
import StudentQuestionResponse, { type StudentQuestion } from "@/components/content/StudentQuestionResponse";
import V2ContentDocumentRenderer, { type StudentWorkFrameOverlayArgs, type StudentWorkHighlightTarget, type StudentWorkPageActionsArgs } from "@/components/content/V2ContentDocumentRenderer";
import { getModuleProgress, getPageProgress, resolveResumeLocation } from "@/lib/student-work-progress";

type QuestionDescriptor = {
  question: StudentQuestion;
  target: { chapterId: string; moduleId: string; pageId: string; frameId: string; childFrameId?: string; questionId: string };
  frame: LayoutV2Frame;
  page: LayoutV2Page;
};

type StudentWorkBookProps = {
  chapterId: string;
  moduleId: string;
  document: ContentDocument;
  mode: ContentRenderMode;
  linkedAssets: Record<string, ResolvedLinkedAsset | null>;
  activities: Record<string, ResolvedActivityBlock>;
  worksheets: Record<string, ResolvedWorksheetBlock>;
  media: Record<string, ResolvedMediaBlock | null>;
  sectionDefinitions: ContentSectionDefinitionSummary[];
  knowledgeDefinitions: Record<string, KnowledgeDefinitionSummary | null>;
  resourceUrls: Record<string, string>;
  focusPageId?: string;
};

export default function StudentWorkBook({ chapterId, moduleId, document, mode, linkedAssets, activities, worksheets, media, sectionDefinitions, knowledgeDefinitions, resourceUrls, focusPageId }: StudentWorkBookProps) {
  const { items, getWork, save } = useStudentWork();
  const narration = useV2NarrationContext();
  const rootRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<{ pageId: string; segmentId?: string } | null>(null);
  const questions = useMemo(() => collectQuestions(document, chapterId, moduleId), [chapterId, document, moduleId]);
  const moduleManifest = useMemo(() => buildV2NarrationManifest(document, "STUDENT", { scopeId: moduleId }), [document, moduleId]);
  const moduleProgress = useMemo(() => getModuleProgress(moduleId, document, items), [document, items, moduleId]);
  const resume = useMemo(() => resolveResumeLocation({ document, moduleId, item: getWork("READING_POSITION", {}), manifest: moduleManifest }), [document, getWork, moduleId, moduleManifest]);
  const highlights = useMemo(() => items.filter((item): item is typeof items[number] & { type: "HIGHLIGHT" } => item.type === "HIGHLIGHT" && item.target.moduleId === moduleId && item.status === "CURRENT").map((item) => ({ pageId: item.target.pageId ?? "", frameId: item.target.frameId ?? "", childFrameId: item.target.childFrameId } satisfies StudentWorkHighlightTarget)), [items, moduleId]);
  const semanticQuestions = questions.filter((entry) => entry.frame.renderMode === "SEMANTIC_ONLY");

  useEffect(() => {
    if (!focusPageId) return;
    const timer = window.setTimeout(() => {
      rootRef.current?.querySelector<HTMLElement>(`[data-v2-delivery-page-id="${CSS.escape(focusPageId)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusPageId]);

  const schedulePosition = useCallback((pageId: string, segmentId?: string) => {
    pendingPositionRef.current = { pageId, ...(segmentId ? { segmentId } : {}) };
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const pending = pendingPositionRef.current;
      timerRef.current = null;
      if (!pending) return;
      void save({ type: "READING_POSITION", target: { chapterId, moduleId }, payload: pending });
    }, 1200);
  }, [chapterId, moduleId, save]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const pages = [...root.querySelectorAll<HTMLElement>("[data-v2-delivery-page-id]")];
    if (!pages.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      const pageId = visible?.target instanceof HTMLElement ? visible.target.dataset.v2DeliveryPageId : undefined;
      if (pageId) schedulePosition(pageId);
    }, { threshold: [0.35, 0.65] });
    pages.forEach((page) => observer.observe(page));
    return () => observer.disconnect();
  }, [document, schedulePosition]);

  useEffect(() => {
    const segment = narration?.activeSegmentId ? moduleManifest.segments.find((entry) => entry.id === narration.activeSegmentId) : undefined;
    if (segment) schedulePosition(segment.pageId, segment.id);
  }, [moduleManifest.segments, narration?.activeSegmentId, schedulePosition]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    const pending = pendingPositionRef.current;
    if (pending) void save({ type: "READING_POSITION", target: { chapterId, moduleId }, payload: pending });
  }, [chapterId, moduleId, save]);

  const scrollToPage = useCallback((pageId: string) => {
    const page = rootRef.current?.querySelector<HTMLElement>(`[data-v2-delivery-page-id="${CSS.escape(pageId)}"]`);
    page?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const renderFrameOverlay = useCallback((input: StudentWorkFrameOverlayArgs): ReactNode => {
    if (input.semanticOnly || !input.block) return null;
    const frameQuestions = questions.filter((entry) => entry.page.id === input.page.id && entry.frame.id === input.frame.id);
    if (!frameQuestions.length) return null;
    return <div className="space-y-2">{frameQuestions.map((entry) => <StudentQuestionResponse key={entry.question.id} question={entry.question} target={entry.target} />)}</div>;
  }, [questions]);

  const renderPageActions = useCallback((input: StudentWorkPageActionsArgs) => {
    const note = items.find((item) => item.type === "NOTE" && item.target.moduleId === moduleId && item.target.pageId === input.page.id);
    return <StudentPageActions key={`${moduleId}:${input.page.id}:${note?.id ?? "empty"}:${note?.revision ?? 0}`} chapterId={chapterId} moduleId={moduleId} page={input.page} pageNumber={input.pageNumber} document={document} />;
  }, [chapterId, document, items, moduleId]);

  return (
    <div ref={rootRef} data-student-work-document="true" data-student-work-module-id={moduleId}>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-slate-700" aria-label={`${moduleProgress.percentage}% progress`}>
        <span className="font-bold text-blue-800">Progress {moduleProgress.percentage}%</span>
        <span>{moduleProgress.completedPages}/{moduleProgress.totalPages} pages done</span>
        {moduleProgress.answerableQuestions ? <span>{moduleProgress.answeredQuestions}/{moduleProgress.answerableQuestions} answered</span> : null}
        {moduleProgress.staleRequired ? <span className="font-semibold text-amber-700">{moduleProgress.staleRequired} needs review</span> : null}
      </div>
      {resume ? <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"><span>{resume.fallback ? "Saved page changed; " : ""}Resume from Page {resume.pageNumber}</span><button type="button" onClick={() => scrollToPage(resume.pageId)} className="rounded-lg bg-emerald-600 px-2 py-1 font-bold text-white">Resume Learning</button>{resume.segmentId && narration?.requestSegment ? <button type="button" onClick={() => { scrollToPage(resume.pageId); narration.requestSegment(resume.segmentId as string); }} className="rounded-lg border border-emerald-600 px-2 py-1 font-bold text-emerald-800">Resume Read Aloud</button> : null}</div> : null}
      <V2ContentDocumentRenderer document={document} mode={mode} linkedAssets={linkedAssets} activities={activities} worksheets={worksheets} media={media} sectionDefinitions={sectionDefinitions} knowledgeDefinitions={knowledgeDefinitions} resourceUrls={resourceUrls} studentWorkOverlay={renderFrameOverlay} studentWorkPageActions={renderPageActions} studentWorkHighlights={highlights} />
      {semanticQuestions.length ? <section className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><h4 className="text-sm font-bold text-blue-900">Questions in this region</h4><p className="mt-1 text-xs text-slate-600">This page uses semantic-only content, so responses stay here instead of guessing a visual position.</p><div className="mt-3 space-y-3">{semanticQuestions.map((entry) => <div key={entry.question.id}><p className="mb-1 text-sm font-semibold text-slate-800">{entry.question.prompt}</p><StudentQuestionResponse question={entry.question} target={entry.target} /></div>)}</div></section> : null}
      <SemanticHighlightRegions document={document} moduleId={moduleId} manifest={moduleManifest} />
    </div>
  );
}

function collectQuestions(document: ContentDocument, chapterId: string, moduleId: string): QuestionDescriptor[] {
  const blocks = new Map(document.blocks.map((block) => [block.id, block]));
  const result: QuestionDescriptor[] = [];
  for (const page of document.pageLayout?.pages ?? []) {
    for (const parentFrame of page.frames) {
      const frames: Array<{ frame: LayoutV2Frame; targetFrame: LayoutV2Frame; childFrame?: LayoutV2Frame }> = [{ frame: parentFrame, targetFrame: parentFrame }, ...(parentFrame.children ?? []).map((childFrame) => ({ frame: childFrame, targetFrame: parentFrame, childFrame }))];
      for (const entry of frames) {
        if (entry.frame.audience === "TEACHER" || entry.frame.hidden || entry.frame.readable === false) continue;
        const blockId = entry.frame.contentRef?.blockId;
        const block = blockId ? blocks.get(blockId) : undefined;
        if (!block) continue;
        const raw: unknown[] = entry.frame.type === "WORKSHEET" && isWorksheetBlock(block)
          ? block.questions
          : entry.frame.type === "EXERCISE" && isExerciseBlock(block)
            ? [...block.questions, ...block.groups.flatMap((group) => group.questions)]
            : entry.frame.type === "ACTIVITY" && isActivityBlock(block)
              ? block.fields.filter((field) => ["observation", "result", "reflection", "custom"].includes(field.type))
              : [];
        for (const value of raw) {
          if (!isStudentVisible(value)) continue;
          const question = safeQuestion(value);
          if (!question) continue;
          result.push({ question, frame: entry.frame, page, target: { chapterId, moduleId, pageId: page.id, frameId: entry.targetFrame.id, ...(entry.childFrame ? { childFrameId: entry.childFrame.id } : {}), questionId: question.id } });
        }
      }
    }
  }
  return result;
}

function isStudentVisible(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const visibility = (value as Record<string, unknown>).visibility;
  return !visibility || typeof visibility !== "object" || Array.isArray(visibility) || (visibility as Record<string, unknown>).student !== false;
}

function safeQuestion(value: unknown): StudentQuestion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.type !== "string") return null;
  const prompt = typeof record.prompt === "string" ? record.prompt : typeof record.label === "string" ? record.label : typeof record.text === "string" ? record.text : "Response";
  const options = Array.isArray(record.options) ? record.options : Array.isArray(record.assertionOptions) ? record.assertionOptions : [];
  return { id: record.id, type: record.type, prompt, instructions: typeof record.instructions === "string" ? record.instructions : undefined, options: options.map((option) => option && typeof option === "object" && !Array.isArray(option) && typeof option.id === "string" && typeof option.text === "string" ? { id: option.id, text: option.text } : null).filter((option): option is { id: string; text: string } => Boolean(option)) };
}

function StudentPageActions({ chapterId, moduleId, page, pageNumber, document }: { chapterId: string; moduleId: string; page: LayoutV2Page; pageNumber: number; document: ContentDocument }) {
  const { items, getWork, getState, save, remove, reload } = useStudentWork();
  const target = { chapterId, moduleId, pageId: page.id };
  const bookmark = getWork("BOOKMARK", target);
  const note = getWork("NOTE", target);
  const completion = getWork("COMPLETION", target);
  const pageProgress = useMemo(() => getPageProgress({ document, moduleId, pageId: page.id, items }), [document, items, moduleId, page.id]);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState(() => note && typeof note.payload === "object" && note.payload && "text" in note.payload && typeof note.payload.text === "string" ? note.payload.text : "");
  const bookmarkState = getState("BOOKMARK", target);
  const noteState = getState("NOTE", target);
  const completionState = getState("COMPLETION", target);
  const toggleBookmark = () => bookmark ? void remove(bookmark) : void save({ type: "BOOKMARK", target, payload: {} });
  const saveNote = () => noteText.trim() ? void save({ type: "NOTE", target, payload: { text: noteText.trim() } }) : note ? void remove(note) : undefined;
  const toggleDone = () => {
    if (completionState === "CONFLICT") return;
    if (completion && !completion.id.startsWith("local-") && completionState !== "NOT_SAVED") void remove(completion);
    else void save({ type: "COMPLETION", target, payload: { state: "COMPLETED" } });
  };
  const statusLabel = pageProgress.state === "COMPLETED" ? "Done" : pageProgress.state === "IN_PROGRESS" ? "In progress" : "Not started";
  const showDone = pageProgress.answerable === 0;
  const highlightSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() ?? "";
    const node = selection?.anchorNode?.parentElement?.closest<HTMLElement>("[data-v2-delivery-frame-id]");
    if (!selectedText || !node) return;
    const frameId = node.dataset.v2DeliveryFrameId;
    const manifest = buildV2NarrationManifest(document, "STUDENT", { scopeId: moduleId });
    const segment = manifest.segments.find((entry) => entry.pageId === page.id && entry.frameId === frameId && entry.text.includes(selectedText));
    if (!segment || !frameId) return;
    const start = segment.text.indexOf(selectedText);
    void save({ type: "HIGHLIGHT", target: { chapterId, moduleId, pageId: page.id, frameId, segmentId: segment.id }, payload: { anchor: { start, end: start + selectedText.length, text: selectedText } } });
    selection?.removeAllRanges();
  };
  return <span className="ml-auto flex flex-wrap items-center gap-1" data-student-page-actions="true"><span aria-label={`Page ${pageNumber}: ${statusLabel}`} className={`rounded px-2 py-1 text-[11px] font-semibold ${pageProgress.state === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : pageProgress.state === "IN_PROGRESS" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{statusLabel}</span>{pageProgress.answerable ? <span className="rounded bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-800">{pageProgress.answered}/{pageProgress.answerable} answered</span> : null}{showDone ? <><button type="button" disabled={completionState === "SAVING" || completionState === "CONFLICT"} aria-pressed={pageProgress.state === "COMPLETED"} onClick={toggleDone} className="rounded bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 disabled:opacity-50">{completionState === "NOT_SAVED" ? "Retry Mark as Read" : pageProgress.state === "COMPLETED" ? "Undo Done" : "Mark as Read"}{completionState === "SAVING" ? "..." : ""}</button>{completionState === "NOT_SAVED" ? <span aria-live="polite" className="text-[10px] font-semibold text-rose-700">Not saved</span> : null}{completionState === "CONFLICT" ? <button type="button" onClick={() => void reload()} className="text-[10px] font-semibold text-rose-700 underline">Reload saved version</button> : null}</> : null}<button type="button" aria-pressed={Boolean(bookmark)} onClick={toggleBookmark} className={`rounded px-2 py-1 text-[11px] ${bookmark ? "bg-amber-100 text-amber-800" : "bg-white text-slate-600"}`}>{bookmark ? "Bookmarked" : "Bookmark"}{bookmarkState === "SAVING" ? "..." : ""}</button><button type="button" onClick={() => setNoteOpen((value) => !value)} className="rounded bg-white px-2 py-1 text-[11px] text-slate-600">{note ? "Edit My Note" : "Add Note"}</button><button type="button" onClick={highlightSelection} className="rounded bg-white px-2 py-1 text-[11px] text-slate-600">Highlight selection</button>{noteOpen ? <span className="absolute z-40 mt-24 w-72 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl"><label className="text-xs font-bold text-slate-700" htmlFor={`student-note-${page.id}`}>My Note - Page {pageNumber}</label><textarea id={`student-note-${page.id}`} value={noteText} maxLength={5000} onChange={(event) => setNoteText(event.target.value)} rows={3} className="mt-2 w-full rounded border p-2 text-xs" placeholder="Keep a private note" /><span className="mt-1 flex items-center justify-between"><span aria-live="polite" className="text-[10px] text-slate-400">{noteText.length}/5000 {noteState === "SAVING" ? "- Saving..." : noteState === "SAVED" ? "- Saved" : ""}</span><button type="button" onClick={saveNote} className="rounded bg-blue-600 px-2 py-1 text-[11px] font-bold text-white">Save</button></span></span> : null}</span>;
}

function SemanticHighlightRegions({ document, moduleId, manifest }: { document: ContentDocument; moduleId: string; manifest: BookNarrationManifest }) {
  const { save } = useStudentWork();
  const replicaPages = new Set((document.pageLayout?.pages ?? []).filter((page) => page.visualMode === "EXACT_REPLICA").map((page) => page.id));
  const segments = manifest.segments.filter((segment) => replicaPages.has(segment.pageId));
  if (!segments.length) return null;
  return <div className="mt-3 rounded-xl border border-fuchsia-100 bg-fuchsia-50/50 p-3"><p className="text-xs font-bold text-fuchsia-800">Exact Replica semantic regions</p><p className="mt-1 text-[11px] text-slate-600">Use a semantic region when precise glyph selection is unavailable.</p><div className="mt-2 flex flex-wrap gap-2">{segments.map((segment) => <button key={segment.id} type="button" onClick={() => void save({ type: "HIGHLIGHT", target: { moduleId, pageId: segment.pageId, frameId: segment.frameId, ...(segment.childFrameId ? { childFrameId: segment.childFrameId } : {}), segmentId: segment.id }, payload: { anchor: { start: 0, end: segment.text.length, text: segment.text } } })} className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-fuchsia-800 ring-1 ring-fuchsia-200">Highlight Page {segment.pageId} region</button>)}</div></div>;
}