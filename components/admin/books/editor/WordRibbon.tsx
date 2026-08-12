"use client";

import { useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  BookOpenCheck,
  Check,
  ChevronDown,
  ClipboardList,
  ClipboardPaste,
  Columns3,
  Copy,
  Eraser,
  Eye,
  FilePlus2,
  FileText,
  Grid3X3,
  Highlighter,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Maximize2,
  MessageSquare,
  Minus,
  MousePointer2,
  Paintbrush,
  Palette,
  PlayCircle,
  Redo2,
  Replace,
  Ruler,
  Save,
  Scissors,
  Search,
  Sparkles,
  SpellCheck2,
  Strikethrough,
  Table2,
  Trash2,
  Underline,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import type {
  CanvasPreset,
  ContentBlockType,
} from "@/lib/content-document";
import { EDUCATIONAL_OBJECT_REGISTRY, type EducationalObjectType } from "@/lib/educational-object-registry";
import EducationalObjectIcon from "@/components/content/EducationalObjectIcon";

type RibbonTab =
  | "HOME"
  | "INSERT"
  | "REVIEW"
  | "VIEW";

type PreviewMode =
  | "STUDENT"
  | "TEACHER"
  | "WHITEBOARD";

type InsertKind =
  | "image"
  | "media"
  | "activity"
  | "worksheet"
  | "exercise"
  | "resource"
  | "learningOutcome"
  | "feature";

type InlineFormatCommand =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "clearFormatting"
  | "fontFamily"
  | "fontSize"
  | "textColor"
  | "highlightColor"
  | "superscript"
  | "subscript"
  | "decreaseIndent"
  | "increaseIndent"
  | "justify"
  | "lineSpacing";

type WordRibbonProps = {
  lifecycleLabel: string;
  saveState: "saved" | "dirty" | "saving" | "error";
  dirty: boolean;

  activeBlockType: ContentBlockType;
  layout: "single" | "double";
  canvasPreset: CanvasPreset;
  onChangeCanvas: (preset: CanvasPreset) => void;

  canUndo: boolean;
  canRedo: boolean;
  canPublish: boolean;

  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete?: () => void;
  onPublish: () => void;

  onPreview: (mode: PreviewMode) => void;
  onSearch: () => void;

  onChangeBlockType: (type: ContentBlockType) => void;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onToggleLayout: () => void;

  onInsert: (kind: InsertKind) => void;
  onInsertTable: (rows: number, columns: number) => void;
  onInsertList: (
    type: "bulletList" | "numberedList",
  ) => void;
  onInsertFeature: (
    variant: EducationalObjectType,
  ) => void;

  /*
   * Optional commands.
   * The ribbon compiles without them.
   * Connect these later when character-level rich text
   * formatting is supported by the manuscript model.
   */
  onFormat?: (
    command: InlineFormatCommand,
    value?: string,
  ) => void;

  onPaste?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onFormatPainter?: () => void;

  onReplace?: () => void;
  onSelectAll?: () => void;

  onInsertDivider?: () => void;
  onInsertPageBreak?: () => void;
  onAddPeriod?: () => void;

  onSpellCheck?: () => void;
  onComments?: () => void;

  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleRuler?: () => void;
  onToggleGrid?: () => void;
  onFullScreen?: () => void;
};

const toolbarButton =
  "inline-flex h-9 min-w-9 items-center justify-center gap-2 rounded-md px-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35";

const squareButton =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35";

const largeCommand =
  "flex h-[58px] min-w-[58px] shrink-0 flex-col items-center justify-center gap-1 rounded-md px-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35";

export default function WordRibbon({
  lifecycleLabel,
  saveState,
  dirty,
  activeBlockType,
  layout,
  canUndo,
  canRedo,
  canPublish,
  onSave,
  onUndo,
  onRedo,
  onDelete,
  onPublish,
  onPreview,
  onSearch,
  onChangeBlockType,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onToggleLayout,
  canvasPreset,
  onChangeCanvas,
  onInsert,
  onInsertTable,
  onInsertList,
  onInsertFeature,
  onFormat,
  onPaste,
  onCut,
  onCopy,
  onFormatPainter,
  onReplace,
  onSelectAll,
  onInsertDivider,
  onInsertPageBreak,
  onAddPeriod,
  onSpellCheck,
  onComments,
  onZoomIn,
  onZoomOut,
  onToggleRuler,
  onToggleGrid,
  onFullScreen,
}: WordRibbonProps) {
  const [activeTab, setActiveTab] =
    useState<RibbonTab>("HOME");

  const [previewOpen, setPreviewOpen] =
    useState(false);

  const [featureOpen, setFeatureOpen] =
    useState(false);

  const [fontFamily, setFontFamily] =
    useState("Arial");

  const [fontSize, setFontSize] =
    useState("12");

  const [textColor, setTextColor] =
    useState("#111827");

  const [highlightColor, setHighlightColor] =
    useState("#fff59d");

  const saveLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "error"
        ? "Save failed"
        : dirty
          ? "Unsaved"
          : "Saved";

  const blockFontFormattingAvailable =
    typeof onFormat === "function";

  const inlineFormattingAvailable = true;

  function applyFormat(
    command: InlineFormatCommand,
    value?: string,
  ) {
    onFormat?.(command, value);
  }

  return (
    <div className="w-full border-b border-slate-300 bg-white shadow-sm">
      {/* Document information and publishing actions */}
      <div className="flex min-h-14 min-w-0 items-center gap-3 border-b border-slate-200 px-4">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-950">
            Content Studio
          </p>
        </div>

        <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:inline-flex">
          {lifecycleLabel}
        </span>

        <div className="ml-auto flex min-w-0 items-center gap-1">
          <span
            className={`mr-2 hidden items-center gap-1.5 text-xs font-semibold md:inline-flex ${
              saveState === "error"
                ? "text-rose-700"
                : saveState === "saving" || dirty
                  ? "text-amber-700"
                  : "text-emerald-700"
            }`}
          >
            {saveState === "saved" && !dirty ? (
              <Check className="h-4 w-4" />
            ) : null}

            {saveLabel}
          </span>

          <button
            type="button"
            onClick={onSave}
            disabled={saveState === "saving"}
            className={squareButton}
            title="Save"
            aria-label="Save manuscript"
          >
            <Save className="h-5 w-5" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setPreviewOpen(
                  (current) => !current,
                )
              }
              className={toolbarButton}
            >
              <Eye className="h-5 w-5" />
              <span className="hidden sm:inline">
                Preview
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {previewOpen ? (
              <DropdownPanel className="right-0 w-48">
                {(
                  [
                    ["STUDENT", "Student"],
                    ["TEACHER", "Teacher"],
                    ["WHITEBOARD", "Whiteboard"],
                  ] as const
                ).map(([mode, label]) => (
                  <DropdownButton
                    key={mode}
                    label={label}
                    onClick={() => {
                      onPreview(mode);
                      setPreviewOpen(false);
                    }}
                  />
                ))}
              </DropdownPanel>
            ) : null}
          </div>

          <button
            type="button"
            disabled={!canPublish}
            onClick={onPublish}
            className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Publish
          </button>

          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className={squareButton}
              title="Delete"
              aria-label="Delete current manuscript"
            >
              <Trash2 className="h-5 w-5 text-rose-600" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Ribbon tabs */}
      <div className="flex min-h-11 items-end gap-1 overflow-x-auto border-b border-slate-200 px-4">
        {(
          [
            ["HOME", "Home"],
            ["INSERT", "Insert"],
            ["REVIEW", "Review"],
            ["VIEW", "View"],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`h-11 shrink-0 border-b-[3px] px-5 text-sm font-semibold transition ${
              activeTab === tab
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-700 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Ribbon body */}
      <div className="min-h-[92px] overflow-x-auto">
        {activeTab === "HOME" ? (
          <HomeRibbon
            activeBlockType={activeBlockType}
            canUndo={canUndo}
            canRedo={canRedo}
            inlineFormattingAvailable={
              inlineFormattingAvailable
            }
            blockFontFormattingAvailable={
              blockFontFormattingAvailable
            }
            fontFamily={fontFamily}
            fontSize={fontSize}
            textColor={textColor}
            highlightColor={highlightColor}
            onUndo={onUndo}
            onRedo={onRedo}
            onChangeBlockType={
              onChangeBlockType
            }
            onAlignLeft={onAlignLeft}
            onAlignCenter={onAlignCenter}
            onAlignRight={onAlignRight}
            onInsertList={onInsertList}
            onSearch={onSearch}
            onPaste={onPaste}
            onCut={onCut}
            onCopy={onCopy}
            onFormatPainter={onFormatPainter}
            onReplace={onReplace}
            onSelectAll={onSelectAll}
            onChangeFontFamily={(value) => {
              setFontFamily(value);
              applyFormat("fontFamily", value);
            }}
            onChangeFontSize={(value) => {
              setFontSize(value);
              applyFormat("fontSize", value);
            }}
            onChangeTextColor={(value) => {
              setTextColor(value);
              applyFormat("textColor", value);
            }}
            onChangeHighlightColor={(value) => {
              setHighlightColor(value);
              applyFormat(
                "highlightColor",
                value,
              );
            }}
            onFormat={applyFormat}
          />
        ) : null}

        {activeTab === "INSERT" ? (
          <InsertRibbon
            featureOpen={featureOpen}
            onToggleFeature={() =>
              setFeatureOpen(
                (current) => !current,
              )
            }
            onCloseFeature={() =>
              setFeatureOpen(false)
            }
            onInsert={onInsert}
            onInsertTable={onInsertTable}
            onInsertFeature={onInsertFeature}
            onInsertDivider={onInsertDivider}
            onInsertPageBreak={
              onInsertPageBreak
            }
            onAddPeriod={onAddPeriod}
          />
        ) : null}

        {activeTab === "REVIEW" ? (
          <ReviewRibbon
            onSearch={onSearch}
            onSpellCheck={onSpellCheck}
            onComments={onComments}
          />
        ) : null}

        {activeTab === "VIEW" ? (
          <ViewRibbon
            layout={layout}
            canvasPreset={canvasPreset}
            onChangeCanvas={onChangeCanvas}
            onToggleLayout={onToggleLayout}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onToggleRuler={onToggleRuler}
            onToggleGrid={onToggleGrid}
            onFullScreen={onFullScreen}
          />
        ) : null}
      </div>
    </div>
  );
}

function HomeRibbon({
  activeBlockType,
  canUndo,
  canRedo,
  inlineFormattingAvailable,
  blockFontFormattingAvailable,
  fontFamily,
  fontSize,
  textColor,
  highlightColor,
  onUndo,
  onRedo,
  onChangeBlockType,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onInsertList,
  onSearch,
  onPaste,
  onCut,
  onCopy,
  onFormatPainter,
  onReplace,
  onSelectAll,
  onChangeFontFamily,
  onChangeFontSize,
  onChangeTextColor,
  onChangeHighlightColor,
  onFormat,
}: {
  activeBlockType: ContentBlockType;
  canUndo: boolean;
  canRedo: boolean;
  inlineFormattingAvailable: boolean;
  blockFontFormattingAvailable: boolean;
  fontFamily: string;
  fontSize: string;
  textColor: string;
  highlightColor: string;
  onUndo: () => void;
  onRedo: () => void;
  onChangeBlockType: (
    type: ContentBlockType,
  ) => void;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onInsertList: (
    type: "bulletList" | "numberedList",
  ) => void;
  onSearch: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onFormatPainter?: () => void;
  onReplace?: () => void;
  onSelectAll?: () => void;
  onChangeFontFamily: (value: string) => void;
  onChangeFontSize: (value: string) => void;
  onChangeTextColor: (value: string) => void;
  onChangeHighlightColor: (
    value: string,
  ) => void;
  onFormat: (
    command: InlineFormatCommand,
    value?: string,
  ) => void;
}) {
  return (
    <div className="flex min-w-max items-stretch px-2 py-2">
      <RibbonGroup label="Clipboard">
        <LargeCommand
          icon={
            <ClipboardPaste className="h-6 w-6" />
          }
          label="Paste"
          onClick={onPaste}
          disabled={!onPaste}
        />

        <div className="flex flex-col justify-center">
          <SmallCommand
            icon={<Scissors className="h-4 w-4" />}
            label="Cut"
            onClick={onCut}
            disabled={!onCut}
          />

          <SmallCommand
            icon={<Copy className="h-4 w-4" />}
            label="Copy"
            onClick={onCopy}
            disabled={!onCopy}
          />

          <SmallCommand
            icon={
              <Paintbrush className="h-4 w-4" />
            }
            label="Format painter"
            onClick={onFormatPainter}
            disabled={!onFormatPainter}
          />
        </div>
      </RibbonGroup>

      <RibbonGroup label="History">
        <button
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          className={squareButton}
          title="Undo"
        >
          <Undo2 className="h-5 w-5" />
        </button>

        <button
          type="button"
          disabled={!canRedo}
          onClick={onRedo}
          className={squareButton}
          title="Redo"
        >
          <Redo2 className="h-5 w-5" />
        </button>
      </RibbonGroup>

      <RibbonGroup label="Font">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <select
              value={fontFamily}
              disabled={
                !blockFontFormattingAvailable
              }
              onChange={(event) =>
                onChangeFontFamily(
                  event.target.value,
                )
              }
              title={
                blockFontFormattingAvailable
                  ? "Font family"
                  : "Font formatting requires inline rich text support"
              }
              className="h-8 w-36 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none disabled:opacity-45"
            >
              <option value="Arial">Arial</option>
              <option value="Calibri">
                Calibri
              </option>
              <option value="Georgia">
                Georgia
              </option>
              <option value="Times New Roman">
                Times New Roman
              </option>
              <option value="Verdana">
                Verdana
              </option>
              <option value="Noto Sans Devanagari">
                Noto Sans Devanagari
              </option>
            </select>

            <select
              value={fontSize}
              disabled={
                !blockFontFormattingAvailable
              }
              onChange={(event) =>
                onChangeFontSize(
                  event.target.value,
                )
              }
              title={
                blockFontFormattingAvailable
                  ? "Font size"
                  : "Font formatting requires inline rich text support"
              }
              className="h-8 w-20 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none disabled:opacity-45"
            >
              {[
                "8",
                "9",
                "10",
                "11",
                "12",
                "14",
                "16",
                "18",
                "20",
                "24",
                "28",
                "32",
                "36",
                "48",
              ].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-0.5">
            <FormatButton
              icon={<Bold className="h-4 w-4" />}
              label="Bold"
              disabled={
                !blockFontFormattingAvailable
              }
              onClick={() => onFormat("bold")}
            />

            <FormatButton
              icon={<Italic className="h-4 w-4" />}
              label="Italic"
              disabled={
                !blockFontFormattingAvailable
              }
              onClick={() => onFormat("italic")}
            />

            <FormatButton
              icon={
                <Underline className="h-4 w-4" />
              }
              label="Underline"
              disabled={
                !blockFontFormattingAvailable
              }
              onClick={() =>
                onFormat("underline")
              }
            />

            <FormatButton
              icon={
                <Strikethrough className="h-4 w-4" />
              }
              label="Strikethrough"
              disabled={
                !blockFontFormattingAvailable
              }
                onClick={() =>
                  onFormat("strikethrough")
                }
              />

            <FormatButton
              icon={<span className="text-xs font-bold">x²</span>}
              label="Superscript"
              disabled={!blockFontFormattingAvailable}
              onClick={() => onFormat("superscript")}
            />

            <FormatButton
              icon={<span className="text-xs font-bold">x₂</span>}
              label="Subscript"
              disabled={!blockFontFormattingAvailable}
              onClick={() => onFormat("subscript")}
            />

            <FormatButton
              icon={<Eraser className="h-4 w-4" />}
              label="Clear formatting"
              disabled={
                !blockFontFormattingAvailable
              }
              onClick={() =>
                onFormat("clearFormatting")
              }
            />

            <label
              className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-slate-100"
              title="Text color"
            >
              <Palette
                className="h-4 w-4"
                style={{ color: textColor }}
              />

              <input
                type="color"
                value={textColor}
                disabled={
                  !blockFontFormattingAvailable
                }
                onChange={(event) =>
                  onChangeTextColor(
                    event.target.value,
                  )
                }
                className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
            </label>

            <label
              className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-slate-100"
              title="Highlight color"
            >
              <Highlighter
                className="h-4 w-4"
                style={{
                  color: highlightColor,
                }}
              />

              <input
                type="color"
                value={highlightColor}
                disabled={
                  !blockFontFormattingAvailable
                }
                onChange={(event) =>
                  onChangeHighlightColor(
                    event.target.value,
                  )
                }
                className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
            </label>
          </div>
        </div>
      </RibbonGroup>

      <RibbonGroup label="Paragraph">
        <div className="grid grid-cols-5 gap-0.5">
          <FormatButton
            icon={<List className="h-4 w-4" />}
            label="Bulleted list"
            onClick={() =>
              onInsertList("bulletList")
            }
          />

          <FormatButton
            icon={
              <ListOrdered className="h-4 w-4" />
            }
            label="Numbered list"
            onClick={() =>
              onInsertList("numberedList")
            }
          />

          <FormatButton
            icon={
              <IndentDecrease className="h-4 w-4" />
            }
            label="Decrease indent"
            disabled={
              !inlineFormattingAvailable
            }
            onClick={() =>
              onFormat("decreaseIndent")
            }
          />

          <FormatButton
            icon={
              <IndentIncrease className="h-4 w-4" />
            }
            label="Increase indent"
            disabled={
              !inlineFormattingAvailable
            }
            onClick={() =>
              onFormat("increaseIndent")
            }
          />

          <FormatButton
            icon={
              <AlignJustify className="h-4 w-4" />
            }
            label="Justify"
            disabled={
              !inlineFormattingAvailable
            }
            onClick={() =>
              onFormat("justify")
            }
          />

          <FormatButton
            icon={
              <AlignLeft className="h-4 w-4" />
            }
            label="Align left"
            onClick={onAlignLeft}
          />

          <FormatButton
            icon={
              <AlignCenter className="h-4 w-4" />
            }
            label="Align center"
            onClick={onAlignCenter}
          />

          <FormatButton
            icon={
              <AlignRight className="h-4 w-4" />
            }
            label="Align right"
            onClick={onAlignRight}
          />

          <button
            type="button"
            disabled={
              !inlineFormattingAvailable
            }
            onClick={() =>
              onFormat("lineSpacing", "1.5")
            }
            className={squareButton}
            title="Line spacing"
          >
            <span className="text-xs font-bold">
              ↕
            </span>
          </button>
        </div>
      </RibbonGroup>

      <RibbonGroup label="Styles">
        <select
          value={styleValue(activeBlockType)}
          onChange={(event) =>
            onChangeBlockType(
              event.target
                .value as ContentBlockType,
            )
          }
          className="h-10 w-44 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
        >
          <option value="paragraph">
            Normal
          </option>
          <option value="heading">
            Heading 1
          </option>
          <option value="heading3">
            Heading 3
          </option>
          <option value="subheading">
            Heading 2
          </option>
          <option value="quote">
            Quote
          </option>
          <option value="caption">
            Caption
          </option>
          <option value="callout">
            Callout
          </option>
        </select>
      </RibbonGroup>

      <RibbonGroup label="Editing">
        <div className="flex flex-col justify-center">
          <SmallCommand
            icon={<Search className="h-4 w-4" />}
            label="Find"
            onClick={onSearch}
          />

          <SmallCommand
            icon={<Replace className="h-4 w-4" />}
            label="Replace"
            onClick={onReplace}
            disabled={!onReplace}
          />

          <SmallCommand
            icon={
              <MousePointer2 className="h-4 w-4" />
            }
            label="Select all"
            onClick={onSelectAll}
            disabled={!onSelectAll}
          />
        </div>
      </RibbonGroup>
    </div>
  );
}

function InsertRibbon({
  featureOpen,
  onToggleFeature,
  onCloseFeature,
  onInsert,
  onInsertTable,
  onInsertFeature,
  onInsertDivider,
  onInsertPageBreak,
  onAddPeriod,
}: {
  featureOpen: boolean;
  onToggleFeature: () => void;
  onCloseFeature: () => void;
  onInsert: (kind: InsertKind) => void;
  onInsertTable: (rows: number, columns: number) => void;
  onInsertFeature: (variant: EducationalObjectType) => void;
  onInsertDivider?: () => void;
  onInsertPageBreak?: () => void;
  onAddPeriod?: () => void;
}) {
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [tableRows, setTableRows] = useState("3");
  const [tableColumns, setTableColumns] = useState("3");

  function insertTable() {
    const rows = Math.min(50, Math.max(1, Number.parseInt(tableRows, 10) || 1));
    const columns = Math.min(20, Math.max(1, Number.parseInt(tableColumns, 10) || 1));
    onInsertTable(rows, columns);
    setTablePickerOpen(false);
  }

  return (
    <div className="flex min-w-max items-stretch px-2 py-2">
      <RibbonGroup label="Pages">
        <LargeCommand
          icon={
            <FilePlus2 className="h-6 w-6" />
          }
          label="New Period"
          onClick={onAddPeriod}
          disabled={!onAddPeriod}
        />

        <LargeCommand
          icon={<Minus className="h-6 w-6" />}
          label="Page Break"
          onClick={onInsertPageBreak}
          disabled={!onInsertPageBreak}
        />

        <LargeCommand
          icon={<Minus className="h-6 w-6" />}
          label="Divider"
          onClick={onInsertDivider}
          disabled={!onInsertDivider}
        />
      </RibbonGroup>

      <RibbonGroup label="Illustrations">
        <LargeCommand
          icon={<ImageIcon className="h-6 w-6" />}
          label="Image"
          onClick={() => onInsert("image")}
        />

        <LargeCommand
          icon={
            <PlayCircle className="h-6 w-6" />
          }
          label="Video"
          onClick={() => onInsert("media")}
        />

        <div className="relative">
          <LargeCommand
            icon={<Table2 className="h-6 w-6" />}
            label="Table"
            onClick={() => setTablePickerOpen((current) => !current)}
          />
          {tablePickerOpen ? (
            <div className="absolute left-0 top-full z-40 mt-1 w-60 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Insert table</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-slate-600">Rows<input className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" type="number" min={1} max={50} value={tableRows} onChange={(event) => setTableRows(event.target.value)} /></label>
                <label className="text-xs font-semibold text-slate-600">Columns<input className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" type="number" min={1} max={20} value={tableColumns} onChange={(event) => setTableColumns(event.target.value)} /></label>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {["1×1", "2×2", "3×3", "4×5"].map((preset) => { const [rows, columns] = preset.split("×"); return <button key={preset} type="button" className="rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-blue-50" onClick={() => { setTableRows(rows); setTableColumns(columns); }}>{preset}</button>; })}
              </div>
              <button type="button" className="mt-3 h-9 w-full rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700" onClick={insertTable}>Insert</button>
            </div>
          ) : null}
        </div>
      </RibbonGroup>

      <RibbonGroup label="Learning Content">
        <LargeCommand
          icon={
            <ClipboardList className="h-6 w-6" />
          }
          label="Activity"
          onClick={() => onInsert("activity")}
        />

        <LargeCommand
          icon={<FileText className="h-6 w-6" />}
          label="Worksheet"
          onClick={() =>
            onInsert("worksheet")
          }
        />

        <LargeCommand
          icon={
            <BookOpenCheck className="h-6 w-6" />
          }
          label="Exercise"
          onClick={() => onInsert("exercise")}
        />
        <LargeCommand
          icon={<FileText className="h-6 w-6" />}
          label="Resource"
          onClick={() => onInsert("resource")}
        />

        <LargeCommand
          icon={
            <BookOpenCheck className="h-6 w-6" />
          }
          label="Outcome"
          onClick={() =>
            onInsert("learningOutcome")
          }
        />
      </RibbonGroup>

      <RibbonGroup label="Educational Blocks">
        <div className="relative">
          <LargeCommand
            icon={
              <Sparkles className="h-6 w-6" />
            }
            label="Educational Blocks"
            onClick={onToggleFeature}
          />

          {featureOpen ? (
            <DropdownPanel className="left-0 w-60">
              {EDUCATIONAL_OBJECT_REGISTRY.map(([variant, label]) => (
                <DropdownButton
                  key={variant}
                  icon={<EducationalObjectIcon type={variant} className="h-4 w-4" />}
                  label={label}
                  onClick={() => {
                    onInsertFeature(variant);
                    onCloseFeature();
                  }}
                />
              ))}
            </DropdownPanel>
          ) : null}
        </div>
      </RibbonGroup>
    </div>
  );
}

function ReviewRibbon({
  onSearch,
  onSpellCheck,
  onComments,
}: {
  onSearch: () => void;
  onSpellCheck?: () => void;
  onComments?: () => void;
}) {
  return (
    <div className="flex min-w-max items-stretch px-2 py-2">
      <RibbonGroup label="Proofing">
        <LargeCommand
          icon={
            <SpellCheck2 className="h-6 w-6" />
          }
          label="Spelling"
          onClick={onSpellCheck}
          disabled={!onSpellCheck}
        />

        <LargeCommand
          icon={<Search className="h-6 w-6" />}
          label="Find"
          onClick={onSearch}
        />
      </RibbonGroup>

      <RibbonGroup label="Comments">
        <LargeCommand
          icon={
            <MessageSquare className="h-6 w-6" />
          }
          label="Comment"
          onClick={onComments}
          disabled={!onComments}
        />
      </RibbonGroup>
    </div>
  );
}

function ViewRibbon({
  layout,
  canvasPreset,
  onChangeCanvas,
  onToggleLayout,
  onZoomIn,
  onZoomOut,
  onToggleRuler,
  onToggleGrid,
  onFullScreen,
}: {
  layout: "single" | "double";
  canvasPreset: CanvasPreset;
  onChangeCanvas: (preset: CanvasPreset) => void;
  onToggleLayout: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleRuler?: () => void;
  onToggleGrid?: () => void;
  onFullScreen?: () => void;
}) {
  return (
    <div className="flex min-w-max items-stretch px-2 py-2">
      <RibbonGroup label="Canvas">
        <label className="flex h-[58px] min-w-[120px] flex-col justify-center gap-1 px-2 text-[11px] font-semibold text-slate-700">
          View as
          <select value={canvasPreset} onChange={(event) => onChangeCanvas(event.target.value as CanvasPreset)} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs">
            <option value="WEB">Web</option>
            <option value="STUDENT">Student Dashboard</option>
            <option value="TEACHER">Teacher Dashboard</option>
            <option value="A3">A3</option>
            <option value="A4">A4</option>
            <option value="A5">A5</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </label>
      </RibbonGroup>
      <RibbonGroup label="Page View">
        <LargeCommand
          icon={<Columns3 className="h-6 w-6" />}
          label={
            layout === "double"
              ? "Single Column"
              : "Two Columns"
          }
          onClick={onToggleLayout}
        />

        <LargeCommand
          icon={<Ruler className="h-6 w-6" />}
          label="Ruler"
          onClick={onToggleRuler}
          disabled={!onToggleRuler}
        />

        <LargeCommand
          icon={<Grid3X3 className="h-6 w-6" />}
          label="Gridlines"
          onClick={onToggleGrid}
          disabled={!onToggleGrid}
        />
      </RibbonGroup>

      <RibbonGroup label="Zoom">
        <LargeCommand
          icon={<ZoomOut className="h-6 w-6" />}
          label="Zoom Out"
          onClick={onZoomOut}
          disabled={!onZoomOut}
        />

        <LargeCommand
          icon={<ZoomIn className="h-6 w-6" />}
          label="Zoom In"
          onClick={onZoomIn}
          disabled={!onZoomIn}
        />
      </RibbonGroup>

      <RibbonGroup label="Window">
        <LargeCommand
          icon={<Maximize2 className="h-6 w-6" />}
          label="Full Screen"
          onClick={onFullScreen}
          disabled={!onFullScreen}
        />
      </RibbonGroup>
    </div>
  );
}

function RibbonGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[76px] shrink-0 flex-col border-r border-slate-200 px-2 last:border-r-0">
      <div className="flex min-h-[58px] items-center gap-1">
        {children}
      </div>

      <p className="mt-auto pb-0.5 text-center text-[10px] font-semibold text-slate-400">
        {label}
      </p>
    </div>
  );
}

function LargeCommand({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={largeCommand}
      title={label}
    >
      {icon}
      <span className="max-w-20 truncate">
        {label}
      </span>
    </button>
  );
}

function SmallCommand({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-[22px] items-center gap-1.5 rounded px-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
      title={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function FormatButton({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

function DropdownPanel({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute top-full z-[100] mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl ${className}`}
    >
      {children}
    </div>
  );
}

function DropdownButton({
  icon,
  label,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
    >
      {icon ? <span className="text-slate-500">{icon}</span> : null}
      <span>{label}</span>
    </button>
  );
}
function styleValue(
  type: ContentBlockType,
): ContentBlockType {
  if (
    type === "heading" ||
    type === "heading3" ||
    type === "subheading" ||
    type === "quote" ||
    type === "caption" ||
    type === "callout"
  ) {
    return type;
  }

  return "paragraph";
}
