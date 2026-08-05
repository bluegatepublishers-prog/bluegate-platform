"use client";

import Canvas from "@/components/admin/books/editor/Canvas";
import PeriodTabs from "@/components/admin/books/editor/PeriodTabs";
import TopActionBar from "@/components/admin/books/editor/TopActionBar";
import WritingRibbon from "@/components/admin/books/editor/WritingRibbon";
import TextBlockEditor from "@/components/admin/books/editor/blocks/TextBlockEditor";
import ImageBlockEditor from "@/components/admin/books/editor/blocks/ImageBlockEditor";
import TableBlockEditor from "@/components/admin/books/editor/blocks/TableBlockEditor";
import MediaBlockEditor from "@/components/admin/books/editor/blocks/MediaBlockEditor";
import LinkedAssetEditor from "@/components/admin/books/editor/blocks/LinkedAssetEditor";
import ListBlockEditor from "@/components/admin/books/editor/blocks/ListBlockEditor";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { ClipboardEvent, KeyboardEvent, MouseEvent } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Slash,
  Trash2,
} from "lucide-react";
import { ResourceAudience, ResourceType } from "@prisma/client";

import ActivityStudio from "@/components/admin/books/ActivityStudio";
import ContentDocumentRenderer from "@/components/admin/books/ContentDocumentRenderer";
import ContentReleasePanel from "@/components/admin/books/ContentReleasePanel";
import ExerciseAuthoringStudio from "@/components/admin/books/ExerciseAuthoringStudio";
import StudioBuilderDrawer from "@/components/admin/books/StudioBuilderDrawer";
import WorksheetStudio from "@/components/admin/books/WorksheetStudio";
import {
  deleteContentNodeAction,
  duplicateContentNodeAction,
} from "@/app/admin/books/[id]/content/actions";
import type { BookStructureNodeType } from "@/lib/book-structure-management";
import type { ContentRenderMode } from "@/lib/content-audience";
import type {
  KnowledgeDefinitionSummary,
  KnowledgeReference,
  KnowledgeReferenceType,
} from "@/lib/content-knowledge-types";
import { knowledgeReferenceTypeLabel } from "@/lib/content-knowledge-types";
import {
  linkedAssetKey,
  type ContentSectionDefinitionSummary,
  type ContentStudioAssetOption,
  type ResolvedLinkedAsset,
} from "@/lib/content-linked-asset-types";
import {
  mediaKey,
  mediaKindLabel,
  type ContentStudioMediaOption,
  type ResolvedMediaBlock,
} from "@/lib/content-media-types";

import type { ResolvedActivityBlock } from "@/lib/activity-studio-types";
import type { ActivityStudioRecord } from "@/lib/activity-studio-types";
import type { ExerciseStudioData } from "@/lib/exercise-authoring-types";
import type { ResolvedWorksheetBlock } from "@/lib/worksheet-studio-types";
import type { WorksheetStudioRecord } from "@/lib/worksheet-studio-types";
import {
  BLOCK_ALIGNMENTS,
  BLOCK_BACKGROUND_STYLES,
  BLOCK_BORDER_STYLES,
  FORMULA_DISPLAY_MODES,
  INFO_BOX_VARIANTS,
  blockLabel,
  addContentPeriod,
  createBlockByType,
  createTextBlock,
  defaultNextBlockType,
  duplicateBlock,
  insertBlockAfter,
  insertBlockBefore,
  isFormulaBlock,
  isImageGalleryBlock,
  isInfoBoxBlock,
  isImageBlock,
  isLinkedAssetBlock,
  isListBlock,
  isMediaBlock,
  isObservationBoxBlock,
  isPlaceholderBlock,
  isSequenceBlock,
  isTableBlock,
  isTextBlock,
  moveBlock,
  moveBlockToPeriod,
  removeEmptyContentPeriod,
  renameContentPeriod,
  normalizeContentDocument,
  removeBlock,
  sanitizeUrl,
  updateBlock,
  type BlockAlignment,
  type BlockBackgroundStyle,
  type BlockBorderStyle,
  type ContentBlock,
  type ContentBlockType,
  type ContentDocument,
  type InfoBoxVariant,
  type LinkedAssetBlock,
  type MediaBlock,
} from "@/lib/content-document";
import type { ReleaseSummary } from "@/lib/content-release";
import { uploadFileToR2 } from "@/lib/storage/client-upload";

type ResourceChoice = {
  id: string;
  title: string;
  thumbnail: string | null;
  fileUrl: string | null;
  type?: string | null;
  mimeType?: string | null;
  published?: boolean;
  audience?: string | null;
};

type ImageInsertMetadata = {
  alt: string;
  caption: string;
  align: BlockAlignment;
  width: "full" | "wide" | "medium";
};

type SaveState = "saved" | "dirty" | "saving" | "error";

type TextSelection = {
  blockId: string;
  start: number;
  end: number;
  text: string;
};

type KnowledgePopupState = TextSelection & {
  type: KnowledgeReferenceType;
};

type ContentNodeSaveResult = {
  savedAt: string;
  nodeId: string;
};

type ActivityResourceOption = {
  id: string;
  title: string;
  type: string;
  audience: string;
  published: boolean;
};

type WorksheetLookupData = {
  modules: { id: string; title: string }[];
  topics: { id: string; title: string; moduleId: string | null }[];
  exercises: {
    id: string;
    title: string;
    published: boolean;
    marks: number | null;
    _count: { questions: number };
  }[];
  resources: { id: string; title: string; type: string; audience: string; published: boolean }[];
};

type ExerciseLookupData = {
  modules: { id: string; title: string }[];
  topics: { id: string; title: string; moduleId: string | null }[];
  outcomes: { id: string; outcome: string; moduleId: string | null; topicId: string | null }[];
  resources: { id: string; title: string; type: string; fileUrl: string; thumbnail: string | null }[];
};

type ToolbarInsertKind =
  | "image"
  | "media"
  | "feature"
  | "activity"
  | "worksheet"
  | "exercise"
  | "resource"
  | "learningOutcome";

type BuilderKind = "activity" | "worksheet" | "exercise";
type PreviewSurfaceMode = "STUDENT" | "TEACHER" | "WHITEBOARD";

const field =
  "mt-2 w-full rounded-[1.25rem] border border-transparent bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-200";

const ALL_BLOCK_TYPES: ContentBlockType[] = [
  "heading",
  "subheading",
  "paragraph",
  "caption",
  "bulletList",
  "numberedList",
  "quote",
  "callout",
  "image",
  "imageGallery",
  "diagram",
  "table",
  "formula",
  "divider",
  "linkedAsset",
  "media",
  "infoBox",
  "timeline",
  "comparisonTable",
  "processFlow",
  "stepList",
  "observationBox",
  "mindMap",
  "flowChart",
];

