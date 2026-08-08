"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type TargetType = "BOOK" | "PART" | "UNIT" | "CHAPTER" | "MODULE" | "TOPIC";

type Attachment = {
  linkId: string;
  resourceId: string;
  title: string;
  type: string;
  audience: string;
  audienceOverride: string | null;
  published: boolean;
  archived: boolean;
  displayOrder: number;
  fileName: string | null;
  externalHost: string | null;
};

type ResourceResult = {
  resourceId: string;
  title: string;
  type: string;
  audience: string;
  published: boolean;
  archived: boolean;
  alreadyAttached: boolean;
};

type PanelResponse = {
  target: {
    targetType: string;
    targetId: string;
    title: string;
    bookId: string;
    bookTitle: string;
  };
  attachments: Attachment[];
  resources: ResourceResult[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type LinkDraft = {
  audienceOverride: string;
  displayOrder: string;
};

const ENDPOINT = "/api/admin/book-resource-links";
const PAGE_SIZE = 10;

export default function BookStudioResourcePanel({
  targetType,
  targetId,
  targetTitle,
}: {
  targetType: TargetType;
  targetId: string;
  targetTitle: string;
}) {
  const requestRef = useRef<AbortController | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [data, setData] = useState<PanelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, LinkDraft>>({});

  const load = useCallback(
    async (nextQuery: string, nextPage: number) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        targetType,
        targetId,
        q: nextQuery.trim(),
        page: String(nextPage),
        pageSize: String(PAGE_SIZE),
      });

      try {
        const response = await fetch(`${ENDPOINT}?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as
          | PanelResponse
          | { message?: string }
          | null;
        if (!response.ok) {
          const message =
            payload && "message" in payload ? payload.message : undefined;
          throw new Error(message || "Unable to load resources.");
        }
        if (!payload || !("attachments" in payload)) {
          throw new Error("Unable to load resources.");
        }
        setData(payload);
        setPage(payload.pagination.page);
        setDrafts({});
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load resources.",
        );
      } finally {
        if (requestRef.current === controller) setLoading(false);
      }
    },
    [targetId, targetType],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setData(null);
      setQuery("");
      setSearchInput("");
      setPage(1);
      setSuccess("");
      setError("");
      setDialogOpen(false);
      void load("", 1);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      requestRef.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    if (!dialogOpen) return;
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [dialogOpen]);

  const audienceOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...(data?.attachments.flatMap((item) => [
            item.audience,
            ...(item.audienceOverride ? [item.audienceOverride] : []),
          ]) ?? []),
          ...(data?.resources.map((item) => item.audience) ?? []),
        ]),
      ).sort(),
    [data],
  );

  async function mutate(
    method: "POST" | "PATCH" | "DELETE",
    body: Record<string, unknown>,
    pendingKey: string,
    successMessage: string,
  ) {
    if (pending) return false;
    setPending(pendingKey);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(ENDPOINT, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to update resources.");
      }
      setSuccess(successMessage);
      await load(query, page);
      return true;
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to update resources.",
      );
      return false;
    } finally {
      setPending("");
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = searchInput.trim();
    setSearchInput(trimmed);
    setQuery(trimmed);
    setPage(1);
    void load(trimmed, 1);
  }

  async function attach(resource: ResourceResult) {
    if (resource.alreadyAttached || pending) return;
    const attached = await mutate(
      "POST",
      {
        targetType,
        targetId,
        resourceId: resource.resourceId,
      },
      `attach:${resource.resourceId}`,
      `${resource.title} attached.`,
    );
    if (attached) setDialogOpen(false);
  }

  function draftFor(link: Attachment): LinkDraft {
    return (
      drafts[link.linkId] ?? {
        audienceOverride: link.audienceOverride ?? "",
        displayOrder: String(link.displayOrder),
      }
    );
  }

  function changeDraft(
    link: Attachment,
    field: keyof LinkDraft,
    value: string | boolean,
  ) {
    setDrafts((current) => ({
      ...current,
      [link.linkId]: { ...draftFor(link), [field]: value },
    }));
    setError("");
    setSuccess("");
  }

  async function saveLink(link: Attachment) {
    const draft = draftFor(link);
    if (!validOrder(draft.displayOrder)) {
      setError("Display order must be a non-negative integer.");
      return;
    }
    const changes: Record<string, unknown> = { linkId: link.linkId };
    const audienceOverride = draft.audienceOverride || null;
    if (audienceOverride !== link.audienceOverride) {
      changes.audienceOverride = audienceOverride;
    }
    const displayOrder = Number(draft.displayOrder);
    if (displayOrder !== link.displayOrder) {
      changes.displayOrder = displayOrder;
    }
    if (Object.keys(changes).length === 1) return;
    await mutate(
      "PATCH",
      changes,
      `save:${link.linkId}`,
      `${link.title} updated.`,
    );
  }

  async function detach(link: Attachment) {
    if (
      pending ||
      !window.confirm(
        `Detach “${link.title}” from ${targetTitle}? The Resource Library item and file will be preserved.`,
      )
    ) {
      return;
    }
    await mutate(
      "DELETE",
      { linkId: link.linkId },
      `detach:${link.linkId}`,
      `${link.title} detached.`,
    );
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    void load(query, nextPage);
  }

  return (
    <section className="mt-6 min-w-0 border-t border-slate-200 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-950">Resources</h3>
          <p className="truncate text-xs text-slate-500" title={targetTitle}>
            {data?.attachments.length ?? 0} attached · {targetTitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          disabled={loading}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          Attach Resource
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          role="status"
          className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
        >
          {success}
        </p>
      ) : null}

      {loading && !data ? (
        <div
          role="status"
          className="mt-4 space-y-2"
          aria-label="Loading attached resources"
        >
          <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ) : data?.attachments.length ? (
        <div className="mt-4 max-h-96 space-y-3 overflow-y-auto overflow-x-hidden pr-1">
          {data.attachments.map((link) => {
            const draft = draftFor(link);
            const dirty =
              (draft.audienceOverride || null) !== link.audienceOverride ||
              (validOrder(draft.displayOrder) &&
                Number(draft.displayOrder) !== link.displayOrder);
            const orderInvalid = !validOrder(draft.displayOrder);
            return (
              <article
                key={link.linkId}
                className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="truncate text-xs font-bold text-slate-900">
                      {link.title}
                    </h4>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {label(link.type)} ·{" "}
                      {link.published ? "Published" : "Draft"}
                      {link.archived ? " · Archived" : ""}
                    </p>
                    {link.fileName || link.externalHost ? (
                      <p
                        className="mt-1 truncate text-[11px] text-slate-400"
                        title={link.fileName ?? link.externalHost ?? undefined}
                      >
                        {link.fileName ?? link.externalHost}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 grid min-w-0 gap-2">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Effective audience
                    <select
                      value={draft.audienceOverride}
                      onChange={(event) =>
                        changeDraft(
                          link,
                          "audienceOverride",
                          event.target.value,
                        )
                      }
                      disabled={Boolean(pending)}
                      className="mt-1 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                    >
                      <option value="">Resource default: {label(link.audience)}</option>
                      {audienceOptions.map((audience) => (
                        <option key={audience} value={audience}>
                          {label(audience)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Display order
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={draft.displayOrder}
                        onChange={(event) =>
                          changeDraft(link, "displayOrder", event.target.value)
                        }
                        disabled={Boolean(pending)}
                        aria-invalid={orderInvalid}
                        className={`mt-1 w-full min-w-0 rounded-lg border bg-white px-2 py-1.5 text-xs ${
                          orderInvalid
                            ? "border-rose-400"
                            : "border-slate-200"
                        }`}
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void saveLink(link)}
                    disabled={!dirty || orderInvalid || Boolean(pending)}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-45"
                  >
                    {pending === `save:${link.linkId}` ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void detach(link)}
                    disabled={Boolean(pending)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 disabled:opacity-45"
                  >
                    {pending === `detach:${link.linkId}`
                      ? "Detaching…"
                      : "Detach"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-5 text-center text-xs text-slate-500">
          No resources are attached to this target.
        </p>
      )}

      {dialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setDialogOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="attach-resource-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") setDialogOpen(false);
            }}
            className="flex max-h-[85vh] w-full max-w-lg min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
              <div className="min-w-0">
                <h3
                  id="attach-resource-title"
                  className="font-bold text-slate-950"
                >
                  Attach Existing Resource
                </h3>
                <p className="truncate text-xs text-slate-500">
                  {targetTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                aria-label="Close resource dialog"
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-500"
              >
                Close
              </button>
            </div>

            <form
              onSubmit={submitSearch}
              className="flex gap-2 border-b border-slate-200 p-4"
            >
              <label className="min-w-0 flex-1">
                <span className="sr-only">Search Resource Library</span>
                <input
                  ref={searchRef}
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search Resource Library"
                  className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Search
              </button>
            </form>

            <div className="min-h-48 flex-1 overflow-y-auto overflow-x-hidden p-3">
              {loading ? (
                <p role="status" className="py-10 text-center text-sm text-slate-500">
                  Loading resources…
                </p>
              ) : data?.resources.length ? (
                <ul className="space-y-2">
                  {data.resources.map((resource) => (
                    <li
                      key={resource.resourceId}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {resource.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {label(resource.type)} · {label(resource.audience)} ·{" "}
                          {resource.published ? "Published" : "Draft"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void attach(resource)}
                        disabled={
                          resource.alreadyAttached ||
                          resource.archived ||
                          Boolean(pending)
                        }
                        className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        {resource.alreadyAttached
                          ? "Attached"
                          : pending === `attach:${resource.resourceId}`
                            ? "Attaching…"
                            : "Attach"}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-10 text-center text-sm text-slate-500">
                  No Resource Library items match this search.
                </p>
              )}
            </div>

            {data ? (
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-4 text-xs">
                <span className="text-slate-500">
                  Page {data.pagination.page} of {data.pagination.totalPages} ·{" "}
                  {data.pagination.total} results
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => changePage(page - 1)}
                    disabled={loading || page <= 1}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-45"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => changePage(page + 1)}
                    disabled={
                      loading || page >= data.pagination.totalPages
                    }
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-45"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function validOrder(value: string) {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) && Number.isSafeInteger(Number(trimmed));
}

function label(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
