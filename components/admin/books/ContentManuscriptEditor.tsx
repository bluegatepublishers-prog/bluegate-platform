"use client";

import EditorShell from "@/components/admin/books/editor/EditorShell";
import DocumentWorkspace from "@/components/admin/books/editor/DocumentWorkspace";
import LayoutObjectFrame from "@/components/admin/books/editor/LayoutObjectFrame";
import ContinuousTextEditor from "@/components/admin/books/editor/ContinuousTextEditor";
import PeriodTabs from "@/components/admin/books/editor/PeriodTabs";
import WordRibbon from "@/components/admin/books/editor/WordRibbon";
import TextBlockEditor from "@/components/admin/books/editor/blocks/TextBlockEditor";
import ImageBlockEditor from "@/components/admin/books/editor/blocks/ImageBlockEditor";
import TableBlockEditor from "@/components/admin/books/editor/blocks/TableBlockEditor";
import ActivityBlockEditor from "@/components/admin/books/editor/blocks/ActivityBlockEditor";
import WorksheetBlockEditor from "@/components/admin/books/editor/blocks/WorksheetBlockEditor";
import ExerciseBlockEditor from "@/components/admin/books/editor/blocks/ExerciseBlockEditor";
import MediaBlockEditor from "@/components/admin/books/editor/blocks/MediaBlockEditor";
import LinkedAssetEditor from "@/components/admin/books/editor/blocks/LinkedAssetEditor";
import ListBlockEditor from "@/components/admin/books/editor/blocks/ListBlockEditor";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { ClipboardEvent, KeyboardEvent, MouseEvent } from "react";
import { ResourceAudience, ResourceType } from "@prisma/client";
import ActivityStudio from "@/components/admin/books/ActivityStudio";
import ContentDocumentRenderer from "@/components/admin/books/ContentDocumentRenderer";
import ContentReleasePanel from "@/components/admin/books/ContentReleasePanel";
import ExerciseAuthoringStudio from "@/components/admin/books/ExerciseAuthoringStudio";
import StudioBuilderDrawer from "@/components/admin/books/StudioBuilderDrawer";
import WorksheetStudio from "@/components/admin/books/WorksheetStudio";
import {
  deleteContentNodeAction,
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
  removeBlock,
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
import { EDUCATIONAL_OBJECT_REGISTRY, getEducationalObjectDefinition } from "@/lib/educational-object-registry";
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [releasePanelOpen, setReleasePanelOpen] = useState(false);
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
    form.set(
      "content",
      serializeContentDocument(contentDoc),
    );

    try {
      await saveAction(form);
      setBaselineSnapshot(current);
      setSaveState("saved");
      setSaveMessage("Saved");
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

  function addFeature(variant: EducationalObjectType) {
  if (!toolbarAnchorId) return;

  addBlockWithFactory(toolbarAnchorId, () => {
    return createEducationalObjectBlock(variant);
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
    if (!transitionReleaseAction) return;
    const form = new FormData();
    form.set("confirm", "on");
    void transitionReleaseAction("PUBLISH", form);
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
        chapterId,
        moduleId: nodeType === "MODULE" ? nodeId : undefined,
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
  return (
    <div
      data-testid="content-studio-editor"
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
      <EditorShell
  shellRef={editorShellRef}
  ribbon={
      <WordRibbon
      lifecycleLabel={
        releaseSummary?.lifecycle === "PUBLISHED"
          ? "Published"
          : "Draft"
      }
      saveState={saveState}
      dirty={dirty}
      activeBlockType={
        contentDoc.blocks.find(
          (block) => block.id === toolbarAnchorId,
        )?.type ?? "paragraph"
      }
      layout={contentDoc.layout}
      canvasPreset={contentDoc.canvas.preset}
      canUndo={canUndo}
      canRedo={canRedo}
      canPublish={Boolean(transitionReleaseAction)}
      onSave={() => void saveDocument()}
      onUndo={undoDocument}
      onRedo={redoDocument}
      onDelete={deleteCurrentNode}
      onPublish={publishCurrentNode}
      onPreview={openPreview}
      onSearch={() => setSearchOpen(true)}
      onPaste={() => void pasteIntoActiveText()}
      onCut={() => void cutActiveText()}
      onCopy={() => void copyActiveText()}
      onSelectAll={selectAllActiveText}
      onFormat={(command, value) => {
        if (
          command === "bold" ||
          command === "italic" ||
          command === "underline" ||
          command === "strikethrough" ||
          command === "clearFormatting" ||
          command === "fontFamily" ||
          command === "fontSize" ||
          command === "textColor" ||
          command === "highlightColor" ||
          command === "superscript" ||
          command === "subscript" ||
          command === "decreaseIndent" ||
          command === "increaseIndent" ||
          command === "justify" ||
          command === "lineSpacing"
        ) {
          applyBlockFormat(command, value);
        }
      }}
      onChangeBlockType={applyToolbarBlockType}
      onAlignLeft={() =>
        updatePatch(toolbarAnchorId, {
          align: "left",
        })
      }
      onAlignCenter={() =>
        updatePatch(toolbarAnchorId, {
          align: "center",
        })
      }
      onAlignRight={() =>
        updatePatch(toolbarAnchorId, {
          align: "right",
        })
      }
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
      onChangeCanvas={(preset: CanvasPreset) => {
        applyDocumentChange((current) => ({
          ...current,
          canvas: { ...current.canvas, preset },
        }));
        setSaveState("dirty");
        setSaveMessage(`Canvas set to ${preset}`);
      }}
      onInsert={(kind) => {
        if (kind === "activity") {
          if (!toolbarAnchorId) return;
          addBlockWithFactory(toolbarAnchorId, createActivityBlock);
          return;
        }

        if (kind === "worksheet") {
          if (!toolbarAnchorId) return;
          addBlockWithFactory(toolbarAnchorId, createWorksheetBlock);
          return;
        }

        if (kind === "exercise") {
          if (!toolbarAnchorId) return;
          addBlockWithFactory(toolbarAnchorId, createExerciseBlock);
          return;
        }

        if (kind === "qr") {
          openInsertSurface("resource");
          return;
        }

        openInsertSurface(kind);
      }}
      onInsertTable={(rows, columns) => {
        if (!toolbarAnchorId) return;
        addBlockWithFactory(toolbarAnchorId, () => createTableBlock("table", undefined, { rows, columns }));
      }}
      onInsertList={(type) => {
        if (!toolbarAnchorId) return;
        addBlock(type, toolbarAnchorId);
      }}
      onInsertFeature={addFeature}
      onAddPeriod={addPeriod}
      onToggleRuler={() =>
        setShowRuler(
          (current) => !current,
        )
      }
      onToggleGrid={() =>
        setShowGrid(
          (current) => !current,
        )
      }
      onZoomOut={() =>
        setZoom((current) =>
          Math.max(50, current - 10),
        )
      }
      onZoomIn={() =>
        setZoom((current) =>
          Math.min(200, current + 10),
        )
      }
      onFullScreen={() =>
        void toggleEditorFullScreen()
      }
      />
  }
  periodTabs={
    <div className="bg-white px-4">
      <PeriodTabs
        periods={contentDoc.periods}
        activePeriodId={activePeriodId}
        editingPeriodId={editingPeriodId}
        periodTitleDraft={periodTitleDraft}
        onSelectPeriod={ensurePeriodHasWriter}
        onBeginRename={beginPeriodRename}
        onChangeTitleDraft={setPeriodTitleDraft}
        onCommitRename={commitPeriodRename}
        onCancelRename={() =>
          setEditingPeriodId(null)
        }
        onDeleteEmptyPeriod={deleteEmptyPeriod}
        onAddPeriod={addPeriod}
      />
    </div>
  }
>
  {searchOpen ? (
    <div className="border-b border-slate-200 bg-white px-4 py-2">
      <div className="mx-auto flex max-w-4xl items-center gap-2">
        <input
          value={searchQuery}
          onChange={(event) =>
            setSearchQuery(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              focusSearchResult();
            }

            if (event.key === "Escape") {
              setSearchOpen(false);
            }
          }}
          autoFocus
          placeholder="Find in document"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />

        <button
          type="button"
          onClick={focusSearchResult}
          className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
        >
          Find
        </button>

        <button
          type="button"
          onClick={() => setSearchOpen(false)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Close
        </button>
      </div>
    </div>
  ) : null}

  <DocumentWorkspace
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
    canvas={contentDoc.canvas}
    wordCount={wordCount}
    showRuler={showRuler}
    showGrid={showGrid}
    zoom={zoom}
    onZoomOut={() =>
      setZoom((current) =>
        Math.max(50, current - 10),
      )
    }
    onZoomIn={() =>
      setZoom((current) =>
        Math.min(200, current + 10),
      )
    }
  >
    {contentDoc.blocks
      .filter(
        (block) =>
          block.periodId === activePeriodId,
      )
      .map((block, index, visibleBlocks) => {
        if (isManuscriptBlock(block)) {
          if (index > 0 && isManuscriptBlock(visibleBlocks[index - 1])) return null;
          const run = takeManuscriptRun(visibleBlocks, index);
          return (
            <ContinuousTextEditor
              key={`manuscript-${block.id}`}
              blocks={run}
              onActivate={(blockId) => setActiveBlockId(blockId)}
              onChange={(next) => {
                applyDocumentChange((current) => {
                  const runIds = new Set(run.map((entry) => entry.id));
                  const firstIndex = current.blocks.findIndex((entry) => runIds.has(entry.id));
                  const blocks = current.blocks.filter((entry) => !runIds.has(entry.id));
                  blocks.splice(Math.max(0, firstIndex), 0, ...next.map((entry) => ({ ...entry, periodId: entry.periodId ?? activePeriodId })));
                  return { ...current, blocks };
                });
                setSaveState("dirty");
                setSaveMessage("Manuscript updated");
              }}
            />
          );
        }
        return (
          <LayoutObjectFrame
            key={block.id}
            enabled
            layout={block.layout}
            selected={activeBlockId === block.id}
            onChange={(layout) => updatePatch(block.id, { layout })}
            onArrange={(direction) => updatePatch(block.id, { layout: { ...((block.layout ?? { x: 0, y: 0, width: 640, height: 180, zIndex: 0 })), zIndex: (block.layout?.zIndex ?? 0) + direction } })}
            onDuplicate={() => {
              applyDocumentChange((current) => duplicateBlock(current, block.id));
              setSaveState("dirty");
              setSaveMessage("Object duplicated");
            }}
            onDelete={() => {
              applyDocumentChange((current) => removeBlock(current, block.id));
              setActiveBlockId(null);
              setSaveState("dirty");
              setSaveMessage("Object deleted");
            }}
          >
            <BlockEditor
          bookId={bookId}
          block={block}
          index={index}
          resources={resourceChoices}
          assetOptions={assetLibrary}
          mediaOptions={mediaLibrary}
          sectionDefinitions={sectionDefinitions}
          resolvedAsset={
            previewLinkedAssets[block.id] ?? null
          }
          resolvedMedia={
            previewMedia[block.id] ?? null
          }
          menuOpen={menuAnchor === block.id}
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
          onDelete={() => {
            applyDocumentChange(
              (current) =>
                removeBlock(
                  current,
                  block.id,
                ),
            );
            setActiveBlockId(null);
            setActiveSelection(null);
            setSaveState("dirty");
            setSaveMessage("Block deleted");
          }}
          onUpdateListItem={(
            itemIndex,
            value,
          ) =>
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
          </LayoutObjectFrame>
        );
      })}
  </DocumentWorkspace>
</EditorShell>

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
        title={title}
        subtitle={subtitle}
        description={description}
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
  resolvedAsset,
  resolvedMedia,
  menuOpen,
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
  onDelete,
  onUpdateListItem,
  onAddListItem,
  onChooseResource,
  onClearImage,
  onUpdateLinkedAsset,
  onUpdateMedia,
  onActivate,
  onKeyDown,
  onListKeyDown,
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
  onDelete: () => void;
  onUpdateListItem: (itemIndex: number, value: string) => void;
  onAddListItem: (itemIndex: number) => void;
  onChooseResource: (resourceId: string) => void;
  onClearImage: () => void;
  onUpdateLinkedAsset: (patch: Partial<LinkedAssetBlock>) => void;
  onUpdateMedia: (patch: Partial<MediaBlock>) => void;
  onActivate: () => void;
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
}) {
  const shell = "group py-1";
    const collapsed = block.collapsed === true;

  return (
    <article className={shell} onFocusCapture={onActivate} onMouseDown={onActivate}>
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
          <TableBlockEditor
            block={block}
            onUpdatePatch={onUpdatePatch}
            onDeleteTable={onDelete}
          />
        ) : null}

        {!collapsed && isActivityBlock(block) ? (
          <ActivityBlockEditor
            block={block}
            resources={resources}
            onUpdatePatch={onUpdatePatch}
          />
        ) : null}

        {!collapsed && isWorksheetBlock(block) ? (
          <WorksheetBlockEditor
            block={block}
            resources={resources}
            onUpdatePatch={onUpdatePatch}
          />
        ) : null}

        {!collapsed && isExerciseBlock(block) ? (
          <ExerciseBlockEditor
            block={block}
            resources={resources}
            onUpdatePatch={onUpdatePatch}
          />
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

        {!collapsed && isEducationalObjectBlock(block) ? (
          <EducationalObjectEditor block={block} onUpdatePatch={onUpdatePatch} />
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

function EducationalObjectEditor({
  block,
  onUpdatePatch,
}: {
  block: Extract<ContentBlock, { type: "educationalObject" }>;
  onUpdatePatch: (patch: Partial<ContentBlock>) => void;
}) {
  const definition = getEducationalObjectDefinition(block.objectType);
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-blue-800">
        <span>{definition.label}</span>
        <span className="text-blue-400">Educational object</span>
      </div>
      <div className="grid gap-3">
        <label className="text-sm font-semibold text-slate-700">
          Element type
          <select value={block.objectType} onChange={(event) => onUpdatePatch({ objectType: event.target.value as EducationalObjectType })} className={field}>
            {EDUCATIONAL_OBJECT_REGISTRY.map(([type, label]) => <option key={type} value={type}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Title
          <input value={block.title ?? ""} onChange={(event) => onUpdatePatch({ title: event.target.value })} className={field} placeholder={definition.defaultTitle} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Body
          <textarea value={block.text} onChange={(event) => onUpdatePatch({ text: event.target.value })} rows={4} className={field} placeholder="Write the educational prompt or explanation." />
        </label>
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


  function DraftPreviewDrawer({
  open,
  onClose,
  mode,
  title,
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
}) {
  const previewPeriods = document.periods;
  const [activePreviewPeriodId, setActivePreviewPeriodId] =
    useState(previewPeriods[0]?.id ?? "");

  if (!open) return null;

  const requestedPeriodIndex =
    previewPeriods.findIndex(
      (period) =>
        period.id === activePreviewPeriodId,
    );

  const activePeriodIndex =
    requestedPeriodIndex >= 0
      ? requestedPeriodIndex
      : 0;

  const activePeriod =
    previewPeriods[activePeriodIndex] ??
    previewPeriods[0] ??
    null;

  const selectedPeriodDocument: ContentDocument = {
    ...document,
    periods: activePeriod ? [activePeriod] : [],
    blocks: activePeriod
      ? document.blocks.filter(
          (block) =>
            block.periodId === activePeriod.id,
        )
      : [],
  };

  const goToPreviousPeriod = () => {
    if (activePeriodIndex <= 0) return;

    setActivePreviewPeriodId(
      previewPeriods[activePeriodIndex - 1]?.id ??
        "",
    );
  };

  const goToNextPeriod = () => {
    if (
      activePeriodIndex >=
      previewPeriods.length - 1
    ) {
      return;
    }

    setActivePreviewPeriodId(
      previewPeriods[activePeriodIndex + 1]?.id ??
        "",
    );
  };

  return (
    <StudioBuilderDrawer
      open={open}
      title={`${previewModeLabel(mode)} Preview`}
      description="Each period opens as a separate manuscript page."
      onClose={onClose}
    >
      <div className="min-w-0">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {previewPeriods.map(
              (period, index) => {
                const active =
                  period.id ===
                  activePeriod?.id;

                return (
                  <button
                    key={period.id}
                    type="button"
                    onClick={() =>
                      setActivePreviewPeriodId(
                        period.id,
                      )
                    }
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {period.title ||
                      `Period ${index + 1}`}
                  </button>
                );
              },
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goToPreviousPeriod}
              disabled={activePeriodIndex <= 0}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous period
            </button>

            <p className="text-sm font-semibold text-slate-500">
              {previewPeriods.length
                ? `Period ${
                    activePeriodIndex + 1
                  } of ${
                    previewPeriods.length
                  }`
                : "No periods available"}
            </p>

            <button
              type="button"
              onClick={goToNextPeriod}
              disabled={
                activePeriodIndex >=
                previewPeriods.length - 1
              }
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next period
            </button>
          </div>
        </div>

        {activePeriod ? (
          <div className="overflow-auto bg-[#e7ebf0] px-6 py-8">
            <ContentDocumentRenderer
              document={selectedPeriodDocument}
              moduleTitle={title}
              mode={
                mode === "WHITEBOARD"
                  ? "ADMIN_PREVIEW"
                  : (mode as ContentRenderMode)
              }
              linkedAssets={linkedAssets}
              activities={activities}
              worksheets={worksheets}
              media={media}
              sectionDefinitions={
                sectionDefinitions
              }
              knowledgeDefinitions={
                knowledgeDefinitions
              }
              className="min-w-0 max-w-full"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm font-semibold text-slate-500">
            No period is available for preview.
          </div>
        )}
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
    <section className="rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
      <h3 className="text-sm font-bold text-slate-950">
        {title}
      </h3>

      {imageMode ? (
        <div className="mt-4 space-y-4">
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
              className={field}
            />
          </label>

          {previewUrl ? (
            // Local object URLs are intentionally used for the pre-upload preview.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Selected image preview"
              className="max-h-56 w-full rounded-2xl object-contain ring-1 ring-slate-200"
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
              className={field}
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
              className={field}
            />
          </label>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Title
            <input
              value={resourceTitle}
              onChange={(event) =>
                setResourceTitle(
                  event.target.value,
                )
              }
              className={field}
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
              className={field}
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
              className={field}
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
              className={field}
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
        className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
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
  return isTextBlock(block) || isListBlock(block);
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
