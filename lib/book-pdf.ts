import "server-only";

import { getStorageProvider } from "@/lib/storage/provider";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { uploadPrefixForScope } from "@/lib/storage/upload-policy";
import { inspectPdfBook, PDF_BOOK_LIMITS, type PdfBookInspection } from "@/lib/pdf-book-validation";

export async function inspectPublisherBookPdf(objectKey: string, publisherId: string): Promise<PdfBookInspection> {
  const key = normalizeAndValidateObjectKey(objectKey);
  if (!key.startsWith(`${uploadPrefixForScope("book-full")}/${publisherId}/`)) throw new Error("The uploaded book PDF is unavailable.");
  const provider = getStorageProvider();
  const metadata = await provider.headObject({ key });
  if (!metadata || metadata.contentType?.toLowerCase() !== "application/pdf" || !metadata.contentLength) throw new Error("The uploaded book PDF is unavailable.");
  if (metadata.contentLength > PDF_BOOK_LIMITS.maxBytes) throw new Error("The PDF exceeds the 100 MB book upload limit.");
  return inspectPdfBook(await provider.getObjectBytes({ key, maxBytes: PDF_BOOK_LIMITS.maxBytes }));
}