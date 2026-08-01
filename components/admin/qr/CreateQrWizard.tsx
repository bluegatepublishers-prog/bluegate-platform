"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import type { QrAudience, QrRecord } from "@/components/admin/qr/QrList";

type TargetType = QrRecord["targetType"];
type DestinationType =
  | "RESOURCE"
  | "BOOK_RESOURCE_LINK"
  | "EXTERNAL_URL"
  | "INTERNAL_ROUTE";

type CreateQrWizardProps = {
  open: boolean;
  books: Array<{ id: string; title: string }>;
  targets: Array<{
    bookId: string;
    type: TargetType;
    id: string;
    title: string;
    subtitle: string;
  }>;
  onClose: () => void;
  onComplete: (qrCode: QrRecord) => void;
  initialSelection?: {
    book: { id: string; title: string };
    target: { type: TargetType; id: string; title: string };
  } | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type BookOption = {
  id: string;
  title: string;
  subtitle: string | null;
  coverImage: string | null;
};

type HierarchyOption = {
  id: string;
  type: TargetType;
  title: string;
  subtitle: string;
  parentId: string | null;
  displayOrder: number;
};

type HierarchyCatalog = {
  book: HierarchyOption;
  parts: HierarchyOption[];
  units: HierarchyOption[];
  chapters: HierarchyOption[];
  modules: HierarchyOption[];
  topics: HierarchyOption[];
};

type ResourceOption = {
  id: string;
  title: string;
  type: string;
  audience: string;
  published: boolean;
};

type LinkOption = {
  id: string;
  title: string;
  resourceTitle: string;
  resourceType: string;
  audience: string;
  target: {
    type: TargetType;
    id: string;
    title: string;
  };
};

const steps = [
  "Book",
  "Hierarchy Target",
  "Destination",
  "Audience & Schedule",
  "Review",
] as const;

const targetTypes: TargetType[] = [
  "BOOK",
  "PART",
  "UNIT",
  "CHAPTER",
  "MODULE",
  "TOPIC",
];

const inputClass =
  "mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const optionClass =
  "w-full rounded-md border border-slate-200 px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30";

function initialState() {
  return {
    name: "",
    bookId: "",
    targetType: "BOOK" as TargetType,
    targetId: "",
    destinationType: "RESOURCE" as DestinationType,
    destinationValue: "",
    audience: "PUBLIC" as QrAudience,
    activatesAt: "",
    expiresAt: "",
  };
}

async function responseJson<T>(response: Response): Promise<T> {
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(result.error || "Unable to load options.");
  }
  return result;
}

function PaginationControls({
  pagination,
  onPage,
}: {
  pagination: Pagination | null;
  onPage: (page: number) => void;
}) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
      <button
        type="button"
        disabled={pagination.page <= 1}
        onClick={() => onPage(pagination.page - 1)}
        className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
      >
        Previous
      </button>
      <span>
        Page {pagination.page} of {pagination.totalPages}
      </span>
      <button
        type="button"
        disabled={pagination.page >= pagination.totalPages}
        onClick={() => onPage(pagination.page + 1)}
        className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

