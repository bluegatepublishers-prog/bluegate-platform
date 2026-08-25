import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { ContentDocument } from "../lib/content-document";
import {
  restrictPublishedBookDocumentToModuleRange,
  resolveTeachingPageTargetFromDocuments,
  type TeachingModuleDocument,
} from "../lib/teaching-plan-policy";

const service = readFileSync("lib/teaching-plan.ts", "utf8");
const delivery = readFileSync("lib/content-delivery.ts", "utf8");
const teachRoute = readFileSync("app/teacher-dashboard/classes/[sectionId]/teach/page.tsx", "utf8");

function documentWithPdfPages(startPage = 60, endPage = 70): ContentDocument {
  return {
    version: 4,
    layoutVersion: 2,
    periods: [],
    layout: "single",
    canvas: { preset: "CUSTOM", width: 100, height: 200, unit: "px", orientation: "portrait", margins: { top: 0, right: 0, bottom: 0, left: 0 } },
    blocks: [],
    pageLayout: {
      pageSize: { preset: "CUSTOM", width: 100, height: 200, unit: "px" },
      pages: Array.from({ length: endPage - startPage + 1 }, (_, index) => ({
        id: "book-v29-page-" + (startPage + index),
        order: index,
        width: 100,
        height: 200,
        unit: "px" as const,
        pdfBackground: { source: "BOOK_FULL_PDF" as const, pageNumber: startPage + index },
        frames: [],
      })),
    },
  };
}

function moduleDocument(document: ContentDocument, id = "module-7-1"): TeachingModuleDocument {
  return {
    id,
    title: "Water module",
    displayOrder: 1,
    chapterId: "chapter-7",
    chapterTitle: "Chapter 7: Water - A Precious Gift",
    document,
  };
}

test("published BOOK pages are range-filtered without changing canonical page identity", () => {
  const document = documentWithPdfPages();
  const filtered = restrictPublishedBookDocumentToModuleRange(document, {
    moduleStartPage: 62,
    moduleEndPage: 69,
    chapterStartPage: 62,
    chapterEndPage: 69,
  });
  assert.deepEqual(filtered?.pageLayout?.pages.map((page) => page.id), Array.from({ length: 8 }, (_, index) => "book-v29-page-" + (62 + index)));
  assert.deepEqual(filtered?.pageLayout?.pages.map((page) => page.pdfBackground?.pageNumber), [62, 63, 64, 65, 66, 67, 68, 69]);
  assert.deepEqual(document.pageLayout?.pages.map((page) => page.pdfBackground?.pageNumber), Array.from({ length: 11 }, (_, index) => 60 + index));
});

test("module ranges are intersected with chapter ranges and outside hierarchy pages are excluded", () => {
  const filtered = restrictPublishedBookDocumentToModuleRange(documentWithPdfPages(), {
    moduleStartPage: 63,
    moduleEndPage: 67,
    chapterStartPage: 62,
    chapterEndPage: 69,
  });
  assert.deepEqual(filtered?.pageLayout?.pages.map((page) => page.pdfBackground?.pageNumber), [63, 64, 65, 66, 67]);
  const candidate = resolveTeachingPageTargetFromDocuments(
    { pageId: "book-v29-page-65", moduleId: "module-7-1" },
    [moduleDocument(filtered!, "module-7-1")],
  );
  assert.equal(candidate.page.id, "book-v29-page-65");
  assert.equal(candidate.displayPageNumber, 65);
});

test("a module without a usable page range exposes no BOOK pages", () => {
  const filtered = restrictPublishedBookDocumentToModuleRange(documentWithPdfPages(), {
    moduleStartPage: null,
    moduleEndPage: null,
    chapterStartPage: 62,
    chapterEndPage: 69,
  });
  assert.deepEqual(filtered?.pageLayout?.pages, []);
});

test("teacher discovery uses one published BOOK read and never requires module releases", () => {
  const loader = service.slice(service.indexOf("async function loadModuleDocuments"), service.indexOf("function normalizePageTargets"));
  assert.match(loader, /targetType: "BOOK"/);
  assert.doesNotMatch(loader, /targetType: "MODULE"/);
  assert.equal((loader.match(/loadPublishedContentDocument/g) ?? []).length, 1);
  assert.doesNotMatch(loader, /rows\.map\(async/);
  assert.match(loader, /published: true/);
  assert.match(loader, /approved: true/);
  assert.match(loader, /archived: false/);
  assert.match(loader, /chapter: \{ bookId: context\.book\.id/);
  assert.match(loader, /startPage: true/);
  assert.match(loader, /endPage: true/);
});

test("composer hierarchy validation rejects unpublished, unapproved, archived, or wrong-book nodes", () => {
  assert.match(service, /where: \{ id, bookId: context\.book\.id, published: true, approved: true, archived: false \}/);
  assert.match(service, /chapter: \{ bookId: context\.book\.id, published: true, approved: true, archived: false \}/);
  assert.match(service, /bookId: context\.book\.id/);
});

test("missing BOOK release is not replaced by mutable draft content for teacher reads", () => {
  assert.match(delivery, /requirePublishedRelease\?: boolean/);
  assert.match(delivery, /if \(!publishedDocument && input\.requirePublishedRelease\) return null/);
  assert.match(service, /requirePublishedRelease: true/);
  assert.match(readFileSync("lib/teacher-smart-book-runtime.ts", "utf8"), /requirePublishedRelease: true/);
});

test("persisted page refs retain pageId and Teach Mode uses the saved absolute page", () => {
  assert.match(service, /pageId: candidate\.page\.id/);
  assert.match(service, /teachingPeriodPageRef\.createMany/);
  assert.match(teachRoute, /period\?\.pageRefs\[0\]\?\.displayPageNumber/);
  assert.match(teachRoute, /initialPage=\{initialPage\}/);
  assert.match(teachRoute, /loadTeacherSmartBookRuntime/);
});