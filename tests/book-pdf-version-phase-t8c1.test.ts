import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { generateObjectKey } from "@/lib/storage/object-key";
import { uploadPrefixForScope } from "@/lib/storage/upload-policy";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (relative: string) => readFileSync(root + "/" + relative, "utf8");

test("future publisher PDF associations use a unique server-generated object key", () => {
  const first = generateObjectKey(uploadPrefixForScope("book-full"), "publisher-bluegate", "book.pdf");
  const second = generateObjectKey(uploadPrefixForScope("book-full"), "publisher-bluegate", "book.pdf");

  assert.match(first, /^books\/full-books\/publisher-bluegate\/[0-9a-f-]{36}\/book\.pdf$/);
  assert.match(second, /^books\/full-books\/publisher-bluegate\/[0-9a-f-]{36}\/book\.pdf$/);
  assert.notEqual(first, second);
});

test("immutable PDF association is exact-key, page-count stable, and activation-scoped", () => {
  const source = read("lib/book-pdf-version.ts");

  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /where: \{ bookId: input\.bookId, objectKey: key \}/);
  assert.match(source, /immutable Book PDF version metadata does not match/);
  assert.match(source, /updateMany\(\{\s*where: \{ bookId: input\.bookId, active: true \}/);
  assert.match(source, /active: input\.activate === true/);
});

test("publisher PDF list is read-only and does not backfill legacy rows", () => {
  const source = read("app/admin/books/[id]/content/actions.ts");
  const start = source.indexOf("export async function listOwnedBookPdfVersionsAction");
  const end = source.indexOf("export async function restoreOwnedBookPdfVersionAction");
  assert.ok(start >= 0 && end > start);
  const listAction = source.slice(start, end);

  assert.doesNotMatch(listAction, /bookPdfVersion\.(create|update|updateMany|delete)/);
  assert.match(listAction, /bookPdfVersion\.findMany/);
});

test("validated create, update, and attach paths record immutable versions atomically", () => {
  const createRoute = read("app/api/admin/books/route.ts");
  const updateRoute = read("app/api/admin/books/[id]/route.ts");
  const attachAction = read("app/admin/books/[id]/content/actions.ts");

  assert.match(createRoute, /inspectPublisherBookPdf[\s\S]*ensureBookPdfVersion/);
  assert.match(updateRoute, /inspectPublisherBookPdf[\s\S]*ensureBookPdfVersion/);
  assert.match(attachAction, /inspectPublisherBookPdf[\s\S]*ensureBookPdfVersion/);
  assert.match(createRoute, /await ensureBookPdfVersion\(tx/);
  assert.match(updateRoute, /await ensureBookPdfVersion\(tx/);
  assert.match(attachAction, /await ensureBookPdfVersion\(tx/);
});

test("PDF cleanup protects object keys retained by immutable versions", () => {
  const files = read("lib/book-files.ts");
  const route = read("app/api/admin/books/[id]/route.ts");

  assert.match(files, /protectedObjectKeys/);
  assert.match(files, /!protectedObjectKeys\.has\(v\)/);
  assert.match(route, /bookPdfVersion\.findMany/);
  assert.match(route, /protectedObjectKeys: retainedPdfVersions\.map/);
});

test("current PDF resolver enforces publisher scope, active version identity, and page count", () => {
  const source = read("lib/book-pdf-version.ts");

  assert.match(source, /publisherId: input\.publisherId/);
  assert.match(source, /objectKey: key, active: true/);
  assert.match(source, /book: \{ publisherId: input\.publisherId \}/);
  assert.match(source, /PDF_PAGE_COUNT_MISMATCH/);
});