import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  accountEmailIsRequired,
  normalizeAccountEmail,
} from "../lib/onboarding-policy";
import {
  generateStudentLoginId,
  generateUniqueStudentLoginId,
  isCanonicalStudentLoginId,
  normalizeStudentLoginId,
  STUDENT_LOGIN_ID_MAX_ATTEMPTS,
} from "../lib/student-login-id";
import { isEligibleForSchoolManagedStudentAccount } from "../lib/student-account-policy";

const root = path.resolve(__dirname, "..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

test("only school-managed student accounts may omit email", () => {
  assert.equal(accountEmailIsRequired("SCHOOL_MANAGED_STUDENT"), false);
  for (const context of ["SCHOOL", "TEACHER", "PUBLISHER_ADMIN", "SUPER_ADMIN", "MENTOR", "PARENT", "EMAIL_ACTIVATED_STUDENT"] as const) {
    assert.equal(accountEmailIsRequired(context), true);
    assert.equal(normalizeAccountEmail("", context).ok, false);
  }
  assert.deepEqual(normalizeAccountEmail("", "SCHOOL_MANAGED_STUDENT"), { ok: true, email: null });
  assert.equal(normalizeAccountEmail("  STUDENT@EXAMPLE.COM ", "SCHOOL_MANAGED_STUDENT").email, "student@example.com");
});

test("student login IDs are readable, lowercase, opaque, and canonical", () => {
  const loginId = generateStudentLoginId();
  assert.equal(loginId, loginId.toLowerCase());
  assert.equal(isCanonicalStudentLoginId(loginId), true);
  assert.equal(isCanonicalStudentLoginId("BG-ABCD-2345"), true);
  assert.equal(normalizeStudentLoginId("  BG-Abcd-2345  "), "bg-abcd-2345");
  assert.equal(isCanonicalStudentLoginId("bg-name-2001"), false);
  assert.equal(isCanonicalStudentLoginId("bg-9999-9999"), true);
});

test("unique login ID generation retries collisions with a bounded limit", async () => {
  let calls = 0;
  const loginId = await generateUniqueStudentLoginId(async (candidate) => {
    calls += 1;
    assert.equal(isCanonicalStudentLoginId(candidate), true);
    return calls < 3;
  });
  assert.equal(isCanonicalStudentLoginId(loginId), true);
  assert.equal(calls, 3);
  await assert.rejects(() => generateUniqueStudentLoginId(async () => true, 2), /unique student login ID/);
  assert.equal(STUDENT_LOGIN_ID_MAX_ATTEMPTS, 8);
});

const eligible = {
  studentSchoolId: "school-a",
  authenticatedSchoolId: "school-a",
  studentPublisherId: "publisher-a",
  schoolPublisherId: "publisher-a",
  studentActive: true,
  schoolActive: true,
  publisherActive: true,
  hasCurrentActiveEnrollment: true,
  hasUser: false,
};

test("school-managed account eligibility requires same-school ownership", () => {
  assert.equal(isEligibleForSchoolManagedStudentAccount(eligible), true);
  assert.equal(isEligibleForSchoolManagedStudentAccount({ ...eligible, authenticatedSchoolId: "school-b" }), false);
  assert.equal(isEligibleForSchoolManagedStudentAccount({ ...eligible, studentSchoolId: "school-b" }), false);
});

test("school-managed account eligibility requires matching publisher ownership", () => {
  assert.equal(isEligibleForSchoolManagedStudentAccount({ ...eligible, studentPublisherId: "publisher-b" }), false);
  assert.equal(isEligibleForSchoolManagedStudentAccount({ ...eligible, schoolPublisherId: null }), false);
  assert.equal(isEligibleForSchoolManagedStudentAccount({ ...eligible, publisherActive: false }), false);
});

test("school-managed account eligibility requires active student, school, and current enrollment", () => {
  assert.equal(isEligibleForSchoolManagedStudentAccount({ ...eligible, studentActive: false }), false);
  assert.equal(isEligibleForSchoolManagedStudentAccount({ ...eligible, schoolActive: false }), false);
  assert.equal(isEligibleForSchoolManagedStudentAccount({ ...eligible, hasCurrentActiveEnrollment: false }), false);
  assert.equal(isEligibleForSchoolManagedStudentAccount({ ...eligible, hasUser: true }), false);
});

test("schema and migration make only the global email column nullable without changing uniqueness", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /email\s+String\?\s+@unique/);
  const migration = read("prisma/migrations/20260825130000_nullable_user_email_for_school_student_accounts/migration.sql");
  assert.equal(migration.trim(), 'ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;');
  assert.doesNotMatch(migration, /UPDATE|INSERT|DELETE|DROP INDEX|DROP CONSTRAINT/i);
});

