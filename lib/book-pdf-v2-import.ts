import "server-only";

import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { getStorageProvider } from "@/lib/storage/provider";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { uploadPrefixForScope } from "@/lib/storage/upload-policy";
import { PDF_BOOK_LIMITS } from "@/lib/pdf-book-validation";
import { createV2PagesFromPdf } from "@/lib/pdf-v2-pages";
function traceOwnedBookPdfImport(event: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[content-studio-pdf-import]", { event, ...details });
  }
}

export async function createOwnedBookPdfV2Pages(bookId: string) {
  const actor = await requireLivePublisherAdmin();
  const book = await prisma.book.findFirst({ where: { id: bookId, publisherId: actor.publisherId }, select: { id: true, fullBookPdf: true } });
  if (!book) throw new Error("Book not found.");
  if (!book.fullBookPdf) throw new Error("Upload the full book PDF before importing it into Content Studio.");
  let key: string;
  try { key = normalizeAndValidateObjectKey(book.fullBookPdf); } catch { throw new Error("The stored book PDF is unavailable for import."); }
  if (!key.startsWith(`${uploadPrefixForScope("book-full")}/${actor.publisherId}/`)) throw new Error("The stored book PDF is unavailable for import.");
  const provider = getStorageProvider();
  const metadata = await provider.headObject({ key });
  if (!metadata || metadata.contentType?.toLowerCase() !== "application/pdf" || !metadata.contentLength || metadata.contentLength > PDF_BOOK_LIMITS.maxBytes) throw new Error("The stored book PDF is unavailable for import.");
  traceOwnedBookPdfImport("STORAGE_METADATA", {
    bookId,
    contentLength: metadata.contentLength,
    contentType: metadata.contentType,
    bytesRequested: PDF_BOOK_LIMITS.maxBytes,
  });
  const bytes = await provider.getObjectBytes({ key, maxBytes: PDF_BOOK_LIMITS.maxBytes });
  traceOwnedBookPdfImport("STORAGE_BYTES_READ", {
    bookId,
    bytesReturned: bytes.byteLength,
    byteLengthBeforeInspect: bytes.byteLength,
    signature: new TextDecoder("ascii").decode(bytes.slice(0, 5)),
  });
  try {
    const pages = await createV2PagesFromPdf(bytes);
    traceOwnedBookPdfImport("V2_PAGES_CREATED", {
      bookId,
      byteLengthAfterV2PageGeneration: bytes.byteLength,
      pageCount: pages.length,
      pagesLength: pages.length,
    });
    await prisma.book.updateMany({ where: { id: bookId, publisherId: actor.publisherId }, data: { pages: pages.length } });
    return { pageCount: pages.length, pages };
  } catch (cause) {
    traceOwnedBookPdfImport("V2_PAGE_CREATION_FAILED", {
      bookId,
      name: cause instanceof Error ? cause.name : "UnknownError",
      message: cause instanceof Error ? cause.message : String(cause),
      byteLengthAfterV2PageGeneration: bytes.byteLength,
    });
    throw cause;
  }
}