import Link from "next/link";

import { getParentChildren } from "@/lib/parent-dashboard";
import { prisma } from "@/lib/prisma";

type ViewMode = "today" | "week" | "month";

function rangeForView(view: ViewMode, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (view === "today") {
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  const end = new Date(start);
  end.setDate(end.getDate() + (view === "week" ? 7 : 31));
  return { start, end };
}

export default async function ParentPlannerPage({ searchParams }: { searchParams: Promise<{ view?: string | string[]; studentId?: string | string[] }> }) {
  const { children } = await getParentChildren();
  const { view, studentId } = await searchParams;
  const selectedView = (typeof view === "string" && ["today", "week", "month"].includes(view) ? view : "week") as ViewMode;
  const requestedStudentId = typeof studentId === "string" ? studentId : undefined;
  const selectedChild = children.find((child) => child.student.id === requestedStudentId) ?? null;
  const activeChildren = selectedChild ? [selectedChild] : children;
  const { start, end } = rangeForView(selectedView);

  const rows = await Promise.all(activeChildren.map(async (child) => {
    const items = await prisma.academicPlannerItem.findMany({
      where: {
        schoolId: child.student.schoolId,
        academicYearId: child.enrollment.academicYearId,
        OR: [{ sectionId: null }, { sectionId: child.enrollment.sectionId }],
        status: { notIn: ["CANCELLED", "SKIPPED"] },
        currentDate: { gte: start, lt: end },
      },
      include: {
        assignment: { select: { id: true, title: true } },
        assessment: { select: { id: true, title: true } },
        sectionSubject: { select: { subject: { select: { name: true } } } },
        reschedules: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [{ currentDate: "asc" }, { createdAt: "desc" }],
      take: 80,
    });
    return items.map((item) => ({ ...item, childName: child.student.name, schoolName: child.student.school.schoolName }));
  }));

  const items = [...new Map(rows.flat().map((item) => [item.id, item])).values()].sort((a, b) => a.currentDate.getTime() - b.currentDate.getTime());

  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">Planner</h2>
        <p className="mt-2 text-slate-600">Read-only schedule for assignments, assessments, holidays, events and notices.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["today", "week", "month"] as ViewMode[]).map((item) => <Link key={item} href={`/parent-dashboard/planner?view=${item}${requestedStudentId ? `&studentId=${requestedStudentId}` : ""}`} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedView === item ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{item === "today" ? "Today" : item === "week" ? "This Week" : "Month"}</Link>)}
        </div>
        {children.length > 1 ? (
          <form className="mt-4" method="get">
            <input type="hidden" name="view" value={selectedView} />
            <label className="block text-sm font-semibold text-slate-700">Filter by child</label>
            <select name="studentId" defaultValue={selectedChild?.student.id ?? ""} className="mt-2 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600">
              <option value="">All children</option>
              {children.map((child) => <option key={child.student.id} value={child.student.id}>{child.student.name}</option>)}
            </select>
            <button className="ml-3 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">Apply</button>
          </form>
        ) : null}
      </section>

      <section className="space-y-4">
        {items.length ? items.map((item) => <article key={item.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">{item.childName}</p><h3 className="mt-2 text-xl font-bold text-slate-950">{item.title}</h3></div><div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500"><span className="rounded-full bg-slate-100 px-3 py-1">{item.type}</span>{item.reschedules.length ? <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">Revised</span> : null}</div></div><p className="mt-3 text-slate-600">{item.description ?? "Scheduled by the school."}</p><div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500"><span className="rounded-full bg-slate-100 px-3 py-1">{item.currentDate.toLocaleDateString("en-IN")}</span>{item.assignment?.title ? <span className="rounded-full bg-slate-100 px-3 py-1">Assignment: {item.assignment.title}</span> : null}{item.assessment?.title ? <span className="rounded-full bg-slate-100 px-3 py-1">Assessment: {item.assessment.title}</span> : null}{item.sectionSubject?.subject.name ? <span className="rounded-full bg-slate-100 px-3 py-1">{item.sectionSubject.subject.name}</span> : null}</div></article>) : <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"><p className="text-slate-600">No planner items found for the selected range.</p></article>}
      </section>
    </main>
  );
}