"use client";

import { useLayoutEffect, useRef } from "react";
import type { ClipboardEvent, CSSProperties, FormEvent } from "react";

export function shouldSyncV2EducationalEditableDom(sourceText: string, domText: string, focused: boolean, lastEmittedText: string | null) {
  return !(focused && lastEmittedText === sourceText) && (sourceText !== domText || !domText);
}

export default function V2EducationalEditor({
  value,
  placeholder,
  onChange,
  style,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  style?: CSSProperties;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmittedTextRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    const focused = root.ownerDocument.activeElement === root;
    const domText = readEducationalText(root);
    if (shouldSyncV2EducationalEditableDom(value, domText, focused, lastEmittedTextRef.current)) {
      root.textContent = value;
    }
    lastEmittedTextRef.current = value;
  }, [value]);

  const handleInput = (event: FormEvent<HTMLDivElement>) => {
    const next = readEducationalText(event.currentTarget);
    lastEmittedTextRef.current = next;
    onChange(next);
  };
  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    globalThis.document.execCommand("insertText", false, event.clipboardData.getData("text/plain").replace(/\r\n/g, "\n"));
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="Educational Block body"
      aria-multiline
      spellCheck
      data-v2-educational-editor
      onInput={handleInput}
      onPaste={handlePaste}
      onBlur={() => { lastEmittedTextRef.current = null; }}
      className="absolute inset-x-3 top-10 bottom-3 z-10 overflow-auto whitespace-pre-wrap text-sm leading-5 outline-none"
      style={style}
      data-placeholder={placeholder}
    />
  );
}

function readEducationalText(root: HTMLElement) {
  return (root.innerText || root.textContent || "").replace(/\u00a0/g, " ").replace(/\n+$/, "");
}
