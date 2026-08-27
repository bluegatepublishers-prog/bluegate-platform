import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildSmartBookReleaseManifest,
  parseSmartBookReleaseManifest,
  SmartBookManifestError,
  type SmartBookManifestBuildSource,
} from "@/lib/smart-book-release-manifest";
import type { ContentDocument } from "@/lib/content-document";

const documentFixture = (): ContentDocument => ({
  version: 4,
  canvas: { width: 1000, height: 1000 },
  blocks: [],
  periods: [],
} as unknown as ContentDocument);

const hierarchyFixture = (bookId: string) => [
  { sourceId: "part-1", bookId, kind: "PART" as const, parentSourceId: null, partSourceId: "part-1", unitSourceId: null, chapterSourceId: null, moduleSourceId: null, topicSourceId: null, title: "Part 1", label: null, number: null, displayOrder: 0, startPage: 1, endPage: 10 },
  { sourceId: "chapter-1", bookId, kind: "CHAPTER" as const, parentSourceId: "part-1", partSourceId: "part-1", unitSourceId: null, chapterSourceId: null, moduleSourceId: null, topicSourceId: null, title: "Chapter 1", label: "Chapter 1", number: 1, displayOrder: 0, startPage: 1, endPage: 10 },
  { sourceId: "module-1", bookId, kind: "MODULE" as const, parentSourceId: "chapter-1", partSourceId: null, unitSourceId: null, chapterSourceId: "chapter-1", moduleSourceId: null, topicSourceId: null, title: "Module 1", label: null, number: null, displayOrder: 0, startPage: 2, endPage: 8 },
  { sourceId: "exercise-1", bookId, kind: "EXERCISE" as const, parentSourceId: "module-1", partSourceId: null, unitSourceId: null, chapterSourceId: "chapter-1", moduleSourceId: "module-1", topicSourceId: null, title: "Practice", label: null, number: null, displayOrder: 0, startPage: 3, endPage: 4 },
];

const sourceFixture = (): SmartBookManifestBuildSource => ({
  publisherId: "publisher-1",
  bookId: "book-1",
  book: { title: "World Around Us - 3", slug: "world-around-us-3", subtitle: null, edition: "2026", updatedAt: new Date("2026-08-26T00:00:00.000Z") },
  document: documentFixture(),
  hierarchy: hierarchyFixture("book-1"),
  pdf: { bookPdfVersionId: "pdf-version-1", objectKey: "books/book-1/release.pdf", pageCount: 120, activatedAt: "2026-08-25T00:00:00.000Z" },
  assets: { resources: [], media: [], activities: [], worksheets: [], assessments: [], questions: [] },
});

test("builds a deterministic schemaVersion 2 manifest with hierarchy, PDF, and dependencies", () => {
  const manifest = buildSmartBookReleaseManifest(sourceFixture());
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.identity.bookId, "book-1");
  assert.equal(manifest.pdf?.bookPdfVersionId, "pdf-version-1");
  assert.deepEqual(manifest.hierarchy.map((node) => node.sourceId), ["chapter-1", "exercise-1", "module-1", "part-1"]);
  assert.deepEqual(manifest.dependencies.map((dependency) => dependency.manifestId), [
    "BOOK_CHAPTER:chapter-1",
    "BOOK_EXERCISE:exercise-1",
    "BOOK_MODULE:module-1",
  ]);
  assert.deepEqual(manifest, parseSmartBookReleaseManifest(manifest));
});

test("removes answer-bearing and teacher-private document fields", () => {
  const source = sourceFixture();
  source.document = {
    ...source.document,
    blocks: [{ id: "text-1", type: "text", payload: { text: "safe", correctAnswer: "secret", teacherNote: "private" } }],
  } as unknown as ContentDocument;
  const manifest = buildSmartBookReleaseManifest(source);
  assert.equal(JSON.stringify(manifest).includes("correctAnswer"), false);
  assert.equal(JSON.stringify(manifest).includes("teacherNote"), false);
  assert.equal(JSON.stringify(manifest).includes("private"), false);
});

test("rejects cross-book hierarchy nodes and invalid page ranges", () => {
  const crossBook = sourceFixture();
  crossBook.hierarchy[0].bookId = "other-book";
  assert.throws(() => buildSmartBookReleaseManifest(crossBook), SmartBookManifestError);

  const badPages = sourceFixture();
  badPages.hierarchy[0].startPage = 10;
  badPages.hierarchy[0].endPage = 1;
  assert.throws(() => buildSmartBookReleaseManifest(badPages), SmartBookManifestError);
});

test("rejects unsupported, future, and malformed manifest versions/dependencies", () => {
  const manifest = buildSmartBookReleaseManifest(sourceFixture());
  assert.throws(() => parseSmartBookReleaseManifest({ ...manifest, schemaVersion: 3 }), SmartBookManifestError);
  assert.throws(() => parseSmartBookReleaseManifest({ ...manifest, dependencies: [{ manifestId: "UNKNOWN:x", kind: "UNKNOWN", sourceId: "x" }] }), SmartBookManifestError);
  assert.throws(() => parseSmartBookReleaseManifest({ ...manifest, assets: { ...manifest.assets, resources: [{ sourceId: "r1", title: "x", type: "PDF", audience: "STUDENT", published: true, storage: null, answerKey: "no" }] } }), SmartBookManifestError);
});

test("copies assets and preserves immutable PDF metadata across source mutation", () => {
  const source = sourceFixture();
  source.assets.resources.push({ sourceId: "resource-1", title: "Read", description: null, type: "PDF", audience: "STUDENT", mimeType: "application/pdf", published: true, storage: { kind: "OBJECT_KEY", value: "resources/r1.pdf" } });
  const manifest = buildSmartBookReleaseManifest(source);
  source.assets.resources[0].title = "mutated";
  source.pdf!.objectKey = "mutated.pdf";
  assert.equal(manifest.assets.resources[0].title, "Read");
  assert.equal(manifest.pdf?.objectKey, "books/book-1/release.pdf");
  assert.equal(manifest.assets.resources[0].storage?.value, "resources/r1.pdf");
});

test("rejects a manifest without an active immutable PDF reference", () => {
  const source = sourceFixture();
  source.pdf = null as never;
  assert.throws(() => buildSmartBookReleaseManifest(source), SmartBookManifestError);
});
test("database builder scopes dependency reads and new publication is the only V2 integration", () => {
  const implementation = readFileSync(fileURLToPath(new URL("../lib/smart-book-release-manifest.ts", import.meta.url)), "utf8");
  const liveRelease = readFileSync(fileURLToPath(new URL("../lib/content-release.ts", import.meta.url)), "utf8");
  assert.match(implementation, /prisma\.book\.findFirst\(\{\s*where: \{ id: input\.bookId, publisherId: input\.publisherId \}/);
  assert.match(implementation, /publisherId, archived: false, published: true/);
  assert.match(implementation, /book: \{ publisherId \}/);
  assert.match(implementation, /exercise: \{ bookId: input\.bookId, published: true, archived: false \}/);
  assert.match(liveRelease, /prepareSmartBookReleaseManifest/);
  assert.match(liveRelease, /snapshot: snapshot as unknown as Prisma.InputJsonValue/);
  assert.doesNotMatch(liveRelease, /smart-book-release-manifest.*teacher|smart-book-release-manifest.*student/i);
});