"use client";

import { useEffect, useRef } from "react";
import { createTextBlock, isTextBlock } from "@/lib/content-document";
import type { ListBlock, RichTextSpan, TextBlock } from "@/lib/content-document";

type ManuscriptBlock = TextBlock | ListBlock;

export default function ContinuousTextEditor({
  blocks,
  onChange,
  onActivate,
}: {
  blocks: ManuscriptBlock[];
  onChange: (blocks: ManuscriptBlock[]) => void;
  onActivate: (blockId: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editingRef = useRef(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editingRef.current) return;
    editor.innerHTML = blocksToHtml(blocks);
  }, [blocks]);

  function handleInput() {
    const editor = editorRef.current;
    if (!editor) return;
    const next: ManuscriptBlock[] = [];
    for (const element of Array.from(editor.children)) {
      const id = element.getAttribute("data-block-id") || createId();
      const kind = element.getAttribute("data-block-kind");
      if (kind === "bulletList" || kind === "numberedList") {
        const source = blocks.find((block) => block.id === id);
        next.push({
          ...(source ?? { id, type: kind, items: [""] }),
          id,
          type: kind,
          items: Array.from(element.querySelectorAll(":scope > li")).map((item) => (item as HTMLElement).innerText.replace(/\u00a0/g, " ")),
          itemSpans: Array.from(element.querySelectorAll(":scope > li")).map((item) => spansFromElement(item)),
          indent: readIndent(element, source?.indent),
          lineSpacing: readLineSpacing(element, source?.lineSpacing),
        } as ListBlock);
        continue;
      }
      const source = blocks.find((block) => block.id === id);
      const sourceText = source && isTextBlock(source) ? source : undefined;
      const type = (kind || "paragraph") as TextBlock["type"];
      const text = (element as HTMLElement).innerText.replace(/\u00a0/g, " ");
      next.push({
        ...(source && isTextBlock(source) ? source : { id, type, spans: [{ text }] }),
        id,
        type,
        text,
        spans: spansFromElement(element),
        indent: readIndent(element, sourceText?.indent),
        lineSpacing: readLineSpacing(element, sourceText?.lineSpacing),
      } as TextBlock);
    }
    if (!next.length) next.push({ ...createTextBlock("paragraph", ""), ...(isTextBlock(blocks[0]) ? blocks[0] : {}) });
    onChange(next);
  }

  return (
    <div
      ref={editorRef}
      data-manuscript-editor
      contentEditable
      suppressContentEditableWarning
      onFocus={() => {
        editingRef.current = true;
        onActivate(blocks[0]?.id ?? "");
      }}
      onBlur={() => { editingRef.current = false; }}
      onInput={handleInput}
      onMouseUp={() => {
        const target = (window.getSelection()?.anchorNode?.parentElement)?.closest<HTMLElement>("[data-block-id]");
        if (target?.dataset.blockId) onActivate(target.dataset.blockId);
      }}
      className="min-h-8 space-y-2 outline-none"
      aria-label="Continuous manuscript"
    />
  );
}

function blocksToHtml(blocks: ManuscriptBlock[]) {
  return blocks.map((block) => {
    if (block.type === "bulletList" || block.type === "numberedList") {
      const tag = block.type === "bulletList" ? "ul" : "ol";
      return `<${tag} data-block-id="${escapeAttribute(block.id)}" data-block-kind="${block.type}">${block.items.map((item, index) => `<li>${spansToHtml(block.itemSpans?.[index] ?? [{ text: item }])}</li>`).join("")}</${tag}>`;
    }
    if (!isTextBlock(block)) return "";
    const tag = block.type === "heading" ? "h1" : block.type === "heading3" ? "h3" : block.type === "subheading" ? "h2" : block.type === "quote" ? "blockquote" : "p";
    return `<${tag} style="${blockStyle(block)}" data-block-id="${escapeAttribute(block.id)}" data-block-kind="${block.type}">${spansToHtml(block.spans.length ? block.spans : [{ text: block.text }])}</${tag}>`;
  }).join("");
}

function spansToHtml(spans: RichTextSpan[]) {
  return spans.map((span) => {
    let html = escapeHtml(span.text);
    for (const mark of span.marks ?? []) {
      const tag = mark === "superscript" ? "sup" : mark === "subscript" ? "sub" : mark === "bold" ? "strong" : mark === "italic" ? "em" : "u";
      html = `<${tag}>${html}</${tag}>`;
    }
    const styles = [span.color ? `color:${escapeAttribute(span.color)}` : "", span.highlight ? `background-color:${escapeAttribute(span.highlight)}` : "", span.fontSize ? `font-size:${span.fontSize}px` : ""].filter(Boolean).join(";");
    return styles ? `<span style="${styles}">${html}</span>` : html;
  }).join("");
}

function spansFromElement(element: Element): RichTextSpan[] {
  const spans: RichTextSpan[] = [];
  const visit = (node: Node, marks: RichTextSpan["marks"] = [], styles: Pick<RichTextSpan, "color" | "highlight" | "fontSize"> = {}) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) spans.push({ text: node.textContent, marks: marks.length ? [...new Set(marks)] : undefined, ...styles });
      return;
    }
    const child = node as HTMLElement;
    const nextMarks = [...marks];
    const tag = child.tagName.toLowerCase();
    if (tag === "strong" || tag === "b") nextMarks.push("bold");
    if (tag === "em" || tag === "i") nextMarks.push("italic");
    if (tag === "u") nextMarks.push("underline");
    if (tag === "sup") nextMarks.push("superscript");
    if (tag === "sub") nextMarks.push("subscript");
    for (const nested of Array.from(child.childNodes)) visit(nested, nextMarks, { ...styles, color: child.style.color || styles.color, highlight: child.style.backgroundColor || styles.highlight, fontSize: child.style.fontSize ? Number.parseInt(child.style.fontSize, 10) : styles.fontSize });
  };
  for (const node of Array.from(element.childNodes)) visit(node);
  return spans.length ? spans : [{ text: element.textContent ?? "" }];
}

function escapeHtml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function escapeAttribute(value: string) { return escapeHtml(value).replace(/'/g, "&#39;"); }
function createId() { return `manuscript_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`; }

function blockStyle(block: TextBlock | ListBlock) {
  return [
    block.indent ? `margin-left:${block.indent * 24}px` : "",
    block.lineSpacing ? `line-height:${block.lineSpacing}` : "",
  ].filter(Boolean).join(";");
}

function readIndent(element: Element, fallback?: number) {
  const marginLeft = Number.parseFloat((element as HTMLElement).style.marginLeft);
  return Number.isFinite(marginLeft) && marginLeft > 0 ? Math.min(8, Math.max(0, Math.round(marginLeft / 24))) : fallback;
}

function readLineSpacing(element: Element, fallback?: number) {
  const lineHeight = Number.parseFloat((element as HTMLElement).style.lineHeight);
  return Number.isFinite(lineHeight) && lineHeight > 0 ? Math.min(3, Math.max(1, Math.round(lineHeight * 10) / 10)) : fallback;
}
