import assert from "node:assert/strict";
import test from "node:test";
import { decideProtectedRoute } from "../lib/auth-policy";

test("unauthenticated school dashboard request redirects to school login", () => {
  assert.deepEqual(decideProtectedRoute("/school-dashboard/students", undefined), {
    action: "login",
    destination: "/school-login",
  });
});

test("non-school roles are denied school admin pages and redirected home", () => {
  assert.deepEqual(decideProtectedRoute("/school-dashboard", "TEACHER"), {
    action: "role-home",
    destination: "/teacher-dashboard",
  });
  assert.deepEqual(decideProtectedRoute("/school-dashboard", "STUDENT"), {
    action: "role-home",
    destination: "/student-dashboard",
  });
  assert.deepEqual(decideProtectedRoute("/school-dashboard", "PARENT"), {
    action: "role-home",
    destination: "/parent-dashboard",
  });
});

test("school role is allowed school dashboard routes", () => {
  assert.deepEqual(decideProtectedRoute("/school-dashboard/staff", "SCHOOL"), {
    action: "allow",
  });
});
