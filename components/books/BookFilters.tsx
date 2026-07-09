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
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
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

        <button
          onClick={onReset}
          className="flex h-12 items-center gap-2 rounded-xl bg-[#0B5ED7] px-5 font-medium text-white transition hover:bg-[#083A75]"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>
    </div>
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
    <div className="relative min-w-[170px] flex-1 lg:flex-none">
      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
        {icon}
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 shadow-sm outline-none transition-all duration-200 focus:border-[#0B5ED7] focus:ring-4 focus:ring-blue-100"
      >
        {children}
      </select>
    </div>
  );
}