"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  QrRecord,
  QrStatus,
} from "@/components/admin/qr/QrList";

type RevisionDestination = {
  id: string;
  type: string;
  resourceId: string | null;
  bookResourceLinkId: string | null;
  validatedExternalUrl: string | null;
  externalHost: string | null;
  internalRoute: string | null;
  audience: string;
};

type Revision = {
  id: string;
  revisionNumber: number;
  reason: string;
  fromStatus: QrStatus | null;
  toStatus: QrStatus | null;
  previousDestination: RevisionDestination | null;
  newDestination: RevisionDestination | null;
  changedBy: {
    id: string;
    name: string;
    email: string;
  };
  changedAt: string;
  effectiveAt: string;
  appliedAt: string;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type QrRevisionHistoryProps = {
  open: boolean;
  qrCode: QrRecord | null;
  onClose: () => void;
  onChanged: (qrCode: QrRecord) => void;
};

function destinationLabel(destination: RevisionDestination | null) {
  if (!destination) return "None";
  if (destination.type === "RESOURCE") {
    return `Resource · ${destination.resourceId ?? "unavailable"}`;
  }
  if (destination.type === "BOOK_RESOURCE_LINK") {
    return `Book Resource Link · ${destination.bookResourceLinkId ?? "unavailable"}`;
  }
  if (destination.type === "EXTERNAL_URL") {
    return destination.externalHost ?? "External URL";
  }
  return destination.internalRoute ?? "Internal route";
}

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

export default function QrRevisionHistory({
  open,
  qrCode,
  onClose,
  onChanged,
}: QrRevisionHistoryProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<Revision[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pendingRevisionId, setPendingRevisionId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!qrCode) return;
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({
          page: String(page),
          pageSize: "10",
        });
        const response = await fetch(
          `/api/admin/qr-codes/${qrCode.id}/revisions?${query}`,
          { signal, cache: "no-store" },
        );
        const result = (await response.json()) as {
          items?: Revision[];
          pagination?: Pagination;
          error?: string;
        };
        if (!response.ok || !result.items || !result.pagination) {
          throw new Error(result.error || "Unable to load revision history.");
        }
        setItems(result.items);
        setPagination(result.pagination);
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load revision history.",
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, qrCode],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && qrCode && !dialog.open) {
      setPage(1);
      setItems([]);
      setPagination(null);
      setPendingRevisionId(null);
      setError(null);
      dialog.showModal();
    } else if ((!open || !qrCode) && dialog.open) {
      dialog.close();
    }
  }, [open, qrCode]);

  useEffect(() => {
    if (!open || !qrCode) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, open, qrCode]);

  if (!qrCode) return null;

  async function rollback(revision: Revision) {
    const selectedQr = qrCode;
    if (
      !selectedQr ||
      pendingRevisionId ||
      !revision.newDestination ||
      !window.confirm(
        `Roll back to the destination recorded in revision ${revision.revisionNumber}? This creates a new revision and keeps all later history.`,
      )
    ) {
      return;
    }

    setPendingRevisionId(revision.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/qr-codes/${selectedQr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollbackRevisionId: revision.id }),
      });
      const result = (await response.json()) as {
        qrCode?: QrRecord;
        error?: string;
      };
      if (!response.ok || !result.qrCode) {
        throw new Error(result.error || "Unable to roll back the destination.");
      }
      onChanged(result.qrCode);
      setPage(1);
      await load();
    } catch (rollbackError) {
      setError(
        rollbackError instanceof Error
          ? rollbackError.message
          : "Unable to roll back the destination.",
      );
    } finally {
      setPendingRevisionId(null);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        if (pendingRevisionId) event.preventDefault();
      }}
      onClose={onClose}
      aria-labelledby="qr-history-title"
      className="m-auto max-h-[92dvh] w-[min(54rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/45"
    >
      <div className="flex max-h-[92dvh] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
              Append-only audit trail
            </p>
            <h2
              id="qr-history-title"
              className="mt-1 truncate text-base font-semibold text-slate-950"
            >
              Revision History · {qrCode.name}
            </h2>
          </div>
          <button
            type="button"
            disabled={pendingRevisionId !== null}
            onClick={() => dialogRef.current?.close()}
            aria-label="Close revision history"
            className="rounded-md px-2 py-1 text-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {error ? (
            <div
              role="alert"
              className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}
          {loading && items.length === 0 ? (
            <div className="space-y-2" aria-label="Loading revision history">
              {Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-md bg-slate-100"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              No revision history is available.
            </p>
          ) : (
            <ol className="space-y-3">
              {items.map((revision) => (
                <li
                  key={revision.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        Revision {revision.revisionNumber} ·{" "}
                        {revision.reason.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {revision.changedBy.name} ·{" "}
                        {displayDate(revision.changedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={
                        pendingRevisionId !== null ||
                        !revision.newDestination
                      }
                      onClick={() => rollback(revision)}
                      className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      {pendingRevisionId === revision.id
                        ? "Rolling back…"
                        : "Rollback"}
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 text-[11px] sm:grid-cols-2">
                    <div className="rounded-md bg-slate-50 p-2.5">
                      <span className="block font-medium text-slate-500">
                        Destination
                      </span>
                      <span className="mt-1 block break-all text-slate-700">
                        {destinationLabel(revision.previousDestination)} →{" "}
                        {destinationLabel(revision.newDestination)}
                      </span>
                    </div>
                    <div className="rounded-md bg-slate-50 p-2.5">
                      <span className="block font-medium text-slate-500">
                        Status
                      </span>
                      <span className="mt-1 block text-slate-700">
                        {revision.fromStatus ?? "None"} →{" "}
                        {revision.toStatus ?? "None"}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
          <span>
            {pagination ? `${pagination.total} revision(s)` : "Revision history"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!pagination || page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              {pagination
                ? `${pagination.page} / ${pagination.totalPages}`
                : "—"}
            </span>
            <button
              type="button"
              disabled={
                !pagination || page >= pagination.totalPages || loading
              }
              onClick={() => setPage((current) => current + 1)}
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}
