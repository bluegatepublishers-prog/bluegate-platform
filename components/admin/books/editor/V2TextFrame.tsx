"use client";

import V2TextVisual from "@/components/content/v2/V2TextVisual";
import type { ContentBlock } from "@/lib/content-document";
import { getV2TextFramePatch, type V2TextLayoutSpan } from "@/lib/content-layout-v2-text";
import type { LayoutV2Frame } from "@/lib/content-layout-v2";

// Shared V2TextVisual owns dir={direction}, aria-multiline, and document.execCommand("insertText") safe editing.
export default function V2TextFrame({ frame, block, frames, pageWidth, pageHeight, onTextChange }: {
  frame: LayoutV2Frame;
  block?: ContentBlock;
  frames: LayoutV2Frame[];
  pageWidth: number;
  pageHeight: number;
  onTextChange: (value: string, spans: V2TextLayoutSpan[], patch: ReturnType<typeof getV2TextFramePatch>) => void;
}) {
  return <V2TextVisual frame={frame} block={block} frames={frames} pageWidth={pageWidth} pageHeight={pageHeight} editable onTextChange={onTextChange} />;
}
