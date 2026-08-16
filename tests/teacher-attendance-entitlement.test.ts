import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function section(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `missing ${start}`);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `missing ${end}`);
  return source.slice(startIndex, endIndex);
}

test("canonical school feature access includes readiness, publisher, subscription, and school checks", () => {
  const source = read("lib/school-feature-access.ts");
  assert.match(source, /getPublisherFeatures\(school\.publisherId\)/);
  assert.match(source, /getPlatformFeatureAvailability\(\)/);
  assert.match(source, /facts\.state\[key\]/);
  assert.match(source, /effectiveSchoolAccessStatus\(subscription\) === "ACTIVE"/);
});

test("platform availability is database-backed and fail-closed", () => {
  const source = read("lib/publisher-features.ts");
  assert.match(source, /prisma\.featureDefinition\.findMany/);
  assert.match(source, /row\.implemented && row\.active/);
  assert.match(source, /if \(!catalogue\) return createPlatformAvailabilityMap\(false\)/);
  assert.match(source, /createPlatformAvailabilityMap\(false\), \.\.\.catalogue/);
});

test("teacher access state denies before policy creation when Attendance entitlement is unavailable", () => {
  const source = section(read("lib/attendance.ts"), "export async function getTeacherAttendanceAccessState", "async function findOrCreateTeacherSession");
  const access = source.indexOf('getSchoolFeatureAccessForSchool(teacher.school, "ATTENDANCE")');
  const policy = source.indexOf("getSchoolAttendancePolicyBySchoolId(teacher.schoolId)");
  assert.notEqual(access, -1);
  assert.notEqual(policy, -1);
  assert.ok(access < policy);
  assert.doesNotMatch(source, /getPlatformFeatureAvailability/);
});

test("disabled Teacher workspace cannot reach session creation", () => {
  const source = section(read("lib/attendance.ts"), "export async function getTeacherAttendanceWorkspace", "async function writeTeacherAttendance");
  const access = source.indexOf("getTeacherAttendanceAccessState()");
  const session = source.indexOf("findOrCreateTeacherSession");
  assert.notEqual(access, -1);
  assert.notEqual(session, -1);
  assert.ok(access < session);
  assert.match(source, /access\.status === "FEATURE_DISABLED"/);
});

test("Teacher write, draft, submit, and correction paths retain independent entitlement enforcement", () => {
  const source = read("lib/attendance.ts");
  const write = section(source, "async function writeTeacherAttendance", "export async function saveTeacherAttendanceDraft");
  const correction = section(source, "export async function requestAttendanceCorrection", "async function getSchoolAttendanceDashboard");
  assert.match(write, /const teacher = await requireTeacher\(\)/);
  assert.match(write, /await requireTeacherAttendanceEntitlement\(teacher\)/);
  assert.ok(write.indexOf("requireTeacherAttendanceEntitlement") < write.indexOf("requireTeacherClass"));
  assert.match(correction, /const teacher = await requireTeacher\(\)/);
  assert.match(correction, /await requireTeacherAttendanceEntitlement\(teacher\)/);
  assert.ok(correction.indexOf("requireTeacherAttendanceEntitlement") < correction.indexOf("requireTeacherClass"));
  assert.match(source, /return writeTeacherAttendance\(\{ \.\.\.input, submit: false \}\)/);
  assert.match(source, /return writeTeacherAttendance\(\{ \.\.\.input, submit: true \}\)/);
});

test("Teacher assignment, roster, lock, and correction controls remain present", () => {
  const source = read("lib/attendance.ts");
  assert.match(source, /requireTeacherClass\(input\.sectionId\)/);
  assert.match(source, /studentEnrollment\.findMany/);
  assert.match(source, /Attendance status is required for every student in the section\./);
  assert.match(source, /canTeacherEdit\(session\.date, session\.locked, policy\.lockHour\)/);
  assert.match(source, /attendanceCorrection\.create/);
});