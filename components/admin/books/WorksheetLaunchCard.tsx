"use client";

type Props = {
  title: string;
  context: string;
  questionCount: number;
  totalMarks: number;
  label?: string;
  buttonLabel?: string;
  onOpen?: () => void;
};

export default function WorksheetLaunchCard({
  title,
  context,
  questionCount,
  totalMarks,
  label = "Practice Worksheet",
  buttonLabel = "Open Worksheet",
  onOpen,
}: Props) {
  return <article className="w-full max-w-sm rounded-xl border border-indigo-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">{label}</p>
    <h3 className="mt-2 text-xl font-bold text-slate-900">{title}</h3>
    <p className="mt-1 text-sm text-slate-600">{context}</p>
    <p className="mt-4 text-sm font-semibold text-slate-700">{questionCount} Question{questionCount === 1 ? "" : "s"} | {totalMarks} Mark{totalMarks === 1 ? "" : "s"}</p>
    <button type="button" onClick={onOpen} className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">{buttonLabel}</button>
  </article>;
}
