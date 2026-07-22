import "server-only";

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { safeByteRange, storageDeliveryError, storageDeliveryHeaders } from "./storage-delivery-policy";

type DeliveryInput = {
  request: Request;
  url: string;
  filename: string;
  disposition: "attachment" | "inline";
  expectedContentType?: string;
  cacheControl: string;
};

const NO_STORE = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function proxyRemoteStorage(input: DeliveryInput) {
  const range = safeByteRange(input.request.headers.get("range"));
  const source = await fetch(input.url, { redirect: "error", headers: range ? { Range: range } : undefined }).catch(() => null);
  if (!source) return NextResponse.json({ message: storageDeliveryError(503) }, { status: 503, headers: NO_STORE });
  if (!source.ok || !source.body) {
    const status = source.status === 401 || source.status === 403 || source.status === 404 || source.status === 416 ? source.status : 502;
    return NextResponse.json({ message: storageDeliveryError(status) }, { status, headers: NO_STORE });
  }
  const contentType = input.expectedContentType || source.headers.get("content-type")?.split(";")[0] || "application/octet-stream";
  return new NextResponse(source.body, {
    status: source.status === 206 ? 206 : 200,
    headers: storageDeliveryHeaders({
      contentType,
      filename: input.filename,
      disposition: input.disposition,
      cacheControl: input.cacheControl,
      contentLength: source.headers.get("content-length"),
      contentRange: source.headers.get("content-range"),
      eTag: source.headers.get("etag"),
    }),
  });
}

export async function serveLocalUpload(input: Omit<DeliveryInput, "url"> & { storedPath: string }) {
  if (!input.storedPath.startsWith("/uploads/") || input.storedPath.includes("..") || input.storedPath.includes("\\")) {
    return NextResponse.json({ message: "File unavailable." }, { status: 409, headers: NO_STORE });
  }
  const publicRoot = path.resolve(process.cwd(), "public");
  const filePath = path.resolve(publicRoot, `.${input.storedPath}`);
  if (!filePath.startsWith(`${path.join(publicRoot, "uploads")}${path.sep}`)) return NextResponse.json({ message: "File unavailable." }, { status: 409, headers: NO_STORE });
  const details = await stat(filePath).catch(() => null);
  if (!details?.isFile()) return NextResponse.json({ message: "File not found." }, { status: 404, headers: NO_STORE });
  const parsed = parseSingleRange(safeByteRange(input.request.headers.get("range")), details.size);
  if (parsed === "INVALID") return new NextResponse(null, { status: 416, headers: { ...NO_STORE, "Accept-Ranges": "bytes", "Content-Range": `bytes */${details.size}` } });
  const start = parsed?.start ?? 0;
  const end = parsed?.end ?? details.size - 1;
  const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream<Uint8Array>;
  return new NextResponse(stream, {
    status: parsed ? 206 : 200,
    headers: storageDeliveryHeaders({
      contentType: input.expectedContentType || "application/octet-stream",
      filename: input.filename,
      disposition: input.disposition,
      cacheControl: input.cacheControl,
      contentLength: String(end - start + 1),
      contentRange: parsed ? `bytes ${start}-${end}/${details.size}` : null,
    }),
  });
}

function parseSingleRange(range: string | null, size: number): { start: number; end: number } | "INVALID" | null {
  if (!range) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) return "INVALID";
  let start = match[1] ? Number(match[1]) : NaN;
  let end = match[2] ? Number(match[2]) : NaN;
  if (Number.isNaN(start) && Number.isNaN(end)) return "INVALID";
  if (Number.isNaN(start)) { const suffix = end; start = Math.max(0, size - suffix); end = size - 1; }
  else if (Number.isNaN(end)) end = size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size) return "INVALID";
  return { start, end: Math.min(end, size - 1) };
}
