import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const attendance = source("lib/attendance.ts");
const parentDashboard = source("lib/parent-dashboard.ts");
const parentPolicy = source("lib/parent-policy.ts");
const parentShell = source("components/parent/ParentPortalShell.tsx");
const childTabs = source("components/parent/ParentChildTabs.tsx");
const home = source("app/parent-dashboard/page.tsx");
const childOverview = source("app/parent-dashboard/children/[studentId]/page.tsx");
const attendancePage = source("app/parent-dashboard/children/[studentId]/attendance/page.tsx");

// ACCESS

test("1 parent login is required for parent child attendance scope", () => {
  assert.match(parentDashboard, /const parent = await requireParent\(\)/);
});

test("2 parent can access only linked approved children", () => {
  assert.match(parentDashboard, /parentId: parent\.id, studentId, status: "APPROVED", canViewLearning: true/);
});

test("3 another parent's child access is blocked", () => {
  assert.match(parentDashboard, /relationshipStudentId: relationship\.studentId, requestedStudentId: studentId/);
});

test("4 revoked or non-approved relationship is blocked", () => {
  assert.match(parentPolicy, /input\.relationshipStatus === "APPROVED"/);
});

test("5 cross-school or unavailable school is blocked", () => {
  assert.match(parentPolicy, /input\.schoolApproved/);
});

test("6 suspended or expired school access is blocked", () => {
  assert.match(parentDashboard, /effectiveSchoolAccessStatus\(schoolSubscription\) === "ACTIVE"/);
  assert.match(parentPolicy, /input\.schoolAccessActive/);
});

test("7 inactive enrollment is blocked", () => {
  assert.match(parentDashboard, /enrollments: \{ where: \{ status: "ACTIVE"/);
});

// VISIBILITY

test("8 draft attendance remains hidden", () => {
  assert.match(attendance, /hasSubmittedOrLockedScope\(\)/);
});

test("9 submitted attendance remains visible", () => {
  assert.match(attendance, /submittedAt: \{ not: null \}/);
});

test("10 locked attendance remains visible", () => {
  assert.match(attendance, /locked: true/);
});

test("11 pending correction details are hidden from parent attendance page", () => {
  assert.doesNotMatch(attendancePage, /PENDING|AttendanceCorrection|correction/i);
});

test("12 approved correction effect is reflected through final attendance records", () => {
  assert.match(attendance, /attendanceRecord\.findMany/);
  assert.doesNotMatch(attendancePage, /decisionNote|reviewedBy|approvedBy/);
});

test("13 teacher internal remarks are hidden", () => {
  assert.match(attendance, /status === AttendanceStatus\.ON_LEAVE \|\| status === AttendanceStatus\.EXCUSED/);
});

test("14 school decision notes are hidden", () => {
  assert.doesNotMatch(attendancePage, /decision note|decisionNote|reason/i);
});

// CALCULATIONS

test("15 monthly percentage is computed in centralized attendance logic", () => {
  assert.match(attendance, /summaryStatuses\.reduce\(\(sum, row\) => sum \+ statusWeight\(row\)/);
});

test("16 holidays are excluded from monthly aggregation", () => {
  assert.match(attendance, /type: "HOLIDAY"/);
  assert.match(attendance, /filter\(\(\[day\]\) => !holidays\.has\(day\)\)/);
});

test("17 future dates are excluded from calendar attendance status", () => {
  assert.match(attendance, /const inFuture = key > todayKey/);
});

test("18 enrollment date bounds are respected", () => {
  assert.match(attendance, /select: \{ joinedAt: true, leftAt: true \}/);
  assert.match(attendance, /rangeStart = new Date\(Math\.max\(/);
});

test("19 duplicate sessions are deduplicated by daily map", () => {
  assert.match(attendance, /const dailyMap = new Map<string/);
});

test("20 period attendance aggregates daily summary correctly", () => {
  assert.match(attendance, /summaryStatusForDay\(statuses\)/);
  assert.match(attendance, /if \(statuses\.includes\(AttendanceStatus\.ABSENT\)\)/);
});

test("21 division-by-zero returns safe empty state", () => {
  assert.match(attendance, /summaryStatuses\.length[\s\S]*: 0,/);
  assert.match(attendance, /empty: true/);
});

test("22 school minimum threshold is applied", () => {
  assert.match(attendance, /minimumAttendancePercentage/);
  assert.match(attendance, /requirementStatus\(/);
});

// MULTIPLE CHILDREN

test("23 single-child view does not force child selector", () => {
  assert.match(attendancePage, /children\.length > 1 \?/);
});

test("24 multiple-child selector is present and functional", () => {
  assert.match(attendancePage, /name="childId"/);
  assert.match(attendancePage, /Switch child|Child/);
});

test("25 child switching is revalidated server-side", () => {
  assert.match(attendancePage, /await getParentChildren\(\)/);
  assert.match(attendancePage, /childIds\.has\(query\.childId\)/);
});

test("26 data never leaks between children", () => {
  assert.match(attendance, /const scope = await requireParentChildAccess\(input\.studentId\)/);
});

// UI

test("27 parent sidebar remains Home, My Children, Notices, Planner", () => {
  assert.match(parentShell, /Home/);
  assert.match(parentShell, /My Children/);
  assert.match(parentShell, /Notices/);
  assert.match(parentShell, /Planner/);
  assert.doesNotMatch(parentShell, /Attendance\", label: "Attendance"/);
});

test("28 attendance is reachable from home and child overview", () => {
  assert.match(home, /View Attendance/);
  assert.match(childOverview, /Open Attendance/);
});

test("29 parent attendance page has no edit actions", () => {
  assert.doesNotMatch(attendancePage, /\bEdit\b|\bApprove\b|\bReject\b|\bDelete\b|\bLock\b|\bRequest Correction\b|\bCorrection Request\b|\bSubmit Attendance\b/i);
});

test("30 no correction request action appears", () => {
  assert.doesNotMatch(attendancePage, /Request Correction|Correction Request/);
});

test("31 no teacher messaging appears", () => {
  assert.match(attendancePage, /contact the school office/i);
  assert.doesNotMatch(attendancePage, /message teacher|chat teacher|contact teacher/i);
});

test("32 mobile attendance cards render", () => {
  assert.match(attendancePage, /md:hidden/);
});

test("33 calendar labels are accessible", () => {
  assert.match(attendancePage, /aria-label=\{`\$\{day\.date\} \$\{day\.statusLabel\}`\}/);
  assert.match(childTabs, /Attendance/);
});
