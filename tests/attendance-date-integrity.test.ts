import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("lib/attendance.ts", "utf8");

function section(start: string, end: string) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `missing ${start}`);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `missing ${end}`);
  return source.slice(startIndex, endIndex);
}

test("Teacher date parsing requires an exact, real YYYY-MM-DD date", () => {
  const helpers = section("function parseTeacherAttendanceDate", "function assertAttendanceDateWithinAcademicYear");
  assert.match(helpers, /!\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\//);
  assert.match(helpers, /Attendance date must use YYYY-MM-DD/);
  assert.match(helpers, /Attendance date is invalid/);
  assert.match(helpers, /Date\.UTC\(year, month - 1, day\)/);
  assert.doesNotMatch(helpers, /return new Date\(\)/);
});

test("Teacher workspace defaults only a missing date and validates before session creation", () => {
  const workspace = section("export async function getTeacherAttendanceWorkspace", "async function writeTeacherAttendance");
  assert.match(workspace, /parseTeacherAttendanceDate\(input\.date, true\)/);
  assert.match(workspace, /assertTeacherAttendanceDate\(date, scope\.academicYear\)/);
  assert.ok(workspace.indexOf("assertTeacherAttendanceDate") < workspace.indexOf("findOrCreateTeacherSession"));
  assert.doesNotMatch(workspace, /parseDateInput\(input\.date\)/);
});

test("Teacher writes reject missing dates and validate before policy/session work", () => {
  const writer = section("async function writeTeacherAttendance", "export async function saveTeacherAttendanceDraft");
  assert.match(writer, /parseTeacherAttendanceDate\(input\.date\)/);
  assert.match(writer, /assertTeacherAttendanceDate\(date, scope\.academicYear\)/);
  assert.ok(writer.indexOf("assertTeacherAttendanceDate") < writer.indexOf("getSchoolAttendancePolicyBySchoolId"));
  assert.ok(writer.indexOf("assertTeacherAttendanceDate") < writer.indexOf("findOrCreateTeacherSession"));
  assert.doesNotMatch(writer, /parseDateInput\(input\.date\)/);
});

test("Teacher dates enforce inclusive academic-year boundaries and reject future days", () => {
  const helpers = section("function assertAttendanceDateWithinAcademicYear", "function lockCutoff");
  assert.match(helpers, /target < start \|\| target > end/);
  assert.match(helpers, /target > today/);
  assert.match(helpers, /Future attendance dates cannot be marked/);
});

test("Teacher session creation uses UTC day identity and a transaction advisory lock", () => {
  const creator = section("async function findOrCreateTeacherSession", "export async function getTeacherAttendanceWorkspace");
  assert.match(creator, /utcDayBounds\(input\.date\)/);
  assert.match(creator, /start\.toISOString\(\)\.slice\(0, 10\)/);
  assert.match(creator, /prisma\.\$transaction\(async \(tx\)/);
  assert.match(creator, /pg_advisory_xact_lock\(hashtext\(\$\{identityKey\}\)\)/);
  assert.ok(creator.indexOf("pg_advisory_xact_lock") < creator.indexOf("tx.attendanceSession.findFirst"));
  assert.ok(creator.indexOf("tx.attendanceSession.findFirst") < creator.indexOf("tx.attendanceSession.create"));
});

test("Session identity includes all logical scope fields and normalizes nullable values", () => {
  const creator = section("async function findOrCreateTeacherSession", "export async function getTeacherAttendanceWorkspace");
  for (const field of ["input.schoolId", "input.academicYearId", "input.classSectionId", "input.teacherId", "input.sessionType"]) {
    assert.match(creator, new RegExp(field.replace(".", "\\.")));
  }
  assert.match(creator, /sectionSubjectId \?\? ""/);
  assert.match(creator, /period \?\? ""/);
  assert.match(creator, /if \(existing\) return existing/);
  assert.match(creator, /date: \{ gte: start, lt: end \}/);
});

test("School bulk date locking rejects malformed dates and respects the current academic year", () => {
  const bulk = section("export async function bulkLockSchoolAttendanceByDate", "export async function reviewAttendanceCorrection");
  assert.match(bulk, /parseTeacherAttendanceDate\(input\.date\)/);
  assert.match(bulk, /academicYear\.findUnique/);
  assert.match(bulk, /assertAttendanceDateWithinAcademicYear\(date, currentAcademicYear\)/);
  assert.match(bulk, /utcDayBounds\(date\)/);
});