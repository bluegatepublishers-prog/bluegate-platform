import "server-only";
import {
  DeleteObjectCommand,
  CopyObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError } from "../errors";
import { getR2Config, R2Config } from "./config-core";
import { normalizeAndValidateObjectKey } from "./object-key";
import {
  CreateSignedDownloadInput,
  CreateSignedUploadInput,
  DeleteObjectInput,
  HeadObjectInput,
  GetObjectBytesInput,
  SignedUploadResult,
  StorageObjectMetadata,
  SignedDownloadResult,
  StorageProvider,
  PutObjectInput,
  ListObjectsInput,
  ListObjectsResult,
  ReplaceObjectMetadataInput,
} from "./types";
import { createContentDisposition } from "./disposition";
import { getR2Client } from "./r2-client";

const MIN_EXPIRY_SECONDS = 1;
const MAX_EXPIRY_SECONDS = 60 * 60 * 2; // 2 hours
const DEFAULT_UPLOAD_EXPIRY_SECONDS = 60 * 10; // 10 minutes
const DEFAULT_DOWNLOAD_EXPIRY_SECONDS = 60 * 5; // 5 minutes

/**
 * Cloudflare R2 implementation of StorageProvider.
 *
 * ## Content-Length enforcement note
 *
 * A presigned PUT URL signs the Content-Type header and the checksum (if provided),
 * but it **cannot** cryptographically enforce Content-Length. The browser or client
 * can send a body of any size. Therefore:
 *  - Maximum size is **enforced before presigning** by the upload-service (scope rules).
 *  - Actual size is **verified after upload** via headObject in completeUpload().
 *  - The presigned URL's Content-Length value influences the signature but is not
 *    enforced by R2 — the client may omit or override it.
 *
 * ## Checksum support
 *
 * Cloudflare R2 supports the optional `ChecksumSHA256` parameter on PutObjectCommand.
 * When provided, R2 stores the checksum and can validate it on read. However:
 *  - R2's HeadObjectCommand does not reliably return checksum metadata in the response.
 *  - The checksum is therefore **offered at upload time** (for R2-side integrity checks)
 *    but **not verified at completion time** via headObject.
 *  - Full checksum verification at completion would require a separate GetObject + digest
 *    computation, which is not practical for large files in a request-response flow.
 */
export class R2StorageProvider implements StorageProvider {
  private readonly client = getR2Client();
  private readonly config: R2Config = getR2Config();

  private validateExpiry(expiresInSeconds: number, operation: string): void {
    if (expiresInSeconds < MIN_EXPIRY_SECONDS || expiresInSeconds > MAX_EXPIRY_SECONDS) {
      throw new AppError({
        code: "INVALID_STORAGE_REQUEST",
        message: `Expiry for ${operation} must be between ${MIN_EXPIRY_SECONDS} and ${MAX_EXPIRY_SECONDS} seconds.`,
        context: { expiresInSeconds },
      });
    }
  }

