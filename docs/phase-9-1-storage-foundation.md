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