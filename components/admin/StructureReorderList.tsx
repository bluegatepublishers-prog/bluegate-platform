"use client";

import { useState, useTransition } from "react";

export default function StructureReorderList({
  items,
  action,
}: {
  items: Array<{ id: string; label: string; meta: string }>;
  action: (orderedIds: string[]) => Promise<void>;
}) {
  const [ordered, setOrdered] = useState(items);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function persist(next: typeof ordered) {
    setOrdered(next);
    startTransition(async () => action(next.map((item) => item.id)));
  }

  function move(id: string, offset: -1 | 1) {
    const index = ordered.findIndex((item) => item.id === id);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  }

  return (
    <ol className={`divide-y rounded-xl border ${pending ? "opacity-70" : ""}`}>
      {ordered.map((item) => (
        <li
          key={item.id}
          draggable
          onDragStart={() => setDraggedId(item.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (!draggedId || draggedId === item.id) return;
            const source = ordered.findIndex((entry) => entry.id === draggedId);
            const target = ordered.findIndex((entry) => entry.id === item.id);
            const next = [...ordered];
            const [moved] = next.splice(source, 1);
            next.splice(target, 0, moved);
            setDraggedId(null);
            persist(next);
          }}
          className="flex min-w-0 items-center gap-3 bg-white p-3 first:rounded-t-xl last:rounded-b-xl"
        >
          <span className="cursor-grab text-xl text-slate-400" aria-hidden>⋮⋮</span>
          <div className="min-w-0 flex-1">
            <p className="break-words font-semibold">{item.label}</p>
            <p className="break-words text-xs text-slate-500">{item.meta}</p>
          </div>
          <button type="button" onClick={() => move(item.id, -1)} className="min-h-10 min-w-10 rounded-lg border" aria-label={`Move ${item.label} up`}>↑</button>
          <button type="button" onClick={() => move(item.id, 1)} className="min-h-10 min-w-10 rounded-lg border" aria-label={`Move ${item.label} down`}>↓</button>
        </li>
      ))}
    </ol>
  );
}
