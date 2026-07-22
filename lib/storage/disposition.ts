/**
 * Creates a safe `Content-Disposition` header value.
 * Includes a UTF-8 fallback for modern browsers, as per RFC 5987.
 *
 * @param filename The desired filename.
 * @returns A formatted string suitable for the Content-Disposition header.
 */
export function createContentDisposition(filename: string | undefined): string {
  if (!filename) {
    return 'attachment; filename="download"';
  }

  // 1. Sanitize for the simple `filename` parameter (ASCII fallback)
  // Remove quotes, control characters, path separators, and other unsafe characters.
  const sanitizedAscii = filename.replace(/["\r\n\t\x00-\x1F\x7F/:<>?\\|]/g, "_").slice(0, 255);

  // 2. Create the RFC 5987 `filename*` parameter for Unicode support.
  const encodedUtf8 = encodeURIComponent(filename).replace(/'/g, "%27");

  // Combine both, with the UTF-8 version preferred by browsers that support it.
  return `attachment; filename="${sanitizedAscii}"; filename*=UTF-8''${encodedUtf8}`;
}