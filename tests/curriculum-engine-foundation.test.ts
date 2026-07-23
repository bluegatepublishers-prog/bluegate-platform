import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/20260724000000_curriculum_engine_foundation/migration.sql",
  "utf8",
);
const knowledgeActions = readFileSync("app/admin/books/[id]/knowledge-actions.ts", "utf8");
const migrationDirs = readdirSync("prisma/migrations", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

function modelBlock(modelName: string): string {
  const match = schema.match(new RegExp(`model\\s+${modelName}\\s+\\{([\\s\\S]*?)\\n\\}`));
  assert.ok(match, `Expected model ${modelName} to exist`);
  return match[1];
}

test("curriculum foundation models exist in prisma schema", () => {
  for (const modelName of [
    "BookEdition",
    "BookUnit",
    "BookModule",
    "BookTopic",
    "BookExercise",
    "VideoLesson",
  ]) {
    assert.ok(schema.includes(`model ${modelName} {`), `${modelName} model missing`);
  }
  assert.ok(schema.includes("enum CurriculumExerciseType {"));
  assert.ok(schema.includes("enum CurriculumDifficultyLevel {"));
});

test("new curriculum models keep required parent ownership fields", () => {
  assert.match(modelBlock("BookEdition"), /\n\s*bookId\s+String/);
  assert.match(modelBlock("BookUnit"), /\n\s*bookId\s+String/);
  assert.match(modelBlock("BookModule"), /\n\s*bookId\s+String/);
  assert.match(modelBlock("BookModule"), /\n\s*chapterId\s+String/);
  assert.match(modelBlock("BookTopic"), /\n\s*bookId\s+String/);
  assert.match(modelBlock("BookTopic"), /\n\s*chapterId\s+String/);
  assert.match(modelBlock("BookTopic"), /\n\s*moduleId\s+String/);
  assert.match(modelBlock("BookExercise"), /\n\s*bookId\s+String/);
  assert.match(modelBlock("BookExercise"), /\n\s*chapterId\s+String/);
  assert.match(modelBlock("VideoLesson"), /\n\s*publisherId\s+String/);
  assert.match(modelBlock("VideoLesson"), /\n\s*bookId\s+String/);
});

test("legacy chapter ownership remains required on existing chapter-centric models", () => {
  assert.match(modelBlock("BookQuestion"), /\n\s*chapterId\s+String/);
  assert.match(modelBlock("ChapterLearningOutcome"), /\n\s*chapterId\s+String/);
  assert.match(modelBlock("ChapterActivity"), /\n\s*chapterId\s+String/);
  assert.match(modelBlock("StudentPracticeAttempt"), /\n\s*chapterId\s+String/);
  assert.match(modelBlock("StudentRevisionProgress"), /\n\s*chapterId\s+String/);
});

test("new curriculum references on legacy models are nullable", () => {
  assert.match(modelBlock("BookChapter"), /\n\s*unitId\s+String\?/);
  assert.match(modelBlock("BookChapter"), /\n\s*editionId\s+String\?/);
  assert.match(modelBlock("BookQuestion"), /\n\s*exerciseId\s+String\?/);
  assert.match(modelBlock("BookQuestion"), /\n\s*moduleId\s+String\?/);
  assert.match(modelBlock("BookQuestion"), /\n\s*topicId\s+String\?/);
  assert.match(modelBlock("ChapterLearningOutcome"), /\n\s*moduleId\s+String\?/);
  assert.match(modelBlock("ChapterLearningOutcome"), /\n\s*topicId\s+String\?/);
  assert.match(modelBlock("ChapterActivity"), /\n\s*moduleId\s+String\?/);
  assert.match(modelBlock("ChapterActivity"), /\n\s*topicId\s+String\?/);
  assert.match(modelBlock("ChapterActivity"), /\n\s*exerciseId\s+String\?/);
  assert.match(modelBlock("Resource"), /\n\s*editionId\s+String\?/);
  assert.match(modelBlock("Resource"), /\n\s*unitId\s+String\?/);
  assert.match(modelBlock("Resource"), /\n\s*chapterId\s+String\?/);
  assert.match(modelBlock("Resource"), /\n\s*moduleId\s+String\?/);
  assert.match(modelBlock("Resource"), /\n\s*topicId\s+String\?/);
  assert.match(modelBlock("Resource"), /\n\s*exerciseId\s+String\?/);
});

test("book topic keywords and exercise difficulty use typed curriculum fields", () => {
  const topic = modelBlock("BookTopic");
  const exercise = modelBlock("BookExercise");
  assert.match(topic, /\n\s*keywords\s+String\[\]\s+@default\(\[\]\)/);
  assert.match(exercise, /\n\s*difficulty\s+CurriculumDifficultyLevel\?/);
  assert.doesNotMatch(exercise, /\n\s*difficulty\s+String\?/);
});

test("stable curriculum code fields are nullable and indexed by parent scope", () => {
  const edition = modelBlock("BookEdition");
  const unit = modelBlock("BookUnit");
  const moduleModel = modelBlock("BookModule");
  const topic = modelBlock("BookTopic");
  const exercise = modelBlock("BookExercise");

  assert.match(edition, /\n\s*code\s+String\?/);
  assert.match(unit, /\n\s*code\s+String\?/);
  assert.match(moduleModel, /\n\s*code\s+String\?/);
  assert.match(topic, /\n\s*code\s+String\?/);
  assert.match(exercise, /\n\s*code\s+String\?/);

  assert.match(edition, /@@index\(\[bookId,\s*code\]\)/);
  assert.match(unit, /@@index\(\[bookId,\s*code\]\)/);
  assert.match(unit, /@@index\(\[editionId,\s*code\]\)/);
  assert.match(moduleModel, /@@index\(\[chapterId,\s*code\]\)/);
  assert.match(topic, /@@index\(\[moduleId,\s*code\]\)/);
  assert.match(exercise, /@@index\(\[chapterId,\s*code\]\)/);
  assert.match(exercise, /@@index\(\[topicId,\s*code\]\)/);
});

test("publisher admin content actions remain book-owned and cross-tenant guarded", () => {
  assert.match(knowledgeActions, /requireOwnedBookForAction/);
  assert.match(knowledgeActions, /reasonCode:\s*"CROSS_TENANT_SCOPE"/);
  assert.match(knowledgeActions, /where:\s*\{\s*id:\s*chapterId,\s*bookId\s*\}/);
});

test("curriculum migration is additive and non-destructive", () => {
  assert.match(migration, /CREATE TABLE "BookEdition"/);
  assert.match(migration, /CREATE TABLE "BookUnit"/);
  assert.match(migration, /CREATE TABLE "BookModule"/);
  assert.match(migration, /CREATE TABLE "BookTopic"/);
  assert.match(migration, /CREATE TABLE "BookExercise"/);
  assert.match(migration, /CREATE TABLE "VideoLesson"/);
  assert.match(migration, /CREATE TYPE "CurriculumDifficultyLevel" AS ENUM/);
  assert.match(migration, /"difficulty"\s+"CurriculumDifficultyLevel"/);
  assert.match(migration, /"keywords"\s+TEXT\[\]\s+DEFAULT\s+ARRAY\[\]::TEXT\[\]/);
  assert.match(migration, /"code"\s+TEXT/);
  assert.match(migration, /ALTER TABLE "BookChapter"\s+ADD COLUMN "unitId"/);
  assert.doesNotMatch(migration, /\bDROP\s+TABLE\b/i);
  assert.doesNotMatch(migration, /\bDROP\s+COLUMN\b/i);
  assert.doesNotMatch(migration, /\bRENAME\s+TABLE\b/i);
  assert.doesNotMatch(migration, /\bRENAME\s+COLUMN\b/i);
});

test("exactly one curriculum foundation migration exists", () => {
  const curriculumMigrations = migrationDirs.filter((name) =>
    name.includes("curriculum_engine_foundation"),
  );
  assert.equal(curriculumMigrations.length, 1);
  assert.equal(curriculumMigrations[0], "20260724000000_curriculum_engine_foundation");
});
