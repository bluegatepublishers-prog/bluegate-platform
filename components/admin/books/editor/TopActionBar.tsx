"use client";

import {
  ChevronDown,
  Copy,
  Eye,
  FileDown,
  MoreHorizontal,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from "lucide-react";

export type EditorPreviewMode =
  | "STUDENT"
  | "TEACHER"
  | "WHITEBOARD";

type SaveState = "saved" | "dirty" | "saving" | "error";

type TopActionBarProps = {
  lifecycleLabel: string;

  dirty: boolean;
  saveState: SaveState;
  onSave: () => void;

  previewMode: EditorPreviewMode;
  previewMenuOpen: boolean;
  onTogglePreviewMenu: () => void;
  onPreview: (mode: EditorPreviewMode) => void;

  canPublish: boolean;
  onPublish: () => void;
  onDelete: () => void;

  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;

  searchOpen: boolean;
  onToggleSearch: () => void;

  insertMenuOpen: boolean;
  onToggleInsertMenu: () => void;

  moreMenuOpen: boolean;
  onToggleMoreMenu: () => void;
  onOpenVersionHistory: () => void;
  onOpenRollback: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onPrint: () => void;

  layout: "single" | "double";
  onToggleLayout: () => void;
};

const buttonClass =
  "inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";

export default function TopActionBar({
  lifecycleLabel,
  dirty,
  saveState,
  onSave,
  previewMode,
  previewMenuOpen,
  onTogglePreviewMenu,
  onPreview,
  canPublish,
  onPublish,
  onDelete,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  searchOpen,
  onToggleSearch,
  insertMenuOpen,
  onToggleInsertMenu,
  moreMenuOpen,
  onToggleMoreMenu,
  onOpenVersionHistory,
  onOpenRollback,
  onDuplicate,
  onExport,
  onPrint,
  layout,
  onToggleLayout,
}: TopActionBarProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
      <span className="inline-flex shrink-0 items-center rounded-full bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
        {lifecycleLabel}
      </span>

      <button
        type="button"
        title="Save"
        aria-label="Save content"
        disabled={!dirty || saveState === "saving"}
        onClick={onSave}
        className={buttonClass}
      >
        <Save className="h-4 w-4" />
        {saveState === "saving" ? "Saving..." : "Save"}
      </button>

      <div className="relative">
        <button
          type="button"
          title="Open preview menu"
          aria-label="Open preview menu"
          aria-expanded={previewMenuOpen}
          onClick={onTogglePreviewMenu}
          className={buttonClass}
        >
          <Eye className="h-4 w-4" />
          Preview
          <ChevronDown className="h-4 w-4" />
        </button>

        {previewMenuOpen ? (
          <div className="absolute left-0 top-full z-30 mt-2 w-56 rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-xl">
            {[
              {
                key: "STUDENT" as const,
                label: "Student View",
              },
              {
                key: "TEACHER" as const,
                label: "Teacher View",
              },
              {
                key: "WHITEBOARD" as const,
                label: "Whiteboard View",
              },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onPreview(item.key)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <span>{item.label}</span>

                {previewMode === item.key ? (
                  <span className="text-xs text-slate-400">
                    Current
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        title="Publish"
        aria-label="Publish content"
        disabled={!canPublish}
        onClick={onPublish}
        className="inline-flex shrink-0 items-center rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Publish
      </button>

      <button
        type="button"
        title="Delete"
        aria-label="Delete current content node"
        onClick={onDelete}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>

      <button
        type="button"
        title="Undo"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={onUndo}
        className={buttonClass}
      >
        <RotateCcw className="h-4 w-4" />
        Undo
      </button>

      <button
        type="button"
        title="Redo"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={onRedo}
        className={buttonClass}
      >
        <Redo2 className="h-4 w-4" />
        Redo
      </button>

      <button
        type="button"
        title="Search manuscript"
        aria-label="Search manuscript"
        aria-expanded={searchOpen}
        onClick={onToggleSearch}
        className={buttonClass}
      >
        <Search className="h-4 w-4" />
        Search
      </button>

      <button
        type="button"
        title="Open insert menu"
        aria-label="Open insert menu"
        aria-expanded={insertMenuOpen}
        onClick={onToggleInsertMenu}
        className={buttonClass}
      >
        <Plus className="h-4 w-4" />
        Insert
        <ChevronDown className="h-4 w-4" />
      </button>

      <div className="relative">
        <button
          type="button"
          title="Open more actions"
          aria-label="Open more actions"
          aria-expanded={moreMenuOpen}
          onClick={onToggleMoreMenu}
          className={buttonClass}
        >
          <MoreHorizontal className="h-4 w-4" />
          More
        </button>

        {moreMenuOpen ? (
          <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-xl">
            <button
              type="button"
              onClick={onOpenVersionHistory}
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Version History
            </button>

            <button
              type="button"
              onClick={onOpenRollback}
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Rollback
            </button>

            <button
              type="button"
              onClick={onDuplicate}
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </button>

            <button
              type="button"
              onClick={onExport}
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </button>

            <button
              type="button"
              onClick={onPrint}
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Print
            </button>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        title="Toggle document columns"
        aria-label="Toggle one or two columns"
        onClick={onToggleLayout}
        className={buttonClass}
      >
        {layout === "double"
          ? "One column"
          : "Two columns"}
      </button>
    </div>
  );
}