test("student credentials use canonical normalization and retain username-or-email lookup", () => {
  const auth = read("auth.ts");
  assert.match(auth, /normalizeStudentLoginId\(credentials\?\.loginId\)/);
  assert.match(auth, /username:/);
  assert.match(auth, /email:/);
  assert.match(auth, /mode:\s*"insensitive"/);
  assert.match(auth, /role:\s*"STUDENT"/);
});

test("school reset is authorized through the school and rechecks ownership atomically", () => {
  const service = read("lib/student-account-management.ts");
  assert.match(service, /prisma\.\$transaction\(async \(tx\)/);
  assert.match(service, /schoolId: input\.schoolId/);
  assert.match(service, /school: \{ status: "APPROVED", publisher: \{ active: true \} \}/);
  assert.match(service, /enrollments: \{\s*some:/);
  assert.match(service, /academicYear: \{ active: true, current: true \}/);
  assert.match(service, /role: UserRole\.STUDENT, active: true/);
  assert.match(service, /publisherId: input\.publisherId/);
});

test("school reset changes only canonical password fields and revokes reset challenges", () => {
  const service = read("lib/student-account-management.ts");
  assert.match(service, /generateInitialPassword\(\)/);
  assert.match(service, /hashPassword\(temporaryPassword\)/);
  assert.match(service, /passwordChangedAt: now, mustChangePassword: false/);
  assert.match(service, /passwordResetChallenge\.updateMany/);
  assert.match(service, /consumedAt: null, revokedAt: null/);
  assert.match(service, /temporaryPassword/);
  assert.doesNotMatch(service, /console\.(log|info|warn|error).*temporaryPassword/);
});

test("school reset preserves student identity fields and returns plaintext only in the action result", () => {
  const service = read("lib/student-account-management.ts");
  const action = read("app/school-dashboard/students/account-actions.ts");
  assert.doesNotMatch(service, /student\.update|studentEnrollment\.update/);
  assert.match(service, /loginId: student\.user\.username \?\? student\.user\.email/);
  assert.match(action, /requireSchool\(\)/);
  assert.match(action, /temporaryPassword/);
  assert.doesNotMatch(action, /localStorage|URLSearchParams|console\./);
});

test("school reset is available only for linked student accounts on the detail page", () => {
  const page = read("app/school-dashboard/students/[id]/page.tsx");
  assert.match(page, /student\.userId && student\.user/);
  assert.match(page, /StudentPasswordResetPanel/);
  assert.match(page, /student\.user\.username \?\? student\.user\.email/);
});

test("email-less student recovery remains generic and unavailable", () => {
  const security = read("lib/account-security.ts");
  assert.match(security, /const genericResetResponse/);
  assert.match(security, /!user\.emailVerifiedAt/);
  assert.match(security, /!user\.email/);
  assert.match(security, /if \(!user \|\| !resetEligible\(user\)\)/);
  assert.match(security, /return \{ reference: decoyReference, message: genericResetResponse \}/);
});

test("email verification and password delivery still require a concrete email", () => {
  const security = read("lib/account-security.ts");
  const password = read("lib/account-password.ts");
  assert.match(security, /maskEmail\(challenge\.user\.email \?\? ""\)/);
  assert.match(security, /if \(!challenge\.user\.email\) return \{ state: "UNAVAILABLE"/);
  assert.match(security, /sendPasswordResetCode\(\{ to: user\.email/);
});

test("existing roster import remains User-free and activation remains email-based", () => {
  const write = read("lib/student-bulk-import-write.ts");
  const onboarding = read("lib/onboarding.ts");
  assert.doesNotMatch(write, /tx\.user\.(create|update)/);
  assert.match(onboarding, /STUDENT_ACTIVATION/);
  assert.match(onboarding, /createEmailVerificationChallenge/);
  assert.match(onboarding, /normalizeAccountEmail\(suppliedEmail, "EMAIL_ACTIVATED_STUDENT"\)/);
});

test("student self-service current-password change remains role based, not email based", () => {
  const actions = read("app/account-security-actions.ts");
  const password = read("lib/account-password.ts");
  assert.match(actions, /requireUser\(\["STUDENT", "TEACHER"\]\)/);
  assert.match(password, /changeAuthenticatedPassword/);
  assert.doesNotMatch(actions, /emailVerifiedAt/);
});

test("the reset action uses the established audit mechanism and does not persist the plaintext", () => {
  const service = read("lib/student-account-management.ts");
  assert.match(service, /writeSecurityAuditEvent/);
  assert.match(service, /school\.student\.password_reset/);
  assert.match(service, /metadata: \{ scope: "school_managed_student" \}/);
  assert.doesNotMatch(service, /metadata: \{[^}]*temporaryPassword/);
});
