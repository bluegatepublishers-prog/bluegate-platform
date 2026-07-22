import type { UploadScope } from "./types";
import { normalizeAndValidateObjectKey } from "./object-key";
import { uploadRules } from "./upload-policy";

export type StorageProviderKind = "BLOB" | "R2" | "LOCAL" | "EXTERNAL" | "INVALID";
export type StorageEntityType = "Publisher" | "School" | "Book" | "Resource";

export interface StorageFileRecord {
  id: string;
  entityType: StorageEntityType;
  entityId: string;
  field: string;
  arrayIndex?: number;
  publisherId: string;
  publisherName: string;
  schoolId?: string;
  title: string;
  value: string;
  provider: StorageProviderKind;
  scope: UploadScope;
  filename: string;
  mimeType: string | null;
  storedMimeType: string | null;
  storedFilename: string | null;
  sizeBytes: number | null;
  createdAt: Date;
}

export function classifyStorageValue(value: string): StorageProviderKind {
  if (value.startsWith("/uploads/")) return "LOCAL";
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:" && parsed.hostname.endsWith(".public.blob.vercel-storage.com")) return "BLOB";
    return parsed.protocol === "https:" ? "EXTERNAL" : "INVALID";
  } catch {
    try {
      const key = normalizeAndValidateObjectKey(value);
      return Object.values(uploadRules).some(rule => key.startsWith(`${rule.prefix}/`)) ? "R2" : "INVALID";
    } catch {
      return "INVALID";
    }
  }
}

export function storageFilename(value: string) {
  let segment = value.split("/").pop() || "file";
  try {
    segment = new URL(value).pathname.split("/").pop() || "file";
  } catch {
    // Object keys use the original value.
  }
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function inferStorageMimeType(filename: string): string | null {
  const extension = filename.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  const types: Record<string, string> = {
    ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".zip": "application/zip", ".mp4": "video/mp4", ".webm": "video/webm",
    ".mov": "video/quicktime",
  };
  return extension ? types[extension] ?? null : null;
}

export function makeStorageRecord(input: Omit<StorageFileRecord, "id" | "provider" | "filename" | "mimeType" | "storedMimeType" | "storedFilename"> & { filename?: string | null; mimeType?: string | null }) {
  const filename = input.filename?.trim() || storageFilename(input.value);
  return {
    ...input,
    id: [input.entityType, input.entityId, input.field, input.arrayIndex].filter(value => value !== undefined).join(":"),
    provider: classifyStorageValue(input.value),
    filename,
    mimeType: input.mimeType?.trim().toLowerCase() || inferStorageMimeType(filename),
    storedMimeType: input.mimeType?.trim().toLowerCase() || null,
    storedFilename: input.filename?.trim() || null,
  } satisfies StorageFileRecord;
}

export function filterStorageFiles(files: StorageFileRecord[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return files;
  return files.filter(file => [
    file.filename, file.publisherName, file.title, file.mimeType, file.entityType,
    file.createdAt.toISOString(),
  ].some(value => String(value ?? "").toLowerCase().includes(normalized)));
}

export function calculateStorageStatistics(files: StorageFileRecord[]) {
  const byProvider: Record<StorageProviderKind, number> = { BLOB: 0, R2: 0, LOCAL: 0, EXTERNAL: 0, INVALID: 0 };
  const byType: Record<string, { files: number; bytes: number }> = {};
  let totalBytes = 0;
  let knownSizeFiles = 0;
  for (const file of files) {
    byProvider[file.provider] += 1;
    const type = file.mimeType || "unknown";
    byType[type] ??= { files: 0, bytes: 0 };
    byType[type].files += 1;
    if (file.sizeBytes !== null) {
      knownSizeFiles += 1;
      totalBytes += file.sizeBytes;
      byType[type].bytes += file.sizeBytes;
    }
  }
  return { totalFiles: files.length, totalBytes, knownSizeFiles, byProvider, byType };
}
