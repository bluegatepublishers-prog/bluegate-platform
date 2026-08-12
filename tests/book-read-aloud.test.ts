import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { normalizeContentDocument } from "../lib/content-document";
import { mergePdfReadAloudIntoDocument } from "../lib/book-read-aloud-merge";

type SourcePage = {
  id: string;
  order: number;
  width: number;
  height: number;
  unit: "px";
  frames: Array<Record<string, unknown>>;
  pdfBackground: { source: "BOOK_FULL_PDF"; pageNumber: number };
  readAloud?: { text: string; source: "PDF_TEXT" | "MANUAL"; reviewed?: boolean };
};

function documentWithPages(pages: SourcePage[]) {
  return normalizeContentDocument({
    blocks: [],
    layoutVersion: 2,
    pageLayout: {
      pageSize: { preset: "CUSTOM", width: 600, height: 800, unit: "px" },
      pages,
    },
  });
}

function page(id: string, order: number, pageNumber: number, readAloud?: SourcePage["readAloud"]): SourcePage {
  return {
    id,
    order,
    width: 600,
    height: 800,
    unit: "px",
    frames: [{ id: `${id}-frame`, type: "TEXT", x: 10, y: 20, width: 200, height: 40, payload: { text: "keep" } }],
    pdfBackground: { source: "BOOK_FULL_PDF", pageNumber },
    ...(readAloud ? { readAloud } : {}),
  };
}

test("merges extracted PDF text by absolute page number, not array position", () => {
  const document = documentWithPages([
    page("page-seven", 0, 7),
    page("page-two", 1, 2),
  ]);
  const before = structuredClone(document);
  const merged = mergePdfReadAloudIntoDocument(document, [
    { pageNumber: 2, text: "Page two" },
    { pageNumber: 7, text: "Page seven" },
  ]);

  assert.deepEqual(merged.document.pageLayout?.pages.map((entry) => [entry.id, entry.readAloud?.text]), [
    ["page-seven", "Page seven"],
    ["page-two", "Page two"],
  ]);
  assert.equal(merged.result.extractedPageCount, 2);
  assert.equal(merged.result.matchedPageCount, 2);
  assert.equal(merged.result.updatedPageCount, 2);
  assert.deepEqual(merged.document.pageLayout?.pages.map((entry) => entry.id), before.pageLayout?.pages.map((entry) => entry.id));
  assert.deepEqual(merged.document.pageLayout?.pages.map((entry) => entry.frames), before.pageLayout?.pages.map((entry) => entry.frames));
  assert.deepEqual(merged.document.pageLayout?.pages.map((entry) => [entry.order, entry.width, entry.height]), before.pageLayout?.pages.map((entry) => [entry.order, entry.width, entry.height]));
});

test("preserves manual text and refreshes PDF_TEXT or absent metadata", () => {
  const document = documentWithPages([
    page("manual", 0, 1, { text: "Publisher correction", source: "MANUAL", reviewed: true }),
    page("pdf", 1, 2, { text: "Old extraction", source: "PDF_TEXT", reviewed: false }),
    page("missing", 2, 3),
  ]);
  const merged = mergePdfReadAloudIntoDocument(document, [
    { pageNumber: 1, text: "PDF page one" },
    { pageNumber: 2, text: "New page two" },
    { pageNumber: 3, text: "" },
  ]);

  assert.deepEqual(merged.document.pageLayout?.pages.map((entry) => entry.readAloud), [
    { text: "Publisher correction", source: "MANUAL", reviewed: true },
    { text: "New page two", source: "PDF_TEXT", reviewed: false },
    { text: "", source: "PDF_TEXT", reviewed: false },
  ]);
  assert.equal(merged.result.preservedManualCount, 1);
  assert.equal(merged.result.updatedPageCount, 2);
});

test("reports unmatched absolute PDF and V2 pages without shifting content", () => {
  const document = documentWithPages([page("page-seven", 0, 7), page("page-eight", 1, 8)]);
  const merged = mergePdfReadAloudIntoDocument(document, [
    { pageNumber: 7, text: "Page seven" },
    { pageNumber: 9, text: "Page nine" },
  ]);

  assert.deepEqual(merged.result.unmatchedPdfPages, [9]);
  assert.deepEqual(merged.result.unmatchedV2Pages, [8]);
  assert.equal(merged.document.pageLayout?.pages[1]?.readAloud, undefined);
  assert.equal(merged.document.pageLayout?.pages[0]?.pdfBackground?.pageNumber, 7);
  assert.equal(JSON.stringify(merged.result), JSON.stringify(JSON.parse(JSON.stringify(merged.result))));
});

test("owned prepare action uses Book.content, owned book-full storage, and returns only a summary", () => {
  const service = readFileSync("lib/book-read-aloud.ts", "utf8");
  const action = readFileSync("app/admin/books/[id]/content/actions.ts", "utf8");

  assert.match(service, /requireLivePublisherAdmin\(\)/);
  assert.match(service, /where: \{ id: bookId, publisherId: actor\.publisherId \}/);
  assert.match(service, /select: \{ id: true, fullBookPdf: true, content: true \}/);
  assert.match(service, /uploadPrefixForScope\("book-full"\)/);
  assert.match(service, /getObjectBytes\(\{ key, maxBytes: PDF_BOOK_LIMITS\.maxBytes \}\)/);
  assert.match(service, /data: \{ content: merged\.document/);
  assert.doesNotMatch(service, /createSignedDownloadUrl|storageKey|signedUrl/i);
  assert.doesNotMatch(service, /return[\\s\\S]{0,120}\\bbytes\\b/i);
  assert.match(action, /prepareBookReadAloudAction\(bookId: string\)[\s\S]*prepareOwnedBookReadAloud\(bookId\)[\s\S]*return result/);
});

test("generated PDF V2 pages attach page-aligned read-aloud metadata", () => {
  const source = readFileSync("lib/pdf-v2-pages.ts", "utf8");
  assert.match(source, /extractPdfPageText\(data\)/);
  assert.match(source, /text: extractedText\[index\]\?\.text \?\? ""/);
  assert.match(source, /source: "PDF_TEXT"/);
  assert.match(source, /reviewed: false/);
  assert.match(source, /pageNumber: index \+ 1/);
});