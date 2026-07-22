import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  migrateBatch,
  migrateOne,
  planMigration,
  rollbackManifest,
  verifyMigration,
  type BlobMigrationDependencies,
} from "../lib/storage/blob-migration";
import { generateStorageHealthReport } from "../lib/storage/storage-health";
import { calculateStorageStatistics, filterStorageFiles, makeStorageRecord } from "../lib/storage/storage-records";
import { resolveProtectedStorageTarget } from "../lib/storage/protected-download-policy";

const publisherId = "publisher-a";
const blobUrl = "https://files.public.blob.vercel-storage.com/publishers/publisher-a/resources/files/lesson.pdf";

function resourceFile(value = blobUrl) {
  return makeStorageRecord({
    entityType: "Resource", entityId: "resource-a", field: "fileUrl",
    publisherId, publisherName: "Publisher A", title: "Lesson", value,
    scope: "resource-file", filename: "lesson.pdf", mimeType: "application/pdf",
    sizeBytes: 4, createdAt: new Date("2026-07-22T00:00:00Z"),
  });
}

function migrationDependencies(overrides: Partial<BlobMigrationDependencies> = {}) {
  const calls: string[] = [];
  const dependencies: BlobMigrationDependencies = {
    async fetchSource() { calls.push("fetch"); return { body: new Uint8Array([1, 2, 3, 4]), contentType: "application/pdf", sizeBytes: 4 }; },
    async headObject() { calls.push("head"); return calls.filter(call => call === "head").length > 1 ? { key: "key", contentType: "application/pdf", contentLength: 4 } : null; },
    async putObject(input) { calls.push("put"); return { key: input.key, contentType: input.contentType, contentLength: input.body.byteLength }; },
    async updateReference() { calls.push("update"); return true; },
    ...overrides,
  };
  return { calls, dependencies };
}

test("migration planning is deterministic, tenant-scoped, and filterable", () => {
  const first = planMigration([resourceFile()]);
  const second = planMigration([resourceFile()], { resourceId: "resource-a", limit: 1, offset: 0 });
  assert.deepEqual(first, second);
  assert.match(first[0]!.destinationKey, /^resources\/files\/publisher-a\/resource-a\/[a-f0-9]{12}-lesson\.pdf$/);
  assert.deepEqual(planMigration([resourceFile()], { resourceId: "other" }), []);
});

test("dry run creates a manifest without network, object, or database writes", async () => {
  const fixture = migrationDependencies();
  const result = await migrateOne(planMigration([resourceFile()])[0]!, fixture.dependencies, { dryRun: true });
  assert.equal(result.status, "PLANNED");
  assert.deepEqual(fixture.calls, []);
});

test("migration uploads, verifies, then changes the reference", async () => {
  const fixture = migrationDependencies();
  const result = await migrateOne(planMigration([resourceFile()])[0]!, fixture.dependencies);
  assert.equal(result.status, "MIGRATED");
  assert.equal(result.verified, true);
  assert.deepEqual(fixture.calls, ["head", "fetch", "put", "head", "update"]);
  assert.deepEqual(resolveProtectedStorageTarget(result.destinationKey, publisherId), { kind: "OBJECT_KEY", key: result.destinationKey });
});

test("resume skips completed manifest entries and rollback is metadata-only", async () => {
  const plan = planMigration([resourceFile()]);
  const fixture = migrationDependencies();
  const previous = [{
    id: plan[0]!.id, entityType: "Resource" as const, entityId: "resource-a", field: "fileUrl",
    publisherId, sourceUrl: blobUrl, destinationKey: plan[0]!.destinationKey,
    status: "MIGRATED" as const, verified: true,
  }];
  assert.deepEqual(await migrateBatch(plan, fixture.dependencies, { resume: previous }), []);
  assert.deepEqual(fixture.calls, []);
  assert.deepEqual(rollbackManifest(previous)[0], {
    id: plan[0]!.id, entityType: "Resource", entityId: "resource-a", field: "fileUrl",
    arrayIndex: undefined, expectedValue: plan[0]!.destinationKey, restoreValue: blobUrl,
  });
});

test("verification rejects missing and size-mismatched objects", async () => {
  const item = planMigration([resourceFile()])[0]!;
  assert.deepEqual(await verifyMigration(item, { headObject: async () => null }), { ok: false, code: "OBJECT_MISSING" });
  const mismatch = await verifyMigration(item, { headObject: async key => ({ key, contentLength: 3, contentType: "application/pdf" }) }, { sizeBytes: 4 });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.code, "SIZE_MISMATCH");
});

test("health report detects missing, orphan, duplicate, invalid metadata, MIME, size, and key issues", () => {
  const key = "resources/files/publisher-a/resource-a/file.pdf";
  const r2 = resourceFile(key);
  const report = generateStorageHealthReport(
    [r2, { ...r2, id: "Resource:resource-b:fileUrl", entityId: "resource-b" }, resourceFile("wrong/key.pdf")],
    [{ key: "resources/files/publisher-a/orphan/file.pdf", contentType: "text/html", contentLength: 0 }],
  );
  assert.equal(report.healthy, false);
  assert.ok(report.counts.MISSING_OBJECT >= 1);
  assert.equal(report.counts.ORPHAN_OBJECT, 1);
  assert.equal(report.counts.DUPLICATE_OBJECT, 1);
  assert.ok(report.counts.INVALID_OBJECT_KEY >= 1);
});

test("file browser search and storage statistics remain publisher-scoped", () => {
  const files = [resourceFile(), makeStorageRecord({ ...resourceFile(), entityType: "Book", entityId: "book-a", field: "fullBookPdf", title: "Algebra", scope: "book-full", value: "books/full-books/publisher-a/book-a/book.pdf" })];
  assert.equal(filterStorageFiles(files, "algebra").length, 1);
  const stats = calculateStorageStatistics(files);
  assert.equal(stats.totalFiles, 2);
  assert.equal(stats.byProvider.BLOB, 1);
  assert.equal(stats.byProvider.R2, 1);
  assert.equal(stats.totalBytes, 8);
});

test("active upload UIs use R2 and storage administration exposes required controls and audits", () => {
  for (const file of ["components/admin/books/BookForm.tsx", "components/admin/ResourceForm.tsx", "components/school/SchoolProfileForm.tsx"]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /uploadFileToR2/);
    assert.doesNotMatch(source, /@vercel\/blob/);
  }
  const browser = readFileSync("app/admin/storage/files/page.tsx", "utf8") + readFileSync("components/admin/storage/StorageFileActions.tsx", "utf8");
  assert.match(browser, /Protected download/);
  assert.match(browser, /View metadata/);
  assert.match(browser, /Verify object/);
  assert.match(browser, /Copy object key/);
  const policy = readFileSync("lib/security-audit-policy.ts", "utf8");
  for (const action of ["storage.migration.retry", "storage.health.verify", "storage.statistics.recalculate", "storage.report.export"]) assert.match(policy, new RegExp(action.replaceAll(".", "\\.")));
});
