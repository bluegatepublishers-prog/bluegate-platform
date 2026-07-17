import "server-only";

import { randomUUID } from "node:crypto";
import {
  EmailVerificationPurpose,
  Prisma,
  SecurityAuditOutcome,
  SecurityThrottleKind,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { accountAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";
import { hashPassword } from "@/lib/password";
import { normalizeEmail, validEmail, validatePassword } from "@/lib/onboarding-policy";
import {
  challengeCanBeUsed,
  generateResetCompletionToken,
  generateSixDigitCode,
  hashSecurityValue,
  maskEmail,
  nextThrottle,
  resendDecision,
  RESET_COMPLETION_TTL_MS,
  SECURITY_CODE_MAX_ATTEMPTS,
  SECURITY_CODE_TTL_MS,
  securelyMatchesHash,
  validSixDigitCode,
} from "@/lib/account-security-policy";
import {
  sendEmailVerificationCode,
  sendPasswordResetCode,
} from "@/lib/security-email";

export class AccountSecurityError extends Error {}

export type CreatedEmailChallenge = {
  reference: string;
  code: string;
  email: string;
  brandName: string;
};

const genericResetResponse =
  "If an eligible account exists for this email, a reset code has been sent.";

function loginPath(role: UserRole) {
  if (role === UserRole.SCHOOL) return "/school-login";
  if (role === UserRole.STUDENT) return "/student-login";
  return "/teacher-login";
}

function verificationBackPath(purpose: EmailVerificationPurpose) {
  if (purpose === EmailVerificationPurpose.SCHOOL_SIGNUP) return "/school-signup";
  if (purpose === EmailVerificationPurpose.TEACHER_SIGNUP) return "/teacher-signup";
  if (purpose === EmailVerificationPurpose.STUDENT_ACTIVATION) return "/student-activate";
  return "/portal";
}

export async function createEmailVerificationChallenge(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    email: string;
    purpose: EmailVerificationPurpose;
    brandName: string;
    studentActivationCodeId?: string;
  },
): Promise<CreatedEmailChallenge> {
  const now = new Date();
  const reference = randomUUID();
  const code = generateSixDigitCode();
  const codeHash = hashSecurityValue("email-verification", reference, code);
  await tx.emailVerificationChallenge.updateMany({
    where: {
      userId: input.userId,
      purpose: input.purpose,
      consumedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: now },
  });
  await tx.emailVerificationChallenge.create({
    data: {
      reference,
      userId: input.userId,
      purpose: input.purpose,
      codeHash,
      expiresAt: new Date(now.getTime() + SECURITY_CODE_TTL_MS),
      studentActivationCodeId: input.studentActivationCodeId,
    },
  });
  return {
    reference,
    code,
    email: input.email,
    brandName: input.brandName,
  };
}

export async function deliverEmailVerificationChallenge(
  challenge: CreatedEmailChallenge,
) {
  const allowed = await consumeRequestThrottle(
    SecurityThrottleKind.EMAIL_VERIFICATION,
    `email:${normalizeEmail(challenge.email)}`,
  );
  if (!allowed) return { state: "FAILED" as const };
  const delivery = await sendEmailVerificationCode({
    to: challenge.email,
    code: challenge.code,
    brandName: challenge.brandName,
  });
  if (delivery.state === "SENT") {
    await prisma.emailVerificationChallenge.updateMany({
      where: {
        reference: challenge.reference,
        consumedAt: null,
        revokedAt: null,
      },
      data: { lastSentAt: new Date() },
    });
  }
  return delivery;
}

export async function getEmailVerificationView(reference: string | undefined) {
  if (!reference) return null;
  const challenge = await prisma.emailVerificationChallenge.findUnique({
    where: { reference },
    select: {
      expiresAt: true,
      consumedAt: true,
      revokedAt: true,
      purpose: true,
      user: { select: { email: true } },
    },
  });
  if (!challenge) return null;
  return {
    maskedEmail: maskEmail(challenge.user.email),
    expiresAt: challenge.expiresAt,
    available: !challenge.consumedAt && !challenge.revokedAt,
    backPath: verificationBackPath(challenge.purpose),
  };
}

export async function verifyEmailCode(reference: string | undefined, code: unknown) {
  if (!reference || !validSixDigitCode(code)) {
    return { ok: false as const, message: "Enter the six-digit code from your email." };
  }
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`email-verification:${reference}`}))`;
    const now = new Date();
    const challenge = await tx.emailVerificationChallenge.findUnique({
      where: { reference },
      include: {
        user: { select: { id: true, role: true, publisherId: true } },
        studentActivationCode: {
          include: {
            student: { select: { id: true, userId: true, active: true, schoolId: true } },
            school: { select: { id: true, status: true, publisher: { select: { active: true } } } },
          },
        },
      },
    });
    if (!challenge || !challengeCanBeUsed({ ...challenge, now })) {
      return { ok: false as const, message: "This verification code is unavailable. Request a new code." };
    }
    const actualHash = hashSecurityValue("email-verification", reference, code);
    if (!securelyMatchesHash(challenge.codeHash, actualHash)) {
      const attemptCount = challenge.attemptCount + 1;
      await tx.emailVerificationChallenge.update({
        where: { id: challenge.id },
        data: {
          attemptCount,
          revokedAt: attemptCount >= SECURITY_CODE_MAX_ATTEMPTS ? now : undefined,
        },
      });
      return { ok: false as const, message: "The verification code is incorrect or unavailable." };
    }
    if (challenge.purpose === EmailVerificationPurpose.STUDENT_ACTIVATION) {
      const activation = challenge.studentActivationCode;
      if (
        !activation ||
        activation.usedAt ||
        activation.revokedAt ||
        activation.expiresAt <= now ||
        !activation.student.active ||
        activation.student.userId !== challenge.userId ||
        activation.student.schoolId !== activation.schoolId ||
        activation.school.status !== "APPROVED" ||
        !activation.school.publisher?.active
      ) {
        await tx.emailVerificationChallenge.update({
          where: { id: challenge.id },
          data: { revokedAt: now },
        });
        return { ok: false as const, message: "This verification code is unavailable. Start activation again." };
      }
      await tx.studentActivationCode.update({
        where: { id: activation.id },
        data: { usedAt: now, usedByUserId: challenge.userId },
      });
    }
    await tx.user.update({
      where: { id: challenge.userId },
      data: { emailVerifiedAt: now },
    });
    await tx.emailVerificationChallenge.update({
      where: { id: challenge.id },
      data: { verifiedAt: now, consumedAt: now },
    });
    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor(challenge.user), action: "account.email.verify",
      targetType: "User", targetId: challenge.user.id, outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { purpose: challenge.purpose },
    });
    return {
      ok: true as const,
      message: "Email verified. Approval requirements still apply before sign-in.",
      loginPath: loginPath(challenge.user.role),
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function resendEmailVerification(reference: string | undefined) {
  if (!reference) return { ok: false as const, message: "Start the signup or activation flow again." };
  const prepared = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`email-verification:${reference}`}))`;
    const now = new Date();
    const challenge = await tx.emailVerificationChallenge.findUnique({
      where: { reference },
      select: {
        id: true,
        reference: true,
        expiresAt: true,
        consumedAt: true,
        revokedAt: true,
        resendCount: true,
        lastSentAt: true,
        user: { select: { email: true, publisher: { select: { name: true } } } },
      },
    });
    if (!challenge) return { state: "UNAVAILABLE" as const };
    const decision = resendDecision({ ...challenge, now });
    if (decision !== "ALLOW") return { state: decision };
    const code = generateSixDigitCode();
    await tx.emailVerificationChallenge.update({
      where: { id: challenge.id },
      data: {
        codeHash: hashSecurityValue("email-verification", reference, code),
        expiresAt: new Date(now.getTime() + SECURITY_CODE_TTL_MS),
        attemptCount: 0,
        resendCount: { increment: 1 },
        lastSentAt: null,
      },
    });
    return { state: "READY" as const, code, email: challenge.user.email, brandName: challenge.user.publisher?.name ?? "Bluegate" };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (prepared.state !== "READY") {
    const message = prepared.state === "COOLDOWN"
      ? "Please wait 60 seconds before requesting another code."
      : prepared.state === "LIMIT"
        ? "The resend limit has been reached. Start the signup or activation flow again."
        : "This verification request is unavailable. Start again.";
    return { ok: false as const, message };
  }
  const allowed = await consumeRequestThrottle(
    SecurityThrottleKind.EMAIL_VERIFICATION,
    `email:${normalizeEmail(prepared.email)}`,
  );
  if (!allowed) return { ok: false as const, message: "We could not send the code. Please try again shortly." };
  const delivery = await sendEmailVerificationCode({
    to: prepared.email,
    code: prepared.code,
    brandName: prepared.brandName,
  });
  if (delivery.state !== "SENT") return { ok: false as const, message: "We could not send the code. Please try again shortly." };
  await prisma.emailVerificationChallenge.updateMany({ where: { reference, consumedAt: null, revokedAt: null }, data: { lastSentAt: new Date() } });
  return { ok: true as const, message: "A new verification code has been sent." };
}

