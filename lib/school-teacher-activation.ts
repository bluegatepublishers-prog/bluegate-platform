import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { Prisma, SchoolStaffMembershipStatus, SecurityAuditOutcome, UserRole } from "@prisma/client";
import { generateResetCompletionToken, hashSecurityValue, securelyMatchesHash } from "@/lib/account-security-policy";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";
import { sendConfiguredMail } from "@/lib/mail-runtime";
import { accountAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";

const activationLifetimeMs = 7 * 24 * 60 * 60 * 1000;

export async function issueSchoolTeacherActivation(user: { id: string; email: string }, schoolName: string) {
  const reference = randomUUID();
  const completionToken = generateResetCompletionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + activationLifetimeMs);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`teacher-activation:${user.id}`}))`;
    await tx.passwordResetChallenge.updateMany({ where: { userId: user.id, consumedAt: null, revokedAt: null }, data: { revokedAt: now } });
    await tx.passwordResetChallenge.create({ data: { reference, userId: user.id, codeHash: hashSecurityValue("teacher-activation-code", reference, randomBytes(24).toString("base64url")), expiresAt, verifiedAt: now, completionTokenHash: hashSecurityValue("password-reset-completion", reference, completionToken), completionExpiresAt: expiresAt } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  const baseUrl = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const activationUrl = `${baseUrl}/teacher-activate?reference=${encodeURIComponent(reference)}&token=${encodeURIComponent(completionToken)}`;
  const delivery = await sendConfiguredMail({ to: user.email, subject: `${schoolName} invited you to Bluegate`, text: `${schoolName} created a Bluegate teacher account for you. Set your private password using this secure link:\n\n${activationUrl}\n\nThis link expires in 7 days. If you were not expecting this invitation, contact the school office.` }, { requireSecuritySecret: true, failureCode: "TEACHER_INVITATION_SEND_FAILED", failureMessage: "Teacher invitation could not be sent." });
  if (delivery.state === "SENT") await prisma.passwordResetChallenge.updateMany({ where: { reference, consumedAt: null, revokedAt: null }, data: { lastSentAt: new Date() } });
  return delivery.state === "SENT";
}

export async function resendSchoolTeacherActivation(teacherId: string) {
  const school = await requireSchool();
  const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, schoolId: school.id }, select: { userId: true, user: { select: { id: true, email: true, emailVerifiedAt: true, mustChangePassword: true } } } });
  if (!teacher || (teacher.user.emailVerifiedAt && !teacher.user.mustChangePassword)) throw new Error("This teacher account is already ready for sign-in.");
  return issueSchoolTeacherActivation({ id: teacher.user.id, email: teacher.user.email }, school.schoolName);
}

export async function activateSchoolTeacherAccount(input: { reference?: string; token?: string; password: unknown; confirmation: unknown }) {
  const password = String(input.password ?? "");
  const confirmation = String(input.confirmation ?? "");
  if (!input.reference || !input.token || password.length < 10 || password !== confirmation) return { ok: false as const, message: password.length < 10 ? "Use a password with at least 10 characters." : "The passwords do not match." };
  const hashedPassword = await hashPassword(password);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`teacher-activation:${input.reference}`}))`;
    const now = new Date();
    const challenge = await tx.passwordResetChallenge.findUnique({ where: { reference: input.reference }, include: { user: { include: { publisher: { select: { active: true } }, teacher: { select: { active: true, schoolId: true } }, staffMemberships: { where: { active: true, status: SchoolStaffMembershipStatus.ACTIVE }, select: { id: true } } } } } });
    const valid = challenge && !challenge.consumedAt && !challenge.revokedAt && challenge.completionTokenHash && challenge.completionExpiresAt && challenge.completionExpiresAt > now && challenge.user.role === UserRole.TEACHER && challenge.user.teacher?.active && challenge.user.publisher?.active && challenge.user.staffMemberships.length > 0 && securelyMatchesHash(challenge.completionTokenHash, hashSecurityValue("password-reset-completion", input.reference!, input.token!));
    if (!valid) return { ok: false as const, message: "This teacher invitation is invalid or has expired. Ask your school to send a new invitation." };
    await tx.user.update({ where: { id: challenge.userId }, data: { password: hashedPassword, emailVerifiedAt: now, mustChangePassword: false, active: true } });
    await tx.passwordResetChallenge.update({ where: { id: challenge.id }, data: { consumedAt: now, completionTokenHash: null, completionExpiresAt: null } });
    await tx.passwordResetChallenge.updateMany({ where: { userId: challenge.userId, id: { not: challenge.id }, consumedAt: null, revokedAt: null }, data: { revokedAt: now } });
    await writeSecurityAuditEvent(tx, { actor: accountAuditActor({ id: challenge.user.id, role: UserRole.TEACHER, publisherId: challenge.user.publisherId }), action: "account.password_reset.complete", targetType: "User", targetId: challenge.user.id, outcome: SecurityAuditOutcome.SUCCESS, metadata: { scope: "teacher_activation" } });
    return { ok: true as const, message: "Your teacher account is ready. Sign in with your email and new password." };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
