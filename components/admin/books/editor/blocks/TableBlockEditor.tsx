"use client";

import { useEffect, useRef, useState } from "react";
import type { ContentBlock, RichTextSpan, TableBlock, TableCell, TableRow } from "@/lib/content-document";

type Selection = { rowIndex: number; startCellIndex: number; endCellIndex: number };

type Props = {
  block: TableBlock;
  onUpdatePatch: (patch: Partial<ContentBlock>) => void;
  onDeleteTable: () => void;
  showControls?: boolean;
  active?: boolean;
};

const field = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export default function TableBlockEditor({ block, onUpdatePatch, onDeleteTable, showControls = true, active = true }: Props) {
  const [selection, setSelection] = useState<Selection>({ rowIndex: 0, startCellIndex: 0, endCellIndex: 0 });
  const tableRef = useRef<HTMLDivElement>(null);
  const activeRow = block.rows[selection.rowIndex] ?? block.rows[0];
  const activeCell = activeRow?.cells[selection.startCellIndex];
  const headerRows = block.headerRows ?? (block.headerRow === false ? [] : [0]);
  const widths = normalizeWidths(block.columnWidths, columnCount(block));

  function patchTable(patch: Partial<TableBlock>) {
    onUpdatePatch(patch);
  }

  function updateCell(rowIndex: number, cellIndex: number, patch: Partial<TableCell>) {
    patchTable({ rows: block.rows.map((row, currentRow) => currentRow !== rowIndex ? row : {
      ...row,
      cells: row.cells.map((cell, currentCell) => currentCell === cellIndex ? { ...cell, ...patch } : cell),
    }) });
  }

  function insertRow(position: "above" | "below") {
    const columns = columnCount(block);
    const index = Math.min(block.rows.length, Math.max(0, selection.rowIndex + (position === "below" ? 1 : 0)));
    const rows = [...block.rows];
    rows.splice(index, 0, createRow(columns));
    patchTable({ rows, headerRows: headerRows.map((row) => row >= index ? row + 1 : row) });
    setSelection({ rowIndex: index, startCellIndex: 0, endCellIndex: 0 });
  }

  function deleteRow() {
    if (block.rows.length <= 1) return;
    const index = Math.min(block.rows.length - 1, Math.max(0, selection.rowIndex));
    const rows = block.rows.filter((_, current) => current !== index);
    const nextHeaders = headerRows.filter((row) => row !== index).map((row) => row > index ? row - 1 : row);
    patchTable({ rows, headerRows: nextHeaders, headerRow: nextHeaders.includes(0) });
    setSelection({ rowIndex: Math.max(0, index - 1), startCellIndex: 0, endCellIndex: 0 });
  }

  function insertColumn(direction: "left" | "right") {
    const index = Math.min(columnCount(block), Math.max(0, selection.startCellIndex + (direction === "right" ? 1 : 0)));
    patchTable({
      rows: block.rows.map((row) => ({ ...row, cells: insertCell(row.cells, index) })),
      columnWidths: insertWidth(widths, index),
    });
  }

  function deleteColumn() {
    const count = columnCount(block);
    if (count <= 1) return;
    const index = Math.min(count - 1, Math.max(0, selection.startCellIndex));
    patchTable({
      rows: block.rows.map((row) => ({ ...row, cells: deleteCell(row.cells, index) })),
      columnWidths: deleteWidth(widths, index),
    });
    setSelection((current) => ({ ...current, startCellIndex: Math.max(0, current.startCellIndex - (current.startCellIndex === index ? 1 : 0)), endCellIndex: Math.max(0, current.endCellIndex - (current.endCellIndex === index ? 1 : 0)) }));
  }

  function mergeCells() {
    if (selection.endCellIndex <= selection.startCellIndex) return;
    const row = block.rows[selection.rowIndex];
    if (!row) return;
    const chosen = row.cells.slice(selection.startCellIndex, selection.endCellIndex + 1);
    const first = chosen[0];
    if (!first) return;
    const spans = chosen.flatMap((cell, index) => index === 0 ? (cell.spans ?? [{ text: cell.text }]) : [{ text: " " }, ...(cell.spans ?? [{ text: cell.text }])]);
    const merged: TableCell = { ...first, text: chosen.map((cell) => cell.text).filter(Boolean).join(" "), spans, colSpan: chosen.reduce((sum, cell) => sum + (cell.colSpan ?? 1), 0) };
    patchTable({ rows: block.rows.map((current, index) => index === selection.rowIndex ? { ...current, cells: [...current.cells.slice(0, selection.startCellIndex), merged, ...current.cells.slice(selection.endCellIndex + 1)] } : current) });
    setSelection({ ...selection, endCellIndex: selection.startCellIndex });
  }

  function splitCell() {
    const row = block.rows[selection.rowIndex];
    const cell = row?.cells[selection.startCellIndex];
    const span = cell?.colSpan ?? 1;
    if (!row || !cell || span <= 1) return;
    const cells = [{ ...cell, colSpan: undefined }, ...Array.from({ length: span - 1 }, () => createCell(""))];
    patchTable({ rows: block.rows.map((current, index) => index === selection.rowIndex ? { ...current, cells: [...current.cells.slice(0, selection.startCellIndex), ...cells, ...current.cells.slice(selection.startCellIndex + 1)] } : current) });
  }

  function toggleHeaderRow() {
    const next = headerRows.includes(selection.rowIndex) ? headerRows.filter((row) => row !== selection.rowIndex) : [...headerRows, selection.rowIndex].sort((a, b) => a - b);
    patchTable({ headerRows: next, headerRow: next.includes(0) });
  }

  function resizeColumn(index: number, event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const container = tableRef.current;
    if (!container || index >= widths.length - 1) return;
    const startX = event.clientX;
    const startLeft = widths[index];
    const startRight = widths[index + 1];
    const move = (moveEvent: PointerEvent) => {
      const delta = (moveEvent.clientX - startX) / Math.max(1, container.getBoundingClientRect().width);
      const left = Math.min(startLeft + startRight - 0.1, Math.max(0.1, startLeft + delta));
      patchTable({ columnWidths: widths.map((width, current) => current === index ? left : current === index + 1 ? startLeft + startRight - left : width) });
    };
    const finish = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
  }

  function resizeRow(index: number, event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const firstHeight = block.rows[index]?.height ?? 56;
    const secondHeight = block.rows[index + 1]?.height ?? 56;
    const startY = event.clientY;
    const move = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientY - startY;
      const first = Math.max(28, firstHeight + delta);
      const second = Math.max(28, firstHeight + secondHeight - first);
      patchTable({ rows: block.rows.map((row, current) => current === index ? { ...row, height: Math.round(first) } : current === index + 1 ? { ...row, height: Math.round(second) } : row) });
    };
    const finish = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
  }

  const totalHeight = block.rows.reduce((sum, row) => sum + (row.height ?? 56), 0);
  const rowBoundaries = block.rows.slice(0, -1).map((_, index) => block.rows.slice(0, index + 1).reduce((sum, row) => sum + (row.height ?? 56), 0));

  return (
    <div ref={tableRef} className={active ? "relative space-y-3 rounded-2xl border border-blue-100 bg-blue-50/30 p-3" : "relative"}>
      {showControls ? (
      <>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 p-1.5 text-xs shadow-sm" onPointerDown={(event) => event.stopPropagation()}>
        <span className="px-2 font-bold text-slate-700">Table</span>
        <details className="relative">
          <summary className={menuButton}>Table <span aria-hidden="true">▾</span></summary>
          <div className={menuPanel}>
            <button type="button" className={button} onClick={() => insertRow("above")}>Add row above</button>
            <button type="button" className={button} onClick={() => insertRow("below")}>Add row below</button>
            <button type="button" className={button} onClick={() => insertColumn("left")}>Add column left</button>
            <button type="button" className={button} onClick={() => insertColumn("right")}>Add column right</button>
            <button type="button" className={button} onClick={deleteRow} disabled={block.rows.length <= 1}>Delete row</button>
            <button type="button" className={button} onClick={deleteColumn} disabled={columnCount(block) <= 1}>Delete column</button>
            <button type="button" className="rounded-lg px-2 py-1 text-left font-semibold text-rose-700 hover:bg-rose-50" onClick={onDeleteTable}>Delete table</button>
          </div>
        </details>
        <details className="relative">
          <summary className={menuButton}>Cell <span aria-hidden="true">▾</span></summary>
          <div className={menuPanel}>
            <button type="button" className={button} onClick={mergeCells} disabled={selection.endCellIndex <= selection.startCellIndex}>Merge cells</button>
            <button type="button" className={button} onClick={splitCell} disabled={(activeCell?.colSpan ?? 1) <= 1}>Split cell</button>
            <button type="button" className={button} onClick={toggleHeaderRow}>{headerRows.includes(selection.rowIndex) ? "Unset header" : "Set header"}</button>
            <select className={field} value={activeCell?.background ?? "none"} onChange={(event) => updateCell(selection.rowIndex, selection.startCellIndex, { background: event.target.value as TableCell["background"] })} aria-label="Cell background">
              <option value="none">No fill</option><option value="muted">Muted</option><option value="accent">Accent</option><option value="highlight">Highlight</option>
            </select>
          </div>
        </details>
        <details className="relative">
          <summary className={menuButton}>Borders <span aria-hidden="true">▾</span></summary>
          <div className={menuPanel}>
            <select className={field} value={block.tableBorderStyle ?? "all"} onChange={(event) => patchTable({ tableBorderStyle: event.target.value as TableBlock["tableBorderStyle"] })} aria-label="Table borders">
              <option value="all">All borders</option><option value="outer">Outer border</option><option value="inner">Inner borders</option><option value="none">No border</option>
            </select>
          </div>
        </details>
        <details className="relative">
          <summary className={menuButton}>Align <span aria-hidden="true">▾</span></summary>
          <div className={menuPanel}>
            <select className={field} value={activeCell?.horizontalAlign ?? "left"} onChange={(event) => updateCell(selection.rowIndex, selection.startCellIndex, { horizontalAlign: event.target.value as TableCell["horizontalAlign"] })} aria-label="Cell horizontal alignment">
              <option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option>
            </select>
            <select className={field} value={activeCell?.verticalAlign ?? "top"} onChange={(event) => updateCell(selection.rowIndex, selection.startCellIndex, { verticalAlign: event.target.value as TableCell["verticalAlign"] })} aria-label="Cell vertical alignment">
              <option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option>
            </select>
          </div>
        </details>
        <span className="ml-auto px-2 text-slate-500">Cell {selection.rowIndex + 1}:{selection.startCellIndex + 1}</span>
      </div>

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs" onMouseDown={(event) => event.preventDefault()}>
        <button type="button" className={button} onClick={() => document.execCommand("bold", false)}>Bold</button>
        <button type="button" className={button} onClick={() => document.execCommand("italic", false)}>Italic</button>
        <button type="button" className={button} onClick={() => document.execCommand("underline", false)}>Underline</button>
      </div>
      </>
      ) : null}

      <div className="relative overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-sm" style={{ minHeight: block.layout?.height ? `${Math.max(80, block.layout.height - 80)}px` : undefined }}>
          <colgroup>{widths.map((width, index) => <col key={index} style={{ width: `${width * 100}%` }} />)}</colgroup>
          <tbody>
            {block.rows.map((row, rowIndex) => {
              return <tr key={row.id} style={{ height: row.height ? `${row.height}px` : undefined }}>
                {row.cells.map((cell, cellIndex) => {
                  const isHeader = headerRows.includes(rowIndex) || cell.header === true;
                  const selected = active && rowIndex === selection.rowIndex && cellIndex >= selection.startCellIndex && cellIndex <= selection.endCellIndex;
                  const CellTag = isHeader ? "th" : "td";
                  return <CellTag key={cell.id} colSpan={cell.colSpan} rowSpan={cell.rowSpan} className={`${borderClass(block.tableBorderStyle, rowIndex, cellIndex, block.rows.length, row.cells.length)} ${backgroundClass(cell.background)} ${selected ? "ring-2 ring-inset ring-blue-500" : ""} p-0`} style={{ textAlign: cell.horizontalAlign ?? "left", verticalAlign: cell.verticalAlign ?? "top" }} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setSelection((current) => ({ rowIndex, startCellIndex: event.shiftKey && current.rowIndex === rowIndex ? Math.min(current.startCellIndex, cellIndex) : cellIndex, endCellIndex: event.shiftKey && current.rowIndex === rowIndex ? Math.max(current.startCellIndex, cellIndex) : cellIndex })); }}>
                    <CellEditor cell={cell} header={isHeader} onChange={(patch) => updateCell(rowIndex, cellIndex, patch)} onNavigate={(direction) => navigateCell(rowIndex, cellIndex, direction, block, setSelection)} />
                  </CellTag>;
                })}
              </tr>;
            })}
          </tbody>
        </table>
        {rowBoundaries.map((boundary, index) => <div key={index} data-layout-handle="row-resize" className="absolute left-0 right-0 z-10 h-2 -translate-y-1 cursor-row-resize" style={{ top: `${boundary / Math.max(1, totalHeight) * 100}%` }} onPointerDown={(event) => resizeRow(index, event)} />)}
        {widths.slice(0, -1).map((_, index) => <div key={index} data-layout-handle="column-resize" className="absolute top-0 bottom-0 z-10 w-2 -translate-x-1 cursor-col-resize" style={{ left: `${widths.slice(0, index + 1).reduce((sum, value) => sum + value, 0) * 100}%` }} onPointerDown={(event) => resizeColumn(index, event)} />)}
      </div>
    </div>
  );
}

