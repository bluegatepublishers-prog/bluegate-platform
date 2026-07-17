import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  decideProtectedRoute,
  getLoginDestination,
  isAllowedRoleCallback,
} from "../lib/auth-policy";
import {
  loadTrustedPlatformOwnerActor,
  trustedPlatformOwnerActor,
  type LivePlatformOwnerRecord,
} from "../lib/platform-owner-policy";
import {
  isCredentialRolePublisherInvariantValid,
  isRolePublisherInvariantValid,
} from "../lib/role-publisher-policy";
import {
  decideSuperAdminProvisioning,
  parseSuperAdminProvisioningEnvironment,
  SuperAdminProvisioningConflictError,
  validateSuperAdminPassword,
} from "../lib/super-admin-provisioning-policy";

const read = (path: string) => readFileSync(path, "utf8");
const noProfiles = {
  school: null,
  teacher: null,
  student: null,
  mentor: null,
  parent: null,
};
const cleanSuperAdmin: LivePlatformOwnerRecord = {
  id: "platform-owner",
  name: "Platform Owner",
  role: "SUPER_ADMIN",
  publisherId: null,
  publisher: null,
  ...noProfiles,
};

test("role and publisher invariants fail malformed identities closed", () => {
  assert.equal(isRolePublisherInvariantValid(cleanSuperAdmin), true);
  assert.equal(isRolePublisherInvariantValid({
    role: "SUPER_ADMIN",
    publisherId: "publisher-a",
    publisher: { id: "publisher-a", active: true },
  }), false);
  assert.equal(isCredentialRolePublisherInvariantValid({
    role: "TEACHER",
    publisherId: "publisher-a",
    publisher: { id: "publisher-a", active: true },
    tenantOwnerPublisherId: "publisher-b",
  }), false);
  assert.equal(isRolePublisherInvariantValid({
    role: "ADMIN",
    publisherId: null,
    publisher: null,
  }), false);
  assert.equal(isRolePublisherInvariantValid({
    role: "ADMIN",
    publisherId: "publisher-a",
    publisher: { id: "publisher-a", active: true },
  }, { requireActivePublisher: true }), true);
  assert.equal(isRolePublisherInvariantValid({
    role: "ADMIN",
    publisherId: "publisher-a",
    publisher: { id: "publisher-a", active: false },
  }, { requireActivePublisher: true }), false);

  for (const role of ["SCHOOL", "TEACHER", "STUDENT", "MENTOR"]) {
    assert.equal(isRolePublisherInvariantValid({
      role,
      publisherId: "publisher-a",
      publisher: { id: "publisher-a", active: true },
    }), true);
    assert.equal(isRolePublisherInvariantValid({
      role,
      publisherId: null,
      publisher: null,
    }), false);
  }
  assert.equal(isRolePublisherInvariantValid({
    role: "PARENT",
    publisherId: null,
    publisher: null,
  }), true);
  assert.equal(isRolePublisherInvariantValid({
    role: "PARENT",
    publisherId: "publisher-a",
    publisher: { id: "publisher-a", active: true },
  }), false);
});

test("live platform-owner authorization re-reads and returns a minimum actor", async () => {
  const loadedIds: string[] = [];
  const actor = await loadTrustedPlatformOwnerActor("platform-owner", async (id) => {
    loadedIds.push(id);
    return cleanSuperAdmin;
  });

  assert.deepEqual(loadedIds, ["platform-owner"]);
  assert.deepEqual(actor, { id: "platform-owner", name: "Platform Owner" });
  assert.equal(Object.hasOwn(actor!, "role"), false);
  assert.equal(Object.hasOwn(actor!, "publisherId"), false);
});

