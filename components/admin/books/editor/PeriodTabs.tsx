"use client";

import type { ContentPeriod } from "@/lib/content-document";

type PeriodTabsProps = {
  periods: ContentPeriod[];
  activePeriodId: string;
  editingPeriodId: string | null;
  periodTitleDraft: string;

  onSelectPeriod: (periodId: string) => void;
  onBeginRename: (
    periodId: string,
    title: string,
  ) => void;
  onChangeTitleDraft: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onDeleteEmptyPeriod: (periodId: string) => void;
  onAddPeriod: () => void;
};

export default function PeriodTabs({
  periods,
  activePeriodId,
  editingPeriodId,
  periodTitleDraft,
  onSelectPeriod,
  onBeginRename,
  onChangeTitleDraft,
  onCommitRename,
  onCancelRename,
  onDeleteEmptyPeriod,
  onAddPeriod,
}: PeriodTabsProps) {
  const canDeleteAnyPeriod = periods.length > 1;

  return (
    <div
      className="mt-3 flex items-center gap-2 overflow-x-auto border-t border-slate-100 pt-3"
      aria-label="Periods"
    >
      {periods.map((period) => {
        const active =
          activePeriodId === period.id;

        const editing =
          editingPeriodId === period.id;

        const deleteDisabled =
          !canDeleteAnyPeriod || editing;

        const deleteTitle = !canDeleteAnyPeriod
          ? "At least one period is required"
          : editing
            ? "Finish renaming before deleting"
            : `Delete empty ${period.title}`;

        return (
          <span
            key={period.id}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 transition ${
              active
                ? "bg-slate-950 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {editing ? (
              <input
                autoFocus
                value={periodTitleDraft}
                onChange={(event) =>
                  onChangeTitleDraft(
                    event.target.value,
                  )
                }
                onBlur={onCommitRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onCommitRename();
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    onCancelRename();
                  }
                }}
                aria-label={`Rename ${period.title}`}
                className="w-24 bg-transparent px-1 text-xs font-bold outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() =>
                  onSelectPeriod(period.id)
                }
                onDoubleClick={() =>
                  onBeginRename(
                    period.id,
                    period.title,
                  )
                }
                className="px-1.5 py-0.5 text-xs font-bold"
                title="Click to open. Double-click to rename."
              >
                {period.title}
              </button>
            )}

            <button
              type="button"
              disabled={deleteDisabled}
              onClick={(event) => {
                event.stopPropagation();

                if (deleteDisabled) return;

                onDeleteEmptyPeriod(period.id);
              }}
              aria-label={deleteTitle}
              title={deleteTitle}
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold transition ${
                active
                  ? "text-white"
                  : "text-slate-500"
              } ${
                deleteDisabled
                  ? "cursor-not-allowed opacity-30"
                  : "opacity-70 hover:bg-black/10 hover:opacity-100"
              }`}
            >
              ×
            </button>
          </span>
        );
      })}

      <button
        type="button"
        onClick={onAddPeriod}
        className="shrink-0 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-slate-500 hover:bg-slate-50"
      >
        + Add Period
      </button>
    </div>
  );
}