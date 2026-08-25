import "server-only";

import { Prisma, SecurityAuditOutcome, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateInitialPassword, hashPassword } from "@/lib/password";
import { accountAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";

export class StudentAccountManagementError extends Error {}

const unavailable = "This student account is not available for a school reset.";

export async function resetStudentPasswordForSchool(input: {
  studentId: string;
  schoolId: string;
  actorUserId: string;
  publisherId: string | null;
}) {
  const temporaryPassword = generateInitialPassword();
  const password = await hashPassword(temporaryPassword);
  const now = new Date();

  const account = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`school-student-password-reset:${input.studentId}`}))`;
    const student = await tx.student.findFirst({
      where: {
        id: input.studentId,
        schoolId: input.schoolId,
        active: true,
        school: { status: "APPROVED", publisher: { active: true } },
        enrollments: {
          some: {
            schoolId: input.schoolId,
            status: "ACTIVE",
            academicYear: { active: true, current: true },
          },
        },
        user: { is: { role: UserRole.STUDENT, active: true, publisherId: input.publisherId } },
      },
      select: {
        id: true,
        school: { select: { publisherId: true } },
        user: { select: { id: true, role: true, active: true, publisherId: true, username: true, email: true } },
      },
    });
    if (!student?.user || student.school.publisherId !== input.publisherId || student.user.role !== UserRole.STUDENT) {
      throw new StudentAccountManagementError(unavailable);
    }

    await tx.user.update({
      where: { id: student.user.id },
      data: { password, passwordChangedAt: now, mustChangePassword: false },
    });
    await tx.passwordResetChallenge.updateMany({
      where: { userId: student.user.id, consumedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor({ id: input.actorUserId, role: UserRole.SCHOOL, publisherId: input.publisherId }),
      action: "school.student.password_reset",
      targetType: "User",
      targetId: student.user.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "school_managed_student" },
    });
    return { loginId: student.user.username ?? student.user.email };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  return { ...account, temporaryPassword };
}
