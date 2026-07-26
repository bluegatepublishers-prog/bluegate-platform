import Link from "next/link";
import { BookOpen, LibraryBig } from "lucide-react";
import { PlatformFeatureKey } from "@prisma/client";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";
import { normalizeAcademicName } from "@/lib/book-adoptions";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { assignApprovedBook } from "../academic-actions";
import { requestBookAdoption } from "../book-adoptions/actions";

export const dynamic = "force-dynamic";

export default async function SchoolBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const school = await requireSchool();
  if (
    !school.publisherId ||
    !await isPublisherFeatureEnabled(
      school.publisherId,
      PlatformFeatureKey.BOOK_APPROVALS,
    )
  ) notFound();
  const params = await searchParams;
  const years = await prisma.academicYear.findMany({
    where: { schoolId: school.id, active: true },
    orderBy: [{ current: "desc" }, { startDate: "desc" }],
  });
  const yearId = years.some((year) => year.id === params.year)
    ? params.year!
    : years.find((year) => year.current)?.id ?? years[0]?.id ?? "";
  const [books, classes, adoptions] = await Promise.all([
    prisma.book.findMany({
      where: {
        publisherId: school.publisherId,
        published: true,
        archived: false,
        schoolEntitlements: {
          some: {
            schoolId: school.id,
            publisherId: school.publisherId,
            status: "ACTIVE",
          },
        },
      },
      include: { class: true, subject: true, series: true },
      orderBy: [{ class: { sortOrder: "asc" } }, { subject: { sortOrder: "asc" } }, { title: "asc" }],
    }),
    prisma.schoolClass.findMany({
      where: { schoolId: school.id, academicYearId: yearId, active: true },
      include: {
        sections: {
          where: { active: true },
          include: {
            subjects: {
              where: { active: true },
              include: { subject: true, book: true },
              orderBy: { sortOrder: "asc" },
            },
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.schoolBookAdoption.findMany({
      where: { schoolId: school.id, academicYearId: yearId, active: true },
      include: { book: true },
      orderBy: { requestedAt: "desc" },
    }),
  ]);
  const scopes = classes.flatMap((schoolClass) =>
    schoolClass.sections.flatMap((section) =>
      section.subjects.map((sectionSubject) => ({
        schoolClass,
        section,
        sectionSubject,
        compatibleBooks: books.filter(
          (book) =>
            book.subjectId === sectionSubject.subjectId &&
            normalizeAcademicName(book.class.name) ===
              normalizeAcademicName(schoolClass.name),
        ),
        approved: adoptions.filter(
          (adoption) =>
            adoption.sectionSubjectId === sectionSubject.id &&
            adoption.status === "APPROVED",
        ),
        pending: adoptions.filter(
          (adoption) =>
            adoption.sectionSubjectId === sectionSubject.id &&
            adoption.status === "PENDING",
        ),
      })),
    ),
  );
  const approvedBooks = [
    ...new Map(
      adoptions
        .filter((adoption) => adoption.status === "APPROVED")
        .map((adoption) => [adoption.book.id, adoption.book]),
    ).values(),
  ];

  return (
    <main className="space-y-8 p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-3xl font-bold">School Books</h1>
        <p className="mt-2 text-slate-600">
          Browse publisher books, request adoption, and assign approved books to
          a class section and subject.
        </p>
      </header>

      <form className="rounded-2xl border bg-white p-4">
        <label className="font-semibold">
          Academic session
          <select name="year" defaultValue={yearId} className="ml-3 rounded-xl border px-4 py-3">
            {years.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}{year.current ? " (Current)" : ""}
              </option>
            ))}
          </select>
        </label>
        <button className="ml-3 rounded-xl border px-4 py-3 font-semibold">Show</button>
      </form>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Publisher Catalogue</h2>
            <p className="text-sm text-slate-500">Published books remain owned by the publisher.</p>
          </div>
          <span className="text-sm font-semibold">{books.length} books</span>
        </div>
        {books.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {books.map((book) => (
              <article key={book.id} className="min-w-0 rounded-2xl border bg-white p-5">
                <BookOpen className="h-7 w-7 text-blue-600" />
                <h3 className="mt-3 break-words font-bold">{book.title}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {book.class.name} · {book.subject.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">{book.series?.name ?? "No series"}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border bg-white p-8 text-slate-500">No published books.</p>
        )}
      </section>

      <section className="rounded-3xl border bg-white p-6">
        <h2 className="text-2xl font-bold">My School Books</h2>
        <p className="mt-1 text-sm text-slate-500">Books approved for the selected academic session.</p>
        {approvedBooks.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {approvedBooks.map((book) => (
              <li key={book.id} className="break-words rounded-xl bg-slate-50 p-4 font-semibold">
                {book.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-slate-500">No approved books yet.</p>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold">Adopt and Assign Books</h2>
        <p className="mt-1 text-sm text-slate-500">
          Request publisher approval first. Once approved, assign the book without
          changing resource assignments.
        </p>
        {scopes.length ? (
          <div className="mt-4 space-y-4">
            {scopes.map(({ schoolClass, section, sectionSubject, compatibleBooks, approved, pending }) => (
              <article key={sectionSubject.id} className="rounded-2xl border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{schoolClass.name} · Section {section.name}</h3>
                    <p className="text-sm text-slate-500">{sectionSubject.subject.name}</p>
                  </div>
                  <Link href={`/school-dashboard/classes/${schoolClass.id}`} className="font-semibold text-blue-700">
                    Open class setup
                  </Link>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <form action={requestBookAdoption} className="grid gap-3 rounded-xl bg-slate-50 p-4">
                    <input type="hidden" name="academicYearId" value={yearId} />
                    <input type="hidden" name="sectionSubjectIds" value={sectionSubject.id} />
                    <label className="font-semibold">Request adoption</label>
                    <select name="bookId" required defaultValue="" className="min-w-0 rounded-xl border bg-white px-3 py-3">
                      <option value="">Choose compatible publisher book</option>
                      {compatibleBooks.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
                    </select>
                    <input name="requestNote" placeholder="Optional note" className="min-w-0 rounded-xl border px-3 py-3" />
                    <button disabled={!compatibleBooks.length} className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
                      Request approval
                    </button>
                    {pending.length ? <p className="text-sm text-amber-700">Approval pending for {pending.length} book(s).</p> : null}
                  </form>

                  <form action={assignApprovedBook.bind(null, schoolClass.id)} className="grid gap-3 rounded-xl bg-slate-50 p-4">
                    <input type="hidden" name="sectionSubjectId" value={sectionSubject.id} />
                    <label className="font-semibold">Assign approved book</label>
                    <select name="bookId" defaultValue={sectionSubject.bookId ?? ""} className="min-w-0 rounded-xl border bg-white px-3 py-3">
                      <option value="">No book assigned</option>
                      {approved.map((adoption) => <option key={adoption.book.id} value={adoption.book.id}>{adoption.book.title}</option>)}
                    </select>
                    <button className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">
                      Save book assignment
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-3xl border bg-white p-10 text-center">
            <LibraryBig className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-slate-500">Create classes, sections, and subjects first.</p>
          </div>
        )}
      </section>
    </main>
  );
}
