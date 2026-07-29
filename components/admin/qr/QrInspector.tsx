"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import type {
  QrAudience,
  QrRecord,
  QrStatus,
} from "@/components/admin/qr/QrList";

type QrInspectorProps = {
  qrCode: QrRecord | null;
  loading: boolean;
  onChanged: (qrCode: QrRecord) => void;
  onDownload: (qrCode: QrRecord) => void;
  onChangeDestination: (qrCode: QrRecord) => void;
  onViewHistory: (qrCode: QrRecord) => void;
};

type EditorState = {
  name: string;
  status: QrStatus;
  audience: QrAudience;
  activatesAt: string;
  expiresAt: string;
};

function dateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function initialEditor(qrCode: QrRecord): EditorState {
  return {
    name: qrCode.name,
    status: qrCode.status,
    audience: qrCode.audience,
    activatesAt: dateTimeInput(qrCode.activatesAt),
    expiresAt: dateTimeInput(qrCode.expiresAt),
  };
}

function displayDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7.25rem_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-xs text-slate-800">{children}</dd>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

export default function QrInspector({
  qrCode,
  loading,
  onChanged,
  onDownload,
  onChangeDestination,
  onViewHistory,
}: QrInspectorProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditorState | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEditing(false);
    setPending(false);
    setMessage(null);
    setCopied(false);
    setForm(qrCode ? initialEditor(qrCode) : null);
  }, [qrCode]);

  const permanentUrl = qrCode
    ? `https://edoralearning.in/qr/r/${qrCode.publicCode}`
    : "";

  const dirty = useMemo(() => {
    if (!qrCode || !form) return false;
    return JSON.stringify(form) !== JSON.stringify(initialEditor(qrCode));
  }, [form, qrCode]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(permanentUrl);
      setCopied(true);
      setMessage({ kind: "success", text: "Permanent URL copied." });
    } catch {
      setMessage({
        kind: "error",
        text: "The browser could not copy the URL.",
      });
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!qrCode || !form || pending || !dirty) return;
    const name = form.name.trim();
    if (!name) {
      setMessage({ kind: "error", text: "QR name is required." });
      return;
    }

    const original = initialEditor(qrCode);
    const payload: Record<string, unknown> = {};
    if (name !== original.name) payload.name = name;
    if (form.status !== original.status) payload.status = form.status;
    if (form.audience !== original.audience) payload.audience = form.audience;
    if (form.activatesAt !== original.activatesAt) {
      payload.activatesAt = form.activatesAt
        ? new Date(form.activatesAt).toISOString()
        : null;
    }
    if (form.expiresAt !== original.expiresAt) {
      payload.expiresAt = form.expiresAt
        ? new Date(form.expiresAt).toISOString()
        : null;
    }

    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/qr-codes/${qrCode.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        qrCode?: QrRecord;
        error?: string;
      };
      if (!response.ok || !result.qrCode) {
        throw new Error(result.error || "Unable to update the QR code.");
      }
      onChanged(result.qrCode);
      setForm(initialEditor(result.qrCode));
      setEditing(false);
      setMessage({ kind: "success", text: "QR code updated." });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Update failed.",
      });
    } finally {
      setPending(false);
    }
  }

  async function archive() {
    if (
      !qrCode ||
      pending ||
      qrCode.status === "ARCHIVED" ||
      !window.confirm(
        `Archive “${qrCode.name}”? The permanent URL will stop redirecting.`,
      )
    ) {
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/qr-codes/${qrCode.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as {
        qrCode?: QrRecord;
        error?: string;
      };
      if (!response.ok || !result.qrCode) {
        throw new Error(result.error || "Unable to archive the QR code.");
      }
      onChanged(result.qrCode);
      setMessage({ kind: "success", text: "QR code archived." });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Archive failed.",
      });
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 p-4" aria-label="Loading QR inspector">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="h-9 animate-pulse rounded-md bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (!qrCode || !form) {
    return (
      <div className="flex h-full min-h-72 flex-col items-center justify-center p-8 text-center">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-xl text-slate-500">
          i
        </div>
        <h2 className="mt-3 text-sm font-semibold text-slate-900">
          No QR selected
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Select a QR code to view its details.
        </p>
      </div>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
          Inspector
        </p>
        <h2 className="mt-1 truncate text-sm font-semibold text-slate-950">
          {qrCode.name}
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {message ? (
          <div
            role="status"
            className={`mb-4 rounded-md border px-3 py-2 text-xs ${
              message.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        {editing ? (
          <form onSubmit={save} className="space-y-4">
            <label className="block text-xs font-medium text-slate-700">
              QR name
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, name: event.target.value } : current,
                  )
                }
                className={inputClass}
                maxLength={160}
                required
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          status: event.target.value as QrStatus,
                        }
                      : current,
                  )
                }
                className={inputClass}
              >
                {["DRAFT", "ACTIVE", "PAUSED", "EXPIRED", "SUSPENDED"].map(
                  (status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ),
                )}
                {qrCode.status === "ARCHIVED" ? (
                  <option value="ARCHIVED">ARCHIVED</option>
                ) : null}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Audience
              <select
                value={form.audience}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          audience: event.target.value as QrAudience,
                        }
                      : current,
                  )
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
            <label className="block text-xs font-medium text-slate-700">
              Activation
              <input
                type="datetime-local"
                value={form.activatesAt}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? { ...current, activatesAt: event.target.value }
                      : current,
                  )
                }
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Expiration
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? { ...current, expiresAt: event.target.value }
                      : current,
                  )
                }
                className={inputClass}
              />
            </label>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={pending || !dirty}
                className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
              >
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setForm(initialEditor(qrCode));
                  setEditing(false);
                  setMessage(null);
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <dl className="divide-y divide-slate-100">
              <Detail label="QR name">{qrCode.name}</Detail>
              <Detail label="Book">{qrCode.book.title}</Detail>
              <Detail label="Hierarchy">
                <span className="font-medium">{qrCode.target.title}</span>
                <span className="mt-0.5 block text-[11px] text-slate-500">
                  {qrCode.target.subtitle}
                </span>
                <span className="mt-0.5 block break-all font-mono text-[10px] text-slate-500">
                  {qrCode.target.id ?? "—"}
                </span>
              </Detail>
              <Detail label="Status">{qrCode.status}</Detail>
              <Detail label="Audience">
                {qrCode.audience.replaceAll("_", " ")}
              </Detail>
              <Detail label="Destination">
                {qrCode.currentDestination?.type.replaceAll("_", " ") ?? "—"}
              </Detail>
              <Detail label="Activation">
                {displayDate(qrCode.activatesAt)}
              </Detail>
              <Detail label="Expiration">
                {displayDate(qrCode.expiresAt)}
              </Detail>
              <Detail label="Last updated">
                {displayDate(qrCode.updatedAt)}
              </Detail>
            </dl>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Permanent URL
              </p>
              <p className="mt-1 break-all font-mono text-[11px] text-slate-700">
                {permanentUrl}
              </p>
            </div>
          </>
        )}
      </div>

      {!editing ? (
        <div className="grid grid-cols-2 gap-2 border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={copyUrl}
            className="rounded-md border border-slate-300 px-2 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {copied ? "Copied" : "Copy URL"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onDownload(qrCode)}
            className="rounded-md border border-blue-200 px-2 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-40"
          >
            Download QR
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onChangeDestination(qrCode)}
            className="rounded-md border border-blue-200 px-2 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-40"
          >
            Change Destination
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onViewHistory(qrCode)}
            className="rounded-md border border-slate-300 px-2 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            View History
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setEditing(true);
              setMessage(null);
            }}
            className="rounded-md border border-slate-300 px-2 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={pending || qrCode.status === "ARCHIVED"}
            onClick={archive}
            className="rounded-md border border-red-200 px-2 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
          >
            Archive
          </button>
        </div>
      ) : null}
    </section>
  );
}
