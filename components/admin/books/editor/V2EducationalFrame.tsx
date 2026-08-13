"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import V2Frame from "@/components/admin/books/editor/V2Frame";
import V2EducationalButtonVisual, {
  getV2EducationalButtonPresentation,
  V2EducationalPreviewAction,
} from "@/components/content/v2/V2EducationalButtonVisual";
import type { ContentBlock } from "@/lib/content-document";
import type {
  LayoutV2Frame,
  LayoutV2FrameGeometry,
} from "@/lib/content-layout-v2";

type Props = {
  frame: LayoutV2Frame;
  block?: ContentBlock;
  scale: number;
  selectedFrameId: string | null;
  renderFrame: (frame: LayoutV2Frame, frames: LayoutV2Frame[]) => ReactNode;
  onSelectFrame: (frameId: string) => void;
  onCommitGeometry: (
    frameId: string,
    geometry: LayoutV2FrameGeometry,
    parentId?: string,
  ) => void;
  onDeleteFrame?: (frameId: string, parentId?: string) => void;
  onDraftGeometryChange?: (
    frameId: string,
    geometry: LayoutV2FrameGeometry | null,
    parentId?: string,
  ) => void;
  onDropFrame?: (frameId: string, containerId: string) => void;
  onPayloadChange?: (frameId: string, payload: Record<string, unknown>) => void;
  onBlockChange?: (block: ContentBlock) => void;
  previewContent?: ReactNode;
};

const BUTTON_WIDTH = 230;
const BUTTON_HEIGHT = 58;
const EDITOR_WIDTH = 440;
const EDITOR_HEIGHT = 300;

