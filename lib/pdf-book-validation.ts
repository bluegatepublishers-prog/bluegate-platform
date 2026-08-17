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

type LoadedPdfDocument = {
  numPages: number;
  getPage(pageNumber: number): Promise<{
    cleanup?: () => void;
  }>;
  cleanup(): void;
};

type PdfLoadingTask = {
  promise: Promise<LoadedPdfDocument>;
  destroy(): Promise<void>;
};

/**
 * Load PDF.js for server-side use.
 *
 * Next.js/Turbopack can relocate the bundled PDF.js modules.
 * Explicitly loading the worker keeps PDF.js from attempting to find
 * a fake worker beside the generated .next server chunk.
 */
export async function loadServerPdfJs() {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ]);

  const globalWithPdfWorker =
    globalThis as typeof globalThis & {
      pdfjsWorker?: PdfJsWorkerModule;
    };

  if (!globalWithPdfWorker.pdfjsWorker) {
    globalWithPdfWorker.pdfjsWorker = worker;
  }

  return pdfjs;
}

async function parsePdf(
  data: Uint8Array,
  strict: boolean,
): Promise<number> {
  const pdfjs = await loadServerPdfJs();

  let document:
    | LoadedPdfDocument
    | undefined;

  let loadingTask:
    | PdfLoadingTask
    | undefined;

  try {
    /*
     * Always give PDF.js its own copy because PDF.js may transfer/detach
     * the underlying ArrayBuffer.
     */
    loadingTask = pdfjs.getDocument({
      data: data.slice(),

      disableAutoFetch: true,
      disableStream: true,
      useWorkerFetch: false,
      disableFontFace: true,

      /*
       * First attempt is strict.
       *
       * If a publisher PDF contains a recoverable xref/object/export
       * inconsistency, inspectPdfBook() performs one controlled retry
       * with stopAtErrors=false.
       */
      stopAtErrors: strict,
    }) as PdfLoadingTask;

    document = await loadingTask.promise;

    const pageCount = document.numPages;

    if (
      !Number.isInteger(pageCount) ||
      pageCount <= 0
    ) {
      throw new PdfBookValidationError(
        "ZERO_PAGES",
        "The PDF does not contain readable pages.",
      );
    }

    /*
     * A page count alone is not sufficient.
     * Require PDF.js to resolve the first actual page.
     */
    const firstPage = await document.getPage(1);

    firstPage.cleanup?.();

    return pageCount;
  } finally {
    try {
      document?.cleanup();
    } catch {
      // Best-effort PDF.js cleanup.
    }

    try {
      await loadingTask?.destroy();
    } catch {
      // Best-effort PDF.js task cleanup.
    }
  }
}

export async function inspectPdfBook(
  data: Uint8Array,
  limits = PDF_BOOK_LIMITS,
): Promise<PdfBookInspection> {
  if (
    !data.byteLength ||
    data.byteLength > limits.maxBytes
  ) {
    throw new PdfBookValidationError(
      "TOO_LARGE",
      "The PDF exceeds the 100 MB book upload limit.",
    );
  }

  const signature =
    new TextDecoder("ascii").decode(
      data.slice(0, 5),
    );

  if (signature !== "%PDF-") {
    throw new PdfBookValidationError(
      "INVALID_SIGNATURE",
      "The uploaded file is not a valid PDF.",
    );
  }

  let pageCount: number;

  try {
    /*
     * Pass 1:
     * strict parsing.
     */
    pageCount = await parsePdf(
      data,
      true,
    );
  } catch (strictError) {
    if (
      strictError instanceof
      PdfBookValidationError
    ) {
      throw strictError;
    }

    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      console.warn(
        "[PDFJS STRICT PARSE FAILED — RETRYING TOLERANTLY]",
        {
          name:
            strictError instanceof Error
              ? strictError.name
              : "Unknown",
          message:
            strictError instanceof Error
              ? strictError.message
              : String(strictError),
        },
      );
    }

    try {
      /*
       * Pass 2:
       * PDF.js tolerant mode.
       *
       * This permits PDF.js to repair/recover minor structural issues
       * commonly produced by print/export software, while we still
       * require a legitimate page tree and a readable first page.
       */
      pageCount = await parsePdf(
        data,
        false,
      );
    } catch (tolerantError) {
      if (
        tolerantError instanceof
        PdfBookValidationError
      ) {
        throw tolerantError;
      }

      /*
       * Intentionally log the safe underlying PDF.js error in production.
       * This does not expose the PDF contents or infrastructure secrets.
       * It is needed to distinguish runtime/bundling failures from a
       * genuinely malformed PDF.
       */
      console.error(
        "[PDFJS REAL PARSE ERROR]",
        {
          name:
            tolerantError instanceof Error
              ? tolerantError.name
              : "Unknown",
          message:
            tolerantError instanceof Error
              ? tolerantError.message
              : String(tolerantError),
        },
      );

      throw new PdfBookValidationError(
        "MALFORMED",
        "The uploaded PDF could not be read safely. Export the book PDF again and retry.",
      );
    }
  }

  if (
    pageCount >
    limits.maxPages
  ) {
    throw new PdfBookValidationError(
      "TOO_MANY_PAGES",
      "The PDF has more pages than the supported book limit.",
    );
  }

  return {
    pageCount,
  };
}