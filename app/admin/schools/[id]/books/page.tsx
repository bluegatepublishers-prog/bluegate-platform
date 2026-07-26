import { ContentEntitlementStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import EntitlementActionForm from "@/components/admin/EntitlementActionForm";
import { prisma } from "@/lib/prisma";
import { requirePublisherAdminSchoolOwnership } from "@/lib/publisher-admin-data";
import {
  assignSchoolBooksAction,
  changeSchoolBookEntitlementAction,
} from "../content-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Search = {
  query?: string;
  classId?: string;
  subjectId?: string;
  seriesId?: string;
  board?: string;
  status?: string;
};

export default async function SchoolBooksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const { id } = await params;
  const actor = await requirePublisherAdminSchoolOwnership(id);
  const filters = await searchParams;
  const status = Object.values(ContentEntitlementStatus).includes(
    filters.status as ContentEntitlementStatus,
  )
    ? (filters.status as ContentEntitlementStatus)
    : undefined;
  const query = filters.query?.trim() || undefined;

  const [school, books, classes, subjects, series, boards] = await Promise.all([
    prisma.school.findFirst({
      where: { id, publisherId: actor.publisherId },
      select: { id: true, schoolName: true, status: true },
    }),
    prisma.book.findMany({
      where: {
        publisherId: actor.publisherId,
        archived: false,
        classId: filters.classId || undefined,
        subjectId: filters.subjectId || undefined,
        seriesId: filters.seriesId || undefined,
        board: filters.board || undefined,
        OR: query
          ? [
              { title: { contains: query, mode: "insensitive" } },
              { subtitle: { contains: query, mode: "insensitive" } },
            ]
          : undefined,
        schoolEntitlements: status
          ? { some: { schoolId: id, status } }
          : undefined,
      },
      select: {
        id: true,
        title: true,
        subtitle: true,
        coverImage: true,
        board: true,
        published: true,
        class: { select: { name: true } },
        subject: { select: { name: true } },
        series: { select: { name: true } },
        schoolEntitlements: {
          where: { schoolId: id },
          take: 1,
        },
      },
      orderBy: [{ class: { sortOrder: "asc" } }, { title: "asc" }],
    }),
    prisma.class.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.subject.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.bookSeries.findMany({
      where: { publisherId: actor.publisherId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.book.findMany({
      where: { publisherId: actor.publisherId, board: { not: null } },
      distinct: ["board"],
      select: { board: true },
      orderBy: { board: "asc" },
    }),
  ]);
  if (!school) notFound();

  const hasFilters = Boolean(
    query || filters.classId || filters.subjectId || filters.seriesId || filters.board || status,
  );

  return (
    <main className="min-w-0 space-y-6">
      <header>
        <Link href={`/admin/schools/${id}`} className="font-semibold text-blue-700">
          ← {school.schoolName}
        </Link>
        <h1 className="mt-3 break-words text-3xl font-bold">School book entitlements</h1>
        <p className="mt-2 text-slate-600">
          Publisher-owned books available to this school. Classroom adoption remains a separate
          school workflow.
        </p>
      </header>

      <form className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 xl:grid-cols-6">
        <label className="text-sm font-semibold sm:col-span-2">
          Search
          <input
            name="query"
            defaultValue={query}
            placeholder="Book title"
            className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal"
          />
        </label>
        <Select name="classId" label="Class" value={filters.classId} options={classes} />
        <Select name="subjectId" label="Subject" value={filters.subjectId} options={subjects} />
        <Select name="seriesId" label="Series" value={filters.seriesId} options={series} />
        <Select
          name="board"
          label="Board"
          value={filters.board}
          options={boards.flatMap((item) => item.board ? [{ id: item.board, name: item.board }] : [])}
        />
        <label className="text-sm font-semibold">
          Status
          <select name="status" defaultValue={status ?? ""} className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal">
            <option value="">Any status</option>
            {Object.values(ContentEntitlementStatus).map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 xl:col-span-5">
          <button className="min-h-11 rounded-xl bg-slate-900 px-5 font-semibold text-white">Apply filters</button>
          {hasFilters ? <Link href={`/admin/schools/${id}/books`} className="min-h-11 rounded-xl border px-5 py-2.5 font-semibold">Clear</Link> : null}
          <span className="py-3 text-sm text-slate-500">{books.length} book(s)</span>
        </div>
      </form>

      <form action={assignSchoolBooksAction.bind(null, id)} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Select unassigned, paused, revoked, or archived books for bulk activation.</p>
          <button className="min-h-11 rounded-xl bg-blue-700 px-5 font-semibold text-white">
            Add selected books
          </button>
        </div>
        <div className="space-y-3">
          {books.map((book) => {
            const entitlement = book.schoolEntitlements[0];
            return (
              <article key={book.id} className="grid min-w-0 gap-4 rounded-2xl border bg-white p-4 lg:grid-cols-[auto_minmax(0,1fr)_minmax(18rem,0.8fr)] lg:items-center">
                <div className="flex min-w-0 gap-3">
                  <input
                    aria-label={`Select ${book.title}`}
                    type="checkbox"
                    name="bookId"
                    value={book.id}
                    disabled={entitlement?.status === ContentEntitlementStatus.ACTIVE}
                    className="mt-2 size-5 shrink-0"
                  />
                  {book.coverImage ? <img src={book.coverImage} alt="" className="h-20 w-14 shrink-0 rounded-lg border object-cover" /> : <div className="h-20 w-14 shrink-0 rounded-lg bg-slate-100" />}
                  <div className="min-w-0">
                    <h2 className="break-words font-bold">{book.title}</h2>
                    {book.subtitle ? <p className="break-words text-sm text-slate-500">{book.subtitle}</p> : null}
                    <p className="mt-1 text-sm text-slate-600">
                      {book.class.name} · {book.subject.name} · {book.series?.name ?? "No series"} · {book.board ?? "No board"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Publication: {book.published ? "Published" : "Draft"}
                    </p>
                  </div>
                </div>
                <div className="lg:col-start-3">
                  <p className="mb-2 text-sm font-bold">
                    Entitlement: {entitlement?.status ?? "UNASSIGNED"}
                    {entitlement ? ` · ${entitlement.assignedAt.toLocaleDateString("en-IN")}` : ""}
                  </p>
                  {entitlement ? (
                    <EntitlementActionForm
                      action={changeSchoolBookEntitlementAction.bind(null, id, entitlement.id)}
                      currentStatus={entitlement.status}
                      kind="book"
                    />
                  ) : null}
                </div>
              </article>
            );
          })}
          {!books.length ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">No books match these filters.</div> : null}
        </div>
      </form>
    </main>
  );
}

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: Array<{ id: string; name: string }>;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <select name={name} defaultValue={value ?? ""} className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal">
        <option value="">All</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>
  );
}
