"use client";

import type { CSSProperties, ReactNode } from "react";
import { useV2NarrationContext } from "@/components/content/V2NarrationProvider";
import type { NarrationSegment } from "@/lib/content-narration";
import StructuredContentRenderer from "@/components/content/StructuredContentRenderer";
import V2FrameContent from "@/components/content/v2/V2FrameContent";
import type { ContentRenderMode } from "@/lib/content-audience";
import { normalizeContentDocument, type ContentBlock, type ContentDocument } from "@/lib/content-document";
import { getContentLayoutVersion, type LayoutV2Frame } from "@/lib/content-layout-v2";
import { V2_LAYER_ORDER, sortV2Frames } from "@/lib/content-layout-v2-rendering";
import type { KnowledgeDefinitionSummary } from "@/lib/content-knowledge-types";
import type { ContentSectionDefinitionSummary, ResolvedLinkedAsset } from "@/lib/content-linked-asset-types";
import type { ResolvedMediaBlock } from "@/lib/content-media-types";
import type { ResolvedActivityBlock } from "@/lib/activity-studio-types";
import type { ResolvedWorksheetBlock } from "@/lib/worksheet-studio-types";
import { useEffect, useMemo, useRef, useState } from "react";

export type StudentWorkFrameOverlayArgs = { frame: LayoutV2Frame; page: NonNullable<ContentDocument["pageLayout"]>["pages"][number]; pageNumber: number; block?: ContentBlock; semanticOnly: boolean };
export type StudentWorkPageActionsArgs = { page: NonNullable<ContentDocument["pageLayout"]>["pages"][number]; pageNumber: number };
export type StudentWorkHighlightTarget = { pageId: string; frameId: string; childFrameId?: string };

export default function V2ContentDocumentRenderer({
  document,
  mode,
  className = "",
  linkedAssets = {},
  activities = {},
  worksheets = {},
  media = {},
  sectionDefinitions = [],
  knowledgeDefinitions = {},
  resourceUrls = {},
  semanticOverlay = false,
  studentWorkOverlay,
  studentWorkPageActions,
  studentWorkHighlights = [],
  pageNumberOffset = 0,
  assessmentPreview = false,
}: {
  document: ContentDocument;
  mode: ContentRenderMode;
  className?: string;
  linkedAssets?: Record<string, ResolvedLinkedAsset | null>;
  activities?: Record<string, ResolvedActivityBlock>;
  worksheets?: Record<string, ResolvedWorksheetBlock>;
  media?: Record<string, ResolvedMediaBlock | null>;
  sectionDefinitions?: ContentSectionDefinitionSummary[];
  knowledgeDefinitions?: Record<string, KnowledgeDefinitionSummary | null>;
  resourceUrls?: Record<string, string>;
  semanticOverlay?: boolean;
  studentWorkOverlay?: (input: StudentWorkFrameOverlayArgs) => ReactNode;
  studentWorkPageActions?: (input: StudentWorkPageActionsArgs) => ReactNode;
  studentWorkHighlights?: StudentWorkHighlightTarget[];
  pageNumberOffset?: number;
  assessmentPreview?: boolean;
}) {
  if (getContentLayoutVersion(document) !== 2) {
    return <StructuredContentRenderer document={document} mode={mode} className={className} linkedAssets={linkedAssets} activities={activities} worksheets={worksheets} media={media} sectionDefinitions={sectionDefinitions} knowledgeDefinitions={knowledgeDefinitions} />;
  }
  return <V2DeliveryDocument document={document} mode={mode} className={className} linkedAssets={linkedAssets} activities={activities} worksheets={worksheets} media={media} sectionDefinitions={sectionDefinitions} knowledgeDefinitions={knowledgeDefinitions} resourceUrls={resourceUrls} semanticOverlay={semanticOverlay} studentWorkOverlay={studentWorkOverlay} studentWorkPageActions={studentWorkPageActions} studentWorkHighlights={studentWorkHighlights} pageNumberOffset={pageNumberOffset} assessmentPreview={assessmentPreview} />;
}

