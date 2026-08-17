"use client";

import { useEffect, useState } from "react";

import type { LayoutV2Page } from "@/lib/content-layout-v2";
import { StorageUploadError, uploadFileToR2 } from "@/lib/storage/client-upload";

type PdfImportResult = { pageCount: number; pages: LayoutV2Page[] };
type ImportStage = "source" | "upload" | "uploading" | "importing" | "confirm-mapping-reset" | "confirm-restore-reset" | "confirm-replace" | "complete";

type PdfVersion = { id: string; objectKey: string; originalFileName: string | null; pageCount: number; fileSizeBytes: string | null; active: boolean; activatedAt: string | null; createdAt: string };
type PdfSwitchResult = { pageCount: number; mappingResetRequired?: boolean; mappingConflictMessage?: string };
type PdfImportFailureStage = "EXISTING_PDF" | "UPLOAD_INIT" | "SIGNED_PUT" | "UPLOAD_COMPLETE" | "BOOK_ASSOCIATION" | "PDF_VALIDATION" | "V2_GENERATION";

function uploadFailureStage(cause: unknown): PdfImportFailureStage {
  if (!(cause instanceof StorageUploadError)) return "BOOK_ASSOCIATION";
  if (cause.code.includes("UPLOAD_INIT")) return "UPLOAD_INIT";
  if (cause.code.includes("STORAGE_TRANSFER")) return "SIGNED_PUT";
  if (cause.code.includes("UPLOAD_COMPLETE")) return "UPLOAD_COMPLETE";
  return "BOOK_ASSOCIATION";
}

function safePdfImportMessage(cause: unknown, fallback: string) {
  const message = cause instanceof Error
    ? cause.message.replace(/^[A-Z0-9_]+:\s*/u, "").trim()
    : "";
  if (!message || message.length > 280) return fallback;
  return /^(The PDF|The uploaded PDF|The uploaded book PDF|The stored book PDF|The file|File |Authentication required\.|Access denied\.|Upload authorization expired\.|Storage upload|The storage transfer|Book PDF association)/u.test(message)
    ? message
    : fallback;
}
function recordPdfImportFailure(stage: PdfImportFailureStage, cause: unknown) {
  if (process.env.NODE_ENV === "production") return;
  const details = cause instanceof StorageUploadError
    ? { code: cause.code, message: cause.message }
    : cause instanceof Error
      ? { message: cause.message }
      : { message: "Unknown failure" };
  console.error("[content-studio-pdf-import]", { stage, ...details });
}

type Props = {
  open: boolean;
  bookId?: string;
  hasFullBookPdf: boolean;
  hasMeaningfulContent: boolean;
  onClose: () => void;
  onImportExistingPdf?: () => Promise<PdfImportResult>;
  onAttachUploadedPdf?: (
    uploadedPdfKey: string,
    options?: { clearMappings?: boolean },
  ) => Promise<{
    pageCount: number;
    mappingResetRequired?: boolean;
    mappingConflictMessage?: string;
  }>;
  onBookPdfAttached?: () => void;
  onListPdfVersions?: () => Promise<PdfVersion[]>;
  onRestorePdfVersion?: (versionId: string, options?: { clearMappings?: boolean }) => Promise<PdfSwitchResult>;
  onComplete: (pages: LayoutV2Page[]) => void;
};

