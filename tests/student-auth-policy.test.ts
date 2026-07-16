import assert from "node:assert/strict";
import test from "node:test";
import {
  decideProtectedRoute,
  getLoginDestination,
  isAllowedRoleCallback,
} from "../lib/auth-policy";

test("student login redirects to the student dashboard", () => {
  assert.equal(getLoginDestination("STUDENT", undefined, "/student-dashboard"), "/student-dashboard");
});

test("student callback accepts only safe student routes", () => {
  assert.equal(isAllowedRoleCallback("/student-dashboard/profile?from=login", "STUDENT"), true);
  assert.equal(isAllowedRoleCallback("/teacher-dashboard", "STUDENT"), false);
  assert.equal(isAllowedRoleCallback("//evil.example/student-dashboard", "STUDENT"), false);
  assert.equal(isAllowedRoleCallback("/%2f%2fevil.example", "STUDENT"), false);
});

test("unauthenticated student dashboard requests use student login", () => {
  assert.deepEqual(decideProtectedRoute("/student-dashboard/profile", undefined), {
    action: "login",
    destination: "/student-login",
  });
});

test("cross-role dashboard requests return the signed-in role home", () => {
  assert.deepEqual(decideProtectedRoute("/teacher-dashboard", "STUDENT"), {
    action: "role-home",
    destination: "/student-dashboard",
  });
  assert.deepEqual(decideProtectedRoute("/student-dashboard", "TEACHER"), {
    action: "role-home",
    destination: "/teacher-dashboard",
  });
  assert.deepEqual(decideProtectedRoute("/admin/resources", "STUDENT"), {
    action: "role-home",
    destination: "/student-dashboard",
  });
});
