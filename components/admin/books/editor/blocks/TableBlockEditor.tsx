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
  onUpdatePatch: (
    patch: Partial<ContentBlock>,
  ) => void;
  onDeleteTable: () => void;
};

const field =
  "mt-2 w-full rounded-[1.25rem] border border-transparent bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-200";

export default function TableBlockEditor({
  block,
  onUpdatePatch,
  onDeleteTable,
}: Props) {
  const columnCount =
    block.rows[0]?.cells.length ?? 0;

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
    const columns = Math.max(
      columnCount,
      2,
    );

    onUpdatePatch({
      rows: [
        ...block.rows,
        {
          id: createId("row"),
          cells: Array.from(
            { length: columns },
            () => ({
              id: createId("cell"),
              text: "",
            }),
          ),
        },
      ],
    });
  }

  function deleteLastRow() {
    if (block.rows.length <= 1) return;

    const lastRow =
      block.rows[block.rows.length - 1];

    if (
      rowContainsText(lastRow) &&
      !window.confirm(
        "The last row contains text. Delete it?",
      )
    ) {
      return;
    }

    onUpdatePatch({
      rows: block.rows.slice(0, -1),
    });
  }

  function addColumn() {
    onUpdatePatch({
      rows: block.rows.map((row) => ({
        ...row,
        cells: [
          ...row.cells,
          {
            id: createId("cell"),
            text: "",
          },
        ],
      })),
    });
  }

  function deleteLastColumn() {
    if (columnCount <= 1) return;

    const lastColumnHasText =
      block.rows.some(
        (row) =>
          row.cells[
            row.cells.length - 1
          ]?.text.trim(),
      );

    if (
      lastColumnHasText &&
      !window.confirm(
        "The last column contains text. Delete it?",
      )
    ) {
      return;
    }

    onUpdatePatch({
      rows: block.rows.map((row) => ({
        ...row,
        cells: row.cells.slice(0, -1),
      })),
    });
  }

  function deleteTable() {
    const containsText =
      block.rows.some(rowContainsText);

    if (
      containsText &&
      !window.confirm(
        "This table contains text. Delete the complete table?",
      )
    ) {
      return;
    }

    if (
      !containsText &&
      !window.confirm(
        "Delete this table?",
      )
    ) {
      return;
    }

    onDeleteTable();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
          <input
            type="checkbox"
            checked={block.headerRow !== false}
            onChange={(event) =>
              onUpdatePatch({
                headerRow:
                  event.target.checked,
              })
            }
          />
          Header Row
        </label>

        <button
          type="button"
          onClick={deleteTable}
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
        >
          Delete Table
        </button>
      </div>

      <div className="space-y-2 overflow-x-auto">
        {block.rows.map((row) => (
          <div
            key={row.id}
            className="grid min-w-[32rem] gap-2"
            style={{
              gridTemplateColumns:
                `repeat(${row.cells.length}, minmax(0,1fr))`,
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
        >
          Add Row
        </button>

        <button
          type="button"
          onClick={deleteLastRow}
          disabled={block.rows.length <= 1}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Delete Row
        </button>

        <button
          type="button"
          onClick={addColumn}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
        >
          Add Column
        </button>

        <button
          type="button"
          onClick={deleteLastColumn}
          disabled={columnCount <= 1}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Delete Column
        </button>
      </div>
    </div>
  );
}

function rowContainsText(
  row: TableBlock["rows"][number],
) {
  return row.cells.some(
    (cell) => cell.text.trim().length > 0,
  );
}

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
