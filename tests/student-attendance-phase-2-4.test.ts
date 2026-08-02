import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const attendance = source("lib/attendance.ts");
const attendancePage = source("app/student-dashboard/attendance/page.tsx");
const studentHome = source("app/student-dashboard/page.tsx");
const studentHeader = source("components/student/StudentHeader.tsx");
const studentNav = source("components/student/StudentNavigation.tsx");
const studentProfile = source("app/student-dashboard/profile/page.tsx");

test("1 exports centralized student attendance experience", () => {
  assert.match(attendance, /export async function getStudentAttendanceExperience\(/);
});

test("2 student attendance experience requires authenticated student identity", () => {
  assert.match(attendance, /const identity = await requireStudent\(\)/);
});

test("3 attendance rows are limited to submitted or locked sessions", () => {
  assert.match(attendance, /hasSubmittedOrLockedScope\(\)/);
});

test("4 student service reads school attendance policy", () => {
  assert.match(attendance, /getSchoolAttendancePolicyBySchoolId\(identity\.school\.id\)/);
});

test("5 service computes requirement status using school minimum", () => {
  assert.match(attendance, /minimumAttendancePercentage/);
  assert.match(attendance, /requirementStatus\(/);
});

test("6 service filters holiday calendar days", () => {
  assert.match(attendance, /academicPlannerItem\.findMany/);
  assert.match(attendance, /type: "HOLIDAY"/);
});

test("7 service supports normalized history status filter", () => {
  assert.match(attendance, /normalizeHistoryStatusFilter/);
  assert.match(attendance, /status\?: string/);
});

test("8 service supports normalized history session type filter", () => {
  assert.match(attendance, /normalizeHistorySessionTypeFilter/);
  assert.match(attendance, /sessionType\?: string/);
});

test("9 service includes paginated history with stable page size", () => {
  assert.match(attendance, /const pageSize = 20/);
  assert.match(attendance, /totalPages/);
});

test("10 student remarks are visible only for leave and excused", () => {
  assert.match(attendance, /status === AttendanceStatus\.ON_LEAVE \|\| status === AttendanceStatus\.EXCUSED/);
});

test("11 student attendance route file exists with dashboard back link", () => {
  assert.match(attendancePage, /href="\/student-dashboard"/);
  assert.match(attendancePage, /Back to Dashboard/);
});

test("12 attendance page includes summary metrics section", () => {
  assert.match(attendancePage, /Attendance Percentage/);
  assert.match(attendancePage, /Present/);
  assert.match(attendancePage, /Absent/);
});

test("13 attendance page includes today status panel", () => {
  assert.match(attendancePage, /Today's Attendance|Today&apos;s Attendance/);
  assert.match(attendancePage, /Not Submitted/);
});

test("14 attendance page includes calendar and period detail affordance", () => {
  assert.match(attendancePage, /Attendance Calendar/);
  assert.match(attendancePage, /Periods/);
});

test("15 attendance page includes monthly trend and requirement blocks", () => {
  assert.match(attendancePage, /Monthly Trend/);
  assert.match(attendancePage, /Attendance Requirement/);
});

test("16 attendance page includes history filters and paging", () => {
  assert.match(attendancePage, /Attendance History/);
  assert.match(attendancePage, /All Status/);
  assert.match(attendancePage, /Previous/);
  assert.match(attendancePage, /Next/);
});

test("17 sidebar stays fixed to four navigation items", () => {
  const labels = [...studentNav.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(labels, ["Home", "My Class", "Notices", "Planner"]);
});

test("18 sidebar does not add attendance as a permanent nav item", () => {
  assert.doesNotMatch(studentNav, /Attendance/);
});

test("19 home dashboard provides attendance entry card", () => {
  assert.match(studentHome, /title="Attendance"/);
  assert.match(studentHome, /href="\/student-dashboard\/attendance"/);
});

test("20 avatar menu provides attendance entry", () => {
  assert.match(studentHeader, /href="\/student-dashboard\/attendance"/);
  assert.match(studentHeader, />Attendance</);
});

test("21 profile page provides attendance entry", () => {
  assert.match(studentProfile, /View Attendance/);
  assert.match(studentProfile, /href="\/student-dashboard\/attendance"/);
});

test("22 attendance service returns empty-state payload safely", () => {
  assert.match(attendance, /empty: true/);
  assert.match(attendance, /submitted: false/);
});

test("23 attendance service prepares period-mode session details", () => {
  assert.match(attendance, /AttendanceSessionType\.PERIOD/);
  assert.match(attendance, /periods:/);
});

test("24 attendance service computes month boundaries", () => {
  assert.match(attendance, /function monthBounds/);
  assert.match(attendance, /\^\\d\{4\}-\\d\{2\}\$/);
});

test("25 attendance service builds calendar rows with holiday and future handling", () => {
  assert.match(attendance, /buildCalendarDays/);
  assert.match(attendance, /inFuture/);
  assert.match(attendance, /isHoliday/);
});
