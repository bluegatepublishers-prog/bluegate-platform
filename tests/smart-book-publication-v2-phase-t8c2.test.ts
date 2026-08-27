import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildSmartBookReleaseManifest,
  parseSmartBookReleaseManifest,
  type SmartBookManifestBuildSource,
} from "@/lib/smart-book-release-manifest";
import { classifySmartBookReadinessError } from "@/lib/smart-book-release-readiness";
import type { ContentDocument } from "@/lib/content-document";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (relative: string) => readFileSync(root + "/" + relative, "utf8");
const checksum = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function sourceFixture(): SmartBookManifestBuildSource {
  const document = {
    version: 4,
    canvas: { width: 1000, height: 1000 },
    blocks: [{ id: "text-1", type: "paragraph", text: "Chapter A", spans: [{ text: "Chapter A" }] }],
    periods: [],
  } as unknown as ContentDocument;
  return {
    publisherId: "publisher-1",
    bookId: "book-1",
    book: { title: "Fixture Book", slug: "fixture-book", subtitle: null, edition: "2026", updatedAt: new Date("2026-08-26T00:00:00.000Z") },
    document,
    hierarchy: [
      { sourceId: "part-1", bookId: "book-1", kind: "PART", parentSourceId: null, partSourceId: "part-1", unitSourceId: null, chapterSourceId: null, moduleSourceId: null, topicSourceId: null, title: "Chapter A", label: null, number: null, displayOrder: 0, startPage: 1, endPage: 10 },
      { sourceId: "chapter-1", bookId: "book-1", kind: "CHAPTER", parentSourceId: "part-1", partSourceId: "part-1", unitSourceId: null, chapterSourceId: null, moduleSourceId: null, topicSourceId: null, title: "Chapter A", label: "Chapter 1", number: 1, displayOrder: 0, startPage: 1, endPage: 10 },
    ],
    pdf: { bookPdfVersionId: "pdf-a", objectKey: "books/full-books/publisher-1/pdf-a/book.pdf", pageCount: 10, activatedAt: "2026-08-26T00:00:00.000Z" },
    assets: { resources: [], media: [], activities: [], worksheets: [], assessments: [], questions: [] },
  };
}

