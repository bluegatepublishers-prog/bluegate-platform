"use client";

import type { ReactNode } from "react";

import V2Frame from "@/components/admin/books/editor/V2Frame";
import type { LayoutV2Frame, LayoutV2FrameGeometry } from "@/lib/content-layout-v2";

type Props = {
  frame: LayoutV2Frame;
  scale: number;
  selectedFrameId: string | null;
  renderFrame: (frame: LayoutV2Frame, frames: LayoutV2Frame[]) => ReactNode;
  onSelectFrame: (frameId: string) => void;
  onCommitGeometry: (frameId: string, geometry: LayoutV2FrameGeometry, parentId?: string) => void;
  onDeleteFrame?: (frameId: string, parentId?: string) => void;
  onDraftGeometryChange?: (frameId: string, geometry: LayoutV2FrameGeometry | null, parentId?: string) => void;
  onDropFrame?: (frameId: string, containerId: string) => void;
};

export default function V2TextContainerFrame({
  frame,
  scale,
  selectedFrameId,
  renderFrame,
  onSelectFrame,
  onCommitGeometry,
  onDeleteFrame,
  onDraftGeometryChange,
  onDropFrame,
}: Props) {
  const children = frame.children ?? [];
  return (
    <div
      data-v2-text-container
      className="relative h-full w-full max-w-full overflow-hidden"
      dir={frame.direction === "RTL" ? "rtl" : "ltr"}
      style={{ direction: frame.direction === "RTL" ? "rtl" : "ltr", writingMode: "horizontal-tb" }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("application/x-v2-frame")) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        const frameId = event.dataTransfer.getData("application/x-v2-frame");
        if (frameId) onDropFrame?.(frameId, frame.id);
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        {renderFrame({ ...frame, x: 0, y: 0, children: undefined }, children)}
      </div>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...children].sort((left, right) => left.zIndex - right.zIndex).map((child) => (
          <div key={child.id} className="pointer-events-auto">
            <V2Frame
              frame={child}
              pageWidth={frame.width}
              pageHeight={frame.height}
              scale={scale}
              selected={selectedFrameId === child.id}
              parentId={frame.id}
              onSelect={onSelectFrame}
              onCommitGeometry={onCommitGeometry}
              onDelete={onDeleteFrame}
              onDraftGeometryChange={onDraftGeometryChange}
              renderChildren={(visualChild) => (
                <div className="h-full w-full max-w-full overflow-hidden">
                  {renderFrame(visualChild, children)}
                </div>
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
