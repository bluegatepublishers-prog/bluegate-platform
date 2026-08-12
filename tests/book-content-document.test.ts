import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createContentDocument, normalizeContentDocument } from "../lib/content-document";
import { adoptLayoutV2, createV2PageLayout } from "../lib/content-layout-v2";

type PdfPage = { id: string; order: number; width: number; height: number; unit: "px"; frames: []; pdfBackground: { source: "BOOK_FULL_PDF"; pageNumber: number } };

const read = (path: string) => readFileSync(path, "utf8");
const pages = (count: number): PdfPage[] => Array.from({ length: count }, (_, index) => ({
  id: `pdf-page-${index + 1}`,
  order: index,
  width: 828,
  height: 648,
  unit: "px",
  frames: [],
  pdfBackground: { source: "BOOK_FULL_PDF", pageNumber: index + 1 },
}));

test("Book.content is a nullable additive ContentDocument store", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/20260812200000_add_book_content_document/migration.sql");

  assert.match(schema, /model Book \{[\s\S]*?fullBookPdf\s+String\?[\s\S]*?content\s+Json\?/);
  assert.equal(migration.trim(), 'ALTER TABLE "Book" ADD COLUMN "content" JSONB;');
  assert.equal(normalizeContentDocument(null).blocks.length, 1);
});

test("BOOK scope saves only owned Book.content and preserves hierarchy persistence", () => {
  const actions = read("app/admin/books/[id]/content/actions.ts");
  const hierarchy = read("lib/book-structure-management.ts");

  assert.match(actions, /saveBookContentAction\(bookId: string, form: FormData\)[\s\S]*?requireLivePublisherAdmin\(\)[\s\S]*?getContentNodeScope\(actor\.publisherId, bookId, "BOOK", bookId\)[\s\S]*?prisma\.book\.updateMany\([\s\S]*?where: \{ id: bookId, publisherId: actor\.publisherId \}[\s\S]*?data: \{ content: content \?\? Prisma\.JsonNull \}/);
  assert.doesNotMatch(actions.match(/export async function saveBookContentAction[\s\S]*?(?=export async function saveContentNodeAction)/)?.[0] ?? "", /bookModule|bookChapter/);
  assert.match(hierarchy, /BookStructureNodeType = "PART" \| "UNIT" \| "CHAPTER" \| "MODULE" \| "TOPIC"/);
});

test("book root opens the existing editor at BOOK scope and can return to its summary", () => {
  const page = read("app/admin/books/[id]/content/page.tsx");
  const editor = read("components/admin/books/ContentManuscriptEditor.tsx");

  assert.match(page, /href=\{`\/admin\/books\/\$\{studio\.id\}\/content\?bookEditor=1`\}/);
  assert.match(page, /\s+Open Book Editor\s+/);
  assert.match(page, /const editingBook = selected\.type === "BOOK" && query\.bookEditor === "1"/);
  assert.match(page, /content: studio\.content/);
  assert.match(page, /nodeType=\{bookEditor \? "BOOK" : selected\.type as BookStructureNodeType\}/);
  assert.match(page, /saveBookContentAction\.bind\(null, bookId\)/);
  assert.match(page, /\s+Back to Book Summary\s+/);
  assert.match(editor, /nodeType: BookStructureNodeType \| "BOOK"/);
  assert.match(editor, /onDelete=\{nodeType === "BOOK" \? undefined : deleteCurrentNode\}/);
});

test("a full PDF maps all pages into one BOOK document with stable absolute page identities", () => {
  const document = adoptLayoutV2(createContentDocument([]), createV2PageLayout({ pageSize: { width: 828, height: 648, unit: "px" }, pages: pages(32) }));
  const layout = document.pageLayout;

  assert.ok(layout);
  assert.equal(layout.pages.length, 32);
  assert.deepEqual(layout.pages.map((page) => page.order), Array.from({ length: 32 }, (_, index) => index));
  assert.deepEqual(layout.pages.map((page) => page.pdfBackground?.pageNumber), Array.from({ length: 32 }, (_, index) => index + 1));
  assert.equal(layout.pages[0]?.frames.length, 0);
  assert.equal(layout.pages[31]?.frames.length, 0);
});

test("BOOK releases include the stored document and PDF imports synchronize Book.pages", () => {
  const releases = read("lib/content-release.ts");
  const importer = read("lib/book-pdf-v2-import.ts");
  const workspace = read("components/admin/books/editor/V2DocumentWorkspace.tsx");

  assert.match(releases, /targetType === "BOOK"[\s\S]*?content: true[\s\S]*?contentDocument: row\.content \? normalizeContentDocument\(row\.content\) : undefined/);
  assert.match(importer, /createV2PagesFromPdf\(bytes\)[\s\S]*?data: \{ pages: pages\.length \}/);
  assert.match(workspace, /pdfBackground/);
  assert.match(workspace, /setActivePageId\(pageLayout\.pages\[0\]\?\.id \?\? null\)/);
});