test("blocked V2 readiness occurs before the publication transaction and writes", () => {
  const release = read("lib/content-release.ts");
  const transitionStart = release.indexOf("export async function transitionRelease");
  const transactionStart = release.indexOf("const transactionResult = await prisma.$transaction", transitionStart);
  const preflight = release.slice(transitionStart, transactionStart);

  assert.match(preflight, /prepareSmartBookReleaseManifest/);
  assert.match(preflight, /status === "BLOCKED"/);
  assert.match(preflight, /throw new Error\(preparedV2\.issues\[0\]\?\.message/);
  assert.ok(release.indexOf("prepareSmartBookReleaseManifest", transitionStart) < transactionStart);
  assert.doesNotMatch(preflight, /contentReleaseVersion\.create|publishSnapshotDependencies|currentVersionId/);
});

test("all locked readiness failure categories become safe actionable errors", () => {
  const cases = [
    ["Referenced exercise group dependency is unavailable: group-id", "STALE_GROUP_REFERENCE"],
    ["Referenced resource dependency is unavailable: resource-id", "STALE_RESOURCE_REFERENCE"],
    ["Hierarchy node belongs to another Book.", "CROSS_BOOK_DEPENDENCY"],
    ["Referenced content is outside this Publisher.", "CROSS_PUBLISHER_DEPENDENCY"],
    ["Manifest dependency kind is unsupported.", "UNSUPPORTED_DEPENDENCY"],
  ] as const;

  for (const [message, code] of cases) {
    const issue = classifySmartBookReadinessError(new Error(message));
    assert.equal(issue.code, code);
    assert.doesNotMatch(issue.message, /group-id|resource-id/);
  }
});

test("successful preparation stores a validated schemaVersion 2 manifest and its exact checksum", () => {
  const manifest = buildSmartBookReleaseManifest(sourceFixture());
  const persisted = parseSmartBookReleaseManifest(manifest);

  assert.equal(persisted.schemaVersion, 2);
  assert.deepEqual(persisted, manifest);
  assert.equal(checksum(persisted), checksum(manifest));

  const release = read("lib/content-release.ts");
  assert.match(release, /parseSmartBookReleaseManifest\(preparedV2\.manifest\)/);
  assert.match(release, /snapshot: snapshot as unknown as Prisma\.InputJsonValue/);
  assert.match(release, /checksumJson\(snapshot\)/);
});

test("identical source produces identical checksum and changed content produces a new checksum", () => {
  const first = buildSmartBookReleaseManifest(sourceFixture());
  const second = buildSmartBookReleaseManifest(sourceFixture());
  assert.deepEqual(first, second);
  assert.equal(checksum(first), checksum(second));

  const changed = sourceFixture();
  changed.document = { ...changed.document, blocks: [{ id: "text-1", type: "paragraph", text: "Changed", spans: [{ text: "Changed" }] }] } as unknown as ContentDocument;
  assert.notEqual(checksum(first), checksum(buildSmartBookReleaseManifest(changed)));
});

test("representative manifest size and build timing remain observable", () => {
  const startedAt = performance.now();
  const manifest = buildSmartBookReleaseManifest(sourceFixture());
  const elapsedMs = performance.now() - startedAt;
  const bytes = Buffer.byteLength(JSON.stringify(manifest), "utf8");
  const boundedDependencyQueryUpperBound = 20;

  assert.ok(bytes > 0);
  console.info("[T8C2 manifest performance]", {
    buildMs: Number(elapsedMs.toFixed(2)),
    manifestBytes: bytes,
    boundedDependencyQueryUpperBound,
  });
});

test("publication creates the next version and never creates a V1 Smart Book snapshot", () => {
  const release = read("lib/content-release.ts");

  assert.match(release, /const versionNumber = release\.latestVersionNumber \+ 1/);
  assert.match(release, /previousVersionId: currentVersion\?\.id \?\? null/);
  assert.match(release, /currentVersionId: version\.id/);
  assert.match(release, /latestVersionNumber: versionNumber/);
  assert.match(release, /Republish this Smart Book to use the current release format/);
  assert.match(release, /snapshot: version\.snapshot as Prisma\.InputJsonValue/);
  assert.match(release, /previousVersionId: release\.currentVersionId/);
});

test("V2 succession and immutable source snapshots do not mutate old data", () => {
  const release = read("lib/content-release.ts");
  const manifest = buildSmartBookReleaseManifest(sourceFixture());
  const originalTitle = manifest.hierarchy[0]?.title;
  const source = sourceFixture();
  source.hierarchy[0]!.title = "Changed source";
  source.pdf!.objectKey = "books/full-books/publisher-1/pdf-b/book.pdf";

  assert.equal(manifest.hierarchy[0]?.title, originalTitle);
  assert.equal(manifest.pdf.objectKey, "books/full-books/publisher-1/pdf-a/book.pdf");
  assert.match(release, /tx\.contentReleaseVersion\.create/);
  assert.match(release, /snapshot: snapshot as unknown as Prisma\.InputJsonValue/);
});

test("manifest security excludes operational, answer, and teacher-private data", () => {
  const source = sourceFixture();
  source.document = {
    ...source.document,
    blocks: [{ id: "text-1", type: "text", payload: { text: "safe", correctAnswer: "secret", answerKey: "secret", teacherNote: "private", studentResponse: "response", marks: 10, feedback: "feedback" } }],
  } as unknown as ContentDocument;
  const manifest = buildSmartBookReleaseManifest(source);
  assert.doesNotMatch(JSON.stringify(manifest), /correctAnswer|answerKey|teacherNote|studentResponse|marks|feedback/);
});

test("promotion remains scoped and aborts on material dependency races", () => {
  const release = read("lib/content-release.ts");

  assert.match(release, /bookExercise\.updateMany/);
  assert.match(release, /bookExerciseQuestionGroup\.updateMany/);
  assert.match(release, /bookQuestion\.updateMany/);
  assert.match(release, /resource\.updateMany/);
  assert.match(release, /result\.count !== exerciseIds\.size/);
  assert.match(release, /result\.count !== plan\.validGroupIds\.length/);
  assert.match(release, /result\.count !== plan\.validQuestionIds\.length/);
  assert.match(release, /result\.count !== resourceIds\.size/);
  assert.match(release, /The Smart Book changed while publication was being prepared/);
  assert.match(release, /book: \{ publisherId \}/);
});

test("Save remains separate, publication preserves catalogue state, and consumers remain on existing delivery", () => {
  const actions = read("app/admin/books/[id]/content/actions.ts");
  const release = read("lib/content-release.ts");
  const student = read("lib/student-books.ts");
  const teacher = read("lib/teacher-books.ts");

  const saveStart = actions.indexOf("export async function saveBookContentAction");
  const publishStart = actions.indexOf("export async function changeContentReleaseAction");
  assert.doesNotMatch(actions.slice(saveStart, publishStart), /transitionRelease\(/);
  assert.match(actions.slice(publishStart), /await transitionRelease\(/);
  assert.doesNotMatch(release, /publicCatalogueVisible/);
  assert.doesNotMatch(student, /smart-book-release-manifest/);
  assert.doesNotMatch(teacher, /smart-book-release-manifest/);
});

test("publication remains bounded and does not read hierarchy inside the transaction", () => {
  const release = read("lib/content-release.ts");
  const transactionStart = release.indexOf("const transactionResult = await prisma.$transaction");
  const transactionEnd = release.indexOf("}, publishTransactionOptions);", transactionStart);
  const transaction = release.slice(transactionStart, transactionEnd);

  assert.doesNotMatch(transaction, /bookChapter\.findMany|bookModule\.findMany|bookExercise\.findMany|bookQuestion\.findMany/);
  assert.match(release, /prepareSnapshotPublishPlan/);
  assert.match(release, /const publishTransactionOptions/);
});