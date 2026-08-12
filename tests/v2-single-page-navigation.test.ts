import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { clampV2PageNumber, getV2PageByNumber } from "../lib/v2-page-navigation";

const workspace = readFileSync("components/admin/books/editor/V2DocumentWorkspace.tsx", "utf8");

test("V2 page navigation clamps absolute page numbers and preserves page identity", () => {
  const pages = [{ id: "page-1" }, { id: "page-2" }, { id: "page-10" }];
  assert.equal(clampV2PageNumber(0, pages.length), 1);
  assert.equal(clampV2PageNumber(99, pages.length), 3);
  assert.equal(clampV2PageNumber(Number.NaN, pages.length), 1);
  assert.equal(getV2PageByNumber(pages, 2)?.id, "page-2");
  assert.equal(getV2PageByNumber(pages, 10)?.id, "page-10");
});

test("PAGE editing mounts one active canvas and keeps the full page array in document state", () => {
  assert.match(workspace, /data-v2-page-navigation/);
  assert.match(workspace, /\{pageCountLabel\}/);
  assert.match(workspace, /aria-label="Page number"/);
  assert.match(workspace, /onBlur=\{commitPageInput\}/);
  assert.match(workspace, /pdfBackgroundActive=\{pdfBackgroundActive\}/);
  assert.match(workspace, /const renderPageCanvas = \(page: LayoutV2Page, pageNumber: number, pdfBackgroundActive: boolean\)/);
  assert.match(workspace, /navigateToPage\(visiblePages\[activeVisibleIndex \+ offset\]\)/);
  assert.match(workspace, /setSelectedFrameId\(null\);[\s\S]*setActiveTextFrameId\(null\);[\s\S]*setCropFrameId\(null\)/);
  assert.match(workspace, /\{activePage \? <div key=\{activePage\.id\}/);
  assert.match(workspace, /pageViewMode === "WEB" \? visiblePageViews\.map/);
  assert.match(workspace, /: activePage \? renderPageCanvas\(activePage, activeAbsolutePageNumber, true\)/);
  assert.match(workspace, /\{\[\.\.\.activePage\.frames\]/);
});

test("page navigation preserves all pages and keeps PDF backgrounds absolute", () => {
  assert.match(workspace, /const layout = document\.pageLayout/);
  assert.match(workspace, /pdfBackgroundActive/);
  assert.match(workspace, /onDocumentChange\(\{ \.\.\.document, layoutVersion: 2, pageLayout \}/);
});
