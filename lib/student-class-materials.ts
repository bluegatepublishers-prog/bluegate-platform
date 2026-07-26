import "server-only";

import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student-dashboard";

export async function getStudentClassMaterials() {
  const identity = await requireStudent();
  const now = new Date();
  const materials = await prisma.classMaterial.findMany({
    where: {
      publisherId: identity.publisher.id,
      schoolId: identity.school.id,
      academicYearId: identity.academicYear.id,
      schoolClassId: identity.enrollment.schoolClassId,
      sectionId: identity.enrollment.sectionId,
      archivedAt: null,
      sectionSubject: { active: true, sectionId: identity.enrollment.sectionId },
      OR: [
        { status: "SHARED" },
        { status: "SCHEDULED", scheduledAt: { lte: now } },
      ],
    },
    include: {
      subject: { select: { id: true, name: true, sortOrder: true } },
      chapter: { select: { id: true, title: true, chapterNumber: true } },
      teacher: { select: { user: { select: { name: true } } } },
    },
    orderBy: [
      { subject: { sortOrder: "asc" } },
      { chapter: { chapterNumber: "asc" } },
      { sharedAt: "desc" },
      { createdAt: "desc" },
    ],
  });
  return { identity, materials };
}
