import "server-only";

export const PDF_BOOK_LIMITS = {
  maxBytes: 100 * 1024 * 1024,
  maxPages: 2_000,
} as const;

export type PdfBookInspection = {
  pageCount: number;
};

export type PdfBookValidationCode =
  | "INVALID_SIGNATURE"
  | "TOO_LARGE"
  | "MALFORMED"
  | "ZERO_PAGES"
  | "TOO_MANY_PAGES";

export class PdfBookValidationError extends Error {
  constructor(
    public readonly code: PdfBookValidationCode,
    message: string,
  ) {
    super(message);
    this.name = "PdfBookValidationError";
  }
}

type PdfJsWorkerModule = {
  WorkerMessageHandler?: unknown;
};

/**
 * Load PDF.js for server-side use.
 *
 * Next.js/Turbopack changes the location of the bundled PDF.js module.
 * PDF.js otherwise tries to locate pdf.worker.mjs relative to the generated
 * .next server chunk, where the worker file does not exist.
 *
 * Explicitly loading the worker module and exposing it to PDF.js prevents
 * that broken fake-worker lookup.
 */
export async function loadServerPdfJs() {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ]);

  const globalWithPdfWorker = globalThis as typeof globalThis & {
    pdfjsWorker?: PdfJsWorkerModule;
  };

  if (!globalWithPdfWorker.pdfjsWorker) {
    globalWithPdfWorker.pdfjsWorker = worker;
  }

  return pdfjs;
}

export async function inspectPdfBook(
  data: Uint8Array,
  limits = PDF_BOOK_LIMITS,
): Promise<PdfBookInspection> {
  if (!data.byteLength || data.byteLength > limits.maxBytes) {
    throw new PdfBookValidationError(
      "TOO_LARGE",
      "The PDF exceeds the 100 MB book upload limit.",
    );
  }

  const signature = new TextDecoder("ascii").decode(data.slice(0, 5));

  if (signature !== "%PDF-") {
    throw new PdfBookValidationError(
      "INVALID_SIGNATURE",
      "The uploaded file is not a valid PDF.",
    );
  }

  let document:
    | {
        numPages: number;
        getPage(pageNumber: number): Promise<unknown>;
        cleanup(): void;
      }
    | undefined;

  let loadingTask:
    | {
        promise: Promise<{
          numPages: number;
          getPage(pageNumber: number): Promise<unknown>;
          cleanup(): void;
        }>;
        destroy(): Promise<void>;
      }
    | undefined;

  try {
    const pdfjs = await loadServerPdfJs();

    /*
     * PDF.js may transfer/detach its input buffer.
     * Keep the caller-owned bytes available for the V2 metadata
     * generation pass that follows this inspection.
     */
    loadingTask = pdfjs.getDocument({
      data: data.slice(),
      disableAutoFetch: true,
      disableStream: true,
      useWorkerFetch: false,
      stopAtErrors: true,
      disableFontFace: true,
    });

    document = await loadingTask.promise;

    const pageCount = document.numPages;

    if (!Number.isInteger(pageCount) || pageCount <= 0) {
      throw new PdfBookValidationError(
        "ZERO_PAGES",
        "The PDF does not contain readable pages.",
      );
    }

    if (pageCount > limits.maxPages) {
      throw new PdfBookValidationError(
        "TOO_MANY_PAGES",
        "The PDF has more pages than the supported book limit.",
      );
    }

    // Verify that at least the first page can actually be loaded.
    await document.getPage(1);

    return {
      pageCount,
    };
  } catch (error) {
    if (error instanceof PdfBookValidationError) {
      throw error;
    }

    if (process.env.NODE_ENV !== "production") {
      console.error("[PDFJS REAL PARSE ERROR]", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }

    throw new PdfBookValidationError(
      "MALFORMED",
      "The PDF could not be read safely. Export the book PDF again and retry.",
    );
  } finally {
    document?.cleanup();
    await loadingTask?.destroy();
  }
}