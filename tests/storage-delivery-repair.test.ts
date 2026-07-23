import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { bookCoverPath, bookPreviewPath } from "../lib/storage/book-asset-path";
import { safeByteRange, storageDeliveryError, storageDeliveryHeaders } from "../lib/storage/storage-delivery-policy";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("R2 keys and legacy local book assets resolve to same-origin routes", () => {
  assert.equal(bookPreviewPath("book 1", "books/public-previews/publisher/file.pdf"), "/api/books/book%201/asset/preview");
  assert.equal(bookCoverPath("book 1", "books/covers/publisher/file.jpg"), "/api/books/book%201/asset/cover");
  assert.equal(bookPreviewPath("legacy", "/uploads/legacy.pdf"), "/api/books/legacy/asset/preview");
  assert.equal(bookCoverPath("legacy", "/uploads/legacy.jpg"), "/api/books/legacy/asset/cover");
});

test("featured books use the cover resolver and placeholder fallback", () => {
  const featured = source("components/home/FeaturedBooks.tsx");
  assert.match(featured, /bookCoverPath/);
  assert.match(featured, /resolveCoverSrc/);
  assert.match(featured, /\/images\/book-placeholder\.jpg/);
});

test("PDF delivery headers support inline viewers and byte ranges", () => {
  const headers = storageDeliveryHeaders({
    contentType: "application/pdf",
    filename: "Preview.pdf",
    disposition: "inline",
    cacheControl: "private, no-store",
    contentLength: "1",
    contentRange: "bytes 0-0/100",
  });
  assert.equal(headers.get("content-type"), "application/pdf");
  assert.match(headers.get("content-disposition") || "", /^inline;/);
  assert.equal(headers.get("cache-control"), "private, no-store");
  assert.equal(headers.get("accept-ranges"), "bytes");
  assert.equal(headers.get("content-range"), "bytes 0-0/100");
  assert.equal(safeByteRange("bytes=0-0"), "bytes=0-0");
  assert.equal(safeByteRange("items=0-1"), null);
});

test("delivery errors distinguish denied, missing, and expired/unavailable objects", () => {
  assert.equal(storageDeliveryError(403), "Access denied.");
  assert.equal(storageDeliveryError(404), "File not found.");
  assert.match(storageDeliveryError(503), /fresh link/);
});

test("public preview route enforces publication and streams R2 or local storage", () => {
  const route = source("app/api/books/[bookId]/asset/[kind]/route.ts");
  assert.match(route, /if \(!book\.published\)/);
  assert.match(route, /getLivePublisherAdminAccess/);
  assert.match(route, /serveLocalUpload/);
  assert.match(route, /proxyRemoteStorage/);
  assert.match(route, /expectedContentType: contentType/);
  assert.doesNotMatch(route, /NextResponse\.redirect/);
});

test("private full PDF route authorizes before resolving and never exposes a signed redirect", () => {
  const route = source("app/api/books/[bookId]/full-pdf/route.ts");
  const authorization = route.indexOf("getBookEntitlementForAuthenticatedUser");
  const signing = route.indexOf("createSignedDownloadUrl");
  assert.ok(authorization >= 0 && signing > authorization);
  assert.match(route, /proxyRemoteStorage/);
  assert.match(route, /serveLocalUpload/);
  assert.match(route, /expectedContentType: "application\/pdf"/);
  assert.doesNotMatch(route, /NextResponse\.redirect/);
});

test("preview component exposes loading, denied, missing, expired-link, and retry states", () => {
  const frame = source("components/books/PdfPreviewFrame.tsx");
  for (const text of ["Loading PDF preview", "do not have access", "not available", "link expired", "Request a fresh link"]) {
    assert.ok(frame.includes(text));
  }
  assert.match(frame, /Range: "bytes=0-0"/);
});
