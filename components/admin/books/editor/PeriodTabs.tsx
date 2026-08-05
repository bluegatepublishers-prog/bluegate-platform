"use client";

import type { ContentPeriod } from "@/lib/content-document";

type PeriodTabsProps = {
  periods: ContentPeriod[];
  activePeriodId: string;
  editingPeriodId: string | null;
  periodTitleDraft: string;

  onSelectPeriod: (periodId: string) => void;
  onBeginRename: (periodId: string, title: string) => void;
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
  return (
    <div
      className="mt-3 flex items-center gap-2 overflow-x-auto border-t border-slate-100 pt-3"
      aria-label="Periods"
    >
      {periods.map((period) => {
        const active = activePeriodId === period.id;
        const editing = editingPeriodId === period.id;

        return (
          <span
            key={period.id}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 ${
              active
                ? "bg-slate-950 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {editing ? (
              <input
                autoFocus
                value={periodTitleDraft}
                onChange={(event) =>
                  onChangeTitleDraft(event.target.value)
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
                onClick={() => onSelectPeriod(period.id)}
                onDoubleClick={() =>
                  onBeginRename(period.id, period.title)
                }
                className="px-1.5 py-0.5 text-xs font-bold"
              >
                {period.title}
              </button>
            )}

            {active && periods.length > 1 ? (
              <button
                type="button"
                onClick={() => onDeleteEmptyPeriod(period.id)}
                aria-label={`Delete empty ${period.title}`}
                title={`Delete empty ${period.title}`}
                className="rounded-full px-1 text-xs opacity-70 hover:opacity-100"
              >
                ×
              </button>
            ) : null}
          </span>
        );
      })}

      <button
        type="button"
        onClick={onAddPeriod}
        className="shrink-0 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-slate-500"
      >
        + Add Period
      </button>
    </div>
  );
}