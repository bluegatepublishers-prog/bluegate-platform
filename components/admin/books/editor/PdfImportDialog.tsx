"use client";

import { useState } from "react";

import type { LayoutV2Page } from "@/lib/content-layout-v2";
import { StorageUploadError, uploadFileToR2 } from "@/lib/storage/client-upload";

type PdfImportResult = { pageCount: number; pages: LayoutV2Page[] };
type ImportStage = "source" | "upload" | "uploading" | "importing" | "confirm-replace" | "complete";
type PdfImportFailureStage = "EXISTING_PDF" | "UPLOAD_INIT" | "SIGNED_PUT" | "UPLOAD_COMPLETE" | "BOOK_ASSOCIATION" | "PDF_VALIDATION" | "V2_GENERATION";

function uploadFailureStage(cause: unknown): PdfImportFailureStage {
  if (!(cause instanceof StorageUploadError)) return "BOOK_ASSOCIATION";
  if (cause.code.includes("UPLOAD_INIT")) return "UPLOAD_INIT";
  if (cause.code.includes("STORAGE_TRANSFER")) return "SIGNED_PUT";
  if (cause.code.includes("UPLOAD_COMPLETE")) return "UPLOAD_COMPLETE";
  return "BOOK_ASSOCIATION";
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
  onAttachUploadedPdf?: (uploadedPdfKey: string) => Promise<{ pageCount: number }>;
  onBookPdfAttached?: () => void;
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
  onComplete,
}: Props) {
  const [choice, setChoice] = useState<"EXISTING" | "UPLOAD">("EXISTING");
  const [uploadedPdfAvailable, setUploadedPdfAvailable] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stage, setStage] = useState<ImportStage>(hasFullBookPdf ? "source" : "upload");
  const [generatedPages, setGeneratedPages] = useState<LayoutV2Page[] | null>(null);
  const [error, setError] = useState("");

  if (!open) return null;

  const hasCurrentBookPdf = hasFullBookPdf || uploadedPdfAvailable;
  const busy = stage === "importing" || stage === "uploading";
  const reset = () => {
    setChoice("EXISTING");
    setSelectedFile(null);
    setGeneratedPages(null);
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
      setError("The PDF could not be read safely. Export the book PDF again and retry.");
    }
  };
  const uploadAndImport = async () => {
    if (!selectedFile) {
      setError("Choose a PDF to import.");
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
      setError("The PDF upload could not be completed. Check the file and retry.");
      return;
    }
    try {
      await onAttachUploadedPdf(uploaded.objectKey);
    } catch (cause) {
      const stage = cause instanceof Error && /PDF|book PDF/i.test(cause.message) ? "PDF_VALIDATION" : "BOOK_ASSOCIATION";
      recordPdfImportFailure(stage, cause);
      setGeneratedPages(null);
      setStage("upload");
      setError(stage === "PDF_VALIDATION" ? "The uploaded PDF could not be read safely. Export the book PDF again and retry." : "The uploaded PDF could not be associated with this book. Retry the upload.");
      return;
    }
    setUploadedPdfAvailable(true);
    setChoice("EXISTING");
    setSelectedFile(null);
    onBookPdfAttached?.();
    await importExisting();
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
        {stage === "confirm-replace" ? (
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