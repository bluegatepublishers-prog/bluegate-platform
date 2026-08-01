import type { UserRole } from "@prisma/client";
import { getResourceFileName } from "@/lib/resource-helpers";
import { normalizeAndValidateObjectKey } from "./object-key";
import { isPublisherUploadUrl, uploadPrefixForScope } from "./upload-policy";

const RESOURCE_ID = /^[A-Za-z0-9_-]{1,191}$/;

export type ProtectedDownloadRole = Extract<
  UserRole,
  "ADMIN" | "TEACHER" | "SCHOOL" | "STUDENT" | "MENTOR" | "SUPER_ADMIN"
>;

export type ProtectedDownloadResult =
  | { ok: true; url: string; expiresAt: string | null; legacy: boolean }
  | {
      ok: false;
      status: 401 | 403 | 404 | 409 | 500;
      code:
        | "UNAUTHENTICATED"
        | "FORBIDDEN"
        | "RESOURCE_NOT_FOUND"
        | "INVALID_RESOURCE_STATE"
        | "STORAGE_SIGNING_FAILED";
      message: string;
    };

export interface LiveDownloadUser {
  id: string;
  role: UserRole;
  active: boolean;
  eligible: boolean;
  publisherId: string | null;
}

export interface ProtectedDownloadResource {
  id: string;
  publisherId: string | null;
  title: string;
  fileUrl: string;
  originalFileName?: string | null;
  published: boolean;
}

export interface AuthorizedProtectedResource {
  resource: ProtectedDownloadResource;
  history?: { kind: "TEACHER" | "STUDENT" | "MENTOR"; actorId: string };
}

export interface ProtectedDownloadAuditInput {
  actor: LiveDownloadUser;
  outcome: "DENIED" | "FAILURE";
  reasonCode:
    | "AUTHORIZATION_DENIED"
    | "TARGET_NOT_FOUND"
    | "INVALID_STATE"
    | "UNEXPECTED_FAILURE"
    | "VALIDATION_FAILED";
  scope: string;
}

export interface ProtectedDownloadDependencies {
  getSessionUser(): Promise<{ id?: string; role?: string } | null>;
  findLiveUser(userId: string): Promise<LiveDownloadUser | null>;
  authorizeResource(
    user: LiveDownloadUser,
    resourceId: string,
  ): Promise<AuthorizedProtectedResource | null>;
  headObject(key: string): Promise<boolean>;
  signObject(input: {
    key: string;
    filename: string;
    disposition: "attachment" | "inline";
  }): Promise<{ url: string; expiresAt: string }>;
  persistSuccess(input: {
    actor: LiveDownloadUser;
    resource: ProtectedDownloadResource;
    history?: AuthorizedProtectedResource["history"];
    scope: string;
  }): Promise<void>;
  recordAudit(input: ProtectedDownloadAuditInput): Promise<void>;
  recordRetry?(input: { actor: LiveDownloadUser; scope: string; attempt: number }): Promise<void>;
}

const STORAGE_ATTEMPTS = 2;
const STORAGE_TIMEOUT_MS = 5_000;

async function reliableStorageCall<T>(operation: () => Promise<T>, onRetry: (attempt: number) => Promise<void>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= STORAGE_ATTEMPTS; attempt += 1) {
    try {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          operation(),
          new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("Storage operation timed out.")), STORAGE_TIMEOUT_MS); }),
        ]);
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    } catch (error) {
      lastError = error;
      if (attempt < STORAGE_ATTEMPTS) await onRetry(attempt + 1);
    }
  }
  throw lastError;
}

