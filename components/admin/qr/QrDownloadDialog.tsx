"use client";

import { useEffect, useRef, useState } from "react";

import type { QrRecord } from "@/components/admin/qr/QrList";

type QrDownloadDialogProps = {
  open: boolean;
  qrCode: QrRecord | null;
  onClose: () => void;
};

type Format = "png" | "svg";
type ErrorCorrection = "M" | "Q" | "H";

const inputClass =
  "mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

function responseFilename(response: Response, fallback: string) {
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/i);
  return match?.[1] || fallback;
}

export default function QrDownloadDialog({
  open,
  qrCode,
  onClose,
}: QrDownloadDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [format, setFormat] = useState<Format>("png");
  const [size, setSize] = useState(1200);
  const [margin, setMargin] = useState(4);
  const [errorCorrection, setErrorCorrection] =
    useState<ErrorCorrection>("H");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && qrCode && !dialog.open) {
      setFormat("png");
      setSize(1200);
      setMargin(4);
      setErrorCorrection("H");
      setPending(false);
      setError(null);
      dialog.showModal();
    } else if ((!open || !qrCode) && dialog.open) {
      dialog.close();
    }
  }, [open, qrCode]);

  if (!qrCode) return null;

  const permanentUrl = `https://edoralearning.in/qr/r/${qrCode.publicCode}`;

  async function download() {
    const selectedQr = qrCode;
    if (!selectedQr || pending || margin < 1 || margin > 16) return;
    setPending(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        format,
        size: String(size),
        margin: String(margin),
        errorCorrection,
      });
      const response = await fetch(
        `/api/admin/qr-codes/${selectedQr.id}/image?${query}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(result?.error || "Unable to generate the QR image.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = responseFilename(
        response,
        `${selectedQr.publicCode}.${format}`,
      );
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download the QR image.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
      onClose={onClose}
      aria-labelledby="download-qr-title"
      className="m-auto max-h-[90dvh] w-[min(32rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/45"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
              QR image
            </p>
            <h2
              id="download-qr-title"
              className="mt-1 truncate text-base font-semibold text-slate-950"
            >
              Download {qrCode.name}
            </h2>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => dialogRef.current?.close()}
            aria-label="Close download dialog"
            className="rounded-md px-2 py-1 text-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {error ? (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-800">{qrCode.name}</p>
            <p className="mt-1 break-all font-mono text-[10px] text-slate-500">
              {permanentUrl}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-700">
              Format
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value as Format)}
                className={inputClass}
              >
                <option value="png">PNG</option>
                <option value="svg">SVG</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Size
              <select
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
                className={inputClass}
              >
                <option value={512}>512 px</option>
                <option value={1200}>1200 px</option>
                <option value={2400}>2400 px</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Error correction
              <select
                value={errorCorrection}
                onChange={(event) =>
                  setErrorCorrection(event.target.value as ErrorCorrection)
                }
                className={inputClass}
              >
                <option value="M">M</option>
                <option value="Q">Q</option>
                <option value="H">H</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Margin
              <input
                type="number"
                min={1}
                max={16}
                step={1}
                value={margin}
                onChange={(event) => setMargin(Number(event.target.value))}
                aria-describedby="qr-margin-help"
                className={inputClass}
              />
              <span
                id="qr-margin-help"
                className="mt-1 block text-[10px] text-slate-500"
              >
                4 modules recommended
              </span>
            </label>
          </div>

          <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs font-semibold text-blue-900">Print guidance</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-4 text-blue-800">
              <li>SVG is recommended for professional printing.</li>
              <li>PNG 1200 px is suitable for most documents.</li>
              <li>Keep adequate white space around the QR.</li>
              <li>Test the printed QR before mass production.</li>
            </ul>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
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
            disabled={pending || margin < 1 || margin > 16}
            onClick={download}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {pending ? "Generating…" : `Download ${format.toUpperCase()}`}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
