import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BookPageRangeError,
  validateBookPageRange,
  validateChapterWithinUnit,
  validateFrontMatterPageRange,
  validateModulePageRange,
  validatePartPageRange,
  validateRangeWithinParent,
  validateUnitPageRange,
} from "../lib/book-page-range";
import { getAllBookPageViews, getBookPageViewsForRange, getBookPagesForRange } from "../lib/book-page-filter";
import type { ContentDocument } from "../lib/content-document";

function documentWithPages(count = 6): ContentDocument {
  return {
    version: 4,
    periods: [],
    layout: "single",
    canvas: { preset: "CUSTOM", width: 100, height: 200, unit: "px", orientation: "portrait", margins: { top: 0, right: 0, bottom: 0, left: 0 } },
    blocks: [],
    pageLayout: {
      pageSize: { preset: "CUSTOM", width: 100, height: 200, unit: "px" },
      pages: Array.from({ length: count }, (_, index) => ({
        id: `page-${index + 1}`,
        order: index,
        width: 100,
        height: 200,
        unit: "px" as const,
        pdfBackground: { source: "BOOK_FULL_PDF" as const, pageNumber: index + 1 },
        frames: [],
      })),
    },
  };
}

test("Part, Unit, Chapter, Module and front matter ranges enforce bounds and containment", () => {
  validatePartPageRange({ startPage: 1, endPage: 6 }, 6);
  validateUnitPageRange({ startPage: 2, endPage: 5 }, { startPage: 1, endPage: 6 }, 6);
  validateChapterWithinUnit({ startPage: 3, endPage: 4 }, { startPage: 2, endPage: 5 });
  validateModulePageRange({ startPage: 3, endPage: 3 }, { startPage: 2, endPage: 5 }, 6);
  validateFrontMatterPageRange({ startPage: 1, endPage: 2 }, 6);
  assert.throws(() => validateBookPageRange({ startPage: 2, endPage: null }, 6), BookPageRangeError);
  assert.throws(() => validateBookPageRange({ startPage: 0, endPage: 2 }, 6), BookPageRangeError);
  assert.throws(() => validateBookPageRange({ startPage: 2, endPage: 7 }, 6), BookPageRangeError);
  assert.throws(() => validateRangeWithinParent({ startPage: 1, endPage: 4 }, { startPage: 2, endPage: 5 }, "Unit", "part"), BookPageRangeError);
  assert.throws(() => validateChapterWithinUnit({ startPage: 2, endPage: 6 }, { startPage: 2, endPage: 5 }), BookPageRangeError);
  validateModulePageRange({ startPage: 1, endPage: 2 }, { startPage: null, endPage: null }, 6);
  assert.throws(() => validateModulePageRange({ startPage: 1, endPage: 2 }, { startPage: 4, endPage: null }, 6), BookPageRangeError);
});

test("nullable ranges are valid unmapped ranges", () => {
  validateBookPageRange({ startPage: null, endPage: null }, 6);
  assert.deepEqual(getBookPagesForRange(documentWithPages(), null, null), []);
});

test("filtered views preserve original page identity, order, PDF page numbers, and document immutability", () => {
  const document = documentWithPages();
  const before = JSON.stringify(document);
  const views = getBookPageViewsForRange(document, 2, 4);
  assert.deepEqual(views.map((view) => view.page.id), ["page-2", "page-3", "page-4"]);
  assert.deepEqual(views.map((view) => view.absolutePageNumber), [2, 3, 4]);
  assert.deepEqual(views.map((view) => view.rangePageNumber), [1, 2, 3]);
  assert.deepEqual(views.map((view) => view.rangePageCount), [3, 3, 3]);
  assert.deepEqual(views.map((view) => view.page.pdfBackground?.pageNumber), [2, 3, 4]);
  assert.equal(getBookPagesForRange(document, 2, 4)[0], document.pageLayout?.pages[1]);
  assert.equal(getAllBookPageViews(document).length, 6);
  assert.equal(JSON.stringify(document), before);
});

test("cover remains outside the inner PDF page filter", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const frontMatter = schema.slice(schema.indexOf("model BookFrontMatterItem"), schema.indexOf("model BookPart"));
  assert.match(schema, /coverImage\s+String\?/);
  assert.doesNotMatch(frontMatter, /COVER/);
  assert.doesNotMatch(frontMatter, /coverImage/);
});

test("bottom-up and top-down mapping allow unmapped parents but enforce mapped containment", () => {
  validateModulePageRange({ startPage: 7, endPage: 8 }, { startPage: null, endPage: null }, 112);
  validateChapterWithinUnit({ startPage: 7, endPage: 20 }, { startPage: null, endPage: null });
  validateUnitPageRange({ startPage: 7, endPage: 30 }, { startPage: null, endPage: null }, 112);
  validateModulePageRange({ startPage: 7, endPage: 8 }, { startPage: 7, endPage: 20 }, 112);
  assert.throws(() => validateModulePageRange({ startPage: 7, endPage: 8 }, { startPage: 9, endPage: 20 }, 112), BookPageRangeError);
  validateChapterWithinUnit({ startPage: 7, endPage: 10 }, { startPage: null, endPage: null });
  validateChapterWithinUnit({ startPage: 7, endPage: 10 }, { startPage: 7, endPage: 10 });
  assert.throws(() => validateChapterWithinUnit({ startPage: 7, endPage: 10 }, { startPage: 8, endPage: 10 }), BookPageRangeError);
});

test("module mapping action resolves the owned module parent when the client omits chapterId", () => {
  const actions = readFileSync("app/admin/books/[id]/structure/mapping-actions.ts", "utf8");
  assert.match(actions, /prisma\.bookModule\.findFirst/);
  assert.match(actions, /resolvedChapterId/);
  assert.match(actions, /mapModulePages\(bookId, resolvedChapterId/);
  assert.match(actions, /Module chapter is unavailable/);
});