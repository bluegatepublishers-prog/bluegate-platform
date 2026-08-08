"use client";

import { useRef } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import type { LayoutMetadata } from "@/lib/content-document";

type Props = {
  layout?: LayoutMetadata;
  enabled: boolean;
  selected?: boolean;
  onChange: (layout: LayoutMetadata) => void;
  onArrange?: (direction: -1 | 1) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  children: ReactNode;
};

/** Shared authoring interaction layer for non-manuscript objects. */
export default function LayoutObjectFrame({ layout, enabled, selected, onChange, onDelete, children }: Props) {
  const start = useRef<{ x: number; y: number; layout: LayoutMetadata } | null>(null);
  if (!enabled) return <>{children}</>;

  const current = layout ?? { x: 0, y: 0, width: 640, height: 180, zIndex: 0, digital: { width: "content" as const, alignment: "left" as const, visibility: "all" as const } };
  const isInteractiveTarget = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest('input, textarea, button, select, [contenteditable="true"], td, th'));
  const begin = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (current.locked || target.dataset.layoutHandle || isInteractiveTarget(target)) return;
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { x: event.clientX, y: event.clientY, layout: current };
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    onChange({ ...current, x: Math.max(0, start.current.layout.x + dx), y: Math.max(0, start.current.layout.y + dy) });
  };
  const end = () => { start.current = null; };
  const resize = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { x: event.clientX, y: event.clientY, layout: current };
    const moveResize = (moveEvent: globalThis.PointerEvent) => {
      if (!start.current) return;
      onChange({ ...current, width: Math.max(120, start.current.layout.width + moveEvent.clientX - start.current.x), height: Math.max(60, start.current.layout.height + moveEvent.clientY - start.current.y) });
    };
    const finish = () => { start.current = null; window.removeEventListener("pointermove", moveResize); window.removeEventListener("pointerup", finish); };
    window.addEventListener("pointermove", moveResize);
    window.addEventListener("pointerup", finish);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!selected || isInteractiveTarget(event.target)) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onDelete?.();
    }
  };

  return <div
    className={`relative ${selected ? "ring-2 ring-blue-500" : "ring-1 ring-transparent hover:ring-blue-200"}`}
    style={{ width: current.width, minHeight: current.height, transform: `translate(${current.x}px, ${current.y}px)`, zIndex: current.zIndex, cursor: current.locked ? "default" : "move" }}
    tabIndex={selected ? 0 : -1}
    onPointerDown={begin}
    onPointerMove={move}
    onPointerUp={end}
    onKeyDown={handleKeyDown}
  >
    {children}
    {!current.locked ? <div data-layout-handle="resize" onPointerDown={resize} className="absolute bottom-[-5px] right-[-5px] h-3 w-3 cursor-nwse-resize rounded-sm bg-blue-600" aria-label="Resize object" /> : null}
  </div>;
}
