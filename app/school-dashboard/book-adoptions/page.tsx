import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";
import { normalizeAcademicName } from "@/lib/book-adoptions";
import { requestBookAdoption, cancelBookAdoption } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BookAdoptionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const school = await requireSchool();
  const params = await searchParams;
  const years = await prisma.academicYear.findMany({ where: { schoolId: school.id }, orderBy: [{ current: "desc" }, { startDate: "desc" }] });
  const yearId = years.some((year) => year.id === params.year) ? params.year! : years.find((year) => year.current)?.id ?? years[0]?.id ?? "";
  const validStatuses = ["PENDING", "APPROVED", "REJECTED", "REVOKED", "EXPIRED"] as const;
  const status = validStatuses.find((item) => item === params.status);
  const query = params.query?.trim();
  const [classes, books, adoptions] = await Promise.all([
    prisma.schoolClass.findMany({ where: { schoolId: school.id, academicYearId: yearId, active: true }, include: { sections: { where: { active: true }, include: { subjects: { where: { active: true }, include: { subject: true } } } } }, orderBy: { sortOrder: "asc" } }),
    prisma.book.findMany({ where: { publisherId: school.publisherId, published: true }, include: { class: true, subject: true }, orderBy: { title: "asc" }, take: 200 }),
    prisma.schoolBookAdoption.findMany({ where: { schoolId: school.id, academicYearId: yearId, status, OR: query ? [{ book: { title: { contains: query, mode: "insensitive" } } }, { schoolClass: { name: { contains: query, mode: "insensitive" } } }, { sectionSubject: { subject: { name: { contains: query, mode: "insensitive" } } } }] : undefined }, include: { academicYear: true, schoolClass: true, section: true, sectionSubject: { include: { subject: true } }, book: true }, orderBy: { requestedAt: "desc" }, take: 200 }),
  ]);
  const scopes = classes.flatMap((schoolClass) => schoolClass.sections.flatMap((section) => section.subjects.map((link) => ({ schoolClass, section, link, compatible: books.filter((book) => book.subjectId === link.subjectId && normalizeAcademicName(book.class.name) === normalizeAcademicName(schoolClass.name)) }))));

  return <main className="space-y-7 p-4 sm:p-6 lg:p-8"><header><h1 className="text-3xl font-bold">Book Adoptions</h1><p className="mt-2 text-slate-600">Request annual publisher approval before protected books become available to this school.</p></header>
    <form className="grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-2 xl:grid-cols-4"><input name="query" defaultValue={query} placeholder="Search book, class, or subject" className="rounded-xl border px-4 py-3"/><select name="year" defaultValue={yearId} className="rounded-xl border px-4 py-3">{years.map((year) => <option key={year.id} value={year.id}>{year.name}{year.current ? " (Current)" : ""}</option>)}</select><select name="status" defaultValue={status ?? ""} className="rounded-xl border px-4"><option value="">All statuses</option>{validStatuses.map((item) => <option key={item}>{item}</option>)}</select><button className="rounded-xl bg-slate-900 px-5 py-3 text-white">Apply filters</button></form>
    <section className="space-y-4 rounded-3xl border bg-white p-6"><h2 className="text-xl font-bold">Request book adoption</h2><p className="text-sm text-slate-500">Only published books from your school’s publisher that match the class and subject are shown.</p>{scopes.map((scope) => <form action={requestBookAdoption} key={scope.link.id} className="grid gap-3 rounded-xl border p-4 lg:grid-cols-[1fr_1fr_1fr_auto]"><input type="hidden" name="academicYearId" value={yearId}/><input type="hidden" name="sectionSubjectIds" value={scope.link.id}/><div className="font-semibold">{scope.schoolClass.name} · Section {scope.section.name}<span className="block text-sm font-normal text-slate-500">{scope.link.subject.name}</span></div><select name="bookId" required className="rounded-xl border px-3"><option value="">Select compatible book</option>{scope.compatible.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select><input name="requestNote" placeholder="Optional request note" className="rounded-xl border px-3"/><button disabled={!scope.compatible.length} className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">Request approval</button></form>)}{!scopes.length && <p className="text-slate-500">Set up a class, section, and subject before requesting a book.</p>}</section>
    <section className="space-y-3"><h2 className="text-xl font-bold">Adoption history</h2>{adoptions.length ? adoptions.map((adoption) => <article key={adoption.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-4"><div><h3 className="font-bold">{adoption.book.title}</h3><p className="text-sm text-slate-500">{adoption.schoolClass.name} · Section {adoption.section.name} · {adoption.sectionSubject.subject.name} · {adoption.academicYear.name}</p><p className="mt-1 text-sm text-slate-500">Publisher: {adoption.book.publisher || school.publisher.name}</p><p className="mt-2 text-sm">{statusMessage(adoption.status, adoption.academicYear.name)}</p><p className="mt-1 text-xs text-slate-500">Requested {adoption.requestedAt.toLocaleString("en-IN")}</p>{adoption.reviewNote && <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">Publisher note: {adoption.reviewNote}</p>}{adoption.revokedReason && <p className="mt-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">Revocation reason: {adoption.revokedReason}</p>}</div><span className="h-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{adoption.status}</span></div>{adoption.status === "PENDING" && <form action={cancelBookAdoption.bind(null, adoption.id)}><button className="mt-4 text-sm font-semibold text-red-600">Cancel pending request</button></form>}</article>) : <div className="rounded-3xl border bg-white p-12 text-center text-slate-500">No adoption records match these filters.</div>}</section>
  </main>;
}

function statusMessage(status: string, year: string) {
  if (status === "PENDING") return "Waiting for publisher approval";
  if (status === "APPROVED") return `Approved for ${year}`;
  if (status === "REJECTED") return "Not approved";
  if (status === "REVOKED") return "Access withdrawn";
  return "Approval ended with the academic year";
}
