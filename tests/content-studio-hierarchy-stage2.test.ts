import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildContentStudioTree, type ContentTreeInput } from "../lib/content-studio-tree";

const read = (path: string) => readFileSync(path, "utf8");
const counts = { outcomes: 0, activities: 0, worksheets: 0, exercises: 0, questions: 0, assessments: 0, resources: 0, media: 0 };

function input(overrides: Partial<ContentTreeInput> = {}): ContentTreeInput {
  return { book: { id: "book-1", title: "Book" }, parts: [], units: [], chapters: [], modules: [], topics: [], ...overrides };
}

test("Stage 2 hierarchy places Cover, Front Matter, then Parts", () => {
  const root = buildContentStudioTree(input({
    coverImage: "cover-key",
    frontMatterItems: [
      { id: "fm-2", title: "Preface", archived: false, type: "PREFACE", displayOrder: 2, startPage: 3, endPage: 4 },
      { id: "fm-1", title: "Title Page", archived: false, type: "TITLE_PAGE", displayOrder: 1, startPage: 1, endPage: 1 },
    ],
    parts: [{ id: "part-1", title: "Term 1", archived: false, displayOrder: 0 }],
  }));
  assert.deepEqual(root.children.map((node) => node.type), ["COVER", "FRONT_MATTER", "PART"]);
  assert.deepEqual(root.children[1]?.children.map((node) => node.title), ["Title Page", "Preface"]);
});

test("Cover is omitted without Book.coverImage and never gets PDF mapping fields", () => {
  const root = buildContentStudioTree(input({ frontMatterItems: [] }));
  assert.equal(root.children.some((node) => node.type === "COVER"), false);
  assert.equal(root.children[0]?.type, "FRONT_MATTER");
  assert.equal("startPage" in (root.children[0] ?? {}), false);
});

test("Part, Unit, Chapter and Module remain nested with mapping metadata", () => {
  const root = buildContentStudioTree(input({
    parts: [{ id: "part-1", title: "Term 1", archived: false, displayOrder: 0, startPage: 1, endPage: 20 }],
    units: [{ id: "unit-1", title: "Unit 1", archived: false, partId: "part-1", displayOrder: 0, startPage: 2, endPage: 18 }],
    chapters: [{ id: "chapter-1", title: "Chapter 1", archived: false, partId: "part-1", unitId: "unit-1", sortOrder: 0, counts, startPage: 3, endPage: 17 }],
    modules: [{ id: "module-1", title: "Module 1", archived: false, chapterId: "chapter-1", displayOrder: 0, counts, startPage: 4, endPage: 6 }],
  }));
  const moduleNode = root.children.find((node) => node.type === "PART")?.children[0]?.children[0]?.children[0];
  assert.equal(moduleNode?.type, "MODULE");
  assert.deepEqual([moduleNode?.startPage, moduleNode?.endPage], [4, 6]);
});

test("Stage 2 uses the shared mapping actions and does not implement filtered editor pages", () => {
  const actions = read("app/admin/books/[id]/structure/mapping-actions.ts");
  const inspector = read("components/admin/books/BookPageRangeInspector.tsx");
  const page = read("app/admin/books/[id]/content/page.tsx");
  assert.match(actions, /mapPartPages/);
  assert.match(actions, /mapUnitPages/);
  assert.match(actions, /mapChapterPages/);
  assert.match(actions, /mapModulePages/);
  assert.match(actions, /mapFrontMatterPages/);
  assert.match(inspector, />Set Start</);
  assert.match(inspector, /Clear Range/);
  assert.match(page, /Open Book Editor/);
  assert.doesNotMatch(page, /getBookPageViewsForRange\(/);
});

test("Front Matter CRUD is scoped to the existing book record and preserves content/PDF fields", () => {
  const actions = read("lib/book-page-mapping.ts");
  const schema = read("prisma/schema.prisma");
  assert.match(actions, /createFrontMatterItem/);
  assert.match(actions, /updateFrontMatterItem/);
  assert.match(actions, /deleteFrontMatterItem/);
  assert.match(actions, /reorderFrontMatterItems/);
  assert.match(schema, /model BookFrontMatterItem/);
  assert.doesNotMatch(actions, /book\.update/);
  assert.doesNotMatch(actions, /fullBookPdf/);
});
