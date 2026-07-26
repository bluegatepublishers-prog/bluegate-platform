import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("class materials are teacher-owned and canonically tenant scoped", () => {
  const schema = read("prisma/schema.prisma");
  const model = schema.match(/model ClassMaterial \{[\s\S]*?\n\}/)?.[0] ?? "";
  for (const field of [
    "publisherId",
    "schoolId",
    "academicYearId",
    "schoolClassId",
    "sectionId",
    "sectionSubjectId",
    "subjectId",
    "teacherId",
  ]) {
    assert.match(model, new RegExp(`${field}\\s+String`));
  }
  assert.match(model, /archivedAt\s+DateTime\?/);
  assert.match(model, /sourceMaterialId\s+String\?/);
  assert.match(model, /@@index\(\[teacherId, sectionId, subjectId, archivedAt\]\)/);
});

test("teacher class reads start from live official assignments", () => {
  const service = read("lib/classroom.ts");
  assert.match(service, /teacherId: teacher\.id/);
  assert.match(service, /schoolId: teacher\.schoolId/);
  assert.match(service, /active: true/);
  assert.match(service, /academicYear: \{ active: true, current: true, schoolId: teacher\.schoolId \}/);
  assert.match(service, /TeacherAssignmentType\.CLASS_TEACHER/);
  assert.match(service, /TeacherAssignmentType\.SUBJECT_TEACHER/);
});

test("material mutations derive ownership and never hard-delete records", () => {
  const actions = read("app/teacher-dashboard/classes/[sectionId]/materials/actions.ts");
  assert.match(actions, /requireTeacherClass\(sectionId\)/);
  assert.match(actions, /teacherId: scope\.teacher\.id/);
  assert.match(actions, /publisherId: scope\.publisherId/);
  assert.match(actions, /schoolId: scope\.schoolId/);
  assert.match(actions, /archivedAt: new Date\(\)/);
  assert.doesNotMatch(actions, /classMaterial\.delete/);
  assert.doesNotMatch(actions, /classMaterial\.deleteMany/);
});

test("teacher uploads require an assigned target section and bind uploader metadata", () => {
  const upload = read("lib/storage/upload-service.ts");
  assert.match(upload, /scope === "class-material"/);
  assert.match(upload, /sectionId: targetId/);
  assert.match(upload, /assignments: \{\s*some:/);
  assert.match(upload, /"uploader-user-id"/);
  assert.match(upload, /"target-id"/);
});

test("student class material reads derive current identity and shared visibility", () => {
  const service = read("lib/student-class-materials.ts");
  assert.match(service, /requireStudent\(\)/);
  assert.match(service, /publisherId: identity\.publisher\.id/);
  assert.match(service, /schoolId: identity\.school\.id/);
  assert.match(service, /academicYearId: identity\.academicYear\.id/);
  assert.match(service, /sectionId: identity\.enrollment\.sectionId/);
  assert.match(service, /\{ status: "SHARED" \}/);
  assert.match(service, /\{ status: "SCHEDULED", scheduledAt: \{ lte: now \} \}/);
});

test("new classroom UI has responsive list management and remembered class views", () => {
  const classes = read("components/classroom/ClassesView.tsx");
  const materials = read("components/classroom/MaterialManager.tsx");
  const tabs = read("components/classroom/ClassTabs.tsx");
  assert.match(classes, /localStorage\.getItem/);
  assert.match(classes, /localStorage\.setItem/);
  assert.match(materials, /fixed inset-y-0 right-0/);
  assert.doesNotMatch(`${classes}\n${materials}\n${tabs}`, /overflow-x-auto|min-w-\[[0-9]+px\]/);
});

test("phase two replaces the placeholder with one explicitly named classroom assignment domain", () => {
  const schema = read("prisma/schema.prisma");
  const page = read("app/teacher-dashboard/classes/[sectionId]/assignments/page.tsx");
  assert.doesNotMatch(schema, /model Assignment \{/);
  assert.equal((schema.match(/model ClassroomAssignment \{/g) ?? []).length, 1);
  assert.match(page, /getTeacherAssignments/);
});
