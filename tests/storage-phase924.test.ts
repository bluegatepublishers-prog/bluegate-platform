import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { UserRole } from "@prisma/client";
import { makeStorageRecord } from "../lib/storage/storage-records";
import { compareMetadata, verifyObject } from "../lib/storage/verification";
import { applyRepair, planRepair } from "../lib/storage/repair";
import { generateReconciliationReport, retryCompletion } from "../lib/storage/reconciliation";
import { generateLifecycleReports, lifecycleReportJson } from "../lib/storage/lifecycle-reports";
import { prepareProtectedResourceDownloadWithDependencies, type ProtectedDownloadDependencies } from "../lib/storage/protected-download-policy";

const key = "resources/files/publisher-a/resource-a/lesson.pdf";
function file(overrides: Partial<ReturnType<typeof makeStorageRecord>> = {}) {
  return { ...makeStorageRecord({ entityType: "Resource", entityId: "resource-a", field: "fileUrl", publisherId: "publisher-a", publisherName: "Publisher A", title: "Lesson", value: key, scope: "resource-file", filename: "lesson-old.pdf", mimeType: null, sizeBytes: null, createdAt: new Date("2026-07-20T00:00:00Z") }), ...overrides };
}
const metadata = { key, contentType: "application/pdf", contentLength: 42, eTag: "verified-etag", customMetadata: { "original-filename": "lesson.pdf", "expected-sha256": "same", "checksum-sha256": "same" } };

test("object verification checks namespace, object metadata and available checksum", async () => {
  const result = await verifyObject(file(), { headObject: async () => metadata });
  assert.equal(result.exists, true);
  assert.equal(result.namespaceValid, true);
  assert.equal(result.checksumMatches, true);
  assert.deepEqual(compareMetadata(file(), metadata).map(item => item.field), ["filename"]);
  const crossTenant = await verifyObject(file({ publisherId: "publisher-b" }), { headObject: async () => { throw new Error("must not read foreign object"); } });
  assert.equal(crossTenant.namespaceValid, false);
});

test("repair planning changes only verified missing resource metadata and trusted filename", async () => {
  const verification = await verifyObject(file(), { headObject: async () => metadata });
  const plan = planRepair(file(), verification);
  assert.equal(plan.applicable, true);
  assert.deepEqual(plan.changes, { mimeType: "application/pdf", sizeBytes: 42, filename: "lesson.pdf", providerMetadata: { "original-filename": "lesson.pdf", "expected-sha256": "same", "checksum-sha256": "same", "upload-scope": "resource-file" } });
  let audited = false;
  const result = await applyRepair(plan, { compareAndSwapProviderMetadata: async value => value.expectedETag === "verified-etag", compareAndSwap: async value => value.expectedValue === key ? 1 : null, audit: async ({ applied }) => { audited = applied; } });
  assert.equal(result.applied, true);
  assert.equal(audited, true);
  assert.equal(planRepair(file({ entityType: "Book" }), verification).applicable, false);
});

test("reconciliation reports incomplete references and retry requires verification", async () => {
  const report = generateReconciliationReport([file()], [{ key: "resources/files/publisher-a/orphan/file.pdf" }], [{ id: "init", actorUserId: "user-a", action: "storage.upload.init", createdAt: new Date("2026-07-20T00:00:00Z"), metadata: {} }], new Date("2026-07-22T00:00:00Z"));
  assert.deepEqual(new Set(report.issues.map(issue => issue.type)), new Set(["OBJECT_WITHOUT_DB", "DB_WITHOUT_OBJECT", "ABANDONED_UPLOAD"]));
  const issue = report.issues.find(item => item.type === "OBJECT_WITHOUT_DB")!;
  let completed = false;
  const result = await retryCompletion(issue, { verify: async () => true, complete: async () => { completed = true; return "done"; }, audit: async () => undefined });
  assert.equal(result.completed, true);
  assert.equal(completed, true);
});

test("lifecycle reports are publisher-input scoped and export valid JSON", () => {
  const report = generateLifecycleReports([file(), file({ id: "Resource:resource-b:fileUrl", entityId: "resource-b", provider: "BLOB", value: "https://x.public.blob.vercel-storage.com/a.pdf" })], [{ action: "storage.download", targetId: "resource-a", createdAt: new Date(), outcome: "SUCCESS" }], { now: new Date("2026-07-22T00:00:00Z") });
  assert.equal(report.mostDownloaded[0]?.file.publisherId, "publisher-a");
  assert.equal(report.legacyBlobRemaining.length, 1);
  const exported = lifecycleReportJson(report);
  assert.doesNotThrow(() => JSON.parse(exported));
  assert.doesNotMatch(exported, /public\.blob\.vercel-storage\.com/);
});

test("protected download retries transient signing failures and emits retry audit", async () => {
  let signs = 0;
  const retries: number[] = [];
  const actor = { id: "user-a", role: UserRole.ADMIN, active: true, eligible: true, publisherId: "publisher-a" };
  const dependencies: ProtectedDownloadDependencies = {
    getSessionUser: async () => ({ id: actor.id, role: actor.role }),
    findLiveUser: async () => actor,
    authorizeResource: async () => ({ resource: { id: "resource-a", publisherId: "publisher-a", title: "Lesson", fileUrl: key, published: true } }),
    headObject: async () => true,
    signObject: async () => { signs += 1; if (signs === 1) throw new Error("transient"); return { url: "https://signed.invalid/fresh", expiresAt: new Date().toISOString() }; },
    persistSuccess: async () => undefined,
    recordAudit: async () => undefined,
    recordRetry: async input => { retries.push(input.attempt); },
  };
  const result = await prepareProtectedResourceDownloadWithDependencies({ resourceId: "resource-a", allowedRoles: ["ADMIN"] }, dependencies);
  assert.equal(result.ok, true);
  assert.equal(signs, 2);
  assert.deepEqual(retries, [2]);
});

test("admin and platform lifecycle surfaces use required authorization and audit actions", () => {
  const admin = readFileSync("app/admin/storage/layout.tsx", "utf8");
  for (const label of ["Lifecycle", "Verification", "Repairs", "Reports"]) assert.match(admin, new RegExp(label));
  assert.match(readFileSync("app/super-admin/storage/page.tsx", "utf8"), /requireSuperAdmin/);
  const policy = readFileSync("lib/security-audit-policy.ts", "utf8");
  for (const action of ["storage.verify", "storage.repair", "storage.download.retry", "storage.reconciliation.scan", "storage.reconciliation.retry"]) assert.match(policy, new RegExp(action.replaceAll(".", "\\.")));
});
