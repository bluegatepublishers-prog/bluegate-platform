"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, PointerEvent, ReactNode } from "react";

import V2PageCanvas from "@/components/admin/books/editor/V2PageCanvas";
import PdfImportDialog from "@/components/admin/books/editor/PdfImportDialog";
import ProtectedResourceThumbnail from "@/components/admin/books/editor/ProtectedResourceThumbnail";
import V2TextFrame from "@/components/admin/books/editor/V2TextFrame";
import V2FrameContent from "@/components/content/v2/V2FrameContent";
import V2ReadAloudPlayer from "@/components/content/V2ReadAloudPlayer";
import V2BookQuestionsAuthoring from "@/components/admin/books/editor/V2BookQuestionsAuthoring";
import V2WorksheetLauncherAuthoring from "@/components/admin/books/editor/V2WorksheetLauncherAuthoring";
import V2PublisherAssessmentLauncherAuthoring from "@/components/admin/books/editor/V2PublisherAssessmentLauncherAuthoring";
import V2AssessmentLauncherVisual from "@/components/content/v2/V2AssessmentLauncherVisual";
import V2WorksheetLauncherVisual from "@/components/content/v2/V2WorksheetLauncherVisual";
import ReadAloudPageInspector from "@/components/admin/books/editor/ReadAloudPageInspector";
import V2ImageVisual from "@/components/content/v2/V2ImageVisual";
import type { ContentBlock, ContentDocument } from "@/lib/content-document";
import { createV2AssessmentLauncherPayload, createV2PublisherAssessmentLauncherPayload, getV2AssessmentLauncherPayload } from "@/lib/v2-assessment-launcher";
import { createV2WorksheetLauncherPayload, getV2WorksheetLauncherPayload } from "@/lib/v2-worksheet-launcher";
import { buildV2NarrationManifest, getNarrationStatus } from "@/lib/content-narration";
import { EDUCATIONAL_OBJECT_REGISTRY, getEducationalObjectDefinition } from "@/lib/educational-object-registry";
import { getAllBookPageViews, getBookPageViewsForRange, type BookPageScope } from "@/lib/book-page-filter";
import type { V2TextFramePatch, V2TextLayoutSpan } from "@/lib/content-layout-v2-text";
import {
  addV2Page,
  arrangeV2Frame,
  clampV2FrameGeometry,
  deleteV2Page,
  deleteV2Frame,
  duplicateV2Frame,
  ensureV2MainFlowFrames,
  getV2Frame,
  getV2InsertionGeometry,
  isV2MainFlowFrame,
  moveV2ChildToPage,
  moveV2FlowFrame,
  moveV2FrameToContainer,
  updateV2FrameLayer,
  updateV2PageLayout,
  createV2Frame,
  createV2PageLayout,
  normalizeV2ImageTransform,
  V2_IMAGE_ZOOM_MAX,
  V2_IMAGE_ZOOM_MIN,
  reorderV2Page,
  setV2PageVisualMode,
  updateV2Frame,
  getV2VideoDisplayMode,
  withV2VideoDisplayMode,
  type LayoutV2Frame,
  type LayoutV2FrameGeometry,
  type LayoutV2FrameType,
  type LayoutV2NarrationSegment,
  type LayoutV2Page,
} from "@/lib/content-layout-v2";

export type ResourceOption = {
  id: string;
  title: string;
  type?: string | null;
  mimeType?: string | null;
  originalFileName?: string | null;
  fileSizeBytes?: string | null;
  thumbnail?: string | null;
};

type ResourceDuplicateMatch = Pick<ResourceOption, "id" | "title" | "type" | "mimeType" | "originalFileName" | "fileSizeBytes">;
type VideoDuplicateMatch = ResourceDuplicateMatch;
type ImageDuplicateMatch = ResourceDuplicateMatch;

export function isV2ImageResource(resource: ResourceOption) {
  const type = resource.type?.trim().toUpperCase();
  return type === "IMAGE" || (!type && resource.mimeType?.trim().toLowerCase().startsWith("image/") === true);
}

export function isV2VideoResource(resource: ResourceOption) {
  const type = resource.type?.trim().toUpperCase();
  return type === "VIDEO" || (!type && resource.mimeType?.trim().toLowerCase().startsWith("video/") === true);
}

const V2_PRIMARY_INSERT_TYPES = ["TEXT", "IMAGE", "VIDEO", "TABLE", "EDUCATIONAL"] as const;
const V2_SHAPE_PRESETS = [
  ["RECTANGLE", "Rectangle"],
  ["ROUNDED_RECTANGLE", "Rounded Rectangle"],
  ["ELLIPSE", "Circle / Ellipse"],
  ["LINE", "Line"],
] as const;

type Props = {
  bookId?: string;
  chapterId?: string | null;
  moduleId?: string | null;
  exerciseId?: string | null;
  hasFullBookPdf?: boolean;
  onImportPdf?: () => Promise<{ pageCount: number; pages: LayoutV2Page[] }>;
  onAttachPdf?: (
  uploadedPdfKey: string,
  options?: {
    clearMappings?: boolean;
  },
) => Promise<{
  pageCount: number;
  mappingResetRequired?: boolean;
  mappingConflictMessage?: string;
}>;
  onListPdfVersions?: () => Promise<Array<{ id: string; objectKey: string; originalFileName: string | null; pageCount: number; fileSizeBytes: string | null; active: boolean; activatedAt: string | null; createdAt: string }>>;
  onRestorePdfVersion?: (versionId: string, options?: { clearMappings?: boolean }) => Promise<{ pageCount: number; mappingResetRequired?: boolean; mappingConflictMessage?: string }>;
  onPrepareReadAloud?: () => Promise<{ updatedPageCount: number; matchedPageCount: number }>;
  title: string;
  document: ContentDocument;
  resources: ResourceOption[];
  saveState: "saved" | "dirty" | "saving" | "error";
  dirty: boolean;
  error?: string;
  wordCount: number;
  zoom: number;
  blocks: ContentBlock[];
  renderBlock: (block: ContentBlock) => ReactNode;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenImport: () => void;
  assignmentsHref?: string;
  onPreview: (mode: "STUDENT" | "TEACHER" | "WHITEBOARD") => void;
  onPublish: () => void;
  publishing?: boolean;
  publishMessage?: string;
  onZoomChange: (value: number) => void;
  onDocumentChange: (document: ContentDocument, message: string) => void;
  onFrameTextChange: (frame: LayoutV2Frame, value: string, spans?: V2TextLayoutSpan[], patch?: V2TextFramePatch) => void;
  onAddFrame: (type: LayoutV2FrameType, pageId: string, frame: LayoutV2Frame) => void;
  onUploadResource?: (file: File, title: string, type: "IMAGE" | "VIDEO") => Promise<ResourceOption>;
  pageScope?: BookPageScope | null;
  initialPageNumber?: number | null;
  isBookRootContext?: boolean;
};

export function hasMeaningfulV2Content(document: ContentDocument) {
  return document.blocks.length > 0 || Boolean(document.pageLayout?.pages.some((page) => page.frames.length > 0 || page.background?.resourceId || page.replica));
}

