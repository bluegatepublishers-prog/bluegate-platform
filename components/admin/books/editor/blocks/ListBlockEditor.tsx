"use client";

import type { KeyboardEvent } from "react";

import type {
  ContentBlock,
  ListBlock,
} from "@/lib/content-document";

type ListBlockEditorProps = {
  block: ListBlock;
  collapsed: boolean;

  onUpdateListItem: (
    itemIndex: number,
    value: string,
  ) => void;

  onAddListItem: (itemIndex: number) => void;

  onListKeyDown: (
    event: KeyboardEvent<HTMLInputElement>,
    block: ContentBlock,
    itemIndex: number,
    itemValue: string,
  ) => void;
};

export default function ListBlockEditor({
  block,
  collapsed,
  onUpdateListItem,
  onAddListItem,
  onListKeyDown,
}: ListBlockEditorProps) {
  if (collapsed) return null;

  return (
    <div className="space-y-2">
      {block.items.map((item, itemIndex) => (
        <div
          key={`${block.id}-${itemIndex}`}
          className="flex items-start gap-3"
        >
          <span className="mt-2 text-sm font-bold text-slate-400">
            {block.type === "numberedList"
              ? `${itemIndex + 1}.`
              : "•"}
          </span>

          <input
            data-block-id={
              itemIndex === 0
                ? block.id
                : undefined
            }
            value={item}
            onChange={(event) =>
              onUpdateListItem(
                itemIndex,
                event.target.value,
              )
            }
            onKeyDown={(event) =>
              onListKeyDown(
                event,
                block,
                itemIndex,
                item,
              )
            }
            placeholder="List item"
            className="w-full border-none bg-transparent p-0 text-[1.05rem] leading-8 text-slate-800 outline-none placeholder:text-slate-300"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          onAddListItem(
            block.items.length - 1,
          )
        }
        className="text-sm font-semibold text-blue-700"
      >
        Add item
      </button>
    </div>
  );
}