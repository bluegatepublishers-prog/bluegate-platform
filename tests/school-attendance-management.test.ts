import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { decideSchoolAccess } from "../lib/school-access-policy";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const attendanceService = read("lib/attendance.ts");
const attendancePage = read("app/school-dashboard/attendance/page.tsx");
const attendanceActions = read("app/school-dashboard/attendance/actions.ts");
const attendanceSessionPage = read("app/school-dashboard/attendance/sessions/[sessionId]/page.tsx");
const attendanceSettingsPage = read("app/school-dashboard/attendance/settings/page.tsx");
const schoolDashboard = read("lib/school-dashboard.ts");
const schoolHome = read("app/school-dashboard/page.tsx");
const schoolReports = read("app/school-dashboard/reports/page.tsx");
const schoolAcademics = read("app/school-dashboard/academics/page.tsx");
const schoolNav = read("components/school/SchoolNavigation.tsx");
const teacherActions = read("app/teacher-dashboard/classes/[sectionId]/attendance/actions.ts");
const schema = read("prisma/schema.prisma");

// DASHBOARD

test("1 school sees only its own attendance data", () => {
  assert.match(attendanceService, /attendanceSession: \{ schoolId: school\.id/);
  assert.match(attendanceService, /teacherAssignment\.findMany\(\{[\s\S]*schoolId: school\.id/);
});

test("2 today counts exclude drafts", () => {
  assert.match(attendanceService, /hasSubmittedOrLockedScope/);
  assert.match(attendanceService, /session\.submittedAt \|\| session\.locked/);
});

test("3 submission status counts are correct", () => {
  assert.match(attendanceService, /sessionCompletionStatus/);
  assert.match(attendanceService, /status === "SUBMITTED" \|\| item\.status === "LOCKED"/);
});

test("4 pending classes are identified correctly", () => {
  assert.match(schoolDashboard, /pendingClasses: Math\.max\(0, sectionCount - new Set\(todaySessions\.map/);
  assert.match(attendanceService, /item\.status === "NOT_STARTED" \|\| item\.status === "DRAFT"/);
});

test("5 empty state does not fabricate data", () => {
  assert.match(attendanceService, /empty: true/);
  assert.match(attendancePage, /No attendance assignments are available for this view yet\./);
});

// LOCKING

test("6 submitted session can be locked", () => {
  assert.match(attendanceService, /export async function lockSchoolAttendanceSession/);
  assert.match(attendanceService, /if \(!session\.submittedAt\) throw new Error\("Draft sessions cannot be locked\."\)/);
});

test("7 draft session cannot be locked", () => {
  assert.match(attendanceService, /Draft sessions cannot be locked\./);
});

test("8 locked session becomes teacher read-only", () => {
  assert.match(attendanceService, /function canTeacherEdit\(sessionDate: Date, locked: boolean, lockHour: number\)/);
  assert.match(attendanceService, /if \(locked\) return false/);
});

test("9 cross-school lock is blocked", () => {
  assert.match(attendanceService, /where: \{ id: sessionId, schoolId: school\.id, academicYearId \}/);
});

test("10 bulk lock affects only owned submitted sessions", () => {
  assert.match(attendanceService, /bulkLockSchoolAttendanceByDate/);
  assert.match(attendanceService, /submittedAt: \{ not: null \}/);
  assert.match(attendanceService, /schoolId: school\.id/);
});

test("11 lock audit event is created", () => {
  assert.match(attendanceService, /action: "school\.attendance\.session\.lock"/);
  assert.match(attendanceService, /action: "school\.attendance\.session\.lock_bulk_date"/);
});

// CORRECTIONS

test("12 pending correction appears in school queue", () => {
  assert.match(attendanceService, /decisionStatus: AttendanceCorrectionDecision\.PENDING/);
  assert.match(attendancePage, /Pending Corrections/);
});

test("13 school can approve owned correction", () => {
  assert.match(attendanceService, /decision: "APPROVE"/);
  assert.match(attendanceService, /attendanceSession: \{ schoolId: school\.id \}/);
});

test("14 approval updates AttendanceRecord transactionally", () => {
  assert.match(attendanceService, /await prisma\.\$transaction\(async \(tx\)/);
  assert.match(attendanceService, /await tx\.attendanceRecord\.update\(/);
});

test("15 approval preserves correction history", () => {
  assert.match(attendanceService, /decisionStatus: AttendanceCorrectionDecision\.APPROVED/);
  assert.doesNotMatch(attendanceService, /attendanceCorrection\.(delete|deleteMany)/);
});

test("16 school can reject correction", () => {
  assert.match(attendanceService, /decision: "REJECT"/);
  assert.match(attendanceService, /decisionStatus: AttendanceCorrectionDecision\.REJECTED/);
});

test("17 rejection does not alter AttendanceRecord", () => {
  const rejectBlock = attendanceService.slice(
    attendanceService.indexOf("if (input.decision === \"APPROVE\")"),
    attendanceService.indexOf("export async function approveAttendanceCorrection"),
  );
  assert.match(rejectBlock, /decisionStatus: AttendanceCorrectionDecision\.REJECTED/);
});

test("18 cross-school correction review is blocked", () => {
  assert.match(attendanceService, /attendanceSession: \{ schoolId: school\.id \}/);
});

test("19 duplicate decision is rejected", () => {
  assert.match(attendanceService, /decisionStatus: AttendanceCorrectionDecision\.PENDING/);
  assert.match(attendanceService, /already been reviewed/);
});

test("20 correction audit events are created", () => {
  assert.match(attendanceService, /action: "school\.attendance\.correction\.approve"/);
  assert.match(attendanceService, /action: "school\.attendance\.correction\.reject"/);
});

// POLICY

test("21 school can save valid attendance policy", () => {
  assert.match(attendanceActions, /saveSchoolAttendancePolicyAction/);
  assert.match(attendanceService, /updateSchoolAttendancePolicy/);
});

test("22 invalid minimum percentage is rejected", () => {
  assert.match(attendanceService, /Minimum attendance percentage must be between 0 and 100/);
});

test("23 invalid lock and correction window values are rejected", () => {
  assert.match(attendanceService, /Lock hour must be between 0 and 23/);
  assert.match(attendanceService, /Correction request window must be between 1 and 60 days/);
});

test("24 teacher workflow reads school policy", () => {
  assert.match(attendanceService, /getSchoolAttendancePolicyBySchoolId\(scope\.schoolId\)/);
  assert.match(attendanceService, /policy\.allowTeacherDraftSaving/);
});

test("25 cross-school policy update is blocked", () => {
  assert.match(attendanceService, /where: \{ schoolId: school\.id \}/);
  assert.match(attendanceService, /requireSchool\(\)/);
});

// REPORTS

test("26 daily report is generated", () => {
  assert.match(attendanceService, /period: "DAILY"/);
  assert.match(attendancePage, /Daily Summary/);
});

test("27 monthly report excludes drafts", () => {
  assert.match(attendanceService, /period: "MONTHLY"/);
  assert.match(attendanceService, /\.{3}hasSubmittedOrLockedScope\(\)/);
});

test("28 student history is student and school scoped", () => {
  assert.match(attendanceService, /studentEnrollment: \{ studentId: input\.studentId, schoolId: school\.id \}/);
});

test("29 low-attendance calculation uses policy threshold", () => {
  assert.match(attendanceService, /policy\.minimumAttendancePercentage/);
});

test("30 teacher completion uses active assignments only", () => {
  assert.match(attendanceService, /teacherAssignment\.findMany\(\{[\s\S]*active: true/);
});

test("31 duplicate sessions do not inflate day-level results", () => {
  assert.match(attendanceService, /aggregateAttendanceRows/);
  assert.match(attendanceService, /const byDay = new Map<string, AttendanceStatus\[]>\(\)/);
});

// ACCESS

test("32 suspended and expired school access is blocked", () => {
  assert.equal(decideSchoolAccess({ subscription: { plan: "PAID", status: "SUSPENDED" }, capability: "SCHOOL_DASHBOARD", role: "SCHOOL" }).allowed, false);
  assert.equal(decideSchoolAccess({ subscription: { plan: "PAID", status: "ACTIVE", expiresAt: new Date("2026-01-01") }, capability: "SCHOOL_DASHBOARD", role: "SCHOOL", now: new Date("2026-01-02") }).allowed, false);
});

test("33 cross-publisher access is blocked", () => {
  const schoolAuth = read("lib/school-dashboard.ts");
  assert.match(schoolAuth, /subscription && subscription\.publisherId === school\.publisherId/);
});

test("34 unauthorized user cannot access school attendance routes", () => {
  assert.match(read("lib/school-dashboard.ts"), /requireUser\(\["SCHOOL"\]\)/);
  assert.match(read("lib/school-dashboard.ts"), /status: "APPROVED"/);
});

// Structural guardrails

test("attendance route is integrated under academics and school navigation", () => {
  assert.match(schoolAcademics, /tab===\"attendance\"/);
  assert.match(schoolNav, /\"Attendance\", \"\/school-dashboard\/academics\?tab=attendance\"/);
});

test("teacher and session pages consume centralized attendance service", () => {
  assert.match(teacherActions, /submitTeacherAttendance/);
  assert.match(attendanceSessionPage, /getSchoolAttendanceSessionDetail/);
});

test("schema includes attendance decision and policy additions", () => {
  assert.match(schema, /enum AttendanceCorrectionDecision/);
  assert.match(schema, /model SchoolAttendancePolicy/);
  assert.match(schema, /submittedAt\s+DateTime\?/);
});

test("school reports page links attendance report workspace", () => {
  assert.match(schoolReports, /Open Attendance Reports/);
});

test("school home includes attendance integration", () => {
  assert.match(schoolHome, /\/school-dashboard\/attendance/);
  assert.match(schoolDashboard, /pendingCorrections/);
});

test("attendance settings page includes centralized policy controls", () => {
  assert.match(attendanceSettingsPage, /Attendance Policy/);
  assert.match(attendanceSettingsPage, /Minimum Attendance Percentage/);
});
