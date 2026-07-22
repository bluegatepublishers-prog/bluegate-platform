import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
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
  SignedUploadResult,
  StorageObjectMetadata,
  SignedDownloadResult,
  StorageProvider,
} from "./types";
import { createContentDisposition } from "./disposition";
import { getR2Client } from "./r2-client";

const MIN_EXPIRY_SECONDS = 1;
const MAX_EXPIRY_SECONDS = 60 * 60 * 2; // 2 hours
const DEFAULT_UPLOAD_EXPIRY_SECONDS = 60 * 10; // 10 minutes
const DEFAULT_DOWNLOAD_EXPIRY_SECONDS = 60 * 5; // 5 minutes

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

    const contentDisposition = createContentDisposition(input.downloadFilename);

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