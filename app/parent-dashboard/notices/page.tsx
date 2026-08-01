import Link from "next/link";

import { getParentChildren } from "@/lib/parent-dashboard";
import { prisma } from "@/lib/prisma";

type NoticeFilter = "all" | "circulars" | "holidays" | "examinations" | "events" | "ptm";

function classifyNotice(item: { type: string; title: string; description: string | null | undefined }) {
  const text = `${item.title} ${item.description ?? ""}`.toLowerCase();
  if (item.type === "HOLIDAY") return "holidays" as const;
  if (item.type === "EVENT") return "events" as const;
  if (text.includes("ptm") || text.includes("parent-teacher") || text.includes("parent teacher")) return "ptm" as const;
  if (text.includes("exam") || text.includes("examination") || text.includes("test")) return "examinations" as const;
  return "circulars" as const;
}

function matchesQuery(item: { title: string; description: string | null | undefined }, query: string) {
  const text = `${item.title} ${item.description ?? ""}`.toLowerCase();
  return text.includes(query.toLowerCase());
}

export default async function ParentNoticesPage({ searchParams }: { searchParams: Promise<{ filter?: string | string[]; q?: string | string[] }> }) {
  const { children } = await getParentChildren();
  const { filter, q } = await searchParams;
  const selectedFilter = (typeof filter === "string" && ["all", "circulars", "holidays", "examinations", "events", "ptm"].includes(filter) ? filter : "all") as NoticeFilter;
  const query = typeof q === "string" ? q.trim() : "";

  const rows = await Promise.all(children.map(async (child) => {
    const items = await prisma.academicPlannerItem.findMany({
      where: {
        schoolId: child.student.schoolId,
        academicYearId: child.enrollment.academicYearId,
        OR: [{ sectionId: null }, { sectionId: child.enrollment.sectionId }],
        type: { in: ["NOTICE", "HOLIDAY", "EVENT"] },
        status: { not: "CANCELLED" },
      },
      orderBy: [{ currentDate: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: { id: true, type: true, title: true, description: true, currentDate: true },
    });
    return items.map((item) => ({ ...item, childId: child.student.id, childName: child.student.name, schoolName: child.student.school.schoolName, category: classifyNotice(item) }));
  }));

  const merged = [...new Map(rows.flat().map((item) => [item.id, item])).values()];
  const notices = merged.filter((item) => (selectedFilter === "all" || item.category === selectedFilter) && (!query || matchesQuery(item, query)));

  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">Notices</h2>
        <p className="mt-2 text-slate-600">Official school notices only. Class chat and direct messaging are not part of the parent portal.</p>
        <form className="mt-5 flex flex-col gap-3 lg:flex-row" method="get">
          <input name="q" defaultValue={query} placeholder="Search notices" className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600" />
          <button className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white">Search</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["all", "circulars", "holidays", "examinations", "events", "ptm"] as NoticeFilter[]).map((item) => <Link key={item} href={`/parent-dashboard/notices?filter=${item}${query ? `&q=${encodeURIComponent(query)}` : ""}`} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedFilter === item ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{item === "all" ? "All" : item.charAt(0).toUpperCase() + item.slice(1)}</Link>)}
        </div>
      </section>

      <section className="space-y-4">
        {notices.length ? notices.map((item) => <article key={item.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">{item.category}</p><h3 className="mt-2 text-xl font-bold text-slate-950">{item.title}</h3></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{item.schoolName}</span></div><p className="mt-3 text-slate-600">{item.description ?? "Published by the school."}</p><div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500"><span className="rounded-full bg-slate-100 px-3 py-1">{item.childName}</span><span className="rounded-full bg-slate-100 px-3 py-1">{item.type}</span><span className="rounded-full bg-slate-100 px-3 py-1">{item.currentDate.toLocaleDateString("en-IN")}</span></div></article>) : <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"><p className="text-slate-600">No notices match the current filters.</p></article>}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold text-slate-950">Contact School Office</h3>
        <p className="mt-2 text-slate-600">If you need help with notices or parent access, use the Help menu for school office contact details.</p>
      </section>
    </main>
  );
}