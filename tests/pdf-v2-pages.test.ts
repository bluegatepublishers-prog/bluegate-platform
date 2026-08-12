import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { normalizePageLayoutV2 } from "../lib/content-layout-v2";

test("PDF V2 page metadata keeps each page dimension and a bounded background reference", () => {
  const layout = normalizePageLayoutV2({
    pageSize: { preset: "CUSTOM", width: 612, height: 792, unit: "px" },
    pages: [
      { id: "pdf-page-1", order: 0, width: 612, height: 792, unit: "px", frames: [], pdfBackground: { source: "BOOK_FULL_PDF", pageNumber: 1 } },
      { id: "pdf-page-2", order: 1, width: 792, height: 612, unit: "px", frames: [], pdfBackground: { source: "BOOK_FULL_PDF", pageNumber: 2 } },
    ],
  });

  assert.deepEqual(layout?.pages.map((page) => [page.order, page.width, page.height, page.pdfBackground?.pageNumber]), [
    [0, 612, 792, 1],
    [1, 792, 612, 2],
  ]);
  assert.deepEqual(layout?.pages.map((page) => page.frames), [[], []]);
});

test("PDF page generation uses existing validation and emits no storage or URL data", () => {
  const source = readFileSync("lib/pdf-v2-pages.ts", "utf8");
  const validation = readFileSync("lib/pdf-book-validation.ts", "utf8");
  assert.match(source, /inspectPdfBook\(data\)/);
  assert.match(source, /document\.getPage\(index \+ 1\)/);
  assert.match(source, /getViewport\(\{ scale: 1 \}\)/);
  assert.match(source, /pageNumber: index \+ 1/);
  assert.match(validation, /data: data\.slice\(\)/);
  assert.doesNotMatch(source, /https?:\/\/|signed|storageKey|objectKey/i);
});
