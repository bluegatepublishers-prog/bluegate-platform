import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(path), "utf8");

test("full-book route authorizes before selecting and preparing protected storage", () => {
  const route = source("app/api/books/[bookId]/full-pdf/route.ts");
  const authorize = route.indexOf("const decision = await getBookEntitlementForAuthenticatedUser");
  const selectUrl = route.indexOf("fullBookPdf: true");
  const readObject = route.indexOf("getObjectBytes");
  assert.ok(authorize >= 0 && authorize < selectUrl && selectUrl < readObject);
  assert.doesNotMatch(route, /NextResponse\.redirect|createSignedDownloadUrl/);
  assert.match(route, /proxyLegacyBlob/);
  assert.match(route, /Cache-Control":\s*"private, no-store"/);
  assert.match(route, /Referrer-Policy":\s*"no-referrer"/);
});

test("full-book denial uses a centralized safe message", () => {
  const route = source("app/api/books/[bookId]/full-pdf/route.ts");
  assert.match(route, /SAFE_ENTITLEMENT_MESSAGES\.book/);
  assert.doesNotMatch(route, /wrong publisher|adoption status|NO_ASSIGNMENT/i);
});

test("teacher AI generation uses centralized book entitlement", () => {
  const action = source("app/teacher-dashboard/ai/actions.ts");
  assert.match(action, /getBookEntitlementForAuthenticatedUser/);
  assert.match(action, /SAFE_ENTITLEMENT_MESSAGES\.book/);
  assert.doesNotMatch(action, /canTeacherAccessBook/);
  const generation = action.slice(action.indexOf("export async function generateQuestionPaper"));
  assert.ok(
    generation.indexOf("await getBookEntitlementForAuthenticatedUser") <
      generation.indexOf("await executeAiGeneration"),
  );
});

test("teacher AI draft preparation authorizes browser-supplied book before collection", () => {
  const action = source("app/teacher-dashboard/ai/actions.ts");
  const draft = action.slice(
    action.indexOf("export async function saveBuilderDraft"),
    action.indexOf("export async function updateGenerationDraft"),
  );
  assert.ok(
    draft.indexOf("await getBookEntitlementForAuthenticatedUser") <
      draft.indexOf("await prepareQuestionPaperDraft"),
  );
  assert.match(draft, /SAFE_ENTITLEMENT_MESSAGES\.book/);
});

test("teacher AI book selectors are limited to centrally entitled IDs", () => {
  const studio = source("lib/ai-studio.ts");
  assert.equal(studio.match(/getTeacherEntitledBookIds/g)?.length, 3);
  assert.equal(studio.match(/id:\{in:bookIds\}/g)?.length, 2);
});

test("resource bookmark and download mutation defaults use entitlement service", () => {
  const mutations = source("lib/resource-mutations.ts");
  assert.match(mutations, /requireTeacherResourceEntitlementAccess/);
  assert.doesNotMatch(mutations, /requireTeacherResourceAccess/);
});

test("Phase 8.4 migration is additive, historical, and contains no premium backfill", () => {
  const sql = source(
    "prisma/migrations/20260713140000_computed_entitlement_and_student_access_foundation/migration.sql",
  );
  assert.match(sql, /CREATE TYPE "StudentAccessPlan"/);
  assert.match(sql, /CREATE TABLE "StudentAccessGrant"/);
  assert.match(sql, /"studentId" TEXT NOT NULL/);
  assert.match(sql, /"academicYearId" TEXT NOT NULL/);
  assert.match(sql, /"startsAt" TIMESTAMP\(3\) NOT NULL/);
  assert.match(sql, /"endsAt" TIMESTAMP\(3\)/);
  assert.doesNotMatch(sql, /^\s*(DROP|DELETE|TRUNCATE|UPDATE|INSERT)\b/im);
  assert.doesNotMatch(sql, /payment|checkout|invoice|refund/i);
});

test("Phase 8.4 migration does not alter the Phase 8.3 migration", () => {
  const phase83 = source(
    "prisma/migrations/20260713120000_resource_audience_classification/migration.sql",
  );
  assert.equal(
    phase83,
    "CREATE TYPE \"ResourceAudience\" AS ENUM ('TEACHER_ONLY', 'STUDENT', 'BOTH');\n\nALTER TABLE \"Resource\"\nADD COLUMN \"audience\" \"ResourceAudience\" NOT NULL DEFAULT 'TEACHER_ONLY';\n\nCREATE INDEX \"Resource_publisherId_audience_published_idx\"\nON \"Resource\"(\"publisherId\", \"audience\", \"published\");\n",
  );
});