test("missing, deleted, demoted, mismatched, and malformed live users are rejected", async () => {
  assert.equal(await loadTrustedPlatformOwnerActor(undefined, async () => cleanSuperAdmin), null);
  assert.equal(await loadTrustedPlatformOwnerActor("deleted", async () => null), null);
  assert.equal(trustedPlatformOwnerActor("platform-owner", {
    ...cleanSuperAdmin,
    role: "ADMIN",
    publisherId: "publisher-a",
    publisher: { id: "publisher-a", active: true },
  }), null, "an old SUPER_ADMIN JWT cannot authorize a demoted live user");
  assert.equal(trustedPlatformOwnerActor("different-session-user", cleanSuperAdmin), null);
  assert.equal(trustedPlatformOwnerActor("platform-owner", {
    ...cleanSuperAdmin,
    publisherId: "publisher-a",
    publisher: { id: "publisher-a", active: true },
  }), null);
});

test("any attached tenant profile invalidates a platform owner", () => {
  for (const profile of ["school", "teacher", "student", "mentor", "parent"] as const) {
    assert.equal(trustedPlatformOwnerActor("platform-owner", {
      ...cleanSuperAdmin,
      [profile]: { id: `${profile}-profile` },
    }), null, `${profile} profile must fail closed`);
  }
});

test("Super Admin callbacks remain isolated to the platform namespace", () => {
  assert.equal(getLoginDestination("SUPER_ADMIN", undefined, "/super-admin"), "/super-admin");
  assert.equal(isAllowedRoleCallback("/super-admin/publishers?from=login", "SUPER_ADMIN"), true);
  assert.equal(isAllowedRoleCallback("/admin", "SUPER_ADMIN"), false);
  assert.equal(isAllowedRoleCallback("https://evil.example/super-admin", "SUPER_ADMIN"), false);
  assert.deepEqual(decideProtectedRoute("/super-admin", undefined), {
    action: "login",
    destination: "/super-admin/login",
  });
  assert.deepEqual(decideProtectedRoute("/super-admin/publishers", "ADMIN"), {
    action: "role-home",
    destination: "/admin",
  });
});

test("every platform-owner read and mutation invokes the live guard", () => {
  for (const path of [
    "app/super-admin/layout.tsx",
    "app/super-admin/page.tsx",
    "app/super-admin/publishers/page.tsx",
    "app/super-admin/publishers/[id]/page.tsx",
    "app/super-admin/publishers/actions.ts",
  ]) {
    assert.match(read(path), /requireSuperAdmin/);
  }
  const context = read("lib/publisher-context.ts");
  const authorization = read("lib/platform-owner-authorization.ts");
  assert.match(context, /requireLiveSuperAdmin/);
  assert.match(authorization, /session\?\.user\?\.id/);
  assert.match(authorization, /prisma\.user\.findUnique/);
});

test("provisioning inputs are normalized and password policy respects bcrypt limits", () => {
  assert.match(validateSuperAdminPassword("weakpassword")!, /uppercase/);
  assert.match(validateSuperAdminPassword("WeakPassword1")!, /special/);
  assert.equal(validateSuperAdminPassword("StrongPassword1!"), null);
  assert.match(validateSuperAdminPassword(`StrongPassword1!${"x".repeat(60)}`)!, /72 UTF-8 bytes/);

  assert.deepEqual(parseSuperAdminProvisioningEnvironment({
    SUPER_ADMIN_NAME: "  Platform   Owner ",
    SUPER_ADMIN_EMAIL: " OWNER@EXAMPLE.COM ",
    SUPER_ADMIN_PASSWORD: "StrongPassword1!",
  }), {
    name: "Platform Owner",
    email: "owner@example.com",
    password: "StrongPassword1!",
  });
});

test("provisioning creates new or updates only an already clean Super Admin", () => {
  assert.equal(decideSuperAdminProvisioning(null), "CREATE");
  assert.equal(decideSuperAdminProvisioning({
    role: "SUPER_ADMIN",
    publisherId: null,
    ...noProfiles,
  }), "UPDATE_CLEAN_SUPER_ADMIN");
});

