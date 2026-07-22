import test from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (path: string) => readFileSync(resolve(path), "utf8").replace(/\r\n/g, "\n");

function matches(text: string, pattern: RegExp): void {
  assert.ok(pattern.test(text), `Expected /${pattern.source}/ to match in source file`);
}

function notIncludes(text: string, substr: string): void {
  assert.ok(!text.includes(substr), `Expected text not to include "${substr}"`);
}

// ============================================================================
// Service layer — upload-service.ts
// ============================================================================

test("parseAndValidateUploadInit rejects invalid input", () => {
  const svc = source("lib/storage/upload-service.ts");
  matches(svc, /isUploadScope\(input\.scope\)/);
  matches(svc, /input\.fileName\.length > 255/);
  matches(svc, /input\.fileName\.length === 0/);
  matches(svc, /input\.contentType\.includes\("\/"\)/);
  matches(svc, /!Number\.isInteger\(input\.sizeBytes\)/);
  matches(svc, /input\.sizeBytes <= 0/);
  matches(svc, /typeof input\.checksumSha256 !== "string"/);
  matches(svc, /typeof input\.targetId !== "string" \|\| input\.targetId\.length === 0/);
});

test("parseAndValidateUploadComplete rejects invalid input", () => {
  const svc = source("lib/storage/upload-service.ts");
  matches(svc, /typeof input\.objectKey !== "string" \|\| input\.objectKey\.length === 0/);
  matches(svc, /!Number\.isInteger\(input\.expectedSizeBytes\)/);
  matches(svc, /input\.expectedSizeBytes <= 0/);
  matches(svc, /!input\.expectedContentType\.includes\("\/"\)/);
});

test("authorizeUpload rejects invalid scope and excluded roles", () => {
  const svc = source("lib/storage/upload-service.ts");
  matches(svc, /isUploadScope\(scope\)/);
  matches(svc, /EXCLUDED_ROLES = new Set\(\["SUPER_ADMIN", "STUDENT", "TEACHER", "PARENT", "MENTOR"\]\)/);
  matches(svc, /EXCLUDED_ROLES\.has\(session\.user\.role\)/);
});

test("authorizeUpload resolves school-logo tenantId from database school", () => {
  const svc = source("lib/storage/upload-service.ts");
  matches(svc, /prisma\.school\.findUnique/);
  matches(svc, /where: \{ userId: user\.id \}/);
  matches(svc, /tenantId: school\.id/);
  notIncludes(svc, "tenantId: user.id");
});

test("authorizeUpload checks school status and publisher active for school-logo", () => {
  const svc = source("lib/storage/upload-service.ts");
  matches(svc, /school\.status !== "APPROVED"/);
  matches(svc, /!school\.publisher\?\.active/);
});

test("completeUpload verifies key ownership and rejects missing objects", () => {
  const svc = source("lib/storage/upload-service.ts");
  matches(svc, /keyBelongsToTenant/);
  matches(svc, /"Object key does not belong to the authenticated tenant\."/);
  matches(svc, /!metadata/);
  matches(svc, /code: "OBJECT_NOT_FOUND"/);
  matches(svc, /"The uploaded object was not found\."/);
});

test("completeUpload validates content type, size, and max size", () => {
  const svc = source("lib/storage/upload-service.ts");
  matches(svc, /"Content type mismatch\."/);
  matches(svc, /"Uploaded file is empty\."/);
  matches(svc, /"File size exceeds the maximum allowed for this scope\."/);
  matches(svc, /"File size does not match the expected size\."/);
});

test("completeUpload calls normalize before tenant check", () => {
  const svc = source("lib/storage/upload-service.ts");
  const normIdx = svc.indexOf("normalizeAndValidateObjectKey");
  const tenantIdx = svc.indexOf("keyBelongsToTenant");
  assert.ok(normIdx > 0, "normalizeAndValidateObjectKey must exist in file");
  assert.ok(tenantIdx > normIdx, "normalize must be called before tenant check");
});

// ============================================================================
// Init route
// ============================================================================

test("init route imports and uses central service functions", () => {
  const route = source("app/api/storage/upload/init/route.ts");
  matches(route, /authorizeUpload/);
  matches(route, /initUpload/);
  matches(route, /parseAndValidateUploadInit/);
  matches(route, /mapStorageError/);
  matches(route, /scopeToTargetType/);
  matches(route, /recordTrustedAuditBestEffort/);
  matches(route, /accountAuditActor/);
  matches(route, /"Cache-Control": "no-store"/);
});

