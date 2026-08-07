import Link from "next/link";
import {
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import {
  getInspectionRequests,
  type InspectionRequestRecord,
} from "@/lib/inspection-requests";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Inspection Requests | Bluegate Admin",
};

const PAGE_SIZE = 5;

type SearchParams = {
  query?: string;
  status?: string;
  page?: string;
};

export default async function InspectionRequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireLivePublisherAdmin();

  const filters = await searchParams;
  const search =
    filters.query?.trim() || "";

  if (!process.env.DATABASE_URL) {
    return (
      <ErrorCard
        title="Database configuration required"
        message="DATABASE_URL is not configured."
      />
    );
  }

  let requests:
    InspectionRequestRecord[] = [];

  let errorMessage:
    | string
    | null = null;

  try {
    requests =
      await getInspectionRequests(
        search,
      );
  } catch (error) {
    console.error(
      "Admin inspection requests list error:",
      error,
    );

    errorMessage =
      "Inspection requests cannot be loaded. Check the database connection and confirm the InspectionRequest migration has been applied.";
  }

  if (errorMessage) {
    return (
      <ErrorCard
        title="Unable to load inspection requests"
        message={errorMessage}
      />
    );
  }

  const status =
    filters.status?.trim() ?? "";

  const filtered =
    status
      ? requests.filter(
          (request) =>
            String(
              request.status,
            ) === status,
        )
      : requests;

  const statuses = Array.from(
    new Set(
      requests.map((request) =>
        String(request.status),
      ),
    ),
  ).sort();

  const totalPages = Math.max(
    1,
    Math.ceil(
      filtered.length /
        PAGE_SIZE,
    ),
  );

  const page = Math.min(
    normalizePage(filters.page),
    totalPages,
  );

  const visible =
    filtered.slice(
      (page - 1) *
        PAGE_SIZE,
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

  return (
    <main className="min-w-0 space-y-4">
      <header>
        <Link
          href="/admin/requests"
          className="text-[10px] font-semibold text-blue-700"
        >
          ← Requests
        </Link>

        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
          Request Management
        </p>

        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
          Inspection Requests
        </h1>

        <p className="mt-0.5 text-xs text-slate-500">
          Review inspection-copy requests submitted for publisher books.
        </p>
      </header>

      <form className="rounded-2xl border border-slate-200 bg-white p-2.5">
        <div className="grid gap-2 md:grid-cols-[1fr_180px_auto_auto]">
          <label className="relative">
            <span className="sr-only">
              Search requests
            </span>

            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />

            <input
              name="query"
              defaultValue={
                filters.query ?? ""
              }
              placeholder="Teacher, school, email, phone or book"
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
            href="/admin/inspection-requests"
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
          {requests.length} total
        </span>
      </div>

      {!visible.length ? (
        <section className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center">
          <ClipboardCheck className="mx-auto h-7 w-7 text-slate-300" />
          <p className="mt-2 text-xs font-semibold text-slate-700">
            No inspection requests match these filters.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[1.2fr_1.3fr_1.3fr_0.8fr_0.8fr_4rem] items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.11em] text-slate-500 lg:grid">
            <span>Teacher</span>
            <span>School</span>
            <span>Book</span>
            <span>Status</span>
            <span>Submitted</span>
            <span />
          </div>

          <div className="divide-y divide-slate-100">
            {visible.map(
              (request) => (
                <Link
                  key={request.id}
                  href={`/admin/inspection-requests/${request.id}`}
                  className="group grid min-h-[60px] gap-2 px-3 py-2.5 transition hover:bg-blue-50/30 lg:grid-cols-[1.2fr_1.3fr_1.3fr_0.8fr_0.8fr_4rem] lg:items-center lg:gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold text-slate-900">
                      {request.teacherName}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] text-slate-500">
                      {request.email}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold text-slate-700">
                      {request.schoolName}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] text-slate-400">
                      {request.mobile}
                    </p>
                  </div>

                  <p className="truncate text-[10px] text-slate-600">
                    {request.bookTitle}
                  </p>

                  <StatusBadge
                    status={String(
                      request.status,
                    )}
                  />

                  <p className="text-[9px] text-slate-500">
                    {request.createdAt.toLocaleDateString(
                      "en-IN",
                    )}
                  </p>

                  <span className="text-right text-[10px] font-semibold text-blue-700">
                    Open
                  </span>
                </Link>
              ),
            )}
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
  const normalized =
    status.toUpperCase();

  const tone =
    normalized === "NEW"
      ? "bg-blue-50 text-blue-700"
      : normalized === "APPROVED" ||
          normalized === "COMPLETED"
        ? "bg-emerald-50 text-emerald-700"
        : normalized === "REJECTED" ||
            normalized === "CANCELLED"
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
  children,
}: {
  href: string;
  disabled: boolean;
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

  return `/admin/inspection-requests?${params.toString()}`;
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

function ErrorCard({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
      <h1 className="text-sm font-bold text-rose-800">
        {title}
      </h1>
      <p className="mt-1 text-[10px] text-rose-700">
        {message}
      </p>
    </section>
  );
}
