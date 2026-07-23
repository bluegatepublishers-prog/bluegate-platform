import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const security = () => read("lib/account-security.ts");
const model = (schema: string, name: string) => schema.slice(schema.indexOf(`model ${name} {`), schema.indexOf("\n}\n", schema.indexOf(`model ${name} {`)) + 3);

test("school and teacher onboarding create pending unverified users and keep approval separate", () => {
  const onboarding = read("lib/onboarding.ts");
  assert.match(onboarding, /role: "SCHOOL"/);
  assert.match(onboarding, /status: SchoolOnboardingStatus\.PENDING/);
  assert.match(onboarding, /role: "TEACHER"/);
  assert.match(onboarding, /status: TeacherOnboardingStatus\.PENDING/);
  assert.match(onboarding, /createEmailVerificationChallenge/);
  assert.doesNotMatch(onboarding, /emailVerifiedAt:/);
  assert.doesNotMatch(onboarding, /teacherAssignment\.create/);
});

test("student activation revalidates the original school-issued code before email verification completes it", () => {
  const onboarding = read("lib/onboarding.ts"), service = security();
  assert.match(onboarding, /studentActivationCode\.findUnique/);
  assert.match(onboarding, /activation\.student\.schoolId !== activation\.schoolId/);
  assert.match(onboarding, /studentActivationCodeId: activation\.id/);
  assert.doesNotMatch(onboarding, /studentActivationCode\.update\(/);
  assert.match(service, /activation\.expiresAt <= now/);
  assert.match(service, /studentActivationCode\.update/);
  assert.match(service, /emailVerifiedAt: now/);
});

test("verification challenges are hashed, expiring, single-use, attempt-limited, and safely resent", () => {
  const service = security(), schema = read("prisma/schema.prisma"), actions = read("app/account-security-actions.ts");
  assert.match(service, /hashSecurityValue\("email-verification"/);
  assert.match(service, /SECURITY_CODE_TTL_MS/);
  assert.match(service, /attemptCount >= SECURITY_CODE_MAX_ATTEMPTS/);
  assert.match(service, /verifiedAt: now, consumedAt: now/);
  assert.match(service, /codeHash: hashSecurityValue\("email-verification"/);
  assert.match(service, /resendCount: \{ increment: 1 \}/);
  const challengeModel = model(schema, "EmailVerificationChallenge");
  assert.match(challengeModel, /model EmailVerificationChallenge/);
  assert.doesNotMatch(challengeModel, /\bcode\s+String/);
  assert.doesNotMatch(actions, /form\.get\("userId"\)|form\.get\("role"\)|form\.get\("publisherId"\)/);
});

test("normal login remains password-only but denies unverified onboarding roles", () => {
  const auth = read("auth.ts");
  assert.ok(auth.indexOf("await verifyPassword") < auth.indexOf("!user.emailVerifiedAt"));
  assert.match(auth, /\["SCHOOL", "TEACHER"\]\.includes\(user\.role\)/);
  assert.doesNotMatch(auth, /verificationCode|one-time-code|otp/i);
  for (const role of ["ADMIN", "SUPER_ADMIN", "MENTOR", "PARENT"]) assert.doesNotMatch(auth, new RegExp(`user\\.role === "${role}"[^\n]+emailVerifiedAt`));
});

test("forgot-password responses do not enumerate eligible, unknown, or unsupported accounts", () => {
  const service = security(), actions = read("app/account-security-actions.ts");
  const response = "If an eligible account exists for this email, a reset code has been sent.";
  assert.match(service, new RegExp(response.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(service, /if \(!user \|\| !resetEligible\(user\)\) return \{ reference: decoyReference, message: genericResetResponse \}/);
  assert.match(service, /if \(!validEmail\(email\)\) return \{ reference: decoyReference, message: genericResetResponse \}/);
  assert.doesNotMatch(actions, /userId|publisherId|role/);
});

test("password reset supports only verified School, Teacher, and Student accounts, including recoverable suspension", () => {
  const service = security();
  for (const role of ["SCHOOL", "TEACHER", "STUDENT"]) assert.match(service, new RegExp(`UserRole\\.${role}`));
  assert.match(service, /!user\.emailVerifiedAt/);
  assert.match(service, /status !== "REJECTED"/);
  assert.doesNotMatch(service, /status === "APPROVED"/);
  for (const role of ["ADMIN", "SUPER_ADMIN", "MENTOR", "PARENT"]) assert.doesNotMatch(service, new RegExp(`UserRole\\.${role}`));
});

test("reset codes and completion tokens are purpose-separated, short-lived, and one-time", () => {
  const service = security();
  assert.match(service, /hashSecurityValue\("password-reset"/);
  assert.match(service, /hashSecurityValue\("password-reset-completion"/);
  assert.match(service, /completionExpiresAt: new Date\(now\.getTime\(\) \+ RESET_COMPLETION_TTL_MS\)/);
  assert.match(service, /challenge\.completionExpiresAt <= now/);
  assert.match(service, /consumedAt: now, completionTokenHash: null, completionExpiresAt: null/);
  assert.match(service, /id: \{ not: challenge\.id \}/);
});

test("password replacement uses the shared policy and has no crafted-user reset path", () => {
  const service = security(), policy = read("lib/onboarding-policy.ts"), password = read("lib/password.ts");
  assert.match(service, /validatePassword\(password, confirmation\)/);
  assert.match(service, /hashPassword\(String\(password\)\)/);
  assert.match(service, /where: \{ id: challenge\.userId \}/);
  assert.match(policy, /password\.length < 10 \|\| password\.length > 128/);
  assert.ok(policy.includes("/[A-Za-z]/.test(password)"));
  assert.ok(policy.includes("/\\d/.test(password)"));
  assert.match(password, /bcrypt\.hash/);
  assert.match(password, /bcrypt\.compare/);
});

test("email failures never reveal codes or complete verification and reset", () => {
  const service = security(), mail = read("lib/security-email.ts"), actions = read("app/account-security-actions.ts"), onboardingActions = read("app/onboarding-actions.ts");
  assert.match(mail, /sendConfiguredMail/);
  assert.match(mail, /Security email could not be sent\./);
  assert.doesNotMatch(mail, /console\.(?:log|error)\([^\n]*(?:EMAIL_PASS|AUTH_SECRET|NEXTAUTH_SECRET|password|secret)/i);
  assert.match(onboardingActions, /deliveryState !== "SENT"/);
  assert.doesNotMatch(actions, /completionToken[^\n]*message|code[^\n]*message/);
  assert.doesNotMatch(onboardingActions, /challenge\.code|result\.code/);
  assert.match(service, /if \(delivery\.state !== "SENT"\) return/);
  assert.match(service, /if \(delivery\.state === "SENT"\) \{\s*await prisma\.emailVerificationChallenge\.updateMany/);
  assert.match(service, /if \(delivery\.state === "SENT"\) await prisma\.passwordResetChallenge\.updateMany/);
});

test("database-backed request, attempt, and resend protections are server authoritative", () => {
  const service = security(), actions = read("app/account-security-actions.ts");
  assert.match(service, /securityRequestThrottle\.upsert/);
  assert.match(service, /SecurityThrottleKind\.EMAIL_VERIFICATION/);
  assert.match(service, /SecurityThrottleKind\.PASSWORD_RESET/);
  assert.match(service, /`email:\$\{email\}`/);
  assert.match(service, /`ip:\$\{ipAddress\}`/);
  assert.match(service, /pg_advisory_xact_lock/);
  assert.match(actions, /x-forwarded-for/);
});

test("security migration is additive, backfills legacy users, and uses restrictive indexed relations", () => {
  const sql = read("prisma/migrations/20260716150000_email_verification_and_password_reset/migration.sql");
  assert.match(sql, /ADD COLUMN "emailVerifiedAt"/);
  assert.match(sql, /UPDATE "User"[\s\S]+COALESCE\("updatedAt", "createdAt", CURRENT_TIMESTAMP\)/);
  assert.match(sql, /CREATE TABLE "EmailVerificationChallenge"/);
  assert.match(sql, /CREATE TABLE "PasswordResetChallenge"/);
  assert.match(sql, /CREATE TABLE "SecurityRequestThrottle"/);
  assert.match(sql, /CREATE INDEX/);
  assert.match(sql, /ON DELETE RESTRICT/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/i);
  assert.doesNotMatch(sql, /ALTER TYPE[\s\S]+UPDATE/i);
});

test("verification and reset codes stay in email bodies, never URLs, browser payloads, or persistence", () => {
  const mail = read("lib/security-email.ts"), actions = read("app/account-security-actions.ts"), schema = read("prisma/schema.prisma");
  assert.match(mail, /subject: "Verify your email for Bluegate"/);
  assert.match(mail, /subject: "Reset your Bluegate password"/);
  assert.doesNotMatch(actions, /redirect\([^\n]*(?:code|token)/i);
  assert.doesNotMatch(model(schema, "EmailVerificationChallenge"), /\bcode\s+String/);
  assert.doesNotMatch(model(schema, "PasswordResetChallenge"), /\bcompletionToken\s+String|\bcode\s+String/);
});