function V2DeliveryDocument({ document, mode, className, linkedAssets, activities, worksheets, media, sectionDefinitions, knowledgeDefinitions, resourceUrls, semanticOverlay, studentWorkOverlay, studentWorkPageActions, studentWorkHighlights, pageNumberOffset, assessmentPreview }: {
  document: ContentDocument;
  mode: ContentRenderMode;
  className: string;
  linkedAssets: Record<string, ResolvedLinkedAsset | null>;
  activities: Record<string, ResolvedActivityBlock>;
  worksheets: Record<string, ResolvedWorksheetBlock>;
  media: Record<string, ResolvedMediaBlock | null>;
  sectionDefinitions: ContentSectionDefinitionSummary[];
  knowledgeDefinitions: Record<string, KnowledgeDefinitionSummary | null>;
  resourceUrls: Record<string, string>;
  semanticOverlay: boolean;
  studentWorkOverlay?: (input: StudentWorkFrameOverlayArgs) => ReactNode;
  studentWorkPageActions?: (input: StudentWorkPageActionsArgs) => ReactNode;
  studentWorkHighlights: StudentWorkHighlightTarget[];
  pageNumberOffset: number;
  assessmentPreview: boolean;
  activeSegment?: NarrationSegment;
}) {
  const normalized = useMemo(() => normalizeContentDocument(document), [document]);
  const blocksById = useMemo(() => new Map(normalized.blocks.map((block) => [block.id, block])), [normalized.blocks]);
  const narration = useV2NarrationContext();
  const activeSegment = narration?.manifest.segments.find((segment) => segment.id === narration.activeSegmentId);
  const layout = normalized.pageLayout;
  if (!layout) return null;
  return (
    <div className={`min-w-0 max-w-full space-y-8 ${className}`} data-v2-delivery-renderer="true">
      {layout.pages.map((page, index) => (
        <V2DeliveryPage
          key={page.id}
          page={page}
          pageNumber={index + 1 + pageNumberOffset}
          blocksById={blocksById}
          resourceUrls={resourceUrls}
          mode={mode}
          semanticOverlay={semanticOverlay}
          renderBlock={(block) => <StructuredContentRenderer document={{ ...normalized, blocks: [block] }} mode={mode} linkedAssets={linkedAssets} activities={activities} worksheets={worksheets} media={media} sectionDefinitions={sectionDefinitions} knowledgeDefinitions={knowledgeDefinitions} />} activeSegment={activeSegment} studentWorkOverlay={studentWorkOverlay} studentWorkPageActions={studentWorkPageActions} studentWorkHighlights={studentWorkHighlights} assessmentPreview={assessmentPreview}
        />
      ))}
    </div>
  );
}

type V2Page = NonNullable<ContentDocument["pageLayout"]>["pages"][number];

