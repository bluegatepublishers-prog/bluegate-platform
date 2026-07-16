import { Activity, BarChart3, Flame, Sparkles } from "lucide-react";

export function ReportHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 p-7 text-white shadow-xl sm:p-10"><p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-100">{eyebrow}</p><h1 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h1><p className="mt-3 max-w-3xl text-blue-100">{description}</p></section>;
}

export function MetricGrid({ metrics }: { metrics: Array<{ label: string; value: string | number; detail?: string }> }) {
  return <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <article key={metric.label} className="rounded-3xl border bg-white p-6 shadow-sm"><p className="text-sm font-semibold text-slate-500">{metric.label}</p><p className="mt-3 text-3xl font-bold text-slate-900">{metric.value}</p>{metric.detail ? <p className="mt-2 text-sm text-slate-500">{metric.detail}</p> : null}</article>)}</section>;
}

export function ProgressBars({ title, rows }: { title: string; rows: Array<{ label: string; value: number; detail?: string }> }) {
  return <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8"><div className="flex items-center gap-3"><BarChart3 className="h-6 w-6 text-blue-700"/><h2 className="text-xl font-bold">{title}</h2></div>{rows.length ? <div className="mt-6 space-y-5">{rows.map((row) => <div key={row.label}><div className="mb-2 flex justify-between gap-4 text-sm"><span className="font-semibold">{row.label}</span><span className="text-slate-500">{row.detail ?? `${Math.round(row.value)}%`}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500" style={{ width: `${Math.min(100, Math.max(0, row.value))}%` }}/></div></div>)}</div> : <EmptyAnalytics/>}</section>;
}

export function Timeline({ rows }: { rows: Array<{ id: string; title: string; activityType: string; occurredAt: Date; scorePercent: number | null }> }) {
  return <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8"><div className="flex items-center gap-3"><Activity className="h-6 w-6 text-indigo-700"/><h2 className="text-xl font-bold">Learning timeline</h2></div>{rows.length ? <ol className="mt-6 space-y-4">{rows.map((row) => <li key={row.id} className="flex gap-4 border-l-2 border-indigo-100 pl-5"><span className="mt-1 h-3 w-3 -translate-x-[27px] rounded-full bg-indigo-600"/><div><p className="font-semibold">{row.title}</p><p className="mt-1 text-sm text-slate-500">{row.activityType.replaceAll("_", " ")} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(row.occurredAt)}{row.scorePercent == null ? "" : ` · ${Math.round(row.scorePercent)}%`}</p></div></li>)}</ol> : <EmptyAnalytics/>}</section>;
}

export function AnalyticsPlaceholders() {
  return <section className="grid gap-5 lg:grid-cols-2"><article className="rounded-3xl border border-dashed bg-slate-50 p-8"><Flame className="h-8 w-8 text-orange-500"/><h2 className="mt-4 text-xl font-bold">Study activity heatmap</h2><p className="mt-2 text-slate-600">Calendar heatmap rendering is reserved for a later reporting enhancement. Daily activity is already preserved in the timeline.</p></article><article className="rounded-3xl border border-dashed bg-slate-50 p-8"><Sparkles className="h-8 w-8 text-violet-600"/><h2 className="mt-4 text-xl font-bold">Learning gap preparation</h2><p className="mt-2 text-slate-600">Competency and learning-outcome performance is stored factually. Recommendations and predictive gap claims are intentionally not generated in this phase.</p></article></section>;
}

export function EmptyAnalytics() { return <p className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">No completed learning activity has been aggregated yet.</p>; }

export const displayPercent = (value: number | null | undefined) => value == null ? "—" : `${Math.round(value)}%`;
