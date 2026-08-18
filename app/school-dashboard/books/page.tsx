import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";

export const dynamic = "force-dynamic";

export default async function SchoolBooksPage({ searchParams }: { searchParams: Promise<{ year?: string; q?: string }> }) {
  const school = await requireSchool();
  const params = await searchParams;
  const years = await prisma.academicYear.findMany({ where: { schoolId: school.id, active: true }, orderBy: [{ current: "desc" }, { startDate: "desc" }] });
  const yearId = years.some((year) => year.id === params.year) ? params.year! : years.find((year) => year.current)?.id ?? years[0]?.id ?? "";
  const [books, classes] = await Promise.all([
    prisma.book.findMany({ where: { publisherId: school.publisherId ?? "", published: true, archived: false, schoolEntitlements: { some: { schoolId: school.id, publisherId: school.publisherId ?? "", status: "ACTIVE" } } }, include: { class: true, subject: true, series: true }, orderBy: [{ class: { sortOrder: "asc" } }, { subject: { sortOrder: "asc" } }, { title: "asc" }] }),
    prisma.schoolClass.findMany({ where: { schoolId: school.id, academicYearId: yearId, active: true }, include: { sections: { where: { active: true }, include: { subjects: { where: { active: true }, include: { subject: true, book: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { name: "asc" } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const usage = new Map<string, string[]>();
  for (const schoolClass of classes) for (const section of schoolClass.sections) for (const subject of section.subjects) if (subject.bookId) usage.set(subject.bookId, [...(usage.get(subject.bookId) ?? []), schoolClass.name + " · " + section.name + " · " + subject.subject.name]);
  const query = params.q?.trim().toLowerCase() ?? "";
  const visibleBooks = books.filter((book) => !query || [book.title, book.class.name, book.subject.name, book.series?.name ?? ""].join(" ").toLowerCase().includes(query));
  return <main className="space-y-5 p-4 text-[15px] sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Academics</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Books</h1><p className="mt-1 text-sm text-slate-600">Publisher books available to this school and the class sections currently using them.</p></div><Link href="/school-dashboard/teacher-assignments" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white">Assign through teachers</Link></header>
    <form className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><input name="q" defaultValue={params.q} placeholder="Search book, class, or subject" className="h-9 min-w-64 flex-1 rounded-lg border border-slate-300 px-3 text-sm"/><select name="year" defaultValue={yearId} className="h-9 rounded-lg border border-slate-300 px-3 text-sm">{years.map((year) => <option key={year.id} value={year.id}>{year.name}{year.current ? " (Current)" : ""}</option>)}</select><button className="h-9 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white">Filter</button></form>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="font-bold text-slate-950">Entitled books</h2><span className="text-xs font-semibold text-slate-500">{visibleBooks.length} available</span></div>{visibleBooks.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5">Book</th><th className="px-4 py-2.5">Class</th><th className="px-4 py-2.5">Subject</th><th className="px-4 py-2.5">Entitlement</th><th className="px-4 py-2.5">Assigned sections</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleBooks.map((book) => { const assigned = usage.get(book.id) ?? []; return <tr key={book.id}><td className="px-4 py-3 font-semibold text-slate-900">{book.title}<span className="block text-xs font-normal text-slate-500">{book.series?.name ?? "No series"}</span></td><td className="px-4 py-3">{book.class.name}</td><td className="px-4 py-3">{book.subject.name}</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Active</span></td><td className="px-4 py-3 text-slate-600">{assigned.length ? assigned.join(", ") : "Not assigned"}</td></tr>; })}</tbody></table></div> : <p className="px-4 py-10 text-center text-sm text-slate-500">No entitled books match this search.</p>}</section>
  </main>;
}
