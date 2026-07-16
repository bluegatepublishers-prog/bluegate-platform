import Link from "next/link";

export function GapHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="rounded-3xl bg-gradient-to-br from-indigo-700 to-blue-600 p-7 text-white shadow-lg"><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-100">{eyebrow}</p><h1 className="mt-2 text-3xl font-black">{title}</h1><p className="mt-3 max-w-3xl text-blue-50">{description}</p></header>;
}

export function GapCounts({ rows }: { rows: Array<{ label: string; value: string | number }> }) {
  return <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{rows.map((row) => <article key={row.label} className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{row.label}</p><p className="mt-2 text-3xl font-black text-slate-900">{row.value}</p></article>)}</section>;
}

export function GapBars({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">{title}</h2>{rows.length ? <div className="mt-5 space-y-4">{rows.map((row) => <div key={row.label}><div className="flex justify-between gap-4 text-sm"><span className="font-medium">{row.label}</span><span>{row.count}</span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.max(4, row.count / max * 100)}%` }} /></div></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No patterns are available yet.</p>}</section>;
}

export function GapLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link href={href} className="font-bold text-indigo-700 hover:underline">{children}</Link>; }

export function GapEmpty({ title = "Not enough evidence yet", message = "Complete more scored practice or assessments. Reading, revision, and assistant activity can add context, but cannot create a gap by themselves." }: { title?: string; message?: string }) {
  return <section className="rounded-3xl border bg-white p-10 text-center shadow-sm"><h2 className="text-xl font-bold">{title}</h2><p className="mx-auto mt-2 max-w-2xl text-slate-600">{message}</p></section>;
}
