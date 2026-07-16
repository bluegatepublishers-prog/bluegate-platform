import assert from "node:assert/strict";
import test from "node:test";
import { ResourceAudience } from "@prisma/client";
import {
  RESOURCE_AUDIENCE_OPTIONS,
  assertStudentCanUseResource,
  assertTeacherCanUseResource,
  canStudentUseResource,
  canTeacherUseResource,
  filterResourcesForStudent,
  filterResourcesForTeacher,
  getResourceAudienceLabel,
  validateResourceAudience,
} from "../lib/resource-audience-ui";
import {
  getStudentVisibleResourceWhere,
  getTeacherVisibleResourceWhere,
} from "../lib/resource-access-policy";

const resources = [
  { id: "resource-teacher-only", audience: ResourceAudience.TEACHER_ONLY },
  { id: "resource-student", audience: ResourceAudience.STUDENT },
  { id: "resource-both", audience: ResourceAudience.BOTH },
];

test("teacher visibility allows each declared audience", () => {
  for (const audience of Object.values(ResourceAudience)) {
    assert.equal(canTeacherUseResource(audience), true);
  }
});

test("student visibility denies teacher-only and allows student and both", () => {
  assert.equal(canStudentUseResource(ResourceAudience.TEACHER_ONLY), false);
  assert.equal(canStudentUseResource(ResourceAudience.STUDENT), true);
  assert.equal(canStudentUseResource(ResourceAudience.BOTH), true);
});

test("friendly labels map every audience deterministically", () => {
  assert.deepEqual(
    RESOURCE_AUDIENCE_OPTIONS.map(({ value, label }) => [value, label]),
    [
      [ResourceAudience.TEACHER_ONLY, "Teacher only"],
      [ResourceAudience.STUDENT, "Students"],
      [ResourceAudience.BOTH, "Teachers and students"],
    ],
  );
  assert.equal(getResourceAudienceLabel("INVALID" as ResourceAudience), "Unknown audience");
});

test("validation accepts only exact ResourceAudience values", () => {
  for (const audience of Object.values(ResourceAudience)) {
    assert.equal(validateResourceAudience(audience), audience);
  }
  for (const invalid of ["PUBLIC", "student", "", null, undefined, 1]) {
    assert.equal(validateResourceAudience(invalid), null);
  }
});

test("Prisma visibility conditions retain publisher and publication scope", () => {
  assert.deepEqual(getTeacherVisibleResourceWhere("publisher-a"), {
    publisherId: "publisher-a",
    published: true,
  });
  assert.deepEqual(getStudentVisibleResourceWhere("publisher-a"), {
    publisherId: "publisher-a",
    published: true,
    audience: { in: [ResourceAudience.STUDENT, ResourceAudience.BOTH] },
  });
});

test("in-memory filters mirror the teacher and student predicates", () => {
  assert.deepEqual(
    filterResourcesForTeacher(resources).map(({ id }) => id),
    ["resource-teacher-only", "resource-student", "resource-both"],
  );
  assert.deepEqual(
    filterResourcesForStudent(resources).map(({ id }) => id),
    ["resource-student", "resource-both"],
  );
});

test("audience assertions fail with safe messages", () => {
  assert.throws(
    () => assertStudentCanUseResource(ResourceAudience.TEACHER_ONLY),
    { message: "This learning material is not available for your account." },
  );
  assert.throws(
    () => assertTeacherCanUseResource("INVALID" as ResourceAudience),
    { message: "This resource is not available for your account." },
  );
  assert.doesNotThrow(() => assertTeacherCanUseResource(ResourceAudience.BOTH));
});
