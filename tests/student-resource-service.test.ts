import assert from "node:assert/strict";
import test from "node:test";
import { authorizeStudentResourceFromSubjects } from "../lib/student-resource-service";

const input = {
  resourceId: "resource-1",
  userId: "user-1",
  academicYearId: "year-1",
  sectionId: "section-1",
  subjects: [{ sectionSubjectId: "section-subject-1", resources: [{ id: "resource-1" }] }],
};

test("valid student resource scope calls central authorization and succeeds", async () => {
  let calls = 0;
  const resource = await authorizeStudentResourceFromSubjects(input, async (user, request) => {
    calls += 1;
    assert.deepEqual(user, { id: "user-1", role: "STUDENT" });
    assert.deepEqual(request, {
      resourceId: "resource-1",
      academicYearId: "year-1",
      sectionId: "section-1",
      sectionSubjectId: "section-subject-1",
    });
    return { decision: { allowed: true }, resource: { fileUrl: "protected-url" } };
  });
  assert.deepEqual(resource, { fileUrl: "protected-url" });
  assert.equal(calls, 1);
});

test("direct foreign or teacher-only resource ID is denied before authorization", async () => {
  let called = false;
  const resource = await authorizeStudentResourceFromSubjects(
    { ...input, resourceId: "not-in-safe-subject-view" },
    async () => { called = true; return { decision: { allowed: true }, resource: { fileUrl: "leak" } }; },
  );
  assert.equal(resource, null);
  assert.equal(called, false);
});

test("central entitlement denial never returns the protected resource", async () => {
  const resource = await authorizeStudentResourceFromSubjects(input, async () => ({
    decision: { allowed: false },
    resource: { fileUrl: "must-not-return" },
  }));
  assert.equal(resource, null);
});
