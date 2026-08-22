import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { APPLICATION_TIME_ZONE, getWeekdayForTimeZone } from "../lib/application-timezone";

const service = readFileSync("lib/school-timetable.ts", "utf8");
const teacherService = readFileSync("lib/teacher-timetable.ts", "utf8");
const schoolNavigation = readFileSync("components/school/SchoolNavigation.tsx", "utf8");
const teacherPage = readFileSync("app/teacher-dashboard/timetable/page.tsx", "utf8");

test("application weekday helper uses the India-local midnight boundary", () => {
  assert.equal(APPLICATION_TIME_ZONE, "Asia/Kolkata");
  assert.equal(getWeekdayForTimeZone(new Date("2026-08-16T18:29:59Z")), "SUNDAY");
  assert.equal(getWeekdayForTimeZone(new Date("2026-08-16T18:30:00Z")), "MONDAY");
  assert.equal(getWeekdayForTimeZone(new Date("2026-08-16T19:00:00Z")), "MONDAY");
});

test("application weekday helper preserves normal India-local daytime behavior", () => {
  assert.equal(getWeekdayForTimeZone(new Date("2026-08-17T12:00:00Z")), "MONDAY");
});

test("Teacher Today selects the local weekday entry and preserves the empty state", () => {
  const entries: Array<{ id: string; weekday: string }> = [{ id: "sunday", weekday: "SUNDAY" }, { id: "monday", weekday: "MONDAY" }];
  const today = getWeekdayForTimeZone(new Date("2026-08-16T19:00:00Z"));
  const todayEntries = entries.filter((entry) => entry.weekday === today);
  assert.deepEqual(todayEntries.map((entry) => entry.id), ["monday"]);
  assert.deepEqual(entries.filter((entry) => entry.weekday === "TUESDAY"), []);
  assert.match(teacherPage, /No classes scheduled today\./);
});

test("timetable advisory locks use parameterized tagged SQL only", () => {
  assert.doesNotMatch(service, /\$executeRawUnsafe|\$queryRaw[^`]*pg_advisory_xact_lock/);
  assert.match(service, /tx\.\$executeRaw`SELECT pg_advisory_xact_lock\(hashtext\(\$\{identityKey\}\)\)`/);
});

test("all structure mutations share one canonical lock before mutable validation", () => {
  assert.match(service, /function structureLockKey\(schoolId: string, academicYearId: string\)/);
  assert.match(service, /return "school-timetable-structure:" \+ schoolId \+ ":" \+ academicYearId/);
  for (const functionName of ["saveSchoolTimetableConfig", "createSchoolPeriodSlot", "updateSchoolPeriodSlot", "deleteSchoolPeriodSlot", "upsertClassTimetableEntry"]) {
    const start = service.indexOf(`export async function ${functionName}`);
    const end = service.indexOf("\nexport async function ", start + 1);
    const body = service.slice(start, end < 0 ? service.length : end);
    assert.match(body, /lockScope\(tx, structureLockKey\(school\.id/);
  }
  const slotMutationStart = service.indexOf("export async function createSchoolPeriodSlot");
  assert.ok(service.indexOf("lockScope(tx, structureLockKey", slotMutationStart) < service.indexOf("assertSlotDoesNotOverlap", slotMutationStart));
  const entryMutationStart = service.indexOf("export async function upsertClassTimetableEntry");
  assert.ok(service.indexOf("lockScope(tx, structureLockKey", entryMutationStart) < service.indexOf("timetableEntryScope", entryMutationStart));
});

test("config changes reject slots outside new bounds and entries on removed days", () => {
  assert.match(service, /existingSlots\.some\(\(slot\) => slot\.startMinute < input\.schoolStartMinute \|\| slot\.endMinute > input\.schoolEndMinute\)/);
  assert.match(service, /School timing cannot be changed because existing period slots fall outside the new school day/);
  assert.match(service, /removedDays = currentConfig\?\.workingDays\.filter/);
  assert.match(service, /existingEntries\.some\(\(entry\) => removedDays\.includes\(entry\.weekday\)\)/);
  assert.match(service, /Working day cannot be removed while timetable entries exist for that day/);
});

test("teacher collision and structure coordination remain transaction-safe", () => {
  assert.match(service, /prisma\.\$transaction\(async \(tx\)/);
  assert.match(service, /school-timetable-entry:[^\n]*scope\.assignment\.teacherId/);
  assert.match(service, /teacherAssignment: \{ teacherId: scope\.assignment\.teacherId \}/);
  assert.match(teacherService, /type: "SUBJECT_TEACHER"/);
});

test("navigation is feature-aware while direct route guards remain independent", () => {
  assert.match(schoolNavigation, /visibleAcademics = academics\.filter\(\(\[label\]\)\s*=> String\(label\) !== "Timetable" \|\| features\.TIMETABLE\)/);
  assert.match(readFileSync("app/school-dashboard/timetable/page.tsx", "utf8"), /getSchoolFeatureAccess\("TIMETABLE"\)/);
});

test("teacher timetable defaults to Today, supports Week, and has a real empty Today state", () => {
  assert.match(teacherPage, /params\.view === "week" \? "week" : "today"/);
  assert.match(teacherPage, /getWeekdayForTimeZone\(now\)/);
  assert.doesNotMatch(teacherPage, /getUTCDay\(\)/);
  assert.match(teacherPage, /getWeekdayForTimeZone/);
  assert.match(teacherPage, /Today/);
  assert.match(teacherPage, /Week/);
  assert.match(teacherPage, /No classes scheduled today\./);
  assert.match(teacherPage, /todayEntries = data\.entries\.filter/);
  assert.doesNotMatch(teacherPage, /upsertClassTimetableEntry|deleteClassTimetableEntry|form action/);
});