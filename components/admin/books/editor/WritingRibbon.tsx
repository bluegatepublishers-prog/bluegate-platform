"use client";

import type {
  ContentBlockType,
} from "@/lib/content-document";

type WritingRibbonProps = {
  activeBlockType: ContentBlockType;

  onChangeBlockType: (type: ContentBlockType) => void;

  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;

  onOpenInsertMenu: () => void;
};

const controlClass =
  "shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";

export default function WritingRibbon({
  activeBlockType,
  onChangeBlockType,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onOpenInsertMenu,
}: WritingRibbonProps) {
  return (
    <div
      className="mt-3 flex items-center gap-2 overflow-x-auto border-t border-slate-100 pt-3"
      aria-label="Writing toolbar"
    >
      <select
        value={activeBlockType}
        onChange={(event) =>
          onChangeBlockType(
            event.target.value as ContentBlockType,
          )
        }
        aria-label="Text style"
        className={controlClass}
      >
        <option value="paragraph">Body</option>
        <option value="heading">Heading</option>
        <option value="subheading">Subheading</option>
        <option value="quote">Quote</option>
        <option value="bulletList">Bullets</option>
        <option value="numberedList">Numbering</option>
      </select>

      <button
        type="button"
        onClick={onAlignLeft}
        className={controlClass}
      >
        Align left
      </button>

      <button
        type="button"
        onClick={onAlignCenter}
        className={controlClass}
      >
        Center
      </button>

      <button
        type="button"
        onClick={onAlignRight}
        className={controlClass}
      >
        Align right
      </button>

      <button
        type="button"
        onClick={onOpenInsertMenu}
        className={controlClass}
      >
        Add Block
      </button>
    </div>
  );
}