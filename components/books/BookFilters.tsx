"use client";

import {
  GraduationCap,
  BookOpen,
  School,
  Layers,
  RotateCcw,
} from "lucide-react";

interface BookFiltersProps {
  classValue: string;
  subjectValue: string;
  boardValue: string;
  seriesValue: string;

  classes: string[];
  subjects: string[];
  boards: string[];
  series: string[];

  onClassChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onBoardChange: (value: string) => void;
  onSeriesChange: (value: string) => void;

  onReset: () => void;
}

export default function BookFilters({
  classValue,
  subjectValue,
  boardValue,
  seriesValue,

  classes,
  subjects,
  boards,
  series,

  onClassChange,
  onSubjectChange,
  onBoardChange,
  onSeriesChange,

  onReset,
}: BookFiltersProps) {
  return (
    <section className="mb-12 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">

      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-8">

        <h2 className="text-3xl font-bold text-slate-900">
          Find Your Book
        </h2>

        <p className="mt-2 text-slate-600">
          Browse books by class, subject, board and series.
        </p>

      </div>

      {/* Filters */}
      <div className="grid gap-6 p-8 md:grid-cols-2 lg:grid-cols-4">

        <FilterSelect
          icon={<GraduationCap size={18} />}
          value={classValue}
          onChange={onClassChange}
        >
          <option value="">All Classes</option>

{classes.map((item) => (
  <option key={item} value={item}>
    {item}
  </option>
))}
</FilterSelect>

        <FilterSelect
          icon={<BookOpen size={18} />}
          value={subjectValue}
          onChange={onSubjectChange}
        >
          <option value="">All Subjects</option>

{subjects.map((item) => (
  <option key={item} value={item}>
    {item}
  </option>
))}
        </FilterSelect>

        <FilterSelect
          icon={<School size={18} />}
          value={boardValue}
          onChange={onBoardChange}
        >
          <option value="">All Boards</option>

{boards.map((item) => (
  <option key={item} value={item}>
    {item}
  </option>
))}
        </FilterSelect>

        <FilterSelect
          icon={<Layers size={18} />}
          value={seriesValue}
          onChange={onSeriesChange}
        >
          <option value="">All Series</option>

{series.map((item) => (
  <option key={item} value={item}>
    {item}
  </option>
))}
        </FilterSelect>

      </div>

      {/* Footer */}
      <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50 p-6">

        <button
          onClick={onReset}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-700"
        >
          <RotateCcw size={18} />
          Reset Filters
        </button>

      </div>

    </section>
  );
}

interface FilterSelectProps {
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

function FilterSelect({
  icon,
  value,
  onChange,
  children,
}: FilterSelectProps) {
  return (
    <div className="relative">

      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
        {icon}
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-slate-700 shadow-sm transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        {children}
      </select>

    </div>
  );
}