export default function CreateQrWizard({
  open,
  onClose,
  onComplete,
  initialSelection,
}: CreateQrWizardProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<QrRecord | null>(null);
  const [copied, setCopied] = useState(false);

  const [bookSearch, setBookSearch] = useState("");
  const [bookPage, setBookPage] = useState(1);
  const [bookOptions, setBookOptions] = useState<BookOption[]>([]);
  const [bookPagination, setBookPagination] = useState<Pagination | null>(null);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookOption | null>(null);

  const [hierarchy, setHierarchy] = useState<HierarchyCatalog | null>(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] =
    useState<HierarchyOption | null>(null);

  const [resourceSearch, setResourceSearch] = useState("");
  const [resourcePage, setResourcePage] = useState(1);
  const [resourceOptions, setResourceOptions] = useState<ResourceOption[]>([]);
  const [resourcePagination, setResourcePagination] =
    useState<Pagination | null>(null);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] =
    useState<ResourceOption | null>(null);

  const [linkSearch, setLinkSearch] = useState("");
  const [linkPage, setLinkPage] = useState(1);
  const [linkOptions, setLinkOptions] = useState<LinkOption[]>([]);
  const [linkPagination, setLinkPagination] = useState<Pagination | null>(null);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<LinkOption | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setStep(0);
      setForm({
        ...initialState(),
        bookId: initialSelection?.book.id ?? "",
        targetType: initialSelection?.target.type ?? "BOOK",
        targetId: initialSelection?.target.id ?? "",
      });
      setError(null);
      setPending(false);
      setCreated(null);
      setCopied(false);
      setBookSearch("");
      setBookPage(1);
      setSelectedBook(initialSelection ? { id: initialSelection.book.id, title: initialSelection.book.title, subtitle: null, coverImage: null } : null);
      setHierarchy(null);
      setSelectedTarget(initialSelection?.target.type === "BOOK" ? { id: initialSelection.target.id, type: "BOOK", title: initialSelection.target.title, subtitle: "Book", parentId: null, displayOrder: 0 } : null);
      setResourceSearch("");
      setResourcePage(1);
      setSelectedResource(null);
      setLinkSearch("");
      setLinkPage(1);
      setSelectedLink(null);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [initialSelection, open]);

  useEffect(() => {
    if (!open || !initialSelection || !hierarchy) return;
    const options = [hierarchy.book, ...hierarchy.parts, ...hierarchy.units, ...hierarchy.chapters, ...hierarchy.modules, ...hierarchy.topics];
    const target = options.find((item) => item.type === initialSelection.target.type && item.id === initialSelection.target.id);
    if (!target) return;
    const timer = window.setTimeout(() => {
      setSelectedTarget(target);
      setForm((current) => ({ ...current, targetType: target.type, targetId: target.id }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hierarchy, initialSelection, open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setBooksLoading(true);
      setBooksError(null);
      try {
        const query = new URLSearchParams({
          q: bookSearch.trim(),
          page: String(bookPage),
          pageSize: "12",
        });
        const result = await responseJson<{
          items: BookOption[];
          pagination: Pagination;
        }>(
          await fetch(`/api/admin/qr-options/books?${query}`, {
            signal: controller.signal,
          }),
        );
        setBookOptions(result.items);
        setBookPagination(result.pagination);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setBooksError(
            loadError instanceof Error ? loadError.message : "Unable to load Books.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setBooksLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [bookPage, bookSearch, open]);

  useEffect(() => {
    if (!open || !selectedBook) {
      const timer = window.setTimeout(() => setHierarchy(null), 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    const stateTimer = window.setTimeout(() => {
      setHierarchyLoading(true);
      setHierarchyError(null);
    }, 0);
    void (async () => {
      try {
        const query = new URLSearchParams({ bookId: selectedBook.id });
        const result = await responseJson<HierarchyCatalog>(
          await fetch(`/api/admin/qr-options/hierarchy?${query}`, {
            signal: controller.signal,
          }),
        );
        setHierarchy(result);
        if (form.targetType === "BOOK") setSelectedTarget(result.book);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setHierarchyError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load hierarchy.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setHierarchyLoading(false);
      }
    })();
    return () => { window.clearTimeout(stateTimer); controller.abort(); };
  }, [form.targetType, open, selectedBook]);

  useEffect(() => {
    if (
      !open ||
      step !== 2 ||
      form.destinationType !== "RESOURCE" ||
      !selectedBook
    ) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setResourcesLoading(true);
      setResourcesError(null);
      try {
        const query = new URLSearchParams({
          bookId: selectedBook.id,
          q: resourceSearch.trim(),
          page: String(resourcePage),
          pageSize: "10",
        });
        const result = await responseJson<{
          items: ResourceOption[];
          pagination: Pagination;
        }>(
          await fetch(`/api/admin/qr-options/resources?${query}`, {
            signal: controller.signal,
          }),
        );
        setResourceOptions(result.items);
        setResourcePagination(result.pagination);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setResourcesError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load Resources.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setResourcesLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    form.destinationType,
    open,
    resourcePage,
    resourceSearch,
    selectedBook,
    step,
  ]);

  useEffect(() => {
    if (
      !open ||
      step !== 2 ||
      form.destinationType !== "BOOK_RESOURCE_LINK" ||
      !selectedBook ||
      !selectedTarget
    ) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLinksLoading(true);
      setLinksError(null);
      try {
        const query = new URLSearchParams({
          bookId: selectedBook.id,
          targetType: selectedTarget.type,
          targetId: selectedTarget.id,
          q: linkSearch.trim(),
          page: String(linkPage),
          pageSize: "10",
        });
        const result = await responseJson<{
          items: LinkOption[];
          pagination: Pagination;
        }>(
          await fetch(`/api/admin/qr-options/book-resource-links?${query}`, {
            signal: controller.signal,
          }),
        );
        setLinkOptions(result.items);
        setLinkPagination(result.pagination);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setLinksError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load Book Resource Links.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLinksLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    form.destinationType,
    linkPage,
    linkSearch,
    open,
    selectedBook,
    selectedTarget,
    step,
  ]);

  const hierarchyOptions =
    form.targetType === "BOOK"
      ? hierarchy
        ? [hierarchy.book]
        : []
      : form.targetType === "PART"
        ? hierarchy?.parts ?? []
        : form.targetType === "UNIT"
          ? hierarchy?.units ?? []
          : form.targetType === "CHAPTER"
            ? hierarchy?.chapters ?? []
            : form.targetType === "MODULE"
              ? hierarchy?.modules ?? []
              : hierarchy?.topics ?? [];

  function selectBook(book: BookOption) {
    setSelectedBook(book);
    setHierarchy(null);
    setSelectedTarget(null);
    setSelectedResource(null);
    setSelectedLink(null);
    setResourceSearch("");
    setResourcePage(1);
    setLinkSearch("");
    setLinkPage(1);
    setForm((current) => ({
      ...current,
      bookId: book.id,
      targetType: "BOOK",
      targetId: book.id,
      destinationValue: "",
    }));
  }

  function selectTargetType(type: TargetType) {
    const bookTarget = type === "BOOK" ? hierarchy?.book ?? null : null;
    setSelectedTarget(bookTarget);
    setSelectedLink(null);
    setLinkSearch("");
    setLinkPage(1);
    setForm((current) => ({
      ...current,
      targetType: type,
      targetId: bookTarget?.id ?? "",
      destinationValue:
        current.destinationType === "BOOK_RESOURCE_LINK"
          ? ""
          : current.destinationValue,
    }));
  }

  function selectHierarchyTarget(target: HierarchyOption) {
    setSelectedTarget(target);
    setSelectedLink(null);
    setLinkSearch("");
    setLinkPage(1);
    setForm((current) => ({
      ...current,
      targetId: target.id,
      destinationValue:
        current.destinationType === "BOOK_RESOURCE_LINK"
          ? ""
          : current.destinationValue,
    }));
  }

  function validate(currentStep: number) {
    if (currentStep === 0) {
      if (!form.name.trim()) return "QR name is required.";
      if (!selectedBook || selectedBook.id !== form.bookId) {
        return "Select a Book from the catalog.";
      }
    }
    if (currentStep === 1 && !selectedTarget) {
      return `Select a ${form.targetType.toLowerCase()} target.`;
    }
    if (currentStep === 2) {
      const value = form.destinationValue.trim();
      if (!value) return "Destination is required.";
      if (form.destinationType === "RESOURCE" && !selectedResource) {
        return "Select a Resource from the catalog.";
      }
      if (form.destinationType === "BOOK_RESOURCE_LINK" && !selectedLink) {
        return "Select a Book Resource Link from the catalog.";
      }
      if (form.destinationType === "EXTERNAL_URL") {
        try {
          const url = new URL(value);
          if (url.protocol !== "https:") {
            return "External destinations must use HTTPS.";
          }
        } catch {
          return "Enter a valid external URL.";
        }
      }
      if (
        form.destinationType === "INTERNAL_ROUTE" &&
        (!value.startsWith("/") || value.startsWith("//"))
      ) {
        return "Internal routes must start with one forward slash.";
      }
    }
    if (currentStep === 3) {
      const activation = form.activatesAt ? new Date(form.activatesAt) : null;
      const expiration = form.expiresAt ? new Date(form.expiresAt) : null;
      if (
        (activation && Number.isNaN(activation.getTime())) ||
        (expiration && Number.isNaN(expiration.getTime()))
      ) {
        return "Activation or expiration date is invalid.";
      }
      if (activation && expiration && expiration <= activation) {
        return "Expiration must be after activation.";
      }
    }
    return null;
  }

  function next() {
    const validationError = validate(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((current) => Math.min(4, current + 1));
  }

  function back() {
    setError(null);
    setStep((current) => Math.max(0, current - 1));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 4 || pending) return;

    for (let index = 0; index < 4; index += 1) {
      const validationError = validate(index);
      if (validationError) {
        setStep(index);
        setError(validationError);
        return;
      }
    }

    const destination: Record<string, unknown> = {
      type: form.destinationType,
      audience: form.audience,
    };
    const destinationValue = form.destinationValue.trim();
    if (form.destinationType === "RESOURCE") {
      destination.resourceId = destinationValue;
    } else if (form.destinationType === "BOOK_RESOURCE_LINK") {
      destination.bookResourceLinkId = destinationValue;
    } else if (form.destinationType === "EXTERNAL_URL") {
      destination.externalUrl = destinationValue;
    } else {
      destination.internalRoute = destinationValue;
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      bookId: form.bookId,
      targetType: form.targetType,
      audience: form.audience,
      destination,
    };
    if (form.targetType !== "BOOK") payload.targetId = form.targetId;
    if (form.activatesAt) {
      payload.activatesAt = new Date(form.activatesAt).toISOString();
    }
    if (form.expiresAt) {
      payload.expiresAt = new Date(form.expiresAt).toISOString();
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/qr-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        qrCode?: QrRecord;
        error?: string;
      };
      if (!response.ok || !result.qrCode) {
        throw new Error(result.error || "Unable to create the QR code.");
      }
      setCreated(result.qrCode);
    } catch (creationError) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : "Unable to create the QR code.",
      );
    } finally {
      setPending(false);
    }
  }

  const destinationLabel =
    form.destinationType === "RESOURCE"
      ? selectedResource?.title
      : form.destinationType === "BOOK_RESOURCE_LINK"
        ? selectedLink?.resourceTitle
        : form.destinationValue.trim();
  const permanentUrl = created
    ? `https://edoralearning.in/qr/r/${created.publicCode}`
    : "";

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
      onClose={onClose}
      className="m-auto max-h-[90dvh] w-[min(46rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/45"
      aria-labelledby="create-qr-title"
    >
      {created ? (
        <div className="p-6 sm:p-8">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-xl font-semibold text-emerald-700">
            ✓
          </div>
          <div className="mx-auto mt-4 max-w-lg text-center">
            <h2 id="create-qr-title" className="text-xl font-semibold text-slate-950">
              QR code created
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              The code is saved as Draft. Activate it from the inspector when it
              is ready for use.
            </p>
          </div>
          <div className="mx-auto mt-6 max-w-lg rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Permanent URL
            </p>
            <p className="mt-2 break-all font-mono text-sm text-slate-800">
              {permanentUrl}
            </p>
          </div>
          <div className="mt-6 flex flex-col-reverse justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(permanentUrl);
                  setCopied(true);
                } catch {
                  setError("The browser could not copy the URL.");
                }
              }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {copied ? "URL copied" : "Copy URL"}
            </button>
            <button
              type="button"
              onClick={() => onComplete(created)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Return to QR workspace
            </button>
          </div>
          {error ? (
            <p className="mt-3 text-center text-sm text-red-600">{error}</p>
          ) : null}
        </div>
      ) : (
        <form onSubmit={submit} className="flex max-h-[90dvh] flex-col">
          <header className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Step {step + 1} of 5
                </p>
                <h2 id="create-qr-title" className="mt-1 text-lg font-semibold text-slate-950">
                  Create QR · {steps[step]}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="Close create QR wizard"
                className="rounded-md px-2 py-1 text-lg text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>
            <ol className="mt-4 grid grid-cols-5 gap-1" aria-label="Progress">
              {steps.map((label, index) => (
                <li key={label}>
                  <div
                    className={`h-1.5 rounded-full ${
                      index <= step ? "bg-blue-600" : "bg-slate-200"
                    }`}
                  />
                  <span className="sr-only">
                    {label}: {index < step ? "complete" : "pending"}
                  </span>
                </li>
              ))}
            </ol>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {error ? (
              <div
                role="alert"
                className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}

            {step === 0 ? (
              <div className="space-y-5">
                <label className="block text-sm font-medium text-slate-700">
                  QR name
                  <input
                    autoFocus
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                    maxLength={160}
                    placeholder="Example: Chapter 3 activity"
                    className={inputClass}
                  />
                </label>
                <div>
                  <label
                    htmlFor="qr-book-search"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Book
                  </label>
                  <input
                    id="qr-book-search"
                    type="search"
                    value={bookSearch}
                    onChange={(event) => {
                      setBookSearch(event.target.value);
                      setBookPage(1);
                    }}
                    placeholder="Search Books"
                    className={inputClass}
                  />
                  <div className="mt-2 max-h-56 space-y-1 overflow-y-auto" aria-live="polite">
                    {booksLoading ? (
                      <p className="py-5 text-center text-sm text-slate-500">Loading Books…</p>
                    ) : booksError ? (
                      <p role="alert" className="py-3 text-sm text-red-600">{booksError}</p>
                    ) : bookOptions.length === 0 ? (
                      <p className="py-5 text-center text-sm text-slate-500">No Books found.</p>
                    ) : (
                      bookOptions.map((book) => (
                        <button
                          key={book.id}
                          type="button"
                          aria-pressed={selectedBook?.id === book.id}
                          onClick={() => selectBook(book)}
                          className={`${optionClass} ${
                            selectedBook?.id === book.id
                              ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                              : ""
                          }`}
                        >
                          <span className="block truncate text-sm font-medium text-slate-900">
                            {book.title}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {book.subtitle || "Book"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                  <PaginationControls pagination={bookPagination} onPage={setBookPage} />
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-5">
                <label className="block text-sm font-medium text-slate-700">
                  Target type
                  <select
                    value={form.targetType}
                    onChange={(event) => selectTargetType(event.target.value as TargetType)}
                    className={inputClass}
                  >
                    {targetTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                {hierarchyLoading ? (
                  <p className="py-6 text-center text-sm text-slate-500">Loading hierarchy…</p>
                ) : hierarchyError ? (
                  <p role="alert" className="text-sm text-red-600">{hierarchyError}</p>
                ) : hierarchyOptions.length === 0 ? (
                  <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">
                    This Book has no selectable {form.targetType.toLowerCase()} nodes.
                  </p>
                ) : (
                  <div className="max-h-72 space-y-1 overflow-y-auto" aria-label="Hierarchy targets">
                    {hierarchyOptions.map((target) => (
                      <button
                        key={target.id}
                        type="button"
                        aria-pressed={selectedTarget?.id === target.id}
                        onClick={() => selectHierarchyTarget(target)}
                        className={`${optionClass} ${
                          selectedTarget?.id === target.id
                            ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                            : ""
                        }`}
                      >
                        <span className="block truncate text-sm font-medium text-slate-900">
                          {target.title}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {target.subtitle}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                <label className="block text-sm font-medium text-slate-700">
                  Destination type
                  <select
                    value={form.destinationType}
                    onChange={(event) => {
                      const type = event.target.value as DestinationType;
                      setSelectedResource(null);
                      setSelectedLink(null);
                      setResourcePage(1);
                      setLinkPage(1);
                      setForm((current) => ({
                        ...current,
                        destinationType: type,
                        destinationValue: "",
                      }));
                    }}
                    className={inputClass}
                  >
                    <option value="RESOURCE">Resource</option>
                    <option value="BOOK_RESOURCE_LINK">Book Resource Link</option>
                    <option value="EXTERNAL_URL">Approved external URL</option>
                    <option value="INTERNAL_ROUTE">Internal route</option>
                  </select>
                </label>

                {form.destinationType === "RESOURCE" ? (
                  <div>
                    <label htmlFor="qr-resource-search" className="block text-sm font-medium text-slate-700">
                      Resource
                    </label>
                    <input
                      id="qr-resource-search"
                      type="search"
                      value={resourceSearch}
                      onChange={(event) => {
                        setResourceSearch(event.target.value);
                        setResourcePage(1);
                      }}
                      placeholder="Search Resource Library"
                      className={inputClass}
                    />
                    <div className="mt-2 max-h-56 space-y-1 overflow-y-auto" aria-live="polite">
                      {resourcesLoading ? (
                        <p className="py-5 text-center text-sm text-slate-500">Loading Resources…</p>
                      ) : resourcesError ? (
                        <p role="alert" className="py-3 text-sm text-red-600">{resourcesError}</p>
                      ) : resourceOptions.length === 0 ? (
                        <p className="py-5 text-center text-sm text-slate-500">No suitable Resources found.</p>
                      ) : (
                        resourceOptions.map((resource) => (
                          <button
                            key={resource.id}
                            type="button"
                            aria-pressed={selectedResource?.id === resource.id}
                            onClick={() => {
                              setSelectedResource(resource);
                              setForm((current) => ({
                                ...current,
                                destinationValue: resource.id,
                              }));
                            }}
                            className={`${optionClass} ${
                              selectedResource?.id === resource.id
                                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                                : ""
                            }`}
                          >
                            <span className="block truncate text-sm font-medium text-slate-900">
                              {resource.title}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {resource.type.replaceAll("_", " ")} ·{" "}
                              {resource.audience.replaceAll("_", " ")} ·{" "}
                              {resource.published ? "Published" : "Draft"}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                    <PaginationControls
                      pagination={resourcePagination}
                      onPage={setResourcePage}
                    />
                  </div>
                ) : form.destinationType === "BOOK_RESOURCE_LINK" ? (
                  <div>
                    <label htmlFor="qr-link-search" className="block text-sm font-medium text-slate-700">
                      Attached Resource
                    </label>
                    <input
                      id="qr-link-search"
                      type="search"
                      value={linkSearch}
                      onChange={(event) => {
                        setLinkSearch(event.target.value);
                        setLinkPage(1);
                      }}
                      placeholder="Search QR-eligible attachments"
                      className={inputClass}
                    />
                    <div className="mt-2 max-h-56 space-y-1 overflow-y-auto" aria-live="polite">
                      {linksLoading ? (
                        <p className="py-5 text-center text-sm text-slate-500">Loading attachments…</p>
                      ) : linksError ? (
                        <p role="alert" className="py-3 text-sm text-red-600">{linksError}</p>
                      ) : linkOptions.length === 0 ? (
                        <p className="py-5 text-center text-sm text-slate-500">
                          No active QR-eligible attachments found for this target.
                        </p>
                      ) : (
                        linkOptions.map((link) => (
                          <button
                            key={link.id}
                            type="button"
                            aria-pressed={selectedLink?.id === link.id}
                            onClick={() => {
                              setSelectedLink(link);
                              setForm((current) => ({
                                ...current,
                                destinationValue: link.id,
                              }));
                            }}
                            className={`${optionClass} ${
                              selectedLink?.id === link.id
                                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                                : ""
                            }`}
                          >
                            <span className="block truncate text-sm font-medium text-slate-900">
                              {link.resourceTitle}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {link.resourceType.replaceAll("_", " ")} ·{" "}
                              {link.audience.replaceAll("_", " ")}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                    <PaginationControls pagination={linkPagination} onPage={setLinkPage} />
                  </div>
                ) : (
                  <label className="block text-sm font-medium text-slate-700">
                    {form.destinationType === "EXTERNAL_URL"
                      ? "External URL"
                      : "Internal route"}
                    <input
                      value={form.destinationValue}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          destinationValue: event.target.value,
                        }))
                      }
                      placeholder={
                        form.destinationType === "EXTERNAL_URL"
                          ? "https://approved.example/resource"
                          : "/portal/resource"
                      }
                      className={inputClass}
                    />
                  </label>
                )}
                <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  The wizard attaches an existing destination. It never uploads or
                  duplicates a physical resource.
                </p>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5">
                <label className="block text-sm font-medium text-slate-700">
                  Audience
                  <select
                    value={form.audience}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        audience: event.target.value as QrAudience,
                      }))
                    }
                    className={inputClass}
                  >
                    {[
                      "PUBLIC",
                      "AUTHENTICATED",
                      "SCHOOL_MEMBER",
                      "TEACHER_ONLY",
                      "STUDENT_ONLY",
                      "TEACHER_OR_STUDENT",
                    ].map((audience) => (
                      <option key={audience} value={audience}>
                        {audience.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Activation
                    <input
                      type="datetime-local"
                      value={form.activatesAt}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          activatesAt: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Expiration
                    <input
                      type="datetime-local"
                      value={form.expiresAt}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          expiresAt: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500">
                  Scheduling does not activate the QR. New codes are created as Draft.
                </p>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Review QR configuration
                </h3>
                <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4">
                  {[
                    ["Name", form.name.trim()],
                    ["Book", selectedBook?.title ?? "—"],
                    ["Target", selectedTarget?.title ?? "—"],
                    [
                      "Destination",
                      `${form.destinationType.replaceAll("_", " ")} · ${destinationLabel ?? "—"}`,
                    ],
                    ["Audience", form.audience.replaceAll("_", " ")],
                    [
                      "Activation",
                      form.activatesAt
                        ? new Date(form.activatesAt).toLocaleString()
                        : "Not scheduled",
                    ],
                    [
                      "Expiration",
                      form.expiresAt
                        ? new Date(form.expiresAt).toLocaleString()
                        : "No expiration",
                    ],
                    ["Initial status", "DRAFT"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-3 text-sm"
                    >
                      <dt className="text-xs font-medium text-slate-500">{label}</dt>
                      <dd className="min-w-0 break-words text-xs text-slate-800">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>

          <footer className="flex items-center justify-between border-t border-slate-200 px-5 py-4 sm:px-6">
            <button
              type="button"
              disabled={step === 0 || pending}
              onClick={back}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Back
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={next}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {pending ? "Creating…" : "Create QR"}
              </button>
            )}
          </footer>
        </form>
      )}
    </dialog>
  );
}
