import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const policy = read("lib/teacher-book-eligibility.ts");
const teacherBooks = read("lib/teacher-books.ts");
const teachingPlan = read("lib/teaching-plan.ts");
const planner = read("lib/teacher-planner.ts");
const planPage = read("app/teacher-dashboard/classes/[sectionId]/plan/page.tsx");
const overview = read("app/teacher-dashboard/classes/[sectionId]/page.tsx");

 test("canonical teacher-book eligibility includes direct and approved adoption paths", () => {
  assert.match(policy, /sectionSubject\.bookId/);
  assert.match(policy, /schoolBookAdoption\.findMany/);
  assert.match(policy, /status: "APPROVED"/);
  assert.match(policy, /active: true/);
  assert.match(policy, /schoolEntitlements:/);
  assert.match(policy, /published: true/);
  assert.match(policy, /archived: false/);
  assert.match(policy, /type: "SUBJECT_TEACHER"/);
});

test("My Books, Subject Teaching Plan, and Planner use the same eligibility helper", () => {
  assert.match(teacherBooks, /resolveTeacherBookEligibility/);
  assert.match(teachingPlan, /resolveTeacherBookEligibility/);
  assert.match(planner, /resolveTeacherBookEligibility/);
});

test("Subject Teaching Plan is timetable-driven and shares persisted occurrence data", () => {
  assert.match(teachingPlan, /getTeachingPlanTimetableOccurrences/);
  assert.match(teachingPlan, /timetableEntryId/);
  assert.match(teachingPlan, /plannedDate/);
  assert.match(planPage, /occurrences=\{data\.occurrences\}/);
  assert.match(read("components/teacher/TeachingPlanWorkspace.tsx"), /Upcoming timetable classes/);
  assert.doesNotMatch(read("components/teacher/TeachingPlanWorkspace.tsx"), /\+ Add Teaching Period/);
});

test("Class Overview uses the timetable occurrence as its compact Next Class source", () => {
  assert.match(overview, /getTeachingPlanTimetableOccurrences/);
  assert.match(overview, /Next class/);
  assert.doesNotMatch(overview, /No active lesson/);
});
