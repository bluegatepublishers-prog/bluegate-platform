import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("draft generation uses gap identifiers and approved content metadata, never raw responses", () => {
  const source = read("lib/remedials/recommend.ts");
  assert.match(source, /studentLearningGap\.findUnique/);
  assert.match(source, /approved: true/);
  assert.match(source, /BookAdoptionStatus\.APPROVED/);
  assert.doesNotMatch(source, /questionText|StudentAiMessage|AssessmentResponse|practiceResponse/i);
});

test("student visibility is restricted to reviewed active or completed plans", () => {
  const source = read("lib/remedials/student.ts");
  assert.match(source, /status: \{ in: \["ACTIVE", "COMPLETED"\] \}/);
  assert.doesNotMatch(source, /DRAFT/);
});

test("teacher review is the only activation path and creates an audit record", () => {
  const source = read("lib/remedials/review.ts");
  assert.match(source, /requireTeacherGap/);
  assert.match(source, /status: RemedialPlanStatus\.ACTIVE/);
  assert.match(source, /remedialPlanReview\.create/);
});

test("migration is additive, enables no publisher, and defines tenant indexes", () => {
  const sql = read("prisma/migrations/20260714060000_personalized_remedial_learning_engine/migration.sql");
  assert.match(sql, /CREATE TABLE "RemedialPlan"/);
  assert.match(sql, /RemedialPlan_schoolId_academicYearId_status_dueAt_idx/);
  assert.match(sql, /feature_remedials/);
  assert.doesNotMatch(sql, /INSERT INTO "PublisherFeature"/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN/);
});

test("premium and feature checks guard recommendation generation", () => {
  const source = read("lib/remedials/recommend.ts");
  assert.match(source, /PlatformFeatureKey\.REMEDIALS/);
  assert.match(source, /planIncludesPremiumFeature\(plan\.plan, "REMEDIALS"\)/);
});
