"use client";

import { useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";

import {
  clampV2FrameGeometry,
  type LayoutV2Frame,
  type LayoutV2FrameGeometry,
} from "@/lib/content-layout-v2";

type Interaction = {
  kind: "move" | "resize";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  geometry: LayoutV2FrameGeometry;
};

type Props = {
  frame: LayoutV2Frame;
  pageWidth: number;
  pageHeight: number;
  scale: number;
  selected: boolean;
  renderChildren: (frame: LayoutV2Frame) => ReactNode;
  onSelect: (frameId: string) => void;
  onCommitGeometry: (frameId: string, geometry: LayoutV2FrameGeometry, parentId?: string) => void;
  onDraftGeometryChange?: (frameId: string, geometry: LayoutV2FrameGeometry | null, parentId?: string) => void;
  parentId?: string;
};

export default function V2Frame({
  frame,
  pageWidth,
  pageHeight,
  scale,
  selected,
  renderChildren,
  onSelect,
  onCommitGeometry,
  onDraftGeometryChange,
  parentId,
}: Props) {
  const [draftGeometry, setDraftGeometry] = useState<LayoutV2FrameGeometry | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const geometry = draftGeometry ?? frame;

  const startInteraction = (event: PointerEvent<HTMLButtonElement>, kind: Interaction["kind"]) => {
    event.preventDefault();
    event.stopPropagation();
    if (frame.locked) return;
    onSelect(frame.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      kind,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      geometry: frame,
    };
    setDraftGeometry(frame);
    onDraftGeometryChange?.(frame.id, frame, parentId);
  };

  const moveInteraction = (event: PointerEvent<HTMLButtonElement>) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    const dx = (event.clientX - interaction.startClientX) / Math.max(0.01, scale);
    const dy = (event.clientY - interaction.startClientY) / Math.max(0.01, scale);
    const next = interaction.kind === "move"
      ? {
          ...interaction.geometry,
          x: interaction.geometry.x + dx,
          y: interaction.geometry.y + dy,
        }
      : (() => {
          let width = interaction.geometry.width + dx;
          let height = interaction.geometry.height + dy;
          if (frame.aspectLocked || event.shiftKey) {
            const ratio = interaction.geometry.width / Math.max(1, interaction.geometry.height);
            if (Math.abs(dx) >= Math.abs(dy)) height = width / ratio;
            else width = height * ratio;
          }
          return { ...interaction.geometry, width, height };
        })();
    const bounded = clampV2FrameGeometry(next, pageWidth, pageHeight);
    setDraftGeometry(bounded);
    onDraftGeometryChange?.(frame.id, bounded, parentId);
  };

  const endInteraction = (event: PointerEvent<HTMLButtonElement>) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    const next = draftGeometry ?? interaction.geometry;
    onCommitGeometry(frame.id, clampV2FrameGeometry(next, pageWidth, pageHeight), parentId);
    interactionRef.current = null;
    setDraftGeometry(null);
    onDraftGeometryChange?.(frame.id, null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA")) return;
    if (frame.locked || !selected) return;
    const step = event.shiftKey ? 10 : 1;
    const delta = event.key === "ArrowLeft"
      ? { x: -step, y: 0 }
      : event.key === "ArrowRight"
        ? { x: step, y: 0 }
        : event.key === "ArrowUp"
          ? { x: 0, y: -step }
          : event.key === "ArrowDown"
            ? { x: 0, y: step }
            : null;
    if (!delta) return;
    event.preventDefault();
    onCommitGeometry(frame.id, clampV2FrameGeometry({ ...geometry, x: geometry.x + delta.x, y: geometry.y + delta.y }, pageWidth, pageHeight), parentId);
  };

  return (
    <div
      role="group"
      data-v2-frame-id={frame.id}
      draggable={!parentId && ["TEXT", "IMAGE", "VIDEO", "TABLE"].includes(frame.type)}
      onDragStart={(event) => {
        if (parentId) return;
        event.dataTransfer.setData("application/x-v2-frame", frame.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      aria-label={`${frame.type} frame`}
      tabIndex={selected ? 0 : -1}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(frame.id);
      }}
      onKeyDown={handleKeyDown}
      className={`absolute box-border overflow-hidden outline-none ${
        selected
          ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-white"
          : "ring-1 ring-transparent hover:ring-blue-300"
      }`}
      style={{
        left: `${geometry.x}px`,
        top: `${geometry.y}px`,
        width: `${geometry.width}px`,
        height: `${geometry.height}px`,
        zIndex: frame.zIndex,
        visibility: frame.hidden ? "hidden" : "visible",
      }}
    >
      <div className="h-full w-full overflow-hidden">
        {renderChildren({ ...frame, ...geometry })}
      </div>

      {selected && !frame.locked ? (
        <>
          <button
            type="button"
            aria-label="Move frame"
            title="Move frame"
            data-v2-frame-handle="move"
            onPointerDown={(event) => startInteraction(event, "move")}
            onPointerMove={moveInteraction}
            onPointerUp={endInteraction}
            onPointerCancel={endInteraction}
            className="absolute left-1 top-1 z-10 h-4 w-4 cursor-move rounded-sm border border-white bg-blue-600/90 text-[9px] leading-none text-white shadow-sm"
          >
            ↕
          </button>
          <button
            type="button"
            aria-label="Resize frame"
            title="Resize frame"
            data-v2-frame-handle="resize"
            onPointerDown={(event) => startInteraction(event, "resize")}
            onPointerMove={moveInteraction}
            onPointerUp={endInteraction}
            onPointerCancel={endInteraction}
            className="absolute bottom-0 right-0 z-10 h-4 w-4 cursor-nwse-resize rounded-tl-sm border-l border-t border-white bg-blue-600/90 shadow-sm"
          />
        </>
      ) : null}
    </div>
  );
}
