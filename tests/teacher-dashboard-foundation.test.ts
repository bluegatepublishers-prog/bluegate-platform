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
  assert.match(home, /TeacherFeatureTile/);
});

test("teacher home never fabricates a timetable", () => {
  assert.match(home, /Timetable setup pending/);
  assert.doesNotMatch(home, /Today's Classes/);
  assert.match(home, /enabled=\{false\}/);
});

test("teacher home derives teaching cards from assigned books", () => {
  assert.match(experience, /getTeacherClasses\(\)/);
  assert.match(experience, /schoolBookAdoption\.findMany/);
  assert.match(experience, /sectionSubjectId: \{ in: subjectIds \}/);
  assert.match(home, /No book assigned by School/);
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

test("teacher shell preserves five-item navigation and feature-aware visibility", () => {
  assert.deepEqual([...sidebar.matchAll(/name: "([^"]+)"/g)].map((match) => match[1]), ["Home", "My Classes", "Planner", "Messages", "Resources"]);
  assert.match(sidebar, /features\.PLANNER/);
  assert.match(sidebar, /features\.TEACHER_RESOURCES/);
  assert.match(mobile, /teacherNavigation\.map/);
  assert.match(mobile, /grid-cols-5/);
});
