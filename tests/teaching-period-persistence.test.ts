import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getTeachingPeriodPlanState,
  isTeachingPeriodActivityType,
  isTeachingPeriodMeaningfullyPlanned,
} from "../lib/teaching-period-plan-policy";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/20260824000000_period_plan_persistence_foundation/migration.sql",
  "utf8",
);
const service = readFileSync("lib/teaching-plan.ts", "utf8");
const actions = readFileSync(
  "app/teacher-dashboard/classes/[sectionId]/plan/teaching-actions.ts",
  "utf8",
);
const workspace = readFileSync("components/teacher/TeachingPlanWorkspace.tsx", "utf8");
const plannerPage = readFileSync("app/teacher-dashboard/planner/page.tsx", "utf8");
const dashboardPage = readFileSync("app/teacher-dashboard/page.tsx", "utf8");
const plannerService = readFileSync("lib/teacher-planner.ts", "utf8");

test("an empty occurrence is not meaningfully planned", () => {
  assert.equal(isTeachingPeriodMeaningfullyPlanned({}), false);
  assert.equal(getTeachingPeriodPlanState({}), "NOT_PLANNED");
  assert.equal(isTeachingPeriodMeaningfullyPlanned({ objective: "   ", notes: "" }), false);
});

test("chapter, page, objective, and notes each make a period meaningful", () => {
  for (const input of [
    { chapterId: "chapter-1" },
    { pageRefs: [{ id: "page-1" }] },
    { objective: "Read and discuss" },
    { notes: "Bring the workbook" },
  ]) {
    assert.equal(isTeachingPeriodMeaningfullyPlanned(input), true);
    assert.equal(getTeachingPeriodPlanState(input), "PLANNED");
  }
});

test("activities make a period meaningful and activity types are validated", () => {
  assert.equal(isTeachingPeriodMeaningfullyPlanned({ activities: [{ id: "activity-1" }] }), true);
  assert.equal(isTeachingPeriodMeaningfullyPlanned({ activities: [] }), false);
  assert.equal(isTeachingPeriodActivityType("CLASSWORK"), true);
  assert.equal(isTeachingPeriodActivityType("NOT_A_TYPE"), false);
});

test("assignments and assessments each make a period meaningful", () => {
  assert.equal(isTeachingPeriodMeaningfullyPlanned({ assignmentCount: 1 }), true);
  assert.equal(isTeachingPeriodMeaningfullyPlanned({ assessmentCount: 1 }), true);
  assert.equal(isTeachingPeriodMeaningfullyPlanned({ assignmentCount: 0, assessmentCount: 0 }), false);
});

test("multiple activities, assignments, and assessments remain meaningful", () => {
  assert.equal(isTeachingPeriodMeaningfullyPlanned({
    activities: [{ id: "a" }, { id: "b" }],
    assignments: [{ id: "assignment-1" }, { id: "assignment-2" }],
    assessments: [{ id: "assessment-1" }, { id: "assessment-2" }],
  }), true);
  assert.equal(isTeachingPeriodMeaningfullyPlanned({
    activities: [],
    assignmentCount: 0,
    assessmentCount: 0,
  }), false);
});

