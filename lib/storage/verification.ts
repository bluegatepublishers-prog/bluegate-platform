import type { StorageFileRecord } from "./storage-records";
import type { StorageObjectMetadata, StorageProvider } from "./types";
import { normalizeAndValidateObjectKey } from "./object-key";
import { uploadPrefixForScope, uploadRules } from "./upload-policy";

export type MetadataMismatch = {
  field: "size" | "mimeType" | "filename" | "checksum";
  databaseValue: string | number | null;
  objectValue: string | number | null;
};

export type ObjectVerification = {
  fileId: string;
  objectKey: string | null;
  exists: boolean;
  namespaceValid: boolean;
  checksumCompared: boolean;
  checksumMatches: boolean | null;
  metadata: StorageObjectMetadata | null;
  mismatches: MetadataMismatch[];
  verified: boolean;
};

function expectedTenant(file: StorageFileRecord) {
  return file.scope === "school-logo" ? file.schoolId : file.publisherId;
}

export function compareMetadata(file: StorageFileRecord, object: StorageObjectMetadata | null): MetadataMismatch[] {
  if (!object) return [];
  const mismatches: MetadataMismatch[] = [];
  if (file.sizeBytes !== null && object.contentLength !== undefined && file.sizeBytes !== object.contentLength) {
    mismatches.push({ field: "size", databaseValue: file.sizeBytes, objectValue: object.contentLength });
  }
  const dbMime = file.mimeType?.trim().toLowerCase() ?? null;
  const objectMime = object.contentType?.trim().toLowerCase() ?? null;
  if (dbMime && objectMime && dbMime !== objectMime) mismatches.push({ field: "mimeType", databaseValue: dbMime, objectValue: objectMime });
  const encodedFilename = object.customMetadata?.["original-filename"]?.trim() || null;
  let objectFilename = encodedFilename;
  try { objectFilename = encodedFilename ? decodeURIComponent(encodedFilename) : null; } catch { objectFilename = encodedFilename; }
  if (objectFilename && file.filename !== objectFilename) mismatches.push({ field: "filename", databaseValue: file.filename, objectValue: objectFilename });
  const expectedChecksum = object.customMetadata?.["expected-sha256"]?.trim() || null;
  const actualChecksum = object.customMetadata?.["checksum-sha256"]?.trim() || null;
  if (expectedChecksum && actualChecksum && expectedChecksum !== actualChecksum) mismatches.push({ field: "checksum", databaseValue: expectedChecksum, objectValue: actualChecksum });
  return mismatches;
}

export async function verifyObject(file: StorageFileRecord, provider: Pick<StorageProvider, "headObject">): Promise<ObjectVerification> {
  if (file.provider !== "R2") return { fileId: file.id, objectKey: null, exists: false, namespaceValid: false, checksumCompared: false, checksumMatches: null, metadata: null, mismatches: [], verified: false };
  let key: string;
  let namespaceValid = false;
  try {
    key = normalizeAndValidateObjectKey(file.value);
    const tenant = expectedTenant(file);
    namespaceValid = Boolean(tenant && key.startsWith(`${uploadPrefixForScope(file.scope)}/${tenant}/`));
  } catch {
    return { fileId: file.id, objectKey: file.value, exists: false, namespaceValid: false, checksumCompared: false, checksumMatches: null, metadata: null, mismatches: [], verified: false };
  }
  if (!namespaceValid) return { fileId: file.id, objectKey: key, exists: false, namespaceValid, checksumCompared: false, checksumMatches: null, metadata: null, mismatches: [], verified: false };
  const metadata = await provider.headObject({ key });
  const mismatches = compareMetadata(file, metadata);
  const expectedChecksum = metadata?.customMetadata?.["expected-sha256"];
  const actualChecksum = metadata?.customMetadata?.["checksum-sha256"];
  const checksumCompared = Boolean(expectedChecksum && actualChecksum);
  const checksumMatches = checksumCompared ? expectedChecksum === actualChecksum : null;
  const allowedMime = !metadata?.contentType || uploadRules[file.scope].contentTypes.includes(metadata.contentType.toLowerCase());
  const allowedSize = metadata?.contentLength === undefined || (metadata.contentLength > 0 && metadata.contentLength <= uploadRules[file.scope].maxSize);
  return { fileId: file.id, objectKey: key, exists: Boolean(metadata), namespaceValid, checksumCompared, checksumMatches, metadata, mismatches, verified: Boolean(metadata && allowedMime && allowedSize && checksumMatches !== false && mismatches.length === 0) };
}

export async function verifyPublisher(files: readonly StorageFileRecord[], provider: Pick<StorageProvider, "headObject">, options: { offset?: number; limit?: number } = {}) {
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const page = files.filter(file => file.provider === "R2").slice(offset, offset + limit);
  const results: ObjectVerification[] = [];
  for (const file of page) results.push(await verifyObject(file, provider));
  return { offset, limit, checked: results.length, hasMore: files.filter(file => file.provider === "R2").length > offset + results.length, results };
}

export async function verifyAll(publishers: readonly { publisherId: string; files: readonly StorageFileRecord[] }[], provider: Pick<StorageProvider, "headObject">, options: { publisherOffset?: number; publisherLimit?: number; fileLimit?: number } = {}) {
  const publisherOffset = Math.max(0, options.publisherOffset ?? 0);
  const publisherLimit = Math.min(Math.max(options.publisherLimit ?? 20, 1), 100);
  const reports = [];
  for (const publisher of publishers.slice(publisherOffset, publisherOffset + publisherLimit)) reports.push({ publisherId: publisher.publisherId, ...(await verifyPublisher(publisher.files, provider, { limit: options.fileLimit ?? 100 })) });
  return { publisherOffset, publisherLimit, hasMore: publishers.length > publisherOffset + reports.length, publishers: reports };
}
