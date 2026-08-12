import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createContentDocument } from "../lib/content-document";
import { adoptLayoutV2, createV2Frame } from "../lib/content-layout-v2";
import { getAllBookPageViews, getBookPageViewsForRange } from "../lib/book-page-filter";

function documentWithPages(count = 32) {
  const base = createContentDocument([]);
  return adoptLayoutV2(base, {
    pageSize: { preset: "CUSTOM", width: 600, height: 800, unit: "px" },
    pages: Array.from({ length: count }, (_, index) => ({
      id: `page-${index + 1}`,
      order: index,
      width: 600,
      height: 800,
      unit: "px" as const,
      pdfBackground: { source: "BOOK_FULL_PDF" as const, pageNumber: index + 1 },
      frames: [createV2Frame("TEXT", `page-${index + 1}`, { id: `frame-${index + 1}`, payload: `Page ${index + 1}` })],
    })),
  });
}

test("Book view exposes every original page and absolute PDF numbering", () => {
  const document = documentWithPages();
  const views = getAllBookPageViews(document);
  assert.equal(views.length, 32);
  assert.deepEqual(views.slice(0, 2).map((view) => [view.page.id, view.absolutePageNumber, view.page.pdfBackground?.pageNumber]), [
    ["page-1", 1, 1],
    ["page-2", 2, 2],
  ]);
  assert.equal(views[31]?.page.id, "page-32");
});

test("mapped module view returns original pages 8 through 10 without cloning", () => {
  const document = documentWithPages();
  const views = getBookPageViewsForRange(document, 8, 10);
  assert.deepEqual(views.map((view) => view.page.id), ["page-8", "page-9", "page-10"]);
  assert.deepEqual(views.map((view) => [view.absolutePageNumber, view.rangePageNumber, view.rangePageCount]), [[8, 1, 3], [9, 2, 3], [10, 3, 3]]);
  assert.strictEqual(views[1]?.page, document.pageLayout?.pages[8]);
  assert.equal(document.pageLayout?.pages.length, 32);
});


test("mapped module ranges use authoritative PDF identities without shifting", () => {
  const document = documentWithPages();
  const pages = [...document.pageLayout!.pages];
  const [pageSeven] = pages.splice(6, 1);
  pages.splice(7, 0, pageSeven!);
  const shifted = { ...document, pageLayout: { ...document.pageLayout!, pages } };
  const views = getBookPageViewsForRange(shifted, 7, 8);
  assert.deepEqual(views.map((view) => [view.page.id, view.absolutePageNumber]), [["page-7", 7], ["page-8", 8]]);
});
test("invalid or unmapped ranges never expose arbitrary Book pages", () => {
  const document = documentWithPages();
  assert.deepEqual(getBookPageViewsForRange(document, null, null), []);
  assert.deepEqual(getBookPageViewsForRange(document, 0, 10), []);
  assert.deepEqual(getBookPageViewsForRange(document, 10, 9), []);
  assert.deepEqual(getBookPageViewsForRange(document, 1, 33), []);
});

test("Stage 3 keeps range views separate from persistence and disables destructive filtered actions", () => {
  const workspace = readFileSync("components/admin/books/editor/V2DocumentWorkspace.tsx", "utf8");
  const editor = readFileSync("components/admin/books/ContentManuscriptEditor.tsx", "utf8");
  const route = readFileSync("app/admin/books/[id]/content/page.tsx", "utf8");
  assert.match(workspace, /getBookPageViewsForRange\(document, pageScope\.startPage, pageScope\.endPage\)/);
  assert.match(workspace, /onDocumentChange\(\{ \.\.\.document, pageLayout:/);
  assert.match(workspace, /disabled=\{!isBookRootContext\}/);
  assert.match(workspace, /if \(pageScope\) return;/);
  assert.match(editor, /workspaceTitle \?\? title/);
  assert.match(editor, /pageScope=\{pageScope\}/);
  assert.match(route, /bookEditor\s*\?\s*saveBookContentAction\.bind\(null, bookId\)/);
  assert.match(route, /No book pages are mapped to this item yet\./);
  assert.match(route, /mappingMode/);
  assert.match(route, /pageScope=\{!mappingMode/);
  assert.match(route, /Map Pages/);
  assert.doesNotMatch(route, /pageLayout:\s*\{[\s\S]*pages:\s*visiblePages/);
});
test("filtered module navigation stays on absolute pages 7 and 8", () => {
  const document = documentWithPages(112);
  const views = getBookPageViewsForRange(document, 7, 8);
  assert.deepEqual(views.map((view) => view.absolutePageNumber), [7, 8]);
  assert.deepEqual(views.map((view) => view.page.pdfBackground?.pageNumber), [7, 8]);
  assert.equal(views[0]?.rangePageNumber, 1);
  assert.equal(views[1]?.rangePageNumber, 2);
  assert.equal(views[0]?.rangePageCount, 2);
  assert.equal(views[1]?.rangePageCount, 2);
  assert.equal(getBookPageViewsForRange(document, 7, 8).length, 2);
});

test("save and filtered mode keep the complete Book document", () => {
  const document = documentWithPages(112);
  const filtered = getBookPageViewsForRange(document, 7, 8);
  assert.equal(document.pageLayout?.pages.length, 112);
  assert.notEqual(filtered[0]?.page, undefined);
  assert.equal(document.pageLayout?.pages[6]?.pdfBackground?.pageNumber, 7);
  assert.equal(document.pageLayout?.pages[7]?.pdfBackground?.pageNumber, 8);
});