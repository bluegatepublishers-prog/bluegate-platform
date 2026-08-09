"use client";

import { useMemo, useState } from "react";
import type { PointerEvent, ReactNode } from "react";

import V2EducationalFrame from "@/components/admin/books/editor/V2EducationalFrame";
import V2Frame from "@/components/admin/books/editor/V2Frame";
import { getV2InlineFrameGeometry } from "@/lib/content-layout-v2-text";
import { V2_LAYER_ORDER, sortV2Frames } from "@/lib/content-layout-v2-rendering";
import type {
  LayoutV2Frame,
  LayoutV2FrameGeometry,
  LayoutV2Page,
} from "@/lib/content-layout-v2";

type Props = {
  page: LayoutV2Page;
  scale: number;
  selectedFrameId: string | null;
  pageNumber: number;
  renderFrame: (frame: LayoutV2Frame, frames: LayoutV2Frame[]) => ReactNode;
  onSelectFrame: (frameId: string) => void;
  onClearSelection: () => void;
  onCommitGeometry: (frameId: string, geometry: LayoutV2FrameGeometry, parentId?: string) => void;
  onDropFrame?: (frameId: string, containerId: string) => void;
  semanticOverlay?: boolean;
};

export default function V2PageCanvas({
  page,
  scale,
  selectedFrameId,
  pageNumber,
  renderFrame,
  onSelectFrame,
  onClearSelection,
  onCommitGeometry,
  onDropFrame,
  semanticOverlay = false,
}: Props) {
  const [draftGeometryById, setDraftGeometryById] = useState<Record<string, LayoutV2FrameGeometry>>({});
  const frames = useMemo(
    () => sortV2Frames(page.frames),
    [page.frames],
  );
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

      <div
        className="relative shrink-0 bg-slate-300/70 p-3 shadow-sm"
        style={{ width: page.width * scale + 24, height: page.height * scale + 24 }}
      >
        <div
          className="relative overflow-hidden border border-slate-300 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.18)]"
          style={{ width: page.width * scale, height: page.height * scale }}
        >
          <div
            onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
              if (event.target === event.currentTarget) onClearSelection();
            }}
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: page.width,
              height: page.height,
              transform: `scale(${scale})`,
              backgroundColor: safeColor(page.background?.color) ?? "#ffffff",
            }}
          >
            {page.background?.resourceId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/admin/resources/${encodeURIComponent(page.background.resourceId)}/preview`}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            {page.visualMode === "EXACT_REPLICA" && page.replica?.resourceId ? page.replica.sourceKind === "PDF" ? <iframe title="Reference page visual" src={`/api/admin/resources/${encodeURIComponent(page.replica.resourceId)}/preview#page=${page.replica.sourcePageNumber ?? page.order + 1}`} sandbox="allow-same-origin" className="pointer-events-none absolute inset-0 h-full w-full border-0" /> : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/admin/resources/${encodeURIComponent(page.replica.resourceId)}/preview`} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
            ) : null}

            {visualFrames.map((frame) => (
              <V2Frame
                key={frame.id}
                frame={{ ...frame, zIndex: V2_LAYER_ORDER[frame.layer] * 100000 + frame.zIndex }}
                pageWidth={page.width}
                pageHeight={page.height}
                scale={scale}
                selected={selectedFrameId === frame.id}
                onSelect={onSelectFrame}
                onCommitGeometry={onCommitGeometry}
                onDraftGeometryChange={(frameId, geometry) => {
                  setDraftGeometryById((current) => {
                    if (!geometry) {
                      const next = { ...current };
                      delete next[frameId];
                      return next;
                    }
                    return { ...current, [frameId]: geometry };
                  });
                }}
                renderChildren={(visualFrame) => visualFrame.type === "EDUCATIONAL"
                  ? <V2EducationalFrame
                      frame={visualFrame}
                      scale={scale}
                      selectedFrameId={selectedFrameId}
                      renderFrame={(child, children) => renderFrame(child, children)}
                      onSelectFrame={onSelectFrame}
                      onCommitGeometry={onCommitGeometry}
                      onDraftGeometryChange={(frameId, geometry) => {
                        setDraftGeometryById((current) => {
                          if (!geometry) {
                            const next = { ...current };
                            delete next[frameId];
                            return next;
                          }
                          return { ...current, [frameId]: geometry };
                        });
                      }}
                      onDropFrame={onDropFrame}
                    />
                  : renderFrame(visualFrame, visualFrames)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function safeColor(value: string | undefined) {
  if (!value) return undefined;
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim()) ? value.trim() : undefined;
}
