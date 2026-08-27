import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { decideSchoolAccess, effectiveSchoolAccessStatus } from "../lib/school-access-policy";

const read = (path: string) => readFileSync(path, "utf8");
const activeFree = { plan: "FREE" as const, status: "ACTIVE" as const };
const activePaid = { plan: "PAID" as const, status: "ACTIVE" as const };

test("Free school retains basic School Dashboard access", () => {
  assert.deepEqual(decideSchoolAccess({ subscription: activeFree, capability: "SCHOOL_DASHBOARD", role: "SCHOOL" }), { allowed: true, reason: "ALLOWED" });
});

test("Free school cannot use premium AI", () => {
  assert.equal(decideSchoolAccess({ subscription: activeFree, capability: "AI_TOOLS", role: "TEACHER", publisherFeatureEnabled: true }).reason, "UPGRADE_REQUIRED");
});

test("Paid school can use enabled premium features", () => {
  assert.deepEqual(decideSchoolAccess({ subscription: activePaid, capability: "ASSESSMENTS", role: "TEACHER", publisherFeatureEnabled: true }), { allowed: true, reason: "ALLOWED" });
});

test("PublisherFeature disabled overrides Paid plan", () => {
  assert.equal(decideSchoolAccess({ subscription: activePaid, capability: "AI_TOOLS", role: "TEACHER", publisherFeatureEnabled: false }).reason, "FEATURE_DISABLED");
});

test("suspended and expired access override plan", () => {
  assert.equal(decideSchoolAccess({ subscription: { plan: "PAID", status: "SUSPENDED" }, capability: "ASSIGNMENTS", role: "TEACHER" }).reason, "ACCESS_SUSPENDED");
  assert.equal(decideSchoolAccess({ subscription: { plan: "PAID", status: "ACTIVE", expiresAt: new Date("2026-01-01") }, capability: "ASSIGNMENTS", role: "TEACHER", now: new Date("2026-02-01") }).reason, "ACCESS_EXPIRED");
  assert.equal(effectiveSchoolAccessStatus({ plan: "PAID", status: "ACTIVE", startsAt: new Date("2026-03-01") }, new Date("2026-02-01")), "NOT_STARTED");
});

test("Paid school still requires explicit Book and Resource entitlement", () => {
  assert.equal(decideSchoolAccess({ subscription: activePaid, capability: "BOOK_CONTENT", role: "STUDENT", contentEntitled: false }).reason, "CONTENT_NOT_ASSIGNED");
  assert.equal(decideSchoolAccess({ subscription: activePaid, capability: "RESOURCE_CONTENT", role: "TEACHER", contentEntitled: false }).reason, "CONTENT_NOT_ASSIGNED");
  assert.deepEqual(decideSchoolAccess({ subscription: activeFree, capability: "BOOK_CONTENT", role: "STUDENT", contentEntitled: true }), { allowed: true, reason: "ALLOWED" });
});

test("premium QR requires Paid plan, publisher feature, and content entitlement", () => {
  assert.equal(decideSchoolAccess({ subscription: activePaid, capability: "PREMIUM_QR_CONTENT", role: "STUDENT", publisherFeatureEnabled: true, contentEntitled: false }).reason, "CONTENT_NOT_ASSIGNED");
  assert.deepEqual(decideSchoolAccess({ subscription: activePaid, capability: "PREMIUM_QR_CONTENT", role: "STUDENT", publisherFeatureEnabled: true, contentEntitled: true }), { allowed: true, reason: "ALLOWED" });
});

test("school access model is tenant scoped and backfill preserves existing access", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/20260801160000_school_access_subscription/migration.sql");
  assert.match(schema, /model SchoolAccessSubscription[\s\S]*schoolId\s+String\s+@unique[\s\S]*publisherId\s+String/);
  assert.match(migration, /WHEN "status" = 'APPROVED' THEN 'PAID'/);
  assert.match(migration, /WHEN "status" = 'APPROVED' THEN 'ACTIVE'/);
  assert.doesNotMatch(migration, /\bDROP\s+(TABLE|COLUMN)\b/i);
  assert.doesNotMatch(migration, /^\s*(DELETE\s+FROM|TRUNCATE)\b/im);
});

test("Free and Paid updates are publisher scoped and do not delete entitlements", () => {
  const service = read("lib/school-access.ts");
  assert.match(service, /publisherId: actor\.publisherId/);
  assert.match(service, /schoolAccessSubscription\.upsert/);
  assert.doesNotMatch(service, /school(Book|Resource)Entitlement\.(delete|deleteMany)/);
});

test("school approval and lifecycle synchronize access without deleting identities", () => {
  const lifecycle = read("lib/school-lifecycle.ts");
  assert.match(lifecycle, /approve:[\s\S]*SchoolOnboardingStatus\.PENDING/);
  assert.match(lifecycle, /syncSchoolAccessLifecycle/);
  assert.doesNotMatch(lifecycle, /school\.delete/);
});

test("Publisher Admin navigation excludes school operations", () => {
  const sidebar = read("components/admin/AdminSidebar.tsx");
  const schoolDetail = read("app/admin/schools/[id]/page.tsx");
  assert.doesNotMatch(sidebar, /admin\/teachers|academic-years|teacher-assignments|attendance|guardians/);
  assert.match(schoolDetail, /read-only for operational school records/);
});


test("school request review synchronizes the school access subscription", () => {
  const approvals = read("lib/onboarding-approvals.ts");
  const updateIndex = approvals.indexOf("const updated = await tx.school.updateMany");
  const syncIndex = approvals.indexOf("await syncSchoolAccessLifecycle(tx, {");
  assert.ok(updateIndex >= 0 && syncIndex > updateIndex);
  assert.match(approvals, /status: status === SchoolOnboardingStatus\.APPROVED[\s\S]*?SchoolAccessStatus\.ACTIVE/);
  assert.match(approvals, /status === SchoolOnboardingStatus\.REJECTED[\s\S]*?SchoolAccessStatus\.EXPIRED/);
  assert.match(approvals, /SchoolAccessStatus\.SUSPENDED/);
});
