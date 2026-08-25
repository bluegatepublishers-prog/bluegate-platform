import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("confirmed teacher import is a separate explicit mode and reuses the original workbook", () => {
  const route = read("app/school-dashboard/teachers/bulk-upload/validate/route.ts");
  assert.match(route, /formData\.get\("mode"\) === "import"/);
  assert.match(route, /new Uint8Array\(await file\.arrayBuffer\(\)\)/);
  assert.match(route, /importTeacherBulkWorkbook/);
  assert.match(route, /requireSchool\(\)/);
  assert.match(route, /revalidatePath\("\/school-dashboard\/teachers"\)/);
});

test("identity creation is atomic, school-scoped, and does not expose temporary credentials", () => {
  const writer = read("lib/teacher-bulk-import-write.ts");
  assert.match(writer, /prisma\.\$transaction\(operation, \{ isolationLevel: Prisma\.TransactionIsolationLevel\.Serializable \}\)/);
  assert.match(writer, /tx\.user\.create/);
  assert.match(writer, /tx\.teacher\.create/);
  assert.match(writer, /tx\.schoolStaffMembership\.create/);
  assert.match(writer, /schoolId: school\.id/);
  assert.match(writer, /mustChangePassword: true/);
  assert.match(writer, /randomBytes\(32\)/);
  assert.match(writer, /await issueSchoolTeacherActivation/);
  assert.doesNotMatch(writer, /temporaryPassword|initialPassword|credentialsWorkbook|password:\s*[^,}]*randomBytes/);
  assert.doesNotMatch(writer, /console\.(log|info|error).*email|console\.(log|info|error).*password/);
});

test("existing Teacher profiles are preserved and email collisions fail generically", () => {
  const writer = read("lib/teacher-bulk-import-write.ts");
  assert.match(writer, /Profile unchanged/);
  assert.match(writer, /This email is already in use by another account/);
  assert.match(writer, /existingUser\.role === UserRole\.TEACHER/);
  assert.match(writer, /existingUser\.teacher\?\.schoolId === school\.id/);
  assert.doesNotMatch(writer, /tx\.teacher\.update|tx\.user\.update/);
  assert.match(writer, /for \(const teacher of context\.teachers\) teacherIds\.set/);
});

test("assignment import rechecks hierarchy once, uses bounded bulk writes, and avoids unrelated writes", () => {
  const writer = read("lib/teacher-bulk-import-write.ts");
  assert.match(writer, /tx\.academicYear\.findMany/);
  assert.match(writer, /tx\.teacherAssignment\.findMany/);
  assert.match(writer, /tx\.teacherAssignment\.createMany/);
  assert.match(writer, /A different Teacher already has this active assignment/);
  assert.match(writer, /schoolMemberships: \{ some:/);
  assert.doesNotMatch(writer, /tx\.sectionSubject\.update|tx\.sectionSubject\.create|tx\.book\.update|tx\.timetable/);
  assert.doesNotMatch(writer, /Promise\.all\(\s*rows/);
});

test("assignment import supports class and subject assignment semantics and preserves idempotency", () => {
  const writer = read("lib/teacher-bulk-import-write.ts");
  assert.match(writer, /TeacherAssignmentType\.SUBJECT_TEACHER/);
  assert.match(writer, /TeacherAssignmentType\.CLASS_TEACHER/);
  assert.match(writer, /subjectId: item\.subject\?\.id \?\? null/);
  assert.match(writer, /if \(activeKeys\.has\(key\)\) continue/);
  assert.match(writer, /withSerializable/);
});

test("confirmed import processes identity work in batches and reports invitation failures safely", () => {
  const writer = read("lib/teacher-bulk-import-write.ts");
  assert.match(writer, /IDENTITY_BATCH_SIZE = 25/);
  assert.match(writer, /offset \+= IDENTITY_BATCH_SIZE/);
  assert.match(writer, /invitationFailed/);
  assert.match(writer, /Created · Invitation could not be sent/);
  assert.match(writer, /school\.teacher\.bulk_import/);
});

test("Teacher bulk UI requires explicit confirmation and blocks duplicate import clicks", () => {
  const client = read("components/school/TeacherBulkUploadClient.tsx");
  assert.match(client, /Import Teachers & Assignments/);
  assert.match(client, /window\.confirm/);
  assert.match(client, /formData\.set\("mode", "import"\)/);
  assert.match(client, /importing \|\| result/);
  assert.match(client, /Importing…/);
  assert.match(client, /no plaintext credentials workbook/i);
});

test("audit action is allow-listed without changing the schema", () => {
  const policy = read("lib/security-audit-policy.ts");
  assert.match(policy, /"school\.teacher\.bulk_import"/);
  assert.doesNotMatch(read("lib/teacher-bulk-import-write.ts"), /prisma\.migrate|schema\.prisma/);
});
