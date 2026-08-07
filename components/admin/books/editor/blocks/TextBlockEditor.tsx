"use client";

import {
  useEffect,
  useRef,
} from "react";

import type {
  ClipboardEvent,
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
} from "react";

import type {
  ContentBlock,
  TextBlock,
} from "@/lib/content-document";

type EditableTextBlock = TextBlock;

type TextBlockEditorProps = {
  block: EditableTextBlock;
  index: number;
  collapsed: boolean;

  onUpdateText: (value: string) => void;
  onUpdateAttribution: (value: string) => void;

  onTextSelect: (
    target: HTMLInputElement | HTMLTextAreaElement,
  ) => void;

  onTextPaste: (
    event: ClipboardEvent<
      HTMLInputElement | HTMLTextAreaElement
    >,
  ) => void;

  onContextKnowledge: (
    event: MouseEvent<
      HTMLInputElement | HTMLTextAreaElement
    >,
  ) => void;

  onKeyDown: (
    event: KeyboardEvent<HTMLElement>,
    block: ContentBlock,
    index: number,
    currentValue: string,
  ) => void;
};

export default function TextBlockEditor({
  block,
  index,
  collapsed,
  onUpdateText,
  onUpdateAttribution,
  onTextSelect,
  onTextPaste,
  onContextKnowledge,
  onKeyDown,
}: TextBlockEditorProps) {
  if (collapsed) return null;

  const typographyStyle = blockTypographyStyle(block);

  if (
    block.type === "heading" ||
    block.type === "heading3" ||
    block.type === "subheading"
  ) {
    return (
      <input
        data-block-id={block.id}
        value={block.text}
        style={typographyStyle}
        onChange={(event) =>
          onUpdateText(event.target.value)
        }
        onSelect={(event) =>
          onTextSelect(event.currentTarget)
        }
        onPaste={onTextPaste}
        onContextMenu={onContextKnowledge}
        onKeyDown={(event) =>
          onKeyDown(
            event,
            block,
            index,
            block.text,
          )
        }
        placeholder={
          block.type === "heading"
            ? "Heading"
            : "Subheading"
        }
        className={`w-full min-w-0 border-none bg-transparent p-0 outline-none placeholder:text-slate-300 ${
          block.type === "heading"
            ? "text-4xl font-bold tracking-tight text-slate-950"
            : block.type === "heading3"
              ? "text-xl font-bold tracking-tight text-slate-900"
              : "text-2xl font-semibold tracking-tight text-slate-900"
        }`}
      />
    );
  }

  if (block.type === "paragraph") {
    return (
      <AutoGrowingTextarea
        dataBlockId={block.id}
        value={block.text}
        placeholder="Start writing..."
        className="text-[1.05rem] leading-8 text-slate-800"
        typographyStyle={typographyStyle}
        block={block}
        index={index}
        onUpdateText={onUpdateText}
        onTextSelect={onTextSelect}
        onTextPaste={onTextPaste}
        onContextKnowledge={onContextKnowledge}
        onKeyDown={onKeyDown}
      />
    );
  }

  if (block.type === "caption") {
    return (
      <AutoGrowingTextarea
        dataBlockId={block.id}
        value={block.text}
        placeholder="Caption"
        className="text-sm leading-6 text-slate-500"
        typographyStyle={typographyStyle}
        block={block}
        index={index}
        onUpdateText={onUpdateText}
        onTextSelect={onTextSelect}
        onTextPaste={onTextPaste}
        onContextKnowledge={onContextKnowledge}
        onKeyDown={onKeyDown}
      />
    );
  }

  return (
    <div
      className={
        block.type === "quote"
          ? "border-l-4 border-slate-300 pl-5"
          : "rounded-2xl bg-blue-50 px-5 py-4"
      }
    >
      <AutoGrowingTextarea
        dataBlockId={block.id}
        value={block.text}
        placeholder={
          block.type === "quote"
            ? "Quote"
            : "Callout"
        }
        className="text-[1.05rem] leading-8 text-slate-800"
        typographyStyle={typographyStyle}
        block={block}
        index={index}
        onUpdateText={onUpdateText}
        onTextSelect={onTextSelect}
        onTextPaste={onTextPaste}
        onContextKnowledge={onContextKnowledge}
        onKeyDown={onKeyDown}
      />

      <input
        value={block.attribution ?? ""}
        onChange={(event) =>
          onUpdateAttribution(event.target.value)
        }
        placeholder="Attribution"
        className="mt-3 w-full min-w-0 border-none bg-transparent p-0 text-sm font-semibold text-slate-500 outline-none placeholder:text-slate-300"
      />
    </div>
  );
}

