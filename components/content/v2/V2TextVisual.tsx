"use client";

import type { ClipboardEvent, CSSProperties, FormEvent } from "react";
import type { ContentBlock } from "@/lib/content-document";
import { getV2TextFramePatch, layoutV2TextFrame, type V2TextLayoutSpan } from "@/lib/content-layout-v2-text";
import type { LayoutV2Frame } from "@/lib/content-layout-v2";

export default function V2TextVisual({
  frame,
  block,
  frames,
  pageWidth,
  pageHeight,
  editable = false,
  onTextChange,
}: {
  frame: LayoutV2Frame;
  block?: ContentBlock;
  frames: LayoutV2Frame[];
  pageWidth: number;
  pageHeight: number;
  editable?: boolean;
  onTextChange?: (value: string, spans: V2TextLayoutSpan[], patch: ReturnType<typeof getV2TextFramePatch>) => void;
}) {
  const text = getText(frame, block);
  const spans = frame.textSpans ?? getBlockSpans(block) ?? [{ text }];
  const layout = layoutV2TextFrame(frame, text, frames);
  const direction = frame.direction === "RTL" ? "rtl" : frame.direction === "AUTO" ? "auto" : "ltr";
  const style: CSSProperties = {
    direction: direction === "auto" ? undefined : direction,
    textAlign: frame.alignment ?? "left",
    fontFamily: frame.fontFamily ?? getBlockValue(block, "fontFamily"),
    fontSize: `${frame.fontSize ?? getBlockNumber(block, "fontSize") ?? 16}px`,
    fontWeight: frame.fontWeight ?? (getBlockValue(block, "bold") ? 700 : 400),
    fontStyle: frame.fontStyle ?? (getBlockValue(block, "italic") ? "italic" : "normal"),
    lineHeight: frame.lineHeight ?? getBlockNumber(block, "lineSpacing") ?? 1.4,
    letterSpacing: frame.letterSpacing ? `${frame.letterSpacing}px` : undefined,
    color: frame.textColor ?? getBlockValue(block, "textColor") ?? "#0f172a",
    padding: "12px",
    overflow: "hidden",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  };
  const handleInput = (event: FormEvent<HTMLDivElement>) => {
    if (!onTextChange) return;
    const value = readEditableText(event.currentTarget);
    const nextSpans = readEditableSpans(event.currentTarget);
    onTextChange(value, nextSpans.length ? nextSpans : [{ text: value }], getV2TextFramePatch(frame, value, frames, pageWidth, pageHeight));
  };
  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (!editable) return;
    event.preventDefault();
    const plainText = event.clipboardData.getData("text/plain").replace(/\r\n/g, "\n");
    globalThis.document.execCommand("insertText", false, plainText);
  };
  return (
    <div
      contentEditable={editable}
      suppressContentEditableWarning
      role={editable ? "textbox" : undefined}
      aria-label={editable ? "V2 text frame" : frame.narrationLabel || "Text"}
      aria-multiline={editable ? true : undefined}
      aria-hidden={frame.readable ? undefined : true}
      dir={direction}
      onInput={editable ? handleInput : undefined}
      onPaste={editable ? handlePaste : undefined}
      className={`relative h-full w-full outline-none ${layout.overset || frame.overset ? "ring-1 ring-inset ring-rose-400" : ""}`}
      style={style}
    >
      {layout.lines.map((line, index) => (
        <span key={`${line.start}-${index}`} className="block" style={{ marginLeft: `${Math.max(0, line.x - frame.x - 12)}px`, width: `${line.width}px`, minHeight: `${line.height}px` }}>
          {renderLine(line.start, line.end, text, spans)}
          {index < layout.lines.length - 1 ? <br /> : null}
        </span>
      ))}
      {layout.lines.length === 0 ? <span data-v2-placeholder="true" className="text-slate-300">{editable ? "Type text" : ""}</span> : null}
      {layout.overset || frame.overset ? <span contentEditable={false} className="pointer-events-none absolute right-1 top-1 rounded bg-rose-100 px-1 text-[10px] font-bold text-rose-700" title="Text exceeds frame capacity">+</span> : null}
    </div>
  );
}

