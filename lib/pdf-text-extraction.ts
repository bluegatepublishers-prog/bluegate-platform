import "server-only";

import { inspectPdfBook, loadServerPdfJs, PDF_BOOK_LIMITS } from "@/lib/pdf-book-validation";
import { normalizePdfTextItems } from "@/lib/pdf-text-normalization";

type PdfTextContentPage = {
  getTextContent(): Promise<{ items: unknown[] }>;
  cleanup(): void;
};

type PdfTextDocument = {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfTextContentPage>;
  cleanup(): void;
};

type PdfLoadingTask = {
  promise: Promise<PdfTextDocument>;
  destroy(): Promise<void>;
};

export type PdfPageText = {
  pageNumber: number;
  text: string;
};

/**
 * Extract text from every page of an already-loaded PDF byte buffer.
 * Validation and page limits are delegated to the existing PDF book policy.
 */
export async function extractPdfPageText(
  data: Uint8Array,
  limits = PDF_BOOK_LIMITS,
): Promise<PdfPageText[]> {
  const inspection = await inspectPdfBook(data, limits);
  const pdfjs = await loadServerPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: data.slice(),
    disableAutoFetch: true,
    disableStream: true,
    useWorkerFetch: false,
    stopAtErrors: true,
    disableFontFace: true,
  }) as unknown as PdfLoadingTask;

  let document: PdfTextDocument | undefined;
  try {
    document = await loadingTask.promise;
    const pages: PdfPageText[] = [];
    for (let pageNumber = 1; pageNumber <= inspection.pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        pages.push({ pageNumber, text: normalizePdfTextItems(content.items) });
      } finally {
        page.cleanup();
      }
    }
    return pages;
  } finally {
    document?.cleanup();
    await loadingTask.destroy();
  }
}
