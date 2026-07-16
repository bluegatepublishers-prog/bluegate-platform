import assert from "node:assert/strict";
import test from "node:test";
import { ResourceAudience } from "@prisma/client";
import {
  assertResourceAllowedForAiAudience,
  filterResourcesForAiAudience,
  getAiVisibleResourceWhere,
  getAllowedResourceAudiencesForAiContext,
  isResourceAllowedForAiAudience,
} from "../lib/ai/resource-audience-policy";

const resources = [
  { id: "resource-teacher-only", audience: ResourceAudience.TEACHER_ONLY },
  { id: "resource-student", audience: ResourceAudience.STUDENT },
  { id: "resource-both", audience: ResourceAudience.BOTH },
];

test("teacher AI allowed set is deterministic and complete", () => {
  assert.deepEqual(getAllowedResourceAudiencesForAiContext("TEACHER"), [
    ResourceAudience.TEACHER_ONLY,
    ResourceAudience.STUDENT,
    ResourceAudience.BOTH,
  ]);
});

test("student AI allowed set deterministically excludes teacher-only", () => {
  assert.deepEqual(getAllowedResourceAudiencesForAiContext("STUDENT"), [
    ResourceAudience.STUDENT,
    ResourceAudience.BOTH,
  ]);
});

test("AI audience predicates enforce both contexts", () => {
  for (const audience of Object.values(ResourceAudience)) {
    assert.equal(isResourceAllowedForAiAudience("TEACHER", audience), true);
  }
  assert.equal(
    isResourceAllowedForAiAudience("STUDENT", ResourceAudience.TEACHER_ONLY),
    false,
  );
  assert.equal(isResourceAllowedForAiAudience("STUDENT", ResourceAudience.STUDENT), true);
  assert.equal(isResourceAllowedForAiAudience("STUDENT", ResourceAudience.BOTH), true);
});

test("AI Prisma filters contain only allowed audiences", () => {
  assert.deepEqual(getAiVisibleResourceWhere("STUDENT"), {
    audience: { in: [ResourceAudience.STUDENT, ResourceAudience.BOTH] },
  });
  assert.deepEqual(getAiVisibleResourceWhere("TEACHER"), {
    audience: {
      in: [
        ResourceAudience.TEACHER_ONLY,
        ResourceAudience.STUDENT,
        ResourceAudience.BOTH,
      ],
    },
  });
});

test("AI in-memory filtering matches each context", () => {
  assert.deepEqual(
    filterResourcesForAiAudience("TEACHER", resources).map(({ id }) => id),
    ["resource-teacher-only", "resource-student", "resource-both"],
  );
  assert.deepEqual(
    filterResourcesForAiAudience("STUDENT", resources).map(({ id }) => id),
    ["resource-student", "resource-both"],
  );
});

test("AI assertions use safe teacher-facing and student-facing messages", () => {
  assert.throws(
    () =>
      assertResourceAllowedForAiAudience(
        "STUDENT",
        ResourceAudience.TEACHER_ONLY,
      ),
    { message: "This learning material is not available for your account." },
  );
  assert.throws(
    () =>
      assertResourceAllowedForAiAudience(
        "TEACHER",
        "INVALID" as ResourceAudience,
      ),
    { message: "This resource is not available for this generation." },
  );
});