async function consumeRequestThrottle(kind: SecurityThrottleKind, rawKey: string) {
  const keyHash = hashSecurityValue("security-throttle", kind, rawKey);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`security-throttle:${keyHash}`}))`;
    const now = new Date();
    const row = await tx.securityRequestThrottle.findUnique({ where: { keyHash } });
    const next = nextThrottle({
      now,
      windowStartedAt: row?.windowStartedAt,
      requestCount: row?.requestCount,
      blockedUntil: row?.blockedUntil,
    });
    await tx.securityRequestThrottle.upsert({
      where: { keyHash },
      create: { keyHash, kind, requestCount: next.requestCount, windowStartedAt: next.windowStartedAt, lastRequestAt: now, blockedUntil: next.blockedUntil },
      update: { requestCount: next.requestCount, windowStartedAt: next.windowStartedAt, lastRequestAt: now, blockedUntil: next.blockedUntil },
    });
    return next.allowed;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

function resetEligible(user: {
  role: UserRole;
  emailVerifiedAt: Date | null;
  publisher: { active: boolean; name: string } | null;
  school: { status: string; publisher: { active: boolean; name: string } | null } | null;
  teacher: { status: string; school: { status: string; publisher: { active: boolean; name: string } | null } | null } | null;
  student: { active: boolean; school: { status: string; publisher: { active: boolean; name: string } | null } } | null;
}) {
  if (
    !user.emailVerifiedAt ||
    (user.role !== UserRole.SCHOOL &&
      user.role !== UserRole.TEACHER &&
      user.role !== UserRole.STUDENT)
  ) return false;
  if (user.role === UserRole.SCHOOL) return Boolean(user.school && user.school.status !== "REJECTED" && user.school.publisher?.active);
  if (user.role === UserRole.TEACHER) return Boolean(user.teacher && user.teacher.status !== "REJECTED" && user.teacher.school && user.teacher.school.status !== "REJECTED" && user.teacher.school.publisher?.active);
  return Boolean(user.student?.active && user.student.school.status !== "REJECTED" && user.student.school.publisher?.active);
}

export async function requestPasswordReset(emailValue: unknown, ipAddress?: string) {
  const email = normalizeEmail(emailValue);
  const decoyReference = randomUUID();
  if (!validEmail(email)) return { reference: decoyReference, message: genericResetResponse };
  const emailAllowed = await consumeRequestThrottle(SecurityThrottleKind.PASSWORD_RESET, `email:${email}`);
  const ipAllowed = ipAddress ? await consumeRequestThrottle(SecurityThrottleKind.PASSWORD_RESET, `ip:${ipAddress}`) : true;
  if (!emailAllowed || !ipAllowed) return { reference: decoyReference, message: genericResetResponse };
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      publisher: { select: { active: true, name: true } },
      school: { select: { status: true, publisher: { select: { active: true, name: true } } } },
      teacher: { select: { status: true, school: { select: { status: true, publisher: { select: { active: true, name: true } } } } } },
      student: { select: { active: true, school: { select: { status: true, publisher: { select: { active: true, name: true } } } } } },
    },
  });
  if (!user || !resetEligible(user)) return { reference: decoyReference, message: genericResetResponse };
  const now = new Date(), reference = randomUUID(), code = generateSixDigitCode();
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`password-reset-user:${user.id}`}))`;
    await tx.passwordResetChallenge.updateMany({ where: { userId: user.id, consumedAt: null, revokedAt: null }, data: { revokedAt: now } });
    await tx.passwordResetChallenge.create({ data: { reference, userId: user.id, codeHash: hashSecurityValue("password-reset", reference, code), expiresAt: new Date(now.getTime() + SECURITY_CODE_TTL_MS) } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  const brandName = user.publisher?.name ?? user.school?.publisher?.name ?? user.teacher?.school?.publisher?.name ?? user.student?.school.publisher?.name ?? "Bluegate";
  const delivery = await sendPasswordResetCode({ to: user.email, code, brandName });
  if (delivery.state === "SENT") await prisma.passwordResetChallenge.updateMany({ where: { reference, consumedAt: null, revokedAt: null }, data: { lastSentAt: new Date() } });
  return { reference, message: genericResetResponse };
}

export async function verifyPasswordResetCode(reference: string | undefined, code: unknown) {
  if (!reference || !validSixDigitCode(code)) return { ok: false as const, message: "Enter the six-digit reset code." };
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`password-reset:${reference}`}))`;
    const now = new Date();
    const challenge = await tx.passwordResetChallenge.findUnique({
      where: { reference },
      include: { user: { select: { id: true, role: true, publisherId: true } } },
    });
    if (!challenge || !challengeCanBeUsed({ ...challenge, now })) return { ok: false as const, message: "The reset code is incorrect or unavailable." };
    const actualHash = hashSecurityValue("password-reset", reference, code);
    if (!securelyMatchesHash(challenge.codeHash, actualHash)) {
      const attemptCount = challenge.attemptCount + 1;
      await tx.passwordResetChallenge.update({ where: { id: challenge.id }, data: { attemptCount, revokedAt: attemptCount >= SECURITY_CODE_MAX_ATTEMPTS ? now : undefined } });
      return { ok: false as const, message: "The reset code is incorrect or unavailable." };
    }
    const completionToken = generateResetCompletionToken();
    await tx.passwordResetChallenge.update({
      where: { id: challenge.id },
      data: {
        verifiedAt: now,
        completionTokenHash: hashSecurityValue("password-reset-completion", reference, completionToken),
        completionExpiresAt: new Date(now.getTime() + RESET_COMPLETION_TTL_MS),
      },
    });
    return { ok: true as const, message: "Code verified. Create your new password.", completionToken };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function completePasswordReset(reference: string | undefined, completionToken: string | undefined, password: unknown, confirmation: unknown) {
  const passwordError = validatePassword(password, confirmation);
  if (!reference || !completionToken || passwordError) return { ok: false as const, message: passwordError ?? "This password reset is unavailable." };
  const hashedPassword = await hashPassword(String(password));
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`password-reset:${reference}`}))`;
    const now = new Date();
    const challenge = await tx.passwordResetChallenge.findUnique({
      where: { reference },
      include: { user: { select: { id: true, role: true, publisherId: true } } },
    });
    const actualTokenHash = hashSecurityValue("password-reset-completion", reference, completionToken);
    if (!challenge || challenge.consumedAt || challenge.revokedAt || !challenge.verifiedAt || !challenge.completionTokenHash || !challenge.completionExpiresAt || challenge.completionExpiresAt <= now || !securelyMatchesHash(challenge.completionTokenHash, actualTokenHash)) return { ok: false as const, message: "This password reset is unavailable. Request a new code." };
    await tx.user.update({ where: { id: challenge.userId }, data: { password: hashedPassword } });
    await tx.passwordResetChallenge.update({ where: { id: challenge.id }, data: { consumedAt: now, completionTokenHash: null, completionExpiresAt: null } });
    await tx.passwordResetChallenge.updateMany({ where: { userId: challenge.userId, id: { not: challenge.id }, consumedAt: null, revokedAt: null }, data: { revokedAt: now } });
    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor(challenge.user), action: "account.password_reset.complete",
      targetType: "User", targetId: challenge.user.id, outcome: SecurityAuditOutcome.SUCCESS,
    });
    return { ok: true as const, message: "Password changed successfully. Please sign in with your new password." };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function resendPasswordResetCode(reference: string | undefined) {
  if (!reference) return { ok: true as const, message: genericResetResponse };
  const prepared = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`password-reset:${reference}`}))`;
    const now = new Date();
    const challenge = await tx.passwordResetChallenge.findUnique({ where: { reference }, include: { user: { select: { email: true, publisher: { select: { name: true } } } } } });
    if (!challenge) return null;
    const decision = resendDecision({ ...challenge, now });
    if (decision !== "ALLOW") return null;
    const code = generateSixDigitCode();
    await tx.passwordResetChallenge.update({ where: { id: challenge.id }, data: { codeHash: hashSecurityValue("password-reset", reference, code), expiresAt: new Date(now.getTime() + SECURITY_CODE_TTL_MS), attemptCount: 0, resendCount: { increment: 1 }, lastSentAt: null, verifiedAt: null, completionTokenHash: null, completionExpiresAt: null } });
    return { code, email: challenge.user.email, brandName: challenge.user.publisher?.name ?? "Bluegate" };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (prepared) {
    const delivery = await sendPasswordResetCode({ to: prepared.email, code: prepared.code, brandName: prepared.brandName });
    if (delivery.state === "SENT") await prisma.passwordResetChallenge.updateMany({ where: { reference, consumedAt: null, revokedAt: null }, data: { lastSentAt: new Date() } });
  }
  return { ok: true as const, message: genericResetResponse };
}