export async function prepareProtectedResourceDownloadWithDependencies(
  input: {
    resourceId: string;
    allowedRoles: readonly ProtectedDownloadRole[];
    disposition?: "attachment" | "inline";
  },
  dependencies: ProtectedDownloadDependencies,
): Promise<ProtectedDownloadResult> {
  const sessionUser = await dependencies.getSessionUser();
  if (!sessionUser?.id) return failure(401, "UNAUTHENTICATED", "Authentication required.");

  const actor = await dependencies.findLiveUser(sessionUser.id);
  if (!actor || actor.id !== sessionUser.id || actor.role !== sessionUser.role) {
    return failure(403, "FORBIDDEN", "Access denied.");
  }

  const scope = actor.role.toLowerCase();
  if (
    !actor.active ||
    !actor.eligible ||
    !input.allowedRoles.includes(actor.role as ProtectedDownloadRole) ||
    actor.role === "SUPER_ADMIN"
  ) {
    await dependencies.recordAudit({ actor, outcome: "DENIED", reasonCode: "AUTHORIZATION_DENIED", scope });
    return failure(403, "FORBIDDEN", "Access denied.");
  }

  if (!RESOURCE_ID.test(input.resourceId)) {
    await dependencies.recordAudit({ actor, outcome: "DENIED", reasonCode: "VALIDATION_FAILED", scope });
    return failure(404, "RESOURCE_NOT_FOUND", "Resource not found.");
  }

  const authorized = await dependencies.authorizeResource(actor, input.resourceId);
  if (
    !authorized ||
    !authorized.resource.published ||
    !authorized.resource.publisherId ||
    authorized.resource.publisherId !== actor.publisherId
  ) {
    await dependencies.recordAudit({ actor, outcome: "DENIED", reasonCode: "TARGET_NOT_FOUND", scope });
    return failure(404, "RESOURCE_NOT_FOUND", "Resource not found.");
  }

  const { resource } = authorized;
  const filename = getResourceFileName({
    originalFileName: resource.originalFileName,
    fileUrl: resource.fileUrl,
  });

  let url: string;
  let expiresAt: string | null = null;
  let legacy = false;
  try {
    const target = resolveProtectedStorageTarget(resource.fileUrl, resource.publisherId!);
    if (target.kind === "LEGACY_URL") {
      url = target.url;
      legacy = true;
    } else {
      if (!(await reliableStorageCall(() => dependencies.headObject(target.key), attempt => dependencies.recordRetry?.({ actor, scope, attempt }) ?? Promise.resolve()))) {
        await dependencies.recordAudit({ actor, outcome: "DENIED", reasonCode: "TARGET_NOT_FOUND", scope });
        return failure(404, "RESOURCE_NOT_FOUND", "Resource not found.");
      }
      const signed = await reliableStorageCall(() => dependencies.signObject({
        key: target.key,
        filename,
        disposition: input.disposition ?? "attachment",
      }), attempt => dependencies.recordRetry?.({ actor, scope, attempt }) ?? Promise.resolve());
      url = signed.url;
      expiresAt = signed.expiresAt;
    }
  } catch (error) {
    const invalidState = error instanceof InvalidProtectedResourceStateError;
    await dependencies.recordAudit({
      actor,
      outcome: invalidState ? "DENIED" : "FAILURE",
      reasonCode: invalidState ? "INVALID_STATE" : "UNEXPECTED_FAILURE",
      scope,
    });
    return invalidState
      ? failure(409, "INVALID_RESOURCE_STATE", "Resource file is unavailable.")
      : failure(500, "STORAGE_SIGNING_FAILED", "Could not prepare the resource file.");
  }

  try {
    await dependencies.persistSuccess({ actor, resource, history: authorized.history, scope });
  } catch {
    await dependencies.recordAudit({ actor, outcome: "FAILURE", reasonCode: "UNEXPECTED_FAILURE", scope });
    return failure(500, "STORAGE_SIGNING_FAILED", "Could not prepare the resource file.");
  }

  return { ok: true, url, expiresAt, legacy };
}

class InvalidProtectedResourceStateError extends Error {}

export function resolveProtectedStorageTarget(
  storedValue: string,
  publisherId: string,
): { kind: "OBJECT_KEY"; key: string } | { kind: "LEGACY_URL"; url: string } {
  if (storedValue.trim() && isPublisherUploadUrl(storedValue, publisherId, ["resource-file"])) {
    return { kind: "LEGACY_URL", url: storedValue };
  }
  let key: string;
  try {
    key = normalizeAndValidateObjectKey(storedValue);
  } catch {
    throw new InvalidProtectedResourceStateError();
  }
  const prefix = `${uploadPrefixForScope("resource-file")}/${publisherId}/`;
  if (!key.startsWith(prefix)) throw new InvalidProtectedResourceStateError();
  return { kind: "OBJECT_KEY", key };
}

function failure(
  status: 401 | 403 | 404 | 409 | 500,
  code: Extract<ProtectedDownloadResult, { ok: false }>["code"],
  message: string,
): ProtectedDownloadResult {
  return { ok: false, status, code, message };
}
