import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getTeacherResourceAccessWithDependencies,
  getTeacherResourceScopeWithDependencies,
  type ResourceAccessDependencies,
} from "../lib/resource-access-service";

function makeDependencies(
  overrides: Partial<ResourceAccessDependencies> = {},
): ResourceAccessDependencies {
  return {
    findTeacher: async () => ({
      id: "teacher-1",
      active: true,
      schoolId: "school-1",
      school: { status: "APPROVED", publisherId: "publisher-1", publisher: { active: true } },
      schoolMemberships: [{ schoolId: "school-1", active: true, status: "ACTIVE" }],
    }),
    findTeacherAssignments: async () => [
      { sectionId: "section-1", subjectId: "subject-1", academicYearId: "ay-1" },
    ],
    findEntitledSectionSubjects: async () => [{ id: "section-subject-1" }],
    findSchool: async () => ({
      id: "school-1",
      status: "APPROVED",
      publisherId: "publisher-1",
      publisher: { active: true },
    }),
    isResourcesEnabled: async () => true,
    findResource: async () => null,
    ...overrides,
  };
}

test("teacher access state resolves READY for entitled scoped teachers", async () => {
  const result = await getTeacherResourceAccessWithDependencies(
    "user-1",
    makeDependencies(),
  );
  assert.equal(result.status, "READY");
  if (result.status === "READY") {
    assert.ok(result.resourceScope.where);
    assert.equal(result.resourceScope.teacher.id, "teacher-1");
  }
});

test("teacher access state resolves restricted statuses without throwing", async () => {
  const noAssignments = await getTeacherResourceAccessWithDependencies(
    "user-1",
    makeDependencies({ findTeacherAssignments: async () => [] }),
  );
  assert.equal(noAssignments.status, "NO_ASSIGNMENTS");

  const noEntitlements = await getTeacherResourceAccessWithDependencies(
    "user-1",
    makeDependencies({ findEntitledSectionSubjects: async () => [] }),
  );
  assert.equal(noEntitlements.status, "NO_ENTITLEMENTS");

  const resourcesDisabled = await getTeacherResourceAccessWithDependencies(
    "user-1",
    makeDependencies({ isResourcesEnabled: async () => false }),
  );
  assert.equal(resourcesDisabled.status, "RESOURCES_DISABLED");

  const invalidScope = await getTeacherResourceAccessWithDependencies(
    "user-1",
    makeDependencies({ findTeacher: async () => null }),
  );
  assert.equal(invalidScope.status, "INVALID_SCOPE");
});

test("legacy teacher resource scope helper returns null for restricted states", async () => {
  const scope = await getTeacherResourceScopeWithDependencies(
    "user-1",
    makeDependencies({ findTeacherAssignments: async () => [] }),
  );
  assert.equal(scope, null);
});

test("teacher and student dashboards render restricted-state cards instead of forcing 404s", () => {
  const teacherDashboard = readFileSync("app/teacher-dashboard/page.tsx", "utf8");
  const teacherService = readFileSync("lib/teacher-dashboard.ts", "utf8");
  const studentDashboard = readFileSync("app/student-dashboard/page.tsx", "utf8");
  const studentGuard = readFileSync("lib/student-dashboard.ts", "utf8");

  assert.match(teacherService, /access\.status === "NO_ASSIGNMENTS"/);
  assert.match(teacherService, /access\.status === "NO_ENTITLEMENTS"/);
  assert.match(teacherService, /access\.status === "RESOURCES_DISABLED"/);
  assert.match(teacherService, /if \(access\.status !== "READY"\) redirect\("\/teacher-dashboard"\)/);
  assert.match(teacherDashboard, /Limited dashboard access/);
  assert.match(teacherDashboard, /Your teaching assignment has not been configured yet/);

  assert.match(studentGuard, /status:\s*"NO_ENROLMENT"/);
  assert.match(studentGuard, /status:\s*"NO_CLASS_OR_SECTION"/);
  assert.match(studentGuard, /status:\s*"NO_ENTITLEMENTS"/);
  assert.match(studentGuard, /status:\s*"FEATURE_DISABLED"/);
  assert.match(studentGuard, /redirect\("\/student-dashboard"\)/);
  assert.match(studentDashboard, /Limited dashboard access/);
  assert.match(studentDashboard, /Your enrolment has not been completed yet/);
});
