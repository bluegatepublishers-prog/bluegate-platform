import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(path.join(root, "prisma/migrations/20260812000000_publisher_worksheet_release_foundation/migration.sql"), "utf8");

test("PublisherWorksheetItem is an ordered reusable BookQuestion join", () => {
  const item = schema.slice(schema.indexOf("model PublisherWorksheetItem {"), schema.indexOf("model TeacherQuestion {"));
  assert.match(item, /worksheetId\s+String/u);
  assert.match(item, /questionId\s+String/u);
  assert.match(item, /position\s+Int/u);
  assert.match(item, /@@unique\(\[worksheetId, questionId\]\)/u);
  assert.match(item, /@@index\(\[worksheetId, position\]\)/u);
  assert.match(item, /onDelete: Cascade/u);
  assert.match(item, /onDelete: Restrict/u);
  assert.match(schema, /worksheetItems\s+PublisherWorksheetItem\[\]/u);
  assert.match(schema, /items\s+PublisherWorksheetItem\[\]/u);
});

test("student practice attempts may retain an immutable worksheet release version", () => {
  const attempt = schema.slice(schema.indexOf("model StudentPracticeAttempt {"), schema.indexOf("model StudentPracticeResponse {"));
  assert.match(attempt, /contentReleaseVersionId\s+String\?/u);
  assert.match(attempt, /ContentReleaseVersion\?/u);
  assert.match(attempt, /onDelete: Restrict/u);
  assert.match(attempt, /@@index\(\[contentReleaseVersionId\]\)/u);
  assert.match(schema, /practiceAttempts\s+StudentPracticeAttempt\[\].*StudentPracticeAttemptReleaseVersion/u);
});

test("migration is additive and preserves legacy exercise relations", () => {
  assert.match(schema, /exerciseId\s+String\?/u);
  assert.match(schema, /worksheets\s+PublisherWorksheet\[\]/u);
  assert.match(migration, /CREATE TABLE "PublisherWorksheetItem"/u);
  assert.match(migration, /ADD COLUMN "contentReleaseVersionId" TEXT/u);
  assert.doesNotMatch(migration, /\bDROP\s+(?:TABLE|COLUMN|TYPE)\b|\bDELETE\s+FROM\b|\bTRUNCATE\s+TABLE\b/iu);
});
