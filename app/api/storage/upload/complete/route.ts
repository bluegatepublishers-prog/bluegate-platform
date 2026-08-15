import "server-only";

import { NextResponse } from "next/server";
import {
  authorizeUpload,
  completeUpload,
  parseAndValidateUploadComplete,
  mapStorageError,
  scopeToTargetType,
} from "@/lib/storage/upload-service";
import { recordTrustedAuditBestEffort, accountAuditActor } from "@/lib/security-audit";
import { SecurityAuditOutcome, UserRole } from "@prisma/client";
import { auth } from "@/auth";
import type { UploadScope } from "@/lib/storage/types";

// ============================================================================
// Request/Response Types
// ============================================================================

type UploadCompleteRequestBody = {
  objectKey: unknown;
  scope: unknown;
  originalFileName: unknown;
  expectedContentType: unknown;
  expectedSizeBytes: unknown;
  checksumSha256?: unknown;
  targetId?: unknown;
};

type UploadCompleteSuccessResponse = {
  ok: true;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256?: string;
};

type UploadCompleteErrorResponse = {
  ok: false;
  code: string;
  message: string;
};

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: Request): Promise<NextResponse<UploadCompleteSuccessResponse | UploadCompleteErrorResponse>> {
  try {
    // Parse JSON safely
    let body: UploadCompleteRequestBody;
    try {
      body = await request.json();
    } catch {
      return jsonError("INVALID_JSON", "Invalid JSON payload.", 400);
    }

    // Validate input
    const input = parseAndValidateUploadComplete(body);
    if (!input) {
      return jsonError("INVALID_INPUT", "Invalid or missing required fields.", 400);
    }

    // Resolve actor for audit logging (re-read live identity)
    const session = await auth();
    const auditActor = session?.user?.id
      ? accountAuditActor({
          id: session.user.id,
          role: session.user.role as UserRole,
          publisherId: session.user.publisherId ?? null,
        })
      : null;

    const targetType = scopeToTargetType(input.scope);

    // Authorize the caller again for the complete endpoint.
    // We pass the expected filename for extension/MIME validation.
    const scope = input.scope as UploadScope;
    const authResult = await authorizeUpload(
      scope,
      input.expectedSizeBytes,
      input.originalFileName,
      input.expectedContentType,
      input.targetId,
    );

    // Handle authorization failures
    if (authResult.status !== "AUTHORIZED") {
      // Record denied audit for storage.upload.complete
      if (auditActor) {
        recordTrustedAuditBestEffort({
          actor: auditActor,
          action: "storage.upload.complete",
          targetType,
          outcome: SecurityAuditOutcome.DENIED,
          reasonCode: "AUTHORIZATION_DENIED",
          metadata: { scope: input.scope, fileOperation: "complete" },
        });
      }

      if (authResult.status === "UNAUTHENTICATED") {
        return jsonError("UNAUTHENTICATED", "Authentication required.", 401);
      }
      return jsonError("FORBIDDEN", "Access denied.", 403);
    }

    // Complete the upload verification
    const result = await completeUpload(input, authResult);

    // Record success audit
    if (auditActor) {
      recordTrustedAuditBestEffort({
        actor: auditActor,
        action: "storage.upload.complete",
        targetType,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { scope: input.scope, fileOperation: "complete" },
      });
    }

    return NextResponse.json<UploadCompleteSuccessResponse>(
      {
        ok: true,
        objectKey: result.objectKey,
        contentType: result.contentType,
        sizeBytes: result.sizeBytes,
        checksumSha256: result.checksumSha256,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const appError = mapStorageError(error);

    // Record failure audit
    const session = await auth();
    if (session?.user?.id) {
      recordTrustedAuditBestEffort({
        actor: accountAuditActor({
          id: session.user.id,
          role: session.user.role as UserRole,
          publisherId: session.user.publisherId ?? null,
        }),
        action: "storage.upload.complete",
        targetType: "Book",
        outcome: SecurityAuditOutcome.FAILURE,
        reasonCode: "UNEXPECTED_FAILURE",
      });
    }

    // Map error codes to appropriate HTTP status
    let status = 500;
    if (appError.code === "OBJECT_NOT_FOUND") {
      status = 404;
    } else if (appError.code === "STORAGE_ACCESS_DENIED" || appError.code === "INVALID_OBJECT_KEY") {
      status = 400;
    } else if (appError.code === "INVALID_STORAGE_REQUEST") {
      status = 400;
    }

    return jsonError(
      appError.code,
      safeStorageErrorMessage(appError),
      status,
    );
  }
}

// ============================================================================
// Helpers
// ============================================================================

function jsonError(code: string, message: string, status: number): NextResponse<UploadCompleteErrorResponse> {
  return NextResponse.json(
    { ok: false, code, message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function safeStorageErrorMessage(error: { code: string; message: string }) {
  return error.code === "STORAGE_PROVIDER_ERROR"
    ? "Storage upload failed. Retry the upload."
    : error.message;
}
