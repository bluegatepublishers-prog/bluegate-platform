"use client";

import { useState } from "react";
import type { CSSProperties, PointerEvent } from "react";

import type { LayoutV2Frame } from "@/lib/content-layout-v2";

export type V2ShapeType = "RECTANGLE" | "ROUNDED_RECTANGLE" | "ELLIPSE" | "LINE";

export function getV2ShapePayload(value: unknown) {
  const payload = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const shapeType: V2ShapeType = ["RECTANGLE", "ROUNDED_RECTANGLE", "ELLIPSE", "LINE"].includes(payload.shapeType as string)
    ? payload.shapeType as V2ShapeType
    : "RECTANGLE";
  return {
    shapeType,
    fill: typeof payload.fill === "string" ? payload.fill : "#e0e7ff",
    border: typeof payload.border === "string" ? payload.border : "#4f46e5",
    borderWidth: typeof payload.borderWidth === "number" && Number.isFinite(payload.borderWidth) ? Math.max(1, Math.min(12, payload.borderWidth)) : 1,
    opacity: typeof payload.opacity === "number" && Number.isFinite(payload.opacity) ? Math.max(0.1, Math.min(1, payload.opacity)) : 1,
    lineStyle: payload.lineStyle === "DASHED" || payload.lineStyle === "DOTTED" ? payload.lineStyle : "SOLID",
    text: typeof payload.text === "string" ? payload.text : "",
    textPadding: typeof payload.textPadding === "number" && Number.isFinite(payload.textPadding) ? Math.max(4, Math.min(48, payload.textPadding)) : 12,
    verticalAlign: payload.verticalAlign === "CENTER" || payload.verticalAlign === "BOTTOM" ? payload.verticalAlign : "TOP",
  };
}

export default function V2ShapeVisual({ payload, frame, editable = false, onTextChange }: { payload: unknown; frame?: LayoutV2Frame; editable?: boolean; onTextChange?: (text: string) => void }) {
  const shape = getV2ShapePayload(payload);
  const [editingText, setEditingText] = useState(false);
  const style: CSSProperties = {
    backgroundColor: shape.shapeType === "LINE" ? "transparent" : shape.fill,
    borderColor: shape.border,
    borderWidth: shape.shapeType === "LINE" ? 0 : shape.borderWidth,
    borderStyle: shape.lineStyle.toLowerCase(),
    borderRadius: shape.shapeType === "ROUNDED_RECTANGLE" ? "16px" : shape.shapeType === "ELLIPSE" ? "9999px" : undefined,
    opacity: shape.opacity,
  };
  if (shape.shapeType === "LINE") {
    return <div data-v2-shape data-v2-shape-type={shape.shapeType} className="flex h-full w-full items-center"><div className="w-full" style={{ borderTop: `${shape.borderWidth}px ${shape.lineStyle.toLowerCase()} ${shape.border}`, opacity: shape.opacity }} /></div>;
  }
  const verticalClass = shape.verticalAlign === "CENTER" ? "items-center" : shape.verticalAlign === "BOTTOM" ? "items-end" : "items-start";
  const textStyle: CSSProperties = {
    padding: shape.textPadding,
    color: frame?.textColor ?? "#111827",
    fontFamily: frame?.fontFamily,
    fontSize: frame?.fontSize,
    fontWeight: frame?.fontWeight,
    fontStyle: frame?.fontStyle,
    lineHeight: frame?.lineHeight,
    textAlign: frame?.alignment,
    direction: frame?.direction === "RTL" ? "rtl" : "ltr",
  };
  const stopFramePointer = (event: PointerEvent<HTMLElement>) => event.stopPropagation();
  return <div data-v2-shape data-v2-shape-type={shape.shapeType} data-v2-shape-text-bounded={shape.text || undefined} className={`relative flex h-full w-full overflow-hidden ${verticalClass}`} style={style} onDoubleClick={() => { if (editable) setEditingText(true); }}>
    {shape.text && !editingText ? <div data-v2-shape-text className="max-h-full w-full overflow-hidden whitespace-pre-wrap break-words" style={textStyle}>{shape.text}</div> : null}
    {editable && editingText ? <textarea data-v2-shape-text-editor aria-label="Shape text" autoFocus value={shape.text} onPointerDown={stopFramePointer} onDoubleClick={(event) => event.stopPropagation()} onChange={(event) => onTextChange?.(event.target.value)} onBlur={() => setEditingText(false)} className="absolute inset-0 h-full w-full resize-none overflow-auto border-0 bg-transparent outline-none" style={textStyle} placeholder="Type inside this shape" /> : null}
  </div>;
}
