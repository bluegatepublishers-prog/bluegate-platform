"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import {
  Archive,
  ChevronDown,
  BookOpenCheck,
  ChevronUp,
  CircleAlert,
  ClipboardList,
  Copy,
  Eye,
  FileDown,
  FileText,
  GripVertical,
  MoreHorizontal,
  PlayCircle,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Search,
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
  archiveContentNodeAction,
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
  linkedAssetAudienceLabel,
  linkedAssetDisplayStyleLabel,
  linkedAssetKey,
  linkedAssetKindLabel,
  linkedAssetOpenModeLabel,
  type ContentSectionDefinitionSummary,
  type ContentStudioAssetOption,
  type LinkedAssetKind,
  type ResolvedLinkedAsset,
} from "@/lib/content-linked-asset-types";
import {
  mediaDisplayModeLabel,
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
  MEDIA_DISPLAY_MODES,
  MEDIA_KINDS,
  blockLabel,
  convertBlockType,
  createBlockByType,
  defaultNextBlockType,
  duplicateBlock,
  filterSectionsForAssetKind,
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
  | "activity"
  | "worksheet"
  | "exercise"
  | "resource"
  | "learningOutcome";

type BuilderKind = "activity" | "worksheet" | "exercise";
type PreviewSurfaceMode = "STUDENT" | "TEACHER" | "WHITEBOARD";

const field =
  "mt-2 w-full rounded-[1.25rem] border border-transparent bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-200";
const darkField =
  "mt-2 w-full rounded-[1.25rem] border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-white/25 focus:bg-white/15";

const linkedAssetKinds: LinkedAssetKind[] = [
  "video",
  "worksheet",
  "activity",
  "exercise",
  "resource",
  "learningOutcome",
];

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

  function archiveCurrentNode() {
    if (!confirm(`Archive this ${nodeType.toLowerCase()} from the publishing studio?`)) return;
    void archiveContentNodeAction(bookId, nodeType, nodeId, true);
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

  function insertImageResource(resource: ResourceChoice, anchorId: string) {
    const safeUrl =
      sanitizeUrl(resource.thumbnail ?? "") ||
      sanitizeUrl(resource.fileUrl ?? "") ||
      `/api/resources/${encodeURIComponent(resource.id)}/download`;
    addBlockWithFactory(anchorId, () => {
      const block = createBlockByType("image");
      if (!isImageBlock(block)) return block;
      return {
        ...block,
        resourceId: resource.id,
        url: safeUrl,
        alt: resource.title,
        caption: "",
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

  function convertCurrentBlock(blockId: string, type: ContentBlockType) {
    applyDocumentChange((current) =>
      updateBlock(current, blockId, (block) => convertBlockType(block, type)),
    );
    setFocusTarget(blockId);
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
  const toolbarAnchorId =
    contentDoc.blocks[contentDoc.blocks.length - 1]?.id ?? contentDoc.blocks[0]?.id ?? "";
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
              {releaseSummary?.lifecycle === "PUBLISHED" ? "Published" : "Draft"}
            </span>
            <button
              type="button"
              title="Save"
              aria-label="Save content"
              disabled={!dirty || saveState === "saving"}
              onClick={() => void saveDocument()}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              <Save className="h-4 w-4" />
              {saveState === "saving" ? "Saving..." : "Save"}
            </button>
            <div className="relative">
              <button
                type="button"
                title="Open preview menu"
                aria-label="Open preview menu"
                aria-expanded={previewMenuOpen}
                onClick={() => {
                  setPreviewMenuOpen((current) => !current);
                  setMoreMenuOpen(false);
                }}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                <Eye className="h-4 w-4" />
                Preview
                <ChevronDown className="h-4 w-4" />
              </button>
              {previewMenuOpen ? (
                <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-xl">
                  {[
                    { key: "STUDENT", label: "Student View" },
                    { key: "TEACHER", label: "Teacher View" },
                    { key: "WHITEBOARD", label: "Whiteboard View" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => openPreview(item.key as PreviewSurfaceMode)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <span>{item.label}</span>
                      {previewMode === item.key ? <span className="text-xs text-slate-400">Current</span> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              title="Publish"
              aria-label="Publish content"
              disabled={!transitionReleaseAction}
              onClick={publishCurrentNode}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Publish
            </button>
            <button
              type="button"
              title="Delete"
              aria-label="Archive current content node"
              onClick={archiveCurrentNode}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            <button
              type="button"
              title="Undo"
              aria-label="Undo"
              onClick={undoDocument}
              disabled={!canUndo}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" />
              Undo
            </button>
            <button
              type="button"
              title="Redo"
              aria-label="Redo"
              onClick={redoDocument}
              disabled={!canRedo}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              <Redo2 className="h-4 w-4" />
              Redo
            </button>
            <button
              type="button"
              title="Search manuscript"
              aria-label="Search manuscript"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((current) => !current)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
            <button
              type="button"
              title="Open insert menu"
              aria-label="Open insert menu"
              aria-expanded={toolbarAddOpen}
              onClick={() => {
                setToolbarAddOpen((current) => !current);
                setPreviewMenuOpen(false);
                setMoreMenuOpen(false);
              }}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              <Plus className="h-4 w-4" />
              Insert
              <ChevronDown className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                type="button"
                title="Open more actions"
                aria-label="Open more actions"
                aria-expanded={moreMenuOpen}
                onClick={() => {
                  setMoreMenuOpen((current) => !current);
                  setPreviewMenuOpen(false);
                }}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                <MoreHorizontal className="h-4 w-4" />
                More
              </button>
              {moreMenuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setReleasePanelOpen(true);
                    }}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Version History
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setReleasePanelOpen(true);
                    }}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Rollback
                  </button>
                  <button
                    type="button"
                    onClick={archiveCurrentNode}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </button>
                  <button
                    type="button"
                    onClick={duplicateCurrentNode}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={exportManuscript}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={printManuscript}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Print
                  </button>
                </div>
              ) : null}
            </div>
          </div>
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
                  if (kind === "activity" || kind === "worksheet" || kind === "exercise") {
                    openBuilderSurface(kind, "existing");
                    return;
                  }
                  openInsertSurface(kind);
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
            <div className="mx-auto w-full max-w-[62rem] rounded-[2rem] bg-white px-6 py-7 shadow-sm ring-1 ring-slate-200 sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                    {nodeType} Manuscript
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Write directly on the manuscript canvas. Insert media, teaching elements, and reusable study materials inline.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    saveState === "saving"
                      ? "bg-amber-100 text-amber-800"
                      : saveState === "error"
                        ? "bg-rose-100 text-rose-700"
                        : dirty
                          ? "bg-blue-100 text-blue-700"
                          : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {saveState === "saving" ? "Saving" : dirty ? "Unsaved" : "Saved"}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <input
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setError("");
                  }}
                  className="w-full border-none bg-transparent p-0 text-4xl font-bold tracking-tight text-slate-950 outline-none placeholder:text-slate-300"
                  placeholder="Untitled"
                  aria-label="Title"
                />
                <input
                  value={subtitle}
                  onChange={(event) => {
                    setSubtitle(event.target.value);
                    setError("");
                  }}
                  className="w-full border-none bg-transparent p-0 text-lg text-slate-500 outline-none placeholder:text-slate-300"
                  placeholder="Subtitle"
                  aria-label="Subtitle"
                />
                <textarea
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setError("");
                  }}
                  rows={3}
                  className="w-full resize-none border-none bg-transparent p-0 text-base leading-8 text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="Write the opening guidance for this manuscript."
                  aria-label="Lead text"
                />
              </div>

            </div>

            <div className="mx-auto w-full max-w-[62rem] space-y-4">
              {contentDoc.blocks.map((block, index) => (
                <BlockEditor
                  key={block.id}
                  bookId={bookId}
                  block={block}
                  index={index}
                  resources={resourceChoices}
                  assetOptions={assetLibrary}
                  mediaOptions={mediaLibrary}
                  sectionDefinitions={sectionDefinitions}
                  resolvedAsset={previewLinkedAssets[block.id] ?? null}
                  resolvedMedia={previewMedia[block.id] ?? null}
                  menuOpen={menuAnchor === block.id}
                  onOpenMenu={openMenu}
                  onCloseMenu={closeMenu}
                  onInsertBefore={(type) => addBlock(type, block.id, true)}
                  onInsertAfter={(type) => addBlock(type, block.id)}
                  onUpdateText={(value) => updateText(block.id, value)}
                  onTextSelect={(target) => captureTextSelection(block, target)}
                  onOpenKnowledge={(type, target) => {
                    const selection = target
                      ? readTextSelection(block, target)
                      : activeSelection?.blockId === block.id ? activeSelection : null;
                    if (selection) setKnowledgePopup({ ...selection, type });
                  }}
                  onRemoveKnowledge={(referenceId) => removeKnowledgeReference(block.id, referenceId)}
                  resolvedKnowledge={knowledgeMap}
                  onUpdatePatch={(patch) => updatePatch(block.id, patch)}
                  onUpdateListItem={(itemIndex, value) => updateListItem(block.id, itemIndex, value)}
                  onAddListItem={(itemIndex) => addListItem(block.id, itemIndex)}
                  onChooseResource={(resourceId) => chooseResource(block.id, resourceId)}
                  onClearImage={() => updatePatch(block.id, { url: "", resourceId: undefined, alt: "" })}
                  onUpdateLinkedAsset={(patch) => updatePatch(block.id, patch)}
                  onUpdateMedia={(patch) => updatePatch(block.id, patch)}
                  onConvert={(type) => convertCurrentBlock(block.id, type)}
                  onKeyDown={handleTextKeyDown}
                  onListKeyDown={handleListKeyDown}
                  onDuplicate={() => duplicateCurrentBlock(block.id)}
                  onDelete={() => deleteBlock(block.id, index)}
                  onMoveUp={() => moveCurrentBlock(block.id, -1)}
                  onMoveDown={() => moveCurrentBlock(block.id, 1)}
                />
              ))}
            </div>

          </div>
        </div>

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
              if (insertKind === "media") {
                insertResourceAsMedia(resource, insertAnchorId, input.type === ResourceType.AUDIO ? "audio" : input.type === ResourceType.INTERACTIVE ? "simulation" : "video");
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
  resolvedAsset,
  resolvedMedia,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
  onInsertBefore,
  onInsertAfter,
  onUpdateText,
  onTextSelect,
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
  onConvert,
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
  resolvedAsset: ResolvedLinkedAsset | null;
  resolvedMedia: ResolvedMediaBlock | null;
  menuOpen: boolean;
  onOpenMenu: (anchorId: string) => void;
  onCloseMenu: () => void;
  onInsertBefore: (type: ContentBlockType) => void;
  onInsertAfter: (type: ContentBlockType) => void;
  onUpdateText: (value: string) => void;
  onTextSelect: (target: HTMLInputElement | HTMLTextAreaElement) => void;
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
  onConvert: (type: ContentBlockType) => void;
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
  const shell =
    "group rounded-[1.75rem] border border-transparent bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300";
  const actionButton =
    "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700";
  const safeImage = sanitizeUrl(isImageBlock(block) ? block.url : "");
  const collapsed = block.collapsed === true;

  return (
    <article className={shell}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          <GripVertical className="h-3.5 w-3.5" />
          {blockLabel(block.type)}
        </span>
        <select
          value={block.type}
          onChange={(event) => onConvert(event.target.value as ContentBlockType)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
        >
          {ALL_BLOCK_TYPES.map((type) => (
            <option key={type} value={type}>
              {blockLabel(type)}
            </option>
          ))}
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
        <div className="grid gap-3 rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-slate-200 lg:grid-cols-5">
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

        {!collapsed && (block.type === "heading" || block.type === "subheading") ? (
          <input
            data-block-id={block.id}
            value={block.text}
            onChange={(event) => onUpdateText(event.target.value)}
            onSelect={(event) => onTextSelect(event.currentTarget)}
            onContextMenu={(event) => openKnowledgeFromContext(event, onTextSelect, onOpenKnowledge)}
            onKeyDown={(event) => onKeyDown(event, block, index, block.text)}
            placeholder={block.type === "heading" ? "Heading" : "Subheading"}
            className={`w-full border-none bg-transparent p-0 outline-none placeholder:text-slate-300 ${
              block.type === "heading"
                ? "text-4xl font-bold tracking-tight text-slate-950"
                : "text-2xl font-semibold tracking-tight text-slate-900"
            }`}
          />
        ) : null}

        {!collapsed && block.type === "paragraph" ? (
          <textarea
            data-block-id={block.id}
            value={block.text}
            onChange={(event) => onUpdateText(event.target.value)}
            onSelect={(event) => onTextSelect(event.currentTarget)}
            onContextMenu={(event) => openKnowledgeFromContext(event, onTextSelect, onOpenKnowledge)}
            onKeyDown={(event) => onKeyDown(event, block, index, block.text)}
            rows={4}
            placeholder="Start writing..."
            className="w-full resize-none border-none bg-transparent p-0 text-[1.05rem] leading-8 text-slate-800 outline-none placeholder:text-slate-300"
          />
        ) : null}

        {!collapsed && block.type === "caption" ? (
          <textarea
            data-block-id={block.id}
            value={block.text}
            onChange={(event) => onUpdateText(event.target.value)}
            onKeyDown={(event) => onKeyDown(event, block, index, block.text)}
            rows={2}
            placeholder="Caption"
            className="w-full resize-none border-none bg-transparent p-0 text-sm leading-6 text-slate-500 outline-none placeholder:text-slate-300"
          />
        ) : null}

        {!collapsed && (block.type === "quote" || block.type === "callout") ? (
          <div
            className={
              block.type === "quote"
                ? "border-l-4 border-slate-300 pl-5"
                : "rounded-2xl bg-blue-50 px-5 py-4"
            }
          >
            <textarea
              data-block-id={block.id}
              value={block.text}
              onChange={(event) => onUpdateText(event.target.value)}
              onSelect={(event) => onTextSelect(event.currentTarget)}
              onContextMenu={(event) => openKnowledgeFromContext(event, onTextSelect, onOpenKnowledge)}
              onKeyDown={(event) => onKeyDown(event, block, index, block.text)}
              rows={4}
              placeholder={block.type === "quote" ? "Quote" : "Callout"}
              className="w-full resize-none border-none bg-transparent p-0 text-[1.05rem] leading-8 text-slate-800 outline-none placeholder:text-slate-300"
            />
            <input
              value={block.attribution ?? ""}
              onChange={(event) => onUpdatePatch({ attribution: event.target.value })}
              placeholder="Attribution"
              className="mt-3 w-full border-none bg-transparent p-0 text-sm font-semibold text-slate-500 outline-none placeholder:text-slate-300"
            />
          </div>
        ) : null}

        {!collapsed && isTextBlock(block) && block.knowledgeReferences?.length ? (
          <KnowledgeReferenceBadges
            references={block.knowledgeReferences}
            resolvedKnowledge={resolvedKnowledge}
            onRemove={onRemoveKnowledge}
          />
        ) : null}

        {!collapsed && isListBlock(block) ? (
          <div className="space-y-2">
            {block.items.map((item, itemIndex) => (
              <div key={`${block.id}-${itemIndex}`} className="flex items-start gap-3">
                <span className="mt-2 text-sm font-bold text-slate-400">
                  {block.type === "numberedList" ? `${itemIndex + 1}.` : "*"}
                </span>
                <input
                  data-block-id={itemIndex === 0 ? block.id : undefined}
                  value={item}
                  onChange={(event) => onUpdateListItem(itemIndex, event.target.value)}
                  onKeyDown={(event) => onListKeyDown(event, block, itemIndex, item)}
                  placeholder="List item"
                  className="w-full border-none bg-transparent p-0 text-[1.05rem] leading-8 text-slate-800 outline-none placeholder:text-slate-300"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => onAddListItem(block.items.length - 1)}
              className="text-sm font-semibold text-blue-700"
            >
              Add item
            </button>
          </div>
        ) : null}

        {!collapsed && isImageBlock(block) ? (
          <ImageLikeEditor
            bookId={bookId}
            block={block}
            safeImage={safeImage}
            resources={resources}
            onChooseResource={onChooseResource}
            onClearImage={onClearImage}
            onUpdatePatch={onUpdatePatch}
            onKeyDown={(event, currentValue) => onKeyDown(event, block, index, currentValue)}
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

function ImageLikeEditor({
  bookId,
  block,
  safeImage,
  resources,
  onChooseResource,
  onClearImage,
  onUpdatePatch,
  onKeyDown,
}: {
  bookId: string;
  block: Extract<ContentBlock, { type: "image" | "diagram" }>;
  safeImage: string;
  resources: ResourceChoice[];
  onChooseResource: (resourceId: string) => void;
  onClearImage: () => void;
  onUpdatePatch: (patch: Partial<ContentBlock>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>, currentValue: string) => void;
}) {
  return (
    <div className="space-y-4">
      {safeImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safeImage}
          alt={block.alt || "Illustration"}
          className="max-h-[28rem] w-full rounded-3xl object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
          Add an image URL or choose a resource thumbnail
        </div>
      )}
      <div className="grid gap-3 lg:grid-cols-3">
        <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
          Image URL
          <input
            data-block-id={block.id}
            value={block.url}
            onChange={(event) => onUpdatePatch({ url: event.target.value, resourceId: undefined })}
            onKeyDown={(event) => onKeyDown(event, block.url)}
            placeholder="https://..."
            className={field}
          />
        </label>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            Resource
            <select
              value={block.resourceId ?? ""}
              onChange={(event) => onChooseResource(event.target.value)}
              className={field}
            >
              <option value="">Use a resource thumbnail</option>
              {resources
                .filter((resource) => sanitizeUrl(resource.thumbnail ?? "") || sanitizeUrl(resource.fileUrl ?? ""))
                .map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.title}
                  </option>
                ))}
            </select>
          </label>
          <Link
            href={`/admin/resources/new?returnTo=${encodeURIComponent(`/admin/books/${bookId}/content?selected=${encodeURIComponent(block.id)}`)}`}
            className="inline-flex text-sm font-semibold text-blue-700"
          >
            Upload new resource
          </Link>
        </div>
        <label className="block text-sm font-semibold text-slate-700">
          Alt text
          <input
            value={block.alt}
            onChange={(event) => onUpdatePatch({ alt: event.target.value })}
            placeholder="Describe the image"
            className={field}
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Width
          <select
            value={block.width ?? "full"}
            onChange={(event) =>
              onUpdatePatch({ width: event.target.value as "full" | "wide" | "medium" })
            }
            className={field}
          >
            <option value="full">full</option>
            <option value="wide">wide</option>
            <option value="medium">medium</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Float
          <select
            value={block.float ?? "none"}
            onChange={(event) =>
              onUpdatePatch({ float: event.target.value as "none" | "left" | "right" })
            }
            className={field}
          >
            <option value="none">none</option>
            <option value="left">left</option>
            <option value="right">right</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
          Caption
          <input
            value={block.caption ?? ""}
            onChange={(event) => onUpdatePatch({ caption: event.target.value })}
            placeholder="Optional caption"
            className={field}
          />
        </label>
        <button
          type="button"
          onClick={onClearImage}
          className="self-end rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Clear image
        </button>
      </div>
    </div>
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

function TableBlockEditor({
  block,
  onUpdatePatch,
}: {
  block: Extract<ContentBlock, { type: "table" | "comparisonTable" }>;
  onUpdatePatch: (patch: Partial<ContentBlock>) => void;
}) {
  function updateCell(rowId: string, cellId: string, value: string) {
    onUpdatePatch({
      rows: block.rows.map((row) =>
        row.id === rowId
          ? { ...row, cells: row.cells.map((cell) => (cell.id === cellId ? { ...cell, text: value } : cell)) }
          : row,
      ),
    });
  }
  function addRow() {
    const columns = block.rows[0]?.cells.length ?? 2;
    onUpdatePatch({
      rows: [
        ...block.rows,
        {
          id: `row_${Date.now().toString(36)}`,
          cells: Array.from({ length: columns }, (_, columnIndex) => ({
            id: `cell_${columnIndex}_${Math.random().toString(36).slice(2, 8)}`,
            text: "",
          })),
        },
      ],
    });
  }
  function addColumn() {
    onUpdatePatch({
      rows: block.rows.map((row) => ({
        ...row,
        cells: [...row.cells, { id: `cell_${Math.random().toString(36).slice(2, 8)}`, text: "" }],
      })),
    });
  }
  return (
    <div className="space-y-4">
      <label className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
        <input
          type="checkbox"
          checked={block.headerRow !== false}
          onChange={(event) => onUpdatePatch({ headerRow: event.target.checked })}
        />
        Header row
      </label>
      <div className="space-y-2 overflow-x-auto">
        {block.rows.map((row) => (
          <div key={row.id} className="grid min-w-[32rem] gap-2" style={{ gridTemplateColumns: `repeat(${row.cells.length}, minmax(0, 1fr))` }}>
            {row.cells.map((cell) => (
              <input
                key={cell.id}
                value={cell.text}
                onChange={(event) => updateCell(row.id, cell.id, event.target.value)}
                className={field}
                placeholder="Cell"
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addRow} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
          Add row
        </button>
        <button type="button" onClick={addColumn} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
          Add column
        </button>
      </div>
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

function MediaBlockEditor({
  block,
  mediaOptions,
  resources,
  sectionDefinitions,
  resolvedMedia,
  onUpdate,
}: {
  block: MediaBlock;
  mediaOptions: ContentStudioMediaOption[];
  resources: ResourceChoice[];
  sectionDefinitions: ContentSectionDefinitionSummary[];
  resolvedMedia: ResolvedMediaBlock | null;
  onUpdate: (patch: Partial<MediaBlock>) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(!block.targetId);
  const [search, setSearch] = useState("");
  const validSections = sectionDefinitions.filter((section) => {
    if (section.archived || !section.active) return false;
    if (!section.allowedAssetKinds.length) return true;
    return section.allowedAssetKinds.includes(block.mediaKind === "video" ? "video" : "resource");
  });
  const kindOptions = mediaOptions.filter((option) => option.mediaKind === block.mediaKind);
  const filtered = kindOptions.filter((option) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      option.title.toLowerCase().includes(query) ||
      option.sourceBadge.toLowerCase().includes(query) ||
      option.sourceDetail.toLowerCase().includes(query) ||
      option.scopeLabel.toLowerCase().includes(query)
    );
  });
  const activeMedia = resolveMediaForBlock(block, mediaOptions, resolvedMedia);
  const audienceOptions = activeMedia?.audienceOptions ?? ["TEACHER", "STUDENT"];
  const broken = Boolean(block.targetId) && !activeMedia;

  return (
    <div className="space-y-4 rounded-[1.5rem] bg-slate-950 p-4 text-white ring-1 ring-slate-900">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-200 ring-1 ring-white/10">
          <PlayCircle className="h-4 w-4" />
          {mediaKindLabel(block.mediaKind)}
        </span>
        {activeMedia ? (
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-white/10">
            {activeMedia.sourceBadge}
          </span>
        ) : null}
        {broken ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-100">
            <CircleAlert className="h-3.5 w-3.5" />
            Broken media
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {MEDIA_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() =>
              onUpdate({
                mediaKind: kind,
                targetType: kind === "video" ? block.targetType : "RESOURCE",
                targetId: "",
                label: mediaKindLabel(kind),
                audience: ["TEACHER", "STUDENT"],
                sectionDefinitionId: undefined,
              })
            }
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              block.mediaKind === kind
                ? "bg-white text-slate-950"
                : "border border-white/15 bg-white/5 text-slate-200"
            }`}
          >
            {mediaKindLabel(kind)}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <label className="block text-sm font-semibold text-slate-200 lg:col-span-2">
          Label
          <input
            data-block-id={block.id}
            value={block.label}
            onChange={(event) => onUpdate({ label: event.target.value })}
            placeholder="Media label"
            className={darkField}
          />
        </label>
        <label className="block text-sm font-semibold text-slate-200">
          Display
          <select
            value={block.displayMode}
            onChange={(event) =>
              onUpdate({ displayMode: event.target.value as MediaBlock["displayMode"] })
            }
            className={darkField}
          >
            {MEDIA_DISPLAY_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mediaDisplayModeLabel(mode)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-200 lg:col-span-2">
          Caption
          <input
            value={block.caption ?? ""}
            onChange={(event) => onUpdate({ caption: event.target.value || undefined })}
            placeholder="Optional caption"
            className={darkField}
          />
        </label>
        <label className="block text-sm font-semibold text-slate-200">
          Section
          <select
            value={block.sectionDefinitionId ?? ""}
            onChange={(event) => onUpdate({ sectionDefinitionId: event.target.value || undefined })}
            className={darkField}
          >
            <option value="">No section label</option>
            {validSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <label className="block text-sm font-semibold text-slate-200">
          Poster Resource
          <select
            value={block.posterResourceId ?? ""}
            onChange={(event) => onUpdate({ posterResourceId: event.target.value || undefined })}
            className={darkField}
          >
            <option value="">Use source thumbnail</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3 rounded-[1.25rem] bg-white/10 px-4 py-3 text-sm font-semibold text-slate-200 ring-1 ring-white/10">
          <input
            checked={block.controls}
            type="checkbox"
            onChange={(event) => onUpdate({ controls: event.target.checked })}
          />
          Controls
        </label>
        <label className="flex items-center gap-3 rounded-[1.25rem] bg-white/10 px-4 py-3 text-sm font-semibold text-slate-200 ring-1 ring-white/10">
          <input
            checked={block.required}
            type="checkbox"
            onChange={(event) => onUpdate({ required: event.target.checked })}
          />
          Required
        </label>
      </div>

      <div className="rounded-[1.25rem] bg-white/10 p-4 ring-1 ring-white/10">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Audience</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {audienceOptions.map((audience) => {
            const active = block.audience.includes(audience);
            return (
              <button
                key={audience}
                type="button"
                onClick={() => {
                  const next = active
                    ? block.audience.filter((entry) => entry !== audience)
                    : [...block.audience, audience];
                  onUpdate({ audience: next.length ? next : [audience] });
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active ? "bg-white text-slate-950" : "border border-white/15 text-slate-200"
                }`}
              >
                {linkedAssetAudienceLabel(audience)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[1.25rem] bg-white/10 p-4 ring-1 ring-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Source</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {activeMedia?.title || "No media selected"}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {activeMedia
                ? `${activeMedia.sourceBadge} - ${activeMedia.sourceDetail} - ${activeMedia.scopeLabel}${activeMedia.published ? "" : " - Draft"}`
                : "Choose an existing publisher-owned media source for this manuscript position."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen((current) => !current)}
            className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-slate-100"
          >
            {pickerOpen ? "Hide picker" : "Choose media"}
          </button>
        </div>

        {pickerOpen ? (
          <div className="mt-4 space-y-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${mediaKindLabel(block.mediaKind).toLowerCase()} sources`}
              className={darkField}
            />
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {filtered.map((option) => (
                <button
                  key={mediaKey(option.targetType, option.targetId)}
                  type="button"
                  onClick={() => {
                    onUpdate({
                      mediaKind: option.mediaKind,
                      targetType: option.targetType,
                      targetId: option.targetId,
                      label: option.defaultLabel,
                      audience: option.defaultAudience,
                    });
                    setPickerOpen(false);
                    setSearch("");
                  }}
                  className="w-full rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/25 hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{option.title}</p>
                      <p className="mt-1 text-xs text-slate-300">
                        {option.sourceBadge} - {option.sourceDetail} - {option.scopeLabel}
                      </p>
                    </div>
                    {!option.published ? (
                      <span className="rounded-full bg-amber-300 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-950">
                        Draft
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
              {!filtered.length ? (
                <div className="rounded-[1.25rem] border border-dashed border-white/20 px-4 py-6 text-sm text-slate-300">
                  No matching media in the current book scope.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LinkedAssetEditor({
  block,
  assetOptions,
  sectionDefinitions,
  resolvedAsset,
  onUpdate,
}: {
  block: LinkedAssetBlock;
  assetOptions: ContentStudioAssetOption[];
  sectionDefinitions: ContentSectionDefinitionSummary[];
  resolvedAsset: ResolvedLinkedAsset | null;
  onUpdate: (patch: Partial<LinkedAssetBlock>) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(!block.targetId);
  const [search, setSearch] = useState("");
  const validSections = filterSectionsForAssetKind(sectionDefinitions, block.assetKind);
  const activeSection =
    sectionDefinitions.find((section) => section.id === block.sectionDefinitionId) ?? null;
  const kindOptions = assetOptions.filter((option) => {
    if (option.assetKind !== block.assetKind) return false;
    if (!activeSection?.allowedAssetKinds.length) return true;
    return activeSection.allowedAssetKinds.includes(option.assetKind);
  });
  const filtered = kindOptions.filter((option) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      option.title.toLowerCase().includes(query) ||
      option.sourceBadge.toLowerCase().includes(query) ||
      option.scopeLabel.toLowerCase().includes(query)
    );
  });
  const activeAsset = resolveAssetForBlock(block, assetOptions, resolvedAsset);
  const audienceOptions = activeAsset?.audienceOptions ?? ["TEACHER", "STUDENT"];
  const openModes = activeAsset?.openModes ?? ["route"];
  const broken = Boolean(block.targetId) && !activeAsset;

  return (
    <div className="space-y-4 rounded-[1.5rem] bg-[#faf7f0] p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
          {renderAssetIcon(block.assetKind)}
          {linkedAssetKindLabel(block.assetKind)}
        </span>
        {activeAsset ? (
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            {activeAsset.sourceBadge}
          </span>
        ) : null}
        {broken ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700">
            <CircleAlert className="h-3.5 w-3.5" />
            Broken link
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {linkedAssetKinds.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() =>
              onUpdate({
                assetKind: kind,
                targetType: defaultTargetTypeForKind(kind),
                targetId: "",
                label: linkedAssetKindLabel(kind),
                audience: ["TEACHER", "STUDENT"],
                openMode: "route",
                sectionDefinitionId: undefined,
              } as Partial<LinkedAssetBlock>)
            }
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              block.assetKind === kind
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            {linkedAssetKindLabel(kind)}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
          Label
          <input
            data-block-id={block.id}
            value={block.label}
            onChange={(event) => onUpdate({ label: event.target.value })}
            placeholder="Asset label"
            className={field}
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Display style
          <select
            value={block.displayStyle}
            onChange={(event) =>
              onUpdate({ displayStyle: event.target.value as LinkedAssetBlock["displayStyle"] })
            }
            className={field}
          >
            {["button", "inline", "callout"].map((style) => (
              <option key={style} value={style}>
                {linkedAssetDisplayStyleLabel(style as LinkedAssetBlock["displayStyle"])}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Section
          <select
            value={block.sectionDefinitionId ?? ""}
            onChange={(event) =>
              onUpdate({ sectionDefinitionId: event.target.value || undefined })
            }
            className={field}
          >
            <option value="">No section label</option>
            {validSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <label className="block text-sm font-semibold text-slate-700">
          Open mode
          <select
            value={block.openMode}
            onChange={(event) =>
              onUpdate({ openMode: event.target.value as LinkedAssetBlock["openMode"] })
            }
            className={field}
          >
            {openModes.map((mode) => (
              <option key={mode} value={mode}>
                {linkedAssetOpenModeLabel(mode)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3 rounded-[1.25rem] bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
          <input
            checked={block.required}
            type="checkbox"
            onChange={(event) => onUpdate({ required: event.target.checked })}
          />
          Required
        </label>
        <div className="rounded-[1.25rem] bg-white px-4 py-3 ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Audience</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {audienceOptions.map((audience) => {
              const active = block.audience.includes(audience);
              return (
                <button
                  key={audience}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? block.audience.filter((entry) => entry !== audience)
                      : [...block.audience, audience];
                    onUpdate({ audience: next.length ? next : [audience] });
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active ? "bg-slate-950 text-white" : "border border-slate-200 text-slate-700"
                  }`}
                >
                  {linkedAssetAudienceLabel(audience)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-[1.25rem] bg-white p-4 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Source</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {activeAsset?.title || "No asset selected"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {activeAsset
                ? `${activeAsset.sourceBadge} · ${activeAsset.scopeLabel}${activeAsset.teacherOnly ? " · Teacher only" : ""}`
                : "Choose an existing publisher-owned asset for this position."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen((current) => !current)}
            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            {pickerOpen ? "Hide picker" : "Choose asset"}
          </button>
        </div>

        {pickerOpen ? (
          <div className="mt-4 space-y-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${linkedAssetKindLabel(block.assetKind).toLowerCase()} sources`}
              className={field}
            />
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {filtered.map((option) => (
                <button
                  key={linkedAssetKey(option.targetType, option.targetId)}
                  type="button"
                  onClick={() => {
                    onUpdate({
                      assetKind: option.assetKind,
                      targetType: option.targetType,
                      targetId: option.targetId,
                      label: option.defaultLabel,
                      audience: option.defaultAudience,
                      displayStyle: block.displayStyle,
                      openMode: option.openModes.includes(block.openMode)
                        ? block.openMode
                        : option.openModes[0],
                    });
                    setPickerOpen(false);
                    setSearch("");
                  }}
                  className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{option.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {option.sourceBadge} · {option.sourceDetail} · {option.scopeLabel}
                      </p>
                    </div>
                    {option.teacherOnly ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
                        Teacher
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
              {!filtered.length ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  No matching assets for this kind in the current book scope.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
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
  }) => void;
}) {
  if (!open || !kind) return null;

  const imageChoices = resources.filter((resource) => resource.thumbnail || resource.fileUrl);
  const linkedChoices = assetOptions.filter((option) => option.assetKind === kind);

  return (
    <StudioBuilderDrawer open={open} title={`Insert ${blockLabelForDrawer(kind)}`} onClose={onClose}>
      <div className="space-y-5">
        {kind === "image" ? (
          <section className="rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-700">
              Choose an existing publisher resource thumbnail or file to insert as an image.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Direct image upload is limited by the current canonical Resource type set, so this drawer uses existing reusable publisher resources only.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {imageChoices.map((resource) => (
                <button
                  key={resource.id}
                  type="button"
                  onClick={() => onChooseImage(resource)}
                  className="rounded-[1.25rem] border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <p className="text-sm font-semibold text-slate-900">{resource.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{resource.type ?? "Resource"}</p>
                </button>
              ))}
            </div>
          </section>
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
              allowedTypes={[ResourceType.VIDEO, ResourceType.AUDIO, ResourceType.INTERACTIVE]}
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
  busy,
  status,
  error,
  uploadProgress,
  onSubmit,
}: {
  title: string;
  allowedTypes: ResourceType[];
  busy: boolean;
  status: string;
  error: string;
  uploadProgress: number;
  onSubmit: (input: {
    file: File;
    title: string;
    type: ResourceType;
    audience: ResourceAudience;
  }) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType>(allowedTypes[0] ?? ResourceType.PDF);
  const [audience, setAudience] = useState<ResourceAudience>(ResourceAudience.BOTH);

  return (
    <section className="rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Title
          <input value={resourceTitle} onChange={(event) => setResourceTitle(event.target.value)} className={field} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Type
          <select value={resourceType} onChange={(event) => setResourceType(event.target.value as ResourceType)} className={field}>
            {allowedTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
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
          <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className={field} />
        </label>
      </div>
      {uploadProgress > 0 ? <p className="mt-3 text-sm font-semibold text-slate-500">Upload {uploadProgress}%</p> : null}
      {status ? <p className="mt-3 text-sm font-semibold text-slate-500">{status}</p> : null}
      {error ? <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
      <button
        type="button"
        disabled={!file || !resourceTitle.trim() || busy}
        onClick={() => file && onSubmit({ file, title: resourceTitle.trim(), type: resourceType, audience })}
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

function renderAssetIcon(kind: LinkedAssetKind) {
  switch (kind) {
    case "video":
      return <PlayCircle className="h-4 w-4" />;
    case "worksheet":
      return <FileDown className="h-4 w-4" />;
    case "activity":
      return <ClipboardList className="h-4 w-4" />;
    case "exercise":
      return <BookOpenCheck className="h-4 w-4" />;
    case "learningOutcome":
      return <BookOpenCheck className="h-4 w-4" />;
    case "resource":
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function defaultTargetTypeForKind(kind: LinkedAssetKind) {
  switch (kind) {
    case "video":
      return "VIDEO_LESSON";
    case "activity":
      return "CHAPTER_ACTIVITY";
    case "exercise":
      return "BOOK_EXERCISE";
    case "learningOutcome":
      return "CHAPTER_LEARNING_OUTCOME";
    case "worksheet":
      return "PUBLISHER_WORKSHEET";
    case "resource":
    default:
      return "RESOURCE";
  }
}

function serializeSnapshot(snapshot: {
  title: string;
  subtitle: string;
  description: string;
  slug: string;
  label: string;
  estimatedMinutes: string;
  published: boolean;
  content: ContentDocument;
}) {
  return JSON.stringify(snapshot);
}