function getText(frame: LayoutV2Frame, block?: ContentBlock) {
  if (typeof frame.payload === "string") return frame.payload;
  if (frame.payload && typeof frame.payload === "object" && "text" in frame.payload && typeof frame.payload.text === "string") return frame.payload.text;
  return getBlockValue(block, "text") ?? "";
}

function getBlockSpans(block?: ContentBlock): V2TextLayoutSpan[] | undefined {
  if (!block || !("spans" in block) || !Array.isArray(block.spans)) return undefined;
  return block.spans as V2TextLayoutSpan[];
}

function getBlockValue(block: ContentBlock | undefined, key: string) {
  if (!block) return undefined;
  const value = block as unknown as Record<string, unknown>;
  return typeof value[key] === "string" ? value[key] : undefined;
}

function getBlockNumber(block: ContentBlock | undefined, key: string) {
  if (!block) return undefined;
  const value = block as unknown as Record<string, unknown>;
  return typeof value[key] === "number" ? value[key] : undefined;
}

function renderLine(start: number, end: number, text: string, spans: V2TextLayoutSpan[]) {
  const result: Array<V2TextLayoutSpan & { text: string }> = [];
  let cursor = 0;
  for (const span of spans) {
    const spanStart = cursor;
    const spanEnd = cursor + span.text.length;
    cursor = spanEnd;
    const from = Math.max(start, spanStart);
    const to = Math.min(end, spanEnd);
    if (to > from) result.push({ ...span, text: text.slice(from, to) });
    if (cursor >= end) break;
  }
  if (!result.length) return text.slice(start, end);
  return result.map((span, index) => <span key={`${index}-${span.text}`} style={spanStyle(span)}>{span.text}</span>);
}

function spanStyle(span: V2TextLayoutSpan): CSSProperties {
  const marks = span.marks ?? [];
  return {
    fontWeight: marks.includes("bold") ? 700 : undefined,
    fontStyle: marks.includes("italic") ? "italic" : undefined,
    textDecoration: marks.includes("underline") ? "underline" : undefined,
    verticalAlign: marks.includes("superscript") ? "super" : marks.includes("subscript") ? "sub" : undefined,
    color: span.color,
    backgroundColor: span.highlight,
    fontSize: span.fontSize ? `${span.fontSize}px` : undefined,
  };
}

function readEditableText(root: HTMLElement) {
  return (root.innerText || root.textContent || "").replace(/\u00a0/g, " ").replace(/\n+$/, "");
}

function readEditableSpans(root: HTMLElement): V2TextLayoutSpan[] {
  const spans: V2TextLayoutSpan[] = [];
  const walk = (node: Node, marks: V2TextLayoutSpan["marks"] = []) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) spans.push({ text: node.textContent, ...(marks.length ? { marks } : {}) });
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.dataset.v2Placeholder) return;
    if (node.tagName === "BR") {
      spans.push({ text: "\n" });
      return;
    }
    const nextMarks = [...marks];
    if (["B", "STRONG"].includes(node.tagName) && !nextMarks.includes("bold")) nextMarks.push("bold");
    if (["I", "EM"].includes(node.tagName) && !nextMarks.includes("italic")) nextMarks.push("italic");
    if (node.tagName === "U" && !nextMarks.includes("underline")) nextMarks.push("underline");
    if (node.tagName === "SUP" && !nextMarks.includes("superscript")) nextMarks.push("superscript");
    if (node.tagName === "SUB" && !nextMarks.includes("subscript")) nextMarks.push("subscript");
    node.childNodes.forEach((child) => walk(child, nextMarks));
  };
  root.childNodes.forEach((child) => walk(child));
  return spans;
}