  async createSignedUploadUrl(input: CreateSignedUploadInput): Promise<SignedUploadResult> {
    const key = normalizeAndValidateObjectKey(input.key);

    if (typeof input.contentType !== "string" || !input.contentType.includes("/")) {
      throw new AppError({ code: "INVALID_STORAGE_REQUEST", message: "A valid Content-Type is required for upload." });
    }
    if (!Number.isInteger(input.contentLength) || input.contentLength <= 0) {
      throw new AppError({ code: "INVALID_STORAGE_REQUEST", message: "A positive Content-Length is required for upload." });
    }

    const expiresInSeconds = input.expiresInSeconds ?? DEFAULT_UPLOAD_EXPIRY_SECONDS;
    if (expiresInSeconds < 1 || expiresInSeconds > 7200) {
      throw new AppError({
        message: "Expiry for upload must be between 1 and 7200 seconds.",
        code: "INVALID_STORAGE_REQUEST",
      });
    }

    const sanitizedMetadata: Record<string, string> = {};
    if (input.customMetadata) {
      for (const [key, value] of Object.entries(input.customMetadata)) {
        const safeKey = key.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
        if (safeKey) {
          sanitizedMetadata[safeKey] = String(value).trim().slice(0, 512);
        }
      }
    }

    const command = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
      ContentType: input.contentType,
      ChecksumSHA256: input.checksumSHA256,
      Metadata: sanitizedMetadata,
    });

    try {
      const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
      const expires = new Date(Date.now() + expiresInSeconds * 1000);

      // The client MUST use these headers in its PUT request.
      // Content-Length is set by the browser's fetch/XHR implementation.
      return {
        url,
        method: "PUT",
        key: key,
        expires,
        headers: {
          "Content-Type": input.contentType,
        },
      };
    } catch (error) {
      throw this.handleS3Error(error, "createSignedUploadUrl", key);
    }
  }

  async createSignedDownloadUrl(input: CreateSignedDownloadInput): Promise<SignedDownloadResult> {
    const key = normalizeAndValidateObjectKey(input.key);

    const expiresInSeconds = input.expiresInSeconds ?? DEFAULT_DOWNLOAD_EXPIRY_SECONDS;
    this.validateExpiry(expiresInSeconds, "download");

    const contentDisposition = createContentDisposition(
      input.downloadFilename,
      input.disposition,
    );

    const command = new GetObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
      ResponseContentDisposition: contentDisposition,
    });

    try {
      const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
      const expires = new Date(Date.now() + expiresInSeconds * 1000);
      return { url, key: key, expires };
    } catch (error) {
      throw this.handleS3Error(error, "createSignedDownloadUrl", key);
    }
  }

  async deleteObject(input: DeleteObjectInput): Promise<void> {
    const key = normalizeAndValidateObjectKey(input.key);

    const command = new DeleteObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
    });

    try {
      await this.client.send(command);
    } catch (error) {
      // Do not fail if the object is already gone.
      throw this.handleS3Error(error, "deleteObject", key);
    }
  }

  async headObject(input: HeadObjectInput): Promise<StorageObjectMetadata | null> {
    const key = normalizeAndValidateObjectKey(input.key);

    const command = new HeadObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
    });

    try {
      const response = await this.client.send(command);
      return {
        key: key,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        eTag: response.ETag?.replace(/"/g, ""), // R2 ETag is MD5, not quoted
        lastModified: response.LastModified,
        customMetadata: response.Metadata,
      };
    } catch (error) {
      if (error instanceof S3ServiceException && (error.name === "NotFound" || error.$metadata.httpStatusCode === 404)) {
        return null;
      }
      throw this.handleS3Error(error, "headObject", key);
    }
  }

  async getObjectBytes(input: GetObjectBytesInput): Promise<Uint8Array> {
    const key = normalizeAndValidateObjectKey(input.key);
    if (!Number.isInteger(input.maxBytes) || input.maxBytes <= 0) throw new AppError({ code: "INVALID_STORAGE_REQUEST", message: "A positive read limit is required." });
    try {
      const response = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucketName, Key: key }));
      const declared = response.ContentLength ?? 0;
      if (!response.Body || declared <= 0 || declared > input.maxBytes) throw new AppError({ code: "INVALID_STORAGE_REQUEST", message: "Object exceeds the permitted inspection size." });
      const data = new Uint8Array(await response.Body.transformToByteArray());
      if (!data.byteLength || data.byteLength > input.maxBytes || data.byteLength !== declared) throw new AppError({ code: "INVALID_STORAGE_REQUEST", message: "Object could not be read safely." });
      return data;
    } catch (error) { throw error instanceof AppError ? error : this.handleS3Error(error, "getObjectBytes", key); }
  }
  async putObject(input: PutObjectInput): Promise<StorageObjectMetadata> {
    const key = normalizeAndValidateObjectKey(input.key);
    if (!input.body.byteLength) {
      throw new AppError({ code: "INVALID_STORAGE_REQUEST", message: "Cannot upload an empty object." });
    }
    try {
      await this.client.send(new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: input.customMetadata,
      }));
      const metadata = await this.headObject({ key });
      if (!metadata) throw new Error("Uploaded object could not be verified.");
      return metadata;
    } catch (error) {
      throw this.handleS3Error(error, "putObject", key);
    }
  }

  async listObjects(input: ListObjectsInput): Promise<ListObjectsResult> {
    const prefix = normalizeAndValidateObjectKey(input.prefix);
    try {
      const response = await this.client.send(new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        Prefix: prefix,
        ContinuationToken: input.continuationToken,
        MaxKeys: Math.min(Math.max(input.maxKeys ?? 500, 1), 1000),
      }));
      return {
        objects: (response.Contents ?? []).flatMap((object) => object.Key ? [{
          key: object.Key,
          contentLength: object.Size,
          eTag: object.ETag?.replace(/"/g, ""),
          lastModified: object.LastModified,
        }] : []),
        continuationToken: response.NextContinuationToken,
      };
    } catch (error) {
      throw this.handleS3Error(error, "listObjects", prefix);
    }
  }

  async replaceObjectMetadata(input: ReplaceObjectMetadataInput): Promise<StorageObjectMetadata> {
    const key = normalizeAndValidateObjectKey(input.key);
    if (!input.expectedETag.trim()) throw new AppError({ code: "INVALID_STORAGE_REQUEST", message: "Verified object identity is required." });
    const copySource = `${this.config.bucketName}/${key.split("/").map(encodeURIComponent).join("/")}`;
    try {
      await this.client.send(new CopyObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        CopySource: copySource,
        CopySourceIfMatch: `"${input.expectedETag.replaceAll('"', "")}"`,
        MetadataDirective: "REPLACE",
        Metadata: input.customMetadata,
        ContentType: input.contentType,
      }));
      const metadata = await this.headObject({ key });
      if (!metadata) throw new Error("Repaired object could not be verified.");
      return metadata;
    } catch (error) {
      throw this.handleS3Error(error, "replaceObjectMetadata", key);
    }
  }

  private handleS3Error(error: unknown, operation: string, key: string): AppError {
    const context = { operation, key };

    if (error instanceof S3ServiceException) {
      const statusCode = error.$metadata?.httpStatusCode;
      if (statusCode === 403) {
        return new AppError({
          code: "STORAGE_ACCESS_DENIED",
          message: "Storage access denied.",
          cause: error,
          context,
        });
      }
    }

    // Generic provider error for other S3/R2 issues
    return new AppError({
      code: "STORAGE_PROVIDER_ERROR",
      message: "An unexpected error occurred with the storage provider.",
      cause: error,
      context,
    });
  }
}
