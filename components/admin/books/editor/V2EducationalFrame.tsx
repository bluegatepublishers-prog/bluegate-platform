"use client";

import type { CSSProperties, ReactNode } from "react";

import V2Frame from "@/components/admin/books/editor/V2Frame";
import V2EducationalEditor from "@/components/admin/books/editor/V2EducationalEditor";
import V2EducationalVisual from "@/components/content/v2/V2EducationalVisual";
import { getEducationalObjectDefinition, isEducationalObjectType } from "@/lib/educational-object-registry";
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
  onPayloadChange?: (frameId: string, payload: Record<string, unknown>) => void;
};

export default function V2EducationalFrame({ frame, scale, selectedFrameId, renderFrame, onSelectFrame, onCommitGeometry, onDeleteFrame, onDraftGeometryChange, onDropFrame, onPayloadChange }: Props) {
  const children = frame.children ?? [];
  const payload = frame.payload && typeof frame.payload === "object" ? frame.payload as Record<string, unknown> : {};
  const objectType = isEducationalObjectType(payload.educationalObjectType) ? payload.educationalObjectType : "didYouKnow";
  const definition = getEducationalObjectDefinition(objectType);
  const title = typeof payload.title === "string" ? payload.title : definition.defaultTitle;
  const body = typeof payload.body === "string" ? payload.body : typeof payload.text === "string" ? payload.text : "";
  const textStyle: CSSProperties = { color: frame.textColor ?? "#1e293b", fontFamily: frame.fontFamily, fontSize: frame.fontSize, fontWeight: frame.fontWeight, fontStyle: frame.fontStyle, lineHeight: frame.lineHeight, textAlign: frame.alignment, direction: frame.direction === "RTL" ? "rtl" : "ltr" };
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
      <V2EducationalVisual
        frame={frame}
        header={onPayloadChange ? <div data-v2-educational-header-editor className="absolute inset-x-0 top-0 z-20 flex h-8 items-center gap-1.5 border-b px-2" style={{ color: definition.theme.accent, borderColor: definition.theme.border, backgroundColor: definition.theme.tint }}><span aria-hidden="true" className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white/80 text-[11px]">{definition.icon}</span><input aria-label="Educational Block heading" value={title} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => onPayloadChange(frame.id, { ...payload, educationalObjectType: objectType, title: event.target.value })} className="min-w-0 flex-1 bg-transparent text-[10px] font-bold uppercase tracking-[0.08em] outline-none" /></div> : undefined}
        body={onPayloadChange ? <V2EducationalEditor value={body} placeholder={definition.defaultPlaceholder} style={textStyle} onChange={(value) => onPayloadChange(frame.id, { ...payload, educationalObjectType: objectType, body: value })} /> : undefined}
      >
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
              onDelete={onDeleteFrame}
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
