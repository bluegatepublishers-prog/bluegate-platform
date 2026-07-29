"use client";

export type QrDestinationSummary = {
  id: string;
  type: "RESOURCE" | "BOOK_RESOURCE_LINK" | "EXTERNAL_URL" | "INTERNAL_ROUTE";
  audience: QrAudience;
  active: boolean;
  resourceId: string | null;
  bookResourceLinkId: string | null;
  validatedExternalUrl: string | null;
  externalHost: string | null;
  internalRoute: string | null;
};

export type QrAudience =
  | "PUBLIC"
  | "AUTHENTICATED"
  | "SCHOOL_MEMBER"
  | "TEACHER_ONLY"
  | "STUDENT_ONLY"
  | "TEACHER_OR_STUDENT";

export type QrStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "EXPIRED"
  | "ARCHIVED"
  | "SUSPENDED";

export type QrRecord = {
  id: string;
  publicCode: string;
  name: string;
  publisherId: string;
  bookId: string;
  targetType: "BOOK" | "PART" | "UNIT" | "CHAPTER" | "MODULE" | "TOPIC";
  partId: string | null;
  unitId: string | null;
  chapterId: string | null;
  moduleId: string | null;
  topicId: string | null;
  status: QrStatus;
  audience: QrAudience;
  currentDestinationId: string | null;
  qrEligible: boolean;
  activatesAt: string | null;
  expiresAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  book: {
    id: string;
    title: string;
  };
  target: {
    type: "BOOK" | "PART" | "UNIT" | "CHAPTER" | "MODULE" | "TOPIC";
    id: string | null;
    title: string;
    subtitle: string;
  };
  currentDestination: QrDestinationSummary | null;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type QrListProps = {
  items: QrRecord[];
  pagination: Pagination;
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (id: string) => void;
  onPageChange: (page: number) => void;
};

const statusStyles: Record<QrStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  DRAFT: "bg-slate-100 text-slate-600 ring-slate-500/20",
  PAUSED: "bg-amber-50 text-amber-700 ring-amber-600/20",
  EXPIRED: "bg-orange-50 text-orange-700 ring-orange-600/20",
  ARCHIVED: "bg-slate-100 text-slate-500 ring-slate-500/20",
  SUSPENDED: "bg-red-50 text-red-700 ring-red-600/20",
};

function LoadingRows() {
  return (
    <div className="space-y-2 p-3" aria-label="Loading QR codes">
      {Array.from({ length: 7 }, (_, index) => (
        <div
          key={index}
          className="h-20 animate-pulse rounded-lg border border-slate-100 bg-slate-50"
        />
      ))}
    </div>
  );
}

export default function QrList({
  items,
  pagination,
  selectedId,
  loading,
  error,
  onSelect,
  onPageChange,
}: QrListProps) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">QR codes</h2>
          <p className="text-xs text-slate-500">
            {pagination.total.toLocaleString()} total
          </p>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          Page {pagination.page} of {pagination.totalPages}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <LoadingRows />
        ) : error ? (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-xl text-slate-500">
              #
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              No QR codes found
            </h3>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              Adjust the search or filters to find a QR code.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((qr) => {
              const selected = qr.id === selectedId;
              return (
                <li key={qr.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(qr.id)}
                    aria-pressed={selected}
                    className={`w-full border-l-2 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                      selected
                        ? "border-blue-600 bg-blue-50/70"
                        : "border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {qr.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {qr.target.title}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${statusStyles[qr.status]}`}
                      >
                        {qr.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="truncate">{qr.book.title}</span>
                      <span aria-hidden>•</span>
                      <span>{qr.target.subtitle}</span>
                      <span aria-hidden>•</span>
                      <span className="truncate font-mono">{qr.publicCode}</span>
                      <span aria-hidden>•</span>
                      <span className="truncate">
                        {qr.currentDestination?.type ?? "No destination"}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <button
          type="button"
          disabled={loading || pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-xs text-slate-500">
          {items.length} shown
        </span>
        <button
          type="button"
          disabled={loading || pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </section>
  );
}
