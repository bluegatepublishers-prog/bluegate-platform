import "server-only";

import { prisma } from "@/lib/prisma";
import { resolveEffectiveStudentPlan } from "./student-plan-policy";

export async function getEffectiveStudentPlan(
  studentId: string,
  academicYearId: string,
  now: Date = new Date(),
) {
  const grants = await prisma.studentAccessGrant.findMany({
    where: {
      studentId,
      academicYearId,
      active: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    select: {
      academicYearId: true,
      plan: true,
      source: true,
      active: true,
      startsAt: true,
      endsAt: true,
    },
  });
  return resolveEffectiveStudentPlan(academicYearId, grants, now);
}
