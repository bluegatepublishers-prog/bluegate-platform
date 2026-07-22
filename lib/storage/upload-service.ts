import "server-only";

import { AppError } from "../errors";
import { getStorageProvider } from "./provider";
import {
  isUploadScope,
  uploadRules,
  extensionOf,
  uploadPrefixForScope,
} from "./upload-policy";
import {
  generateObjectKey,
  normalizeAndValidateObjectKey,
} from "./object-key";
import type { UploadScope } from "./types";
import { auth } from "@/auth";
import { getLivePublisherAdminAccess } from "../publisher-admin-authorization";
import { prisma } from "../prisma";

// ============================================================================
// Types
// ============================================================================

export type UploadInitInput = {
  scope: UploadScope;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256?: string;
  targetId?: string;
};

export type UploadInitResult = {
  uploadUrl: string;
  objectKey: string;
  requiredHeaders: Record<string, string>;
  expiresAt: string; // ISO string
  expiresInSeconds: number;
};

export type UploadCompleteInput = {
  objectKey: string;
  scope: UploadScope;
  expectedContentType: string;
  expectedSizeBytes: number;
  checksumSha256?: string;
  targetId?: string;
};

export type UploadCompleteResult = {
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256?: string;
};

export type UploadAuthorization = {
  status: "AUTHORIZED";
  tenantId: string;
  scope: UploadScope;
  targetId?: string;
  userId: string;
  role: string;
  publisherId: string | null;
} | {
  status: "UNAUTHENTICATED" | "FORBIDDEN" | "DENIED";
  reasonCode?: "UNAUTHORIZED_ROLE" | "INACTIVE_PUBLISHER" | "INACTIVE_SCHOOL" | "CROSS_TENANT_TARGET" | "INVALID_SCOPE" | "UNSUPPORTED_EXTENSION" | "MIME_MISMATCH" | "ZERO_OR_OVERSIZED_FILE";
};

// ============================================================================
// Scope to Audit Target Type Mapping
// ============================================================================

export function scopeToTargetType(scope: UploadScope): "Book" | "Resource" | "School" | "Publisher" {
  if (scope.startsWith("book-")) return "Book";
  if (scope.startsWith("resource-")) return "Resource";
  if (scope === "school-logo") return "School";
  if (scope.startsWith("publisher-")) return "Publisher";
  return "Book"; // fallback
}

// ============================================================================
// Authorization
// ============================================================================

/** Roles that are explicitly denied from any upload scope. */
const EXCLUDED_ROLES = new Set(["SUPER_ADMIN", "STUDENT", "TEACHER", "PARENT", "MENTOR"]);

/**
 * Authorizes an upload request based on the authenticated user and scope.
 * Returns authorization status and tenant ID for key generation.
 */
export async function authorizeUpload(
  scope: UploadScope,
  sizeBytes: number,
  fileName: string,
  contentType: string,
  targetId?: string,
): Promise<UploadAuthorization> {
  // Validate scope
  if (!isUploadScope(scope)) {
    return { status: "DENIED", reasonCode: "INVALID_SCOPE" };
  }

  // Validate file size
  if (sizeBytes <= 0 || sizeBytes > uploadRules[scope].maxSize) {
    return { status: "DENIED", reasonCode: "ZERO_OR_OVERSIZED_FILE" };
  }

  // Validate extension
  const extension = extensionOf(fileName);
  if (!uploadRules[scope].extensions.includes(extension)) {
    return { status: "DENIED", reasonCode: "UNSUPPORTED_EXTENSION" };
  }

  // Validate MIME type
  const normalizedContentType = contentType.trim().toLowerCase();
  if (!uploadRules[scope].contentTypes.includes(normalizedContentType)) {
    return { status: "DENIED", reasonCode: "MIME_MISMATCH" };
  }

  // SCHOOL can only upload school-logo for its own school
  if (scope === "school-logo") {
    const session = await auth();
    const user = session?.user;
    if (!user?.id) {
      return { status: "UNAUTHENTICATED" };
    }
    if (user.role !== "SCHOOL") {
      return { status: "DENIED", reasonCode: "UNAUTHORIZED_ROLE" };
    }
    // Resolve the school ID from the authenticated user's school relationship
    const school = await prisma.school.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true, publisher: { select: { active: true } } },
    });
    if (!school || school.status !== "APPROVED" || !school.publisher?.active) {
      return { status: "DENIED", reasonCode: "INACTIVE_SCHOOL" };
    }
    // The tenant ID is the school ID, not the user ID
    return { status: "AUTHORIZED", tenantId: school.id, scope, userId: user.id, role: user.role, publisherId: null };
  }

  // Publisher ADMIN can upload book/resource scopes for its own active publisher
  const access = await getLivePublisherAdminAccess();
  if (access.status !== "AUTHORIZED") {
    if (access.status === "UNAUTHENTICATED") {
      return { status: "UNAUTHENTICATED" };
    }
    // Check if the user has an excluded role
    const session = await auth();
    if (session?.user?.role && EXCLUDED_ROLES.has(session.user.role)) {
      return { status: "DENIED", reasonCode: "UNAUTHORIZED_ROLE" };
    }
    return { status: "FORBIDDEN", reasonCode: "INACTIVE_PUBLISHER" };
  }

  // For book/resource scopes, verify target ownership if provided
  if (targetId) {
    const isOwned = await verifyTargetOwnership(access.actor.publisherId, scope, targetId);
    if (!isOwned) {
      return { status: "DENIED", reasonCode: "CROSS_TENANT_TARGET" };
    }
  }

  return {
    status: "AUTHORIZED",
    tenantId: access.actor.publisherId,
    scope,
    targetId,
    userId: access.actor.userId,
    role: "ADMIN",
    publisherId: access.actor.publisherId,
  };
}

