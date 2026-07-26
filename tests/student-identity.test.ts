import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveStudentIdentity,
  studentSessionClaims,
  type CurrentEnrollmentRecord,
  type StudentIdentityDependencies,
  type StudentRecord,
} from "../lib/student-identity-service";

const student: StudentRecord = {
  id: "student-1",
  userId: "user-1",
  schoolId: "school-1",
  admissionNumber: "BG-001",
  name: "Aarav Student",
  email: "aarav@example.test",
  dateOfBirth: null,
  gender: null,
  active: true,
  school: {
    id: "school-1",
    schoolName: "Demo School",
    city: "Delhi",
    state: "Delhi",
    logoUrl: null,
    status: "APPROVED",
    publisherId: "publisher-1",
    publisher: { id: "publisher-1", active: true },
  },
};

const enrollment: CurrentEnrollmentRecord = {
  id: "enrollment-1",
  studentId: "student-1",
  schoolId: "school-1",
  academicYearId: "year-1",
  schoolClassId: "class-1",
  sectionId: "section-1",
  rollNumber: "12",
  status: "ACTIVE",
  academicYear: { id: "year-1", schoolId: "school-1", name: "2026-27", active: true, current: true },
  schoolClass: { id: "class-1", schoolId: "school-1", academicYearId: "year-1", name: "Class 6", active: true },
  section: { id: "section-1", schoolClassId: "class-1", name: "A", active: true },
};

function dependencies(overrides: Partial<StudentIdentityDependencies> = {}) {
  const calls = { plan: 0 };
  const value: StudentIdentityDependencies = {
    async findStudentByUserId() { return student; },
    async findCurrentEnrollment() { return enrollment; },
    async getEffectivePlan(studentId, academicYearId) {
      calls.plan += 1;
      assert.equal(studentId, student.id);
      assert.equal(academicYearId, enrollment.academicYearId);
      return { plan: "SCHOOL_PREMIUM", source: "SCHOOL", academicYearId, startsAt: new Date("2026-04-01"), endsAt: null };
    },
    ...overrides,
  };
  return { value, calls };
}

test("eligible student login resolves enrollment, plan, and session claims", async () => {
  const deps = dependencies();
  const result = await resolveStudentIdentity({ userId: "user-1", role: "STUDENT", userPublisherId: "publisher-1" }, deps.value);
  assert.equal(result.ok, true);
  assert.equal(deps.calls.plan, 1);
  assert.deepEqual(studentSessionClaims(result), {
    studentId: "student-1",
    schoolId: "school-1",
    publisherId: "publisher-1",
    academicYearId: "year-1",
    academicYear: "2026-27",
  });
  if (result.ok) {
    assert.equal(result.value.entitlements.plan, "SCHOOL_PREMIUM");
    assert.equal(result.value.entitlements.premium, true);
  }
});

test("wrong role is rejected before student data is loaded", async () => {
  let queried = false;
  const deps = dependencies({ async findStudentByUserId() { queried = true; return student; } });
  const result = await resolveStudentIdentity({ userId: "user-1", role: "TEACHER" }, deps.value);
  assert.deepEqual(result, { ok: false, reason: "WRONG_ROLE" });
  assert.equal(queried, false);
});

test("missing enrollment denies student identity and does not load entitlement", async () => {
  const deps = dependencies({ async findCurrentEnrollment() { return null; } });
  const result = await resolveStudentIdentity({ userId: "user-1", role: "STUDENT" }, deps.value);
  assert.deepEqual(result, { ok: false, reason: "NO_CURRENT_ENROLLMENT" });
  assert.equal(deps.calls.plan, 0);
});

test("archived school denies active learning identity without deleting the student identity", async () => {
  const archivedStudent = { ...student, school: { ...student.school, status: "ARCHIVED" } };
  const deps = dependencies({ async findStudentByUserId() { return archivedStudent; } });
  const result = await resolveStudentIdentity({ userId: "user-1", role: "STUDENT" }, deps.value);
  assert.deepEqual(result, { ok: false, reason: "SCHOOL_UNAVAILABLE" });
  assert.equal(deps.calls.plan, 0);
});

test("wrong publisher linkage denies student identity", async () => {
  const deps = dependencies();
  const result = await resolveStudentIdentity({ userId: "user-1", role: "STUDENT", userPublisherId: "publisher-2" }, deps.value);
  assert.deepEqual(result, { ok: false, reason: "WRONG_PUBLISHER" });
});

test("missing current academic year denies student identity", async () => {
  const deps = dependencies({ async findCurrentEnrollment() { return { ...enrollment, academicYear: { ...enrollment.academicYear, current: false } }; } });
  const result = await resolveStudentIdentity({ userId: "user-1", role: "STUDENT" }, deps.value);
  assert.deepEqual(result, { ok: false, reason: "INVALID_ACADEMIC_SCOPE" });
});

test("inactive enrollment is denied even when returned by a dependency", async () => {
  const deps = dependencies({ async findCurrentEnrollment() { return { ...enrollment, status: "WITHDRAWN" }; } });
  const result = await resolveStudentIdentity({ userId: "user-1", role: "STUDENT" }, deps.value);
  assert.deepEqual(result, { ok: false, reason: "INVALID_ACADEMIC_SCOPE" });
  assert.equal(deps.calls.plan, 0);
});

test("cross-school class and section data is rejected", async () => {
  const deps = dependencies({ async findCurrentEnrollment() { return { ...enrollment, schoolClass: { ...enrollment.schoolClass, schoolId: "school-2" } }; } });
  const result = await resolveStudentIdentity({ userId: "user-1", role: "STUDENT" }, deps.value);
  assert.deepEqual(result, { ok: false, reason: "INVALID_ACADEMIC_SCOPE" });
});
