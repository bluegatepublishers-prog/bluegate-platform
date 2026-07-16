import "server-only";

import { EnrollmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEffectiveStudentPlan } from "@/lib/entitlements/student-plan";
import {
  resolveStudentIdentity,
  type StudentIdentityDependencies,
} from "@/lib/student-identity-service";

const dependencies: StudentIdentityDependencies = {
  async findStudentByUserId(userId) {
    return prisma.student.findUnique({
      where: { userId },
      include: {
        school: {
          select: {
            id: true,
            schoolName: true,
            city: true,
            state: true,
            logoUrl: true,
            publisherId: true,
            publisher: { select: { id: true, active: true } },
          },
        },
      },
    });
  },
  async findCurrentEnrollment(studentId, schoolId) {
    return prisma.studentEnrollment.findFirst({
      where: {
        studentId,
        schoolId,
        status: EnrollmentStatus.ACTIVE,
        academicYear: { schoolId, active: true, current: true },
        schoolClass: { schoolId, active: true },
        section: { active: true },
      },
      select: {
        id: true,
        studentId: true,
        schoolId: true,
        academicYearId: true,
        schoolClassId: true,
        sectionId: true,
        rollNumber: true,
        status: true,
        academicYear: { select: { id: true, schoolId: true, name: true, active: true, current: true } },
        schoolClass: { select: { id: true, schoolId: true, academicYearId: true, name: true, active: true } },
        section: { select: { id: true, schoolClassId: true, name: true, active: true } },
      },
      orderBy: { joinedAt: "desc" },
    });
  },
  getEffectivePlan: getEffectiveStudentPlan,
};

export function loadStudentIdentity(
  userId: string,
  role: string | null | undefined,
  userPublisherId?: string | null,
) {
  return resolveStudentIdentity({ userId, role, userPublisherId }, dependencies);
}
