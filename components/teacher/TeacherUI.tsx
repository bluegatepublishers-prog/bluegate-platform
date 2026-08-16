import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type TeacherTone = "blue" | "teal" | "violet" | "amber" | "rose" | "slate";

const toneStyles: Record<TeacherTone, { icon: string; surface: string; border: string }> = {
  blue: { icon: "bg-blue-100 text-blue-700", surface: "from-blue-50 to-white", border: "border-blue-100" },
  teal: { icon: "bg-teal-100 text-teal-700", surface: "from-teal-50 to-white", border: "border-teal-100" },
  violet: { icon: "bg-violet-100 text-violet-700", surface: "from-violet-50 to-white", border: "border-violet-100" },
  amber: { icon: "bg-amber-100 text-amber-700", surface: "from-amber-50 to-white", border: "border-amber-100" },
  rose: { icon: "bg-rose-100 text-rose-700", surface: "from-rose-50 to-white", border: "border-rose-100" },
  slate: { icon: "bg-slate-100 text-slate-700", surface: "from-slate-50 to-white", border: "border-slate-200" },
};

export const teacherTypography = {
  pageTitle: "text-[1.65rem] font-bold leading-tight tracking-[-0.025em] text-slate-950 sm:text-[2rem]",
  sectionTitle: "text-[1.125rem] font-bold leading-tight text-slate-950",
  cardTitle: "text-[0.95rem] font-bold leading-snug text-slate-950",
  body: "text-sm leading-6 text-slate-600",
  helper: "text-xs leading-5 text-slate-500",
} as const;

export function TeacherSection({ title, eyebrow, description, action, children, className = "" }: { title: string; eyebrow?: string; description?: string; action?: { label: string; href: string }; children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div>{eyebrow ? <p className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-teal-700">{eyebrow}</p> : null}<h2 className={teacherTypography.sectionTitle}>{title}</h2>{description ? <p className={`mt-1 ${teacherTypography.helper}`}>{description}</p> : null}</div>{action ? <Link href={action.href} className="rounded-lg px-2 py-1 text-xs font-bold text-teal-700 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">{action.label}</Link> : null}</div>
    {children}
  </section>;
}

export function TeacherMetricTile({ icon: Icon, value, label, detail, tone, href }: { icon: LucideIcon; value: number | string; label: string; detail?: string; tone: TeacherTone; href?: string }) {
  const style = toneStyles[tone];
  const content = <article className={`min-h-[7.75rem] rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition ${style.surface} ${style.border} ${href ? "hover:-translate-y-0.5 hover:shadow-md" : ""}`}><span className={`grid h-10 w-10 place-items-center rounded-xl ${style.icon}`}><Icon className="h-5 w-5" aria-hidden="true" /></span><div className="mt-4"><strong className="block text-[1.75rem] font-bold leading-none tracking-[-0.03em] text-slate-950">{value}</strong><p className={teacherTypography.cardTitle}>{label}</p>{detail ? <p className={`mt-1 ${teacherTypography.helper}`}>{detail}</p> : null}</div></article>;
  return href ? <Link href={href} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">{content}</Link> : content;
}

export function TeacherFeatureTile({ icon: Icon, label, description, href, tone = "teal", enabled = true, status }: { icon: LucideIcon; label: string; description: string; href?: string; tone?: TeacherTone; enabled?: boolean; status?: string }) {
  const style = toneStyles[tone];
  const content = <div className={`group flex min-h-[8.5rem] flex-col justify-between rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition ${style.surface} ${style.border} ${enabled && href ? "hover:-translate-y-0.5 hover:shadow-md" : "opacity-75"}`}><span className={`grid h-9 w-9 place-items-center rounded-xl ${style.icon}`}><Icon className="h-4 w-4" aria-hidden="true" /></span><span className="mt-4"><strong className={teacherTypography.cardTitle}>{label}</strong><span className={`mt-1 block ${teacherTypography.helper}`}>{description}</span></span><span className={`mt-3 text-xs font-bold ${enabled && href ? "text-teal-700" : "text-slate-500"}`}>{status ?? (enabled ? "Open workspace" : "Setup pending")} {enabled && href ? <span aria-hidden="true">→</span> : null}</span></div>;
  return enabled && href ? <Link href={href} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">{content}</Link> : <div aria-disabled="true">{content}</div>;
}

export function TeacherEmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: { label: string; href: string } }) {
  return <div className="flex min-h-[8rem] items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-slate-400 shadow-sm"><Icon className="h-5 w-5" aria-hidden="true" /></span><div><h3 className={teacherTypography.cardTitle}>{title}</h3><p className={`mt-1 max-w-lg ${teacherTypography.helper}`}>{description}</p>{action ? <Link href={action.href} className="mt-3 inline-flex rounded-lg py-1 text-xs font-bold text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">{action.label} <span className="ml-1" aria-hidden="true">→</span></Link> : null}</div></div>;
}

export function TeacherStatusBadge({ children, tone = "slate" }: { children: ReactNode; tone?: TeacherTone }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide ${toneStyles[tone].icon}`}>{children}</span>;
}
