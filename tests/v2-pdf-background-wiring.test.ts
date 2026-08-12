import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("V2 PDF page backgrounds are optional, protected, lazy, and below frames", () => {
  const editor = read("components/admin/books/ContentManuscriptEditor.tsx");
  const workspace = read("components/admin/books/editor/V2DocumentWorkspace.tsx");
  const canvas = read("components/admin/books/editor/V2PageCanvas.tsx");
  const background = read("components/admin/books/editor/PdfPageBackground.tsx");

  assert.match(editor, /<V2DocumentWorkspace[\s\S]*?bookId=\{bookId\}/);
  assert.match(workspace, /bookId\?: string/);
  assert.match(workspace, /pdfUrl=\{bookId \? "\/api\/books\/" \+ bookId \+ "\/full-pdf" : undefined\}/);
  assert.match(workspace, /visiblePageViews\.map\(\(view\) => renderPageCanvas\(view\.page, view\.absolutePageNumber, activePage\?\.id === view\.page\.id\)/);
  assert.match(workspace, /pdfBackgroundActive=\{pdfBackgroundActive\}/);
  assert.match(canvas, /page\.pdfBackground\?\.source === "BOOK_FULL_PDF" && pdfUrl/);
  assert.match(canvas, /pageNumber=\{page\.pdfBackground\.pageNumber\}/);
  assert.match(canvas, /active=\{pdfBackgroundActive\}/);
  assert.ok(canvas.indexOf("page.background?.resourceId") < canvas.indexOf("page.pdfBackground?.source === \"BOOK_FULL_PDF\""));
  assert.ok(canvas.indexOf("page.pdfBackground?.source === \"BOOK_FULL_PDF\"") < canvas.indexOf("visualFrames.map"));
  assert.match(background, /if \(!active\) return/);
  assert.match(background, /pointer-events-none/);
  assert.doesNotMatch(canvas, /fullBookPdf|storageKey|signed/i);
  assert.doesNotMatch(workspace, /storageKey|signedUrl|signedToken/i);
});

test("native V2 pages do not mount a PDF background", () => {
  const canvas = read("components/admin/books/editor/V2PageCanvas.tsx");
  assert.match(canvas, /page\.pdfBackground\?\.source === "BOOK_FULL_PDF" && pdfUrl \? <PdfPageBackground/);
});
