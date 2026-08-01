"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import CreateQrWizard from "@/components/admin/qr/CreateQrWizard";
import ChangeQrDestinationDialog from "@/components/admin/qr/ChangeQrDestinationDialog";
import QrDownloadDialog from "@/components/admin/qr/QrDownloadDialog";
import QrFilters, {
  type QrFilterValues,
} from "@/components/admin/qr/QrFilters";
import QrInspector from "@/components/admin/qr/QrInspector";
import QrRevisionHistory from "@/components/admin/qr/QrRevisionHistory";
import QrList, {
  type Pagination,
  type QrRecord,
} from "@/components/admin/qr/QrList";

type ListResponse = {
  items?: QrRecord[];
  pagination?: Pagination;
  error?: string;
};

const emptyPagination: Pagination = {
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 1,
};

export default function QrWorkspace() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [items, setItems] = useState<QrRecord[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<QrRecord | null>(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(() => searchParams.get("create") === "1");
  const [downloadQr, setDownloadQr] = useState<QrRecord | null>(null);
  const [destinationQr, setDestinationQr] = useState<QrRecord | null>(null);
  const [historyQr, setHistoryQr] = useState<QrRecord | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [knownBooks, setKnownBooks] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [mobilePanel, setMobilePanel] = useState<
    "filters" | "list" | "inspector"
  >("list");

  const filters = useMemo<QrFilterValues>(
    () => ({
      q: searchParams.get("q") ?? "",
      bookId: searchParams.get("bookId") ?? "",
      status: (searchParams.get("status") ?? "") as QrFilterValues["status"],
      audience: (searchParams.get("audience") ??
        "") as QrFilterValues["audience"],
      targetType: (searchParams.get("targetType") ??
        "") as QrFilterValues["targetType"],
    }),
    [searchParams],
  );
  const selectedId = searchParams.get("qrId");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const initialSelection = searchParams.get("create") === "1" && searchParams.get("bookId")
    ? {
        book: { id: searchParams.get("bookId")!, title: searchParams.get("bookTitle") ?? "Selected Book" },
        target: {
          type: (searchParams.get("targetType") ?? "BOOK") as QrRecord["targetType"],
          id: searchParams.get("targetId") ?? searchParams.get("bookId")!,
          title: searchParams.get("targetTitle") ?? "Selected content",
        },
      }
    : null;

  const updateUrl = useCallback(
    (
      updates: Record<string, string | number | null | undefined>,
      push = false,
    ) => {
      const params = new URLSearchParams(queryString);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      const next = params.toString();
      const url = next ? `${pathname}?${next}` : pathname;
      if (push) window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [pathname, queryString],
  );

  useEffect(() => {
    const controller = new AbortController();
    const stateTimer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
    }, 0);
    const request = new URLSearchParams({
      page: String(page),
      pageSize: "25",
    });
    if (filters.q) request.set("search", filters.q);
    if (filters.bookId) request.set("bookId", filters.bookId);
    if (filters.status) request.set("status", filters.status);
    if (filters.audience) request.set("audience", filters.audience);
    if (filters.targetType) request.set("targetType", filters.targetType);

    fetch(`/api/admin/qr-codes?${request.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result = (await response.json()) as ListResponse;
        if (!response.ok || !result.items || !result.pagination) {
          throw new Error(result.error || "Unable to load QR codes.");
        }
        setItems(result.items);
        setPagination(result.pagination);
        setKnownBooks((current) => {
          const books = new Map(current.map((book) => [book.id, book]));
          for (const item of result.items!) books.set(item.book.id, item.book);
          return Array.from(books.values()).sort((left, right) =>
            left.title.localeCompare(right.title),
          );
        });
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError")
          return;
        setItems([]);
        setPagination(emptyPagination);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load QR codes.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => { window.clearTimeout(stateTimer); controller.abort(); };
  }, [
    filters.audience,
    filters.bookId,
    filters.q,
    filters.status,
    filters.targetType,
    page,
    refreshVersion,
  ]);

  const selectedInPage = items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) {
      const timer = window.setTimeout(() => { setSelectedDetail(null); setInspectorLoading(false); }, 0);
      return () => window.clearTimeout(timer);
    }
    if (selectedInPage) {
      const timer = window.setTimeout(() => { setSelectedDetail(selectedInPage); setInspectorLoading(false); }, 0);
      return () => window.clearTimeout(timer);
    }

    const controller = new AbortController();
    const stateTimer = window.setTimeout(() => setInspectorLoading(true), 0);
    fetch(`/api/admin/qr-codes/${selectedId}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          qrCode?: QrRecord;
          error?: string;
        };
        if (!response.ok || !result.qrCode) {
          throw new Error(result.error || "Unable to load QR details.");
        }
        setSelectedDetail(result.qrCode);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError")
          return;
        setSelectedDetail(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setInspectorLoading(false);
      });
    return () => { window.clearTimeout(stateTimer); controller.abort(); };
  }, [selectedId, selectedInPage]);

  function applyFilters(next: QrFilterValues) {
    updateUrl({
      q: next.q,
      bookId: next.bookId,
      status: next.status,
      audience: next.audience,
      targetType: next.targetType,
      page: 1,
    });
    setMobilePanel("list");
  }

  function handleChanged(qrCode: QrRecord) {
    setSelectedDetail(qrCode);
    setItems((current) =>
      current.map((item) => (item.id === qrCode.id ? qrCode : item)),
    );
  }

  const wizardTargets = useMemo(() => {
    const targets = new Map<
      string,
      {
        bookId: string;
        type: QrRecord["targetType"];
        id: string;
        title: string;
        subtitle: string;
      }
    >();
    for (const item of items) {
      if (item.target.type === "BOOK" || !item.target.id) continue;
      targets.set(`${item.bookId}:${item.target.type}:${item.target.id}`, {
        bookId: item.bookId,
        type: item.target.type,
        id: item.target.id,
        title: item.target.title,
        subtitle: item.target.subtitle,
      });
    }
    return Array.from(targets.values());
  }, [items]);

  const panelButton = (panel: typeof mobilePanel, label: string) => (
    <button
      type="button"
      onClick={() => setMobilePanel(panel)}
      className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold ${
        mobilePanel === panel
          ? "bg-white text-blue-700 shadow-sm"
          : "text-slate-600"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-w-0">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Create QR
        </button>
      </div>

      <nav
        className="mb-3 flex rounded-lg bg-slate-100 p-1 xl:hidden"
        aria-label="QR Center panels"
      >
        {panelButton("filters", "Filters")}
        {panelButton("list", "QR List")}
        {panelButton("inspector", "Inspector")}
      </nav>

      <div className="grid h-[calc(100dvh-11.5rem)] min-h-[32rem] min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm xl:h-[calc(100dvh-12rem)] xl:grid-cols-[16rem_minmax(0,1fr)_22rem] xl:divide-x xl:divide-slate-200">
        <div
          className={`min-h-0 min-w-0 overflow-hidden ${
            mobilePanel === "filters" ? "block" : "hidden"
          } xl:block`}
        >
          <QrFilters
            values={filters}
            books={knownBooks}
            loading={loading}
            onApply={applyFilters}
            onReset={() =>
              applyFilters({
                q: "",
                bookId: "",
                status: "",
                audience: "",
                targetType: "",
              })
            }
          />
        </div>

        <div
          className={`min-h-0 min-w-0 overflow-hidden ${
            mobilePanel === "list" ? "block" : "hidden"
          } xl:block`}
        >
          <QrList
            items={items}
            pagination={pagination}
            selectedId={selectedId}
            loading={loading}
            error={error}
            onSelect={(id) => {
              updateUrl({ qrId: id }, true);
              setMobilePanel("inspector");
            }}
            onPageChange={(nextPage) => updateUrl({ page: nextPage })}
          />
        </div>

        <div
          className={`min-h-0 min-w-0 overflow-hidden ${
            mobilePanel === "inspector" ? "block" : "hidden"
          } xl:block`}
        >
          <QrInspector
            qrCode={selectedDetail}
            loading={inspectorLoading}
            onChanged={handleChanged}
            onDownload={setDownloadQr}
            onChangeDestination={setDestinationQr}
            onViewHistory={setHistoryQr}
          />
        </div>
      </div>

      <CreateQrWizard
        open={wizardOpen}
        initialSelection={initialSelection}
        books={knownBooks}
        targets={wizardTargets}
        onClose={() => setWizardOpen(false)}
        onComplete={(qrCode) => {
          setWizardOpen(false);
          setSelectedDetail(qrCode);
          setKnownBooks((current) => {
            const books = new Map(current.map((book) => [book.id, book]));
            books.set(qrCode.book.id, qrCode.book);
            return Array.from(books.values()).sort((left, right) =>
              left.title.localeCompare(right.title),
            );
          });
          updateUrl({ qrId: qrCode.id }, true);
          setMobilePanel("inspector");
          setRefreshVersion((current) => current + 1);
        }}
      />
      <QrDownloadDialog
        open={downloadQr !== null}
        qrCode={downloadQr}
        onClose={() => setDownloadQr(null)}
      />
      <ChangeQrDestinationDialog
        open={destinationQr !== null}
        qrCode={destinationQr}
        onClose={() => setDestinationQr(null)}
        onChanged={(qrCode) => {
          handleChanged(qrCode);
          setDestinationQr(null);
          setRefreshVersion((current) => current + 1);
        }}
      />
      <QrRevisionHistory
        open={historyQr !== null}
        qrCode={historyQr}
        onClose={() => setHistoryQr(null)}
        onChanged={(qrCode) => {
          handleChanged(qrCode);
          setHistoryQr(qrCode);
          setRefreshVersion((current) => current + 1);
        }}
      />
    </div>
  );
}