test("provisioning never converts an existing tenant identity", () => {
  for (const role of ["ADMIN", "SCHOOL", "TEACHER", "STUDENT", "MENTOR", "PARENT"]) {
    assert.throws(() => decideSuperAdminProvisioning({
      role,
      publisherId: role === "PARENT" ? null : "publisher-a",
      ...noProfiles,
    }), SuperAdminProvisioningConflictError);
  }
});

test("provisioning rejects malformed Super Admins and every attached profile", () => {
  assert.throws(() => decideSuperAdminProvisioning({
    role: "SUPER_ADMIN",
    publisherId: "publisher-a",
    ...noProfiles,
  }), SuperAdminProvisioningConflictError);

  for (const profile of ["school", "teacher", "student", "mentor", "parent"] as const) {
    assert.throws(() => decideSuperAdminProvisioning({
      role: "SUPER_ADMIN",
      publisherId: null,
      ...noProfiles,
      [profile]: { id: `${profile}-profile` },
    }), SuperAdminProvisioningConflictError);
  }
});

test("provisioning script cannot promote, detach, or log credentials", () => {
  const source = read("scripts/provision-super-admin.ts");
  const policy = read("lib/super-admin-provisioning-policy.ts");
  assert.doesNotMatch(source, /CONFIRM_CONVERT|allowExistingUserConversion/);
  assert.doesNotMatch(policy, /CONFIRM_CONVERT|allowExistingUserConversion/);
  assert.match(source, /decideSuperAdminProvisioning/);
  assert.match(source, /hashPassword/);
  assert.match(source, /verifyPassword/);
  assert.match(source, /role: UserRole\.SUPER_ADMIN/);
  assert.match(source, /publisherId: null/);
  assert.doesNotMatch(source, /publisher\.create|school\.create|teacher\.create|student\.create|mentor\.create|parent\.create/i);
  assert.doesNotMatch(source, /console\.(?:log|error)\([^)]*(?:password|email|name|hash|DATABASE_URL)/i);
});

test("credential auth applies the central invariant policy with generic rejection", () => {
  const source = read("auth.ts");
  assert.match(source, /isCredentialRolePublisherInvariantValid/);
  assert.match(source, /tenantOwnerPublisherId/);
  assert.ok(source.indexOf("await verifyPassword") < source.indexOf("if (!isCredentialRolePublisherInvariantValid"));
  assert.doesNotMatch(source, /invalid.*SUPER_ADMIN|invalid.*ADMIN/i);
});

test("public onboarding cannot create a Super Admin or accept role authority", () => {
  for (const path of [
    "app/onboarding-actions.ts",
    "lib/onboarding.ts",
    "lib/parent-onboarding.ts",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /role:\s*["']SUPER_ADMIN["']/);
    assert.doesNotMatch(source, /(?:form|input|data).*\brole\b.*SUPER_ADMIN/i);
  }
});

test("migration is additive and preflight exposes counts only", () => {
  const migration = read("prisma/migrations/20260717120000_platform_owner_identity_invariants/migration.sql");
  const preflight = read("scripts/preflight-super-admin-invariants.sql");
  assert.match(migration, /ADD CONSTRAINT "User_role_publisher_invariant_check"/);
  assert.match(migration, /"role" <> 'SUPER_ADMIN' OR "publisherId" IS NULL/);
  assert.match(migration, /"role" <> 'ADMIN' OR "publisherId" IS NOT NULL/);
  assert.doesNotMatch(migration, /UPDATE|DELETE|INSERT|DROP|TRUNCATE/i);
  assert.match(preflight, /COUNT\(\*\)/);
  assert.match(preflight, /super_admin_with_tenant_profile_count/);
  assert.doesNotMatch(preflight, /"email"|"name"|"password"/);
});

test("obsolete auth config is provider-free and contains no credential implementation", () => {
  const source = read("auth.config.ts");
  assert.match(source, /providers:\s*\[\]/);
  assert.doesNotMatch(source, /Credentials|authorize\(|password\s*===|email\s*===/);
});