test("init endpoint returns only safe fields", () => {
  const route = source("app/api/storage/upload/init/route.ts");
  matches(route, /uploadUrl/);
  matches(route, /objectKey/);
  matches(route, /requiredHeaders/);
  matches(route, /expiresAt/);
  matches(route, /expiresInSeconds/);
});

test("init route does not expose storage credentials", () => {
  const route = source("app/api/storage/upload/init/route.ts");
  notIncludes(route, "accessKeyId");
  notIncludes(route, "secretAccessKey");
  notIncludes(route, "R2_ACCESS_KEY_ID");
  notIncludes(route, "R2_SECRET_ACCESS_KEY");
  notIncludes(route, "R2StorageProvider");
});

test("init route uses scopeToTargetType and storage.upload.init", () => {
  const route = source("app/api/storage/upload/init/route.ts");
  matches(route, /scopeToTargetType\(input\.scope\)/);
  matches(route, /"storage\.upload\.init"/);
});

// ============================================================================
// Complete route
// ============================================================================

test("complete route imports and uses central service functions", () => {
  const route = source("app/api/storage/upload/complete/route.ts");
  matches(route, /authorizeUpload/);
  matches(route, /completeUpload/);
  matches(route, /parseAndValidateUploadComplete/);
  matches(route, /mapStorageError/);
  matches(route, /scopeToTargetType/);
  matches(route, /recordTrustedAuditBestEffort/);
  matches(route, /accountAuditActor/);
  matches(route, /"storage\.upload\.complete"/);
  matches(route, /"Cache-Control": "no-store"/);
});

test("complete route does not expose storage credentials", () => {
  const route = source("app/api/storage/upload/complete/route.ts");
  notIncludes(route, "accessKeyId");
  notIncludes(route, "secretAccessKey");
  notIncludes(route, "R2_ACCESS_KEY_ID");
  notIncludes(route, "R2_SECRET_ACCESS_KEY");
  notIncludes(route, "R2StorageProvider");
});

test("complete route uses scopeToTargetType", () => {
  const route = source("app/api/storage/upload/complete/route.ts");
  matches(route, /scopeToTargetType\(input\.scope\)/);
});

test("complete route maps error codes to HTTP status", () => {
  const route = source("app/api/storage/upload/complete/route.ts");
  matches(route, /"OBJECT_NOT_FOUND"/);
  matches(route, /404/);
  matches(route, /"STORAGE_ACCESS_DENIED"/);
  matches(route, /"INVALID_OBJECT_KEY"/);
  matches(route, /"INVALID_STORAGE_REQUEST"/);
});

// ============================================================================
// Security audit policy
// ============================================================================

test("SECURITY_AUDIT_ACTIONS includes storage.upload actions", () => {
  const policy = source("lib/security-audit-policy.ts");
  matches(policy, /"storage\.upload\.init"/);
  matches(policy, /"storage\.upload\.complete"/);
});

// ============================================================================
// R2 provider
// ============================================================================

test("R2 provider documents Content-Length limitation", () => {
  const r2 = source("lib/storage/r2.ts");
  assert.ok(r2.includes("cannot"), "should contain 'cannot'");
  assert.ok(r2.includes("Content-Length"), "should mention Content-Length");
  assert.ok(r2.includes("Maximum size"), "should mention maximum size enforcement");
  assert.ok(r2.includes("Actual size"), "should mention actual size verification");
});

test("R2 provider offers ChecksumSHA256 but documents headObject limitation", () => {
  const r2 = source("lib/storage/r2.ts");
  assert.ok(r2.includes("ChecksumSHA256"), "should offer ChecksumSHA256");
  assert.ok(r2.includes("HeadObjectCommand"), "should document headObject limitation");
});

test("R2 provider presigned PUT binds Content-Type", () => {
  const r2 = source("lib/storage/r2.ts");
  matches(r2, /"Content-Type": input\.contentType/);
});

// ============================================================================
// Legacy compatibility
// ============================================================================

test("existing Vercel Blob upload route remains unchanged", () => {
  const upload = source("app/api/upload/route.ts");
  matches(upload, /@vercel\/blob/);
  matches(upload, /issueSignedToken/);
  matches(upload, /handleUploadPresigned/);
});