export default function ContentManuscriptEditor({
  bookId,
  nodeId,
  chapterId,
  nodeType,
  nodeTitle,
  nodeSubtitle,
  nodeDescription,
  nodeSlug,
  nodeLabel,
  nodeEstimatedMinutes,
  nodePublished,
  nodeContent,
  resources,
  assetOptions,
  mediaOptions,
  resolvedAssets,
  resolvedActivities,
  resolvedWorksheets,
  resolvedMedia,
  sectionDefinitions,
  knowledgeDefinitions,
  resolvedKnowledge,
  searchKnowledgeAction,
  saveKnowledgeAction,
  saveActivityAction,
  duplicateActivityAction,
  archiveActivityAction,
  moveActivityAction,
  saveWorksheetAction,
  duplicateWorksheetAction,
  archiveWorksheetAction,
  moveWorksheetAction,
  saveExerciseStudioAction,
  saveExerciseGroupAction,
  saveExerciseQuestionAction,
  moveExerciseQuestionAction,
  duplicateExerciseQuestionAction,
  archiveExerciseQuestionAction,
  archiveExerciseAction,
  createWorksheetExerciseAction,
  activityRows,
  activityResources,
  worksheetRows,
  worksheetLookups,
  exerciseRows,
  exerciseLookups,
  releaseSummary,
  transitionReleaseAction,
  rollbackReleaseAction,
  bulkPublishAction,
  previewBaseHref,
  saveAction,
}: {
  bookId: string;
  nodeId: string;
  chapterId: string | null;
  nodeType: BookStructureNodeType;
  nodeTitle: string;
  nodeSubtitle: string;
  nodeDescription: string;
  nodeSlug: string;
  nodeLabel: string;
  nodeEstimatedMinutes: number | null;
  nodePublished: boolean;
  nodeContent: unknown;
  resources: ResourceChoice[];
  assetOptions: ContentStudioAssetOption[];
  mediaOptions: ContentStudioMediaOption[];
  resolvedAssets: Record<string, ResolvedLinkedAsset | null>;
  resolvedActivities: Record<string, ResolvedActivityBlock>;
  resolvedWorksheets: Record<string, ResolvedWorksheetBlock>;
  resolvedMedia: Record<string, ResolvedMediaBlock | null>;
  sectionDefinitions: ContentSectionDefinitionSummary[];
  knowledgeDefinitions: KnowledgeDefinitionSummary[];
  resolvedKnowledge: Record<string, KnowledgeDefinitionSummary | null>;
  searchKnowledgeAction: (query: string) => Promise<KnowledgeDefinitionSummary[]>;
  saveKnowledgeAction: (
    type: KnowledgeReferenceType,
    data: FormData,
  ) => Promise<KnowledgeDefinitionSummary | undefined>;
  saveActivityAction: ((data: FormData) => Promise<string>) | null;
  duplicateActivityAction: ((activityId: string) => Promise<void>) | null;
  archiveActivityAction: ((activityId: string) => Promise<void>) | null;
  moveActivityAction: ((activityId: string, direction: -1 | 1) => Promise<void>) | null;
  saveWorksheetAction: ((data: FormData) => Promise<string>) | null;
  duplicateWorksheetAction: ((worksheetId: string) => Promise<void>) | null;
  archiveWorksheetAction: ((worksheetId: string) => Promise<void>) | null;
  moveWorksheetAction: ((worksheetId: string, direction: -1 | 1) => Promise<void>) | null;
  saveExerciseStudioAction: ((data: FormData) => Promise<string>) | null;
  saveExerciseGroupAction: ((exerciseId: string, data: FormData) => Promise<void>) | null;
  saveExerciseQuestionAction: ((exerciseId: string, data: FormData) => Promise<void>) | null;
  moveExerciseQuestionAction: ((exerciseId: string, questionId: string, direction: -1 | 1) => Promise<void>) | null;
  duplicateExerciseQuestionAction: ((exerciseId: string, questionId: string) => Promise<void>) | null;
  archiveExerciseQuestionAction: ((exerciseId: string, questionId: string, archived: boolean) => Promise<void>) | null;
  archiveExerciseAction: ((exerciseId: string, archived: boolean) => Promise<void>) | null;
  createWorksheetExerciseAction: ((data: FormData) => Promise<string>) | null;
  activityRows: ActivityStudioRecord[];
  activityResources: ActivityResourceOption[];
  worksheetRows: WorksheetStudioRecord[];
  worksheetLookups: WorksheetLookupData | null;
  exerciseRows: ExerciseStudioData[];
  exerciseLookups: ExerciseLookupData | null;
  releaseSummary: ReleaseSummary | null;
  transitionReleaseAction: ((
    action: "SUBMIT_REVIEW" | "RETURN_DRAFT" | "APPROVE" | "PUBLISH" | "UNPUBLISH" | "ARCHIVE" | "RESTORE",
    form: FormData,
  ) => Promise<void>) | null;
  rollbackReleaseAction: ((versionId: string, form: FormData) => Promise<void>) | null;
  bulkPublishAction: ((form: FormData) => Promise<void>) | null;
  previewBaseHref: string;
  saveAction: (data: FormData) => Promise<ContentNodeSaveResult>;
}) {
  const [title, setTitle] = useState(nodeTitle);
  const [subtitle, setSubtitle] = useState(nodeSubtitle);
  const [description, setDescription] = useState(nodeDescription);
  const [slug] = useState(nodeSlug);
  const [label] = useState(nodeLabel);
  const [estimatedMinutes] = useState(
    nodeEstimatedMinutes === null ? "" : String(nodeEstimatedMinutes),
  );
  const [published] = useState(nodePublished);
  const [contentDoc, setContentDoc] = useState<ContentDocument>(() =>
    normalizeContentDocument(nodeContent),
  );
  const [activePeriodId, setActivePeriodId] = useState(() => normalizeContentDocument(nodeContent).periods[0]?.id ?? "period_default");
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [periodTitleDraft, setPeriodTitleDraft] = useState("");
  const [resourceChoices, setResourceChoices] = useState(resources);
  const [assetLibrary, setAssetLibrary] = useState(assetOptions);
  const [mediaLibrary, setMediaLibrary] = useState(mediaOptions);
  const [activityLibraryRows] = useState(activityRows);
  const [worksheetLibraryRows] = useState(worksheetRows);
  const [exerciseLibraryRows] = useState(exerciseRows);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveMessage, setSaveMessage] = useState("All changes saved");
  const [error, setError] = useState("");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const [activeSelection, setActiveSelection] = useState<TextSelection | null>(null);
  const [knowledgePopup, setKnowledgePopup] = useState<KnowledgePopupState | null>(null);
  const [knowledgeMap, setKnowledgeMap] = useState(resolvedKnowledge);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewSurfaceMode>("STUDENT");
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [releasePanelOpen, setReleasePanelOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [toolbarAddOpen, setToolbarAddOpen] = useState(false);
  const [featureMenuOpen, setFeatureMenuOpen] = useState(false);
  const [insertKind, setInsertKind] = useState<ToolbarInsertKind | null>(null);
  const [builderKind, setBuilderKind] = useState<BuilderKind | null>(null);
  const [builderTab, setBuilderTab] = useState<"existing" | "create">("existing");
  const [insertAnchorId, setInsertAnchorId] = useState<string | null>(null);
  const [insertStatus, setInsertStatus] = useState("");
  const [insertError, setInsertError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRunningInsert, startInsertTransition] = useTransition();
  const [baselineSnapshot, setBaselineSnapshot] = useState(() =>
    serializeSnapshot({
      title: nodeTitle,
      subtitle: nodeSubtitle,
      description: nodeDescription,
      slug: nodeSlug,
      label: nodeLabel,
      estimatedMinutes:
        nodeEstimatedMinutes === null ? "" : String(nodeEstimatedMinutes),
      published: nodePublished,
      content: normalizeContentDocument(nodeContent),
    }),
  );
  const savingRef = useRef(false);
  const autosaveRef = useRef<number | null>(null);
  const historyRef = useRef<ContentDocument[]>([]);
  const futureRef = useRef<ContentDocument[]>([]);

  const snapshot = serializeSnapshot({
    title,
    subtitle,
    description,
    slug,
    label,
    estimatedMinutes,
    published,
    content: contentDoc,
  });
  const dirty = snapshot !== baselineSnapshot;

  function applyDocumentChange(updater: (current: ContentDocument) => ContentDocument) {
    setContentDoc((current) => {
      const next = updater(current);
      if (JSON.stringify(current) !== JSON.stringify(next)) {
        historyRef.current.push(current);
        if (historyRef.current.length > 80) historyRef.current.shift();
        futureRef.current = [];
        setCanUndo(historyRef.current.length > 0);
        setCanRedo(false);
      }
      return next;
    });
  }

  function undoDocument() {
    setContentDoc((current) => {
      const previous = historyRef.current.pop();
      if (!previous) return current;
      futureRef.current.unshift(current);
      setCanUndo(historyRef.current.length > 0);
      setCanRedo(true);
      return previous;
    });
    setSaveState("dirty");
    setSaveMessage("Undid last change");
  }

  function redoDocument() {
    setContentDoc((current) => {
      const next = futureRef.current.shift();
      if (!next) return current;
      historyRef.current.push(current);
      setCanUndo(true);
      setCanRedo(futureRef.current.length > 0);
      return next;
    });
    setSaveState("dirty");
    setSaveMessage("Reapplied change");
  }

  useEffect(() => {
    if (!focusTarget) return;
    const selector = `[data-block-id="${focusTarget}"]`;
    const frame = window.requestAnimationFrame(() => {
      const element = globalThis.document.querySelector<HTMLElement>(selector);
      element?.focus();
      setFocusTarget(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusTarget, contentDoc]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const saveDocument = useCallback(async () => {
    if (savingRef.current) return;
    const current = serializeSnapshot({
      title,
      subtitle,
      description,
      slug,
      label,
      estimatedMinutes,
      published,
      content: contentDoc,
    });
    if (current === baselineSnapshot) {
      setSaveState("saved");
      setSaveMessage("All changes saved");
      setError("");
      return;
    }

    savingRef.current = true;
    setSaveState("saving");
    setSaveMessage("Saving...");
    setError("");

    const form = new FormData();
    form.set("title", title);
    form.set("subtitle", subtitle);
    form.set("description", description);
    form.set("slug", slug);
    form.set("label", label);
    form.set("estimatedMinutes", estimatedMinutes);
    form.set("published", published ? "on" : "");
    form.set("content", current);

    try {
      const result = await saveAction(form);
      setBaselineSnapshot(current);
      setSaveState("saved");
      setSaveMessage("Saved");
      setLastSavedAt(result.savedAt);
    } catch (cause) {
      setSaveState("error");
      setSaveMessage("Save failed");
      setError(cause instanceof Error ? cause.message : "Unable to save changes.");
    } finally {
      savingRef.current = false;
    }
  }, [
    baselineSnapshot,
    contentDoc,
    description,
    estimatedMinutes,
    label,
    published,
    saveAction,
    slug,
    subtitle,
    title,
  ]);

  useEffect(() => {
    if (!dirty || savingRef.current) return;
    if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    autosaveRef.current = window.setTimeout(() => {
      void saveDocument();
    }, 900);
    return () => {
      if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    };
  }, [dirty, saveDocument]);

  function openMenu(anchorId: string) {
    setMenuAnchor(anchorId);
  }

  function closeMenu() {
    setMenuAnchor(null);
  }

  function captureTextSelection(block: ContentBlock, target: HTMLInputElement | HTMLTextAreaElement) {
    const selection = readTextSelection(block, target);
    if (selection) setActiveSelection(selection);
  }

  function readTextSelection(block: ContentBlock, target: HTMLInputElement | HTMLTextAreaElement) {
    if (!isTextBlock(block)) return null;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    const selectedText = target.value.slice(start, end).trim();
    if (!selectedText || end <= start) return null;
    return {
      blockId: block.id,
      start,
      end,
      text: selectedText,
    };
  }

  function addKnowledgeReference(selection: KnowledgePopupState, definition: KnowledgeDefinitionSummary) {
    setKnowledgeMap((current) => ({
      ...current,
      [knowledgeMapKey(definition.type, definition.id)]: definition,
    }));
    applyDocumentChange((current) =>
      updateBlock(current, selection.blockId, (block) => {
        if (!isTextBlock(block)) return block;
        const nextReference: KnowledgeReference = {
          id: stableReferenceId(),
          type: definition.type,
          targetId: definition.id,
          label: definition.label,
          start: selection.start,
          end: selection.end,
        };
        const references = (block.knowledgeReferences ?? []).filter(
          (reference) => reference.end <= selection.start || reference.start >= selection.end,
        );
        return {
          ...block,
          knowledgeReferences: [...references, nextReference].sort((a, b) => a.start - b.start),
        };
      }),
    );
    setSaveState("dirty");
    setSaveMessage("Knowledge reference added");
    setKnowledgePopup(null);
  }

  function removeKnowledgeReference(blockId: string, referenceId: string) {
    applyDocumentChange((current) =>
      updateBlock(current, blockId, (block) => {
        if (!isTextBlock(block)) return block;
        return {
          ...block,
          knowledgeReferences: (block.knowledgeReferences ?? []).filter(
            (reference) => reference.id !== referenceId,
          ),
        };
      }),
    );
    setSaveState("dirty");
    setSaveMessage("Knowledge reference removed");
  }

  function addBlock(type: ContentBlockType, anchorId: string, before = false) {
    const block = createBlockByType(type);
    applyDocumentChange((current) =>
      before
        ? insertBlockBefore(current, anchorId, block)
        : insertBlockAfter(current, anchorId, block),
    );
    setFocusTarget(block.id);
    closeMenu();
  }

  function addFeature(variant: InfoBoxVariant) {
    if (!toolbarAnchorId) return;
    addBlockWithFactory(toolbarAnchorId, () => {
      const block = createBlockByType("infoBox");
      return isInfoBoxBlock(block) ? { ...block, variant } : block;
    });
    setFeatureMenuOpen(false);
  }

  function applyToolbarBlockType(type: ContentBlockType) {
    if (!toolbarAnchorId) return;
    applyDocumentChange((current) => updateBlock(current, toolbarAnchorId, (block) => {
      const next = createBlockByType(type);
      if (isTextBlock(block) && isTextBlock(next)) return { ...next, text: block.text };
      if (isListBlock(block) && isListBlock(next)) return { ...next, items: block.items };
      return next;
    }));
    setSaveMessage("Text style updated");
  }

  function updateText(blockId: string, value: string) {
    applyDocumentChange((current) =>
      updateBlock(current, blockId, (block) => {
        if (!isTextBlock(block)) return block;
        return { ...block, text: value };
      }),
    );
  }

  function updatePatch(blockId: string, patch: Partial<ContentBlock>) {
    applyDocumentChange((current) =>
      updateBlock(current, blockId, (block) => ({ ...block, ...patch } as ContentBlock)),
    );
  }

  function updateListItem(blockId: string, itemIndex: number, value: string) {
    applyDocumentChange((current) =>
      updateBlock(current, blockId, (block) => {
        if (!isListBlock(block)) return block;
        const items = [...block.items];
        items[itemIndex] = value;
        return { ...block, items };
      }),
    );
  }

  function addListItem(blockId: string, itemIndex: number) {
    applyDocumentChange((current) =>
      updateBlock(current, blockId, (block) => {
        if (!isListBlock(block)) return block;
        const items = [...block.items];
        items.splice(itemIndex + 1, 0, "");
        return { ...block, items };
      }),
    );
  }

  function removeListItem(blockId: string, itemIndex: number) {
    applyDocumentChange((current) =>
      updateBlock(current, blockId, (block) => {
        if (!isListBlock(block)) return block;
        const items = block.items.filter((_, index) => index !== itemIndex);
        return { ...block, items: items.length ? items : [""] };
      }),
    );
  }

  function chooseResource(blockId: string, resourceId: string) {
    const resource = resourceChoices.find((item) => item.id === resourceId) ?? null;
    if (!resource) {
      updatePatch(blockId, { url: "", resourceId: undefined, alt: "" });
      return;
    }
    const url =
      sanitizeUrl(resource.thumbnail ?? "") ||
      sanitizeUrl(resource.fileUrl ?? "") ||
      `/api/resources/${encodeURIComponent(resource.id)}/download`;
    updatePatch(blockId, {
      resourceId: resource.id,
      url,
      alt: resource.title,
    });
  }

  function clearInsertFeedback() {
    setInsertStatus("");
    setInsertError("");
    setUploadProgress(0);
  }

  function openInsertSurface(kind: ToolbarInsertKind, anchorId = toolbarAnchorId) {
    setToolbarAddOpen(false);
    setFeatureMenuOpen(false);
    setBuilderKind(null);
    setInsertKind(kind);
    setInsertAnchorId(anchorId);
    clearInsertFeedback();
  }

  function closeInsertSurface() {
    setInsertKind(null);
    clearInsertFeedback();
  }

  function openBuilderSurface(kind: BuilderKind, tab: "existing" | "create" = "existing") {
    if (!canOpenScopedBuilders) return;
    setToolbarAddOpen(false);
    setInsertKind(null);
    setBuilderKind(kind);
    setBuilderTab(tab);
    setInsertAnchorId(toolbarAnchorId);
    clearInsertFeedback();
  }

  function deleteCurrentNode() {
    const name = nodeTitle;
    if (!confirm(`Delete "${name}"?`)) return;
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    void deleteContentNodeAction(bookId, nodeType, nodeId, name).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Unable to delete this item.");
    });
  }

  function closeBuilderSurface() {
    setBuilderKind(null);
    clearInsertFeedback();
  }

  function openPreview(mode: PreviewSurfaceMode) {
    setPreviewMode(mode);
    setPreviewMenuOpen(false);
    setPreviewOpen(true);
  }

  function publishCurrentNode() {
    if (!transitionReleaseAction) return;
    const form = new FormData();
    form.set("confirm", "on");
    void transitionReleaseAction("PUBLISH", form);
  }

  function duplicateCurrentNode() {
    void duplicateContentNodeAction(bookId, nodeType, nodeId);
  }

  function focusSearchResult() {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;
    const matchingBlock = contentDoc.blocks.find((block) => blockContainsQuery(block, query));
    if (!matchingBlock) {
      setSaveMessage("No matching text found in this manuscript");
      return;
    }
    const selector = `[data-block-id="${matchingBlock.id}"]`;
    const element = globalThis.document.querySelector<HTMLElement>(selector);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.focus();
    setSaveMessage("Jumped to the first matching block");
  }

  function exportManuscript() {
    const lines = buildPlainTextExport({
      title,
      subtitle,
      description,
      content: contentDoc,
    });
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = globalThis.document.createElement("a");
    anchor.href = url;
    anchor.download = `${(title || nodeTitle || "manuscript").trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "manuscript"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMoreMenuOpen(false);
  }

  function printManuscript() {
    setMoreMenuOpen(false);
    globalThis.print();
  }

  function addBlockWithFactory(
    anchorId: string,
    factory: () => ContentBlock,
    before = false,
  ) {
    const block = factory();
    applyDocumentChange((current) =>
      before ? insertBlockBefore(current, anchorId, block) : insertBlockAfter(current, anchorId, block),
    );
    setFocusTarget(block.id);
    setSaveState("dirty");
    setSaveMessage("Content updated");
  }

  function addPeriod() {
    setContentDoc((current) => {
      const next = addContentPeriod(current);
      setActivePeriodId(next.periods[next.periods.length - 1]?.id ?? current.periods[0]?.id ?? "period_default");
      historyRef.current.push(current);
      futureRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
      setSaveState("dirty");
      return next;
    });
    setSaveMessage("Period added");
  }

  function beginPeriodRename(periodId: string, title: string) {
    setEditingPeriodId(periodId);
    setPeriodTitleDraft(title);
  }

  function commitPeriodRename() {
    if (!editingPeriodId) return;
    applyDocumentChange((current) => renameContentPeriod(current, editingPeriodId, periodTitleDraft));
    setEditingPeriodId(null);
    setSaveMessage("Period renamed");
  }

  function deleteEmptyPeriod(periodId: string) {
    const period = contentDoc.periods.find((entry) => entry.id === periodId);
    if (!period || contentDoc.blocks.some((block) => block.periodId === periodId)) {
      setSaveMessage("Only empty periods can be deleted");
      return;
    }
    applyDocumentChange((current) => removeEmptyContentPeriod(current, periodId));
    if (activePeriodId === periodId) setActivePeriodId(contentDoc.periods[0]?.id ?? "period_default");
    setSaveMessage("Empty period deleted");
  }

  function moveCurrentBlockToPeriod(blockId: string, periodId: string) {
    applyDocumentChange((current) => moveBlockToPeriod(current, blockId, periodId));
    setSaveState("dirty");
    setSaveMessage("Content moved");
  }

  function insertLinkedAssetOption(option: ContentStudioAssetOption, anchorId: string) {
    addBlockWithFactory(anchorId, () => {
      const block = createBlockByType("linkedAsset") as LinkedAssetBlock;
      return {
        ...block,
        assetKind: option.assetKind,
        label: option.defaultLabel,
        targetType: option.targetType,
        targetId: option.targetId,
        audience: option.defaultAudience,
        displayStyle: option.displayStyles[0],
        openMode: option.openModes[0],
        required: false,
      };
    });
  }

  function insertMediaOption(option: ContentStudioMediaOption, anchorId: string) {
    addBlockWithFactory(anchorId, () => {
      const block = createBlockByType("media") as MediaBlock;
      return {
        ...block,
        mediaKind: option.mediaKind,
        label: option.defaultLabel,
        targetType: option.targetType,
        targetId: option.targetId,
        displayMode: "inline",
        autoplay: false,
        controls: true,
        required: false,
        audience: option.defaultAudience,
      };
    });
  }

  function insertImageResource(
    resource: ResourceChoice,
    anchorId: string,
    metadata?: ImageInsertMetadata,
  ) {
    const safeUrl = `/api/resources/${encodeURIComponent(resource.id)}/download`;
    addBlockWithFactory(anchorId, () => {
      const block = createBlockByType("image");
      if (!isImageBlock(block)) return block;
      return {
        ...block,
        resourceId: resource.id,
        url: safeUrl,
        alt: metadata?.alt || resource.title,
        caption: metadata?.caption || "",
        align: metadata?.align ?? "center",
        width: metadata?.width ?? "wide",
      };
    });
  }

  async function createPublisherResource(input: {
    file: File;
    scope: "resource-file";
    title: string;
    type: ResourceType;
    audience: ResourceAudience;
  }) {
    const uploaded = await uploadFileToR2({
      file: input.file,
      scope: input.scope,
      onProgress: (value) => setUploadProgress(value),
    });
    const response = await fetch("/api/admin/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.title,
        type: input.type,
        audience: input.audience,
        fileUrl: uploaded.objectKey,
        thumbnail: "",
        bookId,
        published: false,
        originalFileName: input.file.name,
        mimeType: uploaded.contentType,
        fileSizeBytes: String(uploaded.sizeBytes),
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          id?: string;
          title?: string;
          fileUrl?: string;
          thumbnail?: string | null;
          type?: string;
          mimeType?: string | null;
          published?: boolean;
          audience?: string;
          message?: string;
        }
      | null;
    if (!response.ok || !payload?.id || !payload.title || !payload.fileUrl) {
      throw new Error(payload?.message || "Unable to create resource.");
    }
    const nextResource: ResourceChoice = {
      id: payload.id,
      title: payload.title,
      fileUrl: payload.fileUrl,
      thumbnail: payload.thumbnail ?? null,
      type: payload.type ?? input.type,
      mimeType: payload.mimeType ?? input.file.type,
      published: payload.published ?? false,
      audience: payload.audience ?? input.audience,
    };
    setResourceChoices((current) => [nextResource, ...current.filter((item) => item.id !== nextResource.id)]);
    return nextResource;
  }

  function insertResourceAsLinkedAsset(resource: ResourceChoice, anchorId: string) {
    const option: ContentStudioAssetOption = {
      assetKind:
        resource.type === ResourceType.WORKSHEET
          ? "worksheet"
          : resource.type === ResourceType.VIDEO
            ? "video"
            : "resource",
      targetType: "RESOURCE",
      targetId: resource.id,
      title: resource.title,
      defaultLabel: resource.title,
      sourceBadge: "Publisher Resource",
      sourceDetail: resource.type ?? "RESOURCE",
      scopeLabel: nodeType,
      audienceOptions: ["TEACHER", "STUDENT"],
      defaultAudience: ["TEACHER", "STUDENT"],
      displayStyles: ["button", "inline", "callout"],
      openModes: resource.type === ResourceType.VIDEO ? ["route"] : ["route", "download"],
      teacherOnly: resource.audience === ResourceAudience.TEACHER_ONLY,
      route: {
        href: `/api/resources/${encodeURIComponent(resource.id)}/download`,
        openMode: resource.type === ResourceType.VIDEO ? "route" : "download",
      },
    };
    setAssetLibrary((current) => [option, ...current.filter((item) => linkedAssetKey(item.targetType, item.targetId) !== linkedAssetKey(option.targetType, option.targetId))]);
    insertLinkedAssetOption(option, anchorId);
  }

  function insertResourceAsMedia(resource: ResourceChoice, anchorId: string, mediaKind: MediaBlock["mediaKind"]) {
    const option: ContentStudioMediaOption = {
      mediaKind,
      targetType: "RESOURCE",
      targetId: resource.id,
      title: resource.title,
      defaultLabel: resource.title,
      sourceBadge: "Publisher Resource",
      sourceDetail: resource.type ?? "RESOURCE",
      scopeLabel: nodeType,
      audienceOptions: ["TEACHER", "STUDENT"],
      defaultAudience: ["TEACHER", "STUDENT"],
      route: { href: `/api/resources/${encodeURIComponent(resource.id)}/download`, openMode: "route" },
      posterRoute: null,
      durationSeconds: null,
      published: Boolean(resource.published),
      teacherOnly: resource.audience === ResourceAudience.TEACHER_ONLY,
    };
    setMediaLibrary((current) => [option, ...current.filter((item) => mediaKey(item.targetType, item.targetId) !== mediaKey(option.targetType, option.targetId))]);
    insertMediaOption(option, anchorId);
  }

  function insertCreatedStudioAsset(kind: BuilderKind, id: string, anchorId: string) {
    if (kind === "activity") {
      const option = assetLibrary.find((item) => item.targetType === "CHAPTER_ACTIVITY" && item.targetId === id);
      if (option) {
        insertLinkedAssetOption(option, anchorId);
        return;
      }
      insertLinkedAssetOption(
        {
          assetKind: "activity",
          targetType: "CHAPTER_ACTIVITY",
          targetId: id,
          title: "Activity",
          defaultLabel: "Activity",
          sourceBadge: "Activity",
          sourceDetail: nodeType,
          scopeLabel: nodeType,
          audienceOptions: ["TEACHER", "STUDENT"],
          defaultAudience: ["TEACHER", "STUDENT"],
          displayStyles: ["button", "inline", "callout"],
          openModes: ["route"],
          teacherOnly: false,
          route: null,
        },
        anchorId,
      );
      return;
    }
    if (kind === "worksheet") {
      insertLinkedAssetOption(
        {
          assetKind: "worksheet",
          targetType: "PUBLISHER_WORKSHEET",
          targetId: id,
          title: "Worksheet",
          defaultLabel: "Worksheet",
          sourceBadge: "Worksheet",
          sourceDetail: nodeType,
          scopeLabel: nodeType,
          audienceOptions: ["TEACHER", "STUDENT"],
          defaultAudience: ["TEACHER", "STUDENT"],
          displayStyles: ["button", "inline", "callout"],
          openModes: ["route"],
          teacherOnly: false,
          route: null,
        },
        anchorId,
      );
      return;
    }
    insertLinkedAssetOption(
      {
        assetKind: "exercise",
        targetType: "BOOK_EXERCISE",
        targetId: id,
        title: "Exercise",
        defaultLabel: "Exercise",
        sourceBadge: "Exercise",
        sourceDetail: nodeType,
        scopeLabel: nodeType,
        audienceOptions: ["TEACHER", "STUDENT"],
        defaultAudience: ["TEACHER", "STUDENT"],
        displayStyles: ["button", "inline", "callout"],
        openModes: ["route"],
        teacherOnly: false,
        route: null,
      },
      anchorId,
    );
  }

  function deleteBlock(blockId: string, fallbackIndex: number) {
    const fallback = contentDoc.blocks[Math.max(0, fallbackIndex - 1)] ?? null;
    applyDocumentChange((current) => removeBlock(current, blockId));
    if (fallback) setFocusTarget(fallback.id);
  }

  function duplicateCurrentBlock(blockId: string) {
    applyDocumentChange((current) => duplicateBlock(current, blockId));
  }

  function moveCurrentBlock(blockId: string, direction: -1 | 1) {
    applyDocumentChange((current) => moveBlock(current, blockId, direction));
  }

  function handleTextKeyDown(
    event: KeyboardEvent<HTMLElement>,
    block: ContentBlock,
    index: number,
    currentValue: string,
  ) {
    if (event.key === "Escape") {
      closeMenu();
      return;
    }
    if (event.key === "/" && currentValue.trim() === "") {
      event.preventDefault();
      openMenu(block.id);
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && isTextBlock(block)) {
      event.preventDefault();
      addBlock(defaultNextBlockType(block.type), block.id);
      return;
    }
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      (block.type === "image" || block.type === "divider" || block.type === "linkedAsset" || block.type === "media")
    ) {
      event.preventDefault();
      addBlock("paragraph", block.id);
      return;
    }
    if (event.key === "Backspace" && currentValue.trim() === "" && index > 0) {
      event.preventDefault();
      const previous = contentDoc.blocks[index - 1];
      applyDocumentChange((current) => removeBlock(current, block.id));
      setFocusTarget(previous.id);
    }
  }

  function handleTextPaste(event: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>, block: ContentBlock) {
    if (!isTextBlock(block)) return;
    const pasted = event.clipboardData.getData("text/plain").replace(/\r\n/g, "\n");
    if (!pasted.includes("\n")) return;
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart ?? block.text.length;
    const end = target.selectionEnd ?? start;
    const pieces = pasted.split(/\n{2,}/).map((piece) => piece.replace(/\n/g, " ").trim()).filter(Boolean);
    if (!pieces.length) return;
    applyDocumentChange((current) => {
      let next = updateBlock(current, block.id, (entry) => ({
        ...entry,
        text: block.text.slice(0, start) + pieces[0] + block.text.slice(end),
      }));
      let anchorId = block.id;
      for (const piece of pieces.slice(1)) {
        const paragraph = createTextBlock("paragraph", piece);
        next = insertBlockAfter(next, anchorId, paragraph);
        anchorId = paragraph.id;
      }
      return next;
    });
    setSaveMessage("Pasted lesson text");
  }

  function handleListKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    block: ContentBlock,
    itemIndex: number,
    itemValue: string,
  ) {
    if (event.key === "Escape") {
      closeMenu();
      return;
    }
    if (event.key === "/" && itemValue.trim() === "") {
      event.preventDefault();
      openMenu(block.id);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      addListItem(block.id, itemIndex);
      return;
    }
    if (event.key === "Backspace" && itemValue.trim() === "" && itemIndex > 0) {
      event.preventDefault();
      removeListItem(block.id, itemIndex);
    }
  }

  const previewLinkedAssets = buildLinkedAssetPreviewMap(contentDoc, assetLibrary, resolvedAssets);
  const previewMedia = buildMediaPreviewMap(contentDoc, mediaLibrary, resolvedMedia);
  const wordCount = countDocumentWords({ title, subtitle, description, content: contentDoc });
  const toolbarAnchorId = activeBlockId && contentDoc.blocks.some((block) => block.id === activeBlockId)
    ? activeBlockId
    : contentDoc.blocks[contentDoc.blocks.length - 1]?.id ?? contentDoc.blocks[0]?.id ?? "";
  const canOpenScopedBuilders = Boolean(chapterId);

  return (
    <div
      data-node-id={nodeId}
      data-content-editor-dirty={dirty ? "true" : "false"}
      className="flex h-full min-h-0 flex-col gap-4"
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          void saveDocument();
        }
        if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
          event.preventDefault();
          undoDocument();
        }
        if (
          (event.metaKey || event.ctrlKey) &&
          (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"))
        ) {
          event.preventDefault();
          redoDocument();
        }
      }}
    >
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] bg-[#fcfaf5] shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:px-5">
        </div>
          <TopActionBar
  lifecycleLabel={
    releaseSummary?.lifecycle === "PUBLISHED"
      ? "Published"
      : "Draft"
  }
  dirty={dirty}
  saveState={saveState}
  onSave={() => void saveDocument()}
  previewMode={previewMode}
  previewMenuOpen={previewMenuOpen}
  onTogglePreviewMenu={() => {
    setPreviewMenuOpen((current) => !current);
    setMoreMenuOpen(false);
  }}
  onPreview={openPreview}
  canPublish={Boolean(transitionReleaseAction)}
  onPublish={publishCurrentNode}
  onDelete={deleteCurrentNode}
  canUndo={canUndo}
  canRedo={canRedo}
  onUndo={undoDocument}
  onRedo={redoDocument}
  searchOpen={searchOpen}
  onToggleSearch={() =>
    setSearchOpen((current) => !current)
  }
  insertMenuOpen={toolbarAddOpen}
  onToggleInsertMenu={() => {
    setToolbarAddOpen((current) => !current);
    setPreviewMenuOpen(false);
    setMoreMenuOpen(false);
  }}
  moreMenuOpen={moreMenuOpen}
  onToggleMoreMenu={() => {
    setMoreMenuOpen((current) => !current);
    setPreviewMenuOpen(false);
  }}
  onOpenVersionHistory={() => {
    setMoreMenuOpen(false);
    setReleasePanelOpen(true);
  }}
  onOpenRollback={() => {
    setMoreMenuOpen(false);
    setReleasePanelOpen(true);
  }}
  onDuplicate={duplicateCurrentNode}
  onExport={exportManuscript}
  onPrint={printManuscript}
  layout={contentDoc.layout}
  onToggleLayout={() => {
    applyDocumentChange((current) => ({
      ...current,
      layout:
        current.layout === "double"
          ? "single"
          : "double",
    }));
    setSaveState("dirty");
  }}
/>
          <WritingRibbon
  activeBlockType={
    contentDoc.blocks.find(
      (block) => block.id === toolbarAnchorId,
    )?.type ?? "paragraph"
  }
  onChangeBlockType={applyToolbarBlockType}
  onAlignLeft={() =>
    updatePatch(toolbarAnchorId, { align: "left" })
  }
  onAlignCenter={() =>
    updatePatch(toolbarAnchorId, { align: "center" })
  }
  onAlignRight={() =>
    updatePatch(toolbarAnchorId, { align: "right" })
  }
  onOpenInsertMenu={() => setToolbarAddOpen(true)}
/>
          {searchOpen ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    focusSearchResult();
                  }
                }}
                placeholder="Search titles, lead text, and manuscript blocks"
                aria-label="Search manuscript text"
                className="min-w-[16rem] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300"
              />
              <button
                type="button"
                onClick={focusSearchResult}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Find
              </button>
            </div>
          ) : null}
          {toolbarAddOpen ? (
            <div className="mt-3">
              <UnifiedAddMenu
                canOpenScopedBuilders={canOpenScopedBuilders}
                onPick={(kind) => {
                  if (kind === "feature") {
                    setFeatureMenuOpen(true);
                    setToolbarAddOpen(false);
                    return;
                  }
                  if (kind === "activity" || kind === "worksheet" || kind === "exercise") {
                    openBuilderSurface(kind, "existing");
                    return;
                  }
                  openInsertSurface(kind);
                }}
              />
            </div>
          ) : null}
          {featureMenuOpen ? (
            <div className="mt-3 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Feature Element</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {INFO_BOX_VARIANTS.map((variant) => (
                  <button key={variant} type="button" onClick={() => addFeature(variant)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    {infoBoxToolbarLabel(variant)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <PeriodTabs
  periods={contentDoc.periods}
  activePeriodId={activePeriodId}
  editingPeriodId={editingPeriodId}
  periodTitleDraft={periodTitleDraft}
  onSelectPeriod={setActivePeriodId}
  onBeginRename={beginPeriodRename}
  onChangeTitleDraft={setPeriodTitleDraft}
  onCommitRename={commitPeriodRename}
  onCancelRename={() => setEditingPeriodId(null)}
  onDeleteEmptyPeriod={deleteEmptyPeriod}
  onAddPeriod={addPeriod}
/>

        <Canvas
  title={title}
  subtitle={subtitle}
  description={description}
  onTitleChange={(value) => {
    setTitle(value);
    setError("");
  }}
  onSubtitleChange={(value) => {
    setSubtitle(value);
    setError("");
  }}
  onDescriptionChange={(value) => {
    setDescription(value);
    setError("");
  }}
  saveState={saveState}
  dirty={dirty}
  error={error}
  layout={contentDoc.layout}
>
  {contentDoc.blocks
    .filter((block) => block.periodId === activePeriodId)
    .map((block, index) => (
      <BlockEditor
        key={block.id}
        bookId={bookId}
        block={block}
        index={index}
        resources={resourceChoices}
        assetOptions={assetLibrary}
        mediaOptions={mediaLibrary}
        sectionDefinitions={sectionDefinitions}
        periods={contentDoc.periods}
        resolvedAsset={
          previewLinkedAssets[block.id] ?? null
        }
        resolvedMedia={
          previewMedia[block.id] ?? null
        }
        menuOpen={menuAnchor === block.id}
        onOpenMenu={openMenu}
        onCloseMenu={closeMenu}
        onInsertBefore={(type) =>
          addBlock(type, block.id, true)
        }
        onInsertAfter={(type) =>
          addBlock(type, block.id)
        }
        onUpdateText={(value) =>
          updateText(block.id, value)
        }
        onTextSelect={(target) =>
          captureTextSelection(block, target)
        }
        onTextPaste={(event) =>
          handleTextPaste(event, block)
        }
        onOpenKnowledge={(selectionType) => {
          if (!activeSelection) return;

          setKnowledgePopup({
            ...activeSelection,
            type: selectionType,
          });
        }}
                onRemoveKnowledge={(referenceId) =>
          removeKnowledgeReference(
            block.id,
            referenceId,
          )
        }

        resolvedKnowledge={knowledgeMap}

        onUpdatePatch={(patch) =>
          updatePatch(block.id, patch)
        }

        onUpdateListItem={(itemIndex, value) =>
          updateListItem(
            block.id,
            itemIndex,
            value,
          )
        }

        onAddListItem={(itemIndex) =>
          addListItem(block.id, itemIndex)
        }

        onChooseResource={(resourceId) =>
          chooseResource(
            block.id,
            resourceId,
          )
        }

        onClearImage={() =>
          updatePatch(block.id, {
            url: "",
            resourceId: undefined,
            alt: "",
          })
        }

        onUpdateLinkedAsset={(patch) =>
          updatePatch(block.id, patch)
        }

        onUpdateMedia={(patch) =>
          updatePatch(block.id, patch)
        }

        onActivate={() =>
          setActiveBlockId(block.id)
        }

        onMovePeriod={(periodId) =>
          moveCurrentBlockToPeriod(
            block.id,
            periodId,
          )
        }

        onDuplicate={() =>
          duplicateCurrentBlock(block.id)
        }

        onDelete={() =>
          deleteBlock(block.id, index)
        }

        onMoveUp={() =>
          moveCurrentBlock(block.id, -1)
        }

        onMoveDown={() =>
          moveCurrentBlock(block.id, 1)
        }

        onKeyDown={(
          event,
          currentBlock,
          currentIndex,
          currentValue,
        ) =>
          handleTextKeyDown(
            event,
            currentBlock,
            currentIndex,
            currentValue,
          )
        }

                onListKeyDown={(
          event,
          currentBlock,
          itemIndex,
          itemValue,
        ) =>
          handleListKeyDown(
            event,
            currentBlock,
            itemIndex,
            itemValue,
          )
        }
      />
      ))}
</Canvas>

        <div className="border-t border-slate-200 bg-white/90 px-4 py-3 text-xs font-semibold text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-700">{nodeType}</span>
            <span className="text-slate-300">/</span>
            <span className="truncate">{title || "Untitled"}</span>
            <span className="ml-auto">Words {wordCount}</span>
            <span className="text-slate-300">/</span>
            <span>
              {lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Not saved in this session"}
            </span>
          </div>
        </div>
      </section>

      {saveMessage ? <p className="text-sm font-semibold text-slate-500">{saveMessage}</p> : null}
      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

      {menuAnchor ? (
        <BlockInsertMenu onClose={closeMenu} onPick={(type) => addBlock(type, menuAnchor)} />
      ) : null}
      {knowledgePopup ? (
        <KnowledgeReferencePopup
          selection={knowledgePopup}
          definitions={knowledgeDefinitions}
          searchAction={searchKnowledgeAction}
          saveAction={saveKnowledgeAction}
          onChoose={(definition) => addKnowledgeReference(knowledgePopup, definition)}
          onClose={() => setKnowledgePopup(null)}
        />
      ) : null}
      <DraftPreviewDrawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        mode={previewMode}
        document={contentDoc}
        linkedAssets={previewLinkedAssets}
        activities={resolvedActivities}
        worksheets={resolvedWorksheets}
        media={previewMedia}
        sectionDefinitions={sectionDefinitions}
        knowledgeDefinitions={knowledgeMap}
      />
      <ReleaseHistoryDrawer
        open={releasePanelOpen}
        onClose={() => setReleasePanelOpen(false)}
        summary={releaseSummary}
        transitionAction={transitionReleaseAction}
        rollbackAction={rollbackReleaseAction}
        bulkPublishAction={bulkPublishAction}
        previewBaseHref={previewBaseHref}
      />
      <InsertContentDrawer
        open={insertKind !== null}
        kind={insertKind}
        resources={resourceChoices}
        mediaOptions={mediaLibrary}
        assetOptions={assetLibrary}
        status={insertStatus}
        error={insertError}
        uploadProgress={uploadProgress}
        busy={isRunningInsert}
        onClose={closeInsertSurface}
        onChooseImage={(resource) => {
          if (!insertAnchorId) return;
          insertImageResource(resource, insertAnchorId);
          closeInsertSurface();
        }}
        onChooseAsset={(option) => {
          if (!insertAnchorId) return;
          insertLinkedAssetOption(option, insertAnchorId);
          closeInsertSurface();
        }}
        onChooseMedia={(option) => {
          if (!insertAnchorId) return;
          insertMediaOption(option, insertAnchorId);
          closeInsertSurface();
        }}
        onUploadResource={(input) =>
          startInsertTransition(async () => {
            try {
              setInsertStatus("Uploading resource...");
              setInsertError("");
              const resource = await createPublisherResource({
                file: input.file,
                scope: "resource-file",
                title: input.title,
                type: input.type,
                audience: input.audience,
              });
              if (!insertAnchorId) return;
              if (insertKind === "image") {
                insertImageResource(resource, insertAnchorId, input.image);
              } else if (insertKind === "media") {
                insertResourceAsMedia(
                  resource,
                  insertAnchorId,
                  input.type === ResourceType.AUDIO
                    ? "audio"
                    : input.file.type === "image/gif" || input.file.type === "image/svg+xml"
                      ? "animation"
                      : input.type === ResourceType.INTERACTIVE
                        ? "simulation"
                        : "video",
                );
              } else {
                insertResourceAsLinkedAsset(resource, insertAnchorId);
              }
              setInsertStatus("Inserted");
              closeInsertSurface();
            } catch (cause) {
              setInsertStatus("");
              setInsertError(cause instanceof Error ? cause.message : "Unable to insert resource.");
            }
          })
        }
      />
      <BuilderStudioDrawer
        open={builderKind !== null}
        kind={builderKind}
        tab={builderTab}
        chapterId={chapterId}
        activityRows={activityLibraryRows}
        activityResources={activityResources}
        worksheetRows={worksheetLibraryRows}
        worksheetLookups={worksheetLookups}
        exerciseRows={exerciseLibraryRows}
        exerciseLookups={exerciseLookups}
        saveActivityAction={saveActivityAction}
        duplicateActivityAction={duplicateActivityAction}
        archiveActivityAction={archiveActivityAction}
        moveActivityAction={moveActivityAction}
        saveWorksheetAction={saveWorksheetAction}
        duplicateWorksheetAction={duplicateWorksheetAction}
        archiveWorksheetAction={archiveWorksheetAction}
        moveWorksheetAction={moveWorksheetAction}
        saveExerciseAction={saveExerciseStudioAction}
        saveExerciseGroupAction={saveExerciseGroupAction}
        saveExerciseQuestionAction={saveExerciseQuestionAction}
        moveExerciseQuestionAction={moveExerciseQuestionAction}
        duplicateExerciseQuestionAction={duplicateExerciseQuestionAction}
        archiveExerciseQuestionAction={archiveExerciseQuestionAction}
        archiveExerciseAction={archiveExerciseAction}
        createWorksheetExerciseAction={createWorksheetExerciseAction}
        onClose={closeBuilderSurface}
        onChangeTab={setBuilderTab}
        onInsertExisting={(targetType, targetId) => {
          if (!insertAnchorId) return;
          const option = assetLibrary.find(
            (entry) => entry.targetType === targetType && entry.targetId === targetId,
          );
          if (!option) {
            setInsertError("This record is not available in the current content scope.");
            return;
          }
          insertLinkedAssetOption(option, insertAnchorId);
          closeBuilderSurface();
        }}
        onCreated={(kind, id) => {
          if (!insertAnchorId) return;
          insertCreatedStudioAsset(kind, id, insertAnchorId);
          closeBuilderSurface();
        }}
      />
    </div>
  );
}

function BlockEditor({
  bookId,
  block,
  index,
  resources,
  assetOptions,
  mediaOptions,
  sectionDefinitions,
  periods,
  resolvedAsset,
  resolvedMedia,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
  onInsertBefore,
  onInsertAfter,
  onUpdateText,
  onTextSelect,
  onTextPaste,
  onOpenKnowledge,
  onRemoveKnowledge,
  resolvedKnowledge,
  onUpdatePatch,
  onUpdateListItem,
  onAddListItem,
  onChooseResource,
  onClearImage,
  onUpdateLinkedAsset,
  onUpdateMedia,
  onActivate,
  onMovePeriod,
  onKeyDown,
  onListKeyDown,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  bookId: string;
  block: ContentBlock;
  index: number;
  resources: ResourceChoice[];
  assetOptions: ContentStudioAssetOption[];
  mediaOptions: ContentStudioMediaOption[];
  sectionDefinitions: ContentSectionDefinitionSummary[];
  periods: ContentDocument["periods"];
  resolvedAsset: ResolvedLinkedAsset | null;
  resolvedMedia: ResolvedMediaBlock | null;
  menuOpen: boolean;
  onOpenMenu: (anchorId: string) => void;
  onCloseMenu: () => void;
  onInsertBefore: (type: ContentBlockType) => void;
  onInsertAfter: (type: ContentBlockType) => void;
  onUpdateText: (value: string) => void;
  onTextSelect: (target: HTMLInputElement | HTMLTextAreaElement) => void;
  onTextPaste: (event: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onOpenKnowledge: (
    type: KnowledgeReferenceType,
    target?: HTMLInputElement | HTMLTextAreaElement,
  ) => void;
  onRemoveKnowledge: (referenceId: string) => void;
  resolvedKnowledge: Record<string, KnowledgeDefinitionSummary | null>;
  onUpdatePatch: (patch: Partial<ContentBlock>) => void;
  onUpdateListItem: (itemIndex: number, value: string) => void;
  onAddListItem: (itemIndex: number) => void;
  onChooseResource: (resourceId: string) => void;
  onClearImage: () => void;
  onUpdateLinkedAsset: (patch: Partial<LinkedAssetBlock>) => void;
  onUpdateMedia: (patch: Partial<MediaBlock>) => void;
  onActivate: () => void;
  onMovePeriod: (periodId: string) => void;
  onKeyDown: (
    event: KeyboardEvent<HTMLElement>,
    block: ContentBlock,
    index: number,
    currentValue: string,
  ) => void;
  onListKeyDown: (
    event: KeyboardEvent<HTMLInputElement>,
    block: ContentBlock,
    itemIndex: number,
    itemValue: string,
  ) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const shell = "group rounded-xl px-1 py-2 transition hover:bg-white/45";
  const actionButton =
    "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700";
  const collapsed = block.collapsed === true;

  return (
    <article className={shell} onFocusCapture={onActivate} onMouseDown={onActivate}>
      <div className="mb-1 flex min-h-7 flex-wrap items-center gap-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{blockLabel(block.type)}</span>
        <select value={block.periodId ?? periods[0]?.id ?? ""} onChange={(event) => onMovePeriod(event.target.value)} aria-label="Move block to period" className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">
          {periods.map((period) => <option key={period.id} value={period.id}>{period.title}</option>)}
        </select>
        <div className="ml-auto flex flex-wrap gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => onUpdatePatch({ collapsed: !collapsed })}
            className={actionButton}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
          <button
            type="button"
            onClick={() => onUpdatePatch({ hidden: !block.hidden })}
            className={actionButton}
          >
            {block.hidden ? "Show" : "Hide"}
          </button>
          <button type="button" onClick={onMoveUp} className={actionButton}>
            <ChevronUp className="mr-1 inline h-3.5 w-3.5" />
            Up
          </button>
          <button type="button" onClick={onMoveDown} className={actionButton}>
            <ChevronDown className="mr-1 inline h-3.5 w-3.5" />
            Down
          </button>
          <button type="button" onClick={onDuplicate} className={actionButton}>
            <Copy className="mr-1 inline h-3.5 w-3.5" />
            Duplicate
          </button>
          <button type="button" onClick={onDelete} className={actionButton}>
            <Trash2 className="mr-1 inline h-3.5 w-3.5" />
            Delete
          </button>
          <button type="button" onClick={() => onOpenMenu(block.id)} className={actionButton}>
            <Slash className="mr-1 inline h-3.5 w-3.5" />
            Insert
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="hidden grid gap-3 rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-slate-200 lg:grid-cols-5">
          <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
            Optional title
            <input
              value={block.title ?? ""}
              onChange={(event) => onUpdatePatch({ title: event.target.value || undefined })}
              className={field}
              placeholder="Section label"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Icon
            <input
              value={block.icon ?? ""}
              onChange={(event) => onUpdatePatch({ icon: event.target.value || undefined })}
              className={field}
              placeholder="Optional icon"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Alignment
            <select
              value={block.align ?? "left"}
              onChange={(event) => onUpdatePatch({ align: event.target.value as BlockAlignment })}
              className={field}
            >
              {BLOCK_ALIGNMENTS.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Background
            <select
              value={block.backgroundStyle ?? "none"}
              onChange={(event) =>
                onUpdatePatch({ backgroundStyle: event.target.value as BlockBackgroundStyle })
              }
              className={field}
            >
              {BLOCK_BACKGROUND_STYLES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Border
            <select
              value={block.borderStyle ?? "none"}
              onChange={(event) =>
                onUpdatePatch({ borderStyle: event.target.value as BlockBorderStyle })
              }
              className={field}
            >
              {BLOCK_BORDER_STYLES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>
        </div>

        {collapsed ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            This block is collapsed. Expand it to continue editing.
          </div>
        ) : null}

        {isTextBlock(block) ? (
  <TextBlockEditor
    block={block}
    index={index}
    collapsed={collapsed}
    onUpdateText={onUpdateText}
    onUpdateAttribution={(value) =>
      onUpdatePatch({
        attribution: value || undefined,
      })
    }
    onTextSelect={onTextSelect}
    onTextPaste={onTextPaste}
    onContextKnowledge={(event) =>
      openKnowledgeFromContext(
        event,
        onTextSelect,
        onOpenKnowledge,
      )
    }
    onKeyDown={onKeyDown}
  />
) : null}

        {!collapsed && isTextBlock(block) && block.knowledgeReferences?.length ? (
          <KnowledgeReferenceBadges
            references={block.knowledgeReferences}
            resolvedKnowledge={resolvedKnowledge}
            onRemove={onRemoveKnowledge}
          />
        ) : null}

        {isListBlock(block) ? (
  <ListBlockEditor
    block={block}
    collapsed={collapsed}
    onUpdateListItem={onUpdateListItem}
    onAddListItem={onAddListItem}
    onListKeyDown={onListKeyDown}
  />
) : null}

        {!collapsed && isImageBlock(block) ? (
  <ImageBlockEditor
    bookId={bookId}
    block={block}
    resources={resources}
    onChooseResource={onChooseResource}
    onClearImage={onClearImage}
    onUpdatePatch={onUpdatePatch}
    onKeyDown={(event, currentValue) =>
      onKeyDown(event, block, index, currentValue)
    }
  />
) : null}

        {!collapsed && isImageGalleryBlock(block) ? (
          <ImageGalleryEditor block={block} resources={resources} onUpdatePatch={onUpdatePatch} />
        ) : null}

        {!collapsed && isTableBlock(block) ? (
          <TableBlockEditor block={block} onUpdatePatch={onUpdatePatch} />
        ) : null}

        {!collapsed && isFormulaBlock(block) ? (
          <div className="grid gap-3 lg:grid-cols-3">
            <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
              Expression
              <input
                data-block-id={block.id}
                value={block.expression}
                onChange={(event) => onUpdatePatch({ expression: event.target.value })}
                onKeyDown={(event) => onKeyDown(event, block, index, block.expression)}
                className={field}
                placeholder="E = mc^2"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Display
              <select
                value={block.displayMode ?? "block"}
                onChange={(event) =>
                  onUpdatePatch({
                    displayMode: event.target.value as (typeof FORMULA_DISPLAY_MODES)[number],
                  })
                }
                className={field}
              >
                {FORMULA_DISPLAY_MODES.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {!collapsed && isInfoBoxBlock(block) ? (
          <div className="grid gap-3 lg:grid-cols-3">
            <label className="block text-sm font-semibold text-slate-700">
              Variant
              <select
                value={block.variant}
                onChange={(event) =>
                  onUpdatePatch({ variant: event.target.value as InfoBoxVariant })
                }
                className={field}
              >
                {INFO_BOX_VARIANTS.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
              Content
              <textarea
                data-block-id={block.id}
                value={block.text}
                onChange={(event) => onUpdatePatch({ text: event.target.value })}
                onKeyDown={(event) => onKeyDown(event, block, index, block.text)}
                rows={4}
                className={field}
                placeholder="Write the teaching note"
              />
            </label>
          </div>
        ) : null}

        {!collapsed && isSequenceBlock(block) ? (
          <SequenceBlockEditor block={block} onUpdatePatch={onUpdatePatch} />
        ) : null}

        {!collapsed && isObservationBoxBlock(block) ? (
          <textarea
            data-block-id={block.id}
            value={block.text}
            onChange={(event) => onUpdatePatch({ text: event.target.value })}
            onKeyDown={(event) => onKeyDown(event, block, index, block.text)}
            rows={4}
            className={field}
            placeholder="Write the observation"
          />
        ) : null}

        {!collapsed && isLinkedAssetBlock(block) ? (
          <LinkedAssetEditor
            block={block}
            assetOptions={assetOptions}
            sectionDefinitions={sectionDefinitions}
            resolvedAsset={resolvedAsset}
            onUpdate={onUpdateLinkedAsset}
          />
        ) : null}

        {!collapsed && isMediaBlock(block) ? (
          <MediaBlockEditor
            block={block}
            mediaOptions={mediaOptions}
            resources={resources}
            sectionDefinitions={sectionDefinitions}
            resolvedMedia={resolvedMedia}
            onUpdate={onUpdateMedia}
          />
        ) : null}

        {!collapsed && block.type === "divider" ? (
          <div className="flex items-center gap-3">
            <hr className="flex-1 border-slate-200" />
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Divider
            </span>
            <hr className="flex-1 border-slate-200" />
          </div>
        ) : null}

        {!collapsed && isPlaceholderBlock(block) ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            Placeholder renderer foundation only. Editing logic for this component comes in a later sprint.
          </div>
        ) : null}
      </div>

      {menuOpen ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <BlockInsertMenu compact onClose={onCloseMenu} onPick={(type) => onInsertAfter(type)} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onInsertBefore("paragraph")}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Insert above
            </button>
            <button
              type="button"
              onClick={() => onInsertAfter("paragraph")}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Insert below
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ImageGalleryEditor({
  block,
  resources,
  onUpdatePatch,
}: {
  block: Extract<ContentBlock, { type: "imageGallery" }>;
  resources: ResourceChoice[];
  onUpdatePatch: (patch: Partial<ContentBlock>) => void;
}) {
  function updateImage(imageId: string, patch: Record<string, unknown>) {
    onUpdatePatch({
      images: block.images.map((image) => (image.id === imageId ? { ...image, ...patch } : image)),
    });
  }

  function addImage() {
    onUpdatePatch({
      images: [...block.images, { id: `img_${Date.now().toString(36)}`, url: "", alt: "" }],
    });
  }

  function removeImage(imageId: string) {
    onUpdatePatch({
      images: block.images.filter((image) => image.id !== imageId),
    });
  }

  return (
    <div className="space-y-4">
      {block.images.map((image, index) => (
        <div key={image.id} className="rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-700">Gallery image {index + 1}</p>
            <button type="button" onClick={() => removeImage(image.id)} className="text-xs font-semibold text-rose-700">
              Remove
            </button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Resource
              <select
                value={image.resourceId ?? ""}
                onChange={(event) => {
                  const resource = resources.find((entry) => entry.id === event.target.value) ?? null;
                  updateImage(image.id, {
                    resourceId: resource?.id,
                    url:
                      sanitizeUrl(resource?.thumbnail ?? "") ||
                      sanitizeUrl(resource?.fileUrl ?? "") ||
                      "",
                    alt: resource?.title ?? image.alt,
                  });
                }}
                className={field}
              >
                <option value="">Select resource</option>
                {resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              URL
              <input
                value={image.url}
                onChange={(event) => updateImage(image.id, { url: event.target.value, resourceId: undefined })}
                className={field}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Alt
              <input
                value={image.alt}
                onChange={(event) => updateImage(image.id, { alt: event.target.value })}
                className={field}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Caption
              <input
                value={image.caption ?? ""}
                onChange={(event) => updateImage(image.id, { caption: event.target.value })}
                className={field}
              />
            </label>
          </div>
        </div>
      ))}
      <button type="button" onClick={addImage} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
        Add gallery image
      </button>
    </div>
  );
}

function SequenceBlockEditor({
  block,
  onUpdatePatch,
}: {
  block: Extract<ContentBlock, { type: "timeline" | "processFlow" | "stepList" }>;
  onUpdatePatch: (patch: Partial<ContentBlock>) => void;
}) {
  function updateItem(itemId: string, patch: Record<string, unknown>) {
    onUpdatePatch({
      items: block.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    });
  }
  function addItem() {
    onUpdatePatch({
      items: [...block.items, { id: `seq_${Date.now().toString(36)}`, title: "", description: "" }],
    });
  }
  return (
    <div className="space-y-4">
      {block.items.map((item, index) => (
        <div key={item.id} className="grid gap-3 rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-slate-200 lg:grid-cols-3">
          <label className="block text-sm font-semibold text-slate-700">
            Step
            <input
              value={item.title}
              onChange={(event) => updateItem(item.id, { title: event.target.value })}
              className={field}
              placeholder={`${blockLabel(block.type)} ${index + 1}`}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Icon
            <input
              value={item.icon ?? ""}
              onChange={(event) => updateItem(item.id, { icon: event.target.value || undefined })}
              className={field}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700 lg:col-span-3">
            Description
            <textarea
              value={item.description ?? ""}
              onChange={(event) => updateItem(item.id, { description: event.target.value })}
              rows={3}
              className={field}
            />
          </label>
        </div>
      ))}
      <button type="button" onClick={addItem} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
        Add item
      </button>
    </div>
  );
}

function KnowledgeReferenceBadges({
  references,
  resolvedKnowledge,
  onRemove,
}: {
  references: KnowledgeReference[];
  resolvedKnowledge: Record<string, KnowledgeDefinitionSummary | null>;
  onRemove: (referenceId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      {references.map((reference) => {
        const definition = resolvedKnowledge[knowledgeMapKey(reference.type, reference.targetId)] ?? null;
        const broken = !definition;
        return (
          <span
            key={reference.id}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
              reference.type === "VOCABULARY"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-indigo-100 text-indigo-800"
            }`}
          >
            {reference.label}
            {broken ? <span className="text-rose-700">Broken</span> : null}
            <button
              type="button"
              onClick={() => onRemove(reference.id)}
              className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
            >
              Remove
            </button>
          </span>
        );
      })}
    </div>
  );
}

