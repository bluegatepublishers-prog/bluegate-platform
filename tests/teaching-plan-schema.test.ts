import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const migration = readFileSync(
  new URL("../prisma/migrations/20260809010000_teaching_plan_period_pages/migration.sql", import.meta.url),
  "utf8",
);

function modelBlock(name: string) {
  const match = schema.match(new RegExp("model " + name + " \\{([\\s\\S]*?)\\n\\}"));
  assert.ok(match, "Expected Prisma model " + name);
  return match[1];
}

test("teaching plan persistence models exist with normalized ownership scope", () => {
  const plan = modelBlock("TeachingPlan");
  const period = modelBlock("TeachingPeriod");
  const pageRef = modelBlock("TeachingPeriodPageRef");

  for (const model of ["TeachingPlan", "TeachingPeriod", "TeachingPeriodPageRef"]) {
    assert.match(schema, new RegExp("model " + model + " \\{"));
  }

  for (const field of ["schoolId", "academicYearId", "sectionSubjectId", "teacherId", "bookId"]) {
    assert.match(plan, new RegExp("\\b" + field + "\\b"));
  }
  assert.doesNotMatch(plan, /\bsectionId\b/);
  assert.match(plan, /school\s+School\s+@relation/);
  assert.match(plan, /academicYear\s+AcademicYear\s+@relation/);
  assert.match(plan, /sectionSubject\s+SectionSubject\s+@relation/);
  assert.match(plan, /teacher\s+Teacher\s+@relation/);
  assert.match(plan, /book\s+Book\s+@relation/);
  assert.match(plan, /periods\s+TeachingPeriod\[\]/);
  assert.match(plan, /@@unique\(\[schoolId, academicYearId, sectionSubjectId, teacherId, bookId\]\)/);

  assert.match(period, /planId\s+String/);
  assert.match(period, /sequence\s+Int/);
  assert.match(period, /title\s+String/);
  assert.match(period, /pageRefs\s+TeachingPeriodPageRef\[\]/);
  assert.match(period, /@@unique\(\[planId, sequence\]\)/);

  assert.match(pageRef, /periodId\s+String/);
  assert.match(pageRef, /pageId\s+String/);
  assert.match(pageRef, /sequence\s+Int/);
  assert.match(pageRef, /period\s+TeachingPeriod\s+@relation/);
});

test("a teaching period is independently persistable with zero page references", () => {
  const period = modelBlock("TeachingPeriod");
  assert.match(period, /pageRefs\s+TeachingPeriodPageRef\[\]/);
  assert.doesNotMatch(period, /pageRefId\s+String/);
  assert.doesNotMatch(period, /pageRefs\s+TeachingPeriodPageRef\?\s/);
});

test("page references use stable V2 page identity without a page table or coordinate identity", () => {
  const pageRef = modelBlock("TeachingPeriodPageRef");

  assert.match(pageRef, /pageId\s+String(?!\?)/);
  assert.doesNotMatch(pageRef, /\b(bookId|pageNumber|pageIndex|bookPageNumber|displayOrder|visualMode)\b/);
  assert.doesNotMatch(schema, /model (V2Page|ContentPage|BookPage) \{/);
  assert.doesNotMatch(migration, /CREATE TABLE "(V2Page|ContentPage|BookPage)"/);
});

test("page references support optional module context and source snapshots", () => {
  const pageRef = modelBlock("TeachingPeriodPageRef");
  assert.match(pageRef, /moduleId\s+String\?/);
  assert.match(pageRef, /pageSourceHash\s+String\?/);
  assert.doesNotMatch(pageRef, /\bbookId\b/);
  assert.doesNotMatch(pageRef, /visualMode/);
});

test("period and page-reference order is explicit and unique within its parent", () => {
  const period = modelBlock("TeachingPeriod");
  const pageRef = modelBlock("TeachingPeriodPageRef");

  assert.match(period, /@@unique\(\[planId, sequence\]\)/);
  assert.match(pageRef, /@@unique\(\[periodId, sequence\]\)/);
  assert.match(pageRef, /@@index\(\[pageId\]\)/);
  assert.match(pageRef, /@@index\(\[moduleId\]\)/);
  assert.match(migration, /TeachingPeriod_planId_sequence_key/);
  assert.match(migration, /TeachingPeriodPageRef_periodId_sequence_key/);
});

test("a page may be reused across periods but not duplicated within one period", () => {
  const pageRef = modelBlock("TeachingPeriodPageRef");

  assert.match(pageRef, /@@unique\(\[periodId, pageId\]\)/);
  assert.doesNotMatch(pageRef, /@@unique\(\[pageId\]\)/);
  assert.match(migration, /TeachingPeriodPageRef_periodId_pageId_key/);
  assert.doesNotMatch(migration, /UNIQUE INDEX "[^"]*pageId_key"[^;]*\("pageId"\)/);
});

test("delete policies preserve parent records and cascade only plan-owned children", () => {
  const plan = modelBlock("TeachingPlan");
  const period = modelBlock("TeachingPeriod");
  const pageRef = modelBlock("TeachingPeriodPageRef");

  assert.match(plan, /onDelete:\s+Restrict/);
  assert.match(period, /onDelete:\s+Cascade/);
  assert.match(pageRef, /onDelete:\s+Cascade/);
  assert.match(migration, /TeachingPeriod_planId_fkey[^]*?ON DELETE CASCADE/);
  assert.match(migration, /TeachingPeriodPageRef_periodId_fkey[^]*?ON DELETE CASCADE/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|ALTER TABLE "(AcademicPlannerItem|AcademicPlannerReschedule|StudentWorkItem|StudentWorkAttempt)"/);
});

test("migration is additive and does not couple teaching plans to student work or assignments", () => {
  assert.deepEqual(
    [...migration.matchAll(/CREATE TABLE "([^"]+)"/g)].map((match) => match[1]),
    ["TeachingPlan", "TeachingPeriod", "TeachingPeriodPageRef"],
  );
  assert.doesNotMatch(migration, /StudentWorkItem|StudentWorkAttempt|Classwork|Homework|Assignment|Submission/);

  const plan = modelBlock("TeachingPlan");
  assert.doesNotMatch(plan, /StudentWorkItem|StudentWorkAttempt|Classwork|Homework|Assignment|Submission/);
});