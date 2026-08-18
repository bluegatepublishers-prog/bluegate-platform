import assert from "node:assert/strict";
import test from "node:test";
import {
  decideBookEntitlement,
  type BookEntitlementFacts,
} from "../lib/entitlements/book-policy";

const allowed: BookEntitlementFacts = {
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
  schoolEntitled: true,
  scopeAssigned: true,
};

test("Publisher Admin may open a same-publisher book", () => {
  assert.deepEqual(
    decideBookEntitlement({
      ...allowed,
      role: "ADMIN",
      published: false,
      academicContext: false,
      assignment: false,
    }),
    { allowed: true, reason: "ALLOWED", source: "PUBLISHER_ADMIN" },
  );
});

test("Publisher Admin may not open another publisher's book", () => {
  assert.deepEqual(
    decideBookEntitlement({ ...allowed, role: "ADMIN", samePublisher: false }),
    { allowed: false, reason: "WRONG_PUBLISHER" },
  );
});

test("School active entitlement allows book access", () => {
  assert.deepEqual(
    decideBookEntitlement({
      ...allowed,
      role: "SCHOOL",
      assignment: false,
    }),
    {
      allowed: true,
      reason: "ALLOWED",
      source: "SCHOOL_BOOK_ENTITLEMENT",
    },
  );
});

test("School without an active entitlement is denied", () => {
  assert.deepEqual(
    decideBookEntitlement({ ...allowed, role: "SCHOOL", assignment: false, schoolEntitled: false }),
    { allowed: false, reason: "BOOK_NOT_APPROVED" },
  );
});

test("Teacher valid assignment and direct section-subject mapping allows book access", () => {
  assert.deepEqual(decideBookEntitlement(allowed), {
    allowed: true,
    reason: "ALLOWED",
    source: "TEACHER_ASSIGNMENT",
  });
});

test("Teacher wrong subject or assignment denies book access", () => {
  assert.deepEqual(decideBookEntitlement({ ...allowed, assignment: false }), {
    allowed: false,
    reason: "NO_ASSIGNMENT",
  });
});

test("Teacher wrong publisher denies before adoption", () => {
  assert.deepEqual(decideBookEntitlement({ ...allowed, samePublisher: false }), {
    allowed: false,
    reason: "WRONG_PUBLISHER",
  });
});

test("Student valid enrollment and direct section-subject mapping allows a full book without premium", () => {
  const facts: BookEntitlementFacts = {
    ...allowed,
    role: "STUDENT",
    assignment: false,
    enrollment: true,
  };
  assert.equal("premium" in facts, false);
  assert.deepEqual(decideBookEntitlement(facts), {
    allowed: true,
    reason: "ALLOWED",
    source: "STUDENT_ENROLLMENT",
  });
});

test("Student wrong section or academic year denies book access", () => {
  assert.deepEqual(
    decideBookEntitlement({
      ...allowed,
      role: "STUDENT",
      assignment: false,
      enrollment: false,
      academicContext: false,
    }),
    { allowed: false, reason: "NO_ACADEMIC_CONTEXT" },
  );
});

test("Super Admin receives no implicit ordinary tenant book access", () => {
  assert.deepEqual(decideBookEntitlement({ ...allowed, role: "SUPER_ADMIN" }), {
    allowed: false,
    reason: "WRONG_ROLE",
  });
});
