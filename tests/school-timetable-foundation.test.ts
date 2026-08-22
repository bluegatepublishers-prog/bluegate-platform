import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/20260816150000_add_school_timetable_foundation/migration.sql",
  "utf8",
);
const service = readFileSync("lib/school-timetable.ts", "utf8");
const actions = readFileSync("app/school-dashboard/timetable/actions.ts", "utf8");
const schoolPage = readFileSync("app/school-dashboard/timetable/page.tsx", "utf8");
const teacherService = readFileSync("lib/teacher-timetable.ts", "utf8");
const teacherPage = readFileSync("app/teacher-dashboard/timetable/page.tsx", "utf8");

test("timetable persistence is additive, normalized, and restricts history deletes", () => {
  assert.match(schema, /enum Weekday \{[\s\S]*MONDAY[\s\S]*SUNDAY[\s\S]*\}/);
  assert.match(schema, /enum TimetableSlotType \{[\s\S]*TEACHING[\s\S]*BREAK[\s\S]*OTHER[\s\S]*\}/);
  assert.match(schema, /model SchoolTimetableConfig[\s\S]*name\s+String[\s\S]*season\s+TimetableSeason[\s\S]*effectiveFrom\s+DateTime[\s\S]*@@unique\(\[schoolId, academicYearId, name\]\)/);
  assert.match(schema, /model SchoolPeriodSlot[\s\S]*timetableConfigId\s+String[\s\S]*@@unique\(\[timetableConfigId, sequence\]\)[\s\S]*@@index\(\[timetableConfigId, startMinute\]\)/);
  assert.match(schema, /model ClassTimetableEntry[\s\S]*timetableConfigId\s+String[\s\S]*@@unique\(\[timetableConfigId, sectionId, weekday, periodSlotId\]\)/);
  assert.match(migration, /CREATE TYPE "Weekday"/);
  assert.match(migration, /CREATE TYPE "TimetableSlotType"/);
  assert.match(migration, /CREATE TABLE "SchoolTimetableConfig"/);
  assert.match(migration, /CREATE TABLE "SchoolPeriodSlot"/);
  assert.match(migration, /CREATE TABLE "ClassTimetableEntry"/);
  assert.match(migration, /ON DELETE RESTRICT/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|ALTER TABLE "TeacherAssignment"/);
});

test("School timetable service enforces guarded config and slot rules", () => {
  assert.match(service, /requireSchool\(\)/);
  assert.match(service, /requireSchoolFeature\("TIMETABLE"\)/);
  assert.match(service, /Select at least one working day/);
  assert.match(service, /Working days cannot contain duplicates/);
  assert.match(service, /Start time must be before end time/);
  assert.match(service, /Period slot must fit inside the School day/);
  assert.match(service, /Period slot overlaps an existing slot/);
  assert.match(service, /Remove or reassign timetable entries before deleting this slot/);
  assert.match(service, /Serializable/);
  assert.match(service, /pg_advisory_xact_lock/);
  assert.match(service, /SchoolTimetableValidationError/);
});

test("entries require active subject-teacher scope and prevent class and teacher collisions", () => {
  assert.match(service, /config\.workingDays\.includes\(input\.weekday\)/);
  assert.match(service, /slot\.type !== TimetableSlotType\.TEACHING/);
  assert.match(service, /type: "SUBJECT_TEACHER"/);
  assert.match(service, /active: true/);
  assert.match(service, /endedAt: \{ gt: now \}/);
  assert.match(service, /subjectId: sectionSubject\.subjectId/);
  assert.match(service, /This class already has a timetable entry during this period/);
  assert.match(service, /Teacher is already assigned to another class during this period/);
  assert.match(service, /school-timetable-cell:/);
  assert.match(service, /Unable to delete the timetable entry/);
});

test("School editing and teacher reading are feature-guarded with no teacher mutation path", () => {
  assert.match(actions, /saveSchoolTimetableConfig/);
  assert.match(actions, /createSchoolPeriodSlot/);
  assert.match(actions, /upsertClassTimetableEntry/);
  assert.match(schoolPage, /getSchoolFeatureAccess\("TIMETABLE"\)/);
  assert.match(schoolPage, /type="time"/);
  assert.match(teacherService, /requireTeacher\(\)/);
  assert.match(teacherService, /getSchoolFeatureAccessForSchool/);
  assert.match(teacherService, /teacherAssignment: \{/);
  assert.match(teacherPage, /Timetable setup pending/);
  assert.match(teacherPage, /Read-only view/);
  assert.doesNotMatch(teacherPage, /form action|upsertClassTimetableEntry|deleteClassTimetableEntry/);
});
