import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const migration = readFileSync(new URL("../prisma/migrations/20260809000000_student_work_layer/migration.sql", import.meta.url), "utf8");

function modelBlock(name: string) {
  const match = schema.match(new RegExp("model " + name + " \\{([\\s\\S]*?)\\n\\}"));
  assert.ok(match, "Expected Prisma model " + name);
  return match[1];
}

test("StudentWorkType contains the complete additive V2 work vocabulary", () => {
  const match = schema.match(/enum StudentWorkType \{([\s\S]*?)\n\}/);
  assert.ok(match);
  assert.deepEqual(
    match[1].trim().split(/\s+/),
    ["ANSWER", "NOTE", "HIGHLIGHT", "BOOKMARK", "COMPLETION", "READING_POSITION"],
  );
  assert.match(migration, /CREATE TYPE "StudentWorkType" AS ENUM \('ANSWER', 'NOTE', 'HIGHLIGHT', 'BOOKMARK', 'COMPLETION', 'READING_POSITION'\)/);
});

test("StudentWorkItem stores tenant scope, stable targets, hashes, payload, and revision", () => {
  const block = modelBlock("StudentWorkItem");
  for (const field of [
    "studentId",
    "schoolId",
    "publisherId",
    "bookId",
    "academicYearId",
    "chapterId",
    "moduleId",
    "type",
    "targetKey",
    "pageId",
    "frameId",
    "childFrameId",
    "questionId",
    "segmentId",
    "masterSourceHash",
    "targetSourceHash",
    "payload",
    "revision",
  ]) {
    assert.match(block, new RegExp("\\b" + field + "\\b"));
  }
  assert.match(block, /@@unique\(\[studentId, schoolId, publisherId, bookId, academicYearId, type, targetKey\]\)/);
  assert.match(block, /@@index\(\[studentId, bookId, academicYearId\]\)/);
  assert.match(block, /@@index\(\[studentId, bookId, pageId\]\)/);
  assert.match(block, /@@index\(\[studentId, moduleId\]\)/);
  assert.match(block, /@@index\(\[bookId, targetKey\]\)/);
});

test("StudentWorkAttempt is historical, unique per work item and has no question-table foreign key", () => {
  const block = modelBlock("StudentWorkAttempt");
  assert.match(block, /workItemId/);
  assert.match(block, /attemptNumber/);
  assert.match(block, /payload/);
  assert.match(block, /@@unique\(\[workItemId, attemptNumber\]\)/);
  assert.match(block, /@@index\(\[workItemId, createdAt\]\)/);
  assert.doesNotMatch(migration, /REFERENCES "BookQuestion"/);
});

test("student work relations are additive and preserve legacy persistence models", () => {
  for (const model of [
    "StudentBookProgress",
    "StudentBookBookmark",
    "StudentRevisionProgress",
    "StudentPracticeResponse",
    "BookQuestion",
  ]) {
    assert.match(schema, new RegExp("model " + model + " \\{"));
  }
  assert.match(schema, /studentWorkItems\s+StudentWorkItem\[\]/);
  assert.match(schema, /studentNotes\s+Json\?/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|ALTER TABLE "(StudentBookProgress|StudentBookBookmark|StudentRevisionProgress|StudentPracticeResponse|BookQuestion)"/);
});

test("StudentWorkItem uses stable semantic identity rather than resource or coordinate persistence", () => {
  const block = modelBlock("StudentWorkItem");
  assert.doesNotMatch(block, /^\s+(resourceId|signedUrl|r2Key|x|y|width|height)\s+/m);
  assert.match(block, /targetKey\s+String\s+@db\.VarChar\(512\)/);
  assert.match(block, /pageId\s+String\?/);
  assert.match(block, /frameId\s+String\?/);
  assert.match(block, /questionId\s+String\?/);
});