function V2DeliveryPage({ page, pageNumber, blocksById, resourceUrls, renderBlock, mode, semanticOverlay, activeSegment, studentWorkOverlay, studentWorkPageActions, studentWorkHighlights, assessmentPreview }: {
  page: V2Page;
  pageNumber: number;
  blocksById: Map<string, ContentBlock>;
  resourceUrls: Record<string, string>;
  renderBlock: (block: ContentBlock) => ReactNode;
  mode: ContentRenderMode;
  semanticOverlay: boolean;
  studentWorkOverlay?: (input: StudentWorkFrameOverlayArgs) => ReactNode;
  studentWorkPageActions?: (input: StudentWorkPageActionsArgs) => ReactNode;
  studentWorkHighlights: StudentWorkHighlightTarget[];
  assessmentPreview: boolean;
  activeSegment?: NarrationSegment;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const update = () => setScale(Math.min(1, Math.max(0.1, (host.clientWidth - 24) / page.width)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [page.width]);
  const frames = useMemo(() => sortV2Frames(page.frames), [page.frames]);
  const replicaUrl = page.replica?.resourceId ? resourceUrls[page.replica.resourceId] : undefined;
  return (
    <section id={`page-${encodeURIComponent(page.id)}`} className="scroll-mt-6 space-y-2" aria-label={`Page ${pageNumber}`} data-v2-delivery-page-id={page.id} data-v2-visual-mode={page.visualMode ?? "EDITABLE"}>
      <div className="flex items-center gap-2 px-1 text-xs font-semibold text-slate-500">
        <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-700">Page {pageNumber}</span>
        <span>{page.width} × {page.height} {page.unit}</span>
        {page.visualMode === "EXACT_REPLICA" ? <span className="rounded-full bg-fuchsia-100 px-2 py-1 text-fuchsia-700">Exact Replica</span> : null}{studentWorkPageActions?.({ page, pageNumber })}
      </div>
      <div ref={hostRef} className="relative flex justify-center overflow-hidden bg-slate-300/70 p-3" style={{ height: page.height * scale + 24 }}>
        <div className="relative shrink-0 overflow-hidden border border-slate-300 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.18)]" style={{ width: page.width * scale, height: page.height * scale }}>
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: page.width, height: page.height, transform: `scale(${scale})`, backgroundColor: safeColor(page.background?.color) }}>
            {page.background?.resourceId && resourceUrls[page.background.resourceId] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resourceUrls[page.background.resourceId]} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
            ) : null}
            {page.visualMode === "EXACT_REPLICA" && replicaUrl ? <ReplicaVisual page={page} src={replicaUrl} /> : null}
            {frames.map((frame) => (
              <V2DeliveryFrame key={frame.id} frame={frame} page={page} pageNumber={pageNumber} frames={frames} blocksById={blocksById} pageWidth={page.width} pageHeight={page.height} resourceUrls={resourceUrls} renderBlock={renderBlock} mode={mode} semanticOverlay={semanticOverlay} activeSegment={activeSegment} studentWorkOverlay={studentWorkOverlay} studentWorkHighlights={studentWorkHighlights} assessmentPreview={assessmentPreview} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function V2DeliveryFrame({ frame, page, pageNumber, frames, blocksById, pageWidth, pageHeight, resourceUrls, renderBlock, mode, semanticOverlay, activeSegment, studentWorkOverlay, studentWorkHighlights, assessmentPreview }: {
  frame: LayoutV2Frame;
  page: V2Page;
  pageNumber: number;
  frames: LayoutV2Frame[];
  blocksById: Map<string, ContentBlock>;
  pageWidth: number;
  pageHeight: number;
  resourceUrls: Record<string, string>;
  renderBlock: (block: ContentBlock) => ReactNode;
  mode: ContentRenderMode;
  semanticOverlay: boolean;
  studentWorkOverlay?: (input: StudentWorkFrameOverlayArgs) => ReactNode;
  studentWorkPageActions?: (input: StudentWorkPageActionsArgs) => ReactNode;
  studentWorkHighlights: StudentWorkHighlightTarget[];
  assessmentPreview: boolean;
  activeSegment?: NarrationSegment;
}) {
  if (frame.audience === "TEACHER" && mode === "STUDENT") return null;
  if (frame.audience === "STUDENT" && mode === "TEACHER") return null;
  const block = frame.contentRef?.blockId ? blocksById.get(frame.contentRef.blockId) : undefined;
  const visualFrames = frame.type === "EDUCATIONAL" || frame.type === "TEXT" && frame.children?.length ? frame.children ?? [] : frames;
  const effectiveZIndex = V2_LAYER_ORDER[frame.layer] * 100000 + frame.zIndex;
  const semanticOnly = frame.renderMode === "SEMANTIC_ONLY";
  const narrationActive = Boolean(activeSegment && (activeSegment.frameId === frame.id || activeSegment.childFrameId === frame.id));
  const studentHighlight = studentWorkHighlights.some((target) => target.pageId === page.id && target.frameId === frame.id && (!target.childFrameId || target.childFrameId === frame.parentId));
  const studentOverlay = studentWorkOverlay?.({ frame, page, pageNumber, block, semanticOnly });
  if (semanticOnly && semanticOverlay) {
    return <div data-v2-delivery-frame-id={frame.id} data-v2-semantic-overlay="true" aria-label={`${frame.narrationLabel || frame.type} semantic overlay`} className="absolute box-border border border-dashed border-fuchsia-500/80 bg-fuchsia-200/10 text-[10px] font-bold text-fuchsia-700" style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height, zIndex: effectiveZIndex, transform: frame.rotation ? `rotate(${frame.rotation}deg)` : undefined }}><span className="rounded bg-white/90 px-1">{frame.type}</span></div>;
  }
  if (semanticOnly && narrationActive && !semanticOverlay) {
    return (
      <>
        {studentHighlight ? <div data-student-highlight="true" aria-label="Your highlight" className="pointer-events-none absolute rounded border-2 border-yellow-400 bg-yellow-200/25" style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height, zIndex: effectiveZIndex + 2 }} /> : null}
        <div data-v2-narration-highlight="true" aria-label="Currently reading" className="pointer-events-none absolute box-border rounded border-2 border-amber-400 bg-amber-200/20" style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height, zIndex: effectiveZIndex + 1, transform: frame.rotation ? "rotate(" + frame.rotation + "deg)" : undefined }} />
        <div className="sr-only" data-v2-delivery-frame-id={frame.id} data-v2-reading-order={frame.readingOrder} data-v2-render-mode={frame.renderMode ?? "VISIBLE"} aria-label={frame.narrationLabel || frame.type + " frame"}>
          <V2FrameContent frame={frame} frames={visualFrames} block={block} pageWidth={pageWidth} pageHeight={pageHeight} resourceUrlResolver={(resourceId) => resourceUrls[resourceId] ?? null} renderBlock={renderBlock} videoPresentation={assessmentPreview ? "PREVIEW" : "DELIVERY"} renderFrame={(child, childFrames) => <V2DeliveryFrame frame={child} page={page} pageNumber={pageNumber} frames={childFrames} blocksById={blocksById} pageWidth={frame.width} pageHeight={frame.height} resourceUrls={resourceUrls} renderBlock={renderBlock} mode={mode} semanticOverlay={semanticOverlay} activeSegment={activeSegment} studentWorkOverlay={studentWorkOverlay} studentWorkHighlights={studentWorkHighlights} assessmentPreview={assessmentPreview} />} />
        </div>
      </>
    );
  }
  const semanticStyle: CSSProperties = semanticOnly ? { position: "absolute", width: 1, height: 1, margin: -1, padding: 0, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" } : {};
  return (
    <div data-v2-delivery-frame-id={frame.id} data-v2-reading-order={frame.readingOrder} data-v2-render-mode={frame.renderMode ?? "VISIBLE"} data-v2-narration-active={narrationActive ? "true" : undefined} aria-label={frame.narrationLabel || `${frame.type} frame`} aria-hidden={frame.readable ? undefined : true} className={`absolute box-border overflow-hidden ${semanticOnly ? "pointer-events-none" : ""}`} style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height, zIndex: effectiveZIndex, transform: frame.rotation ? `rotate(${frame.rotation}deg)` : undefined, visibility: frame.hidden ? "hidden" : "visible", outline: narrationActive ? "3px solid rgba(245, 158, 11, 0.9)" : undefined, outlineOffset: narrationActive ? 2 : undefined, ...semanticStyle }}>
      <V2FrameContent frame={frame} frames={visualFrames} block={block} pageWidth={pageWidth} pageHeight={pageHeight} resourceUrlResolver={(resourceId) => resourceUrls[resourceId] ?? null} renderBlock={renderBlock} videoPresentation={assessmentPreview ? "PREVIEW" : "DELIVERY"} renderFrame={(child, childFrames) => <V2DeliveryFrame frame={child} page={page} pageNumber={pageNumber} frames={childFrames} blocksById={blocksById} pageWidth={frame.width} pageHeight={frame.height} resourceUrls={resourceUrls} renderBlock={renderBlock} mode={mode} semanticOverlay={semanticOverlay} activeSegment={activeSegment} studentWorkOverlay={studentWorkOverlay} studentWorkHighlights={studentWorkHighlights} assessmentPreview={assessmentPreview} />} />
       {studentOverlay ? <div className="pointer-events-auto absolute inset-x-1 bottom-1 z-30 max-h-[58%] overflow-auto rounded-xl border border-blue-200 bg-white/95 p-2 shadow-lg backdrop-blur-sm">{studentOverlay}</div> : null}
       {studentHighlight ? <div data-student-highlight="true" aria-label="Your highlight" className="pointer-events-none absolute inset-0 rounded border-2 border-yellow-400 bg-yellow-200/25" /> : null}
    </div>
  );
}

function ReplicaVisual({ page, src }: { page: V2Page; src: string }) {
  if (page.replica?.sourceKind === "PDF") return <iframe title="Reference page visual" src={`${src}#page=${page.replica.sourcePageNumber ?? page.order + 1}&toolbar=0&navpanes=0&scrollbar=0`} sandbox="allow-same-origin" referrerPolicy="no-referrer" className="pointer-events-none absolute inset-0 h-full w-full border-0" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />;
}

function safeColor(value: string | undefined) {
  return value && /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim()) ? value.trim() : "#ffffff";
}
