# Phase 9.1: Enterprise Storage Foundation

This document outlines the infrastructure for Bluegate's provider-neutral storage service, with Cloudflare R2 as the first implementation.

## Core Concepts

- **Private by Default**: All files are stored in a private R2 bucket. Public access is never granted directly to objects.
- **Signed URLs**: All uploads and downloads are authorized on-demand by the application backend, which generates short-lived, secure, pre-signed URLs. This is the primary security model.
- **Provider-Neutral Contract**: The application interacts with a generic `StorageProvider` interface (`lib/storage/types.ts`). This decouples application logic from Cloudflare R2 (or any future provider like S3).
- **Server-Side Authority**: All operations involving credentials, URL signing, and policy enforcement are strictly confined to the server using Next.js's `"server-only"` directive.

## Environment Configuration

The following server-only environment variables must be configured. For local development, use `.env.local`. For Vercel deployments, set these in the project's Environment Variables settings for Preview and Production environments.

**Required:**

- `R2_ACCOUNT_ID`: Your Cloudflare account ID.
- `R2_BUCKET_NAME`: The name of your private R2 bucket.
- `R2_ACCESS_KEY_ID`: The access key for an R2 API token.
- `R2_SECRET_ACCESS_KEY`: The secret for the R2 API token.
- `R2_ENDPOINT`: The full R2 S3 API endpoint for your account, e.g., `https://<account_id>.r2.cloudflarestorage.com`.

**Optional:**

- `R2_PUBLIC_BASE_URL`: If you have a custom domain configured for R2, this can be used for public access (though not required by this phase).

**Security Note:** Never commit these secrets to Git. Use Vercel's secrets management for production.

## Direct Browser Uploads (Future)

This phase establishes the foundation for direct browser uploads, which will be implemented in a later phase. To enable this, the R2 bucket will require a CORS policy that allows `PUT` requests from the application's domain. This policy will be added when the upload UI is built.

## Current Status (Phase 9.1)

- No UI for uploads has been built.
- No database models (`MediaAsset`) or migrations have been created.
- Existing book/resource files have not been migrated from Vercel Blob.
- All authorization logic must occur in the application backend **before** a signed URL is issued. The storage service itself does not handle user roles or permissions.

---

# Phase 9.2.1: R2 Presigned Upload API

## Overview

Phase 9.2.1 implements the server-side API for direct browser-to-R2 uploads using presigned URLs. It provides two endpoints — upload initialization and upload completion — backed by a shared business-logic service.

## New Endpoints

### POST /api/storage/upload/init

Initializes a presigned upload and returns the URL the browser can use to PUT the file directly to R2.

**Request body (JSON):**

```json
{
  "scope": "book-cover",
  "fileName": "cover-image.jpg",
  "contentType": "image/jpeg",
  "sizeBytes": 1048576,
  "checksumSha256": "base64-encoded-sha256 (optional)",
  "targetId": "book-uuid (optional)"
}
```

**Success response (200):**

```json
{
  "ok": true,
  "uploadUrl": "https://r2.example.com/presigned-url...",
  "objectKey": "books/covers/pub-123/uuid/cover-image.jpg",
  "requiredHeaders": { "Content-Type": "image/jpeg" },
  "expiresAt": "2026-07-22T12:00:00.000Z",
  "expiresInSeconds": 599
}
```

**Error responses:**
- `400` — `INVALID_JSON`, `INVALID_INPUT`
- `401` — `UNAUTHENTICATED`
- `403` — `FORBIDDEN`
- `500` — `STORAGE_PROVIDER_ERROR` (sanitized)

### POST /api/storage/upload/complete

Verifies that an uploaded object exists in R2 and matches the expected properties.

**Request body (JSON):**

```json
{
  "objectKey": "books/covers/pub-123/uuid/cover-image.jpg",
  "scope": "book-cover",
  "expectedContentType": "image/jpeg",
  "expectedSizeBytes": 1048576,
  "checksumSha256": "base64-encoded-sha256 (optional)",
  "targetId": "book-uuid (optional)"
}
```

**Success response (200):**

```json
{
  "ok": true,
  "objectKey": "books/covers/pub-123/uuid/cover-image.jpg",
  "contentType": "image/jpeg",
  "sizeBytes": 1048576,
  "checksumSha256": "base64-encoded-sha256 (if available)"
}
```

**Error responses:**
- `400` — `INVALID_JSON`, `INVALID_INPUT`, `INVALID_STORAGE_REQUEST`, `STORAGE_ACCESS_DENIED`, `INVALID_OBJECT_KEY`
- `401` — `UNAUTHENTICATED`
- `403` — `FORBIDDEN`
- `404` — `OBJECT_NOT_FOUND`
- `500` — `STORAGE_PROVIDER_ERROR` (sanitized)

## Authorization Rules

| Role | Allowed Scopes | Notes |
|------|---------------|-------|
| SCHOOL | `school-logo` | Only for its own school. School must be APPROVED with active publisher. |
| ADMIN (Publisher) | `book-*`, `resource-*`, `publisher-*` | Only for its own active publisher. Target ownership verified when `targetId` provided. |
| SUPER_ADMIN | None | Explicitly denied. |
| STUDENT | None | Explicitly denied. |
| TEACHER | None | Explicitly denied. |
| PARENT | None | Explicitly denied. |
| MENTOR | None | Explicitly denied. |

## Request/Response Shapes

All endpoints accept and return JSON. Responses include `Cache-Control: no-store`. Error responses always include `ok: false` with a `code` and `message`.

## Size Enforcement Limitation

A presigned PUT URL signs the `Content-Type` header and the optional `ChecksumSHA256`, but it **cannot** cryptographically enforce `Content-Length`. The browser or client can send a body of any size. Therefore:

1. **Maximum size is enforced before presigning** by the upload service (scope rules in `upload-policy.ts`).
2. **Actual size is verified after upload** via `headObject` in `completeUpload()`.

The presigned URL's `contentLength` parameter influences the AWS signature but is not enforced by R2 — the client may omit or override it.

## Completion Verification

The `completeUpload` function performs these checks after the browser uploads the file:

1. Object key is normalized and validated (no traversal, no URLs, no control characters).
2. Object key belongs to the authenticated tenant (prefix + tenant ID match).
3. Object exists in R2 (`headObject` returns non-null).
4. Actual content type matches the expected type (case-insensitive).
5. Actual size is greater than zero.
6. Actual size does not exceed the scope maximum.
7. Actual size matches `expectedSizeBytes` exactly.

Checksum verification at completion is **not implemented** because R2's `HeadObjectCommand` does not reliably return checksum metadata. The checksum is offered at upload time for R2-side integrity checks but cannot be verified at completion via headObject alone.

## Legacy Compatibility

- `app/api/upload/route.ts` remains unchanged and continues to work for existing Vercel Blob flows.
- `@vercel/blob` is not removed.
- Existing stored URLs are not altered.
- Current book/resource mutation behavior is not changed.
- The new API is not the default UI path.

## Remaining Phase 9.2.2 Work

- Build the client-side upload UI components.
- Integrate the init/complete endpoints into book and resource forms.
- Add database fields to store the R2 object key on Book and Resource records.
- Migrate existing Vercel Blob URLs to R2 object keys.
- Add CORS policy to the R2 bucket for the application domain.
- Add rate limiting to the upload endpoints (no existing rate limiter was found in the codebase; a new Prisma model would be needed).