"use client";

import { useRef } from "react";
import type { PointerEvent, ReactNode } from "react";
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
export default function LayoutObjectFrame({ layout, enabled, selected, onChange, onArrange, onDuplicate, onDelete, children }: Props) {
  const start = useRef<{ x: number; y: number; layout: LayoutMetadata } | null>(null);
  if (!enabled) return <>{children}</>;

  const current = layout ?? { x: 0, y: 0, width: 640, height: 180, zIndex: 0, digital: { width: "content" as const, alignment: "left" as const, visibility: "all" as const } };
  const begin = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (current.locked || target.dataset.layoutHandle || target.closest('input, textarea, button, select, [contenteditable="true"], td, th')) return;
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

  return <div className={`relative ${selected ? "ring-2 ring-blue-500" : "ring-1 ring-transparent hover:ring-blue-200"}`} style={{ width: current.width, minHeight: current.height, transform: `translate(${current.x}px, ${current.y}px)`, zIndex: current.zIndex, cursor: current.locked ? "default" : "move" }} onPointerDown={begin} onPointerMove={move} onPointerUp={end}>
    {children}
    {selected ? <div className="absolute -top-9 right-0 z-20 flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-[10px] shadow-sm" onPointerDown={(event) => event.stopPropagation()}>
      <button type="button" onClick={() => onArrange?.(1)} className="rounded px-1.5 py-1 font-semibold text-slate-600 hover:bg-slate-100" title="Bring forward">Forward</button>
      <button type="button" onClick={() => onArrange?.(-1)} className="rounded px-1.5 py-1 font-semibold text-slate-600 hover:bg-slate-100" title="Send backward">Back</button>
      <button type="button" onClick={onDuplicate} className="rounded px-1.5 py-1 font-semibold text-slate-600 hover:bg-slate-100" title="Duplicate object">Duplicate</button>
      <button type="button" onClick={() => onChange({ ...current, locked: !current.locked })} className="rounded px-1.5 py-1 font-semibold text-slate-600 hover:bg-slate-100">{current.locked ? "Unlock" : "Lock"}</button>
      <button type="button" onClick={onDelete} className="rounded px-1.5 py-1 font-semibold text-red-600 hover:bg-red-50" title="Delete object">Delete</button>
    </div> : null}
    {!current.locked ? <div data-layout-handle="resize" onPointerDown={resize} className="absolute bottom-[-5px] right-[-5px] h-3 w-3 cursor-nwse-resize rounded-sm bg-blue-600" aria-label="Resize object" /> : null}
  </div>;
}
