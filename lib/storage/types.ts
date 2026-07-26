export interface StorageObjectMetadata {
  key: string;
  contentType?: string;
  contentLength?: number;
  eTag?: string;
  lastModified?: Date;
  customMetadata?: Record<string, string>;
}

export interface CreateSignedUploadInput {
  key: string;
  contentType: string;
  contentLength: number;
  checksumSHA256?: string; // base64 encoded
  expiresInSeconds?: number;
  customMetadata?: Record<string, string>;
}

export interface SignedUploadResult {
  url: string;
  method: "PUT";
  key: string;
  expires: Date;
  headers: Record<string, string>;
}

export interface CreateSignedDownloadInput {
  key: string;
  expiresInSeconds?: number;
  downloadFilename?: string; // e.g., "chapter-1.pdf"
  disposition?: "attachment" | "inline";
}

export interface SignedDownloadResult {
  url: string;
  key:string;
  expires: Date;
}

export interface DeleteObjectInput {
  key: string;
}

export interface HeadObjectInput {
  key: string;
}

export interface PutObjectInput {
  key: string;
  body: Uint8Array;
  contentType: string;
  customMetadata?: Record<string, string>;
}

export interface ListObjectsInput {
  prefix: string;
  continuationToken?: string;
  maxKeys?: number;
}

export interface ListObjectsResult {
  objects: StorageObjectMetadata[];
  continuationToken?: string;
}

export interface ReplaceObjectMetadataInput {
  key: string;
  expectedETag: string;
  contentType?: string;
  customMetadata: Record<string, string>;
}

/**
 * Defines the contract for a provider-neutral storage service.
 * All methods must be safe to call from server-side application code.
 * Implementations are responsible for handling provider-specific details and errors.
 */
export interface StorageProvider {
  /** Creates a pre-signed URL for uploading an object. */
  createSignedUploadUrl(input: CreateSignedUploadInput): Promise<SignedUploadResult>;
  /** Creates a pre-signed URL for downloading a private object. */
  createSignedDownloadUrl(input: CreateSignedDownloadInput): Promise<SignedDownloadResult>;
  /** Deletes an object from storage. Should not fail if the object doesn't exist. */
  deleteObject(input: DeleteObjectInput): Promise<void>;
  /** Retrieves object metadata. Returns null if the object does not exist. */
  headObject(input: HeadObjectInput): Promise<StorageObjectMetadata | null>;
  /** Uploads bytes from trusted server-side maintenance code. */
  putObject(input: PutObjectInput): Promise<StorageObjectMetadata>;
  /** Lists object metadata without returning object bodies. */
  listObjects(input: ListObjectsInput): Promise<ListObjectsResult>;
  /** Replaces metadata only when the object still has the verified ETag. */
  replaceObjectMetadata(input: ReplaceObjectMetadataInput): Promise<StorageObjectMetadata>;
}

/**
 * Defines the contract for a legacy URL-based storage provider.
 * This is for backward compatibility during the transition to the new StorageProvider.
 */
export type UploadScope =
  | "book-cover"
  | "book-gallery"
  | "book-sample"
  | "book-public-preview"
  | "book-full"
  | "school-logo"
  | "publisher-logo"
  | "publisher-favicon"
  | "resource-thumbnail"
  | "resource-file"
  | "class-material"
  | "assignment-attachment"
  | "submission-attachment";

export interface UploadValidation {
  ok: boolean;
  code: string;
  message: string;
  extension?: string;
  contentType?: string;
  maxSize?: number;
  objectPrefix?: string;
}

export interface LegacyUrlStorageProvider {
  delete(url: string): Promise<void>;
  isManagedUrl(url: string): boolean;
}
