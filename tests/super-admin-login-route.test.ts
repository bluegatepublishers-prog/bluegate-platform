import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { decideProtectedRoute, getProtectedRouteRole } from "../lib/auth-policy";

const read = (path: string) => readFileSync(path, "utf8");

test("Super Admin login is public while the dashboard remains protected", () => {
  assert.equal(getProtectedRouteRole("/super-admin/login"), null);
  assert.deepEqual(decideProtectedRoute("/super-admin/login", undefined), { action: "allow" });
  assert.deepEqual(decideProtectedRoute("/super-admin", undefined), {
    action: "login",
    destination: "/super-admin/login",
  });
  assert.deepEqual(decideProtectedRoute("/super-admin/login", "SUPER_ADMIN"), { action: "allow" });
  assert.deepEqual(decideProtectedRoute("/super-admin", "SUPER_ADMIN"), { action: "allow" });
  assert.deepEqual(decideProtectedRoute("/super-admin", "ADMIN"), {
    action: "role-home",
    destination: "/admin",
  });
});

test("Super Admin login is outside the protected layout", () => {
  assert.equal(existsSync("app/(auth)/super-admin/login/page.tsx"), true);
  assert.equal(existsSync("app/super-admin/login/page.tsx"), false);
  assert.match(read("app/super-admin/layout.tsx"), /requireSuperAdmin/);
  assert.match(read("app/(auth)/super-admin/login/page.tsx"), /<LoginForm/);
  assert.match(read("app/(auth)/super-admin/login/page.tsx"), /redirectPath="\/super-admin"/);
});

test("credential authentication accepts a publisher-independent Super Admin", () => {
  const source = read("auth.ts");
  assert.match(source, /user\.role === "STUDENT" \|\| !user\.active/);
  assert.match(source, /isCredentialRolePublisherInvariantValid/);
  assert.match(source, /role: user\.role/);
  assert.doesNotMatch(source, /user\.role === "SUPER_ADMIN".*publisher/);
});
