import type { ReactNode } from "react";
import type { ContentBlock } from "@/lib/content-document";
import type { LayoutV2Frame } from "@/lib/content-layout-v2";
import V2EducationalVisual, { v2EducationalChildren } from "@/components/content/v2/V2EducationalVisual";
import V2ImageVisual from "@/components/content/v2/V2ImageVisual";
import V2TextVisual from "@/components/content/v2/V2TextVisual";
import V2TableVisual from "@/components/content/v2/V2TableVisual";
import V2VideoVisual from "@/components/content/v2/V2VideoVisual";
import V2ShapeVisual from "@/components/content/v2/V2ShapeVisual";
import { getV2FrameResourceId } from "@/lib/content-layout-v2-rendering";
import { getV2VideoDisplayMode } from "@/lib/content-layout-v2";

export default function V2FrameContent({
  frame,
  frames,
  block,
  pageWidth,
  pageHeight,
  resourceUrlResolver,
  renderBlock,
  renderFrame,
  onPayloadChange,
  videoPresentation = "AUTHORING",
}: {
  frame: LayoutV2Frame;
  frames: LayoutV2Frame[];
  block?: ContentBlock;
  pageWidth: number;
  pageHeight: number;
  resourceUrlResolver: (resourceId: string) => string | null;
  renderBlock?: (block: ContentBlock) => ReactNode;
  renderFrame?: (frame: LayoutV2Frame, frames: LayoutV2Frame[]) => ReactNode;
  onPayloadChange?: (payload: Record<string, unknown>) => void;
  videoPresentation?: "AUTHORING" | "DELIVERY";
}) {
  if (frame.type === "TEXT") return (
    <div data-v2-delivery-text-container className="relative h-full w-full max-w-full overflow-hidden">
      <div className="absolute inset-0 overflow-hidden"><V2TextVisual frame={frame} block={block} frames={frames} pageWidth={pageWidth} pageHeight={pageHeight} /></div>
      {frame.children?.map((child) => renderFrame?.(child, frame.children ?? []) ?? null)}
    </div>
  );
  if (frame.type === "IMAGE") {
    const resourceId = getV2FrameResourceId(frame) ?? (block && "resourceId" in block ? block.resourceId : undefined);
    return <V2ImageVisual frame={frame} src={resourceId ? resourceUrlResolver(resourceId) : null} alt={frame.altText ?? frame.narrationLabel ?? ""} />;
  }
  if (frame.type === "SHAPE") {
    const payload = frame.payload && typeof frame.payload === "object" ? frame.payload as Record<string, unknown> : {};
    return <V2ShapeVisual payload={payload} frame={frame} editable={videoPresentation === "AUTHORING" && Boolean(onPayloadChange)} onTextChange={(text) => onPayloadChange?.({ ...payload, text })} />;
  }
  if (frame.type === "VIDEO") {
    const resourceId = getV2FrameResourceId(frame)
      ?? (block && "resourceId" in block && typeof block.resourceId === "string" ? block.resourceId : undefined)
      ?? (block?.type === "media" && block.targetType === "RESOURCE" ? block.targetId : undefined);
    const src = resourceId ? resourceUrlResolver(resourceId) : null;
    return src ? <V2VideoVisual frame={frame} src={src} displayMode={getV2VideoDisplayMode(frame)} presentation={videoPresentation} /> : <Unavailable label="Video resource unavailable" />;
  }
  if (frame.type === "TABLE") {
    const payload = frame.payload && typeof frame.payload === "object" ? frame.payload as Record<string, unknown> : {};
    return <V2TableVisual payload={payload} onChange={onPayloadChange} />;
  }
  if (frame.type === "EDUCATIONAL") {
    return (
      <V2EducationalVisual frame={frame}>
        <div className="absolute inset-0" style={{ padding: getContainerPadding(frame) }}>
          {v2EducationalChildren(frame).map((child) => renderFrame?.(child, frame.children ?? []) ?? null)}
        </div>
      </V2EducationalVisual>
    );
  }
  if (block && renderBlock) return <div data-v2-bounded-block className="h-full w-full max-w-full overflow-auto p-2">{renderBlock(block)}</div>;
  return <Unavailable label={`${frame.type} frame`} />;
}

function getContainerPadding(frame: LayoutV2Frame) {
  const payload = frame.payload && typeof frame.payload === "object" ? frame.payload as Record<string, unknown> : {};
  return typeof payload.padding === "number" && Number.isFinite(payload.padding) ? Math.max(0, Math.min(48, payload.padding)) : 10;
}

function Unavailable({ label }: { label: string }) {
  return <div className="flex h-full w-full items-center justify-center bg-slate-50 p-3 text-center text-xs font-semibold text-slate-500">{label}</div>;
}