function CellEditor({ cell, header, onChange, onNavigate }: { cell: TableCell; header: boolean; onChange: (patch: Partial<TableCell>) => void; onNavigate: (direction: -1 | 1) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const editing = useRef(false);
  useEffect(() => {
    if (!ref.current || editing.current) return;
    ref.current.innerHTML = spansToHtml(cell.spans?.length ? cell.spans : [{ text: cell.text }]);
  }, [cell.spans, cell.text]);
  return <div ref={ref} contentEditable suppressContentEditableWarning role={header ? "columnheader" : "cell"} className="min-h-12 w-full whitespace-pre-wrap break-words px-3 py-3 outline-none" onPointerDown={(event) => event.stopPropagation()} onFocus={() => { editing.current = true; }} onBlur={() => { editing.current = false; }} onKeyDown={(event) => { if (event.key === "Tab") { event.preventDefault(); onNavigate(event.shiftKey ? -1 : 1); } }} onInput={(event) => { const spans = spansFromElement(event.currentTarget); onChange({ text: spans.map((span) => span.text).join(""), spans }); }} />;
}

function navigateCell(rowIndex: number, cellIndex: number, direction: -1 | 1, block: TableBlock, setSelection: (selection: Selection) => void) {
  const next = cellIndex + direction;
  if (next >= 0 && next < (block.rows[rowIndex]?.cells.length ?? 0)) return setSelection({ rowIndex, startCellIndex: next, endCellIndex: next });
  const nextRow = rowIndex + direction;
  if (nextRow >= 0 && nextRow < block.rows.length) setSelection({ rowIndex: nextRow, startCellIndex: direction > 0 ? 0 : block.rows[nextRow].cells.length - 1, endCellIndex: direction > 0 ? 0 : block.rows[nextRow].cells.length - 1 });
}

function columnCount(block: TableBlock) { return Math.max(1, block.rows.reduce((max, row) => Math.max(max, row.cells.reduce((sum, cell) => sum + (cell.colSpan ?? 1), 0)), 0)); }
function createCell(text: string): TableCell { return { id: createId("cell"), text, spans: [{ text }] }; }
function createRow(columns: number): TableRow { return { id: createId("row"), cells: Array.from({ length: columns }, () => createCell("")) }; }
function insertCell(cells: TableCell[], index: number) { const next = cells.map((cell) => ({ ...cell })); if (index >= next.length) next.push(createCell("")); else next.splice(index, 0, createCell("")); return next; }
function deleteCell(cells: TableCell[], index: number) { if (cells.length <= 1) return cells; const next = cells.map((cell) => ({ ...cell })); if ((next[index]?.colSpan ?? 1) > 1) next[index] = { ...next[index], colSpan: (next[index].colSpan ?? 1) - 1 }; else next.splice(Math.min(index, next.length - 1), 1); return next.length ? next : [createCell("")]; }
function normalizeWidths(value: number[] | undefined, count: number) { const raw = Array.from({ length: count }, (_, index) => Math.max(0.05, value?.[index] ?? 1)); const total = raw.reduce((sum, item) => sum + item, 0); return raw.map((item) => item / total); }
function insertWidth(widths: number[], index: number) { const next = [...widths]; next.splice(Math.min(index, next.length), 0, next[Math.min(index, next.length - 1)] ?? 1); return normalizeWidths(next, next.length); }
function deleteWidth(widths: number[], index: number) { if (widths.length <= 1) return widths; const next = [...widths]; next.splice(Math.min(index, next.length - 1), 1); return normalizeWidths(next, next.length); }
function borderClass(style: TableBlock["tableBorderStyle"], row: number, column: number, rowCount: number, columnCountValue: number) { if (style === "none") return ""; if (style === "outer") return `${row === 0 ? "border-t" : ""} ${row === rowCount - 1 ? "border-b" : ""} ${column === 0 ? "border-l" : ""} ${column === columnCountValue - 1 ? "border-r" : ""} border-slate-300`; if (style === "inner") return `${row < rowCount - 1 ? "border-b" : ""} ${column < columnCountValue - 1 ? "border-r" : ""} border-slate-200`; return "border border-slate-300"; }
function backgroundClass(background: TableCell["background"]) { return background === "muted" ? "bg-slate-50" : background === "accent" ? "bg-blue-50" : background === "highlight" ? "bg-amber-50" : "bg-white"; }
function spansToHtml(spans: RichTextSpan[]) { return spans.map((span) => { let html = escapeHtml(span.text); for (const mark of span.marks ?? []) html = `<${mark === "bold" ? "strong" : mark === "italic" ? "em" : mark === "underline" ? "u" : mark === "superscript" ? "sup" : "sub"}>${html}</${mark === "bold" ? "strong" : mark === "italic" ? "em" : mark === "underline" ? "u" : mark === "superscript" ? "sup" : "sub"}>`; return html; }).join(""); }
function spansFromElement(element: Element) { const spans: RichTextSpan[] = []; const visit = (node: Node, marks: RichTextSpan["marks"] = []) => { if (node.nodeType === Node.TEXT_NODE) { if (node.textContent) spans.push({ text: node.textContent, marks: marks.length ? [...new Set(marks)] : undefined }); return; } const child = node as HTMLElement; const next = [...marks]; const tag = child.tagName.toLowerCase(); if (tag === "strong" || tag === "b") next.push("bold"); if (tag === "em" || tag === "i") next.push("italic"); if (tag === "u") next.push("underline"); if (tag === "sup") next.push("superscript"); if (tag === "sub") next.push("subscript"); child.childNodes.forEach((nested) => visit(nested, next)); }; element.childNodes.forEach((node) => visit(node)); return spans.length ? spans : [{ text: element.textContent ?? "" }]; }
function escapeHtml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function createId(prefix: string) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`; }
const button = "rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";
const menuButton = "list-none cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 [&::-webkit-details-marker]:hidden";
const menuPanel = "absolute left-0 top-full z-30 mt-1 grid min-w-48 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl";
