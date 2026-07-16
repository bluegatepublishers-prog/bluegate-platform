import assert from "node:assert/strict";
import test from "node:test";
import { ResourceAudience } from "@prisma/client";
import {
  decideResourceEntitlement,
  type ResourceEntitlementFacts,
} from "../lib/entitlements/resource-policy";

const allowed: ResourceEntitlementFacts = {
  authenticated: true,
  role: "TEACHER",
  recordFound: true,
  published: true,
  publisherActive: true,
  samePublisher: true,
  schoolActive: true,
  academicContext: true,
  assignment: true,
  enrollment: false,
  adoptionApproved: true,
  featureEnabled: true,
  audience: ResourceAudience.TEACHER_ONLY,
};

for (const audience of Object.values(ResourceAudience)) {
  test(`Teacher may use ${audience} when all outer checks pass`, () => {
    assert.equal(
      decideResourceEntitlement({ ...allowed, audience }).allowed,
      true,
    );
  });
}

test("Student is denied TEACHER_ONLY resource", () => {
  assert.deepEqual(
    decideResourceEntitlement({
      ...allowed,
      role: "STUDENT",
      assignment: false,
      enrollment: true,
    }),
    { allowed: false, reason: "RESOURCE_AUDIENCE_DENIED" },
  );
});

for (const audience of [ResourceAudience.STUDENT, ResourceAudience.BOTH]) {
  test(`Student may use ${audience} when enrollment and adoption pass`, () => {
    assert.deepEqual(
      decideResourceEntitlement({
        ...allowed,
        role: "STUDENT",
        assignment: false,
        enrollment: true,
        audience,
      }),
      { allowed: true, reason: "ALLOWED", source: "STUDENT_ENROLLMENT" },
    );
  });
}

test("disabled RESOURCES feature denies otherwise valid access", () => {
  assert.deepEqual(
    decideResourceEntitlement({ ...allowed, featureEnabled: false }),
    { allowed: false, reason: "FEATURE_DISABLED" },
  );
});

test("cross-publisher resource is denied", () => {
  assert.deepEqual(
    decideResourceEntitlement({ ...allowed, samePublisher: false }),
    { allowed: false, reason: "WRONG_PUBLISHER" },
  );
});

test("missing approved adoption denies book-scoped resource", () => {
  assert.deepEqual(
    decideResourceEntitlement({ ...allowed, adoptionApproved: false }),
    { allowed: false, reason: "BOOK_NOT_APPROVED" },
  );
});

test("Admin resource access remains publisher and feature scoped", () => {
  assert.deepEqual(
    decideResourceEntitlement({
      ...allowed,
      role: "ADMIN",
      published: false,
      academicContext: false,
      assignment: false,
    }),
    { allowed: true, reason: "ALLOWED", source: "PUBLISHER_ADMIN" },
  );
});
