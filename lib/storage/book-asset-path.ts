import { classifyStorageValue } from "./storage-records";

export function bookCoverPath(bookId: string, value: string | null | undefined) {
  if (!value) return null;
  return ["R2", "BLOB", "LOCAL"].includes(classifyStorageValue(value))
    ? `/api/books/${encodeURIComponent(bookId)}/asset/cover`
    : value;
}

export function bookPreviewPath(bookId: string, value: string | null | undefined) {
  if (!value) return null;
  return ["R2", "BLOB", "LOCAL"].includes(classifyStorageValue(value))
    ? `/api/books/${encodeURIComponent(bookId)}/asset/preview`
    : value;
}
