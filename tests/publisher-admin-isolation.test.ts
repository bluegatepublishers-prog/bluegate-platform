import assert from "node:assert/strict";
import test from "node:test";
import {
  findPublisherOwnedRecord,
  isPublisherOwnedRecord,
  listPublisherOwnedRecords,
  publisherScopedWhere,
  trustedPublisherAdminActor,
  type TrustedPublisherAdminActor,
} from "../lib/publisher-admin-policy";
import { isPublisherUploadUrl, publisherUploadPath } from "../lib/storage/upload-policy";

const publisherA = { id: "publisher-a", active: true, name: "Publisher A" };
const publisherB = { id: "publisher-b", active: true, name: "Publisher B" };
const adminA: TrustedPublisherAdminActor = { userId: "admin-a", publisherId: publisherA.id, name: "Admin A", publisherName: publisherA.name };
const adminB: TrustedPublisherAdminActor = { userId: "admin-b", publisherId: publisherB.id, name: "Admin B", publisherName: publisherB.name };
const records = [
  { id: "a-1", publisherId: publisherA.id, fileUrl: "stored-a" },
  { id: "b-1", publisherId: publisherB.id, fileUrl: "stored-b" },
  { id: "legacy", publisherId: null, fileUrl: "legacy" },
] as const;

test("live Publisher Admin identity requires an active matching publisher", () => {
  const base = { id: adminA.userId, name: adminA.name, role: "ADMIN", publisherId: publisherA.id, publisher: publisherA };
  assert.deepEqual(trustedPublisherAdminActor(adminA.userId, base), adminA);
  assert.equal(trustedPublisherAdminActor(null, base), null);
  assert.equal(trustedPublisherAdminActor("different-session-user", base), null);
  assert.equal(trustedPublisherAdminActor(adminA.userId, { ...base, role: "SCHOOL" }), null);
  assert.equal(trustedPublisherAdminActor(adminA.userId, { ...base, publisherId: null }), null);
  assert.equal(trustedPublisherAdminActor(adminA.userId, { ...base, publisher: { ...publisherA, active: false } }), null);
  assert.equal(trustedPublisherAdminActor(adminA.userId, { ...base, publisher: publisherB }), null);
});

test("lists expose only the live actor's publisher and fail closed for legacy rows", () => {
  assert.deepEqual(listPublisherOwnedRecords(adminA, records).map((record) => record.id), ["a-1"]);
  assert.deepEqual(listPublisherOwnedRecords(adminB, records).map((record) => record.id), ["b-1"]);
  assert.equal(isPublisherOwnedRecord(adminA, records[2]), false);
});

test("direct foreign and nonexistent IDs have the same safe result", () => {
  assert.equal(findPublisherOwnedRecord(adminA, records, "a-1")?.id, "a-1");
  assert.equal(findPublisherOwnedRecord(adminA, records, "b-1"), null);
  assert.equal(findPublisherOwnedRecord(adminA, records, "missing"), null);
});

test("foreign update, delete, relation connect, and file replacement are denied", () => {
  const foreign = findPublisherOwnedRecord(adminA, records, "b-1");
  assert.equal(foreign, null);
  assert.equal(Boolean(foreign && isPublisherOwnedRecord(adminA, foreign)), false);
  const own = findPublisherOwnedRecord(adminA, records, "a-1");
  assert.equal(own?.fileUrl, "stored-a");
  assert.notEqual(own?.fileUrl, records[1].fileUrl);
  assert.equal(isPublisherOwnedRecord(adminA, { publisherId: adminB.publisherId }), false);
});

test("browser-supplied publisherId cannot override the live actor", () => {
  assert.deepEqual(publisherScopedWhere(adminA, { id: "target", publisherId: publisherB.id }), {
    id: "target",
    publisherId: publisherA.id,
  });
});

test("important publisher-owned domains apply the same list/read/mutate boundary", () => {
  const domains = ["books", "resources", "schools", "teachers", "students", "academic-years", "sections", "inspections", "adoptions", "notifications", "reports", "ai-config"];
  for (const domain of domains) {
    const domainRecords = [
      { id: `${domain}-a`, publisherId: publisherA.id },
      { id: `${domain}-b`, publisherId: publisherB.id },
    ];
    assert.deepEqual(listPublisherOwnedRecords(adminA, domainRecords).map((record) => record.id), [`${domain}-a`], `${domain} list`);
    assert.equal(findPublisherOwnedRecord(adminA, domainRecords, `${domain}-a`)?.id, `${domain}-a`, `${domain} own read`);
    assert.equal(findPublisherOwnedRecord(adminA, domainRecords, `${domain}-b`), null, `${domain} foreign mutation precondition`);
  }
});

test("file attachment URLs are bound to the live publisher namespace", () => {
  assert.equal(publisherUploadPath(publisherA.id, "book-full", "book.pdf"), "publishers/publisher-a/books/full-books/book.pdf");
  const own = "https://store.public.blob.vercel-storage.com/publishers/publisher-a/books/full-books/book-123.pdf";
  const foreign = "https://store.public.blob.vercel-storage.com/publishers/publisher-b/books/full-books/book-123.pdf";
  assert.equal(isPublisherUploadUrl(own, publisherA.id, ["book-full"]), true);
  assert.equal(isPublisherUploadUrl(foreign, publisherA.id, ["book-full"]), false);
  assert.equal(isPublisherUploadUrl("https://example.com/publishers/publisher-a/books/full-books/book.pdf", publisherA.id, ["book-full"]), false);
});
