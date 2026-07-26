import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { ResourceAudience, ResourceType } from "@prisma/client";
import { buildAdminResourceWhere } from "../lib/resource-access-policy";
import { validateResourceAudience } from "../lib/resource-audience-ui";

const source = (path: string) => readFileSync(resolve(path), "utf8");

test("Admin list combines audience, type, and search without losing publisher scope", () => {
  const where = buildAdminResourceWhere("publisher-a", {
    query: "science",
    type: ResourceType.PDF,
    audience: ResourceAudience.STUDENT,
  });
  assert.equal(where.publisherId, "publisher-a");
  assert.equal(where.type, ResourceType.PDF);
  assert.equal(where.audience, ResourceAudience.STUDENT);
  assert.deepEqual(where.OR, [
    { title: { contains: "science", mode: "insensitive" } },
    { subject: { contains: "science", mode: "insensitive" } },
    { classLevel: { contains: "science", mode: "insensitive" } },
  ]);
});

test("invalid Admin audience is ignored safely while publisher scope remains", () => {
  const audience = validateResourceAudience("PUBLIC");
  const where = buildAdminResourceWhere("publisher-a", {
    audience: audience ?? undefined,
  });
  assert.equal(audience, null);
  assert.equal(where.publisherId, "publisher-a");
  assert.equal(where.audience, undefined);
});

test("Admin update and delete first look up the resource inside publisher scope", () => {
  const route = source("app/api/admin/resources/[id]/route.ts");
  assert.equal(route.match(/findFirst\(\{ where: \{ id, publisherId:actor\.publisherId \} \}\)/g)?.length, 2);
  assert.match(route, /updateMany\([\s\S]*publisherId: actor\.publisherId/);
  assert.match(route, /updateMany\(\{[\s\S]*where: \{ id, publisherId: actor\.publisherId \}[\s\S]*archived: true/);
  const deleteHandler = route.slice(route.indexOf("export async function DELETE"));
  assert.doesNotMatch(deleteHandler, /deleteMany\(/);
});

test("Admin direct edit uses centralized live publisher ownership", () => {
  const page = source("app/admin/resources/[id]/edit/page.tsx");
  assert.match(page, /requirePublisherAdminResourceOwnership/);
  assert.ok(
    page.indexOf("requirePublisherAdminResourceOwnership(id)") <
      page.indexOf("<ResourceForm resource={resource}"),
  );
});

test("teacher preview resolves central access before using protected metadata", () => {
  const dashboard = source("lib/teacher-dashboard.ts");
  const details = dashboard.slice(dashboard.indexOf("export async function getResourceDetails"));
  assert.ok(
    details.indexOf("requireTeacherResourceEntitlementAccess") <
      details.indexOf("const resource=entitlementAccess.resource"),
  );
  assert.match(details, /if\(!entitlementAccess\)notFound\(\)/);
});

test("teacher and school direct download routes delegate to the protected service", () => {
  for (const path of [
    "app/api/resources/[id]/download/route.ts",
    "app/api/school/resources/[id]/download/route.ts",
  ]) {
    const route = source(path);
    assert.match(route, /prepareProtectedResourceDownload/);
    assert.match(route, /private, no-store/);
    assert.doesNotMatch(route, /resource\.fileUrl/);
  }
});

test("download and bookmark routes delegate to centralized authorize-first helpers", () => {
  const download = source("app/api/resources/[id]/download/route.ts");
  const bookmark = source("app/api/resources/[id]/bookmark/route.ts");
  assert.match(download, /prepareProtectedResourceDownload/);
  assert.doesNotMatch(download, /prisma\.download\.create/);
  assert.match(bookmark, /authorizeAndCreateResourceBookmark/);
  assert.match(bookmark, /authorizeAndRemoveResourceBookmark/);
  assert.doesNotMatch(bookmark, /prisma\.bookmark\.(create|deleteMany)/);
});

test("RESOURCES feature is enforced by layouts, routes, and the content Server Action", () => {
  for (const path of [
    "app/admin/resources/layout.tsx",
    "app/teacher-dashboard/resources/layout.tsx",
    "app/school-dashboard/resources/layout.tsx",
  ]) {
    const layout = source(path);
    assert.match(layout, /requirePublisherFeature/);
    assert.match(layout, /PlatformFeatureKey\.RESOURCES/);
  }
  for (const path of [
    "app/api/admin/resources/route.ts",
    "app/api/admin/resources/[id]/route.ts",
  ]) {
    const route = source(path);
    assert.match(route, /isPublisherFeatureEnabled/);
    assert.match(route, /PlatformFeatureKey\.RESOURCES/);
  }
  const action = source("app/school-dashboard/academic-actions.ts");
  assert.match(
    action,
    /isPublisherFeatureEnabled\(school\.publisherId,PlatformFeatureKey\.RESOURCES\)/,
  );
});

test("migration conservatively defaults every existing row to teacher-only", () => {
  const sql = source(
    "prisma/migrations/20260713120000_resource_audience_classification/migration.sql",
  );
  assert.match(sql, /CREATE TYPE "ResourceAudience" AS ENUM \('TEACHER_ONLY', 'STUDENT', 'BOTH'\)/);
  assert.match(
    sql,
    /ADD COLUMN "audience" "ResourceAudience" NOT NULL DEFAULT 'TEACHER_ONLY'/,
  );
  assert.doesNotMatch(sql, /DEFAULT '(STUDENT|BOTH)'|UPDATE[\s\S]+(STUDENT|BOTH)/i);
});

test("migration creates the audience index and contains no destructive operation", () => {
  const sql = source(
    "prisma/migrations/20260713120000_resource_audience_classification/migration.sql",
  );
  assert.match(sql, /Resource_publisherId_audience_published_idx/);
  assert.match(sql, /\("publisherId", "audience", "published"\)/);
  assert.doesNotMatch(sql, /\b(DROP|DELETE|TRUNCATE)\b/i);
});

test("migration does not use the new enum in a same-transaction data update", () => {
  const sql = source(
    "prisma/migrations/20260713120000_resource_audience_classification/migration.sql",
  );
  assert.ok(sql.indexOf("CREATE TYPE") < sql.indexOf("ALTER TABLE"));
  assert.doesNotMatch(sql, /\bBEGIN\b|\bCOMMIT\b|\bUPDATE\b/i);
});
