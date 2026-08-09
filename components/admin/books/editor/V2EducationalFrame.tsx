"use client";

import type { ReactNode } from "react";

import V2Frame from "@/components/admin/books/editor/V2Frame";
import V2EducationalVisual from "@/components/content/v2/V2EducationalVisual";
import type { LayoutV2Frame, LayoutV2FrameGeometry } from "@/lib/content-layout-v2";

type Props = {
  frame: LayoutV2Frame;
  scale: number;
  selectedFrameId: string | null;
  renderFrame: (frame: LayoutV2Frame, frames: LayoutV2Frame[]) => ReactNode;
  onSelectFrame: (frameId: string) => void;
  onCommitGeometry: (frameId: string, geometry: LayoutV2FrameGeometry, parentId?: string) => void;
  onDraftGeometryChange?: (frameId: string, geometry: LayoutV2FrameGeometry | null, parentId?: string) => void;
  onDropFrame?: (frameId: string, containerId: string) => void;
};

export default function V2EducationalFrame({ frame, scale, selectedFrameId, renderFrame, onSelectFrame, onCommitGeometry, onDraftGeometryChange, onDropFrame }: Props) {
  const children = frame.children ?? [];
  return (
    <div
      className="h-full w-full overflow-hidden"
      onDragOver={(event) => { if (event.dataTransfer.types.includes("application/x-v2-frame")) event.preventDefault(); }}
      onDrop={(event) => {
        event.preventDefault();
        const frameId = event.dataTransfer.getData("application/x-v2-frame");
        if (frameId) onDropFrame?.(frameId, frame.id);
      }}
    >
      <V2EducationalVisual frame={frame}>
        <div className="absolute inset-0" style={{ padding: getContainerPadding(frame) }}>
          {[...children].sort((a, b) => a.zIndex - b.zIndex).map((child) => (
            <V2Frame
              key={child.id}
              frame={child}
              pageWidth={frame.width}
              pageHeight={frame.height}
              scale={scale}
              selected={selectedFrameId === child.id}
              parentId={frame.id}
              onSelect={onSelectFrame}
              onCommitGeometry={onCommitGeometry}
              onDraftGeometryChange={onDraftGeometryChange}
              renderChildren={(visualChild) => renderFrame(visualChild, children)}
            />
          ))}
        </div>
      </V2EducationalVisual>
    </div>
  );
}

function getContainerPadding(frame: LayoutV2Frame) {
  const payload = frame.payload && typeof frame.payload === "object" ? frame.payload as Record<string, unknown> : {};
  return typeof payload.padding === "number" && Number.isFinite(payload.padding) ? Math.max(0, Math.min(48, payload.padding)) : 10;
}
