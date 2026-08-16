import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type SchoolTone = "blue" | "teal" | "violet" | "amber" | "rose" | "slate";

const toneStyles: Record<SchoolTone, { icon: string; surface: string; border: string; accent: string }> = {
  blue: { icon: "bg-blue-100 text-blue-700", surface: "from-blue-50 to-white", border: "border-blue-100", accent: "text-blue-700" },
  teal: { icon: "bg-teal-100 text-teal-700", surface: "from-teal-50 to-white", border: "border-teal-100", accent: "text-teal-700" },
  violet: { icon: "bg-violet-100 text-violet-700", surface: "from-violet-50 to-white", border: "border-violet-100", accent: "text-violet-700" },
  amber: { icon: "bg-amber-100 text-amber-700", surface: "from-amber-50 to-white", border: "border-amber-100", accent: "text-amber-700" },
  rose: { icon: "bg-rose-100 text-rose-700", surface: "from-rose-50 to-white", border: "border-rose-100", accent: "text-rose-700" },
  slate: { icon: "bg-slate-100 text-slate-700", surface: "from-slate-50 to-white", border: "border-slate-200", accent: "text-slate-700" },
};

export const schoolTypography = {
  pageTitle: "text-[1.5rem] font-bold leading-tight tracking-[-0.02em] text-slate-950 sm:text-[1.65rem]",
  sectionTitle: "text-[1.125rem] font-bold leading-tight text-slate-950",
  cardTitle: "text-[0.95rem] font-bold leading-snug text-slate-950",
  body: "text-sm leading-6 text-slate-600",
  helper: "text-xs leading-5 text-slate-500",
  nav: "text-sm font-semibold",
} as const;

export function SchoolSection({ title, eyebrow, description, action, children, className = "" }: { title: string; eyebrow?: string; description?: string; action?: { label: string; href: string }; children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div>{eyebrow ? <p className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-blue-700">{eyebrow}</p> : null}<h2 className={schoolTypography.sectionTitle}>{title}</h2>{description ? <p className={`mt-1 ${schoolTypography.helper}`}>{description}</p> : null}</div>{action ? <Link href={action.href} className="rounded-lg px-2 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{action.label}</Link> : null}</div>
    {children}
  </section>;
}

export function SchoolMetricTile({ icon: Icon, value, label, tone, detail, href }: { icon: LucideIcon; value: number | string; label: string; tone: SchoolTone; detail?: string; href?: string }) {
  const style = toneStyles[tone];
  const content = <article className={`group min-h-[7.75rem] rounded-xl border bg-gradient-to-br p-4 shadow-sm transition ${style.surface} ${style.border} ${href ? "hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500" : ""}`}><div className="flex items-start justify-between gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${style.icon}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>{href ? <span className="text-slate-300 transition group-hover:text-slate-500" aria-hidden="true">↗</span> : null}</div><div className="mt-4"><strong className="block text-[1.75rem] font-bold leading-none tracking-[-0.03em] text-slate-950">{value}</strong><p className={`mt-1 ${schoolTypography.cardTitle}`}>{label}</p>{detail ? <p className={`mt-1 ${schoolTypography.helper}`}>{detail}</p> : null}</div></article>;
  return href ? <Link href={href} className="block rounded-xl focus-visible:outline-none">{content}</Link> : content;
}

export function SchoolStatusTile({ icon: Icon, value, label, tone, href }: { icon: LucideIcon; value: number | string; label: string; tone: SchoolTone; href?: string }) {
  const style = toneStyles[tone];
  const content = <article className={`flex items-center gap-3 rounded-xl border bg-white p-3.5 shadow-sm transition ${style.border} ${href ? "hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500" : ""}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${style.icon}`}><Icon className="h-4 w-4" aria-hidden="true" /></span><span className="min-w-0"><strong className="block text-xl font-bold leading-none text-slate-950">{value}</strong><span className={`mt-1 block truncate text-xs font-semibold ${style.accent}`}>{label}</span></span></article>;
  return href ? <Link href={href} className="block rounded-xl focus-visible:outline-none">{content}</Link> : content;
}

export function SchoolFeatureTile({ icon: Icon, label, description, href, tone = "blue" }: { icon: LucideIcon; label: string; description: string; href: string; tone?: SchoolTone }) {
  const style = toneStyles[tone];
  return <Link href={href} className={`group flex min-h-[6.75rem] flex-col justify-between rounded-xl border bg-gradient-to-br p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${style.surface} ${style.border}`}><span className={`grid h-9 w-9 place-items-center rounded-lg ${style.icon}`}><Icon className="h-4 w-4" aria-hidden="true" /></span><span className="mt-4"><strong className={schoolTypography.cardTitle}>{label}</strong><span className={`mt-1 block ${schoolTypography.helper}`}>{description}</span></span><span className="mt-3 text-xs font-bold text-slate-400 transition group-hover:text-slate-700">Open feature <span aria-hidden="true">→</span></span></Link>;
}

export function SchoolEmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: { label: string; href: string } }) {
  return <div className="flex min-h-[9rem] items-center gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-slate-400 shadow-sm"><Icon className="h-5 w-5" aria-hidden="true" /></span><div><h3 className={schoolTypography.cardTitle}>{title}</h3><p className={`mt-1 max-w-md ${schoolTypography.helper}`}>{description}</p>{action ? <Link href={action.href} className="mt-3 inline-flex rounded-lg px-0 py-1 text-xs font-bold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{action.label} <span className="ml-1" aria-hidden="true">→</span></Link> : null}</div></div>;
}

export function SchoolActivityRow({ icon: Icon, text, at, tone = "blue" }: { icon: LucideIcon; text: string; at: Date; tone?: SchoolTone }) {
  const style = toneStyles[tone];
  return <div className="flex gap-3 border-b border-slate-100 py-3 last:border-0"><span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${style.icon}`}><Icon className="h-3.5 w-3.5" aria-hidden="true" /></span><div className="min-w-0"><p className="text-sm font-semibold leading-5 text-slate-700">{text}</p><time className={schoolTypography.helper}>{at.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</time></div></div>;
}
