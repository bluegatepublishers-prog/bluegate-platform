"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ClipboardEvent, CSSProperties, FormEvent } from "react";
import type { ContentBlock } from "@/lib/content-document";
import { getV2TextFramePatch, layoutV2TextFrame, type V2TextLayoutSpan } from "@/lib/content-layout-v2-text";
import { isV2MainFlowFrame, type LayoutV2Frame } from "@/lib/content-layout-v2";

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
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmittedTextRef = useRef<string | null>(null);
  const text = getText(frame, block);
  const spans = useMemo(() => frame.textSpans ?? getBlockSpans(block) ?? [{ text }], [block, frame.textSpans, text]);
  const layout = layoutV2TextFrame(frame, text, frames);
  const hyperlinks = getHyperlinks(frame);
  const direction = frame.direction === "RTL" ? "rtl" : frame.direction === "AUTO" ? "auto" : "ltr";
  const style: CSSProperties = {
    direction: direction === "auto" ? undefined : direction,
    unicodeBidi: direction === "auto" ? "plaintext" : "normal",
    writingMode: "horizontal-tb",
    textAlign: frame.alignment ?? "left",
    fontFamily: frame.fontFamily ?? getBlockValue(block, "fontFamily"),
    fontSize: `${frame.fontSize ?? getBlockNumber(block, "fontSize") ?? 16}px`,
    fontWeight: frame.fontWeight ?? (getBlockValue(block, "bold") ? 700 : 400),
    fontStyle: frame.fontStyle ?? (getBlockValue(block, "italic") ? "italic" : "normal"),
    lineHeight: frame.lineHeight ?? getBlockNumber(block, "lineSpacing") ?? 1.4,
    letterSpacing: frame.letterSpacing ? `${frame.letterSpacing}px` : undefined,
    color: frame.textColor ?? getBlockValue(block, "textColor") ?? "#0f172a",
    padding: frame.textInset ? `${frame.textInset.top}px ${frame.textInset.right}px ${frame.textInset.bottom}px ${frame.textInset.left}px` : "12px",
    overflow: "hidden",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  };
  const handleInput = (event: FormEvent<HTMLDivElement>) => {
    if (!onTextChange) return;
    const value = readEditableText(event.currentTarget);
    lastEmittedTextRef.current = value;
    const nextSpans = readEditableSpans(event.currentTarget);
    onTextChange(value, nextSpans.length ? nextSpans : [{ text: value }], getV2TextFramePatch(frame, value, frames, pageWidth, pageHeight));
  };
  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (!editable) return;
    event.preventDefault();
    const plainText = event.clipboardData.getData("text/plain").replace(/\r\n/g, "\n");
    globalThis.document.execCommand("insertText", false, plainText);
  };
  useLayoutEffect(() => {
    if (!editable) return;
    const root = editorRef.current;
    if (!root) return;
    const isFocused = root.ownerDocument.activeElement === root;
    if (shouldSyncV2EditableDom(text, readEditableText(root), isFocused, lastEmittedTextRef.current)) {
      writeEditableContent(root, spans);
    }
    lastEmittedTextRef.current = text;
  }, [editable, spans, text]);

  return (
    <div
      ref={editable ? editorRef : undefined}
      contentEditable={editable}
      suppressContentEditableWarning
      role={editable ? "textbox" : undefined}
      aria-label={editable ? "V2 text frame" : frame.narrationLabel || "Text"}
      aria-multiline={editable ? true : undefined}
      aria-hidden={frame.readable ? undefined : true}
      dir={direction}
      spellCheck={editable}
      autoCorrect={editable ? "on" : undefined}
      data-v2-normal-flow-caret={editable && isV2MainFlowFrame(frame) ? "true" : undefined}
      data-v2-editable-native={editable ? "true" : undefined}
      onInput={editable ? handleInput : undefined}
      onPaste={editable ? handlePaste : undefined}
      onBlur={editable ? () => { lastEmittedTextRef.current = null; } : undefined}
      className={`relative h-full w-full outline-none ${layout.overset || frame.overset ? "ring-1 ring-inset ring-rose-400" : ""}`}
      style={style}
    >
      {!editable ? layout.lines.map((line, index) => (
        <span key={`${line.start}-${index}`} className="block" style={{ marginLeft: `${Math.max(0, line.x - frame.x - 12)}px`, width: `${line.width}px`, minHeight: `${line.height}px` }}>
          {renderLine(line.start, line.end, text, spans, hyperlinks)}
          {index < layout.lines.length - 1 ? <br /> : null}
        </span>
      )) : null}
      {!editable && layout.lines.length === 0 ? <span data-v2-placeholder="true" className="text-slate-300" /> : null}
      {layout.overset || frame.overset ? <span contentEditable={false} className="pointer-events-none absolute right-1 top-1 rounded bg-rose-100 px-1 text-[10px] font-bold text-rose-700" title="Text exceeds frame capacity">+</span> : null}
    </div>
  );
}