function KnowledgeReferencePopup({
  selection,
  definitions,
  searchAction,
  saveAction,
  onChoose,
  onClose,
}: {
  selection: KnowledgePopupState;
  definitions: KnowledgeDefinitionSummary[];
  searchAction: (query: string) => Promise<KnowledgeDefinitionSummary[]>;
  saveAction: (
    type: KnowledgeReferenceType,
    data: FormData,
  ) => Promise<KnowledgeDefinitionSummary | undefined>;
  onChoose: (definition: KnowledgeDefinitionSummary) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(selection.text);
  const [results, setResults] = useState(
    definitions.filter((definition) => definition.type === selection.type).slice(0, 8),
  );
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function search(nextQuery: string) {
    setQuery(nextQuery);
    setError("");
    try {
      const next = await searchAction(nextQuery);
      setResults(next.filter((definition) => definition.type === selection.type).slice(0, 8));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Knowledge search failed.");
    }
  }

  async function submit(formData: FormData) {
    setStatus("Saving knowledge...");
    setError("");
    try {
      const definition = await saveAction(selection.type, formData);
      if (!definition) throw new Error("Knowledge definition was not returned.");
      onChoose(definition);
    } catch (cause) {
      setStatus("");
      setError(cause instanceof Error ? cause.message : "Unable to save knowledge definition.");
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/20 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              {knowledgeReferenceTypeLabel(selection.type)}
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-950">{selection.text}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
            Close
          </button>
        </div>

        <div className="mt-4 rounded-[1.25rem] bg-slate-50 p-3 ring-1 ring-slate-200">
          <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            Search Existing
            <input
              value={query}
              onChange={(event) => void search(event.target.value)}
              className={field}
              placeholder="Search term, title, slug or tag"
            />
          </label>
          <div className="mt-3 space-y-2">
            {results.map((definition) => (
              <button
                key={`${definition.type}:${definition.id}`}
                type="button"
                onClick={() => onChoose(definition)}
                className="w-full rounded-2xl bg-white px-4 py-3 text-left ring-1 ring-slate-200 hover:ring-slate-300"
              >
                <p className="text-sm font-bold text-slate-900">{definition.label}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{definition.primaryText}</p>
              </button>
            ))}
            {!results.length ? <p className="text-sm text-slate-500">No matching definitions yet.</p> : null}
          </div>
        </div>

        <form action={submit} className="mt-4 space-y-3 rounded-[1.25rem] bg-[#fcfaf5] p-4 ring-1 ring-slate-200">
          {selection.type === "VOCABULARY" ? (
            <VocabularyFields text={selection.text} />
          ) : (
            <ConceptFields text={selection.text} />
          )}
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              <input type="checkbox" name="active" defaultChecked />
              Active
            </label>
            <label className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              <input type="checkbox" name="published" />
              Published
            </label>
            <button type="submit" className="ml-auto rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">
              Save and Mark
            </button>
          </div>
          {status ? <p className="text-xs font-semibold text-slate-500">{status}</p> : null}
          {error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}

function VocabularyFields({ text }: { text: string }) {
  return (
    <>
      <label className="block text-sm font-semibold text-slate-700">
        Term
        <input name="term" required defaultValue={text} className={field} />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Meaning
        <textarea name="meaning" required rows={3} className={field} />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Simple Meaning
        <textarea name="simpleMeaning" rows={2} className={field} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Pronunciation
          <input name="pronunciation" className={field} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Language
          <input name="language" defaultValue="en" className={field} />
        </label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Example
        <textarea name="example" rows={2} className={field} />
      </label>
      <KnowledgeCommonFields />
    </>
  );
}

function ConceptFields({ text }: { text: string }) {
  return (
    <>
      <label className="block text-sm font-semibold text-slate-700">
        Title
        <input name="title" required defaultValue={text} className={field} />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Definition
        <textarea name="definition" required rows={3} className={field} />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Summary
        <textarea name="summary" rows={2} className={field} />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Related Topics
        <input name="relatedTopics" placeholder="comma separated" className={field} />
      </label>
      <KnowledgeCommonFields concept />
    </>
  );
}

function KnowledgeCommonFields({ concept = false }: { concept?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-slate-700">
        Difficulty
        <input name="difficulty" className={field} />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Tags
        <input name="tags" placeholder="comma separated" className={field} />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Image Resource ID
        <input name="imageResourceId" className={field} />
      </label>
      {concept ? (
        <>
          <label className="block text-sm font-semibold text-slate-700">
            Video Resource ID
            <input name="videoResourceId" className={field} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Diagram Resource ID
            <input name="diagramResourceId" className={field} />
          </label>
        </>
      ) : (
        <label className="block text-sm font-semibold text-slate-700">
          Audio Resource ID
          <input name="audioResourceId" className={field} />
        </label>
      )}
    </div>
  );
}

function BlockInsertMenu({
  compact = false,
  onClose,
  onPick,
}: {
  compact?: boolean;
  onClose: () => void;
  onPick: (type: ContentBlockType) => void;
}) {
  const types: ContentBlockType[] = ALL_BLOCK_TYPES;

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-3 ${compact ? "" : "shadow-lg"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
          Insert block
        </p>
        <button type="button" onClick={onClose} className="text-xs font-semibold text-slate-500">
          Close
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {types.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onPick(type)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {blockLabel(type)}
          </button>
        ))}
      </div>
    </div>
  );
}

function UnifiedAddMenu({
  canOpenScopedBuilders,
  onPick,
}: {
  canOpenScopedBuilders: boolean;
  onPick: (kind: ToolbarInsertKind) => void;
}) {
  const items: Array<{ kind: ToolbarInsertKind; label: string; disabled?: boolean }> = [
    { kind: "image", label: "Image" },
    { kind: "media", label: "Media" },
    { kind: "feature", label: "Feature Element" },
    { kind: "activity", label: "Activity", disabled: !canOpenScopedBuilders },
    { kind: "worksheet", label: "Worksheet", disabled: !canOpenScopedBuilders },
    { kind: "exercise", label: "Exercise", disabled: !canOpenScopedBuilders },
    { kind: "resource", label: "Resource" },
    { kind: "learningOutcome", label: "Learning Outcome" },
  ];

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Add to manuscript</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.kind}
            type="button"
            disabled={item.disabled}
            onClick={() => onPick(item.kind)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DraftPreviewDrawer({
  open,
  onClose,
  mode,
  document,
  linkedAssets,
  activities,
  worksheets,
  media,
  sectionDefinitions,
  knowledgeDefinitions,
}: {
  open: boolean;
  onClose: () => void;
  mode: PreviewSurfaceMode;
  document: ContentDocument;
  linkedAssets: Record<string, ResolvedLinkedAsset | null>;
  activities: Record<string, ResolvedActivityBlock>;
  worksheets: Record<string, ResolvedWorksheetBlock>;
  media: Record<string, ResolvedMediaBlock | null>;
  sectionDefinitions: ContentSectionDefinitionSummary[];
  knowledgeDefinitions: Record<string, KnowledgeDefinitionSummary | null>;
}) {
  return (
    <StudioBuilderDrawer
      open={open}
      title={`${previewModeLabel(mode)} Preview`}
      description="This preview renders the current unsaved manuscript draft without leaving the editor."
      onClose={onClose}
    >
      <div className="rounded-[1.75rem] bg-white p-6 ring-1 ring-slate-200">
        <ContentDocumentRenderer
          document={document}
          mode={mode === "WHITEBOARD" ? "ADMIN_PREVIEW" : (mode as ContentRenderMode)}
          linkedAssets={linkedAssets}
          activities={activities}
          worksheets={worksheets}
          media={media}
          sectionDefinitions={sectionDefinitions}
          knowledgeDefinitions={knowledgeDefinitions}
          className="mx-auto max-w-[60rem]"
        />
      </div>
    </StudioBuilderDrawer>
  );
}

function ReleaseHistoryDrawer({
  open,
  onClose,
  summary,
  transitionAction,
  rollbackAction,
  bulkPublishAction,
  previewBaseHref,
}: {
  open: boolean;
  onClose: () => void;
  summary: ReleaseSummary | null;
  transitionAction: ((
    action: "SUBMIT_REVIEW" | "RETURN_DRAFT" | "APPROVE" | "PUBLISH" | "UNPUBLISH" | "ARCHIVE" | "RESTORE",
    form: FormData,
  ) => Promise<void>) | null;
  rollbackAction: ((versionId: string, form: FormData) => Promise<void>) | null;
  bulkPublishAction: ((form: FormData) => Promise<void>) | null;
  previewBaseHref: string;
}) {
  if (!open) return null;

  return (
    <StudioBuilderDrawer
      open={open}
      title="Publishing Controls"
      description="Review lifecycle, validation, version history, and rollback for the selected manuscript node."
      onClose={onClose}
    >
      {summary && transitionAction && rollbackAction ? (
        <ContentReleasePanel
          summary={summary}
          transitionAction={transitionAction}
          rollbackAction={rollbackAction}
          bulkPublishAction={bulkPublishAction ?? undefined}
          previewBaseHref={previewBaseHref}
        />
      ) : (
        <div className="rounded-[1.5rem] bg-white p-5 text-sm text-slate-600 ring-1 ring-slate-200">
          Publishing controls are not available for this node.
        </div>
      )}
    </StudioBuilderDrawer>
  );
}

function InsertContentDrawer({
  open,
  kind,
  resources,
  mediaOptions,
  assetOptions,
  status,
  error,
  uploadProgress,
  busy,
  onClose,
  onChooseImage,
  onChooseAsset,
  onChooseMedia,
  onUploadResource,
}: {
  open: boolean;
  kind: ToolbarInsertKind | null;
  resources: ResourceChoice[];
  mediaOptions: ContentStudioMediaOption[];
  assetOptions: ContentStudioAssetOption[];
  status: string;
  error: string;
  uploadProgress: number;
  busy: boolean;
  onClose: () => void;
  onChooseImage: (resource: ResourceChoice) => void;
  onChooseAsset: (option: ContentStudioAssetOption) => void;
  onChooseMedia: (option: ContentStudioMediaOption) => void;
  onUploadResource: (input: {
    file: File;
    title: string;
    type: ResourceType;
    audience: ResourceAudience;
    image?: ImageInsertMetadata;
  }) => void;
}) {
  if (!open || !kind) return null;

  const imageChoices = resources.filter(
    (resource) => resource.type === ResourceType.IMAGE || resource.mimeType?.startsWith("image/"),
  );
  const linkedChoices = assetOptions.filter((option) => option.assetKind === kind);

  return (
    <StudioBuilderDrawer open={open} title={`Insert ${blockLabelForDrawer(kind)}`} onClose={onClose}>
      <div className="space-y-5">
        {kind === "image" ? (
          <>
            <LibrarySection
              title="Choose Existing Image"
              items={imageChoices.map((resource) => ({
                key: resource.id,
                title: resource.title,
                detail: resource.mimeType || "Image",
                onChoose: () => onChooseImage(resource),
              }))}
              emptyText="No compatible images are available in this publisher library."
            />
            <ResourceUploadCard
              title="Upload New Image"
              allowedTypes={[ResourceType.IMAGE]}
              imageMode
              busy={busy}
              status={status}
              error={error}
              uploadProgress={uploadProgress}
              onSubmit={onUploadResource}
            />
          </>
        ) : null}

        {kind === "media" ? (
          <>
            <LibrarySection
              title="Choose Existing Media"
              items={mediaOptions.map((option) => ({
                key: mediaKey(option.targetType, option.targetId),
                title: option.title,
                detail: `${mediaKindLabel(option.mediaKind)} · ${option.sourceBadge} · ${option.scopeLabel}`,
                onChoose: () => onChooseMedia(option),
              }))}
            />
            <ResourceUploadCard
              title="Upload New Media"
              allowedTypes={[ResourceType.VIDEO, ResourceType.AUDIO, ResourceType.INTERACTIVE, ResourceType.IMAGE]}
              fileAccept="video/*,audio/*,image/gif,image/svg+xml"
              busy={busy}
              status={status}
              error={error}
              uploadProgress={uploadProgress}
              onSubmit={onUploadResource}
            />
          </>
        ) : null}

        {kind === "resource" ? (
          <>
            <LibrarySection
              title="Choose Existing Resource"
              items={linkedChoices.map((option) => ({
                key: linkedAssetKey(option.targetType, option.targetId),
                title: option.title,
                detail: `${option.sourceBadge} · ${option.sourceDetail} · ${option.scopeLabel}`,
                onChoose: () => onChooseAsset(option),
              }))}
            />
            <ResourceUploadCard
              title="Upload New Resource"
              allowedTypes={[ResourceType.PDF, ResourceType.DOC, ResourceType.WORKSHEET, ResourceType.VIDEO, ResourceType.AUDIO, ResourceType.INTERACTIVE]}
              busy={busy}
              status={status}
              error={error}
              uploadProgress={uploadProgress}
              onSubmit={onUploadResource}
            />
          </>
        ) : null}

        {kind !== "image" && kind !== "media" && kind !== "resource" ? (
          <LibrarySection
            title={`Choose Existing ${blockLabelForDrawer(kind)}`}
            items={linkedChoices.map((option) => ({
              key: linkedAssetKey(option.targetType, option.targetId),
              title: option.title,
              detail: `${option.sourceBadge} · ${option.sourceDetail} · ${option.scopeLabel}`,
              onChoose: () => onChooseAsset(option),
            }))}
            emptyText={`No ${blockLabelForDrawer(kind).toLowerCase()} records are available in this scope.`}
          />
        ) : null}
      </div>
    </StudioBuilderDrawer>
  );
}

function BuilderStudioDrawer({
  open,
  kind,
  tab,
  chapterId,
  activityRows,
  activityResources,
  worksheetRows,
  worksheetLookups,
  exerciseRows,
  exerciseLookups,
  saveActivityAction,
  duplicateActivityAction,
  archiveActivityAction,
  moveActivityAction,
  saveWorksheetAction,
  duplicateWorksheetAction,
  archiveWorksheetAction,
  moveWorksheetAction,
  saveExerciseAction,
  saveExerciseGroupAction,
  saveExerciseQuestionAction,
  moveExerciseQuestionAction,
  duplicateExerciseQuestionAction,
  archiveExerciseQuestionAction,
  archiveExerciseAction,
  createWorksheetExerciseAction,
  onClose,
  onChangeTab,
  onInsertExisting,
  onCreated,
}: {
  open: boolean;
  kind: BuilderKind | null;
  tab: "existing" | "create";
  chapterId: string | null;
  activityRows: ActivityStudioRecord[];
  activityResources: ActivityResourceOption[];
  worksheetRows: WorksheetStudioRecord[];
  worksheetLookups: WorksheetLookupData | null;
  exerciseRows: ExerciseStudioData[];
  exerciseLookups: ExerciseLookupData | null;
  saveActivityAction: ((data: FormData) => Promise<string>) | null;
  duplicateActivityAction: ((activityId: string) => Promise<void>) | null;
  archiveActivityAction: ((activityId: string) => Promise<void>) | null;
  moveActivityAction: ((activityId: string, direction: -1 | 1) => Promise<void>) | null;
  saveWorksheetAction: ((data: FormData) => Promise<string>) | null;
  duplicateWorksheetAction: ((worksheetId: string) => Promise<void>) | null;
  archiveWorksheetAction: ((worksheetId: string) => Promise<void>) | null;
  moveWorksheetAction: ((worksheetId: string, direction: -1 | 1) => Promise<void>) | null;
  saveExerciseAction: ((data: FormData) => Promise<string>) | null;
  saveExerciseGroupAction: ((exerciseId: string, data: FormData) => Promise<void>) | null;
  saveExerciseQuestionAction: ((exerciseId: string, data: FormData) => Promise<void>) | null;
  moveExerciseQuestionAction: ((exerciseId: string, questionId: string, direction: -1 | 1) => Promise<void>) | null;
  duplicateExerciseQuestionAction: ((exerciseId: string, questionId: string) => Promise<void>) | null;
  archiveExerciseQuestionAction: ((exerciseId: string, questionId: string, archived: boolean) => Promise<void>) | null;
  archiveExerciseAction: ((exerciseId: string, archived: boolean) => Promise<void>) | null;
  createWorksheetExerciseAction: ((data: FormData) => Promise<string>) | null;
  onClose: () => void;
  onChangeTab: (tab: "existing" | "create") => void;
  onInsertExisting: (targetType: string, targetId: string) => void;
  onCreated: (kind: BuilderKind, id: string) => void;
}) {
  if (!open || !kind || !chapterId) return null;

  return (
    <StudioBuilderDrawer
      open={open}
      title={`${kind[0].toUpperCase()}${kind.slice(1)} Builder`}
      description="Choose an existing reusable record or create a new one without leaving the manuscript."
      onClose={onClose}
    >
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => onChangeTab("existing")}
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${tab === "existing" ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}
        >
          Choose Existing
        </button>
        <button
          type="button"
          onClick={() => onChangeTab("create")}
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${tab === "create" ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}
        >
          Create New
        </button>
      </div>

      {tab === "existing" ? (
        <LibrarySection
          title={`Available ${kind}s`}
          items={
            kind === "activity"
              ? activityRows.map((item) => ({
                  key: item.id,
                  title: item.title,
                  detail: item.activityType,
                  onChoose: () => onInsertExisting("CHAPTER_ACTIVITY", item.id),
                }))
              : kind === "worksheet"
                ? worksheetRows.map((item) => ({
                    key: item.id,
                    title: item.title,
                    detail: item.type,
                    onChoose: () => onInsertExisting("PUBLISHER_WORKSHEET", item.id),
                  }))
                : exerciseRows.map((item) => ({
                    key: item.id,
                    title: item.title,
                    detail: `${item.questions.length} questions`,
                    onChoose: () => onInsertExisting("BOOK_EXERCISE", item.id),
                  }))
          }
          emptyText={`No ${kind} records are available in this scope.`}
        />
      ) : null}

      {tab === "create" && kind === "activity" && saveActivityAction && duplicateActivityAction && archiveActivityAction && moveActivityAction ? (
        <div data-builder-dirty="true">
          <ActivityStudio
            chapterId={chapterId}
            activities={activityRows}
            resources={activityResources}
            modules={worksheetLookups?.modules ?? []}
            topics={worksheetLookups?.topics ?? []}
            saveAction={saveActivityAction}
            duplicateAction={duplicateActivityAction}
            archiveAction={archiveActivityAction}
            moveAction={moveActivityAction}
            initialSelectedId="new"
            onSaveComplete={(id) => onCreated("activity", id)}
          />
        </div>
      ) : null}

      {tab === "create" && kind === "worksheet" && saveWorksheetAction && duplicateWorksheetAction && archiveWorksheetAction && moveWorksheetAction && createWorksheetExerciseAction && worksheetLookups ? (
        <div data-builder-dirty="true">
          <WorksheetStudio
            chapterId={chapterId}
            worksheets={worksheetRows}
            lookups={worksheetLookups}
            saveAction={saveWorksheetAction}
            duplicateAction={duplicateWorksheetAction}
            archiveAction={archiveWorksheetAction}
            moveAction={moveWorksheetAction}
            createExerciseAction={createWorksheetExerciseAction}
            initialSelectedId="new"
            onSaveComplete={(id) => onCreated("worksheet", id)}
          />
        </div>
      ) : null}

      {tab === "create" && kind === "exercise" && saveExerciseAction && saveExerciseGroupAction && saveExerciseQuestionAction && moveExerciseQuestionAction && duplicateExerciseQuestionAction && archiveExerciseQuestionAction && archiveExerciseAction && exerciseLookups ? (
        <div data-builder-dirty="true">
          <ExerciseAuthoringStudio
            exercises={exerciseRows}
            lookups={exerciseLookups}
            saveExerciseAction={saveExerciseAction}
            saveGroupAction={saveExerciseGroupAction}
            saveQuestionAction={saveExerciseQuestionAction}
            moveQuestionAction={moveExerciseQuestionAction}
            duplicateQuestionAction={duplicateExerciseQuestionAction}
            archiveQuestionAction={archiveExerciseQuestionAction}
            archiveExerciseAction={archiveExerciseAction}
            initialExerciseId="new"
            onSaveComplete={(id) => onCreated("exercise", id)}
          />
        </div>
      ) : null}
    </StudioBuilderDrawer>
  );
}

function LibrarySection({
  title,
  items,
  emptyText = "No matching items.",
}: {
  title: string;
  items: { key: string; title: string; detail: string; onChoose: () => void }[];
  emptyText?: string;
}) {
  return (
    <section className="rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onChoose}
            className="w-full rounded-[1.25rem] border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
          >
            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
            <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
          </button>
        ))}
        {!items.length ? <p className="text-sm text-slate-500">{emptyText}</p> : null}
      </div>
    </section>
  );
}

