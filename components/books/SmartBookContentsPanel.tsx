"use client";

import { ChevronDown, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import type { SmartBookContentsNode } from "@/lib/smart-book-contents";

const rowStyle: Record<SmartBookContentsNode["kind"], string> = {
  FRONT_MATTER: "bg-slate-100 font-bold text-slate-900",
  PART: "bg-blue-50 font-bold text-blue-950",
  UNIT: "bg-indigo-50 font-semibold text-indigo-950",
  CHAPTER: "bg-white font-semibold text-slate-900",
  MODULE: "bg-slate-50 text-slate-800",
  TOPIC: "bg-slate-50 text-slate-700",
  EXERCISE: "bg-amber-50 text-amber-950",
};

export default function SmartBookContentsPanel({
  nodes,
  onClose,
  onNavigate,
}: {
  nodes: SmartBookContentsNode[];
  onClose: () => void;
  onNavigate: (page: number) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderNode(item: SmartBookContentsNode) {
    const hasChildren = item.children.length > 0;
    const isExpanded = expanded.has(item.id);
    return (
      <div key={`${item.kind}:${item.id}`} data-contents-level={item.kind}>
        <div className={`flex items-center gap-2 border-b border-slate-200/80 px-4 py-3 ${rowStyle[item.kind]}`}>
          {hasChildren ? (
            <button type="button" onClick={() => toggle(item.id)} aria-expanded={isExpanded} aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.title}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-white/80">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : <span className="h-8 w-8 shrink-0" aria-hidden="true" />}
          <button type="button" disabled={item.startPage === null} onClick={() => { if (item.startPage !== null) { onNavigate(item.startPage); onClose(); } }} className="min-w-0 flex-1 text-left disabled:cursor-default disabled:opacity-80">
            <span className="block truncate">{item.title}</span>
            {item.startPage !== null ? <span className="mt-0.5 block text-xs font-normal opacity-70">Page {item.startPage}</span> : null}
          </button>
        </div>
        {hasChildren && isExpanded ? item.children.map(renderNode) : null}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Book contents">
      <button type="button" aria-label="Close Contents" onClick={onClose} className="absolute inset-0 bg-slate-950/40" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-950">Contents</h2>
          <button type="button" onClick={onClose} aria-label="Close Contents" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 hover:bg-slate-50"><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          {nodes.length ? nodes.map(renderNode) : <p className="p-6 text-sm text-slate-500">Book contents are not available yet.</p>}
        </div>
      </aside>
    </div>
  );
}
