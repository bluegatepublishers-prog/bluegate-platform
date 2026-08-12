import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { normalizePageLayoutV2 } from "../lib/content-layout-v2";
import { normalizePdfTextItems } from "../lib/pdf-text-normalization";

test("normalizes PDF.js text items in reading order", () => {
  assert.equal(normalizePdfTextItems([
    { str: "Hello" },
    { str: "  world  " },
    { str: "Next", hasEOL: true },
    { str: "line" },
    { str: "" },
    { type: "irrelevant" },
  ]), "Hello world\nNext line");
});

test("normalizes page read-aloud metadata without retaining unsafe or unrelated fields", () => {
  const layout = normalizePageLayoutV2({
    pages: [{
      id: "page-1",
      width: 612,
      height: 792,
      unit: "px",
      frames: [],
      readAloud: {
        text: "  Page one text  ",
        source: "PDF_TEXT",
        reviewed: false,
        storageKey: "private-key",
        url: "https://example.invalid/private.pdf",
      },
    }],
  });

  assert.deepEqual(layout?.pages[0]?.readAloud, {
    text: "Page one text",
    source: "PDF_TEXT",
    reviewed: false,
  });
});

test("keeps the extraction path bounded and page-numbered", () => {
  const source = readFileSync("lib/pdf-text-extraction.ts", "utf8");
  const validation = readFileSync("lib/pdf-book-validation.ts", "utf8");

  assert.match(source, /inspectPdfBook\(data, limits\)/);
  assert.match(source, /document\.getPage\(pageNumber\)/);
  assert.match(source, /getTextContent\(\)/);
  assert.match(source, /pageNumber, text/);
  assert.match(source, /data: data\.slice\(\)/);
  assert.doesNotMatch(source, /ocr|storageKey|signedToken|signedUrl/i);
  assert.match(validation, /maxBytes: 100 \* 1024 \* 1024/);
  assert.match(validation, /maxPages: 2_000/);
});

test("does not create page text metadata for an invalid read-aloud source", () => {
  const layout = normalizePageLayoutV2({
    pages: [{
      id: "page-1",
      width: 612,
      height: 792,
      unit: "px",
      frames: [],
      readAloud: { text: "text", source: "REMOTE_URL" },
    }],
  });

  assert.equal(layout?.pages[0]?.readAloud, undefined);
});