function AutoGrowingTextarea({
  dataBlockId,
  value,
  placeholder,
  className,
  typographyStyle,
  block,
  index,
  onUpdateText,
  onTextSelect,
  onTextPaste,
  onContextKnowledge,
  onKeyDown,
}: {
  dataBlockId: string;
  value: string;
  placeholder: string;
  className: string;
  typographyStyle: CSSProperties;
  block: EditableTextBlock;
  index: number;
  onUpdateText: (value: string) => void;
  onTextSelect: (
    target: HTMLInputElement | HTMLTextAreaElement,
  ) => void;
  onTextPaste: (
    event: ClipboardEvent<
      HTMLInputElement | HTMLTextAreaElement
    >,
  ) => void;
  onContextKnowledge: (
    event: MouseEvent<
      HTMLInputElement | HTMLTextAreaElement
    >,
  ) => void;
  onKeyDown: (
    event: KeyboardEvent<HTMLElement>,
    block: ContentBlock,
    index: number,
    currentValue: string,
  ) => void;
}) {
  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    resizeTextarea(textareaRef.current);
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      data-block-id={dataBlockId}
      value={value}
      rows={1}
      style={{
        ...typographyStyle,
        height: "auto",
        minHeight: "32px",
        overflow: "hidden",
        overflowY: "hidden",
        resize: "none",
      }}
      onChange={(event) => {
        onUpdateText(event.target.value);
        resizeTextarea(event.currentTarget);
      }}
      onInput={(event) =>
        resizeTextarea(event.currentTarget)
      }
      onFocus={(event) =>
        resizeTextarea(event.currentTarget)
      }
      onSelect={(event) =>
        onTextSelect(event.currentTarget)
      }
      onPaste={(event) => {
        onTextPaste(event);

        window.requestAnimationFrame(() => {
          resizeTextarea(textareaRef.current);
        });
      }}
      onContextMenu={onContextKnowledge}
      onKeyDown={(event) =>
        onKeyDown(
          event,
          block,
          index,
          value,
        )
      }
      placeholder={placeholder}
      className={`block h-auto min-h-[32px] w-full min-w-0 resize-none overflow-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] [scrollbar-width:none] border-none bg-transparent p-0 outline-none placeholder:text-slate-300 [&::-webkit-scrollbar]:hidden ${className}`}
    />
  );
}

function blockTypographyStyle(
  block: EditableTextBlock,
): CSSProperties {
  const decorations = [
    block.underline ? "underline" : "",
    block.strikethrough ? "line-through" : "",
  ].filter(Boolean);

  return {
    fontFamily: block.fontFamily || undefined,
    fontSize: block.fontSize
      ? `${block.fontSize}px`
      : undefined,
    fontWeight: block.bold
      ? 700
      : undefined,
    fontStyle: block.italic
      ? "italic"
      : undefined,
    textDecoration:
      decorations.length
        ? decorations.join(" ")
        : undefined,
    color: block.textColor || undefined,
    backgroundColor:
      block.highlightColor || undefined,
  };
}

function resizeTextarea(
  textarea: HTMLTextAreaElement | null,
) {
  if (!textarea) return;

  textarea.style.setProperty(
    "overflow",
    "hidden",
    "important",
  );

  textarea.style.setProperty(
    "overflow-y",
    "hidden",
    "important",
  );

  textarea.style.setProperty(
    "resize",
    "none",
    "important",
  );

  textarea.style.height = "1px";
  textarea.style.height = `${Math.max(
    textarea.scrollHeight,
    32,
  )}px`;
}
