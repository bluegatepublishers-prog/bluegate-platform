import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  path.join(root, "prisma/migrations/20260816000000_publisher_assessment_foundation/migration.sql"),
  "utf8",
);
const service = readFileSync(path.join(root, "lib/publisher-assessment.ts"), "utf8");

test("publisher assessments are additive publisher-and-book definitions with ordered BookQuestion references", () => {
  const assessment = schema.slice(schema.indexOf("model PublisherAssessment {"), schema.indexOf("model PublisherAssessmentItem {"));
  const item = schema.slice(schema.indexOf("model PublisherAssessmentItem {"), schema.indexOf("enum PublisherAssessmentKind {"));
  assert.match(assessment, /publisherId\s+String/u);
  assert.match(assessment, /bookId\s+String/u);
  assert.match(assessment, /kind\s+PublisherAssessmentKind/u);
  assert.match(assessment, /deliveryMode\s+PublisherAssessmentDeliveryMode/u);
  assert.match(assessment, /status\s+PublisherAssessmentStatus/u);
  assert.match(assessment, /chapterId\s+String\?/u);
  assert.match(assessment, /moduleId\s+String\?/u);
  assert.match(assessment, /unitId\s+String\?/u);
  assert.match(assessment, /partId\s+String\?/u);
  assert.match(item, /assessmentId\s+String/u);
  assert.match(item, /questionId\s+String/u);
  assert.match(item, /question\s+BookQuestion/u);
  assert.match(item, /@@unique\(\[assessmentId, questionId\]\)/u);
  assert.match(item, /@@index\(\[assessmentId, position\]\)/u);
  assert.doesNotMatch(assessment + item, /TeacherQuestion|schoolId|sectionId|academicYearId/u);
});

test("publisher assessment kinds and delivery modes cover the agreed reusable foundation", () => {
  for (const kind of [
    "CHAPTER_TEST",
    "MULTI_CHAPTER_TEST",
    "UNIT_TEST",
    "TERM_TEST",
    "MULTI_TERM_TEST",
    "BOOK_TEST",
    "EXAM",
    "FINAL_EXAM",
    "DIAGNOSTIC",
  ]) {
    assert.match(schema, new RegExp(`\\b${kind}\\b`, "u"));
    assert.match(service, new RegExp(`${kind}:\\s+\"`, "u"));
  }
  for (const mode of ["INTERACTIVE", "PRINT", "BOTH"]) assert.match(schema, new RegExp(`\\b${mode}\\b`, "u"));
  assert.match(service, /getPublisherAssessmentHeading\(kind: PublisherAssessmentKind\)/u);
  const assessment = schema.slice(schema.indexOf("model PublisherAssessment {"), schema.indexOf("model PublisherAssessmentItem {"));
  assert.doesNotMatch(assessment, /title\s+String/u);
});

test("services scope every assessment and question to the publisher book, require approved active questions, and protect lifecycle", () => {
  assert.match(service, /where: \{ id: bookId, publisherId \}/u);
  assert.match(service, /book: \{ publisherId: input\.publisherId \}/u);
  assert.match(service, /approved: true, archived: false/u);
  assert.match(service, /Only approved, active questions from this publisher book can be added\./u);
  assert.match(service, /A selected question is already in this assessment\./u);
  assert.match(service, /Published assessments are immutable\./u);
  assert.match(service, /Restore this assessment before changing it\./u);
  assert.match(service, /status: PublisherAssessmentStatus\.PUBLISHED/u);
  assert.match(service, /status: PublisherAssessmentStatus\.ARCHIVED/u);
  assert.match(service, /status: PublisherAssessmentStatus\.DRAFT, archivedAt: null, publishedAt: null/u);
  assert.doesNotMatch(service, /teacherQuestion|TeacherQuestion/u);
});

test("item membership is duplicate-safe and ordering is stable", () => {
  assert.match(service, /new Set\(input\.questionIds\.filter\(Boolean\)\)/u);
  assert.match(service, /position: \(last\._max\.position \?\? -1\) \+ index \+ 1/u);
  assert.match(service, /orderBy: \[\{ position: "asc" \}, \{ id: "asc" \}\]/u);
  assert.match(service, /direction !== -1 && input\.direction !== 1/u);
  assert.match(service, /position: neighbor\.position/u);
  assert.match(service, /position: current\.position/u);
});

test("migration contains only additive publisher assessment objects", () => {
  assert.match(migration, /CREATE TYPE "PublisherAssessmentKind"/u);
  assert.match(migration, /CREATE TYPE "PublisherAssessmentDeliveryMode"/u);
  assert.match(migration, /CREATE TYPE "PublisherAssessmentStatus"/u);
  assert.match(migration, /CREATE TABLE "PublisherAssessment"/u);
  assert.match(migration, /CREATE TABLE "PublisherAssessmentItem"/u);
  assert.match(migration, /REFERENCES "BookQuestion"/u);
  assert.doesNotMatch(migration, /\bDROP\s+(?:TABLE|COLUMN|TYPE)\b|\bDELETE\s+FROM\b|\bTRUNCATE\s+TABLE\b/iu);
});