function ResourceUploadCard({
  title,
  allowedTypes,
  imageMode = false,
  fileAccept,
  busy,
  status,
  error,
  uploadProgress,
  onSubmit,
}: {
  title: string;
  allowedTypes: ResourceType[];
  imageMode?: boolean;
  fileAccept?: string;
  busy: boolean;
  status: string;
  error: string;
  uploadProgress: number;
  onSubmit: (input: {
    file: File;
    title: string;
    type: ResourceType;
    audience: ResourceAudience;
    image?: ImageInsertMetadata;
  }) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const previewUrlRef = useRef("");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType>(allowedTypes[0] ?? ResourceType.PDF);
  const [audience, setAudience] = useState<ResourceAudience>(ResourceAudience.BOTH);
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [align, setAlign] = useState<BlockAlignment>("center");
  const [width, setWidth] = useState<ImageInsertMetadata["width"]>("wide");

  function chooseFile(nextFile: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreview = imageMode && nextFile ? URL.createObjectURL(nextFile) : "";
    previewUrlRef.current = nextPreview;
    setPreviewUrl(nextPreview);
    setFile(nextFile);
    if (nextFile && !resourceTitle) setResourceTitle(nextFile.name.replace(/\.[^.]+$/, ""));
  }

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  return (
    <section className="rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {!imageMode ? <label className="block text-sm font-semibold text-slate-700">
          Title
          <input value={resourceTitle} onChange={(event) => setResourceTitle(event.target.value)} className={field} />
        </label> : null}
        {!imageMode ? <label className="block text-sm font-semibold text-slate-700">
          Type
          <select value={resourceType} onChange={(event) => setResourceType(event.target.value as ResourceType)} className={field}>
            {allowedTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label> : null}
        <label className="block text-sm font-semibold text-slate-700">
          Audience
          <select value={audience} onChange={(event) => setAudience(event.target.value as ResourceAudience)} className={field}>
            <option value={ResourceAudience.BOTH}>Both</option>
            <option value={ResourceAudience.STUDENT}>Student</option>
            <option value={ResourceAudience.TEACHER_ONLY}>Teacher Only</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          File
          <input type="file" accept={fileAccept ?? (imageMode ? "image/jpeg,image/png,image/webp" : undefined)} onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} className={field} />
        </label>
      </div>
      {imageMode ? (
        <div className="mt-4 space-y-3">
          {previewUrl ? (
            // Local object URLs are intentionally used for the pre-upload preview.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Selected image preview" className="max-h-48 w-full rounded-2xl object-contain ring-1 ring-slate-200" />
          ) : null}
          <label className="block text-sm font-semibold text-slate-700">
            Alt text <span className="text-rose-600">*</span>
            <input value={alt} onChange={(event) => setAlt(event.target.value)} required className={field} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Caption
            <input value={caption} onChange={(event) => setCaption(event.target.value)} className={field} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">Alignment<select value={align} onChange={(event) => setAlign(event.target.value as BlockAlignment)} className={field}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
            <label className="block text-sm font-semibold text-slate-700">Width<select value={width} onChange={(event) => setWidth(event.target.value as ImageInsertMetadata["width"])} className={field}><option value="medium">Medium</option><option value="wide">Large</option><option value="full">Full</option></select></label>
          </div>
        </div>
      ) : null}
      {uploadProgress > 0 ? <p className="mt-3 text-sm font-semibold text-slate-500">Upload {uploadProgress}%</p> : null}
      {status ? <p className="mt-3 text-sm font-semibold text-slate-500">{status}</p> : null}
      {error ? <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
      <button
        type="button"
        disabled={!file || (!imageMode && !resourceTitle.trim()) || (imageMode && !alt.trim()) || busy}
        onClick={() => file && onSubmit({ file, title: imageMode ? alt.trim() : resourceTitle.trim(), type: resourceType, audience, image: imageMode ? { alt: alt.trim(), caption: caption.trim(), align, width } : undefined })}
        className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-45"
      >
        {busy ? "Uploading..." : "Upload and Insert"}
      </button>
    </section>
  );
}

function blockLabelForDrawer(kind: ToolbarInsertKind) {
  switch (kind) {
    case "image":
      return "Image";
    case "media":
      return "Media";
    case "feature":
      return "Feature Element";
    case "activity":
      return "Activity";
    case "worksheet":
      return "Worksheet";
    case "exercise":
      return "Exercise";
    case "resource":
      return "Resource";
    case "learningOutcome":
      return "Learning Outcome";
  }
}

function infoBoxToolbarLabel(variant: InfoBoxVariant) {
  return variant
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (value) => value.toUpperCase());
}

