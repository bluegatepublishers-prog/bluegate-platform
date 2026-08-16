import Link from "next/link";
import { BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";
import { normalizeAcademicName } from "@/lib/book-adoptions";
import SchoolBookAssignmentWorkspace from "@/components/school/SchoolBookAssignmentWorkspace";
import { assignApprovedBook } from "../academic-actions";

export const dynamic = "force-dynamic";

export default async function SchoolBooksPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const school = await requireSchool();
  const params = await searchParams;
  const years = await prisma.academicYear.findMany({ where: { schoolId: school.id, active: true }, orderBy: [{ current: "desc" }, { startDate: "desc" }] });
  const yearId = years.some((year) => year.id === params.year) ? params.year! : years.find((year) => year.current)?.id ?? years[0]?.id ?? "";
  const [books, classes] = await Promise.all([
    prisma.book.findMany({ where: { publisherId: school.publisherId ?? "", published: true, archived: false, schoolEntitlements: { some: { schoolId: school.id, publisherId: school.publisherId ?? "", status: "ACTIVE" } } }, include: { class: true, subject: true, series: true }, orderBy: [{ class: { sortOrder: "asc" } }, { subject: { sortOrder: "asc" } }, { title: "asc" }] }),
    prisma.schoolClass.findMany({ where: { schoolId: school.id, academicYearId: yearId, active: true }, include: { sections: { where: { active: true }, include: { subjects: { where: { active: true }, include: { subject: true, book: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { name: "asc" } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const classWorkspaces = classes.map((schoolClass) => ({
    id: schoolClass.id,
    name: schoolClass.name,
    sections: schoolClass.sections.map((section) => ({
      id: section.id,
      name: section.name,
      subjects: section.subjects.map((sectionSubject) => ({
        id: sectionSubject.id,
        subjectName: sectionSubject.subject.name,
        assignedBookId: sectionSubject.bookId,
        assignedBookTitle: sectionSubject.book?.title ?? null,
        books: books.filter((book) => book.subjectId === sectionSubject.subjectId && normalizeAcademicName(book.class.name) === normalizeAcademicName(schoolClass.name)).map((book) => ({ id: book.id, title: book.title })),
        assignAction: assignApprovedBook.bind(null, schoolClass.id),
      })),
    })),
  }));

  return <main className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-7">
    <header className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 shadow-sm"><div><p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-blue-700">Publisher content</p><h1 className="mt-1 text-[1.5rem] font-bold tracking-tight text-slate-950">Books & Resources</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Assign entitled publisher books to subjects for the current academic year. Publisher ownership and protected access remain unchanged.</p></div><Link href="/school-dashboard/academics?tab=classes" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Open academics</Link></header>
    <form className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><label className="text-sm font-bold text-slate-700">Academic year<select name="year" defaultValue={yearId} className="ml-3 h-9 rounded-lg border border-slate-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500">{years.map((year) => <option key={year.id} value={year.id}>{year.name}{year.current ? " (Current)" : ""}</option>)}</select></label><button className="ml-2 h-9 rounded-lg bg-slate-900 px-3 text-sm font-bold text-white">Show</button></form>
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-bold text-slate-950">Entitled school books</h2><p className="mt-1 text-xs text-slate-500">Only books with an active SchoolBookEntitlement can be assigned.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{books.length} available</span></div>{books.length ? <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">{books.map((book) => <article key={book.id} className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/60 p-3"><BookOpen className="h-4 w-4 text-blue-700" aria-hidden="true" /><h3 className="mt-2 truncate text-sm font-bold text-slate-800">{book.title}</h3><p className="mt-1 truncate text-xs text-slate-500">{book.class.name} · {book.subject.name}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{book.series?.name ?? "No series"}</p></article>)}</div> : <p className="mt-4 rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">No entitled books are available.</p>}</section>
    <SchoolBookAssignmentWorkspace classes={classWorkspaces} entitledBookCount={books.length} />
  </main>;
}