export default function V2DocumentWorkspace({
  bookId,
  chapterId = null,
  moduleId = null,
  exerciseId = null,
  hasFullBookPdf = false,
  onImportPdf,
  onAttachPdf,
  onListPdfVersions,
  onRestorePdfVersion,
  onPrepareReadAloud,
  title,
  document,
  resources,
  saveState,
  dirty,
  error = "",
  wordCount,
  zoom,
  blocks,
  renderBlock,
  onSave,
  onUndo,
  onRedo,
  onOpenImport,
  assignmentsHref,
  onPreview,
  onPublish,
  publishing = false,
  publishMessage = "",
  onZoomChange,
  onDocumentChange,
  onFrameTextChange,
  onAddFrame,
  onUploadResource,
  pageScope = null,
  initialPageNumber = null,
  isBookRootContext = true,
}: Props) {
  const router = useRouter();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLElement>(null);
  const previewMenuRef = useRef<HTMLDivElement>(null);
  const textSelectionRef = useRef<Range | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [educationalInsertTargetId, setEducationalInsertTargetId] = useState<string | null>(null);
  const [editingLauncherFrameId, setEditingLauncherFrameId] = useState<string | null>(null);
  const [cropFrameId, setCropFrameId] = useState<string | null>(null);
  const [semanticOverlay, setSemanticOverlay] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [grammarMessage, setGrammarMessage] = useState("");
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const [reviewSurface, setReviewSurface] = useState<"GRAMMAR" | "READ_ALOUD" | null>(null);
  const [activeRibbonTab, setActiveRibbonTab] = useState<"HOME" | "INSERT" | "ASSIGNMENTS" | "REVIEW" | "VIEW" | "IMPORT">("HOME");
  const [insertSurface, setInsertSurface] = useState<"IMAGE" | "VIDEO" | "TABLE" | "EDUCATIONAL" | "BOOK_QUESTIONS" | "WORKSHEET" | "ASSESSMENT" | null>(null);
  const [shapePickerOpen, setShapePickerOpen] = useState(false);
  const [insertionMode, setInsertionMode] = useState<"FLOW" | "FLOAT">("FLOAT");
  const [insertionPoint, setInsertionPoint] = useState<{ pageId: string; x: number; y: number } | null>(null);
  const [tableRows, setTableRows] = useState(2);
  const [tableColumns, setTableColumns] = useState(2);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [pendingVideoDuplicate, setPendingVideoDuplicate] = useState<{ file: File; replaceFrameId?: string; matches: VideoDuplicateMatch[] } | null>(null);
  const [pendingImageDuplicate, setPendingImageDuplicate] = useState<{ file: File; replaceFrameId?: string; matches: ImageDuplicateMatch[] } | null>(null);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [deletePageTargetId, setDeletePageTargetId] = useState<string | null>(null);
  const [deletePageConfirming, setDeletePageConfirming] = useState(false);
  const [clipboardMessage, setClipboardMessage] = useState("");
  const [pageViewMode, setPageViewMode] = useState<"WEB" | "A4" | "CUSTOM">("A4");
  const [pdfImportOpen, setPdfImportOpen] = useState(false);
  const [uploadedPdfIsAvailable, setUploadedPdfIsAvailable] = useState(false);
  const [pageInputValue, setPageInputValue] = useState("1");
  const [activePageId, setActivePageId] = useState(document.pageLayout?.pages[0]?.id ?? null);
  const [activeTextFrameId, setActiveTextFrameId] = useState<string | null>(
    document.pageLayout?.pages[0]?.frames.find(isV2MainFlowFrame)?.id ?? null,
  );
  const layout = document.pageLayout;
  const visiblePageViews = useMemo(
    () => pageScope
      ? getBookPageViewsForRange(document, pageScope.startPage, pageScope.endPage)
      : getAllBookPageViews(document),
    [document, pageScope],
  );
  const visiblePages = visiblePageViews.map((view) => view.page);
  const activeVisibleIndex = Math.max(0, visiblePages.findIndex((page) => page.id === activePageId));
  const activePageView = visiblePageViews[activeVisibleIndex] ?? visiblePageViews[0];
  const activePageIndex = layout ? Math.max(0, layout.pages.findIndex((page) => page.id === activePageView?.page.id)) : 0;
  const activeAbsolutePageNumber = activePageView?.absolutePageNumber ?? 0;
  const pageCountLabel = pageScope
    ? `${pageScope.title} page ${activePageView?.rangePageNumber ?? 0} of ${activePageView?.rangePageCount ?? 0} · Book page ${activeAbsolutePageNumber} of ${activePageView?.absolutePageCount ?? 0}`
    : `Book page ${activeAbsolutePageNumber} of ${visiblePageViews.length}`;
  const narrationManifest = useMemo(() => buildV2NarrationManifest(document, "ADMIN_PREVIEW", { scopeId: title || "admin-preview" }), [document, title]);
  useEffect(() => {
    if (!selectedFrameId) return;
    const animationFrame = requestAnimationFrame(() => {
      const frame = Array.from(workspaceRef.current?.querySelectorAll<HTMLElement>("[data-v2-frame-id]") ?? [])
        .find((entry) => entry.dataset.v2FrameId === selectedFrameId);
      frame?.scrollIntoView({ block: "nearest", inline: "nearest" });
      const educationalEditor = frame?.querySelector<HTMLElement>("[data-v2-educational-editor]");
      (educationalEditor ?? frame)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(animationFrame);
  }, [selectedFrameId]);
  useEffect(() => {
    const desiredPage = initialPageNumber ?? pageScope?.startPage ?? 1;
    const nextView = visiblePageViews.find((view) => view.absolutePageNumber === desiredPage) ?? visiblePageViews[0];
    if (!nextView) return;
    const frame = requestAnimationFrame(() => {
      setActivePageId(nextView.page.id);
      setPageInputValue(String(nextView.absolutePageNumber));
      setSelectedFrameId(null);
      setActiveTextFrameId(null);
      setCropFrameId(null);
      setInsertionPoint(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [initialPageNumber, pageScope?.endPage, pageScope?.startPage, visiblePageViews]);
  useEffect(() => {
    if (!previewMenuOpen && !shapePickerOpen && !insertSurface) return;
    const closeWhenOutside = (event: Event) => {
      if (previewMenuOpen && !previewMenuRef.current?.contains(event.target as Node)) setPreviewMenuOpen(false);
      if (toolbarRef.current?.contains(event.target as Node)) return;
      setShapePickerOpen(false);
      setInsertSurface(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPreviewMenuOpen(false);
      setShapePickerOpen(false);
      setInsertSurface(null);
    };
    globalThis.document.addEventListener("pointerdown", closeWhenOutside);
    globalThis.document.addEventListener("keydown", closeOnEscape);
    return () => {
      globalThis.document.removeEventListener("pointerdown", closeWhenOutside);
      globalThis.document.removeEventListener("keydown", closeOnEscape);
    };
  }, [insertSurface, previewMenuOpen, shapePickerOpen]);
  if (!layout) return null;
  if (pageScope && visiblePageViews.length === 0) return <div className="m-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-900">No book pages are mapped to this item yet.</div>;

  const scale = Math.max(0.4, Math.min(2, zoom / 100));
  const activePage = activePageView?.page ?? layout.pages[0];
  const activeOriginalPage = layout.pages.find((page) => page.pdfBackground?.pageNumber === activeAbsolutePageNumber)
    ?? layout.pages.find((page) => page.id === activePage?.id)
    ?? activePage;
  const deletePageTarget = deletePageTargetId ? layout.pages.find((page) => page.id === deletePageTargetId) ?? null : null;
  const deletePageTargetIndex = deletePageTarget ? layout.pages.findIndex((page) => page.id === deletePageTarget.id) : -1;
  const deletePageObjectCount = deletePageTarget ? deletePageTarget.frames.reduce((count, frame) => count + 1 + (frame.children?.length ?? 0), 0) : 0;
  const saveLabel = saveState === "saving" ? "Saving..." : saveState === "error" ? "Save failed" : dirty ? "Unsaved changes" : "Saved";
  const selectedRecord = selectedFrameId ? findV2FrameRecord(layout, selectedFrameId) : undefined;
  const selectedFrame = selectedRecord?.frame;
  const editingLauncherRecord = editingLauncherFrameId
    ? findV2FrameRecord(layout, editingLauncherFrameId)
    : undefined;
  const editingLauncherPayload = editingLauncherRecord?.frame
    ? getV2AssessmentLauncherPayload(editingLauncherRecord.frame)
    : null;
  const selectedParentId = selectedRecord?.parentId;
  const selectedPageId = selectedRecord?.pageId;
  const selectedParentRecord = selectedParentId
    ? findV2FrameRecord(layout, selectedParentId)
    : undefined;
  const stableEducationalRecord = educationalInsertTargetId
    ? findV2FrameRecord(layout, educationalInsertTargetId)
    : undefined;
  const selectedContainerFrame =
    stableEducationalRecord?.frame?.type === "EDUCATIONAL"
      ? stableEducationalRecord.frame
      : selectedFrame &&
          ["EDUCATIONAL", "TEXT"].includes(selectedFrame.type) &&
          !isV2MainFlowFrame(selectedFrame)
        ? selectedFrame
        : selectedParentRecord?.frame &&
            ["EDUCATIONAL", "TEXT"].includes(selectedParentRecord.frame.type) &&
            !isV2MainFlowFrame(selectedParentRecord.frame)
          ? selectedParentRecord.frame
          : null;
  const selectedContainerPageId =
    stableEducationalRecord?.frame?.type === "EDUCATIONAL"
      ? stableEducationalRecord.pageId
      : selectedContainerFrame
        ? selectedPageId
        : undefined;
  const selectedImageFrame = selectedFrame?.type === "IMAGE" ? selectedFrame : null;
  const selectedShapeFrame = selectedFrame?.type === "SHAPE" ? selectedFrame : null;
  const selectedShapePayload = selectedShapeFrame?.payload && typeof selectedShapeFrame.payload === "object" ? selectedShapeFrame.payload as Record<string, unknown> : {};
  const selectedEducationalFrame = selectedFrame?.type === "EDUCATIONAL" ? selectedFrame : null;
  const showPropertiesPanel = propertiesOpen && !selectedEducationalFrame;
  const imageSupportsFlowControls = Boolean(selectedImageFrame && (
    selectedParentId ||
    selectedImageFrame.layoutMode === "INLINE" ||
    selectedImageFrame.layoutMode === "FLOW" ||
    ["INLINE", "WRAP_LEFT", "WRAP_RIGHT"].includes(selectedImageFrame.wrapMode)
  ));
  const selectedVideoFrame = selectedFrame?.type === "VIDEO" ? selectedFrame : null;
  const activeTextRecord = activeTextFrameId ? findV2FrameRecord(layout, activeTextFrameId) : undefined;
  const activeTextFrame = activeTextRecord?.frame.type === "TEXT" ? activeTextRecord.frame : null;
  const selectedTextFrame = selectedFrame?.type === "TEXT" ? selectedFrame : activeTextFrame;
  const selectedFormattingFrame = selectedFrame && ["TEXT", "EDUCATIONAL", "SHAPE"].includes(selectedFrame.type) ? selectedFrame : selectedTextFrame;
  const mainFlowActive = Boolean(activeTextFrame && isV2MainFlowFrame(activeTextFrame));
  const selectedFlowFrame = selectedFrame && selectedFrame.type !== "TEXT" ? selectedFrame : null;
  const imageResources = resources.filter(isV2ImageResource);
  const videoResources = resources.filter(isV2VideoResource);
  const audioResources = resources.filter((resource) => resource.type === "AUDIO" || resource.type === "audio" || resource.mimeType?.toLowerCase().startsWith("audio/"));
  const activeNarrationPage = activePage ? narrationManifest.pages.find((page) => page.pageId === activePage.id) : undefined;
  const narrationStatus = activePage && activeNarrationPage ? getNarrationStatus(activePage, activeNarrationPage) : "UNAVAILABLE";
  const narrationAudioUrls = Object.fromEntries(audioResources.map((resource) => [resource.id, "/api/admin/resources/" + encodeURIComponent(resource.id) + "/preview"]));
  const canPrepareReadAloud = Boolean(hasFullBookPdf && onPrepareReadAloud);
  const canEditReadAloud = Boolean(onPrepareReadAloud);

  const patchFrame = (frameId: string, patch: Partial<LayoutV2Frame>, message: string) => {
    const record = findV2FrameRecord(layout, frameId);
    if (!record) return;
    onDocumentChange({ ...document, pageLayout: updateV2Frame(layout, record.pageId, frameId, patch) }, message);
  };

  const applyArrange = (action: "FRONT" | "FORWARD" | "BACKWARD" | "BACK") => {
    if (!selectedFrameId || !selectedPageId) return;
    onDocumentChange({ ...document, pageLayout: arrangeV2Frame(layout, selectedPageId, selectedFrameId, action) }, "Visual order updated");
  };

  const applyLayer = (layer: LayoutV2Frame["layer"]) => {
    if (!selectedFrameId || !selectedPageId) return;
    onDocumentChange({ ...document, pageLayout: updateV2FrameLayer(layout, selectedPageId, selectedFrameId, layer) }, "Layer updated");
  };

  const moveFlow = (direction: -1 | 1) => {
    if (!selectedFrameId || !selectedPageId || selectedParentId) return;
    onDocumentChange({ ...document, pageLayout: moveV2FlowFrame(layout, selectedPageId, selectedFrameId, direction) }, direction < 0 ? "Flow item moved earlier" : "Flow item moved later");
  };

  const handleDropFrame = (frameId: string, containerId: string) => {
    if (!activePage) return;
    const nextLayout = moveV2FrameToContainer(layout, activePage.id, frameId, containerId);
    if (nextLayout !== layout) {
      setSelectedFrameId(frameId);
      onDocumentChange({ ...document, pageLayout: nextLayout }, "Frame moved into container");
    }
  };

  const addChildFrame = (
    type: "TEXT" | "IMAGE" | "VIDEO" | "TABLE",
    resourceId?: string,
    payload?: Record<string, unknown>,
  ) => {
    const targetFrame = selectedContainerFrame;
    const targetPageId = selectedContainerPageId;
    if (!targetFrame || !targetPageId) return;

    const existingChildren = targetFrame.children ?? [];
    const availableWidth = Math.max(120, targetFrame.width - 36);
    const availableHeight = Math.max(90, targetFrame.height - 150);

    const childGeometry = clampV2FrameGeometry(
      {
        x: 18 + (existingChildren.length % 2) * 24,
        y: 18 + (existingChildren.length % 3) * 18,
        width: Math.min(
          type === "TEXT" ? 260 : type === "TABLE" ? 280 : 180,
          availableWidth,
        ),
        height: Math.min(
          type === "TEXT" ? 72 : type === "TABLE" ? 120 : 110,
          availableHeight,
        ),
      },
      targetFrame.width,
      targetFrame.height,
    );

    const child = createV2Frame(type, targetPageId, {
      ...childGeometry,
      zIndex: existingChildren.length,
      layer: "CONTENT",
      layoutMode: "ABSOLUTE",
      wrapMode: "NONE",
      ...(type === "IMAGE" || type === "VIDEO"
        ? {
            resourceId:
              resourceId ??
              (type === "VIDEO"
                ? videoResources[0]?.id
                : imageResources[0]?.id),
          }
        : {}),
      ...(type === "IMAGE" ? { aspectLocked: true, fitMode: "FIT" as const } : {}),
      ...(type === "TEXT" ? { payload: "New container text" } : {}),
      ...(type === "TABLE"
        ? {
            payload:
              payload ?? {
                rows: tableRows,
                columns: tableColumns,
                cells: Array.from(
                  { length: tableRows * tableColumns },
                  () => "",
                ),
              },
          }
        : {}),
    });

    const nextLayout = updateV2PageLayout(layout, (pages) =>
      pages.map((page) =>
        page.id !== targetPageId
          ? page
          : {
              ...page,
              frames: page.frames.map((pageFrame) =>
                pageFrame.id === targetFrame.id
                  ? {
                      ...pageFrame,
                      children: [
                        ...(pageFrame.children ?? []),
                        { ...child, parentId: pageFrame.id },
                      ],
                    }
                  : pageFrame,
              ),
            },
      ),
    );

    /*
     * Keep the container selected after Insert-ribbon actions.
     * If the user had selected an Image/Video/Table child, its parent
     * educational frame remains the insertion target instead of creating
     * a new top-level page object.
     */
    setSelectedFrameId(
      targetFrame.type === "EDUCATIONAL" ? targetFrame.id : child.id,
    );
    onDocumentChange(
      { ...document, pageLayout: nextLayout },
      `${type[0]}${type.slice(1).toLowerCase()} child added`,
    );
  };
  const patchImage = (frameId: string, patch: Partial<LayoutV2Frame>, message: string) => {
    patchFrame(frameId, patch, message);
  };

  const resizeImage = (frame: LayoutV2Frame, dimension: "width" | "height", nextValue: number) => {
    const value = Math.max(24, Math.round(nextValue || 24));
    const ratio = frame.width / Math.max(1, frame.height);
    const patch = dimension === "width"
      ? { width: value, ...(frame.aspectLocked !== false ? { height: Math.max(24, Math.round(value / ratio)) } : {}) }
      : { height: value, ...(frame.aspectLocked !== false ? { width: Math.max(24, Math.round(value * ratio)) } : {}) };
    patchImage(frame.id, patch, "Image size updated");
  };

  const alignImage = (frame: LayoutV2Frame, alignment: "left" | "center" | "right") => {
    const record = findV2FrameRecord(layout, frame.id);
    if (!record) return;
    const page = layout.pages.find((entry) => entry.id === record.pageId);
    const parent = record.parentId ? page?.frames.find((entry) => entry.id === record.parentId) : undefined;
    const availableWidth = parent?.width ?? page?.width ?? frame.width;
    const x = alignment === "left" ? 0 : alignment === "center" ? (availableWidth - frame.width) / 2 : availableWidth - frame.width;
    patchImage(frame.id, { alignment, x: Math.max(0, x) }, "Image alignment updated");
  };

  const handleResourceUpload = async (event: ChangeEvent<HTMLInputElement>, type: "IMAGE" | "VIDEO", replaceFrameId?: string, skipDuplicateCheck = false) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onUploadResource) return;
    if (!skipDuplicateCheck) {
      try {
        const response = await fetch("/api/admin/resources/duplicates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ originalFileName: file.name, fileSizeBytes: file.size }),
        });
        const payload = await response.json().catch(() => ({ matches: [] })) as { matches?: ResourceDuplicateMatch[] };
        const matches = response.ok ? (payload.matches ?? []).filter(type === "IMAGE" ? isV2ImageResource : isV2VideoResource) : [];
        if (matches.length) {
          if (type === "IMAGE") setPendingImageDuplicate({ file, replaceFrameId, matches });
          else setPendingVideoDuplicate({ file, replaceFrameId, matches });
          return;
        }
      } catch {
        // Duplicate detection is advisory. A temporary check failure must not
        // prevent a publisher from using the already working upload transport.
      }
    }
    setUploadingResource(true);
    setUploadError("");
    try {
      const resource = await onUploadResource(file, file.name.replace(/\.[^.]+$/, "") || (type === "IMAGE" ? "Image" : "Video"), type);
      if (replaceFrameId) {
        patchFrame(replaceFrameId, { resourceId: resource.id, ...(type === "IMAGE" ? { fitMode: "FIT" as const, crop: { x: 0, y: 0, width: 1, height: 1 }, zoom: 1, offsetX: 0, offsetY: 0 } : {}) }, `${type === "IMAGE" ? "Image" : "Video"} replaced`);
      } else {
        if (selectedFrame && ["TEXT", "EDUCATIONAL"].includes(selectedFrame.type) && !isV2MainFlowFrame(selectedFrame)) addChildFrame(type, resource.id);
        else addFrame(type, { resourceId: resource.id, ...(type === "IMAGE" ? { aspectLocked: true } : {}) }, type === "IMAGE" ? insertionMode : "FLOAT");
        setInsertSurface(null);
      }
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : `Unable to upload ${type.toLowerCase()}.`);
    } finally {
      setUploadingResource(false);
    }
  };

  const commitFrameGeometry = (pageId: string, frameId: string, geometry: LayoutV2FrameGeometry) => {
    onDocumentChange({ ...document, pageLayout: updateV2Frame(layout, pageId, frameId, geometry) }, "Frame position saved");
  };

  const detachSelectedChild = () => {
    if (!selectedParentId || !selectedFrameId || !selectedPageId) return;
    onDocumentChange({ ...document, pageLayout: moveV2ChildToPage(layout, selectedPageId, selectedParentId, selectedFrameId) }, "Child moved to page");
  };

  const duplicateSelected = () => {
    if (!selectedFrameId || !selectedPageId || selectedParentId) return;
    onDocumentChange({ ...document, pageLayout: duplicateV2Frame(layout, selectedPageId, selectedFrameId) }, "Frame duplicated");
  };

  const deleteFrame = (frameId: string) => {
    const record = findV2FrameRecord(layout, frameId);
    if (!record) return;
    onDocumentChange({ ...document, pageLayout: deleteV2Frame(layout, record.pageId, frameId) }, "Frame deleted");
    setSelectedFrameId(null);
    if (frameId === educationalInsertTargetId || record.parentId === educationalInsertTargetId) {
      setEducationalInsertTargetId(null);
    }
  };

  const deleteSelected = () => {
    if (selectedFrameId) deleteFrame(selectedFrameId);
  };

  const attachNarration = (resourceId: string) => {
    if (!activePage || !activeNarrationPage) return;
    const narration = {
      ...(activePage.narration ?? {}),
      sourceHash: activeNarrationPage.sourceHash,
      ...(resourceId ? { resourceId, provider: "HUMAN", status: "READY" as const } : { resourceId: undefined, provider: undefined, status: "BROWSER_TTS_FALLBACK" as const }),
    };
    onDocumentChange({
      ...document,
      pageLayout: updateV2PageLayout(layout, (pages) => pages.map((page) => page.id === activePage.id ? { ...page, narration } : page)),
    }, resourceId ? "Human narration attached" : "Human narration removed; browser TTS remains available");
  };
  const patchNarrationSegment = (segmentId: string, sourceHash: string, patch: Partial<LayoutV2NarrationSegment>) => {
    if (!activePage || !activeNarrationPage) return;
    const existing = activePage.narration?.segments?.find((segment) => segment.id === segmentId);
    const segment = { id: segmentId, sourceHash, ...(existing ?? {}), ...patch };
    const segments = [
      ...(activePage.narration?.segments ?? []).filter((entry) => entry.id !== segmentId),
      segment,
    ];
    const narration = { ...(activePage.narration ?? {}), sourceHash: activeNarrationPage.sourceHash, segments };
    onDocumentChange({
      ...document,
      pageLayout: updateV2PageLayout(layout, (pages) => pages.map((page) => page.id === activePage.id ? { ...page, narration } : page)),
    }, "Narration segment mapping updated");
  };
  const addPage = () => {
    if (pageScope) return;
    const nextLayout = ensureV2MainFlowFrames(addV2Page(layout));
    const nextPage = nextLayout.pages[nextLayout.pages.length - 1];
    setActivePageId(nextPage?.id ?? activePageId);
    setActiveTextFrameId(nextPage?.frames.find(isV2MainFlowFrame)?.id ?? null);
    onDocumentChange({ ...document, pageLayout: nextLayout }, "Page added");
  };

  const deletePage = (pageId: string) => {
    if (pageScope) return;
    const pageIndex = layout.pages.findIndex((page) => page.id === pageId);
    if (pageIndex < 0 || layout.pages.length <= 1) return;
    const nextLayout = deleteV2Page(layout, pageId);
    const nextPage = nextLayout.pages[Math.min(pageIndex, nextLayout.pages.length - 1)] ?? nextLayout.pages[0];
    setActivePageId(nextPage?.id ?? null);
    setActiveTextFrameId(nextPage?.frames.find(isV2MainFlowFrame)?.id ?? null);
    setSelectedFrameId(null);
    setDeletePageTargetId(null);
    setDeletePageConfirming(false);
    onDocumentChange({ ...document, pageLayout: nextLayout }, "Page deleted; remaining page IDs preserved");
  };

  const moveActivePage = (direction: -1 | 1) => {
    if (pageScope || !activePage) return;
    const nextLayout = reorderV2Page(layout, activePage.id, direction);
    onDocumentChange({ ...document, pageLayout: nextLayout }, direction < 0 ? "Page moved up" : "Page moved down");
  };

  function addFrame(type: LayoutV2FrameType, patch: Partial<LayoutV2Frame> = {}, requestedMode?: "FLOW" | "FLOAT") {
    if (!activePage) return;
    const flowInsertion = requestedMode === "FLOW" && (type === "IMAGE" || type === "TABLE");
    const flowRoot = activeTextFrame && isV2MainFlowFrame(activeTextFrame)
      ? Array.from(workspaceRef.current?.querySelectorAll<HTMLElement>("[data-v2-main-flow-id]") ?? []).find((entry) => entry.dataset.v2MainFlowId === activeTextFrame.id)
      : undefined;
    const caretRect = textSelectionRef.current?.getBoundingClientRect();
    const flowBounds = flowRoot?.getBoundingClientRect();
    const flowPoint = flowInsertion && activeTextFrame && flowBounds
      ? {
          x: activeTextFrame.x,
          y: Math.max(activeTextFrame.y, Math.min(activeTextFrame.y + activeTextFrame.height - 24, activeTextFrame.y + Math.max(0, ((caretRect?.bottom ?? flowBounds.top) - flowBounds.top) / Math.max(0.01, scale)) + 8)),
        }
      : undefined;
    const preferredPoint = flowPoint ?? (!flowInsertion && insertionPoint?.pageId === activePage.id
      ? { x: insertionPoint.x, y: insertionPoint.y }
      : undefined);
    const geometry = getV2InsertionGeometry(activePage, type, preferredPoint);
    const frame = createV2Frame(type, activePage.id, {
      ...geometry,
      zIndex: activePage.frames.reduce((maximum, entry) => Math.max(maximum, entry.zIndex), 0) + 1,
      layer: type === "SHAPE" ? "DESIGN" : "CONTENT",
      layoutMode: flowInsertion ? "INLINE" : "ABSOLUTE",
      wrapMode: flowInsertion ? "INLINE" : "NONE",
      readingOrder: flowInsertion ? activePage.frames.reduce((maximum, entry) => Math.max(maximum, entry.readingOrder), 0) + 1 : activePage.frames.length,
      ...(type === "TEXT" ? { payload: "New text frame" } : {}),
      ...patch,
    });
    setActivePageId(activePage.id);
    setSelectedFrameId(frame.id);
    setInsertionPoint(null);
    setPropertiesOpen(true);
    onAddFrame(type, activePage.id, frame);
  }

  const addEducationalFrame = (objectType: (typeof EDUCATIONAL_OBJECT_REGISTRY)[number][0]) => {
    if (!activePage) return;
    const definition = getEducationalObjectDefinition(objectType);
    const blockId = `educational-${globalThis.crypto.randomUUID()}`;
    const block: ContentBlock = {
      id: blockId,
      type: "educationalObject",
      objectType,
      title: definition.label,
      text: "",
    };
    const insertion = getV2InsertionGeometry(
      activePage,
      "EDUCATIONAL",
      insertionPoint?.pageId === activePage.id
        ? { x: insertionPoint.x, y: insertionPoint.y }
        : undefined,
    );
    const geometry = clampV2FrameGeometry(
      {
        ...insertion,
        width: Math.min(440, Math.max(240, activePage.width - 24)),
        height: Math.min(280, Math.max(180, activePage.height - 24)),
      },
      activePage.width,
      activePage.height,
    );
    const frame = createV2Frame("EDUCATIONAL", activePage.id, {
      ...geometry,
      zIndex: activePage.frames.reduce((maximum, entry) => Math.max(maximum, entry.zIndex), 0) + 1,
      layer: "INTERACTIVE",
      layoutMode: "ABSOLUTE",
      wrapMode: "NONE",
      readingOrder: activePage.frames.length,
      contentRef: { blockId },
      payload: { educationalObjectType: objectType },
      narrationLabel: definition.label,
    });
    const nextLayout = updateV2PageLayout(layout, (pages) => pages.map((page) =>
      page.id === activePage.id ? { ...page, frames: [...page.frames, frame] } : page,
    ));
    setActivePageId(activePage.id);
    setSelectedFrameId(frame.id);
    setEducationalInsertTargetId(frame.id);
    setActiveTextFrameId(null);
    setInsertionPoint(null);
    setInsertSurface(null);
    onDocumentChange(
      { ...document, blocks: [...blocks, block], pageLayout: nextLayout },
      `${definition.label} block added`,
    );
  };

  const insertAssessmentLauncher = (target: {
    exerciseId: string;
    groupId: string;
    questionType?: "MCQ" | "TRUE_FALSE" | "FILL_BLANK" | "MULTIPLE_SELECT" | "SHORT_ANSWER";
    questionIds?: string[];
  }) => {
    if (editingLauncherFrameId) {
      patchFrame(
        editingLauncherFrameId,
        {
          payload: createV2AssessmentLauncherPayload(target),
        },
        "Book Questions launcher updated",
      );
      setSelectedFrameId(editingLauncherFrameId);
      setEditingLauncherFrameId(null);
      setInsertSurface(null);
      return;
    }

    addFrame(
      "ASSESSMENT_LAUNCHER",
      {
        payload: createV2AssessmentLauncherPayload(target),
      },
      "FLOAT",
    );
    setInsertSurface(null);
  };

  const insertPublisherAssessmentLauncher = (assessment: { id: string; kind: string }) => {
    addFrame(
      "ASSESSMENT_LAUNCHER",
      { payload: createV2PublisherAssessmentLauncherPayload({ assessmentId: assessment.id, kind: assessment.kind }) },
      "FLOAT",
    );
    setInsertSurface(null);
  };

  const insertWorksheetLauncher = (worksheetId: string) => {
    addFrame(
      "WORKSHEET",
      { payload: createV2WorksheetLauncherPayload(worksheetId) },
      "FLOAT",
    );
    setInsertSurface(null);
  };

  const chooseResource = (type: "IMAGE" | "VIDEO", resourceId: string) => {
    if (selectedContainerFrame) {
      addChildFrame(type, resourceId);
    } else {
      addFrame(type, { resourceId, ...(type === "IMAGE" ? { aspectLocked: true } : {}) }, type === "IMAGE" ? insertionMode : "FLOAT");
    }
    setInsertSurface(null);
    setUploadError("");
  };

  const selectExistingVideo = (resourceId: string, replaceFrameId?: string) => {
    if (replaceFrameId) {
      patchFrame(replaceFrameId, { resourceId }, "Video replaced with existing resource");
    } else {
      chooseResource("VIDEO", resourceId);
    }
    setPendingVideoDuplicate(null);
  };

  const uploadVideoAnyway = async () => {
    const pending = pendingVideoDuplicate;
    if (!pending || !onUploadResource) return;
    setPendingVideoDuplicate(null);
    setUploadingResource(true);
    setUploadError("");
    try {
      const resource = await onUploadResource(pending.file, pending.file.name.replace(/\.[^.]+$/, "") || "Video", "VIDEO");
      if (pending.replaceFrameId) {
        patchFrame(pending.replaceFrameId, { resourceId: resource.id }, "Video replaced");
      } else if (selectedContainerFrame) {
        addChildFrame("VIDEO", resource.id);
      } else {
        addFrame("VIDEO", { resourceId: resource.id }, "FLOAT");
      }
      setInsertSurface(null);
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "Unable to upload video.");
    } finally {
      setUploadingResource(false);
    }
  };

  const selectExistingImage = (resourceId: string, replaceFrameId?: string) => {
    if (replaceFrameId) {
      patchImage(replaceFrameId, { resourceId, fitMode: "FIT", crop: { x: 0, y: 0, width: 1, height: 1 }, zoom: 1, offsetX: 0, offsetY: 0 }, "Image replaced with existing resource");
    } else {
      chooseResource("IMAGE", resourceId);
    }
    setPendingImageDuplicate(null);
  };

  const uploadImageAnyway = async () => {
    const pending = pendingImageDuplicate;
    if (!pending || !onUploadResource) return;
    setPendingImageDuplicate(null);
    setUploadingResource(true);
    setUploadError("");
    try {
      const resource = await onUploadResource(pending.file, pending.file.name.replace(/\.[^.]+$/, "") || "Image", "IMAGE");
      if (pending.replaceFrameId) {
        patchImage(pending.replaceFrameId, { resourceId: resource.id, fitMode: "FIT", crop: { x: 0, y: 0, width: 1, height: 1 }, zoom: 1, offsetX: 0, offsetY: 0 }, "Image replaced");
      } else if (selectedContainerFrame) {
        addChildFrame("IMAGE", resource.id);
      } else {
        addFrame("IMAGE", { resourceId: resource.id, aspectLocked: true }, insertionMode);
      }
      setInsertSurface(null);
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "Unable to upload image.");
    } finally {
      setUploadingResource(false);
    }
  };

  const fitCanvas = (mode: "PAGE" | "WIDTH") => {
    if (!activePage) return;
    const viewport = workspaceRef.current?.querySelector<HTMLElement>("[data-v2-canvas-scroll]");
    if (!viewport) return;
    const widthScale = Math.max(0.4, (viewport.clientWidth - 56) / activePage.width);
    const heightScale = Math.max(0.4, (viewport.clientHeight - 64) / activePage.height);
    onZoomChange(Math.max(40, Math.min(200, Math.round((mode === "WIDTH" ? widthScale : Math.min(widthScale, heightScale)) * 100))));
  };

  const changePageView = (mode: "WEB" | "A4" | "CUSTOM") => {
    setPageViewMode(mode);
    fitCanvas(mode === "WEB" ? "WIDTH" : "PAGE");
  };


  const navigateToPage = (page: LayoutV2Page | undefined) => {
    if (!page) return;
    const view = visiblePageViews.find((entry) => entry.page.id === page.id);
    if (!view) return;
    setActivePageId(page.id);
    setPageInputValue(String(view.absolutePageNumber));
    setSelectedFrameId(null);
    setEducationalInsertTargetId(null);
    setActiveTextFrameId(null);
    setCropFrameId(null);
    setInsertionPoint(null);
    if (typeof globalThis.location !== "undefined") {
      const params = new URLSearchParams(globalThis.location.search);
      params.set("page", String(view.absolutePageNumber));
      router.replace(`${globalThis.location.pathname}?${params.toString()}`, { scroll: false });
    }
  };

  const goToPage = (offset: number) => {
    navigateToPage(visiblePages[activeVisibleIndex + offset]);
  };

  const commitPageInput = () => {
    const parsed = Number.parseInt(pageInputValue, 10);
    const firstPage = visiblePageViews[0]?.absolutePageNumber ?? 1;
    const lastPage = visiblePageViews.at(-1)?.absolutePageNumber ?? firstPage;
    const absolutePageNumber = Math.min(lastPage, Math.max(firstPage, Number.isFinite(parsed) ? Math.trunc(parsed) : firstPage));
    const view = visiblePageViews.find((entry) => entry.absolutePageNumber === absolutePageNumber);
    if (view) navigateToPage(view.page);
  };


  const renderPageCanvas = (page: LayoutV2Page, pageNumber: number, pdfBackgroundActive: boolean) => (
    <div key={page.id} onClick={() => { if (activePage?.id !== page.id) navigateToPage(page); }} className={activePage?.id === page.id ? "rounded-xl ring-2 ring-indigo-300 ring-offset-2 ring-offset-[#e7ebf0]" : "rounded-xl"}>
            <V2PageCanvas
              page={page}
              pdfUrl={bookId ? "/api/books/" + bookId + "/full-pdf" : undefined}
              pdfBackgroundActive={pdfBackgroundActive}
              scale={scale}
              pageNumber={pageNumber}
              blocks={blocks}
              onBlockChange={(block) => onDocumentChange({ ...document, blocks: blocks.map((entry) => entry.id === block.id ? block : entry) }, "Educational content updated")}
              selectedFrameId={selectedFrameId}
              renderFrame={(frame, frames) => renderV2Frame(
                frame,
                frames,
                page.width,
                page.height,
                blocks,
                renderBlock,
                onFrameTextChange,
                frame.id === cropFrameId,
                scale,
                semanticOverlay,
                (patch: Partial<LayoutV2Frame>, message: string) => patchImage(frame.id, patch, message),
                () => setCropFrameId(frame.id),
                (launcherFrame) => {
                  const payload = getV2AssessmentLauncherPayload(launcherFrame);
                  if (payload?.launcherType === "publisher-assessment" && bookId) {
                    router.push(`/admin/books/${encodeURIComponent(bookId)}/content/assignments/assessments/${encodeURIComponent(payload.assessmentId)}`);
                    return;
                  }
                  setSelectedFrameId(launcherFrame.id);
                  setEditingLauncherFrameId(launcherFrame.id);
                  setActiveRibbonTab("INSERT");
                  setInsertSurface("BOOK_QUESTIONS");
                },
                (worksheetFrame) => {
                  const payload = getV2WorksheetLauncherPayload(worksheetFrame);
                  if (!payload || !bookId) return;
                  router.push(`/admin/books/${encodeURIComponent(bookId)}/content/assignments/worksheets/${encodeURIComponent(payload.worksheetId)}`);
                },
              )}
              renderEducationalPreview={(frame) => { const block = frame.contentRef?.blockId ? blocks.find((entry) => entry.id === frame.contentRef?.blockId) : undefined; return block ? renderBlock(block) : undefined; }}
              onSelectFrame={(frameId) => {
                setSelectedFrameId(frameId);
                const record = findV2FrameRecord(layout, frameId);
                const frame = record?.frame;
                const parent = record?.parentId
                  ? findV2FrameRecord(layout, record.parentId)?.frame
                  : undefined;

                if (frame?.type === "EDUCATIONAL") {
                  setEducationalInsertTargetId(frame.id);
                } else if (parent?.type === "EDUCATIONAL") {
                  setEducationalInsertTargetId(parent.id);
                } else {
                  setEducationalInsertTargetId(null);
                }

                setActiveTextFrameId(frame?.type === "TEXT" ? frame.id : null);
                setInsertionPoint(null);
              }}
              onActivateMainFlow={(frameId) => {
                setSelectedFrameId(null);
                setEducationalInsertTargetId(null);
                setActiveTextFrameId(frameId);
                setInsertionPoint(null);
              }}
              onClearSelection={() => { setSelectedFrameId(null); setEducationalInsertTargetId(null); setActiveTextFrameId(null); }}
              onSetInsertionPoint={(point) => { setActiveTextFrameId(null); setInsertionPoint({ pageId: page.id, ...point }); }}
              insertionPoint={insertionPoint?.pageId === page.id ? insertionPoint : undefined}
              onCommitGeometry={(frameId, geometry) => commitFrameGeometry(page.id, frameId, geometry)}
              onDeleteFrame={(frameId) => deleteFrame(frameId)}
              onDropFrame={handleDropFrame}
              onPatchFrame={(frameId, patch, message) => patchFrame(frameId, patch, message)}
              semanticOverlay={semanticOverlay}
              showGuides={showGuides}
            />
    </div>
  );

  const applyPdfImportPages = (pages: LayoutV2Page[]) => {
    const firstPage = pages[0];
    if (!firstPage) return;
    const pageLayout = createV2PageLayout({ pageSize: { preset: "CUSTOM", width: firstPage.width, height: firstPage.height, unit: firstPage.unit }, pages });
    setActivePageId(pageLayout.pages[0]?.id ?? null);
    setPageInputValue("1");
    setActiveTextFrameId(null);
    setSelectedFrameId(null);
    onDocumentChange({ ...document, layoutVersion: 2, pageLayout }, `Import complete: ${pageLayout.pages.length} PDF page${pageLayout.pages.length === 1 ? "" : "s"} added to the V2 layout.`);
  };

  const rememberTextSelection = () => {
    const selection = globalThis.getSelection?.();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const node = range?.commonAncestorContainer;
    const element = node instanceof HTMLElement ? node : node?.parentElement;
    if (range && element?.closest('[contenteditable="true"]') && workspaceRef.current?.contains(element)) {
      textSelectionRef.current = range.cloneRange();
    }
  };

  const restoreTextSelection = () => {
    const range = textSelectionRef.current;
    const selection = globalThis.getSelection?.();
    if (!range || !selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const runTextCommand = (command: string, value?: string) => {
    restoreTextSelection();
    const applied = globalThis.document.execCommand(command, false, value);
    rememberTextSelection();
    return applied;
  };

  const copyOrCutText = async (command: "copy" | "cut") => {
    if (runTextCommand(command)) {
      setClipboardMessage("");
      return;
    }
    const selectedText = globalThis.getSelection?.()?.toString() ?? "";
    try {
      if (!selectedText) throw new Error("No selected text");
      await globalThis.navigator.clipboard.writeText(selectedText);
      if (command === "cut" && !runTextCommand("delete")) throw new Error("Unable to remove selected text");
      setClipboardMessage("");
    } catch {
      setClipboardMessage(`Browser blocked ${command}. Use Ctrl+${command === "copy" ? "C" : "X"} instead.`);
    }
  };

  const pasteText = async () => {
    try {
      const text = await globalThis.navigator.clipboard.readText();
      if (!runTextCommand("insertText", text)) throw new Error("Insert failed");
      setClipboardMessage("");
    } catch {
      if (!runTextCommand("paste")) setClipboardMessage("Browser blocked paste. Use Ctrl+V instead.");
      else setClipboardMessage("");
    }
  };

  const openInsertSurface = (surface: "IMAGE" | "VIDEO" | "TABLE" | "EDUCATIONAL" | "BOOK_QUESTIONS" | "WORKSHEET" | "ASSESSMENT") => {
    setPreviewMenuOpen(false);
    setShapePickerOpen(false);
    if (surface === "BOOK_QUESTIONS") setEditingLauncherFrameId(null);
    setInsertionMode(surface === "IMAGE" || surface === "TABLE" ? (mainFlowActive || selectedFrame?.type === "TEXT" ? "FLOW" : "FLOAT") : "FLOAT");
    setInsertSurface(surface);
    setUploadError("");
  };

  const reviewGrammar = () => {
    const editor = workspaceRef.current?.querySelector<HTMLElement>('[contenteditable="true"]');
    editor?.focus();
    setGrammarMessage("Browser spelling and grammar checking is active in editable text.");
  };
  const selectRibbonTab = (tab: "HOME" | "INSERT" | "ASSIGNMENTS" | "REVIEW" | "VIEW" | "IMPORT") => {
    if (tab === "ASSIGNMENTS" && assignmentsHref) {
      setReviewSurface(null);
      globalThis.location.assign(assignmentsHref);
      return;
    }
    setActiveRibbonTab(tab);
    setPreviewMenuOpen(false);
    setInsertSurface(null);
    if (tab !== "REVIEW") setReviewSurface(null);
  };

  return (
    <div ref={workspaceRef} data-v2-unified-workspace className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#e7ebf0]" onSelectCapture={rememberTextSelection} onKeyUpCapture={rememberTextSelection} onMouseUpCapture={rememberTextSelection} onKeyDown={(event) => { if (event.key === "Escape") { setCropFrameId(null); setPreviewMenuOpen(false); setInsertSurface(null); setShapePickerOpen(false); } }}>
      <header ref={toolbarRef} data-v2-sticky-header data-primary-insert-types={V2_PRIMARY_INSERT_TYPES.join(",")} className="sticky top-0 z-40 shrink-0 border-b border-slate-300 bg-white shadow-sm">
        <div className="flex min-h-11 min-w-0 items-center gap-2 px-3 py-1.5">
        <nav aria-label="Content Studio ribbon" className="flex min-w-0 items-stretch gap-1">
          {(["HOME", "INSERT", "ASSIGNMENTS", "REVIEW", "VIEW", "IMPORT"] as const).map((tab) => <button key={tab} type="button" onClick={() => selectRibbonTab(tab)} className={`border-b-2 px-2 py-1 text-xs font-bold ${activeRibbonTab === tab ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-600 hover:bg-slate-50"}`}>{tab === "IMPORT" ? "Import InDesign" : tab[0] + tab.slice(1).toLowerCase()}</button>)}
        </nav>
        <div data-v2-top-actions className="ml-auto flex shrink-0 items-center gap-1">
          <span data-testid="v2-save-state" className="hidden text-[11px] text-slate-500 md:inline">{saveLabel} · {wordCount.toLocaleString("en-IN")} words</span>
          <button type="button" onClick={onUndo} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">Undo</button>
          <button type="button" onClick={onRedo} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">Redo</button>
          <button type="button" onClick={onSave} className="rounded-md bg-slate-950 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800">Save</button>
          <div ref={previewMenuRef} data-v2-preview-menu className="relative">
            <button type="button" aria-expanded={previewMenuOpen} aria-haspopup="menu" onClick={() => setPreviewMenuOpen((current) => !current)} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">Preview {"\u25be"}</button>
            {previewMenuOpen ? <div role="menu" className="absolute right-0 top-8 z-[90] grid w-48 gap-1 rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-2xl">
              <button type="button" role="menuitem" onClick={() => { setPreviewMenuOpen(false); onPreview("STUDENT"); }} className="text-left">Preview as Student</button>
              <button type="button" role="menuitem" onClick={() => { setPreviewMenuOpen(false); onPreview("TEACHER"); }} className="text-left">Preview as Teacher</button>
              <button type="button" role="menuitem" onClick={() => { setPreviewMenuOpen(false); onPreview("WHITEBOARD"); }} className="text-left">Preview on Digital Board</button>
            </div> : null}
          </div>
          <button type="button" disabled={publishing} onClick={onPublish} className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{publishing ? "Publishing..." : "Publish"}</button>{publishMessage ? <span role="status" className="text-[11px] font-semibold text-emerald-700">{publishMessage}</span> : null}
          <button type="button" aria-pressed={propertiesOpen} onClick={() => setPropertiesOpen((current) => !current)} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">Properties</button>
        </div>
        </div>
        <div data-v2-ribbon data-active-tab={activeRibbonTab} className="flex min-h-10 min-w-0 items-center gap-2 overflow-visible border-t border-slate-200 bg-white px-3 py-1.5 text-xs">
          {activeRibbonTab === "HOME" ? selectedFormattingFrame ? <div data-v2-home-controls data-v2-command-families className="flex min-w-0 flex-1 items-center gap-2">
            <details className="relative"><summary className="cursor-pointer list-none rounded border border-slate-200 px-2 py-1 font-semibold">Clipboard {"\u25be"}</summary><div role="menu" data-v2-clipboard-menu className="absolute left-0 top-8 z-[80] grid w-32 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-2xl"><button type="button" onClick={() => void copyOrCutText("cut")} className="text-left">Cut</button><button type="button" onClick={() => void copyOrCutText("copy")} className="text-left">Copy</button><button type="button" onClick={() => void pasteText()} className="text-left">Paste</button></div></details>
            <details className="relative"><summary className="cursor-pointer list-none rounded border border-slate-200 px-2 py-1 font-semibold">Font {"\u25be"}</summary><div role="menu" data-v2-font-menu className="absolute left-0 top-8 z-[80] grid w-56 gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-2xl"><label>Font Family<select aria-label="Font" value={selectedFormattingFrame.fontFamily ?? "Arial"} onChange={(event) => patchFrame(selectedFormattingFrame.id, { fontFamily: event.target.value }, "Font updated")} className="mt-1 w-full rounded border px-2 py-1"><option>Arial</option><option>Georgia</option><option>Times New Roman</option><option>Verdana</option></select></label><label>Font Size<input aria-label="Font size" type="number" min="8" max="96" value={selectedFormattingFrame.fontSize ?? 16} onChange={(event) => patchFrame(selectedFormattingFrame.id, { fontSize: Math.max(8, Math.min(96, Number(event.target.value) || 16)) }, "Text size updated")} className="mt-1 w-full rounded border px-2 py-1" /></label><div className="flex gap-1"><button type="button" aria-label="Bold" onClick={() => { runTextCommand("bold"); patchFrame(selectedFormattingFrame.id, { fontWeight: selectedFormattingFrame.fontWeight === 700 ? 400 : 700 }, "Bold updated"); }} className="rounded border px-2 py-1 font-bold">B</button><button type="button" aria-label="Italic" onClick={() => { runTextCommand("italic"); patchFrame(selectedFormattingFrame.id, { fontStyle: selectedFormattingFrame.fontStyle === "italic" ? "normal" : "italic" }, "Italic updated"); }} className="rounded border px-2 py-1 italic">I</button><button type="button" onClick={() => runTextCommand("underline")} className="rounded border px-2 py-1 underline">Underline</button><button type="button" onClick={() => runTextCommand("strikeThrough")} className="rounded border px-2 py-1 line-through">Strikethrough</button></div><label>Text Colour<input aria-label="Text colour" type="color" value={selectedFormattingFrame.textColor ?? "#111827"} onChange={(event) => { runTextCommand("foreColor", event.target.value); patchFrame(selectedFormattingFrame.id, { textColor: event.target.value }, "Text colour updated"); }} className="ml-2" /></label><label>Highlight Colour<input aria-label="Highlight colour" type="color" defaultValue="#fef08a" onChange={(event) => runTextCommand("hiliteColor", event.target.value)} className="ml-2" /></label><div className="flex gap-1"><button type="button" onClick={() => runTextCommand("superscript")}>Superscript</button><button type="button" onClick={() => runTextCommand("subscript")}>Subscript</button></div><button type="button" onClick={() => { runTextCommand("removeFormat"); patchFrame(selectedFormattingFrame.id, { fontWeight: 400, fontStyle: "normal", textColor: "#111827" }, "Formatting cleared"); }} className="text-left">Clear Formatting</button></div></details>
            <details className="relative"><summary className="cursor-pointer list-none rounded border border-slate-200 px-2 py-1 font-semibold">Paragraph {"\u25be"}</summary><div role="menu" data-v2-paragraph-menu className="absolute left-0 top-8 z-[80] grid w-52 gap-1 rounded-lg border border-slate-200 bg-white p-3 shadow-2xl">{([["left", "justifyLeft", "Align Left"], ["center", "justifyCenter", "Centre"], ["right", "justifyRight", "Align Right"], ["justify", "justifyFull", "Justify"]] as const).map(([alignment, command, label]) => <button key={alignment} type="button" onClick={() => { runTextCommand(command); patchFrame(selectedFormattingFrame.id, { alignment }, "Text alignment updated"); }} className="text-left">{label}</button>)}<button type="button" onClick={() => runTextCommand("insertUnorderedList")} className="text-left">Bullets</button><button type="button" onClick={() => runTextCommand("insertOrderedList")} className="text-left">Numbering</button><button type="button" onClick={() => runTextCommand("indent")} className="text-left">Increase Indent</button><button type="button" onClick={() => runTextCommand("outdent")} className="text-left">Decrease Indent</button><label>Line Spacing<input aria-label="Line spacing" type="number" min="0.8" max="3" step="0.1" value={selectedFormattingFrame.lineHeight ?? 1.5} onChange={(event) => patchFrame(selectedFormattingFrame.id, { lineHeight: Math.max(0.8, Math.min(3, Number(event.target.value) || 1.5)) }, "Line spacing updated")} className="ml-2 w-14 rounded border px-1" /></label></div></details>
            <details className="relative"><summary className="cursor-pointer list-none rounded border border-slate-200 px-2 py-1 font-semibold">Styles {"\u25be"}</summary><div role="menu" data-v2-styles-menu className="absolute left-0 top-8 z-[80] grid w-40 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-2xl">{[["Normal", 16, 400], ["Title", 32, 700], ["Heading 1", 26, 700], ["Heading 2", 22, 700], ["Heading 3", 18, 700], ["Subtitle", 18, 400], ["Caption", 12, 400]].map(([label, fontSize, fontWeight]) => <button key={String(label)} type="button" onClick={() => patchFrame(selectedFormattingFrame.id, { fontSize: Number(fontSize), fontWeight: Number(fontWeight), lineHeight: Number(fontSize) >= 22 ? 1.2 : 1.5 }, `${label} style applied`)} className="text-left">{label}</button>)}</div></details>
          </div> : <span className="text-slate-500">Select a text frame for formatting, or select an object for contextual actions.</span> : null}
          {activeRibbonTab === "INSERT" ? <div data-v2-insert-controls data-v2-single-row className="flex min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-visible whitespace-nowrap"><button type="button" onClick={() => addFrame("TEXT", { direction: "LTR", alignment: "left" }, "FLOAT")} className="rounded border border-slate-200 px-2 py-1 font-semibold">Text Box</button><button type="button" onClick={() => openInsertSurface("IMAGE")} className="rounded border border-slate-200 px-2 py-1 font-semibold">Image</button><button type="button" onClick={() => openInsertSurface("VIDEO")} className="rounded border border-slate-200 px-2 py-1 font-semibold">Video</button><button type="button" onClick={() => openInsertSurface("TABLE")} className="rounded border border-slate-200 px-2 py-1 font-semibold">Table</button><button type="button" onClick={() => { setPreviewMenuOpen(false); setShapePickerOpen((current) => !current); setInsertSurface(null); }} className="rounded border border-slate-200 px-2 py-1 font-semibold">Shape</button><button type="button" onClick={() => openInsertSurface("EDUCATIONAL")} className="rounded border border-slate-200 px-2 py-1 font-semibold">Educational Block</button><button type="button" onClick={() => openInsertSurface("BOOK_QUESTIONS")} className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 font-semibold text-indigo-700">Book Questions</button><button type="button" onClick={() => openInsertSurface("WORKSHEET")} className="rounded border border-violet-200 bg-violet-50 px-2 py-1 font-semibold text-violet-700">Worksheet</button><button type="button" onClick={() => openInsertSurface("ASSESSMENT")} className="rounded border border-fuchsia-200 bg-fuchsia-50 px-2 py-1 font-semibold text-fuchsia-700">Assessment</button></div> : null}
          {activeRibbonTab === "IMPORT" ? <div data-v2-import-controls className="flex min-w-0 flex-1 items-center gap-2"><span className="font-semibold text-slate-700">Import an IDML package</span><button type="button" onClick={onOpenImport} className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 font-semibold text-indigo-800">Choose Package</button><button type="button" onClick={() => setPdfImportOpen(true)} disabled={!isBookRootContext} className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 font-semibold text-indigo-800 disabled:opacity-40">Import PDF</button><span className="text-slate-500">{isBookRootContext ? "Analyze, review fidelity, preview, and explicitly confirm before updating this V2 document." : "Return to Full Book before replacing the complete Book.content document."}</span></div> : null}
          {activeRibbonTab === "REVIEW" ? <div data-v2-review-controls className="flex min-w-0 flex-1 items-center gap-1.5"><button type="button" aria-pressed={reviewSurface === "GRAMMAR"} onClick={() => { setReviewSurface("GRAMMAR"); reviewGrammar(); }} className="rounded border border-slate-200 px-2 py-1 font-semibold">Grammar</button><button type="button" aria-pressed={reviewSurface === "READ_ALOUD"} onClick={() => setReviewSurface("READ_ALOUD")} className="rounded border border-slate-200 px-2 py-1 font-semibold">Read Aloud</button><span className="text-slate-500">{reviewSurface === "GRAMMAR" ? grammarMessage : `Page status: ${narrationStatus.replaceAll("_", " ")}`}</span></div> : null}
          {activeRibbonTab === "VIEW" ? <div data-v2-view-controls className="flex min-w-0 flex-1 items-center gap-1.5"><button type="button" onClick={() => goToPage(-1)} disabled={activeVisibleIndex <= 0} className="rounded border border-slate-200 px-2 py-1 font-semibold disabled:opacity-40">Previous Page</button><select aria-label="Current page" value={activePage?.id ?? ""} onChange={(event) => { const page = layout.pages.find((entry) => entry.id === event.target.value); if (page) navigateToPage(page); }} className="rounded border border-slate-200 bg-white px-1 py-1">{visiblePageViews.map((view) => <option key={view.page.id} value={view.page.id}>Page {view.absolutePageNumber}</option>)}</select><button type="button" onClick={() => goToPage(1)} disabled={activeVisibleIndex >= visiblePages.length - 1} className="rounded border border-slate-200 px-2 py-1 font-semibold disabled:opacity-40">Next Page</button><button type="button" onClick={addPage} disabled={Boolean(pageScope)} className="rounded border border-slate-200 px-2 py-1 font-semibold disabled:opacity-40">Add Page</button><button type="button" onClick={() => { if (activePage) { setDeletePageTargetId(activePage.id); setDeletePageConfirming(false); } }} disabled={Boolean(pageScope) || layout.pages.length <= 1} className="rounded border border-rose-200 px-2 py-1 font-semibold text-rose-700 disabled:opacity-40">Delete Page</button><label className="flex items-center gap-1 font-semibold text-slate-600">View<select aria-label="Page view" value={pageViewMode} onChange={(event) => changePageView(event.target.value as "WEB" | "A4" | "CUSTOM")} className="rounded border border-slate-200 bg-white px-1 py-1"><option value="WEB">Web</option><option value="A4">A4</option><option value="CUSTOM">Custom</option></select></label><button type="button" aria-label="Zoom out" onClick={() => onZoomChange(Math.max(40, zoom - 10))} className="rounded border border-slate-200 px-2 py-1 font-bold">-</button><span className="min-w-10 text-center font-semibold">{Math.round(scale * 100)}%</span><button type="button" aria-label="Zoom in" onClick={() => onZoomChange(Math.min(200, zoom + 10))} className="rounded border border-slate-200 px-2 py-1 font-bold">+</button><button type="button" onClick={() => fitCanvas("PAGE")} className="rounded border border-slate-200 px-2 py-1 font-semibold">Fit Page</button><button type="button" onClick={() => fitCanvas("WIDTH")} className="rounded border border-slate-200 px-2 py-1 font-semibold">Fit Width</button><button type="button" aria-pressed={showGuides} onClick={() => setShowGuides((current) => !current)} className="rounded border border-slate-200 px-2 py-1 font-semibold">Guides</button></div> : null}
          {selectedFrame ? <div data-v2-contextual-actions className="ml-auto flex shrink-0 items-center gap-1 border-l border-slate-200 pl-2"><details data-v2-arrange-menu className="relative"><summary className="cursor-pointer list-none rounded border border-indigo-200 bg-indigo-50 px-2 py-1 font-semibold text-indigo-800">Arrange {"\u25be"}</summary><div className="absolute right-0 top-8 z-50 grid w-40 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">{[["FRONT", "Bring to Front"], ["FORWARD", "Bring Forward"], ["BACKWARD", "Send Backward"], ["BACK", "Send to Back"]].map(([action, label]) => <button key={action} type="button" onClick={() => applyArrange(action as "FRONT" | "FORWARD" | "BACKWARD" | "BACK")} className="text-left">{label}</button>)}</div></details><details data-v2-object-more-menu className="relative"><summary className="cursor-pointer list-none rounded border border-slate-200 px-2 py-1 font-semibold">More {"\u25be"}</summary><div className="absolute right-0 top-8 z-50 grid w-44 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">{!selectedParentId ? <button type="button" onClick={duplicateSelected} className="text-left">Duplicate</button> : <button type="button" onClick={detachSelectedChild} className="text-left">Move to Page</button>}<button type="button" onClick={() => patchFrame(selectedFrame.id, { locked: !selectedFrame.locked }, "Lock updated")} className="text-left">{selectedFrame.locked ? "Unlock" : "Lock"}</button>{(selectedFrame.layoutMode === "FLOW" || selectedFrame.layoutMode === "INLINE") && !selectedParentId ? <><button type="button" onClick={() => moveFlow(-1)} className="text-left">Move Earlier</button><button type="button" onClick={() => moveFlow(1)} className="text-left">Move Later</button></> : null}<button type="button" onClick={() => setPropertiesOpen(true)} className="text-left">Properties &amp; Layers</button></div></details><button type="button" onClick={deleteSelected} className="rounded border border-rose-200 px-2 py-1 font-semibold text-rose-700">Delete</button></div> : null}
        </div>
        {clipboardMessage ? <p role="status" data-v2-clipboard-status className="border-t border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{clipboardMessage}</p> : null}
        {shapePickerOpen ? <div role="dialog" aria-label="Choose shape" data-v2-shape-picker className="absolute left-3 top-full z-50 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-2xl"><div className="mb-3 flex items-center justify-between"><p className="font-bold text-slate-900">Choose Shape</p><button type="button" onClick={() => setShapePickerOpen(false)} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">Close</button></div><div className="grid grid-cols-2 gap-2">{V2_SHAPE_PRESETS.map(([shapeType, label]) => <button key={shapeType} type="button" onClick={() => { addFrame("SHAPE", { payload: { shapeType, fill: shapeType === "LINE" ? "transparent" : "#e0e7ff", border: "#4f46e5", borderWidth: 1, opacity: 1, lineStyle: "SOLID" } }, "FLOAT"); setShapePickerOpen(false); }} className="rounded-lg border border-slate-200 px-3 py-3 text-left font-semibold hover:border-indigo-300 hover:bg-indigo-50"><span className="mb-2 block h-5 rounded border border-indigo-500 bg-indigo-100" style={shapeType === "ELLIPSE" ? { borderRadius: "9999px" } : shapeType === "ROUNDED_RECTANGLE" ? { borderRadius: "8px" } : shapeType === "LINE" ? { height: "1px", borderWidth: 0, borderTop: "2px solid #4f46e5", backgroundColor: "transparent", marginTop: "10px", marginBottom: "10px" } : undefined} />{label}</button>)}</div></div> : null}
        {insertSurface ? <div role="dialog" aria-label={`Insert ${insertSurface.toLowerCase()}`} data-v2-insert-chooser={insertSurface} className="absolute left-3 top-full z-50 mt-1 max-h-[65vh] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-2xl">
          <div className="mb-3 flex items-center justify-between"><p className="font-bold text-slate-900">Insert {insertSurface === "EDUCATIONAL" ? "Educational Block" : insertSurface === "BOOK_QUESTIONS" ? "Book Questions" : insertSurface[0] + insertSurface.slice(1).toLowerCase()}</p><button type="button" onClick={() => setInsertSurface(null)} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">Close</button></div>
          {insertSurface === "IMAGE" || insertSurface === "TABLE" ? <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1" data-v2-insertion-mode><button type="button" aria-pressed={insertionMode === "FLOW"} onClick={() => setInsertionMode("FLOW")} className={`flex-1 rounded px-2 py-1 text-xs font-semibold ${insertionMode === "FLOW" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"}`}>Insert in Flow</button><button type="button" aria-pressed={insertionMode === "FLOAT"} onClick={() => setInsertionMode("FLOAT")} className={`flex-1 rounded px-2 py-1 text-xs font-semibold ${insertionMode === "FLOAT" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"}`}>Float on Page</button></div> : null}
          {insertSurface === "IMAGE" || insertSurface === "VIDEO" ? <><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Choose existing {insertSurface.toLowerCase()}</p><div className="max-h-52 space-y-1 overflow-y-auto">{insertSurface === "IMAGE" ? imageResources.map((resource) => <V2ImageResourceChoice key={resource.id} resource={resource} onUse={() => chooseResource("IMAGE", resource.id)} />) : videoResources.map((resource) => <button key={resource.id} type="button" onClick={() => chooseResource("VIDEO", resource.id)} className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left font-semibold hover:border-indigo-300 hover:bg-indigo-50"><span className="block">{resource.title}</span><span className="mt-0.5 block text-xs font-normal text-slate-500">{[resource.originalFileName, resource.mimeType, resource.fileSizeBytes ? formatV2ResourceSize(resource.fileSizeBytes) : null].filter(Boolean).join(" · ") || "Video resource"}</span></button>)}{!(insertSurface === "IMAGE" ? imageResources : videoResources).length ? <p className="rounded-lg bg-slate-50 p-3 text-slate-500">No compatible {insertSurface.toLowerCase()} resources are available.</p> : null}</div>{onUploadResource ? <label className="mt-3 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-3 py-3 font-semibold text-indigo-700">{uploadingResource ? "Uploading..." : `Upload New ${insertSurface === "IMAGE" ? "Image" : "Video"}`}<input type="file" accept={insertSurface === "IMAGE" ? "image/*" : "video/*"} disabled={uploadingResource} className="sr-only" onChange={(event) => void handleResourceUpload(event, insertSurface)} /></label> : null}{uploadError ? <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{uploadError}</p> : null}</> : null}
          {insertSurface === "TABLE" ? <div data-v2-table-chooser className="space-y-3"><div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-slate-600">Rows<input type="number" min="1" max="20" value={tableRows} onChange={(event) => setTableRows(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5" /></label><label className="text-xs font-semibold text-slate-600">Columns<input type="number" min="1" max="12" value={tableColumns} onChange={(event) => setTableColumns(Math.max(1, Math.min(12, Number(event.target.value) || 1)))} className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5" /></label></div><button type="button" onClick={() => { const payload = { rows: tableRows, columns: tableColumns, cells: Array.from({ length: tableRows * tableColumns }, () => "") }; if (selectedContainerFrame) addChildFrame("TABLE", undefined, payload); else addFrame("TABLE", { payload }, insertionMode); setInsertSurface(null); }} className="w-full rounded-lg bg-indigo-600 px-3 py-2 font-bold text-white">Create Table</button></div> : null}
          {insertSurface === "BOOK_QUESTIONS" ? <V2BookQuestionsAuthoring
            bookId={bookId}
            chapterId={chapterId}
            moduleId={moduleId}
            exerciseId={exerciseId}
            initialLauncherTarget={editingLauncherPayload?.launcherType === "question" ? editingLauncherPayload.target : null}
            onInsert={insertAssessmentLauncher}
            onClose={() => {
              setEditingLauncherFrameId(null);
              setInsertSurface(null);
            }}
          /> : null}
          {insertSurface === "WORKSHEET" ? <V2WorksheetLauncherAuthoring
            bookId={bookId}
            chapterId={chapterId}
            moduleId={moduleId}
            onInsert={insertWorksheetLauncher}
            onClose={() => setInsertSurface(null)}
          /> : null}
          {insertSurface === "ASSESSMENT" ? <V2PublisherAssessmentLauncherAuthoring bookId={bookId} onInsert={insertPublisherAssessmentLauncher} onClose={() => setInsertSurface(null)} /> : null}
          {insertSurface === "EDUCATIONAL" ? <div data-v2-educational-picker className="grid max-h-[55vh] gap-2 overflow-y-auto sm:grid-cols-2">{EDUCATIONAL_OBJECT_REGISTRY.map(([type]) => { const definition = getEducationalObjectDefinition(type); return <button key={type} type="button" onClick={() => addEducationalFrame(type)} className="rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-indigo-300 hover:bg-indigo-50"><span className="flex items-center gap-2 font-semibold"><span aria-hidden className="grid h-6 w-6 place-items-center rounded-full border text-xs" style={{ color: definition.theme.accent, borderColor: definition.theme.border, backgroundColor: definition.theme.tint }}>{definition.icon}</span>{definition.label}</span><span className="mt-1 block text-xs font-normal text-slate-500">{definition.description}</span></button>; })}</div> : null}
        </div> : null}
        {activeRibbonTab === "REVIEW" && reviewSurface === "GRAMMAR" ? <div data-v2-grammar-review-panel className="absolute left-3 right-3 top-full z-[70] mt-1 rounded-xl border border-indigo-200 bg-white p-3 text-xs shadow-2xl"><div className="flex items-center justify-between"><span className="font-bold text-indigo-900">Grammar</span><button type="button" onClick={() => setReviewSurface(null)} className="rounded px-2 py-1 text-slate-500">Close</button></div><p className="mt-2 text-slate-600">{grammarMessage || "Browser spelling and grammar checking is active in editable text."}</p></div> : null}
        {activeRibbonTab === "REVIEW" && reviewSurface === "READ_ALOUD" ? <div data-v2-read-aloud-panel className="absolute left-3 right-3 top-full z-[70] mt-1 max-h-[70vh] overflow-y-auto rounded-xl border border-blue-200 bg-white p-2 shadow-2xl">
          <div className="mb-1 flex items-center justify-between text-xs"><span className="font-bold text-blue-900">Read Aloud</span><button type="button" onClick={() => setReviewSurface(null)} className="rounded px-2 py-1 text-slate-500">Close</button></div>
          <V2ReadAloudPlayer manifest={narrationManifest} audioUrls={narrationAudioUrls} pageContext={pageCountLabel} pageText={activeOriginalPage?.readAloud?.text ?? ""} onPrepare={canPrepareReadAloud ? async () => { const result = await onPrepareReadAloud!(); globalThis.location.reload(); return result; } : undefined} />
          {canEditReadAloud && activeOriginalPage ? <ReadAloudPageInspector key={activeOriginalPage.id} page={activeOriginalPage} onSave={(text) => onDocumentChange({ ...document, pageLayout: updateV2PageLayout(layout, (pages) => pages.map((page) => page.id === activeOriginalPage.id ? { ...page, readAloud: { text, source: "MANUAL", reviewed: true } } : page)) }, "Reading text saved as manual text")} /> : null}
          <details data-v2-read-aloud-advanced className="mt-2 rounded-lg border border-slate-200 text-xs">
            <summary className="cursor-pointer px-3 py-2 font-bold text-slate-700">Advanced</summary>
            <div className="space-y-2 border-t border-slate-200 p-2">
              <p className="text-[11px] text-slate-500">Browser TTS previews semantic text. Human audio can be attached to the page or stable narration segment IDs; exact word timing is not represented by the current model.</p>
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-800">Segment-level mapping</span><label className="flex items-center gap-1 font-semibold text-blue-800">Page audio<select aria-label="Attach human narration" value={activePage?.narration?.resourceId ?? ""} onChange={(event) => attachNarration(event.target.value)} className="rounded border border-blue-200 bg-white px-2 py-1"><option value="">Browser TTS only</option>{audioResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.title}</option>)}</select></label><button type="button" onClick={() => attachNarration("")} className="rounded border border-blue-200 px-2 py-1 font-semibold text-blue-800">Remove page audio</button></div>
              <div data-v2-narration-segments className="space-y-2">
                {(activeNarrationPage?.segments ?? []).map((segment) => <div key={segment.id} className="grid gap-2 rounded-lg border border-slate-200 p-2 text-xs lg:grid-cols-[minmax(0,1fr)_12rem_6rem_6rem]"><div className="min-w-0"><p className="truncate font-bold text-slate-700">{segment.narrationLabel || segment.id}</p><p className="line-clamp-2 text-slate-500">{segment.text}</p><code className="text-[10px] text-slate-400">{segment.id}</code></div><label className="font-semibold text-slate-600">Segment audio<select aria-label={"Audio for " + segment.id} value={segment.audioResourceId ?? ""} onChange={(event) => patchNarrationSegment(segment.id, segment.sourceHash, { resourceId: event.target.value || undefined })} className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1"><option value="">Use page/TTS</option>{audioResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.title}</option>)}</select></label><label className="font-semibold text-slate-600">Start ms<input type="number" min="0" value={segment.startMs ?? ""} onChange={(event) => patchNarrationSegment(segment.id, segment.sourceHash, { startMs: event.target.value ? Math.max(0, Number(event.target.value)) : undefined })} className="mt-1 w-full rounded border border-slate-200 px-2 py-1" /></label><label className="font-semibold text-slate-600">End ms<input type="number" min="0" value={segment.endMs ?? ""} onChange={(event) => patchNarrationSegment(segment.id, segment.sourceHash, { endMs: event.target.value ? Math.max(0, Number(event.target.value)) : undefined })} className="mt-1 w-full rounded border border-slate-200 px-2 py-1" /></label></div>)}
                {!activeNarrationPage?.segments.length ? <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">No narratable semantic text exists on this page yet.</p> : null}
              </div>
            </div>
          </details>
        </div> : null}      </header>

      {deletePageTarget ? <div role="dialog" aria-modal="true" aria-label="Delete Page" data-v2-delete-page-dialog className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"><h2 className="text-lg font-bold text-slate-900">Delete Page</h2><label className="mt-4 block text-sm font-semibold text-slate-700">Page<select aria-label="Page to delete" value={deletePageTarget.id} onChange={(event) => { setDeletePageTargetId(event.target.value); setDeletePageConfirming(false); }} className="mt-1 w-full rounded border border-slate-200 px-3 py-2">{visiblePageViews.map((view) => <option key={view.page.id} value={view.page.id}>Page {view.absolutePageNumber}</option>)}</select></label><p data-v2-delete-page-summary className="mt-3 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">Page {deletePageTargetIndex + 1}<br />{deletePageObjectCount} objects</p>{deletePageConfirming ? <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900">Delete Page {deletePageTargetIndex + 1}? This page contains {deletePageObjectCount} objects.</p> : null}<div className="mt-5 flex justify-end gap-2">{deletePageConfirming ? <button type="button" onClick={() => setDeletePageConfirming(false)} className="rounded border px-3 py-2 text-sm font-semibold">Cancel</button> : <button type="button" onClick={() => setDeletePageTargetId(null)} className="rounded border px-3 py-2 text-sm font-semibold">Cancel</button>}<button type="button" onClick={() => { if (deletePageConfirming) deletePage(deletePageTarget.id); else setDeletePageConfirming(true); }} className="rounded bg-rose-600 px-3 py-2 text-sm font-semibold text-white">Delete Page {deletePageTargetIndex + 1}</button></div></div></div> : null}

      <div className="hidden flex-wrap items-center gap-2 border-b border-slate-300 bg-white px-3 py-2 text-xs">
        <span className="font-semibold text-slate-500">Insert:</span>
        {(["TEXT", "IMAGE", "TABLE", "VIDEO", "EDUCATIONAL"] as const).map((type) => (
          <button key={type} type="button" onClick={() => addFrame(type)} className="rounded-md border border-slate-200 px-2 py-1 font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">{type[0] + type.slice(1).toLowerCase()}</button>
        ))}
        <button type="button" onClick={addPage} className="ml-2 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 font-semibold text-indigo-700 hover:bg-indigo-100">Add Page</button>
        <span className="ml-auto flex items-center gap-1 text-slate-500">
          <button type="button" onClick={() => onZoomChange(Math.max(50, zoom - 10))} className="rounded px-1 font-bold hover:bg-slate-100" aria-label="Zoom out">-</button>
          <span className="min-w-12 text-center">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => onZoomChange(Math.min(200, zoom + 10))} className="rounded px-1 font-bold hover:bg-slate-100" aria-label="Zoom in">+</button>
          <button type="button" onClick={() => onZoomChange(70)} className="ml-1 rounded-md border border-slate-200 px-2 py-1 font-semibold hover:bg-slate-50">Fit page</button>
        </span>
      </div>

      {selectedImageFrame ? (
        <div className="hidden flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs" onKeyDown={(event) => { if (event.key === "Escape") setCropFrameId(null); }}>
          <span className="font-bold text-amber-900">Image</span>
          {(["FIT", "FILL", "CROP"] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => { if (mode === "CROP") setCropFrameId(selectedImageFrame.id); else setCropFrameId(null); patchImage(selectedImageFrame.id, { fitMode: mode }, `${mode} mode selected`); }} className={`rounded-md border px-2 py-1 font-semibold ${selectedImageFrame.fitMode === mode ? "border-amber-500 bg-amber-200 text-amber-950" : "border-amber-200 bg-white text-amber-800"}`}>{mode[0] + mode.slice(1).toLowerCase()}</button>
          ))}
          <span className="ml-1 text-amber-700">Zoom</span>
          <button type="button" onClick={() => patchImage(selectedImageFrame.id, { fitMode: "CROP", zoom: Math.max(V2_IMAGE_ZOOM_MIN, (selectedImageFrame.zoom ?? 1) - 0.25) }, "Image zoom updated")} className="rounded-md border border-amber-200 bg-white px-2 py-1 font-bold" aria-label="Zoom image out">-</button>
          <span className="min-w-10 text-center font-semibold text-amber-900">{(selectedImageFrame.zoom ?? 1).toFixed(2)}·</span>
          <button type="button" onClick={() => patchImage(selectedImageFrame.id, { fitMode: "CROP", zoom: Math.min(V2_IMAGE_ZOOM_MAX, (selectedImageFrame.zoom ?? 1) + 0.25) }, "Image zoom updated")} className="rounded-md border border-amber-200 bg-white px-2 py-1 font-bold" aria-label="Zoom image in">+</button>
          <button type="button" onClick={() => { setCropFrameId(null); patchImage(selectedImageFrame.id, { fitMode: "FIT", crop: { x: 0, y: 0, width: 1, height: 1 }, zoom: 1, offsetX: 0, offsetY: 0 }, "Image reset"); }} className="rounded-md border border-amber-200 bg-white px-2 py-1 font-semibold text-amber-900">Reset</button>
          <label className="flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-1 font-semibold text-amber-900">
            <input type="checkbox" checked={selectedImageFrame.aspectLocked === true} onChange={(event) => patchImage(selectedImageFrame.id, { aspectLocked: event.target.checked }, "Image aspect lock updated")} />
            Aspect lock
          </label>
          <select aria-label="Replace image" value="" onChange={(event) => { const resource = imageResources.find((entry) => entry.id === event.target.value); if (resource) { setCropFrameId(null); patchImage(selectedImageFrame.id, { resourceId: resource.id, fitMode: "FIT", crop: { x: 0, y: 0, width: 1, height: 1 }, zoom: 1, offsetX: 0, offsetY: 0 }, "Image replaced"); } }} className="rounded-md border border-amber-200 bg-white px-2 py-1 font-semibold text-amber-900"><option value="">Replace Image</option>{imageResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.title}</option>)}</select>
          {onUploadResource ? <label className="cursor-pointer rounded-md border border-amber-200 bg-white px-2 py-1 font-semibold text-amber-900">{uploadingResource ? "Uploading..." : "Upload Image"}<input type="file" accept="image/*" className="sr-only" disabled={uploadingResource} onChange={(event) => void handleResourceUpload(event, "IMAGE", selectedImageFrame.id)} /></label> : null}
          {cropFrameId === selectedImageFrame.id ? <span className="font-semibold text-amber-800">Crop mode · drag image</span> : null}
        </div>
      ) : null}
      {selectedTextFrame ? (
        <div className="hidden flex-wrap items-center gap-2 border-b border-blue-200 bg-blue-50 px-3 py-2 text-xs">
          <span className="font-bold text-blue-900">Text</span>
          {[ ["bold", "Bold"], ["italic", "Italic"], ["underline", "Underline"] ].map(([command, label]) => (
            <button key={command} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => globalThis.document.execCommand(command, false)} className="rounded-md border border-blue-200 bg-white px-2 py-1 font-semibold text-blue-800">{label}</button>
          ))}
          <label className="flex items-center gap-1 font-semibold text-blue-800">Size
            <input type="number" min="8" max="96" value={selectedTextFrame.fontSize ?? 16} onChange={(event) => patchFrame(selectedTextFrame.id, { fontSize: Math.max(8, Math.min(96, Number(event.target.value) || 16)) }, "Text size updated")} className="w-14 rounded border border-blue-200 bg-white px-1 py-1" />
          </label>
          <select aria-label="Text direction" value={selectedTextFrame.direction ?? "LTR"} onChange={(event) => patchFrame(selectedTextFrame.id, { direction: event.target.value as LayoutV2Frame["direction"] }, "Text direction updated")} className="rounded-md border border-blue-200 bg-white px-2 py-1 font-semibold text-blue-800">
            <option value="LTR">LTR</option><option value="RTL">RTL</option><option value="AUTO">Auto</option>
          </select>
          <select aria-label="Text alignment" value={selectedTextFrame.alignment ?? "left"} onChange={(event) => patchFrame(selectedTextFrame.id, { alignment: event.target.value as LayoutV2Frame["alignment"] }, "Text alignment updated")} className="rounded-md border border-blue-200 bg-white px-2 py-1 font-semibold text-blue-800">
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
          </select>
          <label className="flex items-center gap-1 font-semibold text-blue-800">Read order
            <input type="number" min="0" value={selectedTextFrame.readingOrder} onChange={(event) => patchFrame(selectedTextFrame.id, { readingOrder: Math.max(0, Number(event.target.value) || 0) }, "Reading order updated")} className="w-14 rounded border border-blue-200 bg-white px-1 py-1" />
          </label>
        </div>
      ) : null}
      {selectedFlowFrame ? (
        <div className="hidden flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <span className="font-bold text-slate-700">Flow</span>
          <select aria-label="Object flow" value={selectedFlowFrame.layoutMode} onChange={(event) => patchFrame(selectedFlowFrame.id, { layoutMode: event.target.value as LayoutV2Frame["layoutMode"] }, "Object flow updated")} className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700">
            <option value="ABSOLUTE">Absolute</option><option value="FLOAT">Float</option><option value="INLINE">Inline</option>
          </select>
          <select aria-label="Text wrap" value={selectedFlowFrame.wrapMode} onChange={(event) => patchFrame(selectedFlowFrame.id, { wrapMode: event.target.value as LayoutV2Frame["wrapMode"] }, "Text wrap updated")} className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700">
            <option value="NONE">No wrap</option><option value="WRAP_LEFT">Wrap left</option><option value="WRAP_RIGHT">Wrap right</option><option value="WRAP_BOTH">Wrap both</option><option value="BEHIND_TEXT">Behind text</option><option value="IN_FRONT_OF_TEXT">In front</option>
          </select>
          <label className="flex items-center gap-1 font-semibold text-slate-700">Gap
            <input type="number" min="0" max="96" value={selectedFlowFrame.wrapPadding ?? 8} onChange={(event) => patchFrame(selectedFlowFrame.id, { wrapPadding: Math.max(0, Math.min(96, Number(event.target.value) || 0)) }, "Wrap gap updated")} className="w-14 rounded border border-slate-200 bg-white px-1 py-1" />
          </label>
        </div>
      ) : null}
      {selectedFrame ? (
        <div className="hidden flex-wrap items-center gap-2 border-b border-indigo-200 bg-indigo-50 px-3 py-2 text-xs" data-v2-authoring-controls="arrange-legacy-hidden">
          <span className="font-bold text-indigo-900">Arrange</span>
          {[ ["FRONT", "Bring to Front"], ["FORWARD", "Bring Forward"], ["BACKWARD", "Send Backward"], ["BACK", "Send to Back"] ].map(([action, label]) => (
            <button key={action} type="button" onClick={() => applyArrange(action as "FRONT" | "FORWARD" | "BACKWARD" | "BACK")} className="rounded-md border border-indigo-200 bg-white px-2 py-1 font-semibold text-indigo-800">{label}</button>
          ))}
          <label className="flex items-center gap-1 font-semibold text-indigo-800">Layer
            <select aria-label="Frame layer" value={selectedFrame.layer} onChange={(event) => applyLayer(event.target.value as LayoutV2Frame["layer"])} className="rounded border border-indigo-200 bg-white px-2 py-1">
              <option value="BACKGROUND">Background</option><option value="CONTENT">Content</option><option value="DESIGN">Design</option><option value="INTERACTIVE">Interactive</option>
            </select>
          </label>
          <label className="flex items-center gap-1 font-semibold text-indigo-800">Reading Order
            <input type="number" min="0" value={selectedFrame.readingOrder} onChange={(event) => patchFrame(selectedFrame.id, { readingOrder: Math.max(0, Number(event.target.value) || 0) }, "Reading order updated")} className="w-14 rounded border border-indigo-200 bg-white px-1 py-1" />
          </label>
          <label className="flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-1 font-semibold text-indigo-800"><input type="checkbox" checked={selectedFrame.locked} onChange={(event) => patchFrame(selectedFrame.id, { locked: event.target.checked }, "Lock updated")} /> Lock</label>
          {(selectedFrame.layoutMode === "FLOW" || selectedFrame.layoutMode === "INLINE") && !selectedParentId ? <><button type="button" onClick={() => moveFlow(-1)} className="rounded-md border border-indigo-200 bg-white px-2 py-1 font-semibold text-indigo-800">Move Earlier</button><button type="button" onClick={() => moveFlow(1)} className="rounded-md border border-indigo-200 bg-white px-2 py-1 font-semibold text-indigo-800">Move Later</button></> : null}
          {selectedParentId ? <button type="button" onClick={detachSelectedChild} className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 font-semibold text-amber-900">Move to Page</button> : null}
          {!selectedParentId ? <><button type="button" onClick={duplicateSelected} className="rounded-md border border-indigo-200 bg-white px-2 py-1 font-semibold text-indigo-800">Duplicate</button><button type="button" onClick={deleteSelected} className="rounded-md border border-rose-200 bg-white px-2 py-1 font-semibold text-rose-700">Delete</button></> : null}
        </div>
      ) : null}
      {error ? <div role="alert" className="mx-4 mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</div> : null}

      <div className="hidden items-center gap-2 border-b border-slate-300 bg-slate-50 px-3 py-2 text-xs">
        <span className="font-semibold text-slate-600">Active page {activePageIndex + 1}</span>
        <button type="button" onClick={() => moveActivePage(-1)} disabled={activePageIndex === 0} className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold disabled:opacity-40">Move up</button>
        <button type="button" onClick={() => moveActivePage(1)} disabled={activeVisibleIndex >= visiblePages.length - 1} className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold disabled:opacity-40">Move down</button>
        <span data-testid="v2-save-state" className="ml-auto text-slate-500">{saveLabel} ? {wordCount.toLocaleString("en-IN")} words</span>
      </div>

      <details className="mx-3 mt-3 hidden rounded-lg border border-slate-300 bg-white text-xs" data-v2-object-navigator>
        <summary className="cursor-pointer px-3 py-2 font-bold text-slate-700">Page Objects</summary>
        <div className="grid gap-2 border-t border-slate-200 p-2 sm:grid-cols-2 lg:grid-cols-4">
          {layout.pages.map((page) => (
            <div key={page.id} className="min-w-0">
              <button type="button" onClick={() => setActivePageId(page.id)} className="mb-1 font-bold text-slate-600">Page {layout.pages.indexOf(page) + 1}</button>
              {(["BACKGROUND", "CONTENT", "DESIGN", "INTERACTIVE"] as const).map((layer) => {
                const layerFrames = page.frames.filter((frame) => frame.layer === layer).sort((a, b) => a.zIndex - b.zIndex);
                if (!layerFrames.length) return null;
                return <div key={layer} className="mb-1"><div className="px-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{layerLabel(layer)}</div>{layerFrames.map((frame) => <div key={frame.id} className="pl-2"><button type="button" onClick={() => { setActivePageId(page.id); setSelectedFrameId(frame.id); }} className={`block max-w-full truncate rounded px-1 py-0.5 text-left font-semibold ${selectedFrameId === frame.id ? "bg-indigo-100 text-indigo-800" : "text-slate-600 hover:bg-slate-50"}`}>{frame.narrationLabel || frame.type}</button>{frame.children?.map((child) => <button key={child.id} type="button" onClick={() => { setActivePageId(page.id); setSelectedFrameId(child.id); }} className={`ml-3 block max-w-[90%] truncate rounded px-1 py-0.5 text-left text-[11px] ${selectedFrameId === child.id ? "bg-amber-100 text-amber-900" : "text-slate-500 hover:bg-slate-50"}`}>? {child.narrationLabel || child.type}</button>)}</div>)}</div>;
              })}
            </div>
          ))}
        </div>
      </details>
      <div className="hidden flex-wrap items-center gap-2 border-b border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-xs">
        <span className="font-semibold text-fuchsia-800">Page visual:</span>
        {activePage.visualMode === "EXACT_REPLICA" ? <><span className="rounded-full bg-fuchsia-200 px-2 py-1 font-bold text-fuchsia-900">Exact Replica</span><button type="button" onClick={() => onDocumentChange({ ...document, pageLayout: setV2PageVisualMode(layout, activePage.id, "EDITABLE") }, "Page switched to Editable; replica source preserved")} className="rounded-md border border-fuchsia-200 bg-white px-2 py-1 font-semibold text-fuchsia-800">View as Editable</button></> : activePage.replica?.resourceId ? <button type="button" onClick={() => onDocumentChange({ ...document, pageLayout: setV2PageVisualMode(layout, activePage.id, "EXACT_REPLICA") }, "Page switched to Exact Replica; semantic frames preserved")} className="rounded-md border border-fuchsia-200 bg-white px-2 py-1 font-semibold text-fuchsia-800">Use Replica</button> : <span className="text-slate-500">Editable</span>}
        {activePage.visualMode === "EXACT_REPLICA" ? <label className="ml-auto flex items-center gap-1 font-semibold text-fuchsia-800"><input type="checkbox" checked={semanticOverlay} onChange={(event) => setSemanticOverlay(event.target.checked)} /> Semantic Overlay</label> : null}
      </div>
      {pdfImportOpen ? <PdfImportDialog open bookId={bookId} hasFullBookPdf={hasFullBookPdf || uploadedPdfIsAvailable} hasMeaningfulContent={hasMeaningfulV2Content(document)} onClose={() => setPdfImportOpen(false)} onImportExistingPdf={onImportPdf} onAttachUploadedPdf={onAttachPdf} onListPdfVersions={onListPdfVersions} onRestorePdfVersion={onRestorePdfVersion} onBookPdfAttached={() => { setUploadedPdfIsAvailable(true); router.refresh(); }} onComplete={applyPdfImportPages} /> : null}
      {pendingImageDuplicate ? <div role="dialog" aria-modal="true" aria-label="Possible duplicate image" className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"><h2 className="text-lg font-bold text-slate-900">This image may already exist.</h2><p className="mt-1 text-sm text-slate-600">Use an existing protected Image resource or deliberately upload another copy.</p><div className="mt-3 max-h-72 space-y-2 overflow-y-auto">{pendingImageDuplicate.matches.map((match) => <div key={match.id} className="flex gap-3 rounded-lg border border-slate-200 p-3"><span className="relative h-16 w-20 shrink-0 overflow-hidden rounded bg-slate-100"><ProtectedResourceThumbnail src={`/api/admin/resources/${encodeURIComponent(match.id)}/preview`} className="h-full w-full object-contain" /></span><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-slate-800">{match.title}</span><span className="mt-1 block text-xs text-slate-500">{[match.originalFileName, match.mimeType, match.fileSizeBytes ? formatV2ResourceSize(match.fileSizeBytes) : null].filter(Boolean).join(" · ")}</span><button type="button" onClick={() => selectExistingImage(match.id, pendingImageDuplicate.replaceFrameId)} className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900">Use Existing Image</button></span></div>)}</div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void uploadImageAnyway()} className="rounded bg-amber-600 px-3 py-2 text-sm font-semibold text-white">Upload Anyway</button><button type="button" onClick={() => setPendingImageDuplicate(null)} className="rounded border px-3 py-2 text-sm font-semibold text-slate-700">Cancel</button></div></div></div> : null}
      {pendingVideoDuplicate ? <div role="dialog" aria-modal="true" aria-label="Possible duplicate video" className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"><h2 className="text-lg font-bold text-slate-900">This video may already exist.</h2><p className="mt-1 text-sm text-slate-600">Use the existing protected Video resource to avoid a duplicate upload.</p><div className="mt-3 space-y-2">{pendingVideoDuplicate.matches.map((match) => <div key={match.id} className="rounded-lg border border-slate-200 p-3"><p className="font-semibold text-slate-800">{match.title}</p><p className="mt-1 text-xs text-slate-500">{[match.originalFileName, match.fileSizeBytes ? formatV2ResourceSize(match.fileSizeBytes) : null].filter(Boolean).join(" · ")}</p><button type="button" onClick={() => selectExistingVideo(match.id, pendingVideoDuplicate.replaceFrameId)} className="mt-2 rounded border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-800">Use Existing Video</button></div>)}</div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void uploadVideoAnyway()} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Upload Anyway</button><button type="button" onClick={() => setPendingVideoDuplicate(null)} className="rounded border px-3 py-2 text-sm font-semibold text-slate-700">Cancel</button></div></div></div> : null}
      <div data-v2-editor-body className={`grid min-h-0 flex-1 grid-cols-1 ${showPropertiesPanel ? "xl:grid-cols-[minmax(0,1fr)_18rem]" : "xl:grid-cols-[minmax(0,1fr)]"}`}>
      <main data-v2-canvas-scroll data-v2-page-view={pageViewMode} className="min-h-0 min-w-0 overflow-auto p-2">        <div data-v2-page-navigation className="flex flex-wrap items-center justify-center gap-3 border-b border-slate-300 bg-slate-50 px-3 py-2 text-xs">
          <button type="button" aria-label="Previous page" onClick={() => goToPage(-1)} disabled={activeVisibleIndex <= 0} className="rounded border border-slate-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button>
          <span data-v2-page-indicator className="font-bold text-slate-700">{pageCountLabel}</span>
          <label className="flex items-center gap-1 font-semibold text-slate-600">Page
            <input aria-label="Page number" inputMode="numeric" type="number" min={visiblePageViews[0]?.absolutePageNumber ?? 1} max={visiblePageViews.at(-1)?.absolutePageNumber ?? visiblePageViews.length} value={pageInputValue} onChange={(event) => setPageInputValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") commitPageInput(); }} onBlur={commitPageInput} className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-center" />
            <span>{pageScope ? "absolute" : `of ${visiblePageViews.length}`}</span>
          </label>
          <button type="button" aria-label="Next page" onClick={() => goToPage(1)} disabled={activeVisibleIndex >= visiblePages.length - 1} className="rounded border border-slate-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-40">Next</button>
        </div>
        <div className={pageViewMode === "WEB" ? "mx-auto flex min-w-[min(100%,520px)] flex-col gap-3 w-full" : "mx-auto flex min-w-[min(100%,520px)] flex-col gap-3 w-fit"}>
          {pageViewMode === "WEB" ? visiblePageViews.map((view) => renderPageCanvas(view.page, view.absolutePageNumber, activePage?.id === view.page.id)) : activePage ? renderPageCanvas(activePage, activeAbsolutePageNumber, true) : null}
        </div>
      </main>
      <aside data-v2-right-panel className={`${showPropertiesPanel ? "block" : "hidden"} h-full min-h-0 min-w-0 overflow-y-auto border-t border-slate-300 bg-white p-3 xl:border-l xl:border-t-0`}>
        <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Properties &amp; Layers</p><button type="button" aria-label="Collapse properties" onClick={() => setPropertiesOpen(false)} className="rounded px-2 py-1 text-slate-400 hover:bg-slate-100">x</button></div>
        <p className="mt-2 text-xs text-slate-500">{selectedFrame ? `${selectedFrame.type} selected · reading order ${selectedFrame.readingOrder}` : `Page ${activePageIndex + 1} · click the page to set an insertion point.`}</p>
        {selectedFrame ? <details open data-v2-selected-properties className="mt-3 rounded-lg border border-slate-200 text-xs"><summary className="cursor-pointer px-3 py-2 font-bold text-slate-700">Selected Object</summary><div className="space-y-3 border-t border-slate-200 p-3">
          <label className="block font-semibold text-slate-600">Layer<select aria-label="Frame layer" value={selectedFrame.layer} onChange={(event) => applyLayer(event.target.value as LayoutV2Frame["layer"])} className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5"><option value="BACKGROUND">Background</option><option value="CONTENT">Content</option><option value="DESIGN">Design</option><option value="INTERACTIVE">Interactive</option></select></label>
          <label className="block font-semibold text-slate-600">Reading Order<input type="number" min="0" value={selectedFrame.readingOrder} onChange={(event) => patchFrame(selectedFrame.id, { readingOrder: Math.max(0, Number(event.target.value) || 0) }, "Reading order updated")} className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5" /></label>
          <label className="flex items-center gap-2 font-semibold text-slate-600"><input type="checkbox" checked={selectedFrame.locked} onChange={(event) => patchFrame(selectedFrame.id, { locked: event.target.checked }, "Lock updated")} /> Lock object</label>
          {selectedFlowFrame && selectedFlowFrame.type !== "IMAGE" ? <div data-v2-layout-properties className="space-y-2 border-t border-slate-100 pt-3"><p className="font-bold text-slate-700">Flow &amp; Wrap</p><select aria-label="Object flow" value={selectedFlowFrame.layoutMode} onChange={(event) => patchFrame(selectedFlowFrame.id, { layoutMode: event.target.value as LayoutV2Frame["layoutMode"] }, "Object flow updated")} className="w-full rounded border border-slate-200 px-2 py-1.5"><option value="ABSOLUTE">Absolute</option><option value="FLOAT">Float</option><option value="INLINE">Inline</option></select><select aria-label="Text wrap" value={selectedFlowFrame.wrapMode} onChange={(event) => patchFrame(selectedFlowFrame.id, { wrapMode: event.target.value as LayoutV2Frame["wrapMode"] }, "Text wrap updated")} className="w-full rounded border border-slate-200 px-2 py-1.5"><option value="NONE">No wrap</option><option value="WRAP_LEFT">Wrap left</option><option value="WRAP_RIGHT">Wrap right</option><option value="WRAP_BOTH">Wrap both</option><option value="BEHIND_TEXT">Behind text</option><option value="IN_FRONT_OF_TEXT">In front</option></select><label className="block font-semibold text-slate-600">Gap<input type="number" min="0" max="96" value={selectedFlowFrame.wrapPadding ?? 8} onChange={(event) => patchFrame(selectedFlowFrame.id, { wrapPadding: Math.max(0, Math.min(96, Number(event.target.value) || 0)) }, "Wrap gap updated")} className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5" /></label></div> : null}
          {selectedFrame.type === "TEXT" && !isV2MainFlowFrame(selectedFrame) ? <div className="space-y-2 border-t border-slate-100 pt-3"><p className="font-bold text-slate-700">Bounded container content</p><div className="flex flex-wrap gap-1">{(["TEXT", "IMAGE", "VIDEO", "TABLE"] as const).map((type) => <button key={type} type="button" onClick={() => addChildFrame(type)} className="rounded border px-2 py-1">+ {type[0] + type.slice(1).toLowerCase()}</button>)}</div></div> : null}
        </div></details> : null}
        {selectedShapeFrame ? <details open className="mt-3 rounded-lg border border-violet-200 text-xs">
          <summary className="cursor-pointer px-3 py-2 font-bold text-violet-900">Shape Properties</summary>
          <div className="space-y-3 border-t border-violet-100 p-3">
            <label className="block font-semibold text-slate-600">Shape<select aria-label="Shape type" value={typeof selectedShapePayload.shapeType === "string" ? selectedShapePayload.shapeType : "RECTANGLE"} onChange={(event) => patchFrame(selectedShapeFrame.id, { payload: { ...selectedShapePayload, shapeType: event.target.value } }, "Shape type updated")} className="mt-1 w-full rounded border px-2 py-1.5">{V2_SHAPE_PRESETS.map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-2"><label className="font-semibold text-slate-600">Fill<input aria-label="Shape fill colour" type="color" value={typeof selectedShapePayload.fill === "string" && selectedShapePayload.fill.startsWith("#") ? selectedShapePayload.fill : "#e0e7ff"} onChange={(event) => patchFrame(selectedShapeFrame.id, { payload: { ...selectedShapePayload, fill: event.target.value } }, "Shape fill updated")} className="mt-1 h-8 w-full rounded border" /></label><label className="font-semibold text-slate-600">Border<input aria-label="Shape border colour" type="color" value={typeof selectedShapePayload.border === "string" && selectedShapePayload.border.startsWith("#") ? selectedShapePayload.border : "#4f46e5"} onChange={(event) => patchFrame(selectedShapeFrame.id, { payload: { ...selectedShapePayload, border: event.target.value } }, "Shape border updated")} className="mt-1 h-8 w-full rounded border" /></label></div>
            <label className="block font-semibold text-slate-600">Border Width<input aria-label="Shape border width" type="number" min="1" max="12" value={typeof selectedShapePayload.borderWidth === "number" ? selectedShapePayload.borderWidth : 1} onChange={(event) => patchFrame(selectedShapeFrame.id, { payload: { ...selectedShapePayload, borderWidth: Math.max(1, Math.min(12, Number(event.target.value) || 1)) } }, "Shape border width updated")} className="mt-1 w-full rounded border px-2 py-1.5" /></label>
            <label className="block font-semibold text-slate-600">Opacity<input aria-label="Shape opacity" type="range" min="0.1" max="1" step="0.1" value={typeof selectedShapePayload.opacity === "number" ? selectedShapePayload.opacity : 1} onChange={(event) => patchFrame(selectedShapeFrame.id, { payload: { ...selectedShapePayload, opacity: Number(event.target.value) } }, "Shape opacity updated")} className="mt-1 w-full" /></label>
            <label className="block font-semibold text-slate-600">Line Style<select aria-label="Shape line style" value={typeof selectedShapePayload.lineStyle === "string" ? selectedShapePayload.lineStyle : "SOLID"} onChange={(event) => patchFrame(selectedShapeFrame.id, { payload: { ...selectedShapePayload, lineStyle: event.target.value } }, "Shape line style updated")} className="mt-1 w-full rounded border px-2 py-1.5"><option value="SOLID">Solid</option><option value="DASHED">Dashed</option><option value="DOTTED">Dotted</option></select></label>
            {selectedShapePayload.shapeType !== "LINE" ? <><label className="block font-semibold text-slate-600">Text Padding<input aria-label="Shape text padding" type="number" min="4" max="48" value={typeof selectedShapePayload.textPadding === "number" ? selectedShapePayload.textPadding : 12} onChange={(event) => patchFrame(selectedShapeFrame.id, { payload: { ...selectedShapePayload, textPadding: Math.max(4, Math.min(48, Number(event.target.value) || 12)) } }, "Shape text padding updated")} className="mt-1 w-full rounded border px-2 py-1.5" /></label><label className="block font-semibold text-slate-600">Vertical Alignment<select aria-label="Shape vertical alignment" value={typeof selectedShapePayload.verticalAlign === "string" ? selectedShapePayload.verticalAlign : "TOP"} onChange={(event) => patchFrame(selectedShapeFrame.id, { payload: { ...selectedShapePayload, verticalAlign: event.target.value } }, "Shape vertical alignment updated")} className="mt-1 w-full rounded border px-2 py-1.5"><option value="TOP">Top</option><option value="CENTER">Centre</option><option value="BOTTOM">Bottom</option></select></label><p className="text-[11px] text-slate-500">Double-click the shape to edit its text.</p></> : null}
          </div>
        </details> : null}
        {selectedImageFrame ? <details open className="mt-3 rounded-lg border border-amber-200 text-xs">
          <summary className="cursor-pointer px-3 py-2 font-bold text-amber-900">Image Properties</summary>
          <div className="space-y-3 border-t border-amber-100 p-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="font-semibold text-slate-600">Width<input aria-label="Image width" type="number" min="24" value={Math.round(selectedImageFrame.width)} onChange={(event) => resizeImage(selectedImageFrame, "width", Number(event.target.value))} className="mt-1 w-full rounded border px-2 py-1.5" /></label>
              <label className="font-semibold text-slate-600">Height<input aria-label="Image height" type="number" min="24" value={Math.round(selectedImageFrame.height)} onChange={(event) => resizeImage(selectedImageFrame, "height", Number(event.target.value))} className="mt-1 w-full rounded border px-2 py-1.5" /></label>
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={selectedImageFrame.aspectLocked !== false} onChange={(event) => patchImage(selectedImageFrame.id, { aspectLocked: event.target.checked }, "Image aspect lock updated")} />Preserve aspect ratio</label>
            <label className="block font-semibold text-slate-600">Alt Text<input aria-label="Image alt text" value={selectedImageFrame.altText ?? ""} onChange={(event) => patchImage(selectedImageFrame.id, { altText: event.target.value || undefined }, "Image alt text updated")} className="mt-1 w-full rounded border px-2 py-1.5" placeholder="Describe the image" /></label>
            <label className="block font-semibold text-slate-600">Caption<textarea aria-label="Image caption" value={selectedImageFrame.caption ?? ""} onChange={(event) => patchImage(selectedImageFrame.id, { caption: event.target.value || undefined }, "Image caption updated")} rows={2} className="mt-1 w-full resize-y rounded border px-2 py-1.5" placeholder="Optional visible caption" /></label>
            {imageSupportsFlowControls ? <><label className="block font-semibold text-slate-600">Text flow<select aria-label="Image text flow" value={selectedImageFrame.wrapMode === "WRAP_LEFT" || selectedImageFrame.wrapMode === "WRAP_RIGHT" ? selectedImageFrame.wrapMode : "INLINE"} onChange={(event) => { const value = event.target.value as "INLINE" | "WRAP_LEFT" | "WRAP_RIGHT"; patchImage(selectedImageFrame.id, value === "INLINE" ? { layoutMode: "INLINE", wrapMode: "INLINE" } : { layoutMode: "FLOAT", wrapMode: value }, "Image text flow updated"); }} className="mt-1 w-full rounded border px-2 py-1.5"><option value="INLINE">Inline</option><option value="WRAP_LEFT">Wrap Left</option><option value="WRAP_RIGHT">Wrap Right</option></select></label>
            <div><p className="mb-1 font-semibold text-slate-600">Alignment</p><div className="grid grid-cols-3 gap-1">{(["left", "center", "right"] as const).map((alignment) => <button key={alignment} type="button" aria-pressed={(selectedImageFrame.alignment ?? "left") === alignment} onClick={() => alignImage(selectedImageFrame, alignment)} className="rounded border border-amber-200 px-2 py-1 font-semibold capitalize">{alignment === "center" ? "Centre" : alignment}</button>)}</div></div></> : <p className="rounded bg-slate-50 p-2 text-[11px] text-slate-500">Floating page image: position it directly on the page. Flow wrapping and alignment apply only to flow or container images.</p>}
            <div><p className="mb-1 font-semibold text-slate-600">Fit</p><div className="flex gap-1">{(["FIT", "FILL", "CROP"] as const).map((mode) => <button key={mode} type="button" aria-pressed={selectedImageFrame.fitMode === mode} onClick={() => { setCropFrameId(mode === "CROP" ? selectedImageFrame.id : null); patchImage(selectedImageFrame.id, { fitMode: mode }, `${mode} mode selected`); }} className="flex-1 rounded border border-amber-200 px-2 py-1">{mode[0] + mode.slice(1).toLowerCase()}</button>)}</div></div>
            <div className="flex items-center gap-1"><button type="button" aria-label="Zoom image out" onClick={() => patchImage(selectedImageFrame.id, { fitMode: "CROP", zoom: Math.max(V2_IMAGE_ZOOM_MIN, (selectedImageFrame.zoom ?? 1) - 0.25) }, "Image zoom updated")} className="rounded border px-2 py-1">-</button><span className="flex-1 text-center">{(selectedImageFrame.zoom ?? 1).toFixed(2)}·</span><button type="button" aria-label="Zoom image in" onClick={() => patchImage(selectedImageFrame.id, { fitMode: "CROP", zoom: Math.min(V2_IMAGE_ZOOM_MAX, (selectedImageFrame.zoom ?? 1) + 0.25) }, "Image zoom updated")} className="rounded border px-2 py-1">+</button></div>
            <button type="button" onClick={() => { setCropFrameId(null); patchImage(selectedImageFrame.id, { fitMode: "FIT", crop: { x: 0, y: 0, width: 1, height: 1 }, zoom: 1, offsetX: 0, offsetY: 0 }, "Image reset"); }} className="w-full rounded border px-2 py-1">Reset crop</button>
            <select aria-label="Replace Image" value="" onChange={(event) => { if (event.target.value) patchImage(selectedImageFrame.id, { resourceId: event.target.value, fitMode: "FIT", crop: { x: 0, y: 0, width: 1, height: 1 }, zoom: 1, offsetX: 0, offsetY: 0 }, "Image replaced"); }} className="w-full rounded border px-2 py-1.5"><option value="">Replace Image</option>{imageResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.title}</option>)}</select>
            {onUploadResource ? <label className="block cursor-pointer rounded border border-dashed border-amber-300 px-2 py-2 text-center font-semibold text-amber-800">{uploadingResource ? "Uploading..." : "Upload Image"}<input type="file" accept="image/*" className="sr-only" disabled={uploadingResource} onChange={(event) => void handleResourceUpload(event, "IMAGE", selectedImageFrame.id)} /></label> : null}
            <p className="text-[11px] text-slate-500">Delete removes this image frame only. The shared library Image remains available unless separately archived from Resources.</p>
          </div>
        </details> : null}
        {selectedVideoFrame ? <details open className="mt-3 rounded-lg border border-indigo-200 text-xs"><summary className="cursor-pointer px-3 py-2 font-bold text-indigo-900">Video Properties</summary><div className="space-y-3 border-t border-indigo-100 p-3"><div><p className="mb-1 font-semibold text-slate-600">Display</p><div className="flex gap-1"><button type="button" aria-pressed={getV2VideoDisplayMode(selectedVideoFrame) === "PLAYER"} onClick={() => patchFrame(selectedVideoFrame.id, { payload: withV2VideoDisplayMode(selectedVideoFrame, "PLAYER") }, "Video display set to Player")} className="flex-1 rounded border border-indigo-200 bg-white px-2 py-1.5 font-semibold text-indigo-900">Player</button><button type="button" aria-pressed={getV2VideoDisplayMode(selectedVideoFrame) === "BUTTON"} onClick={() => patchFrame(selectedVideoFrame.id, { payload: withV2VideoDisplayMode(selectedVideoFrame, "BUTTON") }, "Video display set to Button")} className="flex-1 rounded border border-indigo-200 bg-white px-2 py-1.5 font-semibold text-indigo-900">Button</button></div></div><label className="block font-semibold text-slate-600">Video label<input aria-label="Video label" value={selectedVideoFrame.narrationLabel ?? ""} onChange={(event) => patchFrame(selectedVideoFrame.id, { narrationLabel: event.target.value || undefined }, "Video label updated")} className="mt-1 w-full rounded border px-2 py-1.5" placeholder="Play Video" /></label><select aria-label="Replace Video" value={selectedVideoFrame.resourceId ?? ""} onChange={(event) => patchFrame(selectedVideoFrame.id, { resourceId: event.target.value || undefined }, "Video replaced")} className="w-full rounded border px-2 py-1.5"><option value="">Choose video</option>{videoResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.title}</option>)}</select>{onUploadResource ? <label className="block cursor-pointer rounded border border-dashed border-indigo-300 px-2 py-2 text-center font-semibold text-indigo-700">{uploadingResource ? "Uploading..." : "Upload Video"}<input type="file" accept="video/*" className="sr-only" disabled={uploadingResource} onChange={(event) => void handleResourceUpload(event, "VIDEO", selectedVideoFrame.id)} /></label> : null}<p className="text-[11px] text-slate-500">Delete removes this video frame only. The shared library resource remains available for other pages.</p></div></details> : null}


        <details className="mt-3 rounded-lg border border-slate-200 text-xs"><summary className="cursor-pointer px-3 py-2 font-bold text-slate-700">Page Properties</summary><div className="space-y-2 border-t border-slate-200 p-3"><p className="font-semibold text-slate-600">Active page {activePageIndex + 1}</p><div className="flex gap-1"><button type="button" onClick={() => moveActivePage(-1)} disabled={activePageIndex === 0} className="rounded border px-2 py-1 disabled:opacity-40">Move up</button><button type="button" onClick={() => moveActivePage(1)} disabled={activeVisibleIndex >= visiblePages.length - 1} className="rounded border px-2 py-1 disabled:opacity-40">Move down</button></div><div className="border-t border-slate-100 pt-2"><span className="font-semibold text-fuchsia-800">Page visual: </span>{activePage.visualMode === "EXACT_REPLICA" ? <><span>Exact Replica</span><button type="button" onClick={() => onDocumentChange({ ...document, pageLayout: setV2PageVisualMode(layout, activePage.id, "EDITABLE") }, "Page switched to Editable; replica source preserved")} className="ml-2 rounded border px-2 py-1">View as Editable</button></> : activePage.replica?.resourceId ? <button type="button" onClick={() => onDocumentChange({ ...document, pageLayout: setV2PageVisualMode(layout, activePage.id, "EXACT_REPLICA") }, "Page switched to Exact Replica; semantic frames preserved")} className="rounded border px-2 py-1">Use Replica</button> : <span>Editable</span>}</div></div></details>
        <details open className="mt-3 rounded-lg border border-slate-200 text-xs">
          <summary className="cursor-pointer px-3 py-2 font-bold text-slate-700">Page Objects</summary>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto border-t border-slate-200 p-2">
            {activePage ? <div key={activePage.id}><p className="font-bold text-slate-700">Page {activePageIndex + 1}</p>{[...activePage.frames].sort((left, right) => left.zIndex - right.zIndex).map((frame) => <button key={frame.id} type="button" onClick={() => { setSelectedFrameId(frame.id); setActiveTextFrameId(frame.type === "TEXT" ? frame.id : null); }} className={selectedFrameId === frame.id ? "mt-1 block max-w-full truncate rounded px-2 py-1 text-left bg-indigo-100 font-bold text-indigo-800" : "mt-1 block max-w-full truncate rounded px-2 py-1 text-left text-slate-600 hover:bg-slate-50"}>{frame.narrationLabel || frame.type}</button>)}</div> : null}
          </div>
        </details>
      </aside>
      </div>
    </div>
  );
}

function layerLabel(layer: LayoutV2Frame["layer"]) {
  return layer[0] + layer.slice(1).toLowerCase();
}

function formatV2ResourceSize(value: string) {
  const size = Number(value);
  if (!Number.isFinite(size) || size < 1) return null;
  if (size < 1024 * 1024) return String(Math.ceil(size / 1024)) + " KB";
  return (size / (1024 * 1024)).toFixed(1) + " MB";
}

function V2ImageResourceChoice({ resource, onUse }: { resource: ResourceOption; onUse: () => void }) {
  const previewUrl = `/api/admin/resources/${encodeURIComponent(resource.id)}/preview`;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:border-indigo-300 hover:bg-indigo-50">
      <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded bg-slate-100"><ProtectedResourceThumbnail src={previewUrl} className="h-full w-full object-contain" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{resource.title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{[resource.mimeType, resource.fileSizeBytes ? formatV2ResourceSize(resource.fileSizeBytes) : null].filter(Boolean).join(" · ") || "Image resource"}</p>
        <div className="mt-1 flex gap-2 text-xs font-bold">
          <a href={previewUrl} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-slate-900">Preview</a>
          <button type="button" onClick={onUse} className="text-indigo-700 hover:text-indigo-900">Use Image</button>
        </div>
      </div>
    </div>
  );
}

function findV2FrameRecord(layout: NonNullable<ContentDocument["pageLayout"]>, frameId: string) {
  for (const page of layout.pages) {
    const frame = getV2Frame(layout, page.id, frameId);
    if (frame) {
      const parent = page.frames.find((entry) => entry.children?.some((child) => child.id === frameId));
      return { frame, pageId: page.id, parentId: parent?.id };
    }
  }
  return undefined;
}

function renderV2Frame(
  frame: LayoutV2Frame,
  frames: LayoutV2Frame[],
  pageWidth: number,
  pageHeight: number,
  blocks: ContentBlock[],
  renderBlock: (block: ContentBlock) => ReactNode,
  onFrameTextChange: (frame: LayoutV2Frame, value: string, spans?: V2TextLayoutSpan[], patch?: V2TextFramePatch) => void,
  cropMode: boolean,
  scale: number,
  semanticOverlay: boolean,
  onPatch: (patch: Partial<LayoutV2Frame>, message: string) => void,
  onEnterCrop: () => void,
  onEditAssessmentLauncher?: (frame: LayoutV2Frame) => void,
  onEditWorksheetLauncher?: (frame: LayoutV2Frame) => void,
) {
  if (frame.renderMode === "SEMANTIC_ONLY" && semanticOverlay) {
    return <div data-v2-semantic-overlay="true" className="h-full w-full border border-dashed border-fuchsia-500/80 bg-fuchsia-200/10 p-1 text-[10px] font-bold text-fuchsia-700">{frame.type}</div>;
  }
  const block = frame.contentRef?.blockId ? blocks.find((entry) => entry.id === frame.contentRef?.blockId) : undefined;
  if (frame.type === "TEXT") {
    return <V2TextFrame frame={frame} block={block} frames={frames} pageWidth={pageWidth} pageHeight={pageHeight} onTextChange={(value, spans, patch) => onFrameTextChange(frame, value, spans, patch)} />;
  }

  if (frame.type === "IMAGE") return <V2ImageFrame frame={frame} block={block} cropMode={cropMode} scale={scale} onPatch={onPatch} onEnterCrop={onEnterCrop} />;
  if (frame.type === "ASSESSMENT_LAUNCHER") {
    return (
      <V2AssessmentLauncherVisual
        frame={frame}
        openable
        mode="PREVIEW"
        adminControls
        onEdit={() => onEditAssessmentLauncher?.(frame)}
      />
    );
  }
  if (getV2WorksheetLauncherPayload(frame)) {
    return (
      <V2WorksheetLauncherVisual
        frame={frame}
        openable
        mode="PREVIEW"
        adminControls
        onEdit={() => onEditWorksheetLauncher?.(frame)}
      />
    );
  }
  if (frame.type === "SHAPE" || frame.type === "VIDEO" || frame.type === "TABLE" || block) {
    return <V2FrameContent frame={frame} frames={frames} block={block} pageWidth={pageWidth} pageHeight={pageHeight} resourceUrlResolver={(resourceId) => `/api/admin/resources/${encodeURIComponent(resourceId)}/preview`} renderBlock={renderBlock} onPayloadChange={(payload) => onPatch?.({ payload }, "Table updated")} />;
  }
  return <V2FrameContent frame={frame} frames={frames} pageWidth={pageWidth} pageHeight={pageHeight} resourceUrlResolver={(resourceId) => `/api/admin/resources/${encodeURIComponent(resourceId)}/preview`} />;
}

function V2ImageFrame({
  frame,
  block,
  cropMode,
  scale,
  onPatch,
  onEnterCrop,
}: {
  frame: LayoutV2Frame;
  block?: ContentBlock;
  cropMode: boolean;
  scale: number;
  onPatch: (patch: Partial<LayoutV2Frame>, message: string) => void;
  onEnterCrop: () => void;
}) {
  const resourceId = frame.resourceId ?? frame.contentRef?.resourceId ?? (block && "resourceId" in block ? block.resourceId : undefined);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [draftOffset, setDraftOffset] = useState<{ x: number; y: number } | null>(null);
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
  // Shared V2ImageVisual owns FIT/FILL/CROP rendering via getV2CropImagePercentages, object-contain, and object-cover.
  const transform = normalizeV2ImageTransform({ crop: frame.crop, zoom: frame.zoom, offsetX: draftOffset?.x ?? frame.offsetX, offsetY: draftOffset?.y ?? frame.offsetY });
  if (!resourceId) return <div className="flex h-full w-full items-center justify-center bg-slate-50 text-xs font-semibold text-slate-400">Image resource unavailable</div>;
  if (failed) return <div className="flex h-full w-full items-center justify-center bg-slate-50 p-3 text-center text-xs font-semibold text-slate-500">Image unavailable</div>;
  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    if (!cropMode) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, offsetX: transform.offsetX, offsetY: transform.offsetY };
  };
  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    setDraftOffset({ x: Math.max(-1, Math.min(1, pan.offsetX + (event.clientX - pan.startX) / Math.max(1, frame.width * scale))), y: Math.max(-1, Math.min(1, pan.offsetY + (event.clientY - pan.startY) / Math.max(1, frame.height * scale))) });
  };
  const endPan = (event: PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const next = draftOffset ?? { x: pan.offsetX, y: pan.offsetY };
    onPatch({ offsetX: next.x, offsetY: next.y }, "Image position saved");
    panRef.current = null;
    setDraftOffset(null);
  };
  return (
    <div className={`relative h-full w-full overflow-hidden bg-slate-100 ${cropMode ? "cursor-grab ring-2 ring-amber-400 ring-inset" : ""}`} onDoubleClick={onEnterCrop} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} tabIndex={cropMode ? 0 : -1} onKeyDown={(event) => { if (!cropMode) return; const step = event.shiftKey ? 0.05 : 0.01; const delta = event.key === "ArrowLeft" ? { x: -step, y: 0 } : event.key === "ArrowRight" ? { x: step, y: 0 } : event.key === "ArrowUp" ? { x: 0, y: -step } : event.key === "ArrowDown" ? { x: 0, y: step } : null; if (!delta) return; event.preventDefault(); onPatch({ offsetX: Math.max(-1, Math.min(1, transform.offsetX + delta.x)), offsetY: Math.max(-1, Math.min(1, transform.offsetY + delta.y)) }, "Image position saved"); }}>
      <V2ImageVisual frame={{ ...frame, offsetX: draftOffset?.x ?? frame.offsetX, offsetY: draftOffset?.y ?? frame.offsetY }} src={`/api/admin/resources/${encodeURIComponent(resourceId)}/preview`} alt={frame.altText ?? frame.narrationLabel ?? ""} loaded={loaded} failed={failed} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
    </div>
  );
}