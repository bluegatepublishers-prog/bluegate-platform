import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("school lifecycle uses retained states and has no publisher permanent-delete workflow", () => {
  const schema = read("prisma/schema.prisma");
  const lifecycle = read("lib/school-lifecycle.ts");
  const detail = read("app/admin/schools/[id]/page.tsx");
  for (const status of ["PAUSED", "SUSPENDED", "REVOKED", "ARCHIVED"]) {
    assert.match(schema, new RegExp(`\\b${status}\\b`));
  }
  assert.match(lifecycle, /publisher\.school\.permanent_delete\.blocked/);
  assert.match(lifecycle, /countSchoolDeletionDependencies/);
  assert.doesNotMatch(lifecycle, /school\.delete/);
  assert.match(detail, /Permanent deletion is not available here/);
});

test("school archival cannot cascade-delete permanent users, teachers, students, or enrollments", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/20260726180000_school_identity_retention/migration.sql");
  assert.match(schema, /user\s+User\s+@relation\(fields: \[userId\], references: \[id\], onDelete: Restrict\)/);
  assert.match(schema, /school\s+School\s+@relation\(fields: \[schoolId\], references: \[id\], onDelete: Restrict\)/);
  assert.match(schema, /student\s+Student\s+@relation\(fields: \[studentId\], references: \[id\], onDelete: Restrict\)/);
  assert.match(migration, /StudentEnrollment_studentId_fkey[\s\S]*ON DELETE RESTRICT/);
  assert.doesNotMatch(lifecycleSection(schema), /onDelete: Cascade/);
});

test("teacher membership ends without deleting the teacher and assignments retain end time", () => {
  const schema = read("prisma/schema.prisma");
  const actions = read("app/school-dashboard/school-actions.ts");
  assert.match(schema, /model SchoolStaffMembership[\s\S]*leftAt\s+DateTime\?/);
  assert.match(schema, /endedAt\s+DateTime\?/);
  assert.match(actions, /SchoolStaffMembershipStatus\.LEFT/);
  assert.match(actions, /endedAt: now/);
  assert.doesNotMatch(actions, /teacher\.delete/);
});

test("student transfer retains old enrollment and reuses permanent student and user IDs", () => {
  const transfer = read("lib/student-transfer.ts");
  assert.match(transfer, /status: EnrollmentStatus\.TRANSFERRED/);
  assert.match(transfer, /studentEnrollment\.create/);
  assert.match(transfer, /studentId: student\.id/);
  assert.match(transfer, /student\.update/);
  assert.doesNotMatch(transfer, /student\.create|user\.create|studentEnrollment\.delete/);
  assert.match(transfer, /schoolId: receivingSchool\.id/);
});

test("issued report cards are immutable snapshots authorized by permanent identity links", () => {
  const schema = read("prisma/schema.prisma");
  const service = read("lib/report-card-retention.ts");
  assert.match(schema, /model ReportCardSnapshot/);
  for (const field of ["schoolDisplayName", "academicYearName", "classDisplayName", "sectionDisplayName", "subjectResults", "issuedAt", "documentId", "version"]) {
    assert.match(schema, new RegExp(`\\b${field}\\b`));
  }
  assert.match(service, /where: \{ studentId: student\.id \}/);
  assert.match(service, /parentId: parent\.id/);
  assert.match(service, /status: "APPROVED"/);
  assert.doesNotMatch(service, /reportCardSnapshot\.(update|delete|upsert)/);
  assert.match(read("app/student-dashboard/reports/page.tsx"), /Historical records/);
  assert.match(read("app/parent-dashboard\/children\/[studentId]\/reports\/page.tsx"), /Current learning summary unavailable/);
});

test("publisher navigation and routes do not expose teacher mutation controls", () => {
  const sidebar = read("components/admin/AdminSidebar.tsx");
  const action = read("app/admin/teachers/actions.ts");
  const api = read("app/api/admin/teachers/[id]/route.ts");
  assert.doesNotMatch(sidebar, /\/admin\/teachers/);
  assert.match(action, /cannot modify teacher accounts or plans/);
  assert.doesNotMatch(action, /prisma\.teacher\.(update|delete|create)/);
  assert.match(api, /status: 403/);
  assert.doesNotMatch(api, /prisma\.teacher\.(update|delete|create)/);
});

test("school list is responsive without horizontal table layout", () => {
  const page = read("app/admin/schools/page.tsx");
  assert.match(page, /md:grid-cols/);
  assert.match(page, /break-words/);
  assert.doesNotMatch(page, /overflow-x-auto|min-w-\[[0-9]+px\]|<table/);
});

function lifecycleSection(schema: string) {
  return [
    schema.match(/model StudentEnrollment \{[\s\S]*?\n\}/)?.[0] ?? "",
    schema.match(/model SchoolStaffMembership \{[\s\S]*?\n\}/)?.[0] ?? "",
    schema.match(/model TeacherAssignment \{[\s\S]*?\n\}/)?.[0] ?? "",
  ].join("\n");
}
