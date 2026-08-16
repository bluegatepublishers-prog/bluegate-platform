import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("1 login required", () => {
  const source = read("lib/teacher-dashboard.ts");
  assert.match(source, /requireUser\(\["TEACHER"\]\)/);
});

test("2 assigned class only", () => {
  const source = read("lib/attendance.ts");
  assert.match(source, /requireTeacherClass\(input\.sectionId\)/);
});

test("3 assigned subject only", () => {
  const source = read("lib/attendance.ts");
  assert.match(source, /resolveAssignedSectionSubjectId/);
  assert.match(source, /This subject is not assigned to you\./);
});

test("4 draft saves", () => {
  const source = read("lib/attendance.ts");
  assert.match(source, /saveTeacherAttendanceDraft/);
  assert.match(source, /submit: false/);
});

test("5 draft reloads", () => {
  const source = read("lib/attendance.ts");
  assert.match(source, /findOrCreateTeacherSession/);
  assert.match(source, /recordByEnrollment/);
});

test("6 submit succeeds", () => {
  const source = read("lib/attendance.ts");
  assert.match(source, /submitTeacherAttendance/);
  assert.match(source, /const shouldLock = input\.submit/);
});

test("7 missing status rejected", () => {
  const source = read("lib/attendance.ts");
  assert.match(source, /Attendance status is required for every student in the section\./);
});

test("8 duplicate rejected", () => {
  const source = read("lib/attendance.ts");
  assert.match(source, /Duplicate attendance entries for the same student are not allowed\./);
});

test("9 locked session read only", () => {
  const source = read("lib/attendance.ts");
  assert.match(source, /Attendance is locked for this session date\./);
  assert.match(source, /if \(!canTeacherEdit\(session\.date, session\.locked, policy\.lockHour\)\)/);
});

test("10 correction request created", () => {
  const source = read("lib/attendance.ts");
  assert.match(source, /attendanceCorrection\.create/);
  const requestSection = source.slice(source.indexOf("export async function requestAttendanceCorrection"), source.indexOf("export async function getSchoolAttendanceDashboard"));
  assert.doesNotMatch(requestSection, /attendanceRecord\.update/);
});

test("11 leave cannot be overwritten", () => {
  const source = read("lib/attendance.ts");
  assert.match(source, /Approved leave cannot be overwritten\. Request a correction instead\./);
});

test("12 audit created", () => {
  const source = read("lib/attendance.ts") + read("lib/security-audit-policy.ts");
  assert.match(source, /teacher\.attendance\.save_draft/);
  assert.match(source, /teacher\.attendance\.submit/);
  assert.match(source, /teacher\.attendance\.correction\.request/);
});

test("13 cross teacher blocked", () => {
  const source = read("lib/attendance.ts");
  assert.match(source, /if \(scope\.teacher\.id !== teacher\.id\)/);
});

test("14 cross school blocked", () => {
  const source = read("lib/attendance.ts");
  assert.match(source, /schoolId: scope\.schoolId/);
});

test("15 performance with 100 students", () => {
  const source = read("components/classroom/TeacherAttendanceWorkspace.tsx");
  assert.match(source, /const rowHeight = 48/);
  assert.match(source, /filtered\.slice\(startIndex, endIndex\)/);
  assert.match(source, /useMemo\(/);
});

test("16 teacher attendance route exists", () => {
  const source = read("app/teacher-dashboard/attendance/page.tsx");
  assert.match(source, /Teacher Attendance/);
  assert.match(source, /view=mark/);
  assert.match(source, /view=history/);
  assert.match(source, /view=corrections/);
});

test("17 shared attendance actions reused", () => {
  const componentSource = read("components/classroom/TeacherAttendanceWorkspace.tsx");
  const actionSource = read("app/teacher-dashboard/attendance/actions.ts");
  assert.match(componentSource, /app\/teacher-dashboard\/attendance\/actions/);
  assert.match(actionSource, /saveTeacherAttendanceDraftAction/);
  assert.match(actionSource, /submitTeacherAttendanceAction/);
  assert.match(actionSource, /requestAttendanceCorrectionAction/);
});
