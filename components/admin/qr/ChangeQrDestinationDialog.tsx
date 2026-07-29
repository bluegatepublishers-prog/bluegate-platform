"use client";

import { useEffect, useRef, useState } from "react";

import type {
  QrAudience,
  QrRecord,
} from "@/components/admin/qr/QrList";

type DestinationType =
  | "RESOURCE"
  | "BOOK_RESOURCE_LINK"
  | "EXTERNAL_URL"
  | "INTERNAL_ROUTE";

type ResourceOption = {
  id: string;
  title: string;
  type: string;
  audience: string;
  published: boolean;
};

type LinkOption = {
  id: string;
  resourceTitle: string;
  resourceType: string;
  audience: string;
};

type CurrentDestination = {
  type: DestinationType;
  audience: QrAudience;
};

type ChangeQrDestinationDialogProps = {
  open: boolean;
  qrCode: QrRecord | null;
  onClose: () => void;
  onChanged: (qrCode: QrRecord) => void;
};

const inputClass =
  "mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const optionClass =
  "w-full rounded-md border border-slate-200 px-3 py-2 text-left hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30";

export default function ChangeQrDestinationDialog({
  open,
  qrCode,
  onClose,
  onChanged,
}: ChangeQrDestinationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const currentDestination =
    (qrCode?.currentDestination as CurrentDestination | null) ?? null;
  const [type, setType] = useState<DestinationType>("RESOURCE");
  const [audience, setAudience] = useState<QrAudience>("PUBLIC");
  const [value, setValue] = useState("");
  const [search, setSearch] = useState("");
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const [links, setLinks] = useState<LinkOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && qrCode && !dialog.open) {
      setType(currentDestination?.type ?? "RESOURCE");
      setAudience(currentDestination?.audience ?? qrCode.audience);
      setValue("");
      setSearch("");
      setResources([]);
      setLinks([]);
      setOptionsError(null);
      setPending(false);
      setError(null);
      dialog.showModal();
    } else if ((!open || !qrCode) && dialog.open) {
      dialog.close();
    }
  }, [currentDestination?.audience, currentDestination?.type, open, qrCode]);

  useEffect(() => {
    if (
      !open ||
      !qrCode ||
      (type !== "RESOURCE" && type !== "BOOK_RESOURCE_LINK")
    ) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingOptions(true);
      setOptionsError(null);
      try {
        const query = new URLSearchParams({
          bookId: qrCode.bookId,
          q: search.trim(),
          page: "1",
          pageSize: "25",
        });
        if (type === "BOOK_RESOURCE_LINK") {
          query.set("targetType", qrCode.targetType);
          query.set("targetId", qrCode.target.id ?? qrCode.bookId);
        }
        const endpoint =
          type === "RESOURCE"
            ? "/api/admin/qr-options/resources"
            : "/api/admin/qr-options/book-resource-links";
        const response = await fetch(`${endpoint}?${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as {
          items?: ResourceOption[] | LinkOption[];
          error?: string;
        };
        if (!response.ok || !result.items) {
          throw new Error(result.error || "Unable to load destinations.");
        }
        if (type === "RESOURCE") {
          setResources(result.items as ResourceOption[]);
        } else {
          setLinks(result.items as LinkOption[]);
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setOptionsError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load destinations.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoadingOptions(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, qrCode, search, type]);

  if (!qrCode) return null;

  async function submit() {
    const selectedQr = qrCode;
    if (!selectedQr || pending) return;
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      setError("Select or enter a destination.");
      return;
    }
    if (type === "EXTERNAL_URL") {
      try {
        const parsed = new URL(trimmedValue);
        if (parsed.protocol !== "https:") {
          setError("External destinations must use HTTPS.");
          return;
        }
      } catch {
        setError("Enter a valid external URL.");
        return;
      }
    }
    if (
      type === "INTERNAL_ROUTE" &&
      (!trimmedValue.startsWith("/") || trimmedValue.startsWith("//"))
    ) {
      setError("Internal routes must start with one forward slash.");
      return;
    }

    const destination: Record<string, unknown> = { type, audience };
    if (type === "RESOURCE") destination.resourceId = trimmedValue;
    else if (type === "BOOK_RESOURCE_LINK") {
      destination.bookResourceLinkId = trimmedValue;
    } else if (type === "EXTERNAL_URL") {
      destination.externalUrl = trimmedValue;
    } else {
      destination.internalRoute = trimmedValue;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/qr-codes/${selectedQr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination }),
      });
      const result = (await response.json()) as {
        qrCode?: QrRecord;
        error?: string;
      };
      if (!response.ok || !result.qrCode) {
        throw new Error(result.error || "Unable to change the destination.");
      }
      onChanged(result.qrCode);
      dialogRef.current?.close();
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Unable to change the destination.",
      );
    } finally {
      setPending(false);
    }
  }

  const options = type === "RESOURCE" ? resources : links;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
      onClose={onClose}
      aria-labelledby="change-qr-destination-title"
      className="m-auto max-h-[90dvh] w-[min(38rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/45"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
              Append-only change
            </p>
            <h2
              id="change-qr-destination-title"
              className="mt-1 truncate text-base font-semibold text-slate-950"
            >
              Change Destination
            </h2>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => dialogRef.current?.close()}
            aria-label="Close destination dialog"
            className="rounded-md px-2 py-1 text-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {error ? (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
            <span className="font-medium text-slate-800">Current:</span>{" "}
            <span className="text-slate-600">
              {currentDestination?.type.replaceAll("_", " ") ??
                "No destination"}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-700">
              Destination type
              <select
                value={type}
                onChange={(event) => {
                  setType(event.target.value as DestinationType);
                  setValue("");
                  setSearch("");
                  setError(null);
                }}
                className={inputClass}
              >
                <option value="RESOURCE">Resource</option>
                <option value="BOOK_RESOURCE_LINK">Book Resource Link</option>
                <option value="EXTERNAL_URL">External URL</option>
                <option value="INTERNAL_ROUTE">Internal route</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Audience
              <select
                value={audience}
                onChange={(event) =>
                  setAudience(event.target.value as QrAudience)
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
                ].map((entry) => (
                  <option key={entry} value={entry}>
                    {entry.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {type === "RESOURCE" || type === "BOOK_RESOURCE_LINK" ? (
            <div>
              <label
                htmlFor="qr-destination-search"
                className="block text-xs font-medium text-slate-700"
              >
                {type === "RESOURCE" ? "Resource" : "Attached Resource"}
              </label>
              <input
                id="qr-destination-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search existing destinations"
                className={inputClass}
              />
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                {loadingOptions ? (
                  <p className="py-5 text-center text-sm text-slate-500">
                    Loading destinations…
                  </p>
                ) : optionsError ? (
                  <p role="alert" className="py-3 text-sm text-red-600">
                    {optionsError}
                  </p>
                ) : options.length === 0 ? (
                  <p className="py-5 text-center text-sm text-slate-500">
                    No eligible destinations found.
                  </p>
                ) : (
                  options.map((option) => {
                    const title =
                      "resourceTitle" in option
                        ? option.resourceTitle
                        : option.title;
                    const subtype =
                      "resourceType" in option
                        ? option.resourceType
                        : option.type;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={value === option.id}
                        onClick={() => setValue(option.id)}
                        className={`${optionClass} ${
                          value === option.id
                            ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                            : ""
                        }`}
                      >
                        <span className="block truncate text-sm font-medium text-slate-900">
                          {title}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {subtype.replaceAll("_", " ")}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <label className="block text-xs font-medium text-slate-700">
              {type === "EXTERNAL_URL" ? "External URL" : "Internal route"}
              <input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={
                  type === "EXTERNAL_URL"
                    ? "https://approved.example/resource"
                    : "/portal/resource"
                }
                className={inputClass}
              />
            </label>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            disabled={pending}
            onClick={() => dialogRef.current?.close()}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || !value.trim()}
            onClick={submit}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {pending ? "Changing…" : "Change Destination"}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
