import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(path), "utf8").replace(/\r\n/g, "\n");

test("credentials login verifies password before deriving student identity", () => {
  const auth = source("auth.ts");
  assert.ok(auth.indexOf("await verifyPassword") < auth.indexOf("await loadStudentIdentity"));
  // The student return block is the one that includes ...claims (spread operator)
  // This uniquely identifies the student authorize function's return statement
  // Find the ...claims and then find the return statement that precedes it
  const claimsIndex = auth.indexOf("...claims");
  const studentReturnIndex = auth.lastIndexOf("return {", claimsIndex);
  assert.ok(auth.indexOf("await loadStudentIdentity") < studentReturnIndex);
  assert.ok(claimsIndex > 0, "student return block with ...claims should exist");
});

test("Auth.js session exposes server-derived student claims", () => {
  const auth = source("auth.ts");
  for (const field of ["studentId", "publisherId", "schoolId", "academicYearId", "academicYear"]) {
    assert.match(auth, new RegExp(`session\\.user\\.${field} = token\\.${field}`));
  }
  assert.match(auth, /session\.user\.userId = token\.sub/);
});

test("requireStudent revalidates live identity and session scope", () => {
  const helper = source("lib/student-dashboard.ts");
  assert.match(helper, /await auth\(\)/);
  assert.match(helper, /await loadStudentIdentity/);
  assert.match(helper, /user\.studentId === identity\.value\.student\.id/);
  assert.match(helper, /user\.academicYearId === identity\.value\.academicYear\.id/);
});

test("every student dashboard page derives identity without URL ids", () => {
  for (const path of ["app/student-dashboard/page.tsx", "app/student-dashboard/profile/page.tsx"]) {
    const page = source(path);
    assert.match(page, /await requireStudent\(\)/);
    assert.doesNotMatch(page, /\bparams\b|searchParams/);
  }
});

test("student profile is read-only and dashboard has no fake analytics", () => {
  const profile = source("app/student-dashboard/profile/page.tsx");
  assert.doesNotMatch(profile, /<form|<input|<button/);
  const dashboard = source("app/student-dashboard/page.tsx");
  assert.doesNotMatch(dashboard, /score|progress|completed lessons|assignments/i);
  assert.match(dashboard, /Continue Learning/);
});

test("proxy protects the complete student dashboard subtree", () => {
  const proxy = source("proxy.ts");
  assert.match(proxy, /"\/student-dashboard\/:path\*"/);
  assert.match(proxy, /decideProtectedRoute/);
});