function buildLinkedAssetPreviewMap(
  document: ContentDocument,
  assetOptions: ContentStudioAssetOption[],
  resolvedAssets: Record<string, ResolvedLinkedAsset | null>,
) {
  const preview: Record<string, ResolvedLinkedAsset | null> = {};
  for (const block of document.blocks) {
    if (!isLinkedAssetBlock(block)) continue;
    preview[block.id] = resolveAssetForBlock(block, assetOptions, resolvedAssets[block.id] ?? null);
  }
  return preview;
}

function buildMediaPreviewMap(
  document: ContentDocument,
  mediaOptions: ContentStudioMediaOption[],
  resolvedMedia: Record<string, ResolvedMediaBlock | null>,
) {
  const preview: Record<string, ResolvedMediaBlock | null> = {};
  for (const block of document.blocks) {
    if (!isMediaBlock(block)) continue;
    preview[block.id] = resolveMediaForBlock(block, mediaOptions, resolvedMedia[block.id] ?? null);
  }
  return preview;
}

function countDocumentWords(input: {
  title: string;
  subtitle: string;
  description: string;
  content: ContentDocument;
}) {
  const parts = [input.title, input.subtitle, input.description];
  for (const block of input.content.blocks) {
    if (isTextBlock(block)) parts.push(block.text, block.attribution ?? "");
    if (isListBlock(block)) parts.push(...block.items);
    if (isFormulaBlock(block)) parts.push(block.expression);
    if (isInfoBoxBlock(block) || isObservationBoxBlock(block)) parts.push(block.text);
    if (isSequenceBlock(block)) {
      for (const item of block.items) parts.push(item.title, item.description ?? "");
    }
    if (isTableBlock(block)) {
      for (const row of block.rows) {
        for (const cell of row.cells) parts.push(cell.text);
      }
    }
  }
  return parts
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function blockContainsQuery(block: ContentBlock, query: string) {
  if (isTextBlock(block)) return block.text.toLowerCase().includes(query);
  if (isListBlock(block)) return block.items.some((item) => item.toLowerCase().includes(query));
  if (isFormulaBlock(block)) return block.expression.toLowerCase().includes(query);
  if (isInfoBoxBlock(block) || isObservationBoxBlock(block)) return block.text.toLowerCase().includes(query);
  if (isSequenceBlock(block)) {
    return block.items.some(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        (item.description ?? "").toLowerCase().includes(query),
    );
  }
  if (isTableBlock(block)) {
    return block.rows.some((row) =>
      row.cells.some((cell) => cell.text.toLowerCase().includes(query)),
    );
  }
  if ("title" in block && typeof block.title === "string" && block.title.toLowerCase().includes(query)) {
    return true;
  }
  return false;
}

function serializeSnapshot(input: {
  title: string;
  subtitle: string;
  description: string;
  slug: string;
  label: string;
  estimatedMinutes: string;
  published: boolean;
  content: ContentDocument;
}) {
  return JSON.stringify({
    title: input.title.trim(),
    subtitle: input.subtitle.trim(),
    description: input.description.trim(),
    slug: input.slug.trim(),
    label: input.label.trim(),
    estimatedMinutes: input.estimatedMinutes.trim(),
    published: input.published,
    content: input.content,
  });
}
function buildPlainTextExport(input: {
  title: string;
  subtitle: string;
  description: string;
  content: ContentDocument;
}) {
  const parts = [input.title, input.subtitle, input.description].filter(Boolean);
  for (const block of input.content.blocks) {
    if (isTextBlock(block)) parts.push(block.text);
    if (isListBlock(block)) parts.push(...block.items.map((item) => `- ${item}`));
    if (isFormulaBlock(block)) parts.push(block.expression);
    if (isInfoBoxBlock(block) || isObservationBoxBlock(block)) parts.push(block.text);
    if (isSequenceBlock(block)) {
      for (const item of block.items) parts.push(item.title, item.description ?? "");
    }
    if (isTableBlock(block)) {
      for (const row of block.rows) parts.push(row.cells.map((cell) => cell.text).join(" | "));
    }
  }
  return parts.filter(Boolean).join("\n\n");
}

function previewModeLabel(mode: PreviewSurfaceMode) {
  switch (mode) {
    case "STUDENT":
      return "Student View";
    case "TEACHER":
      return "Teacher View";
    case "WHITEBOARD":
      return "Whiteboard View";
  }
}

function openKnowledgeFromContext(
  event: MouseEvent<HTMLInputElement | HTMLTextAreaElement>,
  onTextSelect: (target: HTMLInputElement | HTMLTextAreaElement) => void,
  onOpenKnowledge: (
    type: KnowledgeReferenceType,
    target?: HTMLInputElement | HTMLTextAreaElement,
  ) => void,
) {
  if ((event.currentTarget.selectionEnd ?? 0) <= (event.currentTarget.selectionStart ?? 0)) return;
  event.preventDefault();
  onTextSelect(event.currentTarget);
  onOpenKnowledge("CONCEPT", event.currentTarget);
}

function knowledgeMapKey(type: KnowledgeReferenceType, id: string) {
  return `${type}:${id}`;
}

function stableReferenceId() {
  return `kr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function resolveAssetForBlock(
  block: LinkedAssetBlock,
  assetOptions: ContentStudioAssetOption[],
  fallback: ResolvedLinkedAsset | null,
) {
  const option =
    assetOptions.find(
      (entry) =>
        entry.targetType === block.targetType && entry.targetId === block.targetId,
    ) ?? null;
  if (!option) return fallback;
  return {
    assetKind: option.assetKind,
    targetType: option.targetType,
    targetId: option.targetId,
    title: option.title,
    label: block.label,
    sourceBadge: option.sourceBadge,
    sourceDetail: option.sourceDetail,
    scopeLabel: option.scopeLabel,
    teacherOnly: option.teacherOnly,
    audienceOptions: option.audienceOptions,
    openModes: option.openModes,
    route: option.route,
    available: true,
  };
}

function resolveMediaForBlock(
  block: MediaBlock,
  mediaOptions: ContentStudioMediaOption[],
  fallback: ResolvedMediaBlock | null,
) {
  const option =
    mediaOptions.find(
      (entry) =>
        entry.targetType === block.targetType &&
        entry.targetId === block.targetId &&
        entry.mediaKind === block.mediaKind,
    ) ?? null;
  if (!option) return fallback;
  return {
    mediaKind: block.mediaKind,
    targetType: block.targetType,
    targetId: block.targetId,
    title: option.title,
    label: block.label || option.defaultLabel,
    caption: block.caption ?? null,
    sourceBadge: option.sourceBadge,
    sourceDetail: option.sourceDetail,
    scopeLabel: option.scopeLabel,
    route: option.route,
    posterRoute: option.posterRoute,
    displayMode: block.displayMode,
    autoplay: false,
    controls: block.controls !== false,
    required: block.required,
    audienceOptions: option.audienceOptions,
    durationSeconds: option.durationSeconds,
    published: option.published,
    teacherOnly: option.teacherOnly,
    available: Boolean(option.route),
    offline: {
      contentVersion: 2,
      mediaKind: block.mediaKind,
      targetType: block.targetType,
      targetId: block.targetId,
      posterResourceId: block.posterResourceId ?? null,
    },
  } satisfies ResolvedMediaBlock;
}

