import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { TeachingPeriodStatus } from "@prisma/client";
import {
  parseTeachingPeriodDate,
  parseTeachingPeriodStatus,
  TeachingPlanError,
} from "../lib/teaching-plan-policy";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/20260816140000_teaching_period_planner_fields/migration.sql",
  "utf8",
);
const service = readFileSync("lib/teaching-plan.ts", "utf8");
const actions = readFileSync(
  "app/teacher-dashboard/classes/[sectionId]/plan/teaching-actions.ts",
  "utf8",
);
const legacyActions = readFileSync(
  "app/teacher-dashboard/classes/[sectionId]/plan/actions.ts",
  "utf8",
);
const schoolService = readFileSync("lib/school-teaching-plan.ts", "utf8");

const academicYear = {
  startDate: new Date("2026-08-01T18:30:00.000Z"),
  endDate: new Date("2027-03-31T18:29:59.999Z"),
};

test("TeachingPeriod schema and migration are additive and normalized", () => {
  assert.match(schema, /enum TeachingPeriodStatus \{[\s\S]*PLANNED[\s\S]*COMPLETED[\s\S]*SKIPPED[\s\S]*RESCHEDULED/);
  assert.match(schema, /plannedDate\s+DateTime\?/);
  assert.match(schema, /status\s+TeachingPeriodStatus\s+@default\(PLANNED\)/);
  assert.match(schema, /chapterId\s+String\?/);
  assert.match(schema, /chapter\s+BookChapter\?[\s\S]*onDelete: SetNull/);
  assert.match(schema, /@@unique\(\[planId, sequence\]\)/);
  assert.match(schema, /@@index\(\[planId, plannedDate, status\]\)/);
  assert.match(schema, /teachingPeriods\s+TeachingPeriod\[\]/);
  assert.match(migration, /CREATE TYPE "TeachingPeriodStatus"/);
  assert.match(migration, /ADD COLUMN "plannedDate"/);
  assert.match(migration, /ADD COLUMN "status"/);
  assert.match(migration, /ADD COLUMN "chapterId"/);
  assert.match(migration, /TeachingPeriod_planId_plannedDate_status_idx/);
  assert.match(migration, /ON DELETE SET NULL/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN/);
});

test("TeachingPeriod dates are strict, UTC-midnight, and academic-year bounded", () => {
  assert.equal(parseTeachingPeriodDate(null, academicYear), null);
  assert.equal(parseTeachingPeriodDate(undefined, academicYear), null);
  assert.equal(parseTeachingPeriodDate("2026-08-18", academicYear)?.toISOString(), "2026-08-18T00:00:00.000Z");
  assert.equal(parseTeachingPeriodDate("2027-03-31", academicYear)?.toISOString(), "2027-03-31T00:00:00.000Z");
  assert.throws(
    () => parseTeachingPeriodDate("2026-02-30", academicYear),
    (error: unknown) => error instanceof TeachingPlanError && error.code === "DATE_INVALID",
  );
  assert.throws(
    () => parseTeachingPeriodDate("2026/08/18", academicYear),
    (error: unknown) => error instanceof TeachingPlanError && error.code === "DATE_INVALID",
  );
  assert.throws(
    () => parseTeachingPeriodDate("2026-07-31", academicYear),
    (error: unknown) => error instanceof TeachingPlanError && error.code === "DATE_INVALID",
  );
  assert.throws(
    () => parseTeachingPeriodDate("2027-04-01", academicYear),
    (error: unknown) => error instanceof TeachingPlanError && error.code === "DATE_INVALID",
  );
});

test("TeachingPeriod status validation is enum-restricted", () => {
  for (const status of Object.values(TeachingPeriodStatus)) {
    assert.equal(parseTeachingPeriodStatus(status), status);
  }
  assert.throws(
    () => parseTeachingPeriodStatus("IN_PROGRESS"),
    (error: unknown) => error instanceof TeachingPlanError && error.code === "STATUS_INVALID",
  );
});

test("Teacher period mutations validate dates and same-book chapters while preserving page authority", () => {
  assert.match(service, /parseTeachingPeriodDate\(input\.plannedDate, context\.academicYear\)/);
  assert.match(service, /parseTeachingPeriodStatus\(input\.status\)/);
  assert.match(service, /where: \{ id, bookId: context\.book\.id \}/);
  assert.match(service, /assertPersistedPageRefsMatchChapter/);
  assert.match(service, /assertPageCandidatesMatchChapter/);
  assert.match(service, /TeachingPeriodStatus\.PLANNED/);
  assert.match(service, /plannedDate\?: string \| null/);
  assert.match(service, /chapterId\?: string \| null/);
  assert.match(actions, /plannedDate\?: string \| null/);
  assert.match(actions, /status\?: TeachingPeriodStatus/);
  assert.match(actions, /chapterId\?: string \| null/);
  assert.match(service, /getTeachingPlanForSchool/);
  assert.match(schoolService, /getTeachingPlanForSchool/);
});

test("Teacher planner reads and mutations use effective school PLANNER access", () => {
  assert.match(service, /getTeacherPlannerFeatureAccess/);
  assert.match(service, /FEATURE_DISABLED/);
  assert.match(legacyActions, /getTeacherPlannerFeatureAccess/);
  assert.match(legacyActions, /if \(!access\.allowed\)/);
  assert.match(legacyActions, /requireTeacherSubjectBase/);
});
