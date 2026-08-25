import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260821100000_add_teaching_period_timetable_entry/migration.sql");
const schoolService = read("lib/school-timetable.ts");
const schoolActions = read("app/school-dashboard/timetable/actions.ts");
const schoolPage = read("app/school-dashboard/timetable/page.tsx");
const teacherService = read("lib/teacher-timetable.ts");
const plannerService = read("lib/teacher-planner.ts");
const plannerPage = read("app/teacher-dashboard/planner/page.tsx");
const plannerActions = read("app/teacher-dashboard/planner/actions.ts");

 test("the timetable bridge is nullable, indexed, foreign-keyed, and non-unique", () => {
  assert.match(schema, /timetableEntryId\s+String\?/);
  assert.match(schema, /timetableEntry\s+ClassTimetableEntry\?/);
  assert.match(schema, /teachingPeriods\s+TeachingPeriod\[\]/);
  assert.match(schema, /@@index\(\[timetableEntryId\]\)/);
  assert.match(migration, /ADD COLUMN "timetableEntryId" TEXT/);
  assert.match(migration, /TeachingPeriod_timetableEntryId_idx/);
  assert.match(migration, /ON DELETE SET NULL/);
  assert.doesNotMatch(schema, /@@unique\(\[timetableEntryId\]\)/);
});

test("complete School timetable save is transactional and keeps break cells assignment-free", () => {
  assert.match(schoolService, /export async function saveCompleteClassTimetable/);
  assert.match(schoolService, /prisma\.\$transaction/);
  assert.match(schoolService, /timetableEntryScope\(tx, school\.id, entry\)/);
  assert.match(schoolService, /slot\.type !== TimetableSlotType\.TEACHING/);
  assert.match(schoolService, /deleteMany\(\{ where: \{ schoolId: school\.id, id: \{ in: staleIds \} \} \}\)/);
  assert.match(schoolActions, /saveCompleteClassTimetableAction/);
  assert.match(schoolActions, /parseCompleteTimetableForm/);
  assert.match(schoolPage, /Save complete timetable/);
  assert.doesNotMatch(schoolPage, /form action=\{saveClassTimetableEntryAction\}/);
});

test("teacher timetable and planner are scoped to assigned teachers and valid teaching slots", () => {
  assert.match(teacherService, /teacherAssignment: \{/);
  assert.match(teacherService, /teacherId: teacher\.id/);
  assert.match(plannerService, /schoolId: teacher\.schoolId/);
  assert.match(plannerService, /teacherAssignment: \{ teacherId: teacher\.id/);
  assert.match(teacherService, /periodSlot: \{ type: "TEACHING" \}/);
  assert.match(teacherService, /section: \{ active: true, schoolClass: \{ active: true, schoolId: teacher\.schoolId/);
  assert.match(teacherService, /sectionSubject: \{ active: true, subject: \{ active: true \} \}/);
});

test("planner occurrence persistence uses date plus timetable entry idempotency without a global uniqueness constraint", () => {
  assert.match(plannerService, /parseTeachingPeriodDate\(input\.date, academicYear\)/);
  assert.match(plannerService, /getWeekdayForTimeZone\(dateAtNoon\(input\.date\)\) !== entry\.weekday/);
  assert.match(plannerService, /getOrCreateTeachingPlan/);
  assert.match(plannerService, /findFirst\(\{ where: \{ planId: plan\.id, timetableEntryId: entry\.id, plannedDate \}/);
  assert.match(plannerService, /teacher-planner-occurrence:/);
  assert.match(plannerService, /timetableEntryId: entry\.id/);
  assert.match(plannerService, /TeachingPeriodStatus\.PLANNED/);
  assert.match(plannerService, /TeachingPeriodStatus\.COMPLETED/);
  assert.match(plannerActions, /revalidatePath\("\/teacher-dashboard\/planner"\)/);
});

test("planner exposes only the requested views and reuses mapped page references for Smart Book", () => {
  assert.match(plannerPage, /Today/);
  assert.match(plannerPage, /Weekly/);
  assert.match(plannerPage, /Monthly/);
  assert.match(plannerPage, /Completed/);
  assert.match(plannerPage, /period\.pageRefs/);
  assert.match(plannerPage, /teacher-dashboard\/classes\//);
  assert.match(plannerPage, /Open mapped Smart Book/);
  assert.match(plannerPage, /Mark completed/);
  assert.match(plannerService, /academicPlannerItem/);
  assert.match(plannerService, /EMERGENCY_HOLIDAY/);
});