import "server-only";

import { EnrollmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEffectiveStudentPlan } from "./student-plan";

export async function resolveFutureStudentEntitlementContext(
  userId: string,
  academicYearId?: string,
) {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: { school: { include: { publisher: { select: { active: true } } } } },
  });
  if (!student?.active || !student.school.publisherId || !student.school.publisher?.active) {
    return null;
  }
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      studentId: student.id,
      schoolId: student.schoolId,
      academicYearId,
      status: EnrollmentStatus.ACTIVE,
      academicYear: { active: true, current: academicYearId ? undefined : true },
      schoolClass: { active: true },
      section: { active: true },
    },
  });
  if (!enrollment) return null;
  const effectivePlan = await getEffectiveStudentPlan(
    student.id,
    enrollment.academicYearId,
  );
  return {
    studentId: student.id,
    schoolId: student.schoolId,
    publisherId: student.school.publisherId,
    enrollment,
    effectivePlan,
  };
}
