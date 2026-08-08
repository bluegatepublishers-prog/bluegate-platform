import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  evaluateContentEntitlementTransition,
  isOperationalContentEntitlement,
} from "../lib/content-entitlement-policy";
import { decideBookEntitlement } from "../lib/entitlements/book-policy";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const schema = read("prisma/schema.prisma");
const migration = read(
  "prisma/migrations/20260726210000_school_content_entitlements_and_book_structure/migration.sql",
);
const entitlementService = read("lib/school-content-entitlements.ts");
const resourcePolicy = read("lib/resource-access-policy.ts");
const bookAccess = read("lib/entitlements/book.ts");
const structureService = read("lib/book-structure-management.ts");
const featureService = read("lib/book-features.ts");
const resourceLinks = read("lib/book-resource-links.ts");
const bookPage = read("app/admin/schools/[id]/books/page.tsx");
const resourcePage = read("app/admin/schools/[id]/resources/page.tsx");
const structurePage = read("app/admin/books/[id]/structure/page.tsx");
const contentStudioPage = read("app/admin/books/[id]/content/page.tsx");
const auditPolicy = read("lib/security-audit-policy.ts");

test("school book and resource entitlements are lifecycle records with tenant-safe uniqueness", () => {
  assert.match(
    schema,
    /model SchoolBookEntitlement \{[\s\S]*@@unique\(\[schoolId, bookId\]\)/,
  );

  assert.match(
    schema,
    /model SchoolResourceEntitlement \{[\s\S]*@@unique\(\[schoolId, resourceId\]\)/,
  );

  assert.match(
    schema,
    /enum ContentEntitlementStatus \{[\s\S]*ACTIVE[\s\S]*PAUSED[\s\S]*REVOKED[\s\S]*ARCHIVED/,
  );

  assert.doesNotMatch(
    entitlementService,
    /schoolBookEntitlement\.delete|schoolResourceEntitlement\.delete/,
  );
});

test("duplicate active assignment is rejected and publisher ownership is server-derived", () => {
  assert.match(entitlementService, /requireLivePublisherAdmin\(\)/);
  assert.match(
    entitlementService,
    /existing\.some\(\(item\) => item\.status === ContentEntitlementStatus\.ACTIVE\)/,
  );
  assert.match(entitlementService, /publisherId: actor\.publisherId/);
  assert.match(
    entitlementService,
    /isolationLevel: Prisma\.TransactionIsolationLevel\.Serializable/,
  );
});

test("book entitlement lifecycle requires a revoke reason and only ACTIVE is operational", () => {
  assert.deepEqual(
    evaluateContentEntitlementTransition({
      current: "ACTIVE",
      action: "pause",
    }),
    { allowed: true, next: "PAUSED" },
  );

  assert.deepEqual(
    evaluateContentEntitlementTransition({
      current: "PAUSED",
      action: "resume",
    }),
    { allowed: true, next: "ACTIVE" },
  );

  assert.deepEqual(
    evaluateContentEntitlementTransition({
      current: "ACTIVE",
      action: "revoke",
    }),
    { allowed: false, reason: "REASON_REQUIRED" },
  );

  assert.deepEqual(
    evaluateContentEntitlementTransition({
      current: "ACTIVE",
      action: "revoke",
      reason: "Subscription ended",
    }),
    { allowed: true, next: "REVOKED" },
  );

  assert.equal(isOperationalContentEntitlement("ACTIVE"), true);
  assert.equal(isOperationalContentEntitlement("PAUSED"), false);
  assert.equal(isOperationalContentEntitlement("REVOKED"), false);
});

test("paused school book entitlement denies otherwise valid teacher access", () => {
  assert.deepEqual(
    decideBookEntitlement({
      authenticated: true,
      role: "TEACHER",
      recordFound: true,
      published: true,
      publisherActive: true,
      samePublisher: true,
      schoolActive: true,
      academicContext: true,
      assignment: true,
      enrollment: false,
      schoolEntitled: false,
      adoptionApproved: true,
    }),
    { allowed: false, reason: "BOOK_NOT_APPROVED" },
  );
});

test("resource access requires active school entitlement and active parent book entitlement", () => {
  assert.match(
    resourcePolicy,
    /schoolEntitlements: \{ some: \{ schoolId, publisherId, status: "ACTIVE" \} \}/,
  );

  assert.match(
    resourcePolicy,
    /book:[\s\S]*schoolEntitlements:[\s\S]*status: "ACTIVE"/,
  );

  assert.match(bookAccess, /schoolBookEntitlement\.findFirst/);
  assert.match(bookAccess, /schoolMemberships\.some/);
});

test("entitlement mutations are atomic and audited without recording reasons", () => {
  assert.match(entitlementService, /writeSecurityAuditEvent\(tx/);
  assert.match(
    auditPolicy,
    /publisher\.school_book_entitlement\.assign/,
  );
  assert.match(
    auditPolicy,
    /publisher\.school_resource_entitlement\.revoke/,
  );

  assert.doesNotMatch(
    entitlementService,
    /metadata:\s*\{[^}]*\breason\s*:/,
  );
});

test("migration is additive, backfills current access, and has no data-loss statements", () => {
  assert.match(
    migration,
    /INSERT INTO "SchoolBookEntitlement"/,
  );

  assert.match(
    migration,
    /INSERT INTO "SchoolResourceEntitlement"/,
  );

  assert.match(
    migration,
    /BookChapter"[\s\S]*"published" = "approved"/,
  );

  assert.doesNotMatch(
    migration,
    /\bDROP\s+(TABLE|COLUMN)\b/i,
  );

  assert.doesNotMatch(
    migration,
    /^\s*(DELETE\s+FROM|TRUNCATE)\b/im,
  );

  assert.doesNotMatch(
    migration,
    /ON DELETE CASCADE/,
  );

  assert.match(
    migration,
    /ON DELETE RESTRICT/,
  );
});

test("existing chapters remain supported while optional top-level parts extend hierarchy", () => {
  assert.match(schema, /model BookPart \{/);
  assert.match(schema, /partId\s+String\?/);
  assert.match(
    schema,
    /model BookChapter \{[\s\S]*unitId\s+String\?/,
  );
  assert.match(
    schema,
    /model BookTopic \{[\s\S]*moduleId\s+String\?/,
  );
  assert.match(
    structureService,
    /type BookStructureNodeType = "PART" \| "UNIT" \| "CHAPTER" \| "MODULE" \| "TOPIC"/,
  );
});

test("structure ordering, moves, duplication, and archive lifecycle persist behind the single Content Studio", () => {
  assert.match(structurePage, /redirect/);
  assert.match(contentStudioPage, /reorderContentNodeAction/);
  assert.match(
    structureService,
    /reorderBookStructureNodes/,
  );
  assert.match(structureService, /moveBookStructureNode/);
  assert.match(
    structureService,
    /duplicateBookStructureNode/,
  );
  assert.match(
    structureService,
    /setBookStructureNodeArchived/,
  );

  assert.doesNotMatch(
    structureService,
    /book(Part|Unit|Chapter|Module|Topic)\.delete/,
  );
});

test("book features are reusable, unique, ordered, highlighted, and archived instead of deleted", () => {
  assert.match(schema, /model BookFeatureDefinition \{/);
  assert.match(schema, /model BookFeatureAssignment \{/);
  assert.match(schema, /@@unique\(\[bookId, featureId\]\)/);
  assert.match(featureService, /highlighted/);
  assert.match(featureService, /displayOrder/);

  assert.doesNotMatch(
    featureService,
    /bookFeatureDefinition\.delete|bookFeatureAssignment\.delete/,
  );
});

test("digital content links reuse resource files and support all stable target levels", () => {
  assert.match(schema, /model BookResourceLink \{/);

  assert.match(
    schema,
    /enum BookContentTargetType \{[\s\S]*BOOK[\s\S]*PART[\s\S]*UNIT[\s\S]*CHAPTER[\s\S]*MODULE[\s\S]*TOPIC/,
  );

  assert.match(resourceLinks, /resourceId_targetKey/);

  assert.doesNotMatch(
    resourceLinks,
    /fileUrl|copyFile|upload/,
  );

  assert.match(resourceLinks, /qrEligible/);
});

test("school entitlement pages are responsive management lists without wide tables", () => {
  for (const source of [bookPage, resourcePage]) {
    assert.match(source, /grid gap-2[^\"]*lg:grid-cols-\[/);
    assert.match(source, /flex flex-wrap/);
    assert.doesNotMatch(
      source,
      /<table|min-w-\[\d+px\]|overflow-x-auto/,
    );
  }
});

test("school admins cannot mutate publisher content through entitlement routes", () => {
  assert.match(
    entitlementService,
    /requireLivePublisherAdmin/,
  );

  assert.doesNotMatch(
    entitlementService,
    /requireSchool\(\)/,
  );

  assert.match(
    structureService,
    /requireLivePublisherAdmin/,
  );

  assert.match(
    featureService,
    /requireLivePublisherAdmin/,
  );
});