import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const home = read("app/teacher-dashboard/page.tsx");
const experience = read("lib/teacher-experience.ts");
const layout = read("app/teacher-dashboard/layout.tsx");
const sidebar = read("components/dashboard/Sidebar.tsx");
const mobile = read("components/dashboard/TeacherMobileNavigation.tsx");
const header = read("components/dashboard/Header.tsx");
const primitives = read("components/teacher/TeacherUI.tsx");

test("teacher home uses the canonical school feature map", () => {
  assert.match(layout, /getSchoolFeatureAccessMap\(teacher\.school/);
  assert.doesNotMatch(layout, /resolveFeaturesForAuthenticatedUser/);
  assert.match(home, /data\.featureAccess/);
  assert.match(home, /getTeacherPlannerData/);
});

test("teacher home renders canonical timetable rows", () => {
  assert.match(home, /today\.occurrences/);
  assert.match(home, /No teaching periods are scheduled for today/);
  assert.doesNotMatch(home, /Timetable setup pending|Daily teaching workspace|Quick actions|Results and reports/);
});

test("teacher home derives teaching cards from assigned books", () => {
  assert.match(experience, /getTeacherClasses\(\)/);
  assert.match(read("lib/teacher-book-eligibility.ts"), /schoolBookAdoption\.findMany/);
  assert.match(read("lib/teacher-book-eligibility.ts"), /sectionSubjectId/);
  assert.match(home, /My Classes/);
});

test("teacher home counts persisted teaching plans and review work", () => {
  assert.match(experience, /teachingPlan\.count/);
  assert.match(experience, /assignmentSubmission\.count/);
  assert.match(experience, /assessmentResponse\.count/);
});

test("teacher header exposes identity context without internal identifiers", () => {
  assert.match(layout, /academicYear=\{academicYear\?\.name\}/);
  assert.match(header, /Teacher Dashboard/);
  assert.match(header, /schoolName/);
  assert.doesNotMatch(header, /teacherId|schoolId|publisherId/);
});

test("teacher UI primitives support disabled actions and consistent typography", () => {
  assert.match(primitives, /TeacherFeatureTile/);
  assert.match(primitives, /aria-disabled/);
  assert.match(primitives, /teacherTypography/);
  assert.match(primitives, /TeacherStatusBadge/);
});

test("teacher shell preserves four-item navigation and feature-aware visibility", () => {
  assert.deepEqual([...sidebar.matchAll(/name: "([^"]+)"/g)].map((match) => match[1]), ["Home", "My Classes", "Planner", "Messages"]);
  assert.match(sidebar, /features\.PLANNER/);
  assert.doesNotMatch(sidebar, /TEACHER_RESOURCES/);
  assert.match(mobile, /teacherNavigation/);
  assert.match(mobile, /grid-cols-4/);
});
