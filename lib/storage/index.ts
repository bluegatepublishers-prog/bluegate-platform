import "server-only";
import { getStorageProvider } from "./provider";
import { VercelBlobStorageProvider } from "./vercel-blob";
import {
  LegacyUrlStorageProvider,
  CreateSignedDownloadInput,
  CreateSignedUploadInput,
  DeleteObjectInput,
  HeadObjectInput,
  SignedDownloadResult,
  SignedUploadResult,
  StorageObjectMetadata,
} from "./types";

const legacyProviders: LegacyUrlStorageProvider[] = [new VercelBlobStorageProvider()];

/**
 * Creates a pre-signed URL for uploading an object directly to the storage provider.
 * The application is responsible for enforcing size and type limits before calling this.
 */
export function createSignedUploadUrl(input: CreateSignedUploadInput): Promise<SignedUploadResult> {
  const provider = getStorageProvider();
  return provider.createSignedUploadUrl(input);
}

/**
 * Creates a pre-signed, short-lived URL for downloading a private object.
 */
export function createSignedDownloadUrl(input: CreateSignedDownloadInput): Promise<SignedDownloadResult> {
  const provider = getStorageProvider();
  return provider.createSignedDownloadUrl(input);
}

/**
 * Deletes a stored object. Does not fail if the object does not exist.
 */
export function deleteStoredObject(input: DeleteObjectInput): Promise<void> {
  const provider = getStorageProvider();
  return provider.deleteObject(input);
}

/**
 * Retrieves metadata for a stored object without fetching the object itself.
 */
export function headStoredObject(input: HeadObjectInput): Promise<StorageObjectMetadata | null> {
  const provider = getStorageProvider();
  return provider.headObject(input);
}

/**
 * Deletes a file from a legacy storage provider using its URL.
 * This is for backward compatibility.
 * @deprecated Use `deleteStoredObject` with an object key instead.
 */
export async function deleteFile(url: string | null | undefined): Promise<void> {
  if (!url) return;
  for (const p of legacyProviders) {
    if (p.isManagedUrl(url)) {
      await p.delete(url);
      return;
    }
  }
}

/** @deprecated Use a more specific check based on object key prefixes. */
export function isManagedFileUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return legacyProviders.some((p) => p.isManagedUrl(url));
}
