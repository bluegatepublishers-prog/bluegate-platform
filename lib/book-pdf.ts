import "server-only";

import { getStorageProvider } from "@/lib/storage/provider";
import { prisma } from "@/lib/prisma";
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
type PdfPageMappingConflict = {
  label: string;
  title: string | null;
  endPage: number;
};

/**
 * Reject a full-book PDF replacement before changing Book.fullBookPdf when an
 * existing page mapping would point beyond the replacement document.
 */
export async function assertBookPdfReplacementMappingsFit(
  bookId: string,
  publisherId: string,
  pageCount: number,
) {
  const book = await prisma.book.findFirst({
    where: { id: bookId, publisherId },
    select: { id: true },
  });
  if (!book) throw new Error("The selected book is unavailable.");

  const [frontMatter, part, unit, chapter, moduleNode, exercise] = await Promise.all([
    prisma.bookFrontMatterItem.findFirst({ where: { bookId, endPage: { gt: pageCount } }, orderBy: { endPage: "desc" }, select: { title: true, endPage: true } }),
    prisma.bookPart.findFirst({ where: { bookId, endPage: { gt: pageCount } }, orderBy: { endPage: "desc" }, select: { title: true, endPage: true } }),
    prisma.bookUnit.findFirst({ where: { bookId, endPage: { gt: pageCount } }, orderBy: { endPage: "desc" }, select: { title: true, endPage: true } }),
    prisma.bookChapter.findFirst({ where: { bookId, endPage: { gt: pageCount } }, orderBy: { endPage: "desc" }, select: { title: true, endPage: true } }),
    prisma.bookModule.findFirst({ where: { bookId, endPage: { gt: pageCount } }, orderBy: { endPage: "desc" }, select: { title: true, endPage: true } }),
    prisma.bookExercise.findFirst({ where: { bookId, archived: false, endPage: { gt: pageCount } }, orderBy: { endPage: "desc" }, select: { title: true, endPage: true } }),
  ]);

  const conflicts: Array<PdfPageMappingConflict | null> = [
    frontMatter && frontMatter.endPage !== null ? { label: "front-matter item", title: frontMatter.title, endPage: frontMatter.endPage } : null,
    part && part.endPage !== null ? { label: "part", title: part.title, endPage: part.endPage } : null,
    unit && unit.endPage !== null ? { label: "unit", title: unit.title, endPage: unit.endPage } : null,
    chapter && chapter.endPage !== null ? { label: "chapter", title: chapter.title, endPage: chapter.endPage } : null,
    moduleNode && moduleNode.endPage !== null ? { label: "module", title: moduleNode.title, endPage: moduleNode.endPage } : null,
    exercise && exercise.endPage !== null ? { label: "exercise", title: exercise.title, endPage: exercise.endPage } : null,
  ];

  const first = conflicts
    .filter((value): value is PdfPageMappingConflict => value !== null)
    .sort((left, right) => right.endPage - left.endPage)[0];
  if (first) {
    const name = first.title?.trim() ? ` "${first.title.trim()}"` : "";
    throw new Error(`Cannot replace the full-book PDF: ${first.label}${name} is mapped through page ${first.endPage}, but the new PDF has ${pageCount} pages. Update or clear out-of-range mappings before retrying.`);
  }
}