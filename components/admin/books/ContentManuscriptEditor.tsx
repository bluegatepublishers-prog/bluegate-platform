"use client";

import EditorShell from "@/components/admin/books/editor/EditorShell";


import V2DocumentWorkspace from "@/components/admin/books/editor/V2DocumentWorkspace";
import IdmlImportPanel from "@/components/admin/books/editor/IdmlImportPanel";


import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ClipboardEvent, KeyboardEvent, MouseEvent } from "react";
import { ResourceAudience, ResourceType } from "@prisma/client";
import ActivityStudio from "@/components/admin/books/ActivityStudio";
import V2ContentDocumentRenderer from "@/components/content/V2ContentDocumentRenderer";
import V2ReadAloudPlayer from "@/components/content/V2ReadAloudPlayer";
import ContentReleasePanel from "@/components/admin/books/ContentReleasePanel";
import ExerciseAuthoringStudio from "@/components/admin/books/ExerciseAuthoringStudio";
import StudioBuilderDrawer from "@/components/admin/books/StudioBuilderDrawer";
import { compactField, compactPanel, compactPrimaryButton, compactResourceRow } from "@/components/admin/books/compact-studio-styles";
import WorksheetStudio from "@/components/admin/books/WorksheetStudio";
import {
  deleteContentNodeAction,
} from "@/app/admin/books/[id]/content/actions";
import type { BookStructureNodeType } from "@/lib/book-structure-management";
import type { BookPageScope } from "@/lib/book-page-filter";
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
  convertBlockType,
  createBlockByType,
  createEducationalObjectBlock,
  createActivityBlock,
  createWorksheetBlock,
  createExerciseBlock,
  createTableBlock,
  createTextBlock,
  defaultNextBlockType,
  duplicateBlock,
  insertBlockAfter,
  insertBlockBefore,
  isFormulaBlock,
  isImageGalleryBlock,
  isInfoBoxBlock,
  isEducationalObjectBlock,
  isActivityBlock,
  isWorksheetBlock,
  isExerciseBlock,
  isImageBlock,
  isLinkedAssetBlock,
  isListBlock,
  isMediaBlock,
  isObservationBoxBlock,
  isPlaceholderBlock,
  isSequenceBlock,
  isTableBlock,
  isTextBlock,
  removeEmptyContentPeriod,
  renameContentPeriod,
  normalizeContentDocument,
  serializeContentDocument,
  moveBlockWithinPeriod,
  removeBlock,
  resizeImageBlock,
  sanitizeUrl,
  updateBlock,
  type BlockAlignment,
  type BlockBackgroundStyle,
  type BlockBorderStyle,
  type CanvasPreset,
  type ContentBlock,
  type ContentBlockType,
  type ContentDocument,
  type ListBlock,
  type TextBlock,
  type InfoBoxVariant,
  type LinkedAssetBlock,
  type MediaBlock,
} from "@/lib/content-document";
import { type EducationalObjectType } from "@/lib/educational-object-registry";
import { EDUCATIONAL_OBJECT_REGISTRY, getEducationalObjectDefinition, getEducationalObjectPlaceholder, isEducationalObjectType } from "@/lib/educational-object-registry";
import type { ReleaseSummary } from "@/lib/content-release";
import { uploadFileToR2 } from "@/lib/storage/client-upload";
import { contentResourcePreviewUrl } from "@/lib/content-resource-preview";
import EducationalObjectIcon from "@/components/content/EducationalObjectIcon";
import { addV2FrameToPage, createV2CompatibilityLayout, ensureV2MainFlowFrames, updateV2Frame, type LayoutV2Frame, type LayoutV2Page } from "@/lib/content-layout-v2";
import { buildV2NarrationManifest } from "@/lib/content-narration";
import { getV2WorksheetLauncherPayload } from "@/lib/v2-worksheet-launcher";

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
  "heading3",
  "subheading",
  "paragraph",
  "caption",
  "bulletList",
  "numberedList",
  "quote",
  "callout",
  "activity",
  "worksheet",
  "exercise",
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
  moduleId,
  exerciseId,
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
  importPdfAction,
  attachPdfAction,
  listPdfVersionsAction,
  restorePdfVersionAction,
  prepareReadAloudAction,
  hasFullBookPdf,
  saveAction,
  pageScope = null,
  initialPageNumber = null,
  workspaceTitle,
  isBookRootContext = true,
}: {
  bookId: string;
  nodeId: string;
  chapterId: string | null;
  moduleId: string | null;
  exerciseId?: string | null;
  nodeType: BookStructureNodeType | "BOOK";
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
  importPdfAction: () => Promise<{ pageCount: number; pages: LayoutV2Page[] }>;
  attachPdfAction: (objectKey: string, options?: { clearMappings?: boolean }) => Promise<{ pageCount: number; mappingResetRequired?: boolean; mappingConflictMessage?: string }>;
  listPdfVersionsAction?: () => Promise<Array<{ id: string; objectKey: string; originalFileName: string | null; pageCount: number; fileSizeBytes: string | null; active: boolean; activatedAt: string | null; createdAt: string }>>;
  restorePdfVersionAction?: (versionId: string, options?: { clearMappings?: boolean }) => Promise<{ pageCount: number; mappingResetRequired?: boolean; mappingConflictMessage?: string }>;
  prepareReadAloudAction?: () => Promise<{ updatedPageCount: number; matchedPageCount: number }>;
  hasFullBookPdf: boolean;
  saveAction: (data: FormData) => Promise<ContentNodeSaveResult>;
  pageScope?: BookPageScope | null;
  initialPageNumber?: number | null;
  workspaceTitle?: string;
  isBookRootContext?: boolean;
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
  const [mediaLibrary, setMediaLibrary] = useState(() =>
    mediaOptions.map((option) =>
      option.targetType === "RESOURCE"
        ? { ...option, route: { href: contentResourcePreviewUrl(option.targetId), openMode: "route" as const } }
        : option,
    ),
  );
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
  const [importOpen, setImportOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [releasePanelOpen, setReleasePanelOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [insertKind, setInsertKind] = useState<ToolbarInsertKind | null>(null);
  const [builderKind, setBuilderKind] = useState<BuilderKind | null>(null);
  const [builderTab, setBuilderTab] = useState<"existing" | "create">("existing");
  const [insertAnchorId, setInsertAnchorId] = useState<string | null>(null);
  const [insertStatus, setInsertStatus] = useState("");
  const [insertError, setInsertError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showRuler, setShowRuler] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(100);
  const editorShellRef =
    useRef<HTMLDivElement>(null);
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
  const publishingRef = useRef(false);
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
  const workspaceDocument = useMemo(() => {
    const base = contentDoc.pageLayout
      ? contentDoc
      : { ...contentDoc, layoutVersion: 2 as const, pageLayout: createV2CompatibilityLayout(contentDoc) };
    return base.pageLayout ? { ...base, pageLayout: ensureV2MainFlowFrames(base.pageLayout) } : base;
  }, [contentDoc]);

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
      return true;
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
    form.set(
      "content",
      serializeContentDocument(contentDoc),
    );

    try {
      await saveAction(form);
      setBaselineSnapshot(current);
      setSaveState("saved");
      setSaveMessage("Saved");
      return true;
    } catch (cause) {
      setSaveState("error");
      setSaveMessage("Save failed");
      setError(cause instanceof Error ? cause.message : "Unable to save changes.");
      return false;
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

  function addFeature(variant: EducationalObjectType) {
    if (!toolbarAnchorId) return;
    addBlockWithFactory(toolbarAnchorId, () => {
      const block = createEducationalObjectBlock(variant);
      const offset = contentDoc.blocks.filter(isEducationalObjectBlock).length * 24;
      return { ...block, layout: block.layout ? { ...block.layout, x: block.layout.x + offset, y: block.layout.y + offset } : block.layout };
    });
  }

  function applyToolbarBlockType(type: ContentBlockType) {
    if (!toolbarAnchorId) return;

    applyDocumentChange((current) =>
      updateBlock(
        current,
        toolbarAnchorId,
        (block) => convertBlockType(block, type),
      ),
    );

    setSaveState("dirty");
    setSaveMessage("Text style updated");
  }

  function updateText(blockId: string, value: string) {
    applyDocumentChange((current) =>
      updateBlock(current, blockId, (block) => {
        if (!isTextBlock(block)) return block;

        return {
          ...block,
          text: value,
          spans: [{ text: value }],
        };
      }),
    );
  }

  function applyBlockFormat(
    command:
      | "bold"
      | "italic"
      | "underline"
      | "strikethrough"
      | "clearFormatting"
      | "fontFamily"
      | "fontSize"
      | "textColor"
      | "highlightColor"
      | "superscript"
      | "subscript"
      | "decreaseIndent"
      | "increaseIndent"
      | "justify"
      | "lineSpacing",
    value?: string,
  ) {
    const block = contentDoc.blocks.find((entry) => entry.id === toolbarAnchorId);

    if (!block || (!isTextBlock(block) && !isListBlock(block))) {
      setSaveMessage("Select a text block first");
      return;
    }

    if (
      command === "bold" ||
      command === "italic" ||
      command === "underline" ||
      command === "superscript" ||
      command === "subscript"
    ) {
      document.execCommand(command, false);
      setSaveState("dirty");
      setSaveMessage("Inline formatting updated");
      return;
    }

    if (command === "decreaseIndent" || command === "increaseIndent") {
      const indent = Math.min(8, Math.max(0, (block.indent ?? 0) + (command === "increaseIndent" ? 1 : -1)));
      updatePatch(block.id, { indent });
      const target = globalThis.document.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`);
      if (target) target.style.marginLeft = indent ? `${indent * 24}px` : "";
      setSaveState("dirty");
      setSaveMessage("Indent updated");
      return;
    }

    if (command === "justify") {
      document.execCommand("justifyFull", false);
      setSaveState("dirty");
      setSaveMessage("Justification updated");
      return;
    }

    if (command === "lineSpacing") {
      const spacing = Number(value);
      if (!Number.isFinite(spacing)) return;
      updatePatch(block.id, { lineSpacing: Math.min(3, Math.max(1, spacing)) });
      const target = globalThis.document.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`);
      if (target) target.style.lineHeight = String(spacing);
      setSaveState("dirty");
      setSaveMessage("Line spacing updated");
      return;
    }

    if (!isTextBlock(block)) {
      setSaveMessage("Select a text block first");
      return;
    }

    if (command === "clearFormatting") {
      updatePatch(block.id, {
        fontFamily: undefined,
        fontSize: undefined,
        bold: undefined,
        italic: undefined,
        underline: undefined,
        strikethrough: undefined,
        textColor: undefined,
        highlightColor: undefined,
      });

      setSaveState("dirty");
      setSaveMessage("Formatting cleared");
      return;
    }

    if (command === "fontFamily") {
      if (!value) return;

      updatePatch(block.id, {
        fontFamily: value,
      });

      setSaveState("dirty");
      setSaveMessage("Font family updated");
      return;
    }

    if (command === "fontSize") {
      const fontSize = Number(value);

      if (
        !Number.isFinite(fontSize) ||
        fontSize < 8 ||
        fontSize > 96
      ) {
        return;
      }

      updatePatch(block.id, {
        fontSize: Math.round(fontSize),
      });

      setSaveState("dirty");
      setSaveMessage("Font size updated");
      return;
    }

    if (command === "textColor") {
      if (!value) return;

      updatePatch(block.id, {
        textColor: value,
      });

      setSaveState("dirty");
      setSaveMessage("Text colour updated");
      return;
    }

    if (command === "highlightColor") {
      if (!value) return;

      updatePatch(block.id, {
        highlightColor: value,
      });

      setSaveState("dirty");
      setSaveMessage("Highlight updated");
      return;
    }

    updatePatch(block.id, {
      [command]: !block[command],
    });

    setSaveState("dirty");
    setSaveMessage(
      `${formatCommandLabel(command)} updated`,
    );
  }

  function formatCommandLabel(
    command:
      | "bold"
      | "italic"
      | "underline"
      | "strikethrough",
  ) {
    switch (command) {
      case "bold":
        return "Bold";
      case "italic":
        return "Italic";
      case "underline":
        return "Underline";
      case "strikethrough":
        return "Strikethrough";
    }
  }

  function activeTextBlock() {
    const block =
      contentDoc.blocks.find(
        (entry) =>
          entry.id === toolbarAnchorId,
      ) ?? null;

    return block && isTextBlock(block)
      ? block
      : null;
  }

  async function copyActiveText() {
    const block = activeTextBlock();
    if (!block) return;

    const text =
      activeSelection?.blockId === block.id
        ? activeSelection.text
        : block.text;

    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setSaveMessage("Text copied");
    } catch {
      setSaveMessage("Clipboard access was blocked by the browser");
    }
  }

  async function cutActiveText() {
    const block = activeTextBlock();
    if (!block) return;

    const selection =
      activeSelection?.blockId === block.id
        ? activeSelection
        : null;

    const text = selection
      ? selection.text
      : block.text;

    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setSaveMessage("Clipboard access was blocked by the browser");
      return;
    }

    const nextText = selection
      ? block.text.slice(0, selection.start) +
        block.text.slice(selection.end)
      : "";

    updateText(block.id, nextText);
    setActiveSelection(null);
    setFocusTarget(block.id);
    setSaveState("dirty");
    setSaveMessage("Text cut");
  }

  async function pasteIntoActiveText() {
    const block = activeTextBlock();
    if (!block) return;

    let clipboardText = "";

    try {
      clipboardText =
        await navigator.clipboard.readText();
    } catch {
      setSaveMessage("Clipboard access was blocked by the browser");
      return;
    }

    if (!clipboardText) return;

    const selection =
      activeSelection?.blockId === block.id
        ? activeSelection
        : null;

    const start = selection?.start ??
      block.text.length;
    const end = selection?.end ?? start;

    const nextText =
      block.text.slice(0, start) +
      clipboardText +
      block.text.slice(end);

    updateText(block.id, nextText);
    setActiveSelection(null);
    setFocusTarget(block.id);
    setSaveState("dirty");
    setSaveMessage("Text pasted");
  }

  function selectAllActiveText() {
    const block = activeTextBlock();

    if (!block) {
      setSaveMessage("Select a text block first");
      return;
    }

    const selector =
      `[data-block-id="${block.id}"]`;

    const target =
      globalThis.document.querySelector<
        HTMLInputElement | HTMLTextAreaElement
      >(selector);

    if (!target) {
      setSaveMessage("Unable to select this block");
      return;
    }

    target.focus();
    target.setSelectionRange(
      0,
      target.value.length,
    );

    setActiveSelection({
      blockId: block.id,
      start: 0,
      end: target.value.length,
      text: target.value,
    });

    setActiveBlockId(block.id);
    setSaveMessage("Selected all text in the active block");
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
        const itemSpans = block.itemSpans ? [...block.itemSpans] : undefined;
        if (itemSpans) itemSpans[itemIndex] = [{ text: value }];
        return { ...block, items, itemSpans };
      }),
    );
  }

  function addListItem(blockId: string, itemIndex: number) {
    applyDocumentChange((current) =>
      updateBlock(current, blockId, (block) => {
        if (!isListBlock(block)) return block;
        const items = [...block.items];
        items.splice(itemIndex + 1, 0, "");
        const itemSpans = block.itemSpans ? [...block.itemSpans] : undefined;
        if (itemSpans) itemSpans.splice(itemIndex + 1, 0, [{ text: "" }]);
        return { ...block, items, itemSpans };
      }),
    );
  }

  function removeListItem(blockId: string, itemIndex: number) {
    applyDocumentChange((current) =>
      updateBlock(current, blockId, (block) => {
        if (!isListBlock(block)) return block;
        const items = block.items.filter((_, index) => index !== itemIndex);
        const itemSpans = block.itemSpans?.filter((_, index) => index !== itemIndex);
        return { ...block, items: items.length ? items : [""], itemSpans };
      }),
    );
  }

  function chooseResource(blockId: string, resourceId: string) {
    const resource = resourceChoices.find((item) => item.id === resourceId) ?? null;
    if (!resource) {
      updatePatch(blockId, { url: "", resourceId: undefined, alt: "" });
      return;
    }
    const url = contentResourcePreviewUrl(resource.id);
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
    setBuilderKind(null);
    setInsertKind(kind);
    setInsertAnchorId(anchorId);
    clearInsertFeedback();
  }

  function closeInsertSurface() {
    setInsertKind(null);
    clearInsertFeedback();
  }

  function deleteCurrentNode() {
    if (nodeType === "BOOK") return;
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
    setPreviewOpen(true);
  }

  function publishCurrentNode() {
    if (!transitionReleaseAction || publishingRef.current) return;
    publishingRef.current = true;
    setPublishing(true);
    setPublishMessage("");
    setError("");
    void (async () => {
      try {
        if (!(await saveDocument())) return;
        const form = new FormData();
        form.set("confirm", "on");
        await transitionReleaseAction("PUBLISH", form);
        setPublishMessage("Published successfully.");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to publish this content.");
      } finally {
        publishingRef.current = false;
        setPublishing(false);
      }
    })();
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
    const nextDocument = addContentPeriod(
      contentDoc,
      `Period ${contentDoc.periods.length + 1}`,
    );

    const newPeriod =
      nextDocument.periods[
        nextDocument.periods.length - 1
      ];

    if (!newPeriod) {
      setSaveMessage("Unable to create a new period");
      return;
    }

    const firstParagraph = {
      ...createTextBlock("paragraph", ""),
      periodId: newPeriod.id,
    };

    const documentWithWriter: ContentDocument = {
      ...nextDocument,
      blocks: [
        ...nextDocument.blocks,
        firstParagraph,
      ],
    };

    applyDocumentChange(() => documentWithWriter);

    setActivePeriodId(newPeriod.id);
    setActiveBlockId(firstParagraph.id);
    setFocusTarget(firstParagraph.id);
    setSaveState("dirty");
    setSaveMessage("New period added");
  }

  function ensurePeriodHasWriter(
    periodId: string,
  ) {
    const existingBlock =
      contentDoc.blocks.find(
        (block) =>
          block.periodId === periodId,
      ) ?? null;

    setActivePeriodId(periodId);
    closeMenu();

    if (existingBlock) {
      setActiveBlockId(existingBlock.id);
      setFocusTarget(existingBlock.id);
      return;
    }

    const firstParagraph = {
      ...createTextBlock("paragraph", ""),
      periodId,
    };

    applyDocumentChange((current) => {
      const alreadyHasWriter =
        current.blocks.some(
          (block) =>
            block.periodId === periodId,
        );

      if (alreadyHasWriter) {
        return current;
      }

      return {
        ...current,
        blocks: [
          ...current.blocks,
          firstParagraph,
        ],
      };
    });

    setActiveBlockId(firstParagraph.id);
    setFocusTarget(firstParagraph.id);
    setSaveState("dirty");
    setSaveMessage("Writing area created for this period");
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
    if (contentDoc.periods.length <= 1) {
      setSaveMessage("At least one period is required");
      return;
    }

    const period =
      contentDoc.periods.find(
        (entry) => entry.id === periodId,
      ) ?? null;

    if (!period) return;

    const periodBlocks =
      contentDoc.blocks.filter(
        (block) =>
          block.periodId === periodId,
      );

    const hasMeaningfulContent =
      periodBlocks.some((block) => {
        if (isTextBlock(block)) {
          return Boolean(
            block.text.trim() ||
              block.attribution?.trim(),
          );
        }

        if (isListBlock(block)) {
          return block.items.some(
            (item) => item.trim().length > 0,
          );
        }

        return true;
      });

    if (hasMeaningfulContent) {
      setSaveMessage(
        "Only a period without written or inserted content can be deleted",
      );
      return;
    }

    let nextActivePeriodId =
      activePeriodId;

    applyDocumentChange((current) => {
      const remainingBlocks =
        current.blocks.filter(
          (block) =>
            block.periodId !== periodId,
        );

      const documentWithoutStarterBlocks = {
        ...current,
        blocks: remainingBlocks,
      };

      const nextDocument =
        removeEmptyContentPeriod(
          documentWithoutStarterBlocks,
          periodId,
        );

      if (activePeriodId === periodId) {
        nextActivePeriodId =
          nextDocument.periods[0]?.id ??
          "period_default";
      }

      return nextDocument;
    });

    setActivePeriodId(nextActivePeriodId);
    setActiveBlockId(null);
    setActiveSelection(null);
    setSaveState("dirty");
    setSaveMessage("Empty period deleted");
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
        label: option.mediaKind === "video" ? "Watch Video" : option.defaultLabel,
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
    const safeUrl = contentResourcePreviewUrl(resource.id);
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
      ...(input.type === ResourceType.IMAGE ? { transport: "SAME_ORIGIN_PROXY" as const, failurePrefix: "IMAGE" } : {}),
      ...(input.type === ResourceType.VIDEO ? { transport: "SAME_ORIGIN_PROXY" as const, failurePrefix: "VIDEO" } : {}),
    });
    let response: Response;
    try {
      response = await fetch("/api/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: input.title,
          type: input.type,
          audience: input.audience,
          fileUrl: uploaded.objectKey,
          thumbnail: "",
          bookId,
          chapterId,
          moduleId: nodeType === "MODULE" ? nodeId : undefined,
          published: false,
          originalFileName: input.file.name,
          mimeType: uploaded.contentType,
          fileSizeBytes: String(uploaded.sizeBytes),
        }),
      });
    } catch {
      throw new Error(`${input.type === ResourceType.IMAGE ? "IMAGE_" : input.type === ResourceType.VIDEO ? "VIDEO_" : ""}RESOURCE_CREATE_FAILED: Network request could not be completed.`);
    }
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
      throw new Error(`${input.type === ResourceType.IMAGE ? "IMAGE_" : input.type === ResourceType.VIDEO ? "VIDEO_" : ""}RESOURCE_CREATE_FAILED: ${payload?.message || "Unable to create resource."}`);
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
      route: { href: contentResourcePreviewUrl(resource.id), openMode: "route" },
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

  async function toggleEditorFullScreen() {
    const shell = editorShellRef.current;

    if (!shell) return;

    try {
      if (globalThis.document.fullscreenElement) {
        await globalThis.document.exitFullscreen();
      } else {
        await shell.requestFullscreen();
      }
    } catch {
      setSaveMessage(
        "Full screen is not available in this browser",
      );
    }
  }

  const previewLinkedAssets = buildLinkedAssetPreviewMap(contentDoc, assetLibrary, resolvedAssets);
  const previewMedia = buildMediaPreviewMap(contentDoc, mediaLibrary, resolvedMedia);
  const wordCount = countDocumentWords({ title, subtitle, description, content: contentDoc });
  const toolbarAnchorId = activeBlockId && contentDoc.blocks.some((block) => block.id === activeBlockId)
    ? activeBlockId
    : contentDoc.blocks[contentDoc.blocks.length - 1]?.id ?? contentDoc.blocks[0]?.id ?? "";
  const renderV2Block = (block: ContentBlock) => (
    <V2ContentDocumentRenderer
      document={{ ...workspaceDocument, blocks: [block], layout: "single" }}
      mode="ADMIN_PREVIEW"
      linkedAssets={previewLinkedAssets}
      activities={resolvedActivities}
      worksheets={resolvedWorksheets}
      media={previewMedia}
      sectionDefinitions={sectionDefinitions}
      knowledgeDefinitions={knowledgeMap}
      immutableRelease={false}
    />
  );

  return (
      <div data-testid="content-studio-editor" data-node-id={nodeId} className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="min-h-0 flex-1">
        <EditorShell shellRef={editorShellRef} ribbon={null} periodTabs={null}>
          <V2DocumentWorkspace
            bookId={bookId}
            chapterId={chapterId}
            moduleId={moduleId}
            exerciseId={exerciseId}
            hasFullBookPdf={hasFullBookPdf}
            onImportPdf={importPdfAction}
            onAttachPdf={attachPdfAction}
            onListPdfVersions={listPdfVersionsAction}
            onRestorePdfVersion={restorePdfVersionAction}
            onPrepareReadAloud={prepareReadAloudAction}
            title={workspaceTitle ?? title}
            pageScope={pageScope}
            initialPageNumber={initialPageNumber}
            isBookRootContext={isBookRootContext}

            document={workspaceDocument}
            resources={resourceChoices.map((resource) => ({ id: resource.id, title: resource.title, type: resource.type, mimeType: resource.mimeType }))}
            saveState={saveState}
            dirty={dirty}
            error={error}
            wordCount={wordCount}
            zoom={zoom}
            blocks={workspaceDocument.blocks}
            renderBlock={renderV2Block}
            onSave={() => void saveDocument()}
            onUndo={undoDocument}
            onRedo={redoDocument}
            onOpenImport={() => setImportOpen(true)}
            assignmentsHref={`/admin/books/${bookId}/content/assignments/questions`}
            onPreview={openPreview}
            onPublish={publishCurrentNode}
            publishing={publishing}
            publishMessage={publishMessage}
            onZoomChange={setZoom}
            onDocumentChange={(next, message) => {
              applyDocumentChange(() => next);
              setSaveState("dirty");
              setSaveMessage(message);
            }}
            onUploadResource={async (file, uploadTitle, resourceType) => {
              const resource = await createPublisherResource({
                file,
                scope: "resource-file",
                title: uploadTitle,
                type: resourceType === "IMAGE" ? ResourceType.IMAGE : ResourceType.VIDEO,
                audience: ResourceAudience.BOTH,
              });
              return { id: resource.id, title: resource.title, type: resource.type, mimeType: resource.mimeType };
            }}
            onFrameTextChange={(frame, value, spans, framePatch) => {
              applyDocumentChange((current) => {
                const base = current.pageLayout
                  ? current
                  : { ...current, layoutVersion: 2 as const, pageLayout: createV2CompatibilityLayout(current) };
                const baseLayout = ensureV2MainFlowFrames(base.pageLayout ?? createV2CompatibilityLayout(base));
                const blockId = frame.contentRef?.blockId;
                const layoutPatch = { ...(spans ? { textSpans: spans } : {}), ...(framePatch ?? {}) };
                if (blockId) {
                  const blocks = base.blocks.map((block) => {
                    if (block.id !== blockId || !("text" in block)) return block;
                    return {
                      ...block,
                      text: value,
                      ...(block.type === "paragraph" || block.type === "heading" || block.type === "heading3" || block.type === "subheading" || block.type === "caption" || block.type === "quote" || block.type === "callout" ? { spans: spans ?? [{ text: value }] } : {}),
                    } as ContentBlock;
                  });
                  return {
                    ...base,
                    blocks,
                    layoutVersion: 2,
                    pageLayout: updateV2Frame(baseLayout, frame.pageId, frame.id, layoutPatch),
                  };
                }
                return { ...base, layoutVersion: 2, pageLayout: updateV2Frame(baseLayout, frame.pageId, frame.id, { payload: value, ...layoutPatch }) };
              });
              setSaveState("dirty");
              setSaveMessage("Text updated");
            }}
            onAddFrame={(type, pageId, frame) => {
              applyDocumentChange((current) => {
                const base = current.pageLayout
                  ? current
                  : { ...current, layoutVersion: 2 as const, pageLayout: createV2CompatibilityLayout(current) };
                const baseLayout = ensureV2MainFlowFrames(base.pageLayout ?? createV2CompatibilityLayout(base));
                let nextFrame: LayoutV2Frame = frame;
                let blocks = base.blocks;
                const periodId = base.periods[0]?.id;
                const insertionPayload = frame.payload && typeof frame.payload === "object" ? frame.payload as Record<string, unknown> : {};
                const isWorksheetLauncher =
  Boolean(getV2WorksheetLauncherPayload(frame));
                const rows = Math.max(1, Math.min(20, Number(insertionPayload.rows) || 2));
                const columns = Math.max(1, Math.min(12, Number(insertionPayload.columns) || 2));
                const educationalType = isEducationalObjectType(insertionPayload.educationalObjectType) ? insertionPayload.educationalObjectType : "didYouKnow";
                const block = type === "TEXT"
                  ? createTextBlock("paragraph", "New text frame")
                  : type === "TABLE"
                    ? createTableBlock("table", undefined, { rows, columns })
                    : type === "EDUCATIONAL"
                      ? createEducationalObjectBlock(educationalType)
                      : type === "ACTIVITY"
                        ? createActivityBlock()
                        : type === "WORKSHEET" && !isWorksheetLauncher
  ? createWorksheetBlock()
                          : type === "EXERCISE"
                            ? createExerciseBlock()
                            : null;
                if (block) {
                  const blockWithPeriod = { ...block, periodId } as ContentBlock;
                  blocks = [...blocks, blockWithPeriod];
                  nextFrame = { ...frame, contentRef: { blockId: blockWithPeriod.id }, payload: undefined };
                }
                return { ...base, blocks, layoutVersion: 2, pageLayout: addV2FrameToPage(baseLayout, pageId, nextFrame) };
              });
              setSaveState("dirty");
              setSaveMessage(`${type} frame inserted`);
            }}
          />
        </EditorShell>
        </div>
        <IdmlImportPanel open={importOpen} onClose={() => setImportOpen(false)} bookId={bookId} nodeId={nodeId} nodeType={nodeType} currentDocument={workspaceDocument} />
        <DraftPreviewDrawer
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          mode={previewMode}
          title={title}
          subtitle={subtitle}
          description={description}
          document={workspaceDocument}
          linkedAssets={previewLinkedAssets}
          activities={resolvedActivities}
          worksheets={resolvedWorksheets}
          media={previewMedia}
          sectionDefinitions={sectionDefinitions}
          knowledgeDefinitions={knowledgeMap}
          resourceUrls={Object.fromEntries(resourceChoices.map((resource) => [resource.id, contentResourcePreviewUrl(resource.id)]))}
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
  resourceUrls,
}: {
  open: boolean;
  onClose: () => void;
  mode: PreviewSurfaceMode;
  title: string;
  subtitle: string;
  description: string;
  document: ContentDocument;
  linkedAssets: Record<string, ResolvedLinkedAsset | null>;
  activities: Record<string, ResolvedActivityBlock>;
  worksheets: Record<string, ResolvedWorksheetBlock>;
  media: Record<string, ResolvedMediaBlock | null>;
  sectionDefinitions: ContentSectionDefinitionSummary[];
  knowledgeDefinitions: Record<string, KnowledgeDefinitionSummary | null>;
  resourceUrls: Record<string, string>;
}) {
  const previewPages = document.pageLayout?.pages ?? [];
  const [activePreviewPageId, setActivePreviewPageId] = useState(previewPages[0]?.id ?? "");

  if (!open) return null;

  const requestedPageIndex = previewPages.findIndex((page) => page.id === activePreviewPageId);
  const activePreviewPageIndex = requestedPageIndex >= 0 ? requestedPageIndex : 0;
  const activePreviewPage = previewPages[activePreviewPageIndex] ?? previewPages[0] ?? null;
  const selectedPageDocument: ContentDocument = {
    ...document,
    pageLayout: activePreviewPage && document.pageLayout ? { ...document.pageLayout, pages: [activePreviewPage] } : document.pageLayout,
  };
  const previewNarration = buildV2NarrationManifest(selectedPageDocument, mode === "STUDENT" ? "STUDENT" : mode === "TEACHER" ? "TEACHER" : "ADMIN_PREVIEW", { scopeId: `preview:${activePreviewPage?.id ?? "none"}` });
  const goToPreviousPage = () => {
    if (activePreviewPageIndex > 0) setActivePreviewPageId(previewPages[activePreviewPageIndex - 1]?.id ?? "");
  };
  const goToNextPage = () => {
    if (activePreviewPageIndex < previewPages.length - 1) setActivePreviewPageId(previewPages[activePreviewPageIndex + 1]?.id ?? "");
  };

  return (
    <StudioBuilderDrawer open={open} title={`${previewModeLabel(mode)} Preview`} description="The current page layout is rendered through the shared delivery renderer." onClose={onClose}>
      <div className="min-w-0">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {previewPages.map((page, index) => <button key={page.id} type="button" onClick={() => setActivePreviewPageId(page.id)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${page.id === activePreviewPage?.id ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{`Page ${index + 1}`}</button>)}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <button type="button" onClick={goToPreviousPage} disabled={activePreviewPageIndex <= 0} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Previous page</button>
            <p className="text-sm font-semibold text-slate-500">{previewPages.length ? `Page ${activePreviewPageIndex + 1} of ${previewPages.length}` : "No pages available"}</p>
            <button type="button" onClick={goToNextPage} disabled={activePreviewPageIndex >= previewPages.length - 1} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Next page</button>
          </div>
        </div>
        {activePreviewPage ? <div className="overflow-auto bg-[#e7ebf0] px-6 py-8">
          <div data-v2-preview-read-aloud-bar data-v2-preview-page-id={activePreviewPage.id} className="mx-auto mb-4 max-w-[96rem]"><V2ReadAloudPlayer manifest={previewNarration} audioUrls={resourceUrls} /></div>
          <V2ContentDocumentRenderer document={selectedPageDocument} mode={mode === "WHITEBOARD" ? "ADMIN_PREVIEW" : mode} linkedAssets={linkedAssets} activities={activities} worksheets={worksheets} media={media} sectionDefinitions={sectionDefinitions} knowledgeDefinitions={knowledgeDefinitions} resourceUrls={resourceUrls} assessmentPreview className={`min-w-0 max-w-full ${mode === "WHITEBOARD" ? "mx-auto max-w-[96rem]" : ""}`} />
        </div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm font-semibold text-slate-500">No page is available for preview.</div>}
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
    <StudioBuilderDrawer open={open} title={`Insert ${blockLabelForDrawer(kind)}`} size="compact" onClose={onClose}>
      <div className="space-y-4">
        {kind === "image" ? (
          <>
            <LibrarySection
              title="Choose Existing Image"
              items={imageChoices.map((resource) => ({
                key: resource.id,
                title: resource.title,
                detail: resource.mimeType || "Image",
                thumbnail: sanitizeUrl(resource.thumbnail ?? "") || sanitizeUrl(resource.fileUrl ?? "") || undefined,
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
                detail: mediaKindLabel(option.mediaKind),
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
                detail: `${option.sourceBadge} ? ${option.sourceDetail} ? ${option.scopeLabel}`,
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
              detail: `${option.sourceBadge} ? ${option.sourceDetail} ? ${option.scopeLabel}`,
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
  bookId,
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
  bookId: string;
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
          className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium ${tab === "existing" ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}
        >
          Choose Existing
        </button>
        <button
          type="button"
          onClick={() => onChangeTab("create")}
          className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium ${tab === "create" ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}
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
            bookId={bookId}
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
  items: { key: string; title: string; detail: string; thumbnail?: string; onChoose: () => void }[];
  emptyText?: string;
}) {
  const [query, setQuery] = useState("");
  const filteredItems = items.filter((item) => {
    const normalized = query.trim().toLowerCase();
    return !normalized || `${item.title} ${item.detail}`.toLowerCase().includes(normalized);
  });

  return (
    <section className={compactPanel}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <span className="text-xs text-slate-400">{items.length}</span>
      </div>
      {items.length > 2 ? (
        <input
          aria-label={`Search ${title.toLowerCase()}`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${title.toLowerCase().replace("choose existing ", "")}...`}
          className={compactField}
        />
      ) : null}
      <div className="mt-3 space-y-1.5">
        {filteredItems.map((item) => (
          <button key={item.key} type="button" onClick={item.onChoose} className={compactResourceRow}>
            {item.thumbnail ? (
              <span aria-hidden="true" className="h-9 w-9 shrink-0 rounded-md bg-slate-100 bg-cover bg-center ring-1 ring-slate-200" style={{ backgroundImage: `url("${item.thumbnail}")` }} />
            ) : (
              <span aria-hidden="true" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold uppercase text-slate-500 ring-1 ring-slate-200">{item.detail.slice(0, 1)}</span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-900">{item.title}</span>
              <span className="mt-0.5 block truncate text-[11px] text-slate-500">{item.detail}</span>
            </span>
          </button>
        ))}
        {!filteredItems.length ? <p className="px-1 py-2 text-xs text-slate-500">{items.length ? "No matching items." : emptyText}</p> : null}
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
  const [file, setFile] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const previewUrlRef = useRef("");

  const [resourceTitle, setResourceTitle] =
    useState("");

  const [resourceType, setResourceType] =
    useState<ResourceType>(
      allowedTypes[0] ??
        ResourceType.PDF,
    );

  const [audience, setAudience] =
    useState<ResourceAudience>(
      ResourceAudience.BOTH,
    );

  const [caption, setCaption] =
    useState("");

  function chooseFile(
    nextFile: File | null,
  ) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(
        previewUrlRef.current,
      );
    }

    const nextPreview =
      imageMode && nextFile
        ? URL.createObjectURL(nextFile)
        : "";

    previewUrlRef.current = nextPreview;
    setPreviewUrl(nextPreview);
    setFile(nextFile);

    if (
      nextFile &&
      !resourceTitle.trim()
    ) {
      setResourceTitle(
        nextFile.name.replace(
          /\.[^.]+$/,
          "",
        ),
      );
    }
  }

  useEffect(
    () => () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(
          previewUrlRef.current,
        );
      }
    },
    [],
  );

  const canSubmit =
    Boolean(file) &&
    Boolean(resourceTitle.trim()) &&
    !busy;

  return (
    <section className={compactPanel}>
      <h3 className="text-sm font-bold text-slate-950">
        {title}
      </h3>

      {imageMode ? (
        <div className="mt-3 space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            Choose Image
            <input
              type="file"
              accept={
                fileAccept ??
                "image/jpeg,image/png,image/webp"
              }
              onChange={(event) =>
                chooseFile(
                  event.target.files?.[0] ??
                    null,
                )
              }
              className={compactField}
            />
          </label>

          {previewUrl ? (
            // Local object URLs are intentionally used for the pre-upload preview.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Selected image preview"
              className="max-h-48 w-full rounded-xl object-contain ring-1 ring-slate-200"
            />
          ) : null}

          <label className="block text-sm font-semibold text-slate-700">
            Image Name
            <input
              value={resourceTitle}
              onChange={(event) =>
                setResourceTitle(
                  event.target.value,
                )
              }
              placeholder="Enter image name"
              className={compactField}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Caption{" "}
            <span className="font-normal text-slate-400">
              (optional)
            </span>
            <input
              value={caption}
              onChange={(event) =>
                setCaption(
                  event.target.value,
                )
              }
              placeholder="Add a short caption"
              className={compactField}
            />
          </label>
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Title
            <input
              value={resourceTitle}
              onChange={(event) =>
                setResourceTitle(
                  event.target.value,
                )
              }
              className={compactField}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Type
            <select
              value={resourceType}
              onChange={(event) =>
                setResourceType(
                  event.target
                    .value as ResourceType,
                )
              }
              className={compactField}
            >
              {allowedTypes.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Audience
            <select
              value={audience}
              onChange={(event) =>
                setAudience(
                  event.target
                    .value as ResourceAudience,
                )
              }
              className={compactField}
            >
              <option
                value={ResourceAudience.BOTH}
              >
                Both
              </option>
              <option
                value={
                  ResourceAudience.STUDENT
                }
              >
                Student
              </option>
              <option
                value={
                  ResourceAudience.TEACHER_ONLY
                }
              >
                Teacher Only
              </option>
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            File
            <input
              type="file"
              accept={fileAccept}
              onChange={(event) =>
                chooseFile(
                  event.target.files?.[0] ??
                    null,
                )
              }
              className={compactField}
            />
          </label>
        </div>
      )}

      {uploadProgress > 0 ? (
        <p className="mt-3 text-sm font-semibold text-slate-500">
          Upload {uploadProgress}%
        </p>
      ) : null}

      {status ? (
        <p className="mt-3 text-sm font-semibold text-slate-500">
          {status}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => {
          if (!file) return;

          const name =
            resourceTitle.trim();

          onSubmit({
            file,
            title: name,
            type: imageMode
              ? ResourceType.IMAGE
              : resourceType,
            audience: imageMode
              ? ResourceAudience.BOTH
              : audience,
            image: imageMode
              ? {
                  alt: name,
                  caption:
                    caption.trim(),
                  align: "center",
                  width: "wide",
                }
              : undefined,
          });
        }}
        className={`${compactPrimaryButton} mt-3`}
      >
        {busy
          ? "Uploading..."
          : "Upload and Insert"}
      </button>
    </section>
  );
}

function blockLabelForDrawer(kind: ToolbarInsertKind) {
  switch (kind) {
    case "image":
      return "Image";
    case "media":
      return "Video";
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
    if (isActivityBlock(block)) parts.push(block.title ?? "", ...block.fields.map((entry) => entry.text ?? ""));
    if (isWorksheetBlock(block)) parts.push(block.title ?? "", block.instructions ?? "", block.description ?? "", block.teacherNote ?? "", ...block.questions.flatMap((question) => [question.prompt, question.answer ?? "", question.explanation ?? ""]));
    if (isExerciseBlock(block)) parts.push(block.title ?? "", block.introduction ?? "", block.instructions ?? "", block.teacherNote ?? "", ...block.questions.flatMap((question) => [question.prompt, question.answer ?? "", question.explanation ?? ""]), ...block.groups.flatMap((group) => [group.title ?? "", group.instructions ?? "", ...group.questions.flatMap((question) => [question.prompt, question.answer ?? "", question.explanation ?? ""])]) );
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

type ManuscriptBlock = TextBlock | ListBlock;

function isManuscriptBlock(block: ContentBlock): block is ManuscriptBlock {
  return (isTextBlock(block) || isListBlock(block)) && !block.layout;
}

type FloatingBoxContentType = "TEXT" | "IMAGE" | "VIDEO" | "TABLE";

function createFloatingBoxContent(type: FloatingBoxContentType): ContentBlock {
  const layout = {
    x: 0,
    y: 0,
    width: 640,
    height: type === "IMAGE" ? 360 : type === "VIDEO" ? 360 : type === "TABLE" ? 240 : 180,
    zIndex: 0,
    digital: { width: "content" as const, alignment: "left" as const, visibility: "all" as const },
  };
  const block = type === "TEXT"
    ? createTextBlock("paragraph", "")
    : type === "IMAGE"
      ? createBlockByType("image")
      : type === "VIDEO"
        ? createBlockByType("media")
        : createTableBlock("table", undefined, { rows: 2, columns: 2 });
  return { ...block, layout };
}

function FloatingBoxHeader({
  block,
  canMoveUp,
  canMoveDown,
  onDelete,
  onMove,
  onAddContent,
}: {
  block: ContentBlock;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onAddContent: (type: FloatingBoxContentType) => void;
}) {
  const button = "rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5" onPointerDown={(event) => event.stopPropagation()}>
      <span className="mr-auto text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Floating {blockLabel(block.type)}</span>
      <button type="button" className={button} onClick={() => onMove(-1)} disabled={!canMoveUp}>Move Up</button>
      <button type="button" className={button} onClick={() => onMove(1)} disabled={!canMoveDown}>Move Down</button>
      <button type="button" className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50" onClick={onDelete}>Delete</button>
      <details className="relative">
        <summary className={`${button} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>Add Content</summary>
        <div className="absolute right-0 z-30 mt-1 flex min-w-40 flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
          {(["TEXT", "IMAGE", "VIDEO", "TABLE"] as const).map((type) => (
            <button key={type} type="button" className="rounded-md px-2 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => onAddContent(type)}>{type[0]}{type.slice(1).toLowerCase()}</button>
          ))}
        </div>
      </details>
    </div>
  );
}

function takeManuscriptRun(blocks: ContentBlock[], start: number) {
  const run: ManuscriptBlock[] = [];
  for (let index = start; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (!block || !isManuscriptBlock(block)) break;
    run.push(block);
  }
  return run;
}

function blockContainsQuery(block: ContentBlock, query: string) {
  if (isTextBlock(block)) return block.text.toLowerCase().includes(query);
  if (isListBlock(block)) return block.items.some((item) => item.toLowerCase().includes(query));
  if (isFormulaBlock(block)) return block.expression.toLowerCase().includes(query);
  if (isInfoBoxBlock(block) || isObservationBoxBlock(block)) return block.text.toLowerCase().includes(query);
  if (isActivityBlock(block)) return [block.title ?? "", ...block.fields.map((entry) => entry.text ?? "")].join(" ").toLowerCase().includes(query);
  if (isWorksheetBlock(block)) return [block.title ?? "", block.instructions ?? "", block.description ?? "", ...block.questions.flatMap((question) => [question.prompt, question.answer ?? ""])].join(" ").toLowerCase().includes(query);
  if (isExerciseBlock(block)) return [block.title ?? "", block.introduction ?? "", block.instructions ?? "", ...block.questions.flatMap((question) => [question.prompt, question.answer ?? ""]), ...block.groups.flatMap((group) => [group.title ?? "", ...group.questions.map((question) => question.prompt)])].join(" ").toLowerCase().includes(query);
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
