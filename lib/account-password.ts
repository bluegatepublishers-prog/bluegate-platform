import "server-only";

import { Prisma, SecurityAuditOutcome, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { validatePassword } from "@/lib/onboarding-policy";
import { accountAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";

type AccountPasswordInput = {
  userId: string;
  currentPassword: unknown;
  newPassword: unknown;
  confirmation: unknown;
};

type AccountPasswordResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

const unavailableMessage = "This account is not available for password changes.";

export async function changeAuthenticatedPassword(
  input: AccountPasswordInput,
): Promise<AccountPasswordResult> {
  const passwordError = validatePassword(input.newPassword, input.confirmation);
  if (passwordError) return { ok: false, message: passwordError };

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      role: true,
      password: true,
      active: true,
      publisherId: true,
      publisher: { select: { active: true } },
      student: {
        select: {
          active: true,
          school: { select: { status: true, publisherId: true, publisher: { select: { active: true } } } },
        },
      },
      teacher: {
        select: {
          active: true,
          status: true,
          schoolId: true,
          school: { select: { status: true, publisherId: true, publisher: { select: { active: true } } } },
          schoolMemberships: {
            where: { active: true, status: "ACTIVE" },
            select: { schoolId: true },
          },
        },
      },
    },
  });

  if (!user || !user.active || !isEligibleAccount(user)) {
    return { ok: false, message: unavailableMessage };
  }

  const newPassword = String(input.newPassword);
  const hashedPassword = await hashPassword(newPassword);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`password-change:${input.userId}`}))`;
    const current = await tx.user.findUnique({
      where: { id: input.userId },
      select: { password: true, active: true, role: true },
    });
    if (!current || !current.active || !isStudentOrTeacherRole(current.role)) {
      return { ok: false as const, message: unavailableMessage };
    }
    if (!(await verifyPassword(String(input.currentPassword ?? ""), current.password))) {
      return { ok: false as const, message: "The current password is incorrect." };
    }

    const now = new Date();
    await tx.user.update({
      where: { id: input.userId },
      data: { password: hashedPassword, passwordChangedAt: now },
    });
    await tx.passwordResetChallenge.updateMany({
      where: { userId: input.userId, consumedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor({ id: user.id, role: user.role, publisherId: user.publisherId }),
      action: "account.password_change",
      targetType: "User",
      targetId: user.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: user.role === UserRole.STUDENT ? "student" : "teacher" },
    });
    return { ok: true as const, message: "Password changed successfully." };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

function isStudentOrTeacherRole(role: UserRole) {
  return role === UserRole.STUDENT || role === UserRole.TEACHER;
}

function isEligibleAccount(user: {
  role: UserRole;
  publisherId: string | null;
  publisher: { active: boolean } | null;
  student: { active: boolean; school: { status: string; publisherId: string | null; publisher: { active: boolean } | null } } | null;
  teacher: { active: boolean; status: string; schoolId: string | null; school: { status: string; publisherId: string | null; publisher: { active: boolean } | null } | null; schoolMemberships: Array<{ schoolId: string }> } | null;
}) {
  if (!isStudentOrTeacherRole(user.role)) return false;
  if (user.role === UserRole.STUDENT) {
    return Boolean(
      user.student?.active &&
      user.student.school.status === "APPROVED" &&
      user.student.school.publisherId &&
      user.student.school.publisher?.active &&
      user.publisherId === user.student.school.publisherId,
    );
  }
  return Boolean(
    user.teacher?.active &&
    user.teacher.status === "APPROVED" &&
    user.teacher.schoolId &&
    user.teacher.school?.status === "APPROVED" &&
    user.teacher.school.publisherId &&
    user.teacher.school.publisher?.active &&
    user.publisherId === user.teacher.school.publisherId &&
    user.teacher.schoolMemberships.some((membership) => membership.schoolId === user.teacher?.schoolId),
  );
}