test("Phase 2B schema and migration are additive and use canonical relations", () => {
  assert.match(schema, /objective\s+String\?/);
  assert.match(schema, /notes\s+String\?/);
  assert.match(schema, /model TeachingPeriodActivity \{/);
  assert.match(schema, /teachingPeriodId\s+String/);
  assert.match(schema, /@@unique\(\[teachingPeriodId, sequence\]\)/);
  assert.match(schema, /teachingPeriod\s+TeachingPeriod\s+@relation\(fields: \[teachingPeriodId\], references: \[id\], onDelete: Cascade\)/);
  assert.match(schema, /teachingPeriodId\s+String\?/);
  assert.match(schema, /teachingPeriod\s+TeachingPeriod\?/);
  assert.match(schema, /@@index\(\[teachingPeriodId\]\)/);
  assert.match(migration, /ADD COLUMN "objective" TEXT/);
  assert.match(migration, /ADD COLUMN "notes" TEXT/);
  assert.match(migration, /CREATE TABLE "TeachingPeriodActivity"/);
  assert.match(migration, /CREATE UNIQUE INDEX "TeachingPeriodActivity_teachingPeriodId_sequence_key"/);
  assert.match(migration, /ADD COLUMN "teachingPeriodId" TEXT/);
  assert.match(migration, /Assessment_teachingPeriodId_idx/);
  assert.match(migration, /ON DELETE SET NULL/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/);
});

test("module identity remains page-ref based and no new period status is introduced", () => {
  const periodBlock = schema.match(/model TeachingPeriod \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.doesNotMatch(periodBlock, /\bmoduleId\b/);
  assert.doesNotMatch(schema, /enum TeachingPeriodPlanStatus/);
  assert.match(service, /pageRefs/);
});

test("canonical read models expose derived state and persisted planning fields", () => {
  assert.match(service, /objective: string \| null/);
  assert.match(service, /notes: string \| null/);
  assert.match(service, /activities: TeachingPeriodActivityReadModel\[\]/);
  assert.match(service, /assignmentCount: number/);
  assert.match(service, /assessmentCount: number/);
  assert.match(service, /meaningfullyPlanned: boolean/);
  assert.match(service, /getTeachingPeriodPlanState/);
});

test("period objectives and notes persist through the authorized service", () => {
  assert.match(service, /objective\?: string \| null/);
  assert.match(service, /notes\?: string \| null/);
  assert.match(service, /data\.objective = cleanOptionalText/);
  assert.match(service, /data\.notes = cleanOptionalText/);
  assert.match(service, /objective,\s*\n\s*notes,/);
});

test("activity CRUD is canonical, server-authorized, ordered, and bounded", () => {
  assert.match(service, /async function authorizeTeachingPeriodActivity/);
  assert.match(service, /authorizePeriod\(activity\.teachingPeriodId\)/);
  assert.match(service, /export async function createTeachingPeriodActivity/);
  assert.match(service, /export async function updateTeachingPeriodActivity/);
  assert.match(service, /export async function deleteTeachingPeriodActivity/);
  assert.match(service, /cleanActivityType/);
  assert.match(service, /sequence > TEACHING_PLAN_LIMITS\.activities/);
  assert.match(service, /teachingPeriodActivity\.findFirst/);
  assert.match(service, /teachingPeriodActivity\.create/);
  assert.match(service, /teachingPeriodActivity\.update/);
  assert.match(service, /teachingPeriodActivity\.delete/);
});

test("activity and period mutations are exposed only through server actions", () => {
  assert.match(actions, /["']use server["']/);
  assert.match(actions, /createTeachingPeriodActivityAction/);
  assert.match(actions, /updateTeachingPeriodActivityAction/);
  assert.match(actions, /deleteTeachingPeriodActivityAction/);
  assert.match(actions, /objective\?: string \| null/);
  assert.match(actions, /notes\?: string \| null/);
  assert.doesNotMatch(actions, /from ["']@\/lib\/prisma["']/);
});

test("empty timetable occurrences remain idempotent while read surfaces use meaningful state", () => {
  assert.match(plannerService, /findFirst\(\{[\s\S]*timetableEntryId[\s\S]*plannedDate/);
  assert.match(plannerService, /return existing/);
  assert.match(service, /TeachingPeriodStatus\.PLANNED/);
  assert.match(workspace, /occurrence\.period\?\.meaningfullyPlanned/);
  assert.match(plannerPage, /period\?\.meaningfullyPlanned/);
  assert.match(dashboardPage, /occurrence\.period\?\.meaningfullyPlanned/);
});

test("statuses are preserved while empty planned periods read as not planned", () => {
  assert.match(service, /status: result\.status/);
  assert.match(workspace, /status === "COMPLETED"/);
  assert.match(workspace, /status === "PLANNED" && !meaningfullyPlanned/);
  assert.match(plannerPage, /period\?\.status === "COMPLETED"/);
  assert.match(plannerPage, /period\?\.meaningfullyPlanned \? "Planned" : "Not planned"/);
});
