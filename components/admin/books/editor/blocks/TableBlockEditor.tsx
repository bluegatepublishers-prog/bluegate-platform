"use client";

import type { ContentBlock } from "@/lib/content-document";

type TableBlock = Extract<
  ContentBlock,
  {
    type: "table" | "comparisonTable";
  }
>;

type Props = {
  block: TableBlock;
  onUpdatePatch: (patch: Partial<ContentBlock>) => void;
};

const field =
  "mt-2 w-full rounded-[1.25rem] border border-transparent bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-200";

export default function TableBlockEditor({
  block,
  onUpdatePatch,
}: Props) {
  function updateCell(
    rowId: string,
    cellId: string,
    value: string,
  ) {
    onUpdatePatch({
      rows: block.rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              cells: row.cells.map((cell) =>
                cell.id === cellId
                  ? {
                      ...cell,
                      text: value,
                    }
                  : cell,
              ),
            }
          : row,
      ),
    });
  }

  function addRow() {
    const columns =
      block.rows[0]?.cells.length ?? 2;

    onUpdatePatch({
      rows: [
        ...block.rows,
        {
          id: `row_${Date.now().toString(36)}`,
          cells: Array.from(
            { length: columns },
            (_, i) => ({
              id: `cell_${i}_${Math.random()
                .toString(36)
                .slice(2, 8)}`,
              text: "",
            }),
          ),
        },
      ],
    });
  }

  function addColumn() {
    onUpdatePatch({
      rows: block.rows.map((row) => ({
        ...row,
        cells: [
          ...row.cells,
          {
            id: `cell_${Math.random()
              .toString(36)
              .slice(2, 8)}`,
            text: "",
          },
        ],
      })),
    });
  }

  return (
    <div className="space-y-4">
      <label className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
        <input
          type="checkbox"
          checked={block.headerRow !== false}
          onChange={(event) =>
            onUpdatePatch({
              headerRow: event.target.checked,
            })
          }
        />
        Header Row
      </label>

      <div className="space-y-2 overflow-x-auto">
        {block.rows.map((row) => (
          <div
            key={row.id}
            className="grid min-w-[32rem] gap-2"
            style={{
              gridTemplateColumns: `repeat(${row.cells.length}, minmax(0,1fr))`,
            }}
          >
            {row.cells.map((cell) => (
              <input
                key={cell.id}
                value={cell.text}
                onChange={(event) =>
                  updateCell(
                    row.id,
                    cell.id,
                    event.target.value,
                  )
                }
                className={field}
                placeholder="Cell"
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={addRow}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
        >
          Add Row
        </button>

        <button
          type="button"
          onClick={addColumn}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
        >
          Add Column
        </button>
      </div>
    </div>
  );
}