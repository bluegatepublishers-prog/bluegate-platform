import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { SchoolTimetableResolutionError, selectApplicableTimetableConfig } from "../lib/school-timetable-resolution-policy";

const read = (path: string) => readFileSync(path, "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260821110000_add_seasonal_timetable_and_emergency_holiday/migration.sql");
const schoolService = read("lib/school-timetable.ts");
const resolver = read("lib/school-timetable-resolution.ts");
const teacherTimetable = read("lib/teacher-timetable.ts");
const planner = read("lib/teacher-planner.ts");
const schoolActions = read("app/school-dashboard/planner/actions.ts");
const schoolPage = read("app/school-dashboard/planner/page.tsx");
const plannerPage = read("app/teacher-dashboard/planner/page.tsx");

function config(id: string, from: string, to: string | null, season: string) {
  return { id, schoolId: "school", academicYearId: "year", name: id, season, effectiveFrom: new Date(from), effectiveTo: to ? new Date(to) : null, active: true, workingDays: [], schoolStartMinute: 480, schoolEndMinute: 840 };
}

test("seasonal timetable schema owns slots and entries by configuration", () => {
  assert.match(schema, /enum TimetableSeason \{[\s\S]*SUMMER[\s\S]*WINTER[\s\S]*CUSTOM/);
  assert.match(schema, /EMERGENCY_HOLIDAY/);
  assert.match(schema, /model SchoolTimetableConfig[\s\S]*effectiveFrom\s+DateTime[\s\S]*effectiveTo\s+DateTime\?[\s\S]*active\s+Boolean/);
  assert.match(schema, /model SchoolPeriodSlot[\s\S]*timetableConfigId\s+String[\s\S]*timetableConfig\s+SchoolTimetableConfig/);
  assert.match(schema, /model ClassTimetableEntry[\s\S]*timetableConfigId\s+String[\s\S]*@@unique\(\[timetableConfigId, sectionId, weekday, periodSlotId\](?:, map: "[^"]+")?\)/);
});

test("migration backfills existing configs, slots, and entries without deleting data", () => {
  assert.match(migration, /UPDATE "SchoolTimetableConfig"[\s\S]*FROM "AcademicYear"/);
  assert.match(migration, /UPDATE "SchoolPeriodSlot"[\s\S]*SET "timetableConfigId"/);
  assert.match(migration, /UPDATE "ClassTimetableEntry"[\s\S]*SET "timetableConfigId"/);
  assert.match(migration, /could not be backfilled/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/);
});

test("Summer and Winter resolve by effective date, while no date resolves cleanly", () => {
  const summer = config("summer", "2026-04-01T00:00:00Z", "2026-09-30T23:59:59Z", "SUMMER");
  const winter = config("winter", "2026-10-01T00:00:00Z", null, "WINTER");
  assert.equal(selectApplicableTimetableConfig([summer, winter], new Date("2026-07-15T12:00:00Z"))?.id, "summer");
  assert.equal(selectApplicableTimetableConfig([summer, winter], new Date("2026-12-15T12:00:00Z"))?.id, "winter");
  assert.equal(selectApplicableTimetableConfig([summer], new Date("2026-01-15T12:00:00Z")), null);
});

test("overlapping active timetable ranges fail instead of selecting randomly", () => {
  const first = config("first", "2026-04-01T00:00:00Z", "2026-09-30T23:59:59Z", "SUMMER");
  const second = config("second", "2026-09-01T00:00:00Z", null, "WINTER");
  assert.throws(() => selectApplicableTimetableConfig([first, second], new Date("2026-09-15T12:00:00Z")), SchoolTimetableResolutionError);
  assert.match(schoolService, /Active timetable effective dates overlap/);
  assert.match(resolver, /selectApplicableTimetableConfig/);
});

test("teacher timetable and planner use date resolution and preserve teacher scope", () => {
  assert.match(teacherTimetable, /resolveSchoolTimetableForDate/);
  assert.match(teacherTimetable, /timetableConfigId: config\.id/);
  assert.match(planner, /getTeacherTimetable\(dateAtNoon\(date\)\)/);
  assert.match(planner, /teacherId: teacher\.id/);
  assert.match(planner, /timetableEntryId: entry\.id/);
});

test("emergency holiday is school-managed, date-specific, and suppresses new teaching periods", () => {
  assert.match(schoolActions, /EMERGENCY_HOLIDAY/);
  assert.match(schoolPage, /Emergency holiday \/ closure/);
  assert.match(planner, /type: \{ in: \["HOLIDAY", "EMERGENCY_HOLIDAY"\] \}/);
  assert.match(planner, /DATE_CLOSED/);
  assert.match(planner, /School is closed/);
  assert.match(plannerPage, /School Closed/);
  assert.match(planner, /status: TeachingPeriodStatus\.COMPLETED/);
});

test("monthly planner overlays assessment dates without adding an exam calendar model", () => {
  assert.match(planner, /view === "month"/);
  assert.match(plannerPage, /Monthly/);
  assert.match(planner, /prisma\.assessment\.findMany/);
  assert.match(planner, /type: "EXAM"/);
  assert.doesNotMatch(schema, /model ExamCalendar/);
});