export function shouldSyncV2EditableDom(sourceText: string, domText: string, isFocused: boolean, lastEmittedText: string | null) {
  return !(isFocused && lastEmittedText === sourceText) && (sourceText !== domText || !domText);
}

function writeEditableContent(root: HTMLElement, spans: V2TextLayoutSpan[]) {
  const document = root.ownerDocument;
  const fragment = document.createDocumentFragment();
  const content = spans.length ? spans : [{ text: "" }];
  for (const span of content) {
    const parts = span.text.split("\n");
    parts.forEach((part, index) => {
      if (part) fragment.append(createEditableSpan(document, { ...span, text: part }));
      if (index < parts.length - 1) fragment.append(document.createElement("br"));
    });
  }
  if (!fragment.childNodes.length) fragment.append(document.createElement("br"));
  root.replaceChildren(fragment);
}

function createEditableSpan(document: Document, span: V2TextLayoutSpan) {
  const text = document.createTextNode(span.text);
  const marks = span.marks ?? [];
  let node: Node = text;
  const wrap = (tagName: string) => {
    const element = document.createElement(tagName);
    element.append(node);
    node = element;
  };
  if (marks.includes("bold")) wrap("strong");
  if (marks.includes("italic")) wrap("em");
  if (marks.includes("underline")) wrap("u");
  if (marks.includes("superscript")) wrap("sup");
  if (marks.includes("subscript")) wrap("sub");
  const element = document.createElement("span");
  element.style.color = span.color ?? "";
  element.style.backgroundColor = span.highlight ?? "";
  element.style.fontSize = span.fontSize ? `${span.fontSize}px` : "";
  element.append(node);
  return element;
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

function renderLine(start: number, end: number, text: string, spans: V2TextLayoutSpan[], hyperlinks: V2HyperlinkMetadata[]) {
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
  const hyperlink = hyperlinks[0];
  const safeUrl = hyperlink ? safeHttpUrl(hyperlink.url) : null;
  return result.map((span, index) => {
    const styled = <span key={index} style={spanStyle(span)}>{span.text}</span>;
    if (hyperlink?.active && safeUrl) return <a key={index} href={safeUrl} target="_blank" rel="noopener noreferrer">{styled}</a>;
    if (hyperlink) return <span key={index} title="Hyperlink requires review">{styled}</span>;
    return styled;
  });
}

type V2HyperlinkMetadata = { url: string; active: boolean; sourcePath?: string };

function getHyperlinks(frame: LayoutV2Frame): V2HyperlinkMetadata[] {
  if (!frame.payload || typeof frame.payload !== "object" || !("hyperlinks" in frame.payload) || !Array.isArray(frame.payload.hyperlinks)) return [];
  return frame.payload.hyperlinks.filter((value): value is V2HyperlinkMetadata => Boolean(value) && typeof value === "object" && typeof value.url === "string" && typeof value.active === "boolean");
}

function safeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
function spanStyle(span: V2TextLayoutSpan): CSSProperties {
  const marks = span.marks ?? [];
  return {
    fontWeight: span.fontWeight ?? (marks.includes("bold") ? 700 : undefined),
    fontStyle: span.fontStyle ?? (marks.includes("italic") ? "italic" : undefined),
    textDecoration: marks.includes("underline") ? "underline" : undefined,
    verticalAlign: span.baselineShift ? `${span.baselineShift}px` : marks.includes("superscript") ? "super" : marks.includes("subscript") ? "sub" : undefined,
    color: span.color,
    backgroundColor: span.highlight,
    fontSize: span.fontSize ? `${span.fontSize}px` : undefined,
    fontFamily: span.fontFamily,
    letterSpacing: span.letterSpacing ? `${span.letterSpacing}px` : undefined,
    textTransform: span.textTransform,
    transform: span.horizontalScale || span.verticalScale ? `scale(${(span.horizontalScale ?? 100) / 100}, ${(span.verticalScale ?? 100) / 100})` : undefined,
    transformOrigin: "left baseline",
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
