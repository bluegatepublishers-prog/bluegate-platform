import "server-only";

import { TeacherAssignmentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTeacherGapScope } from "@/lib/gaps/teacher";
import { requirePublisherFeature } from "@/lib/publisher-features";
import { PlatformFeatureKey } from "@prisma/client";

export async function getTeacherRemedialPlans() {
  const scope = await getTeacherGapScope();
  await requirePublisherFeature(scope.teacher.school!.publisherId!, PlatformFeatureKey.REMEDIALS);
  const classScopes = scope.assignments.filter((row) => row.type === TeacherAssignmentType.CLASS_TEACHER).map((row) => ({ academicYearId: row.academicYearId, student: { enrollments: { some: { academicYearId: row.academicYearId, sectionId: row.sectionId, status: "ACTIVE" as const } } } }));
  const subjectScopes = scope.assignments.filter((row) => row.type === TeacherAssignmentType.SUBJECT_TEACHER && row.subjectId).map((row) => ({ academicYearId: row.academicYearId, gap: { subjectId: row.subjectId!, student: { enrollments: { some: { academicYearId: row.academicYearId, sectionId: row.sectionId, status: "ACTIVE" as const } } } } }));
  if (!classScopes.length && !subjectScopes.length) return [];
  return prisma.remedialPlan.findMany({ where: { schoolId: scope.teacher.schoolId!, OR: [...classScopes, ...subjectScopes] }, include: { student: { select: { name: true, admissionNumber: true } }, gap: { include: { subject: { select: { name: true } }, chapter: { select: { title: true } } } }, steps: { include: { recommendation: true }, orderBy: { sequence: "asc" } } }, orderBy: [{ status: "asc" }, { priority: "desc" }, { dueAt: "asc" }], take: 200 });
}
