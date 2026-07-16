import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { decidePremiumFeatureEntitlement } from "../lib/entitlements/features-policy";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("reports use the existing publisher feature and premium matrix", async () => {
  const features = await read("lib/entitlements/features.ts");
  assert.match(features, /REPORTS: PlatformFeatureKey\.REPORTS/);
  assert.equal(decidePremiumFeatureEntitlement({ plan: "SCHOOL_BASIC", feature: "REPORTS", publisherFeatureEnabled: true }).allowed, false);
  assert.equal(decidePremiumFeatureEntitlement({ plan: "SCHOOL_PREMIUM", feature: "REPORTS", publisherFeatureEnabled: true }).allowed, true);
  assert.equal(decidePremiumFeatureEntitlement({ plan: "SCHOOL_PREMIUM", feature: "REPORTS", publisherFeatureEnabled: false }).allowed, false);
});

test("all completed learning flows record analytics inside their source transaction", async () => {
  for (const file of ["lib/student-books.ts", "lib/student-revision.ts", "lib/student-practice.ts", "lib/student-assessments.ts", "lib/ai/student-quota.ts"]) {
    const source = await read(file);
    assert.match(source, /recordLearningActivity\(tx,/);
    assert.match(source, /\$transaction/);
  }
});

test("report readers query stored analytics and never source learning history", async () => {
  const source = await read("lib/analytics-reports.ts");
  for (const model of ["studentAnalytics", "studentSubjectAnalytics", "studentChapterAnalytics", "studentSkillAnalytics", "teacherAnalytics", "schoolAnalytics", "publisherAnalytics", "learningTimeline"]) assert.match(source, new RegExp(`prisma\\.${model}`));
  assert.doesNotMatch(source, /studentBookProgress|studentRevisionProgress|studentPracticeAttempt|assessmentAttempt|studentAiMessage/);
});

test("analytics never copies AI prompts or answers", async () => {
  const [service, schema] = await Promise.all([read("lib/analytics.ts"), read("prisma/schema.prisma")]);
  assert.doesNotMatch(service, /input\.(question|answer)|\b(question|answer)\??:\s*string/);
  const timeline = schema.slice(schema.indexOf("model LearningTimeline"), schema.indexOf("enum UserRole"));
  assert.doesNotMatch(timeline, /question|prompt|answer/i);
  assert.match(timeline, /aiIntent/);
});

test("analytics migration is additive, scoped, and does not enable reports", async () => {
  const sql = await read("prisma/migrations/20260714020000_learning_analytics_reporting_engine/migration.sql");
  for (const table of ["StudentAnalytics", "TeacherAnalytics", "SchoolAnalytics", "PublisherAnalytics", "LearningTimeline"]) assert.match(sql, new RegExp(`CREATE TABLE "${table}"`));
  assert.match(sql, /ON DELETE RESTRICT/);
  assert.doesNotMatch(sql, /INSERT INTO "PublisherFeature"|UPDATE "PublisherFeature"/);
  assert.doesNotMatch(sql, /DROP|TRUNCATE|DELETE FROM/i);
});

test("seed marks Reports implemented without globally enabling it", async () => {
  const seed = await read("prisma/seed.ts");
  const implemented = seed.slice(seed.indexOf("const implemented"), seed.indexOf("const enabledForBluegate"));
  const enabled = seed.slice(seed.indexOf("const enabledForBluegate"), seed.indexOf("for (const key"));
  assert.match(implemented, /PlatformFeatureKey\.REPORTS/);
  assert.doesNotMatch(enabled, /PlatformFeatureKey\.REPORTS/);
});
