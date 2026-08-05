"use client";

import type {
  ClipboardEvent,
  KeyboardEvent,
  MouseEvent,
} from "react";

import type {
  ContentBlock,
  TextBlock,
} from "@/lib/content-document";

type EditableTextBlock = Extract<
  TextBlock,
  {
    type:
      | "heading"
      | "subheading"
      | "paragraph"
      | "caption"
      | "quote"
      | "callout";
  }
>;

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

  if (
    block.type === "heading" ||
    block.type === "subheading"
  ) {
    return (
      <input
        data-block-id={block.id}
        value={block.text}
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
        className={`w-full border-none bg-transparent p-0 outline-none placeholder:text-slate-300 ${
          block.type === "heading"
            ? "text-4xl font-bold tracking-tight text-slate-950"
            : "text-2xl font-semibold tracking-tight text-slate-900"
        }`}
      />
    );
  }

  if (block.type === "paragraph") {
    return (
      <textarea
        data-block-id={block.id}
        value={block.text}
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
        rows={4}
        placeholder="Start writing..."
        className="w-full resize-none border-none bg-transparent p-0 text-[1.05rem] leading-8 text-slate-800 outline-none placeholder:text-slate-300"
      />
    );
  }

  if (block.type === "caption") {
    return (
      <textarea
        data-block-id={block.id}
        value={block.text}
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
        rows={2}
        placeholder="Caption"
        className="w-full resize-none border-none bg-transparent p-0 text-sm leading-6 text-slate-500 outline-none placeholder:text-slate-300"
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
      <textarea
        data-block-id={block.id}
        value={block.text}
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
        rows={4}
        placeholder={
          block.type === "quote"
            ? "Quote"
            : "Callout"
        }
        className="w-full resize-none border-none bg-transparent p-0 text-[1.05rem] leading-8 text-slate-800 outline-none placeholder:text-slate-300"
      />

      <input
        value={block.attribution ?? ""}
        onChange={(event) =>
          onUpdateAttribution(event.target.value)
        }
        placeholder="Attribution"
        className="mt-3 w-full border-none bg-transparent p-0 text-sm font-semibold text-slate-500 outline-none placeholder:text-slate-300"
      />
    </div>
  );
}