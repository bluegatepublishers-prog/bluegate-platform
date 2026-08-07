import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

import { effectiveSchoolAccessStatus } from "@/lib/school-access-policy";
import {
  getSchoolCities,
  getSchools,
} from "@/lib/schools";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Schools | Bluegate Admin",
};

const PAGE_SIZE = 5;

type View =
  | "pending"
  | "active"
  | "suspended"
  | "expired"
  | "all";

type SearchParams = Promise<{
  query?: string;
  city?: string;
  plan?: string;
  accessStatus?: string;
  view?: string;
  page?: string;
}>;

export default async function AdminSchoolListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = await searchParams;

  const view: View = [
    "pending",
    "active",
    "suspended",
    "expired",
    "all",
  ].includes(filters.view ?? "")
    ? (filters.view as View)
    : "all";

  const plan =
    filters.plan === "FREE" ||
    filters.plan === "PAID"
      ? filters.plan
      : undefined;

  const accessStatus = [
    "ACTIVE",
    "SUSPENDED",
    "EXPIRED",
  ].includes(filters.accessStatus ?? "")
    ? (filters.accessStatus as
        | "ACTIVE"
        | "SUSPENDED"
        | "EXPIRED")
    : undefined;

  const [cities, schools] =
    await Promise.all([
      getSchoolCities(),
      getSchools({
        query: filters.query,
        city: filters.city,
        plan,
        accessStatus,
        view,
      }),
    ]);

  const summary = schools.reduce(
    (totals, school) => {
      const subscription =
        school.accessSubscription ?? {
          plan: "FREE" as const,
          status: "SUSPENDED" as const,
          startsAt: null,
          expiresAt: null,
        };

      const state =
        effectiveSchoolAccessStatus(
          subscription,
        );

      totals.total += 1;

      if (school.status === "PENDING") {
        totals.pending += 1;
      }

      if (subscription.plan === "FREE") {
        totals.free += 1;
      }

      if (subscription.plan === "PAID") {
        totals.paid += 1;
      }

      if (state === "ACTIVE") {
        totals.active += 1;
      }

      if (state === "SUSPENDED") {
        totals.suspended += 1;
      }

      if (state === "EXPIRED") {
        totals.expired += 1;
      }

      return totals;
    },
    {
      total: 0,
      pending: 0,
      active: 0,
      suspended: 0,
      expired: 0,
      free: 0,
      paid: 0,
    },
  );

  const statusTabs = [
    {
      key: "all",
      label: "All",
      value: summary.total,
    },
    {
      key: "active",
      label: "Active",
      value: summary.active,
    },
    {
      key: "pending",
      label: "Pending",
      value: summary.pending,
    },
    {
      key: "suspended",
      label: "Suspended",
      value: summary.suspended,
    },
    {
      key: "expired",
      label: "Expired",
      value: summary.expired,
    },
  ] as const;

  const requestedPage = Math.max(
    1,
    Number.parseInt(
      filters.page ?? "1",
      10,
    ) || 1,
  );

  const totalPages = Math.max(
    1,
    Math.ceil(
      schools.length / PAGE_SIZE,
    ),
  );

  const page = Math.min(
    requestedPage,
    totalPages,
  );

  const visibleSchools = schools.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const start =
    schools.length === 0
      ? 0
      : (page - 1) *
          PAGE_SIZE +
        1;

  const end = Math.min(
    page * PAGE_SIZE,
    schools.length,
  );

  return (
    <main className="min-w-0 space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
            School Network
          </p>

          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
            Schools
          </h1>

          <p className="mt-0.5 max-w-2xl text-xs leading-5 text-slate-500">
            Approve institutions, control
            Free or Paid access, platform
            features, and publisher content
            entitlements.
          </p>
        </div>

        <Link
          href="/admin/school-requests"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Review Approvals
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <SummaryCard
          label="Schools"
          value={summary.total}
        />

        <SummaryCard
          label="Pending"
          value={summary.pending}
        />

        <SummaryCard
          label="Free"
          value={summary.free}
        />

        <SummaryCard
          label="Paid"
          value={summary.paid}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="School status"
          className="flex gap-1.5 overflow-x-auto"
        >
          {statusTabs.map((item) => (
            <Link
              key={item.key}
              href={buildHref(
                filters,
                {
                  view: item.key,
                  page: "1",
                },
              )}
              aria-current={
                view === item.key
                  ? "page"
                  : undefined
              }
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-semibold transition ${
                view === item.key
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.label}{" "}
              <span className="opacity-75">
                {item.value}
              </span>
            </Link>
          ))}
        </nav>

        <p className="text-[10px] text-slate-400">
          Showing {start}–{end} of{" "}
          {schools.length}
        </p>
      </div>

      <form className="rounded-2xl border border-slate-200 bg-white p-2.5">
        <input
          type="hidden"
          name="view"
          value={view}
        />

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]">
          <label className="relative">
            <span className="sr-only">
              Search schools
            </span>

            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />

            <input
              name="query"
              defaultValue={
                filters.query
              }
              placeholder="Search school, city or state"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[11px] outline-none transition focus:border-blue-400"
            />
          </label>

          <Filter
            name="city"
            value={filters.city}
            ariaLabel="City"
          >
            <option value="">
              All cities
            </option>

            {cities.map((city) => (
              <option
                key={city}
                value={city}
              >
                {city}
              </option>
            ))}
          </Filter>

          <Filter
            name="plan"
            value={plan}
            ariaLabel="Plan"
          >
            <option value="">
              Free + Paid
            </option>
            <option value="FREE">
              Free
            </option>
            <option value="PAID">
              Paid
            </option>
          </Filter>

          <Filter
            name="accessStatus"
            value={accessStatus}
            ariaLabel="Access status"
          >
            <option value="">
              All access
            </option>
            <option value="ACTIVE">
              Active
            </option>
            <option value="SUSPENDED">
              Suspended
            </option>
            <option value="EXPIRED">
              Expired
            </option>
          </Filter>

          <button className="h-8 rounded-lg bg-slate-900 px-3 text-[10px] font-bold text-white">
            Apply
          </button>

          <Link
            href="/admin/schools"
            className="flex h-8 items-center justify-center rounded-lg border border-slate-200 px-3 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Reset
          </Link>
        </div>
      </form>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-[minmax(0,2.3fr)_1.15fr_0.8fr_0.9fr_0.75fr_0.75fr_2rem] items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 lg:grid">
          <span>School</span>
          <span>Location</span>
          <span>Plan</span>
          <span>Access</span>
          <span>Books</span>
          <span>Features</span>
          <span />
        </div>

        <ul className="divide-y divide-slate-100">
          {visibleSchools.map(
            (school) => {
              const subscription =
                school.accessSubscription ??
                {
                  plan: "FREE" as const,
                  status:
                    "SUSPENDED" as const,
                  startsAt: null,
                  expiresAt: null,
                  updatedAt: null,
                };

              const effectiveStatus =
                effectiveSchoolAccessStatus(
                  subscription,
                );

              const contentCount =
                school._count
                  .bookEntitlements +
                school._count
                  .resourceEntitlements;

              return (
                <li key={school.id}>
                  <Link
                    href={`/admin/schools/${school.id}`}
                    className="grid min-w-0 gap-2 px-3 py-2.5 transition hover:bg-blue-50/30 lg:grid-cols-[minmax(0,2.3fr)_1.15fr_0.8fr_0.9fr_0.75fr_0.75fr_2rem] lg:items-center lg:gap-3"
                  >
                    <span className="min-w-0">
                      <strong className="block truncate text-xs font-bold text-slate-900">
                        {
                          school.schoolName
                        }
                      </strong>

                      <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                        {school.user.email}
                      </span>

                      <span className="mt-1 flex flex-wrap gap-1 lg:hidden">
                        <CompactBadge
                          value={
                            subscription.plan
                          }
                        />
                        <CompactBadge
                          value={
                            effectiveStatus ===
                            "NOT_STARTED"
                              ? "Not started"
                              : effectiveStatus
                          }
                        />
                      </span>
                    </span>

                    <Cell
                      label="Location"
                      value={[
                        school.city,
                        school.state,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    />

                    <span className="hidden lg:block">
                      <CompactBadge
                        value={
                          subscription.plan
                        }
                      />
                    </span>

                    <span className="hidden lg:block">
                      <CompactBadge
                        value={
                          effectiveStatus ===
                          "NOT_STARTED"
                            ? "Not started"
                            : effectiveStatus
                        }
                      />
                    </span>

                    <Cell
                      label="Books"
                      value={String(
                        school._count
                          .bookEntitlements,
                      )}
                    />

                    <Cell
                      label="Content"
                      value={String(
                        contentCount,
                      )}
                    />

                    <ChevronRight
                      className="hidden h-4 w-4 text-slate-300 lg:block"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            },
          )}

          {!visibleSchools.length ? (
            <li className="p-8 text-center text-xs text-slate-500">
              No schools match these
              filters.
            </li>
          ) : null}
        </ul>
      </section>

      {totalPages > 1 ? (
        <nav
          aria-label="School pagination"
          className="flex items-center justify-center gap-1.5"
        >
          <PageLink
            disabled={page <= 1}
            href={buildHref(
              filters,
              {
                page: String(
                  page - 1,
                ),
              },
            )}
            label="Previous"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </PageLink>

          {Array.from(
            {
              length: totalPages,
            },
            (_, index) =>
              index + 1,
          ).map((number) => (
            <Link
              key={number}
              href={buildHref(
                filters,
                {
                  page: String(
                    number,
                  ),
                },
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

          <PageLink
            disabled={
              page >= totalPages
            }
            href={buildHref(
              filters,
              {
                page: String(
                  page + 1,
                ),
              },
            )}
            label="Next"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </PageLink>
        </nav>
      ) : null}
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
      <p className="text-[10px] font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function Filter({
  name,
  value,
  ariaLabel,
  children,
}: {
  name: string;
  value?: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? ""}
      aria-label={ariaLabel}
      className="h-8 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-700"
    >
      {children}
    </select>
  );
}

function Cell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="min-w-0 text-[11px] text-slate-600">
      <span className="mr-1 font-semibold text-slate-400 lg:hidden">
        {label}:
      </span>
      <span className="truncate">
        {value || "—"}
      </span>
    </span>
  );
}

function CompactBadge({
  value,
}: {
  value: string;
}) {
  const normalized =
    value.toUpperCase();

  const tone =
    normalized === "PAID" ||
    normalized === "ACTIVE" ||
    normalized === "APPROVED"
      ? "bg-emerald-50 text-emerald-700"
      : normalized === "FREE"
        ? "bg-blue-50 text-blue-700"
        : normalized ===
            "SUSPENDED"
          ? "bg-amber-50 text-amber-700"
          : normalized ===
              "EXPIRED"
            ? "bg-rose-50 text-rose-700"
            : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${tone}`}
    >
      {value.replaceAll("_", " ")}
    </span>
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

function buildHref(
  filters: {
    query?: string;
    city?: string;
    plan?: string;
    accessStatus?: string;
    view?: string;
    page?: string;
  },
  overrides: Record<
    string,
    string
  >,
) {
  const params =
    new URLSearchParams();

  const next = {
    ...filters,
    ...overrides,
  };

  for (const [key, value] of Object.entries(
    next,
  )) {
    if (value) {
      params.set(key, value);
    }
  }

  return `/admin/schools?${params.toString()}`;
}