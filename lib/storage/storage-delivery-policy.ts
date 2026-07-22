import { createContentDisposition } from "./disposition";

export type StorageDeliveryHeaderInput = {
  contentType: string;
  filename: string;
  disposition: "attachment" | "inline";
  cacheControl: string;
  contentLength?: string | null;
  contentRange?: string | null;
  eTag?: string | null;
};

export function safeByteRange(value: string | null) {
  return value && /^bytes=\d*-\d*(?:,\d*-\d*)*$/.test(value) ? value : null;
}

export function storageDeliveryHeaders(input: StorageDeliveryHeaderInput) {
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": input.cacheControl,
    "Content-Disposition": createContentDisposition(input.filename, input.disposition),
    "Content-Type": input.contentType,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  if (input.contentLength) headers.set("Content-Length", input.contentLength);
  if (input.contentRange) headers.set("Content-Range", input.contentRange);
  if (input.eTag) headers.set("ETag", input.eTag);
  return headers;
}

export function storageDeliveryError(status: number) {
  if (status === 401 || status === 403) return "Access denied.";
  if (status === 404) return "File not found.";
  if (status === 416) return "The requested file range is unavailable.";
  return "The file is temporarily unavailable. Request a fresh link and try again.";
}
