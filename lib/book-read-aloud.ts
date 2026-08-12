import "server-only";

import { Prisma } from "@prisma/client";

import { normalizeContentDocument } from "@/lib/content-document";
import { mergePdfReadAloudIntoDocument, type PrepareBookReadAloudResult } from "@/lib/book-read-aloud-merge";
import { extractPdfPageText } from "@/lib/pdf-text-extraction";
import { PDF_BOOK_LIMITS } from "@/lib/pdf-book-validation";
import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { getStorageProvider } from "@/lib/storage/provider";
import { uploadPrefixForScope } from "@/lib/storage/upload-policy";

function assertOwnedPdfKey(value: string, publisherId: string) {
  const key = normalizeAndValidateObjectKey(value);
  if (!key.startsWith(`${uploadPrefixForScope("book-full")}/${publisherId}/`)) throw new Error("The stored book PDF is unavailable.");
  return key;
}

export async function prepareOwnedBookReadAloud(bookId: string): Promise<PrepareBookReadAloudResult> {
  const actor = await requireLivePublisherAdmin();
  const book = await prisma.book.findFirst({
    where: { id: bookId, publisherId: actor.publisherId },
    select: { id: true, fullBookPdf: true, content: true },
  });
  if (!book) throw new Error("Book not found.");
  if (!book.fullBookPdf) throw new Error("Upload the full book PDF before preparing Read Aloud.");

  const document = normalizeContentDocument(book.content);
  if (!document.pageLayout?.pages.length) throw new Error("Import the full book PDF into the book document before preparing Read Aloud.");

  const key = assertOwnedPdfKey(book.fullBookPdf, actor.publisherId);
  const provider = getStorageProvider();
  const metadata = await provider.headObject({ key });
  if (!metadata || metadata.contentType?.toLowerCase() !== "application/pdf" || !metadata.contentLength || metadata.contentLength > PDF_BOOK_LIMITS.maxBytes) {
    throw new Error("The stored book PDF is unavailable.");
  }
  const bytes = await provider.getObjectBytes({ key, maxBytes: PDF_BOOK_LIMITS.maxBytes });
  const extractedPages = await extractPdfPageText(bytes);
  const merged = mergePdfReadAloudIntoDocument(document, extractedPages);
  const updated = await prisma.book.updateMany({
    where: { id: bookId, publisherId: actor.publisherId },
    data: { content: merged.document as unknown as Prisma.InputJsonValue },
  });
  if (updated.count !== 1) throw new Error("Book not found.");
  return merged.result;
}
