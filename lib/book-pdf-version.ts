import { Prisma, type PrismaClient } from "@prisma/client";

import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { uploadPrefixForScope } from "@/lib/storage/upload-policy";

export type BookPdfVersionIdentity = {
  bookId: string;
  objectKey: string;
  pageCount: number;
  originalFileName?: string | null;
  activate?: boolean;
};

type BookPdfVersionWriteDatabase = Pick<Prisma.TransactionClient, "$executeRaw" | "bookPdfVersion">;
type BookPdfVersionReadDatabase = Pick<PrismaClient, "book" | "bookPdfVersion">;

export type CurrentBookPdfVersion = {
  id: string;
  bookId: string;
  objectKey: string;
  pageCount: number;
  activatedAt: Date | null;
};

export type CurrentBookPdfVersionResolution =
  | {
      ok: true;
      book: { id: string; publisherId: string; fullBookPdf: string | null; pages: number | null };
      version: CurrentBookPdfVersion;
    }
  | {
      ok: false;
      code: "BOOK_NOT_FOUND" | "IMMUTABLE_PDF_VERSION_MISSING" | "PDF_POINTER_INVALID" | "PDF_PAGE_COUNT_MISMATCH";
      message: string;
    };

async function lockBookPdfVersion(database: BookPdfVersionWriteDatabase, bookId: string) {
  await database.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`book-pdf-version:${bookId}`}))`);
}

export async function ensureBookPdfVersion(
  database: BookPdfVersionWriteDatabase,
  input: BookPdfVersionIdentity,
) {
  const key = normalizeAndValidateObjectKey(input.objectKey);
  if (!Number.isInteger(input.pageCount) || input.pageCount < 1) {
    throw new Error("A validated Book PDF must have a positive page count.");
  }

  await lockBookPdfVersion(database, input.bookId);
  const existing = await database.bookPdfVersion.findFirst({
    where: { bookId: input.bookId, objectKey: key },
    select: { id: true, bookId: true, objectKey: true, pageCount: true, activatedAt: true, active: true },
  });

  if (existing && existing.pageCount !== input.pageCount) {
    throw new Error("The immutable Book PDF version metadata does not match the validated PDF.");
  }

  if (existing) {
    if (input.activate && !existing.active) {
      await database.bookPdfVersion.updateMany({
        where: { bookId: input.bookId, active: true, id: { not: existing.id } },
        data: { active: false },
      });
      return database.bookPdfVersion.update({
        where: { id: existing.id },
        data: { active: true, activatedAt: new Date() },
        select: { id: true, bookId: true, objectKey: true, pageCount: true, activatedAt: true },
      });
    }
    return existing;
  }

  if (input.activate) {
    await database.bookPdfVersion.updateMany({ where: { bookId: input.bookId, active: true }, data: { active: false } });
  }

  return database.bookPdfVersion.create({
    data: {
      bookId: input.bookId,
      objectKey: key,
      originalFileName: input.originalFileName ?? null,
      pageCount: input.pageCount,
      active: input.activate === true,
      activatedAt: input.activate ? new Date() : null,
    },
    select: { id: true, bookId: true, objectKey: true, pageCount: true, activatedAt: true },
  });
}

export async function resolveCurrentBookPdfVersion(
  database: BookPdfVersionReadDatabase,
  input: { publisherId: string; bookId: string },
): Promise<CurrentBookPdfVersionResolution> {
  const book = await database.book.findFirst({
    where: { id: input.bookId, publisherId: input.publisherId },
    select: { id: true, fullBookPdf: true, pages: true },
  });
  if (!book) return { ok: false, code: "BOOK_NOT_FOUND", message: "The selected Book is unavailable." };
  if (!book.fullBookPdf) return { ok: false, code: "IMMUTABLE_PDF_VERSION_MISSING", message: "An immutable PDF version is required before Smart Book release readiness can be established." };

  let key: string;
  try {
    key = normalizeAndValidateObjectKey(book.fullBookPdf);
  } catch {
    return { ok: false, code: "PDF_POINTER_INVALID", message: "The current Book PDF pointer is invalid." };
  }
  if (!key.startsWith(`${uploadPrefixForScope("book-full")}/${input.publisherId}/`)) {
    return { ok: false, code: "PDF_POINTER_INVALID", message: "The current Book PDF is outside the Publisher storage scope." };
  }

  const version = await database.bookPdfVersion.findFirst({
    where: { bookId: input.bookId, objectKey: key, active: true, book: { publisherId: input.publisherId } },
    select: { id: true, bookId: true, objectKey: true, pageCount: true, activatedAt: true },
  });
  if (!version) return { ok: false, code: "IMMUTABLE_PDF_VERSION_MISSING", message: "An immutable PDF version matching the current Book PDF is required before Smart Book release readiness can be established." };
  if (book.pages === null || book.pages !== version.pageCount) return { ok: false, code: "PDF_PAGE_COUNT_MISMATCH", message: "The current Book PDF page count does not match its immutable PDF version." };

  return { ok: true, book: { ...book, publisherId: input.publisherId }, version };
}