"use client";

import { useLayoutEffect, useRef, type KeyboardEvent } from "react";

export function normalizeV2TableCells(payload: Record<string, unknown>, rows: number, columns: number) {
  const existing = Array.isArray(payload.cells) ? payload.cells.map((cell) => typeof cell === "string" ? cell : "") : [];
  return Array.from({ length: rows * columns }, (_, index) => existing[index] ?? "");
}

export function updateV2TableCell(payload: Record<string, unknown>, rows: number, columns: number, index: number, value: string) {
  const cells = normalizeV2TableCells(payload, rows, columns);
  cells[index] = value;
  return { ...payload, rows, columns, cells };
}

export function nextV2TableCellIndex(index: number, total: number, backwards = false) {
  return Math.max(0, Math.min(total - 1, index + (backwards ? -1 : 1)));
}

export function shouldSyncV2TableCellDom(next: string, dom: string, focused: boolean) {
  return !focused && next !== dom;
}

export default function V2TableVisual({ payload, onChange }: { payload: Record<string, unknown>; onChange?: (payload: Record<string, unknown>) => void }) {
  const rows = Math.max(1, Math.min(20, Number(payload.rows) || 2));
  const columns = Math.max(1, Math.min(12, Number(payload.columns) || 2));
  const cells = normalizeV2TableCells(payload, rows, columns);
  const cellRefs = useRef(new Map<number, HTMLTableCellElement>());
  const activeCellIndex = useRef<number | null>(null);
  const cellsRef = useRef(cells);

  useLayoutEffect(() => {
    const activeIndex = activeCellIndex.current;
    cellsRef.current = activeIndex === null
      ? cells
      : cells.map((value, index) => index === activeIndex ? cellsRef.current[index] ?? value : value);
    for (const [index, element] of cellRefs.current) {
      if (shouldSyncV2TableCellDom(cells[index] ?? "", element.textContent ?? "", activeCellIndex.current === index)) {
        element.textContent = cells[index] ?? "";
      }
    }
  }, [cells]);

  const updateCell = (index: number, value: string) => {
    const next = [...cellsRef.current];
    next[index] = value;
    cellsRef.current = next;
    onChange?.({ ...payload, rows, columns, cells: next });
  };
  const moveTab = (event: KeyboardEvent<HTMLElement>, index: number) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const next = nextV2TableCellIndex(index, rows * columns, event.shiftKey);
    event.currentTarget.closest("[data-v2-table]")?.querySelector<HTMLElement>(`[data-v2-table-cell="${next}"]`)?.focus();
  };
  return <div data-v2-table className="h-full w-full overflow-auto bg-white"><table className="min-w-full border-collapse text-sm"><tbody>{Array.from({ length: rows }, (_, row) => <tr key={row}>{Array.from({ length: columns }, (_, column) => { const index = row * columns + column; return <td key={index} ref={(element) => { if (element) cellRefs.current.set(index, element); else cellRefs.current.delete(index); }} data-v2-table-cell={index} contentEditable suppressContentEditableWarning role="textbox" dir="ltr" spellCheck onFocus={() => { activeCellIndex.current = index; }} onBlur={(event) => { activeCellIndex.current = null; updateCell(index, event.currentTarget.textContent ?? ""); }} onInput={(event) => updateCell(index, event.currentTarget.textContent ?? "")} onKeyDown={(event) => moveTab(event, index)} className="min-w-16 border border-slate-300 p-2 align-top outline-none focus:bg-indigo-50" style={{ direction: "ltr", writingMode: "horizontal-tb" }} />; })}</tr>)}</tbody></table></div>;
}
