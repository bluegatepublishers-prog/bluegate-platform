import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { generateInitialPassword } from "../lib/password";
import { validatePassword } from "../lib/onboarding-policy";

const read = (path: string) => readFileSync(path, "utf8");
const model = (schema: string, name: string) => {
  const start = schema.indexOf("model " + name + " {");
  return schema.slice(start, schema.indexOf("\n}\n", start) + 3);
};

test("shared password policy accepts the boundary and rejects weak or mismatched passwords", () => {
  assert.equal(validatePassword("Aa12345678", "Aa12345678"), null);
  assert.match(validatePassword("Aa1234567", "Aa1234567") ?? "", /between 10 and 128/);
  assert.match(validatePassword("abcdefghij", "abcdefghij") ?? "", /letter and one number/);
  assert.match(validatePassword("1234567890", "1234567890") ?? "", /letter and one number/);
  assert.match(validatePassword("Aa12345678", "Aa12345679") ?? "", /match/);
  assert.match(validatePassword("a".repeat(129), "a".repeat(129)) ?? "", /between 10 and 128/);
});

test("future initial-password helper is random-shaped and always policy-compatible", () => {
  const first = generateInitialPassword();
  const second = generateInitialPassword();
  assert.equal(first.length, 16);
  assert.notEqual(first, second);
  assert.match(first, /^[A-Za-z0-9]+$/);
  assert.equal(validatePassword(first, first), null);
  assert.throws(() => generateInitialPassword(11), /between 12 and 64/);
});

test("authenticated password change is shared, role-scoped, tenant-scoped, and atomic", () => {
  const service = read("lib/account-password.ts");
  const actions = read("app/account-security-actions.ts");
  assert.match(actions, /requireUser\(\["STUDENT", "TEACHER"\]\)/);
  assert.doesNotMatch(actions, /form\.get\("userId"\)|form\.get\("role"\)|form\.get\("publisherId"\)/);
  assert.match(service, /verifyPassword/);
  assert.match(service, /hashPassword/);
  assert.match(service, /passwordChangedAt: now/);
  assert.match(service, /passwordResetChallenge\.updateMany/);
  assert.match(service, /pg_advisory_xact_lock/);
  assert.match(service, /TransactionIsolationLevel\.Serializable/);
  assert.match(service, /UserRole\.STUDENT/);
  assert.match(service, /UserRole\.TEACHER/);
  assert.match(service, /schoolMemberships/);
  assert.match(service, /publisherId === user\.student\.school\.publisherId/);
  assert.doesNotMatch(service, /StudentEnrollment|TeacherAssignment/);
});

test("Student and Teacher surfaces use the same compact security panel", () => {
  const student = read("app/student-dashboard/profile/page.tsx");
  const teacher = read("app/teacher-dashboard/settings/page.tsx");
  const panel = read("components/auth/AccountSecurityPanel.tsx");
  assert.match(student, /AccountSecurityPanel/);
  assert.match(teacher, /AccountSecurityPanel/);
  assert.doesNotMatch(teacher, /Logout From All Devices/);
  assert.match(panel, /useActionState/);
  assert.match(panel, /autoComplete="current-password"/);
  assert.match(panel, /autoComplete="new-password"/);
  assert.match(panel, /disabled=\{pending\}/);
  assert.doesNotMatch(panel, /value=.*currentPassword/);
  assert.doesNotMatch(panel, /hash|token/i);
});

test("Student and Teacher password establishment paths record passwordChangedAt", () => {
  const onboarding = read("lib/onboarding.ts");
  const reset = read("lib/account-security.ts");
  const activation = read("lib/school-teacher-activation.ts");
  assert.match(onboarding, /passwordChangedAt: new Date\(\), role: "TEACHER"/);
  assert.match(onboarding, /passwordChangedAt: now, role: "STUDENT"/);
  assert.match(reset, /password: hashedPassword, passwordChangedAt: now/);
  assert.match(activation, /password: hashedPassword, passwordChangedAt: now/);
});

test("password recovery remains shared and does not expose plaintext credential state", () => {
  const security = read("lib/account-security.ts");
  const password = read("lib/password.ts");
  assert.match(security, /completePasswordReset/);
  assert.match(security, /hashPassword\(String\(password\)\)/);
  assert.match(security, /consumedAt: now/);
  assert.match(password, /bcrypt\.hash/);
  assert.match(password, /bcrypt\.compare/);
  assert.doesNotMatch(security, /console\.(?:log|error)\([^\n]*(?:password|token|secret)/i);
});

test("email self-service remains blocked until pending-email persistence exists", () => {
  const schema = read("prisma/schema.prisma");
  const challenge = model(schema, "EmailVerificationChallenge");
  const service = read("lib/account-password.ts");
  const panel = read("components/auth/AccountSecurityPanel.tsx");
  assert.match(schema, /EMAIL_CHANGE_FUTURE/);
  assert.doesNotMatch(challenge, /pendingEmail|candidateEmail|newEmail|email\s+String/);
  assert.doesNotMatch(service, /email\s*:/);
  assert.match(panel, /Email changes remain subject to the verified-email workflow/);
});

test("mustChangePassword remains session metadata, not a forced first-login redirect", () => {
  const auth = read("auth.ts");
  assert.match(auth, /mustChangePassword/);
  assert.doesNotMatch(auth, /mustChangePassword[\s\S]{0,240}redirect\(/);
});
