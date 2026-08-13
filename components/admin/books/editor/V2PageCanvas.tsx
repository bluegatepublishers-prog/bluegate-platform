"use client";

import { useMemo, useState } from "react";
import type { PointerEvent, ReactNode } from "react";

import PdfPageBackground from "@/components/admin/books/editor/PdfPageBackground";
import V2EducationalFrame from "@/components/admin/books/editor/V2EducationalFrame";
import V2Frame from "@/components/admin/books/editor/V2Frame";
import V2TextContainerFrame from "@/components/admin/books/editor/V2TextContainerFrame";
import type { ContentBlock } from "@/lib/content-document";
import { getV2InlineFrameGeometry } from "@/lib/content-layout-v2-text";
import { V2_LAYER_ORDER, sortV2Frames } from "@/lib/content-layout-v2-rendering";
import { isV2MainFlowFrame } from "@/lib/content-layout-v2";
import type { LayoutV2Frame, LayoutV2FrameGeometry, LayoutV2Page } from "@/lib/content-layout-v2";

type Props = {
  page: LayoutV2Page;
  scale: number;
  selectedFrameId: string | null;
  pageNumber: number;
  blocks?: ContentBlock[];
  renderFrame: (frame: LayoutV2Frame, frames: LayoutV2Frame[]) => ReactNode;
  onSelectFrame: (frameId: string) => void;
  onClearSelection: () => void;
  onSetInsertionPoint?: (point: { x: number; y: number }) => void;
  insertionPoint?: { x: number; y: number };
  onCommitGeometry: (frameId: string, geometry: LayoutV2FrameGeometry, parentId?: string) => void;
  onDeleteFrame?: (frameId: string, parentId?: string) => void;
  onDropFrame?: (frameId: string, containerId: string) => void;
  semanticOverlay?: boolean;
  showGuides?: boolean;
  onActivateMainFlow?: (frameId: string) => void;
  onPatchFrame?: (frameId: string, patch: Partial<LayoutV2Frame>, message: string) => void;
  onBlockChange?: (block: ContentBlock) => void;
  renderEducationalPreview?: (frame: LayoutV2Frame) => ReactNode;
  pdfUrl?: string;
  pdfBackgroundActive?: boolean;
};

