import { ContentEntitlementStatus, ResourceType } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import EntitlementActionForm from "@/components/admin/EntitlementActionForm";
import { prisma } from "@/lib/prisma";
import { requirePublisherAdminSchoolOwnership } from "@/lib/publisher-admin-data";
import {
  assignSchoolResourcesAction,
  changeSchoolResourceEntitlementAction,
} from "../content-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Search = {
  query?: string;
  type?: string;
  classId?: string;
  subjectId?: string;
  bookId?: string;
  chapterId?: string;
  status?: string;
};

export default async function SchoolResourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const { id } = await params;
  const actor = await requirePublisherAdminSchoolOwnership(id);
  const filters = await searchParams;
  const query = filters.query?.trim() || undefined;
  const type = Object.values(ResourceType).includes(filters.type as ResourceType)
    ? (filters.type as ResourceType)
    : undefined;
  const status = Object.values(ContentEntitlementStatus).includes(
    filters.status as ContentEntitlementStatus,
  )
    ? (filters.status as ContentEntitlementStatus)
    : undefined;

  const [school, resources, classes, subjects, books, chapters] = await Promise.all([
    prisma.school.findFirst({
      where: { id, publisherId: actor.publisherId },
      select: { id: true, schoolName: true, status: true },
    }),
    prisma.resource.findMany({
      where: {
        publisherId: actor.publisherId,
        archived: false,
        type,
        classId: filters.classId || undefined,
        subjectId: filters.subjectId || undefined,
        bookId: filters.bookId || undefined,
        chapterId: filters.chapterId || undefined,
        OR: query
          ? [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ]
          : undefined,
        schoolEntitlements: status
          ? { some: { schoolId: id, status } }
          : undefined,
      },
      select: {
        id: true,
        title: true,
        type: true,
        published: true,
        audience: true,
        thumbnail: true,
        classRef: { select: { name: true } },
        subjectRef: { select: { name: true } },
        book: { select: { title: true } },
        chapter: { select: { title: true, chapterNumber: true } },
        schoolEntitlements: { where: { schoolId: id }, take: 1 },
      },
      orderBy: [{ type: "asc" }, { title: "asc" }],
    }),
    prisma.class.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
    prisma.subject.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
    prisma.book.findMany({ where: { publisherId: actor.publisherId, archived: false }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.bookChapter.findMany({
      where: { book: { publisherId: actor.publisherId }, archived: false },
      select: { id: true, title: true, chapterNumber: true },
      orderBy: [{ chapterNumber: "asc" }, { title: "asc" }],
    }),
  ]);
  if (!school) notFound();

  return (
    <main className="min-w-0 space-y-6">
      <header>
        <Link href={`/admin/schools/${id}`} className="font-semibold text-blue-700">← {school.schoolName}</Link>
        <h1 className="mt-3 break-words text-3xl font-bold">School resource entitlements</h1>
        <p className="mt-2 text-slate-600">Assign references to publisher resources without copying uploaded files.</p>
      </header>

      <form className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 xl:grid-cols-7">
        <label className="text-sm font-semibold sm:col-span-2">
          Search
          <input name="query" defaultValue={query} className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal" />
        </label>
        <Filter name="type" label="Type" value={type} options={Object.values(ResourceType).map((item) => ({ value: item, label: item }))} />
        <Filter name="classId" label="Class" value={filters.classId} options={classes.map((item) => ({ value: item.id, label: item.name }))} />
        <Filter name="subjectId" label="Subject" value={filters.subjectId} options={subjects.map((item) => ({ value: item.id, label: item.name }))} />
        <Filter name="bookId" label="Book" value={filters.bookId} options={books.map((item) => ({ value: item.id, label: item.title }))} />
        <Filter name="chapterId" label="Chapter" value={filters.chapterId} options={chapters.map((item) => ({ value: item.id, label: `${item.chapterNumber}. ${item.title}` }))} />
        <Filter name="status" label="Status" value={status} options={Object.values(ContentEntitlementStatus).map((item) => ({ value: item, label: item }))} />
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 xl:col-span-6">
          <button className="min-h-11 rounded-xl bg-slate-900 px-5 font-semibold text-white">Apply filters</button>
          <Link href={`/admin/schools/${id}/resources`} className="min-h-11 rounded-xl border px-5 py-2.5 font-semibold">Clear</Link>
          <span className="py-3 text-sm text-slate-500">{resources.length} resource(s)</span>
        </div>
      </form>

      <form action={assignSchoolResourcesAction.bind(null, id)} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Select resources for bulk activation.</p>
          <button className="min-h-11 rounded-xl bg-blue-700 px-5 font-semibold text-white">Add selected resources</button>
        </div>
        <div className="space-y-3">
          {resources.map((resource) => {
            const entitlement = resource.schoolEntitlements[0];
            return (
              <article key={resource.id} className="grid min-w-0 gap-4 rounded-2xl border bg-white p-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)] lg:items-center">
                <div className="flex min-w-0 gap-3">
                  <input
                    type="checkbox"
                    name="resourceId"
                    value={resource.id}
                    aria-label={`Select ${resource.title}`}
                    disabled={entitlement?.status === ContentEntitlementStatus.ACTIVE}
                    className="mt-1 size-5 shrink-0"
                  />
                  <div className="min-w-0">
                    <h2 className="break-words font-bold">{resource.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {resource.type} · {resource.classRef?.name ?? "All classes"} · {resource.subjectRef?.name ?? "General"}
                    </p>
                    <p className="mt-1 break-words text-sm text-slate-500">
                      {resource.book?.title ?? "No book"}{resource.chapter ? ` · Chapter ${resource.chapter.chapterNumber}: ${resource.chapter.title}` : ""}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {resource.audience} · {resource.published ? "Published" : "Draft"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold">
                    Entitlement: {entitlement?.status ?? "UNASSIGNED"}
                    {entitlement ? ` · ${entitlement.assignedAt.toLocaleDateString("en-IN")}` : ""}
                  </p>
                  {entitlement ? (
                    <EntitlementActionForm
                      action={changeSchoolResourceEntitlementAction.bind(null, id, entitlement.id)}
                      currentStatus={entitlement.status}
                      kind="resource"
                    />
                  ) : null}
                </div>
              </article>
            );
          })}
          {!resources.length ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">No resources match these filters.</div> : null}
        </div>
      </form>
    </main>
  );
}

function Filter({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <select name={name} defaultValue={value ?? ""} className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal">
        <option value="">All</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