// ============================================================================
// Target Ownership Verification
// ============================================================================

async function verifyTargetOwnership(
  publisherId: string,
  scope: UploadScope,
  targetId: string,
): Promise<boolean> {
  // Book-related scopes
  if (scope === "book-cover" || scope === "book-gallery" ||
      scope === "book-sample" || scope === "book-public-preview" ||
      scope === "book-full") {
    const book = await prisma.book.findUnique({
      where: { id: targetId },
      select: { publisherId: true },
    });
    return book?.publisherId === publisherId;
  }

  // Resource-related scopes
  if (scope === "resource-thumbnail" || scope === "resource-file") {
    const resource = await prisma.resource.findUnique({
      where: { id: targetId },
      select: { publisherId: true },
    });
    return resource?.publisherId === publisherId;
  }

  // Publisher branding scopes - no target verification needed
  if (scope === "publisher-logo" || scope === "publisher-favicon") {
    return true;
  }

  return false;
}

// ============================================================================
// Upload Initialization
// ============================================================================

/**
 * Initializes a presigned upload for the given scope and file.
 * Generates the object key server-side and returns the signed URL.
 */
export async function initUpload(
  input: UploadInitInput,
  authorization: { status: "AUTHORIZED"; tenantId: string; scope: UploadScope; targetId?: string },
): Promise<UploadInitResult> {
  const { scope, fileName, contentType, sizeBytes, checksumSha256 } = input;
  const { tenantId } = authorization;

  // Generate object key with server-derived tenant ID
  const prefix = uploadPrefixForScope(scope);
  const objectKey = generateObjectKey(prefix, tenantId, fileName);

  // Create signed upload URL
  const provider = getStorageProvider();
  const result = await provider.createSignedUploadUrl({
    key: objectKey,
    contentType,
    contentLength: sizeBytes,
    checksumSHA256: checksumSha256,
  });

  return {
    uploadUrl: result.url,
    objectKey: result.key,
    requiredHeaders: result.headers,
    expiresAt: result.expires.toISOString(),
    expiresInSeconds: Math.floor((result.expires.getTime() - Date.now()) / 1000),
  };
}

// ============================================================================
// Upload Completion
// ============================================================================

/**
 * Completes an upload by verifying the object exists and matches expectations.
 */
export async function completeUpload(
  input: UploadCompleteInput,
  authorization: { status: "AUTHORIZED"; tenantId: string; scope: UploadScope; targetId?: string; userId: string; role: string; publisherId: string | null },
): Promise<UploadCompleteResult> {
  const { objectKey, expectedContentType, expectedSizeBytes } = input;
  const { tenantId, scope } = authorization;

  // Normalize and validate the object key
  const normalizedKey = normalizeAndValidateObjectKey(objectKey);

  // Verify the key belongs to the authenticated tenant
  if (!keyBelongsToTenant(normalizedKey, tenantId, scope)) {
    throw new AppError({
      code: "STORAGE_ACCESS_DENIED",
      message: "Object key does not belong to the authenticated tenant.",
    });
  }

  // Head the object to verify it exists and get metadata
  const provider = getStorageProvider();
  const metadata = await provider.headObject({ key: normalizedKey });

  if (!metadata) {
    throw new AppError({
      code: "OBJECT_NOT_FOUND",
      message: "The uploaded object was not found.",
    });
  }

  // Verify content type
  const actualContentType = metadata.contentType?.trim().toLowerCase();
  if (actualContentType !== expectedContentType.trim().toLowerCase()) {
    throw new AppError({
      code: "INVALID_STORAGE_REQUEST",
      message: "Content type mismatch.",
    });
  }

  // Verify size is greater than zero
  const actualSize = metadata.contentLength ?? 0;
  if (actualSize <= 0) {
    throw new AppError({
      code: "INVALID_STORAGE_REQUEST",
      message: "Uploaded file is empty.",
    });
  }

  // Verify size does not exceed scope maximum
  const rule = uploadRules[scope];
  if (actualSize > rule.maxSize) {
    throw new AppError({
      code: "INVALID_STORAGE_REQUEST",
      message: "File size exceeds the maximum allowed for this scope.",
    });
  }

  // Verify size matches expected (exact match)
  if (actualSize !== expectedSizeBytes) {
    throw new AppError({
      code: "INVALID_STORAGE_REQUEST",
      message: "File size does not match the expected size.",
    });
  }

  // Note: Checksum verification would be done here if R2 reliably returns it
  // Currently, R2's headObject does not return checksum metadata

  return {
    objectKey: normalizedKey,
    contentType: actualContentType,
    sizeBytes: actualSize,
    // checksumSha256: metadata.checksumSha256, // Not available from R2 headObject
  };
}

