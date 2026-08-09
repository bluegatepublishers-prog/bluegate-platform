import type { ReactNode } from "react";
import type { ContentBlock } from "@/lib/content-document";
import type { LayoutV2Frame } from "@/lib/content-layout-v2";
import V2EducationalVisual, { v2EducationalChildren } from "@/components/content/v2/V2EducationalVisual";
import V2ImageVisual from "@/components/content/v2/V2ImageVisual";
import V2TextVisual from "@/components/content/v2/V2TextVisual";
import { getV2FrameResourceId, safeV2Color } from "@/lib/content-layout-v2-rendering";

export default function V2FrameContent({
  frame,
  frames,
  block,
  pageWidth,
  pageHeight,
  resourceUrlResolver,
  renderBlock,
  renderFrame,
}: {
  frame: LayoutV2Frame;
  frames: LayoutV2Frame[];
  block?: ContentBlock;
  pageWidth: number;
  pageHeight: number;
  resourceUrlResolver: (resourceId: string) => string | null;
  renderBlock?: (block: ContentBlock) => ReactNode;
  renderFrame?: (frame: LayoutV2Frame, frames: LayoutV2Frame[]) => ReactNode;
}) {
  if (frame.type === "TEXT") return <V2TextVisual frame={frame} block={block} frames={frames} pageWidth={pageWidth} pageHeight={pageHeight} />;
  if (frame.type === "IMAGE") {
    const resourceId = getV2FrameResourceId(frame) ?? (block && "resourceId" in block ? block.resourceId : undefined);
    return <V2ImageVisual frame={frame} src={resourceId ? resourceUrlResolver(resourceId) : null} alt={frame.altText ?? frame.narrationLabel ?? ""} />;
  }
  if (frame.type === "SHAPE") {
    const payload = frame.payload && typeof frame.payload === "object" ? frame.payload as Record<string, unknown> : {};
    const fill = safeV2Color(typeof payload.fill === "string" ? payload.fill : undefined, "#e0e7ff");
    const border = safeV2Color(typeof payload.border === "string" ? payload.border : undefined, "#818cf8");
    return <div className="h-full w-full" style={{ backgroundColor: fill, border: `1px solid ${border}` }} />;
  }
  if (frame.type === "VIDEO") {
    const resourceId = getV2FrameResourceId(frame);
    const src = resourceId ? resourceUrlResolver(resourceId) : null;
    return src ? <video className="h-full w-full bg-slate-950 object-contain" controls src={src} /> : <Unavailable label="Video resource unavailable" />;
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
  if (block && renderBlock) return <div className="h-full w-full overflow-auto p-2">{renderBlock(block)}</div>;
  return <Unavailable label={`${frame.type} frame`} />;
}

function getContainerPadding(frame: LayoutV2Frame) {
  const payload = frame.payload && typeof frame.payload === "object" ? frame.payload as Record<string, unknown> : {};
  return typeof payload.padding === "number" && Number.isFinite(payload.padding) ? Math.max(0, Math.min(48, payload.padding)) : 10;
}

function Unavailable({ label }: { label: string }) {
  return <div className="flex h-full w-full items-center justify-center bg-slate-50 p-3 text-center text-xs font-semibold text-slate-500">{label}</div>;
}
