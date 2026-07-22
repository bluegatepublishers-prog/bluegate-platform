import { randomUUID } from "node:crypto";
import { AppError } from "../errors";

const FORBIDDEN_CHARS_REGEX = /[\x00-\x1F\x7F]/;

/**
 * Normalizes and validates a string to ensure it is a safe object key.
 * This is a critical security function.
 *
 * - Trims whitespace.
 * - Normalizes backslashes to forward slashes.
 * - Collapses multiple slashes.
 * - Rejects empty keys, absolute paths, drive letters, `.` and `..` segments,
 *   query strings, fragments, control characters, and full URLs.
 *
 * @returns The normalized, safe object key.
 * @throws {AppError} if the key is invalid.
 */
export function normalizeAndValidateObjectKey(key: string): string {
  if (typeof key !== "string") {
    throw new AppError({ code: "INVALID_OBJECT_KEY", message: "Object key must be a string." });
  }

  // Check for Windows drive paths BEFORE URL check, since "C:" looks like a protocol
  const normalized = key.trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/");

  if (normalized === "" || normalized === "." || normalized === "..") {
    throw new AppError({ code: "INVALID_OBJECT_KEY", message: "Object key cannot be empty or a dot segment." });
  }
  if (normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized)) {
    throw new AppError({ code: "INVALID_OBJECT_KEY", message: "Object key cannot be an absolute path." });
  }

  try {
    new URL(key);
    throw new AppError({ code: "INVALID_OBJECT_KEY", message: "Object key cannot be a URL." });
  } catch (e) {
    if (e instanceof AppError) throw e;
    // Expected if not a URL.
  }
  if (normalized.includes("?") || normalized.includes("#")) {
    throw new AppError({ code: "INVALID_OBJECT_KEY", message: "Object key cannot contain query strings or fragments." });
  }
  if (FORBIDDEN_CHARS_REGEX.test(normalized)) {
    throw new AppError({ code: "INVALID_OBJECT_KEY", message: "Object key cannot contain control characters." });
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new AppError({ code: "INVALID_OBJECT_KEY", message: "Object key cannot contain dot segments." });
  }

  return normalized;
}

/**
 * Sanitizes a filename to be safely used as part of an object key or in a Content-Disposition header.
 * Replaces unsafe characters with an underscore.
 */
export function sanitizeFilenameForHeader(filename: string): string {
  // biome-ignore lint/suspicious/noControlCharacters: intended to find and replace control characters
  return filename.replace(/[\x00-\x1f\x7f"*/:<>?\\|]/g, "_");
}

/**
 * Generates a safe, unique object key for a new file.
 * Format: {prefix}/{tenantId}/{uuid}/{sanitized-stem}.{ext}
 */
export function generateObjectKey(prefix: string, tenantId: string, originalFilename: string): string {
  const sanitizedPrefix = prefix.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
  const sanitizedTenantId = tenantId.replace(/[^a-z0-9-.]/gi, "_");

  const parts = originalFilename.split(".");
  const extension = parts.length > 1 ? parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const stem = parts.join(".").replace(/[^a-z0-9-._]/gi, "_").slice(0, 100) || "file";

  const uuid = randomUUID();

  const key = `${sanitizedPrefix}/${sanitizedTenantId}/${uuid}/${stem}${extension ? `.${extension}` : ""}`;
  return normalizeAndValidateObjectKey(key);
}