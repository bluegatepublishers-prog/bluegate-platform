import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { mergePdfReadAloudIntoDocument } from "../lib/book-read-aloud-merge";
import { getBookPageViewsForRange } from "../lib/book-page-filter";
import { normalizeContentDocument } from "../lib/content-document";

const read = (path: string) => readFileSync(path, "utf8");
const workspace = read("components/admin/books/editor/V2DocumentWorkspace.tsx");
const player = read("components/content/V2ReadAloudPlayer.tsx");
const inspector = read("components/admin/books/editor/ReadAloudPageInspector.tsx");

function page(id: string, pageNumber: number, text?: string) {
  return {
    id,
    order: pageNumber,
    width: 600,
    height: 800,
    unit: "px" as const,
    frames: [],
    pdfBackground: { source: "BOOK_FULL_PDF" as const, pageNumber },
    ...(text === undefined ? {} : { readAloud: { text, source: "PDF_TEXT" as const, reviewed: false } }),
  };
}

function documentForPages() {
  return normalizeContentDocument({
    blocks: [],
    layoutVersion: 2,
    pageLayout: {
      pageSize: { preset: "CUSTOM", width: 600, height: 800, unit: "px" },
      pages: Array.from({ length: 8 }, (_, index) => page(`book-${index + 1}`, index + 1)),
    },
  });
}

test("Review exposes Grammar and Read Aloud controls without an automatic player", () => {
  assert.match(workspace, /data-v2-review-controls[\s\S]*>Grammar<.*>Read Aloud</);
  assert.match(workspace, /activeRibbonTab === "REVIEW" && reviewSurface === "READ_ALOUD"/);
  assert.match(workspace, /activeRibbonTab === "REVIEW" && reviewSurface === "GRAMMAR"/);
  assert.match(workspace, /if \(tab !== "REVIEW"\) setReviewSurface\(null\)/);
  assert.doesNotMatch(workspace, /\{activeRibbonTab === "REVIEW" \? <div data-v2-read-aloud-panel/);
});

test("only Read Aloud opens the one compact player and Grammar keeps it hidden", () => {
  assert.equal((workspace.match(/<V2ReadAloudPlayer/g) ?? []).length, 1);
  assert.match(workspace, /onClick=\{\(\) => setReviewSurface\("READ_ALOUD"\)\}/);
  assert.match(workspace, /setReviewSurface\("GRAMMAR"\); reviewGrammar\(\)/);
  assert.match(workspace, /data-v2-grammar-review-panel/);
});

test("prepared text always comes from the original absolute Book page in a module range", () => {
  const document = documentForPages();
  const merged = mergePdfReadAloudIntoDocument(document, [
    { pageNumber: 7, text: "PDF text for seven" },
    { pageNumber: 8, text: "PDF text for eight" },
  ]).document;
  const filtered = getBookPageViewsForRange(merged, 7, 8);

  assert.deepEqual(filtered.map((view) => [view.rangePageNumber, view.absolutePageNumber, view.page.readAloud?.text]), [
    [1, 7, "PDF text for seven"],
    [2, 8, "PDF text for eight"],
  ]);
  assert.match(workspace, /pdfBackground\?\.pageNumber === activeAbsolutePageNumber/);
  assert.match(workspace, /pageText=\{activeOriginalPage\?\.readAloud\?\.text \?\? ""\}/);
});

test("preparation remains authenticated, publisher-only, and preserves manual reading text", () => {
  const service = read("lib/book-read-aloud.ts");
  const action = read("app/admin/books/[id]/content/actions.ts");
  const manual = normalizeContentDocument({
    blocks: [], layoutVersion: 2,
    pageLayout: { pageSize: { preset: "CUSTOM", width: 600, height: 800, unit: "px" }, pages: [page("book-seven", 7)] },
  });
  manual.pageLayout!.pages[0]!.readAloud = { text: "Reviewed publisher text", source: "MANUAL", reviewed: true };

  const merged = mergePdfReadAloudIntoDocument(manual, [{ pageNumber: 7, text: "PDF should not replace this" }]);
  assert.equal(merged.document.pageLayout?.pages[0]?.readAloud?.text, "Reviewed publisher text");
  assert.match(service, /requireLivePublisherAdmin\(\)/);
  assert.match(action, /prepareBookReadAloudAction\(bookId: string\)[\s\S]*prepareOwnedBookReadAloud\(bookId\)/);
  assert.match(workspace, /const canPrepareReadAloud = Boolean\(hasFullBookPdf && onPrepareReadAloud\)/);
  assert.match(workspace, /globalThis\.location\.reload\(\)/);
});

test("missing text offers preparation, player never narrates semantic labels, and Reading Text edits the real page text", () => {
  assert.match(player, /Reading text has not been prepared for this book\/page\./);
  assert.match(player, /Prepare Read Aloud/);
  assert.doesNotMatch(player, /Main content/);
  assert.match(inspector, /page\.readAloud\?\.text \?\? ""/);
  assert.match(workspace, /readAloud: \{ text, source: "MANUAL", reviewed: true \}/);
  assert.match(inspector, /Save Reading Text/);
});

test("touched Content Studio Read Aloud strings contain no replacement characters", () => {
  for (const source of [workspace, player, inspector]) assert.equal(source.includes("\uFFFD"), false);
});