export default function V2PageCanvas({ page, scale, selectedFrameId, pageNumber, blocks = [], renderFrame, onSelectFrame, onClearSelection, onSetInsertionPoint, insertionPoint, onCommitGeometry, onDeleteFrame, onDropFrame, semanticOverlay = false, showGuides = false, onActivateMainFlow, onPatchFrame, onBlockChange, renderEducationalPreview, pdfUrl, pdfBackgroundActive = false }: Props) {
  const [draftGeometryById, setDraftGeometryById] = useState<Record<string, LayoutV2FrameGeometry>>({});
  const frames = useMemo(() => sortV2Frames(page.frames), [page.frames]);
  const visualFrames = frames.filter((frame) => semanticOverlay || frame.renderMode !== "SEMANTIC_ONLY").map((frame) => {
    const draftFrame = draftGeometryById[frame.id] ? { ...frame, ...draftGeometryById[frame.id] } : frame;
    return { ...draftFrame, ...getV2InlineFrameGeometry(draftFrame, frames, page.width, page.height) };
  });

  return (
    <section className="space-y-2" aria-label={`Page ${pageNumber}`} data-page-id={page.id}>
      <div className="flex items-center gap-2 px-1 text-xs font-semibold text-slate-500">
        <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-700">Page {pageNumber}</span>
        <span>{page.width} × {page.height} {page.unit}</span>
        <span className="text-slate-400">{page.frames.length} frame{page.frames.length === 1 ? "" : "s"}</span>{page.visualMode === "EXACT_REPLICA" ? <span className="rounded-full bg-fuchsia-100 px-2 py-1 text-fuchsia-700">Replica</span> : null}
      </div>
      <div className="relative shrink-0 bg-slate-300/70 p-3 shadow-sm" style={{ width: page.width * scale + 24, height: page.height * scale + 24 }}>
        <div className="relative overflow-hidden border border-slate-300 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.18)]" style={{ width: page.width * scale, height: page.height * scale }}>
          <div onPointerDown={(event: PointerEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); onClearSelection(); onSetInsertionPoint?.({ x: Math.max(0, Math.min(page.width, (event.clientX - bounds.left) / Math.max(0.01, scale))), y: Math.max(0, Math.min(page.height, (event.clientY - bounds.top) / Math.max(0.01, scale))) }); } }} className="absolute left-0 top-0 origin-top-left" style={{ width: page.width, height: page.height, transform: `scale(${scale})`, backgroundColor: safeColor(page.background?.color) ?? "#ffffff" }}>
            {page.background?.resourceId ? <img src={`/api/admin/resources/${encodeURIComponent(page.background.resourceId)}/preview`} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover" /> : null}
            {page.pdfBackground?.source === "BOOK_FULL_PDF" && pdfUrl ? <PdfPageBackground pdfUrl={pdfUrl} pageNumber={page.pdfBackground.pageNumber} pageWidth={page.width} pageHeight={page.height} active={pdfBackgroundActive} /> : null}
            {showGuides ? <div data-v2-page-guides className="pointer-events-none absolute z-[999998] border border-dashed border-cyan-500/70" style={{ inset: Math.min(48, Math.max(24, Math.min(page.width, page.height) * 0.06)) }} /> : null}
            {insertionPoint ? <span data-v2-insertion-point className="pointer-events-none absolute z-[999999] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-600 bg-white shadow" style={{ left: insertionPoint.x, top: insertionPoint.y }} /> : null}
            {page.visualMode === "EXACT_REPLICA" && page.replica?.resourceId ? page.replica.sourceKind === "PDF" ? <iframe title="Reference page visual" src={`/api/admin/resources/${encodeURIComponent(page.replica.resourceId)}/preview#page=${page.replica.sourcePageNumber ?? page.order + 1}`} sandbox="allow-same-origin" className="pointer-events-none absolute inset-0 h-full w-full border-0" /> : <img src={`/api/admin/resources/${encodeURIComponent(page.replica.resourceId)}/preview`} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-contain" /> : null}
            {visualFrames.map((frame) => isV2MainFlowFrame(frame) ? (
              <div key={frame.id} data-v2-main-flow data-v2-main-flow-id={frame.id} className="absolute overflow-hidden" style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height, zIndex: V2_LAYER_ORDER[frame.layer] * 100000 + frame.zIndex, writingMode: "horizontal-tb" }} onPointerDown={() => onActivateMainFlow?.(frame.id)} onFocusCapture={() => onActivateMainFlow?.(frame.id)}>{renderFrame(frame, visualFrames)}</div>
            ) : (
              <V2Frame key={frame.id} frame={{ ...frame, zIndex: V2_LAYER_ORDER[frame.layer] * 100000 + frame.zIndex }} pageWidth={page.width} pageHeight={page.height} scale={scale} selected={selectedFrameId === frame.id} onSelect={onSelectFrame} onCommitGeometry={onCommitGeometry} onDelete={onDeleteFrame} onDraftGeometryChange={(frameId, geometry) => setDraftGeometryById((current) => { if (!geometry) { const next = { ...current }; delete next[frameId]; return next; } return { ...current, [frameId]: geometry }; })} renderChildren={(visualFrame) => visualFrame.type === "EDUCATIONAL" ? <V2EducationalFrame frame={visualFrame} block={visualFrame.contentRef?.blockId ? blocks.find((entry) => entry.id === visualFrame.contentRef?.blockId) : undefined} scale={scale} selectedFrameId={selectedFrameId} renderFrame={(child, children) => renderFrame(child, children)} onSelectFrame={onSelectFrame} onCommitGeometry={onCommitGeometry} onDeleteFrame={onDeleteFrame} onDraftGeometryChange={(frameId, geometry) => setDraftGeometryById((current) => { if (!geometry) { const next = { ...current }; delete next[frameId]; return next; } return { ...current, [frameId]: geometry }; })} onDropFrame={onDropFrame} onPayloadChange={(frameId, payload) => onPatchFrame?.(frameId, { payload }, "Educational Block body updated")} onBlockChange={onBlockChange} previewContent={renderEducationalPreview?.(visualFrame)} /> : visualFrame.type === "TEXT" && visualFrame.children?.length ? <V2TextContainerFrame frame={visualFrame} scale={scale} selectedFrameId={selectedFrameId} renderFrame={(child, children) => renderFrame(child, children)} onSelectFrame={onSelectFrame} onCommitGeometry={onCommitGeometry} onDeleteFrame={onDeleteFrame} onDraftGeometryChange={(frameId, geometry) => setDraftGeometryById((current) => { if (!geometry) { const next = { ...current }; delete next[frameId]; return next; } return { ...current, [frameId]: geometry }; })} onDropFrame={onDropFrame} /> : renderFrame(visualFrame, visualFrames)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function safeColor(value: string | undefined) {
  if (!value) return undefined;
  return /^(?:#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8}))$/i.test(value.trim()) ? value.trim() : undefined;
}
