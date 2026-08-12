import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("lib/book-pdf-v2-import.ts", "utf8");

test("owned-book PDF import authorizes ownership and resolves storage only on the server", () => {
  assert.match(source, /import "server-only"/);
  assert.match(source, /requireLivePublisherAdmin\(\)/);
  assert.match(source, /findFirst\(\{ where: \{ id: bookId, publisherId: actor\.publisherId \}/);
  assert.match(source, /uploadPrefixForScope\("book-full"\)/);
  assert.match(source, /PDF_BOOK_LIMITS\.maxBytes/);
  assert.match(source, /createV2PagesFromPdf/);
  assert.match(source, /return \{ pageCount: pages\.length, pages \}/);
  assert.doesNotMatch(source, /signedDownload|createSignedDownloadUrl|request\.url/i);
});
