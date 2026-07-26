import "server-only";

import { EnrollmentStatus, SecurityAuditOutcome, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";
import { accountAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";

export class StudentTransferError extends Error {}

export async function receiveTransferredStudent(input: {
  studentId: string;
  academicYearId: string;
  schoolClassId: string;
  sectionId: string;
  admissionNumber: string;
  rollNumber?: string | null;
  transferredAt?: Date;
}) {
  const receivingSchool = await requireSchool();
  const transferredAt = input.transferredAt ?? new Date();
  const admissionNumber = input.admissionNumber.trim().slice(0, 50);
  if (!admissionNumber || Number.isNaN(transferredAt.valueOf())) throw new StudentTransferError("Transfer details are invalid.");

  return prisma.$transaction(async (tx) => {
    const [student, section, admissionConflict] = await Promise.all([
      tx.student.findUnique({ where: { id: input.studentId }, select: { id: true, userId: true, schoolId: true } }),
      tx.classSection.findFirst({
        where: {
          id: input.sectionId,
          schoolClass: {
            id: input.schoolClassId,
            schoolId: receivingSchool.id,
            academicYearId: input.academicYearId,
            active: true,
          },
          active: true,
        },
        select: { id: true, schoolClassId: true },
      }),
      tx.student.findFirst({
        where: { schoolId: receivingSchool.id, admissionNumber, id: { not: input.studentId } },
        select: { id: true },
      }),
    ]);
    if (!student || !student.userId || !section || admissionConflict) {
      throw new StudentTransferError("The student cannot be enrolled with these details.");
    }

    const prior = await tx.studentEnrollment.findFirst({
      where: { studentId: student.id, status: EnrollmentStatus.ACTIVE },
      orderBy: { joinedAt: "desc" },
    });
    if (prior?.schoolId === receivingSchool.id) throw new StudentTransferError("The student is already enrolled at this school.");
    if (prior) {
      await tx.studentEnrollment.update({
        where: { id: prior.id },
        data: { status: EnrollmentStatus.TRANSFERRED, leftAt: transferredAt, activeSessionKey: null },
      });
    }

    const enrollment = await tx.studentEnrollment.create({
      data: {
        studentId: student.id,
        schoolId: receivingSchool.id,
        academicYearId: input.academicYearId,
        schoolClassId: input.schoolClassId,
        sectionId: input.sectionId,
        admissionNumber,
        activeSessionKey: `${student.id}:${input.academicYearId}`,
        rollNumber: input.rollNumber?.trim().slice(0, 30) || null,
        status: EnrollmentStatus.ACTIVE,
        joinedAt: transferredAt,
      },
    });
    await tx.student.update({
      where: { id: student.id },
      data: { schoolId: receivingSchool.id, admissionNumber, active: true },
    });
    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor({ id: receivingSchool.userId, role: UserRole.SCHOOL, publisherId: receivingSchool.publisherId }),
      action: "school.student.transfer",
      targetType: "StudentEnrollment",
      targetId: enrollment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { fromStatus: prior ? "ACTIVE" : "NONE", toStatus: "ACTIVE" },
    });
    return enrollment;
  });
}
