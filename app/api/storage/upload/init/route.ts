import "server-only";

import { NextResponse } from "next/server";
import {
  authorizeUpload,
  initUpload,
  parseAndValidateUploadInit,
  mapStorageError,
  scopeToTargetType,
} from "@/lib/storage/upload-service";
import { recordTrustedAuditBestEffort, accountAuditActor } from "@/lib/security-audit";
import { SecurityAuditOutcome, UserRole } from "@prisma/client";
import { auth } from "@/auth";

// ============================================================================
// Request/Response Types
// ============================================================================

type UploadInitRequestBody = {
  scope: unknown;
  fileName: unknown;
  contentType: unknown;
  sizeBytes: unknown;
  checksumSha256?: unknown;
  targetId?: unknown;
};

type UploadInitSuccessResponse = {
  ok: true;
  uploadUrl: string;
  objectKey: string;
  requiredHeaders: Record<string, string>;
  expiresAt: string;
  expiresInSeconds: number;
  uploadToken: string;
};

type UploadInitErrorResponse = {
  ok: false;
  code: string;
  message: string;
};

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: Request): Promise<NextResponse<UploadInitSuccessResponse | UploadInitErrorResponse>> {
  try {
    // Parse JSON safely
    let body: UploadInitRequestBody;
    try {
      body = await request.json();
    } catch {
      return jsonError("INVALID_JSON", "Invalid JSON payload.", 400);
    }

    // Validate input
    const input = parseAndValidateUploadInit(body);
    if (!input) {
      return jsonError("INVALID_INPUT", "Invalid or missing required fields.", 400);
    }

    // Authorize the request
    const authResult = await authorizeUpload(
      input.scope,
      input.sizeBytes,
      input.fileName,
      input.contentType,
      input.targetId,
    );

    // Resolve actor for audit logging
    const session = await auth();
    const auditActor = session?.user?.id
      ? accountAuditActor({
          id: session.user.id,
          role: session.user.role as UserRole,
          publisherId: session.user.publisherId ?? null,
        })
      : null;

    const targetType = scopeToTargetType(input.scope);

    // Handle authorization failures
    if (authResult.status !== "AUTHORIZED") {
      // Record denied audit
      if (auditActor) {
        recordTrustedAuditBestEffort({
          actor: auditActor,
          action: "storage.upload.init",
          targetType,
          outcome: SecurityAuditOutcome.DENIED,
          reasonCode: "AUTHORIZATION_DENIED",
          metadata: { scope: input.scope, fileOperation: "init" },
        });
      }

      if (authResult.status === "UNAUTHENTICATED") {
        return jsonError("UNAUTHENTICATED", "Authentication required.", 401);
      }
      return jsonError("FORBIDDEN", "Access denied.", 403);
    }

    // Initialize the upload
    const result = await initUpload(input, authResult);

    // Record success audit
    if (auditActor) {
      recordTrustedAuditBestEffort({
        actor: auditActor,
        action: "storage.upload.init",
        targetType,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { scope: input.scope, fileOperation: "init" },
      });
    }

    return NextResponse.json<UploadInitSuccessResponse>(
      {
        ok: true,
        uploadUrl: result.uploadUrl,
        objectKey: result.objectKey,
        requiredHeaders: result.requiredHeaders,
        expiresAt: result.expiresAt,
        expiresInSeconds: result.expiresInSeconds,
        uploadToken: result.uploadToken,
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
        action: "storage.upload.init",
        targetType: "Book",
        outcome: SecurityAuditOutcome.FAILURE,
        reasonCode: "UNEXPECTED_FAILURE",
      });
    }

    return jsonError(
      appError.code,
      safeStorageErrorMessage(appError),
      500,
    );
  }
}

// ============================================================================
// Helpers
// ============================================================================

function jsonError(code: string, message: string, status: number): NextResponse<UploadInitErrorResponse> {
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
