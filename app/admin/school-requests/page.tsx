import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  School,
} from "lucide-react";

import { getPublisherSchoolRequests } from "@/lib/onboarding-approvals";
import { reviewSchoolAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 5;

type SearchParams = {
  query?: string;
  status?: string;
  page?: string;
};

export default async function SchoolRequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = await searchParams;
  const schools =
    await getPublisherSchoolRequests();

  const query =
    filters.query?.trim().toLowerCase() ??
    "";

  const status =
    filters.status?.trim() ?? "";

  const filtered = schools.filter(
    (school) => {
      const haystack =
        `${school.schoolName} ${school.city} ${school.state} ${school.user.email} ${school.principalName ?? ""} ${school.user.name} ${school.user.phone ?? ""}`.toLowerCase();

      const queryMatch =
        !query ||
        haystack.includes(query);

      const statusMatch =
        !status ||
        school.status === status;

      return queryMatch && statusMatch;
    },
  );

  const totalPages = Math.max(
    1,
    Math.ceil(
      filtered.length / PAGE_SIZE,
    ),
  );

  const page = Math.min(
    normalizePage(filters.page),
    totalPages,
  );

  const visible = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const start =
    filtered.length === 0
      ? 0
      : (page - 1) *
          PAGE_SIZE +
        1;

  const end = Math.min(
    page * PAGE_SIZE,
    filtered.length,
  );

  const statuses = Array.from(
    new Set(
      schools.map(
        (school) => school.status,
      ),
    ),
  ).sort();

  return (
    <main className="min-w-0 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/requests"
            className="text-[10px] font-semibold text-blue-700"
          >
            ← Requests
          </Link>

          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
            Publisher Approval
          </p>

          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
            School Requests
          </h1>

          <p className="mt-0.5 text-xs text-slate-500">
            Review school onboarding requests and approval status.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
          {schools.length} total
        </span>
      </header>

      <form className="rounded-2xl border border-slate-200 bg-white p-2.5">
        <div className="grid gap-2 md:grid-cols-[1fr_180px_auto_auto]">
          <label className="relative">
            <span className="sr-only">
              Search schools
            </span>
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              name="query"
              defaultValue={
                filters.query ?? ""
              }
              placeholder="Search school, city, email or principal"
              className="h-8 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-[11px] outline-none focus:border-blue-400"
            />
          </label>

          <select
            name="status"
            defaultValue={status}
            aria-label="Status"
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px]"
          >
            <option value="">
              All statuses
            </option>
            {statuses.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {pretty(item)}
                </option>
              ),
            )}
          </select>

          <button
            type="submit"
            className="h-8 rounded-lg bg-slate-900 px-3 text-[10px] font-bold text-white"
          >
            Apply
          </button>

          <Link
            href="/admin/school-requests"
            className="flex h-8 items-center justify-center rounded-lg border border-slate-200 px-3 text-[10px] font-semibold text-slate-600"
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="flex items-center justify-between px-1 text-[10px] text-slate-500">
        <span>
          Showing {start}–{end} of{" "}
          {filtered.length}
        </span>
        <span>
          {schools.length} total
        </span>
      </div>

      {!visible.length ? (
        <section className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center">
          <School className="mx-auto h-7 w-7 text-slate-300" />
          <p className="mt-2 text-xs font-semibold text-slate-700">
            No school requests match these filters.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[1.5fr_0.9fr_0.9fr_0.8fr_1.4fr] items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.11em] text-slate-500 lg:grid">
            <span>School</span>
            <span>Location</span>
            <span>Status</span>
            <span>Contact</span>
            <span className="text-right">
              Review
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {visible.map((school) => (
              <article
                key={school.id}
                className="grid gap-3 px-3 py-3 lg:grid-cols-[1.5fr_0.9fr_0.9fr_0.8fr_1.4fr] lg:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold text-slate-900">
                    {school.schoolName}
                  </p>
                  <p className="mt-0.5 truncate text-[9px] text-slate-500">
                    {school.user.email}
                  </p>
                  <p className="mt-0.5 truncate text-[9px] text-slate-400">
                    Principal:{" "}
                    {school.principalName ??
                      school.user.name}
                  </p>
                </div>

                <p className="text-[10px] text-slate-600">
                  {school.city},{" "}
                  {school.state}
                </p>

                <StatusBadge
                  status={school.status}
                />

                <p className="text-[10px] text-slate-500">
                  {school.user.phone ??
                    "No phone"}
                </p>

                <form
                  action={
                    reviewSchoolAction
                  }
                  className="grid gap-1.5"
                >
                  <input
                    type="hidden"
                    name="schoolId"
                    value={school.id}
                  />

                  <textarea
                    name="reason"
                    rows={2}
                    maxLength={500}
                    placeholder="Reason only when required"
                    className="min-h-12 w-full resize-none rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] outline-none focus:border-blue-400"
                  />

                  <div className="flex justify-end gap-1">
                    <button
                      name="status"
                      value="APPROVED"
                      className="h-7 rounded-lg bg-emerald-600 px-2.5 text-[9px] font-bold text-white"
                    >
                      Approve
                    </button>

                    <button
                      name="status"
                      value="REJECTED"
                      className="h-7 rounded-lg border border-rose-200 px-2.5 text-[9px] font-bold text-rose-700"
                    >
                      Reject
                    </button>

                    <button
                      name="status"
                      value="SUSPENDED"
                      className="h-7 rounded-lg bg-slate-900 px-2.5 text-[9px] font-bold text-white"
                    >
                      Suspend
                    </button>
                  </div>

                  {school.onboardingReviews[0]?.reason ? (
                    <p className="truncate text-right text-[9px] text-slate-400">
                      Latest:{" "}
                      {
                        school
                          .onboardingReviews[0]
                          .reason
                      }
                    </p>
                  ) : null}
                </form>
              </article>
            ))}
          </div>
        </section>
      )}

      {totalPages > 1 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          filters={filters}
        />
      ) : null}
    </main>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const tone =
    status === "APPROVED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "PENDING"
        ? "bg-amber-50 text-amber-700"
        : status === "REJECTED"
          ? "bg-rose-50 text-rose-700"
          : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex w-fit rounded-full px-2 py-1 text-[9px] font-bold ${tone}`}
    >
      {pretty(status)}
    </span>
  );
}

function Pagination({
  page,
  totalPages,
  filters,
}: {
  page: number;
  totalPages: number;
  filters: SearchParams;
}) {
  return (
    <nav className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
      <span className="text-[10px] text-slate-500">
        Page <strong>{page}</strong> of{" "}
        <strong>{totalPages}</strong>
      </span>

      <div className="flex gap-1">
        <PageLink
          href={hrefFor(
            filters,
            page - 1,
          )}
          disabled={page <= 1}
          label="Previous"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </PageLink>

        <PageLink
          href={hrefFor(
            filters,
            page + 1,
          )}
          disabled={
            page >= totalPages
          }
          label="Next"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-300">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
    >
      {children}
    </Link>
  );
}

function hrefFor(
  filters: SearchParams,
  page: number,
) {
  const params =
    new URLSearchParams();

  if (filters.query) {
    params.set(
      "query",
      filters.query,
    );
  }

  if (filters.status) {
    params.set(
      "status",
      filters.status,
    );
  }

  params.set(
    "page",
    String(Math.max(1, page)),
  );

  return `/admin/school-requests?${params.toString()}`;
}

function normalizePage(
  value?: string,
) {
  const page = Number(value);

  return Number.isInteger(page) &&
    page > 0
    ? page
    : 1;
}

function pretty(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) =>
      c.toUpperCase(),
    );
}