// ============================================================================
// Tenant Key Validation
// ============================================================================

/**
 * Verifies that an object key belongs to the specified tenant and scope.
 * The tenant ID in the key must match the authenticated tenant.
 * Never trusts a tenant ID or prefix supplied separately by the client.
 */
export function keyBelongsToTenant(
  objectKey: string,
  tenantId: string,
  scope: UploadScope,
): boolean {
  const prefix = uploadPrefixForScope(scope);
  const expectedPrefix = `${prefix}/${tenantId}`;

  // Check that the key starts with the expected prefix
  if (!objectKey.startsWith(expectedPrefix + "/") && objectKey !== expectedPrefix) {
    return false;
  }

  // Additional safety: ensure no path traversal in the key
  if (objectKey.includes("..") || objectKey.includes("\\")) {
    return false;
  }

  return true;
}

// ============================================================================
// Error Mapping
// ============================================================================

/**
 * Maps storage errors to safe application errors.
 * Never exposes raw provider exceptions to the client.
 */
export function mapStorageError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError({
    code: "STORAGE_PROVIDER_ERROR",
    message: "An unexpected error occurred with the storage provider.",
    cause: error,
  });
}

// ============================================================================
// Input Validation
// ============================================================================

export type UploadInitRequest = {
  scope: unknown;
  fileName: unknown;
  contentType: unknown;
  sizeBytes: unknown;
  checksumSha256?: unknown;
  targetId?: unknown;
};

export function parseAndValidateUploadInit(input: UploadInitRequest): UploadInitInput | null {
  // Validate scope
  if (!isUploadScope(input.scope)) {
    return null;
  }

  // Validate fileName
  if (typeof input.fileName !== "string" || input.fileName.length === 0 || input.fileName.length > 255) {
    return null;
  }

  // Validate contentType
  if (typeof input.contentType !== "string" || !input.contentType.includes("/")) {
    return null;
  }

  // Validate sizeBytes
  if (typeof input.sizeBytes !== "number" || !Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    return null;
  }

  // Validate optional checksumSha256
  if (input.checksumSha256 !== undefined && input.checksumSha256 !== null) {
    if (typeof input.checksumSha256 !== "string") {
      return null;
    }
  }

  // Validate optional targetId
  if (input.targetId !== undefined && input.targetId !== null) {
    if (typeof input.targetId !== "string" || input.targetId.length === 0) {
      return null;
    }
  }

  return {
    scope: input.scope,
    fileName: input.fileName,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    checksumSha256: input.checksumSha256 ?? undefined,
    targetId: input.targetId ?? undefined,
  };
}

export type UploadCompleteRequest = {
  objectKey: unknown;
  scope: unknown;
  expectedContentType: unknown;
  expectedSizeBytes: unknown;
  checksumSha256?: unknown;
  targetId?: unknown;
};

export function parseAndValidateUploadComplete(input: UploadCompleteRequest): UploadCompleteInput | null {
  // Validate objectKey
  if (typeof input.objectKey !== "string" || input.objectKey.length === 0) {
    return null;
  }

  // Validate scope
  if (!isUploadScope(input.scope)) {
    return null;
  }

  // Validate expectedContentType
  if (typeof input.expectedContentType !== "string" || !input.expectedContentType.includes("/")) {
    return null;
  }

  // Validate expectedSizeBytes
  if (typeof input.expectedSizeBytes !== "number" || !Number.isInteger(input.expectedSizeBytes) || input.expectedSizeBytes <= 0) {
    return null;
  }

  // Validate optional checksumSha256
  if (input.checksumSha256 !== undefined && input.checksumSha256 !== null) {
    if (typeof input.checksumSha256 !== "string") {
      return null;
    }
  }

  // Validate optional targetId
  if (input.targetId !== undefined && input.targetId !== null) {
    if (typeof input.targetId !== "string" || input.targetId.length === 0) {
      return null;
    }
  }

  return {
    objectKey: input.objectKey,
    scope: input.scope,
    expectedContentType: input.expectedContentType,
    expectedSizeBytes: input.expectedSizeBytes,
    checksumSha256: input.checksumSha256 ?? undefined,
    targetId: input.targetId ?? undefined,
  };
}