export default function PdfImportDialog({
  open,
  bookId,
  hasFullBookPdf,
  hasMeaningfulContent,
  onClose,
  onImportExistingPdf,
  onAttachUploadedPdf,
  onBookPdfAttached,
  onListPdfVersions,
  onRestorePdfVersion,
  onComplete,
}: Props) {
  const [choice, setChoice] = useState<"EXISTING" | "UPLOAD">("EXISTING");
  const [uploadedPdfAvailable, setUploadedPdfAvailable] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stage, setStage] = useState<ImportStage>(hasFullBookPdf ? "source" : "upload");
  const [generatedPages, setGeneratedPages] = useState<LayoutV2Page[] | null>(null);
  const [error, setError] = useState("");
  const [pendingUploadedPdfKey, setPendingUploadedPdfKey] = useState<string | null>(null);
  const [mappingConflictMessage, setMappingConflictMessage] = useState("");
  const [pdfVersions, setPdfVersions] = useState<PdfVersion[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pendingRestoreVersionId, setPendingRestoreVersionId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !onListPdfVersions) return;
    let cancelled = false;
    setHistoryLoading(true);
    void onListPdfVersions().then((rows) => { if (!cancelled) setPdfVersions(rows); }).catch((cause) => { if (!cancelled) recordPdfImportFailure("BOOK_ASSOCIATION", cause); }).finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [open, onListPdfVersions]);

  if (!open) return null;

  const hasCurrentBookPdf = hasFullBookPdf || uploadedPdfAvailable;
  const busy = stage === "importing" || stage === "uploading";
  const reset = () => {
    setChoice("EXISTING");
    setSelectedFile(null);
    setGeneratedPages(null);
    setPendingUploadedPdfKey(null);
    setMappingConflictMessage("");
    setPendingRestoreVersionId(null);
    setError("");
    setStage(hasCurrentBookPdf ? "source" : "upload");
  };
  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };
  const finish = (pages: LayoutV2Page[]) => {
    setStage("complete");
    onComplete(pages);
    reset();
    onClose();
  };
  const acceptPages = (result: PdfImportResult) => {
    if (!result.pages.length || result.pages.length !== result.pageCount) {
      throw new Error("The PDF did not produce a complete page layout.");
    }
    if (hasMeaningfulContent) {
      setGeneratedPages(result.pages);
      setStage("confirm-replace");
      return;
    }
    finish(result.pages);
  };
  const importExisting = async () => {
    if (!onImportExistingPdf) {
      setError("The stored full-book PDF is unavailable for import.");
      return;
    }
    setError("");
    setGeneratedPages(null);
    setStage("importing");
    try {
      acceptPages(await onImportExistingPdf());
    } catch (cause) {
      recordPdfImportFailure("EXISTING_PDF", cause);
      setGeneratedPages(null);
      setStage("source");
      setError(safePdfImportMessage(cause, "The PDF could not be read safely. Export the book PDF again and retry."));
    }
  };
  const uploadAndImport = async () => {
    if (!selectedFile) {
      setError("Choose a PDF to import.");
      return;
    }
    if (selectedFile.size > 100 * 1024 * 1024) {
      setError("The PDF exceeds the 100 MB book upload limit.");
      return;
    }
    if (!bookId || !onAttachUploadedPdf || !onImportExistingPdf) {
      setError("PDF upload is unavailable for this book.");
      return;
    }
    setError("");
    setGeneratedPages(null);
    setStage("uploading");
    let uploaded: { objectKey: string };
    try {
      uploaded = await uploadFileToR2({
        file: selectedFile,
        scope: "book-full",
        targetId: bookId,
        failurePrefix: "BOOK_PDF",
      });
    } catch (cause) {
      recordPdfImportFailure(uploadFailureStage(cause), cause);
      setGeneratedPages(null);
      setStage("upload");
      setError(safePdfImportMessage(cause, "Could not upload the PDF to storage. Check the file and retry."));
      return;
    }
    try {
      const attached = await onAttachUploadedPdf(uploaded.objectKey);

      if (attached.mappingResetRequired) {
        setPendingUploadedPdfKey(uploaded.objectKey);
        setMappingConflictMessage(
          attached.mappingConflictMessage ??
            `The new PDF has ${attached.pageCount} pages, but existing page mappings extend beyond that range.`,
        );
        setStage("confirm-mapping-reset");
        return;
      }
    } catch (cause) {
      const failedStage =
        cause instanceof Error && /PDF|book PDF/i.test(cause.message)
          ? "PDF_VALIDATION"
          : "BOOK_ASSOCIATION";

      recordPdfImportFailure(failedStage, cause);
      setGeneratedPages(null);
      setStage("upload");
      setError(
        safePdfImportMessage(
          cause,
          failedStage === "PDF_VALIDATION"
            ? "The uploaded PDF could not be read safely. Export the book PDF again and retry."
            : "The uploaded PDF could not be associated with this book. Retry the upload.",
        ),
      );
      return;
    }

    setUploadedPdfAvailable(true);
    setChoice("EXISTING");
    setSelectedFile(null);
    onBookPdfAttached?.();
    await importExisting();
  };

  const cancelMappingReset = () => {
    setPendingUploadedPdfKey(null);
    setMappingConflictMessage("");
    setError("");
    setStage(hasCurrentBookPdf ? "source" : "upload");
  };

  const replaceAndClearMappings = async () => {
    if (!pendingUploadedPdfKey || !onAttachUploadedPdf) {
      setError("The replacement PDF is no longer available. Choose the PDF again.");
      setStage("upload");
      return;
    }

    setError("");
    setStage("uploading");

    try {
      await onAttachUploadedPdf(pendingUploadedPdfKey, {
        clearMappings: true,
      });
    } catch (cause) {
      recordPdfImportFailure("BOOK_ASSOCIATION", cause);
      setStage("confirm-mapping-reset");
      setError(
        safePdfImportMessage(
          cause,
          "The replacement PDF could not be associated with this book.",
        ),
      );
      return;
    }

    setPendingUploadedPdfKey(null);
    setMappingConflictMessage("");
    setUploadedPdfAvailable(true);
    setChoice("EXISTING");
    setSelectedFile(null);
    onBookPdfAttached?.();
    await importExisting();
  };

  const reloadHistory = async () => {
    if (!onListPdfVersions) return;
    setPdfVersions(await onListPdfVersions());
  };

  const restoreVersion = async (versionId: string, clearMappings = false) => {
    if (!onRestorePdfVersion) return;
    setError("");
    setStage("uploading");
    try {
      const result = await onRestorePdfVersion(versionId, clearMappings ? { clearMappings: true } : undefined);
      if (result.mappingResetRequired) {
        setPendingRestoreVersionId(versionId);
        setMappingConflictMessage(result.mappingConflictMessage ?? `This PDF has ${result.pageCount} pages and does not fit the current page mappings.`);
        setStage("confirm-restore-reset");
        return;
      }
      await reloadHistory();
      onBookPdfAttached?.();
      setStage("source");
      setChoice("EXISTING");
    } catch (cause) {
      recordPdfImportFailure("BOOK_ASSOCIATION", cause);
      setStage("source");
      setError(safePdfImportMessage(cause, "The previous PDF could not be restored."));
    }
  };

  const continueImport = () => {
    if (choice === "UPLOAD") {
      void uploadAndImport();
      return;
    }
    void importExisting();
  };
  const cancelReplacement = () => {
    setGeneratedPages(null);
    setError("");
    setStage("source");
  };
  const replaceWithPdf = () => {
    if (!generatedPages) return;
    finish(generatedPages);
  };
  const chooseFile = (file: File | null) => {
    setSelectedFile(file);
    setError("");
  };
  const filePicker = (
    <label className="mt-4 inline-flex cursor-pointer rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800">
      <input type="file" accept="application/pdf,.pdf" className="sr-only" disabled={busy} onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
      Choose PDF
    </label>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Import PDF" className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-900">Import PDF</h2>
        {stage === "confirm-mapping-reset" ? (
          <>
            <p className="mt-3 text-sm font-semibold text-amber-800">
              The replacement PDF is valid, but its page count does not match the current book mappings.
            </p>

            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {mappingConflictMessage}
            </p>

            <p className="mt-3 text-sm text-slate-600">
              If you continue, Bluegate will keep the book hierarchy and content, but clear all saved page ranges for front matter, parts, units, chapters, modules, and exercises. You can remap them to the new PDF afterward.
            </p>

            {error ? (
              <p role="alert" className="mt-3 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelMappingReset}
                className="rounded border px-3 py-2 text-sm font-semibold"
              >
                Keep Current PDF
              </button>

              <button
                type="button"
                onClick={() => void replaceAndClearMappings()}
                className="rounded bg-rose-700 px-3 py-2 text-sm font-semibold text-white"
              >
                Replace PDF &amp; Clear Page Mappings
              </button>
            </div>
          </>
        ) : stage === "confirm-restore-reset" ? (
          <>
            <p className="mt-3 text-sm font-semibold text-amber-800">This previous PDF does not fit the current page mappings.</p>
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{mappingConflictMessage}</p>
            <p className="mt-3 text-sm text-slate-600">Restoring it can keep the book hierarchy and content while clearing saved page ranges. You can remap them afterward.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setPendingRestoreVersionId(null); setStage("source"); }} className="rounded border px-3 py-2 text-sm font-semibold">Cancel</button>
              <button type="button" onClick={() => pendingRestoreVersionId && void restoreVersion(pendingRestoreVersionId, true)} className="rounded bg-rose-700 px-3 py-2 text-sm font-semibold text-white">Restore &amp; Clear Page Mappings</button>
            </div>
          </>
        ) : stage === "confirm-replace" ? (
          <>
            <p className="mt-3 text-sm text-slate-600">Importing this PDF will replace the current V2 page layout and may remove existing page content.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={cancelReplacement} className="rounded border px-3 py-2 text-sm font-semibold">Cancel</button>
              <button type="button" onClick={replaceWithPdf} className="rounded bg-indigo-700 px-3 py-2 text-sm font-semibold text-white">Replace with PDF</button>
            </div>
          </>
        ) : hasCurrentBookPdf ? (
          <>
            <p className="mt-2 text-sm text-slate-600">A PDF is already available for this book.</p>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">PDF history</p>{historyLoading ? <span className="text-xs text-slate-400">Loading...</span> : null}</div>
              <div className="mt-2 space-y-2">
                {pdfVersions.map((version) => (
                  <div key={version.id} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
                    <div className="min-w-0"><p className="truncate font-semibold text-slate-800">{version.originalFileName || "Book PDF"}</p><p className="text-xs text-slate-500">{version.pageCount} pages {version.active ? "· Current" : "· Previous"}</p></div>
                    {version.active ? <a href={bookId ? `/api/books/${encodeURIComponent(bookId)}/full-pdf` : "#"} target="_blank" rel="noreferrer" className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800">Preview</a> : <button type="button" disabled={busy || !onRestorePdfVersion} onClick={() => void restoreVersion(version.id)} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40">Restore</button>}
                  </div>
                ))}
                {!historyLoading && !pdfVersions.length ? <p className="text-xs text-slate-500">No previous PDF versions recorded yet.</p> : null}
              </div>
            </div>
            <label className="mt-4 flex gap-2 text-sm"><input type="radio" checked={choice === "EXISTING"} disabled={busy} onChange={() => { setChoice("EXISTING"); setError(""); }} />Use existing PDF</label>
            <label className="mt-2 flex gap-2 text-sm"><input type="radio" checked={choice === "UPLOAD"} disabled={busy} onChange={() => { setChoice("UPLOAD"); setError(""); }} />Upload another PDF</label>
            {choice === "UPLOAD" ? <><p className="mt-3 text-sm text-slate-600">Choose a replacement full-book PDF.</p>{filePicker}{selectedFile ? <p className="mt-2 text-xs text-slate-500">{selectedFile.name}</p> : null}</> : null}
            {busy ? <p role="status" className="mt-3 text-sm text-slate-600">{stage === "uploading" ? "Uploading and verifying the book PDF..." : "Reading page information and creating V2 pages..."}</p> : null}
            {error ? <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={close} disabled={busy} className="rounded border px-3 py-2 text-sm font-semibold">Cancel</button>
              <button type="button" onClick={continueImport} disabled={busy || (choice === "UPLOAD" && !selectedFile)} className="rounded bg-indigo-700 px-3 py-2 text-sm font-semibold text-white">Continue</button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">No full book PDF has been uploaded for this book yet.</p>
            {filePicker}
            {selectedFile ? <p className="mt-2 text-xs text-slate-500">{selectedFile.name}</p> : null}
            {busy ? <p role="status" className="mt-3 text-sm text-slate-600">Uploading and verifying the book PDF...</p> : null}
            {error ? <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={close} disabled={busy} className="rounded border px-3 py-2 text-sm font-semibold">Cancel</button>
              <button type="button" onClick={() => void uploadAndImport()} disabled={busy || !selectedFile} className="rounded bg-indigo-700 px-3 py-2 text-sm font-semibold text-white">Continue</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}