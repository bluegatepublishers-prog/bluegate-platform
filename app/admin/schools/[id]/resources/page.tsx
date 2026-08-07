import {
  ContentEntitlementStatus,
  ResourceType,
} from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  Search,
} from "lucide-react";

import ResourceEntitlementActions from "@/components/admin/schools/ResourceEntitlementActions";
import { prisma } from "@/lib/prisma";
import { requirePublisherAdminSchoolOwnership } from "@/lib/publisher-admin-data";

import { assignSchoolResourcesAction } from "../content-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 5;

type SearchFilters = {
  query?: string;
  type?: string;
  classId?: string;
  subjectId?: string;
  bookId?: string;
  chapterId?: string;
  status?: string;
  page?: string;
};

export default async function SchoolResourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchFilters>;
}) {
  const { id } = await params;

  const actor =
    await requirePublisherAdminSchoolOwnership(
      id,
    );

  const filters = await searchParams;
  const query =
    filters.query?.trim() || undefined;

  const type = Object.values(
    ResourceType,
  ).includes(
    filters.type as ResourceType,
  )
    ? (filters.type as ResourceType)
    : undefined;

  const status = Object.values(
    ContentEntitlementStatus,
  ).includes(
    filters.status as
      ContentEntitlementStatus,
  )
    ? (filters.status as
        ContentEntitlementStatus)
    : undefined;

  const requestedPage =
    normalizePage(filters.page);

  const [
    school,
    resources,
    classes,
    subjects,
    books,
    chapters,
  ] = await Promise.all([
    prisma.school.findFirst({
      where: {
        id,
        publisherId:
          actor.publisherId,
      },
      select: {
        id: true,
        schoolName: true,
        status: true,
      },
    }),

    prisma.resource.findMany({
      where: {
        publisherId:
          actor.publisherId,
        archived: false,
        type,
        classId:
          filters.classId ||
          undefined,
        subjectId:
          filters.subjectId ||
          undefined,
        bookId:
          filters.bookId ||
          undefined,
        chapterId:
          filters.chapterId ||
          undefined,
        OR: query
          ? [
              {
                title: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            ]
          : undefined,
        schoolEntitlements: status
          ? {
              some: {
                schoolId: id,
                status,
              },
            }
          : undefined,
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        published: true,
        audience: true,
        classRef: {
          select: {
            name: true,
          },
        },
        subjectRef: {
          select: {
            name: true,
          },
        },
        book: {
          select: {
            title: true,
          },
        },
        chapter: {
          select: {
            title: true,
            chapterNumber: true,
          },
        },
        schoolEntitlements: {
          where: {
            schoolId: id,
          },
          take: 1,
        },
      },
      orderBy: [
        {
          type: "asc",
        },
        {
          title: "asc",
        },
      ],
    }),

    prisma.class.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    }),

    prisma.subject.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    }),

    prisma.book.findMany({
      where: {
        publisherId:
          actor.publisherId,
        archived: false,
      },
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        title: "asc",
      },
    }),

    prisma.bookChapter.findMany({
      where: {
        book: {
          publisherId:
            actor.publisherId,
        },
        archived: false,
      },
      select: {
        id: true,
        title: true,
        chapterNumber: true,
      },
      orderBy: [
        {
          chapterNumber: "asc",
        },
        {
          title: "asc",
        },
      ],
    }),
  ]);

  if (!school) {
    notFound();
  }

  const assignedCount =
    resources.filter((resource) =>
      Boolean(
        resource
          .schoolEntitlements[0],
      ),
    ).length;

  const activeCount =
    resources.filter(
      (resource) =>
        resource
          .schoolEntitlements[0]
          ?.status ===
        ContentEntitlementStatus.ACTIVE,
    ).length;

  const availableCount =
    resources.length - activeCount;

  const totalPages = Math.max(
    1,
    Math.ceil(
      resources.length /
        PAGE_SIZE,
    ),
  );

  const page = Math.min(
    requestedPage,
    totalPages,
  );

  const visibleResources =
    resources.slice(
      (page - 1) *
        PAGE_SIZE,
      page * PAGE_SIZE,
    );

  const start =
    resources.length === 0
      ? 0
      : (page - 1) *
          PAGE_SIZE +
        1;

  const end = Math.min(
    page * PAGE_SIZE,
    resources.length,
  );

  const hasFilters = Boolean(
    query ||
      type ||
      filters.classId ||
      filters.subjectId ||
      filters.bookId ||
      filters.chapterId ||
      status,
  );

  return (
    <main className="min-w-0 space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/admin/schools/${id}`}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {school.schoolName}
            </Link>

            <div className="mt-1.5 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <FileText className="h-4 w-4" />
              </span>

              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-950">
                  Resource Entitlements
                </h1>

                <p className="text-[10px] text-slate-500">
                  Assign publisher learning
                  resources to this school.
                </p>
              </div>
            </div>
          </div>

          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
            {school.status}
          </span>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric
          label="Matching Resources"
          value={resources.length}
        />
        <Metric
          label="Assigned"
          value={assignedCount}
        />
        <Metric
          label="Active"
          value={activeCount}
        />
        <Metric
          label="Available"
          value={availableCount}
        />
      </section>

      <form className="rounded-2xl border border-slate-200 bg-white p-2.5">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[2fr_repeat(6,minmax(0,1fr))_auto_auto]">
          <label className="relative">
            <span className="sr-only">
              Search resources
            </span>

            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />

            <input
              name="query"
              defaultValue={
                filters.query ?? ""
              }
              placeholder="Search title or description"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[11px] outline-none focus:border-blue-400"
            />
          </label>

          <Filter
            name="type"
            label="Type"
            value={type}
          >
            <option value="">
              All types
            </option>

            {Object.values(
              ResourceType,
            ).map((item) => (
              <option
                key={item}
                value={item}
              >
                {prettyStatus(item)}
              </option>
            ))}
          </Filter>

          <Filter
            name="classId"
            label="Class"
            value={
              filters.classId
            }
          >
            <option value="">
              All classes
            </option>

            {classes.map(
              (item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ),
            )}
          </Filter>

          <Filter
            name="subjectId"
            label="Subject"
            value={
              filters.subjectId
            }
          >
            <option value="">
              All subjects
            </option>

            {subjects.map(
              (item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ),
            )}
          </Filter>

          <Filter
            name="bookId"
            label="Book"
            value={
              filters.bookId
            }
          >
            <option value="">
              All books
            </option>

            {books.map((book) => (
              <option
                key={book.id}
                value={book.id}
              >
                {book.title}
              </option>
            ))}
          </Filter>

          <Filter
            name="chapterId"
            label="Chapter"
            value={
              filters.chapterId
            }
          >
            <option value="">
              All chapters
            </option>

            {chapters.map(
              (chapter) => (
                <option
                  key={chapter.id}
                  value={chapter.id}
                >
                  {chapter.chapterNumber
                    ? `${chapter.chapterNumber}. `
                    : ""}
                  {chapter.title}
                </option>
              ),
            )}
          </Filter>

          <Filter
            name="status"
            label="Status"
            value={status}
          >
            <option value="">
              Any status
            </option>

            {Object.values(
              ContentEntitlementStatus,
            ).map((item) => (
              <option
                key={item}
                value={item}
              >
                {prettyStatus(item)}
              </option>
            ))}
          </Filter>

          <button
            type="submit"
            className="h-8 rounded-lg bg-slate-900 px-3 text-[10px] font-bold text-white"
          >
            Apply
          </button>

          <Link
            href={`/admin/schools/${id}/resources`}
            className="flex h-8 items-center justify-center rounded-lg border border-slate-200 px-3 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-slate-500">
        <span>
          Showing {start}–{end} of{" "}
          {resources.length} resources
        </span>

        {hasFilters ? (
          <Link
            href={`/admin/schools/${id}/resources`}
            className="font-semibold text-blue-700"
          >
            Clear filters
          </Link>
        ) : null}
      </div>

      <form
        id="bulk-assign-resources"
        action={assignSchoolResourcesAction.bind(
          null,
          id,
        )}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
      >
        <p className="text-[10px] text-slate-500">
          Select inactive or unassigned
          resources below and activate them
          for this school.
        </p>

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-bold text-white"
        >
          Add Selected
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-[2rem_2.8rem_minmax(0,2fr)_0.8fr_1fr_1.2fr_0.8fr_8rem] items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.11em] text-slate-500 lg:grid">
          <span />
          <span>Type</span>
          <span>Resource</span>
          <span>Audience</span>
          <span>Class / Subject</span>
          <span>Book / Chapter</span>
          <span>Status</span>
          <span className="text-right">
            Actions
          </span>
        </div>

        <ul className="divide-y divide-slate-100">
          {visibleResources.map(
            (resource) => {
              const entitlement =
                resource
                  .schoolEntitlements[0] ??
                null;

              const entitlementStatus =
                entitlement?.status ??
                null;

              const selectable =
                !entitlementStatus ||
                entitlementStatus !==
                  ContentEntitlementStatus.ACTIVE;

              return (
                <li
                  key={resource.id}
                  className="grid gap-2 px-3 py-2.5 transition hover:bg-blue-50/30 lg:grid-cols-[2rem_2.8rem_minmax(0,2fr)_0.8fr_1fr_1.2fr_0.8fr_8rem] lg:items-center lg:gap-3"
                >
                  <div>
                    {selectable ? (
                      <input
                        form="bulk-assign-resources"
                        type="checkbox"
                        name="resourceId"
                        value={
                          resource.id
                        }
                        aria-label={`Select ${resource.title}`}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    ) : (
                      <span className="block h-4 w-4" />
                    )}
                  </div>

                  <ResourceTypeBadge
                    type={resource.type}
                  />

                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900">
                      {resource.title}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {resource.description ||
                        "Publisher resource"}
                    </p>

                    <p className="mt-1 text-[9px] text-slate-400 lg:hidden">
                      {resource.classRef
                        ?.name ??
                        "All classes"}{" "}
                      ·{" "}
                      {resource.subjectRef
                        ?.name ??
                        "All subjects"}
                    </p>
                  </div>

                  <p className="hidden truncate text-[10px] font-semibold text-slate-600 lg:block">
                    {prettyStatus(
                      String(
                        resource.audience,
                      ),
                    )}
                  </p>

                  <div className="hidden min-w-0 lg:block">
                    <p className="truncate text-[10px] font-semibold text-slate-700">
                      {resource.classRef
                        ?.name ??
                        "All classes"}
                    </p>

                    <p className="mt-0.5 truncate text-[9px] text-slate-400">
                      {resource.subjectRef
                        ?.name ??
                        "All subjects"}
                    </p>
                  </div>

                  <div className="hidden min-w-0 lg:block">
                    <p className="truncate text-[10px] font-semibold text-slate-700">
                      {resource.book
                        ?.title ??
                        "General resource"}
                    </p>

                    <p className="mt-0.5 truncate text-[9px] text-slate-400">
                      {resource.chapter
                        ? `${
                            resource
                              .chapter
                              .chapterNumber
                              ? `Ch. ${resource.chapter.chapterNumber} · `
                              : ""
                          }${resource.chapter.title}`
                        : "No chapter"}
                    </p>
                  </div>

                  <StatusBadge
                    status={
                      entitlementStatus
                    }
                  />

                  <div className="flex justify-start lg:justify-end">
                    {entitlement ? (
                      <ResourceEntitlementActions
                        schoolId={id}
                        entitlementId={
                          entitlement.id
                        }
                        status={
                          entitlement.status
                        }
                      />
                    ) : (
                      <form
                        action={assignSchoolResourcesAction.bind(
                          null,
                          id,
                        )}
                      >
                        <input
                          type="hidden"
                          name="resourceId"
                          value={
                            resource.id
                          }
                        />

                        <button
                          type="submit"
                          className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-bold text-white"
                        >
                          Assign
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            },
          )}

          {!visibleResources.length ? (
            <li className="p-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-300" />

              <p className="mt-3 text-xs font-semibold text-slate-700">
                No resources found.
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                Change or reset the
                filters.
              </p>
            </li>
          ) : null}
        </ul>
      </section>

      {totalPages > 1 ? (
        <nav
          aria-label="Resource pagination"
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
        >
          <span className="text-[10px] text-slate-500">
            Page{" "}
            <strong>{page}</strong>{" "}
            of{" "}
            <strong>
              {totalPages}
            </strong>
          </span>

          <div className="flex items-center gap-1">
            <PageArrow
              disabled={page <= 1}
              href={pageHref(
                id,
                filters,
                page - 1,
              )}
              label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </PageArrow>

            {pageNumbers(
              page,
              totalPages,
            ).map((number) => (
              <Link
                key={number}
                href={pageHref(
                  id,
                  filters,
                  number,
                )}
                aria-current={
                  number === page
                    ? "page"
                    : undefined
                }
                className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-[10px] font-bold ${
                  number === page
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {number}
              </Link>
            ))}

            <PageArrow
              disabled={
                page >= totalPages
              }
              href={pageHref(
                id,
                filters,
                page + 1,
              )}
              label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </PageArrow>
          </div>
        </nav>
      ) : null}
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function Filter({
  name,
  value,
  label,
  children,
}: {
  name: string;
  value?: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? ""}
      aria-label={label}
      className="h-8 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-700"
    >
      {children}
    </select>
  );
}

function ResourceTypeBadge({
  type,
}: {
  type: ResourceType;
}) {
  return (
    <span className="inline-flex w-fit rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">
      {prettyStatus(type)}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status:
    | ContentEntitlementStatus
    | null;
}) {
  if (!status) {
    return (
      <span className="inline-flex w-fit rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">
        Unassigned
      </span>
    );
  }

  const tone =
    status ===
    ContentEntitlementStatus.ACTIVE
      ? "bg-emerald-50 text-emerald-700"
      : status ===
          ContentEntitlementStatus.PAUSED
        ? "bg-amber-50 text-amber-700"
        : status ===
            ContentEntitlementStatus.REVOKED
          ? "bg-rose-50 text-rose-700"
          : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex w-fit rounded-full px-2 py-1 text-[9px] font-bold ${tone}`}
    >
      {prettyStatus(status)}
    </span>
  );
}

function PageArrow({
  disabled,
  href,
  label,
  children,
}: {
  disabled: boolean;
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-label={label}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-300"
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

function pageHref(
  schoolId: string,
  filters: SearchFilters,
  page: number,
) {
  const params =
    new URLSearchParams();

  for (const [key, value] of Object.entries(
    filters,
  )) {
    if (
      key !== "page" &&
      value
    ) {
      params.set(
        key,
        value,
      );
    }
  }

  params.set(
    "page",
    String(
      Math.max(1, page),
    ),
  );

  return `/admin/schools/${schoolId}/resources?${params.toString()}`;
}

function pageNumbers(
  page: number,
  totalPages: number,
) {
  const start = Math.max(
    1,
    Math.min(
      page - 2,
      totalPages - 4,
    ),
  );

  const end = Math.min(
    totalPages,
    start + 4,
  );

  return Array.from(
    {
      length:
        end - start + 1,
    },
    (_, index) =>
      start + index,
  );
}

function normalizePage(
  value?: string,
) {
  const page = Number(value);

  if (
    !Number.isInteger(page) ||
    page < 1
  ) {
    return 1;
  }

  return page;
}

function prettyStatus(
  value: string,
) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}
