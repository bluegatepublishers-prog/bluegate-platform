import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("school dashboard routes remain school-role protected", () => {
  const proxy = source("proxy.ts");
  const authPolicy = source("lib/auth-policy.ts");
  const schoolDashboard = source("lib/school-dashboard.ts");

  assert.match(proxy, /"\/school-dashboard\/:path\*"/);
  assert.match(authPolicy, /\["\/school-dashboard", "SCHOOL"\]/);
  assert.match(schoolDashboard, /requireUser\(\["SCHOOL"\]\)/);
  assert.match(schoolDashboard, /status: "APPROVED"/);
  assert.match(schoolDashboard, /publisher: \{ active: true \}/);
});

test("student create and update remain school scoped with no trusted schoolId input", () => {
  const actions = source("app/school-dashboard/academic-actions.ts");

  assert.match(actions, /createStudent\(/);
  assert.match(actions, /schoolId: school\.id/);
  assert.match(actions, /findFirst\(\{\s*where: \{ id: sectionId/);
  assert.match(actions, /academicYearId/);
  assert.match(actions, /schoolClass:\s*\{[\s\S]*schoolId: school\.id/);
  assert.match(actions, /updateStudent\(studentId: string/);
  assert.match(actions, /findFirst\(\{ where: \{ id: studentId, schoolId: school\.id \}/);
});

test("student move workflow preserves history with transfer + new active row", () => {
  const actions = source("app/school-dashboard/academic-actions.ts");

  assert.match(actions, /changeStudentEnrollment\(/);
  assert.match(actions, /status: EnrollmentStatus\.TRANSFERRED/);
  assert.match(actions, /leftAt: movedOn/);
  assert.match(actions, /studentEnrollment\.create\(/);
  assert.match(actions, /status: EnrollmentStatus\.ACTIVE/);
  assert.doesNotMatch(actions, /studentEnrollment\.upsert\(/);
});

test("teacher assignment mutation validates tenant scope and year/section consistency", () => {
  const actions = source("app/school-dashboard/academic-actions.ts");

  assert.match(actions, /saveTeacherAssignment\(/);
  assert.match(actions, /academicYearId = text\(form, "academicYearId"\)/);
  assert.match(actions, /section\.schoolClass\.academicYearId !== academicYearId/);
  assert.match(actions, /teacher\.findFirst\(\{ where: \{ id: teacherId, schoolId: school\.id, active: true/);
  assert.match(actions, /classSection\.findFirst\(\{ where: \{ id: sectionId, active: true/);
  assert.match(actions, /sectionSubject\.findFirst/);
});

test("staff membership foundation is additive and school scoped", () => {
  const schema = source("prisma/schema.prisma");
  const schoolActions = source("app/school-dashboard/school-actions.ts");
  const staffPage = source("app/school-dashboard/staff/page.tsx");

  assert.match(schema, /model SchoolStaffMembership \{/);
  assert.match(schema, /enum SchoolStaffRole \{/);
  assert.match(schema, /activeKey\s+String\?\s+@unique/);
  assert.match(schema, /status\s+SchoolStaffMembershipStatus/);
  assert.match(schoolActions, /addSchoolStaffMembership\(/);
  assert.match(schoolActions, /status: SchoolStaffMembershipStatus\.ACTIVE/);
  assert.match(schoolActions, /updateSchoolStaffMembership\(/);
  assert.match(schoolActions, /findFirst\(\{[\s\S]*schoolId: school\.id/);
  assert.match(staffPage, /Create the user account first, then add the person to your institution\./);
});

test("student list supports required filters and login readiness state", () => {
  const academic = source("lib/academic.ts");
  const studentPage = source("app/school-dashboard/students/page.tsx");

  assert.match(academic, /getStudents\(filters:/);
  assert.match(academic, /academicYearId/);
  assert.match(academic, /schoolClassId/);
  assert.match(academic, /sectionId/);
  assert.match(academic, /active:\s*filters\.active/);
  assert.match(academic, /userId:\s*filters\.login === "enabled"/);
  assert.match(studentPage, /name="query"/);
  assert.match(studentPage, /name="year"/);
  assert.match(studentPage, /name="classId"/);
  assert.match(studentPage, /name="sectionId"/);
  assert.match(studentPage, /name="active"/);
  assert.match(studentPage, /name="login"/);
  assert.match(studentPage, /Login \{loginEnabled \? "Enabled" : "Not enabled"\}/);
});

test("dashboard checklist remains derived and school scoped", () => {
  const dashboard = source("app/school-dashboard/page.tsx");
  const schoolDashboard = source("lib/school-dashboard.ts");

  assert.match(dashboard, /Setup progress/);
  assert.match(dashboard, /Complete: \{step\.label\}/);
  assert.match(schoolDashboard, /buildSchoolSetupChecklist\(/);
  assert.match(schoolDashboard, /where: \{ schoolId: school\.id/);
});
