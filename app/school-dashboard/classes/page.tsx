import Link from "next/link";
import { getAcademicClassList } from "@/lib/academic";
import { addStandardClasses, createSchoolClass } from "../academic-actions";

export const dynamic = "force-dynamic";

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year } = await searchParams;
  const { years, selectedYearId, classes } = await getAcademicClassList(year);
  return <main className="space-y-5 p-4 text-[15px] sm:p-6 lg:p-8">
    <header><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Academics</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Classes & Sections</h1><p className="mt-1 text-sm text-slate-600">Manage class structure, sections, enrollment counts, and subjects.</p></header>
    <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><form className="flex flex-1 gap-2"><select name="year" defaultValue={selectedYearId} className="h-9 rounded-lg border border-slate-300 px-3 text-sm">{years.map((item) => <option key={item.id} value={item.id}>{item.name}{item.current ? " (Current)" : ""}</option>)}</select><button className="rounded-lg bg-slate-900 px-3 text-sm font-bold text-white">Show</button></form>{selectedYearId ? <><form action={createSchoolClass} className="flex gap-2"><input type="hidden" name="academicYearId" value={selectedYearId}/><input name="name" required placeholder="New class name" className="h-9 rounded-lg border border-slate-300 px-3 text-sm"/><button className="rounded-lg bg-blue-700 px-3 text-sm font-bold text-white">+ Add class</button></form><form action={addStandardClasses}><input type="hidden" name="academicYearId" value={selectedYearId}/><button className="h-9 rounded-lg border border-blue-200 px-3 text-sm font-bold text-blue-700">Add standard classes</button></form></> : null}</div>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">{classes.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5">Class</th><th className="px-4 py-2.5">Sections</th><th className="px-4 py-2.5">Students</th><th className="px-4 py-2.5">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{classes.map((item) => <tr key={item.id}><td className="px-4 py-3 font-semibold">{item.name}</td><td className="px-4 py-3 text-slate-600">{item.sections.map((section) => section.name).join(", ") || "None"}</td><td className="px-4 py-3 text-slate-600">{item._count.enrollments}</td><td className="px-4 py-3"><Link href={"/school-dashboard/classes/" + item.id} className="font-bold text-blue-700 hover:underline">Manage</Link></td></tr>)}</tbody></table></div> : <p className="px-4 py-10 text-center text-sm text-slate-500">No classes in this year.</p>}</section>
  </main>;
}