export default function V2EducationalFrame({
  frame,
  block,
  scale,
  selectedFrameId,
  renderFrame,
  onSelectFrame,
  onCommitGeometry,
  onDeleteFrame,
  onDraftGeometryChange,
  onBlockChange,
  previewContent,
}: Props) {
  const presentation = getV2EducationalButtonPresentation(frame, block);
  const savedText = getEducationalMatter(block);
  const children = useMemo(
    () => [...(frame.children ?? [])].sort((a, b) => a.zIndex - b.zIndex),
    [frame.children],
  );

  const [editing, setEditing] = useState(() => savedText.trim() === "");
  const [draftText, setDraftText] = useState(() => savedText);
  const [message, setMessage] = useState("");
  const [pendingCollapseText, setPendingCollapseText] = useState<string | null>(null);

  const parentSelected = selectedFrameId === frame.id;

  useEffect(() => {
    if (!editing) return;
    if (frame.width >= EDITOR_WIDTH && frame.height >= EDITOR_HEIGHT) return;

    onCommitGeometry(frame.id, {
      x: frame.x,
      y: frame.y,
      width: Math.max(EDITOR_WIDTH, frame.width),
      height: Math.max(EDITOR_HEIGHT, frame.height),
    });
  }, [
    editing,
    frame.id,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    onCommitGeometry,
  ]);

  /*
   * Save text first. Collapse only after the updated block comes back
   * through props so the geometry update cannot overwrite the text update.
   */
  useEffect(() => {
    if (pendingCollapseText === null) return;
    if (savedText !== pendingCollapseText) return;

    onCommitGeometry(frame.id, {
      x: frame.x,
      y: frame.y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
    });

    setPendingCollapseText(null);
  }, [
    pendingCollapseText,
    savedText,
    frame.id,
    frame.x,
    frame.y,
    onCommitGeometry,
  ]);

  function openEditor() {
    setDraftText(getEducationalMatter(block));
    setMessage("");
    setEditing(true);
    onSelectFrame(frame.id);
  }

  function cancelEditor() {
    setDraftText(getEducationalMatter(block));
    setMessage("");
    setEditing(false);
    setPendingCollapseText(null);

    onCommitGeometry(frame.id, {
      x: frame.x,
      y: frame.y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
    });
  }

  function saveEditor() {
    const value = draftText.trim();

    if (!value && children.length === 0) {
      setMessage("Type content or insert Image, Video, or Table before saving.");
      return;
    }

    if (!block || !onBlockChange) {
      setMessage("This educational content cannot be edited here.");
      return;
    }

    onBlockChange(updateEducationalMatter(block, value));
    setPendingCollapseText(value);
    setMessage("");
    setEditing(false);
  }

  if (editing) {
    return (
      <div
        data-v2-educational-editor
        tabIndex={-1}
        className="flex h-full w-full flex-col overflow-hidden rounded-xl border-2 border-indigo-400 bg-white shadow-xl"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            onSelectFrame(frame.id);
          }
        }}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-b border-indigo-100 bg-indigo-50 px-3 py-2"
          onPointerDown={(event) => {
            event.stopPropagation();
            onSelectFrame(frame.id);
          }}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-indigo-950">
              {presentation.label}
            </p>
            <p className="mt-0.5 text-[11px] text-indigo-600">
              Type text, then use the top Insert ribbon for Image, Video, or Table.
            </p>
          </div>
          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-indigo-600 shadow-sm">
            Editing
          </span>
        </div>

        <div className="grid min-h-0 flex-1 grid-rows-[100px_minmax(0,1fr)] gap-2 p-2">
          <textarea
            autoFocus
            aria-label={`${presentation.label} content`}
            value={draftText}
            onPointerDown={(event) => {
              event.stopPropagation();
              onSelectFrame(frame.id);
            }}
            onFocus={() => onSelectFrame(frame.id)}
            onChange={(event) => {
              setDraftText(event.target.value);
              if (message) setMessage("");
            }}
            placeholder={`Type or paste ${presentation.label} matter here...`}
            className="h-full w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />

          <div
            data-v2-educational-mini-canvas
            className="relative min-h-0 overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) {
                event.stopPropagation();
                onSelectFrame(frame.id);
              }
            }}
          >
            {!children.length ? (
              <div className="pointer-events-none absolute inset-0 grid place-items-center px-4 text-center text-[11px] text-slate-400">
                Insert Image, Video, or Table from the top Insert ribbon.
              </div>
            ) : null}

            {children.map((child) => (
              <V2Frame
                key={child.id}
                frame={child}
                pageWidth={Math.max(24, frame.width - 16)}
                pageHeight={Math.max(24, frame.height - 150)}
                scale={scale}
                selected={selectedFrameId === child.id}
                parentId={frame.id}
                onSelect={onSelectFrame}
                onCommitGeometry={onCommitGeometry}
                onDelete={onDeleteFrame}
                onDraftGeometryChange={onDraftGeometryChange}
                renderChildren={(visualChild) => renderFrame(visualChild, children)}
              />
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-3 py-2">
          {message ? (
            <p role="alert" className="mb-2 text-xs font-semibold text-rose-700">
              {message}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-500">
              {children.length} inserted object{children.length === 1 ? "" : "s"}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={cancelEditor}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={saveEditor}
                className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full"
      data-v2-educational-collapsed
      onDoubleClick={(event) => {
        event.stopPropagation();
        openEditor();
      }}
    >
      <div className="pointer-events-none h-full w-full">
        <V2EducationalButtonVisual
          frame={frame}
          block={block}
          subtitle=""
          openable={false}
        />
      </div>

      {parentSelected ? (
        <div className="absolute right-1 top-1 z-30 flex items-center gap-1">
          <button
            type="button"
            data-v2-educational-edit
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              openEditor();
            }}
            className="rounded-md bg-white px-2 py-1 text-[10px] font-bold text-indigo-700 shadow hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Edit
          </button>

          <V2EducationalPreviewAction
            frame={frame}
            block={block}
            content={renderPreviewMatter(
              block,
              frame,
              children,
              renderFrame,
              previewContent,
            )}
          />
        </div>
      ) : null}
    </div>
  );
}

function getEducationalMatter(block?: ContentBlock) {
  if (!block) return "";

  if (block.type === "educationalObject") {
    return typeof block.text === "string" ? block.text : "";
  }

  const record = block as unknown as Record<string, unknown>;
  return typeof record.text === "string" ? record.text : "";
}

function updateEducationalMatter(
  block: ContentBlock,
  value: string,
): ContentBlock {
  if (block.type === "educationalObject") {
    return {
      ...block,
      text: value,
    };
  }

  return {
    ...(block as unknown as Record<string, unknown>),
    text: value,
  } as unknown as ContentBlock;
}

function renderPreviewMatter(
  block: ContentBlock | undefined,
  parent: LayoutV2Frame,
  children: LayoutV2Frame[],
  renderFrame: (frame: LayoutV2Frame, frames: LayoutV2Frame[]) => ReactNode,
  fallback: ReactNode,
) {
  if (!block) return fallback;

  const text = getEducationalMatter(block);
  const previewWidth = Math.max(260, Math.min(720, parent.width || 440));
  const childCanvasHeight = children.length
    ? Math.max(
        140,
        Math.min(
          420,
          children.reduce(
            (max, child) => Math.max(max, child.y + child.height + 12),
            0,
          ),
        ),
      )
    : 0;

  return (
    <div className="space-y-3 text-sm leading-6 text-slate-700">
      {text ? (
        <div className="whitespace-pre-wrap">{text}</div>
      ) : children.length === 0 ? (
        <div className="text-slate-500">No content has been added yet.</div>
      ) : null}

      {children.length ? (
        <div
          className="relative overflow-hidden bg-transparent"
          style={{ width: "100%", maxWidth: previewWidth, height: childCanvasHeight }}
        >
          {children.map((child) => {
            const contentRight = Math.max(
              parent.width,
              ...children.map((entry) => entry.x + entry.width),
            );
            const availableWidth = Math.max(1, previewWidth - 24);
            const scaleX = Math.min(1, availableWidth / Math.max(1, contentRight));
            const previewChild = {
              ...child,
              x: child.x * scaleX,
              y: child.y * scaleX,
              width: child.width * scaleX,
              height: child.height * scaleX,
            };

            return (
              <div
                key={child.id}
                className="absolute overflow-visible"
                style={{
                  left: previewChild.x,
                  top: previewChild.y,
                  width: previewChild.width,
                  height: previewChild.height,
                  maxWidth: availableWidth,
                  zIndex: child.zIndex,
                }}
              >
                <div
                  className="h-full w-full max-w-full overflow-hidden"
                  style={{ transformOrigin: "left top" }}
                >
                  {renderFrame(previewChild, children)}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}