import "server-only";

import { BookAdoptionStatus, PlatformFeatureKey, ResourceAudience, TeacherAssignmentType } from "@prisma/client";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { requireStudent } from "@/lib/student-dashboard";
import { buildStudentSubjectViewModels } from "@/lib/student-subject-policy";
import { resolveResourceEntitlementForAuthenticatedUser } from "@/lib/entitlements/resource";
import { authorizeStudentResourceFromSubjects } from "@/lib/student-resource-service";

export const getStudentSubjects = cache(async () => {
  const identity = await requireStudent();
  const { enrollment, publisher, school } = identity;
  const resourcesEnabled = await isPublisherFeatureEnabled(publisher.id, PlatformFeatureKey.RESOURCES);
  const subjects = await prisma.sectionSubject.findMany({
    where: {
      sectionId: enrollment.sectionId,
      active: true,
      subject: { active: true },
      section: {
        active: true,
        schoolClass: {
          id: enrollment.schoolClassId,
          schoolId: school.id,
          academicYearId: enrollment.academicYearId,
          active: true,
        },
      },
    },
    select: {
      id: true,
      sectionId: true,
      active: true,
      sortOrder: true,
      subject: { select: { id: true, name: true, code: true, active: true } },
      bookAdoptions: {
        where: {
          schoolId: school.id,
          publisherId: publisher.id,
          academicYearId: enrollment.academicYearId,
          schoolClassId: enrollment.schoolClassId,
          sectionId: enrollment.sectionId,
          status: BookAdoptionStatus.APPROVED,
          active: true,
          book: {
            archived: false,
            schoolEntitlements: {
              some: {
                schoolId: school.id,
                publisherId: publisher.id,
                status: "ACTIVE",
              },
            },
          },
        },
        select: {
          schoolId: true,
          publisherId: true,
          academicYearId: true,
          schoolClassId: true,
          sectionId: true,
          sectionSubjectId: true,
          status: true,
          active: true,
          book: {
            select: {
              id: true,
              publisherId: true,
              subjectId: true,
              title: true,
              coverImage: true,
              published: true,
              class: { select: { name: true } },
              subject: { select: { name: true } },
              series: { select: { name: true } },
            },
          },
        },
      },
      resources: {
        where: {
          publisherId: publisher.id,
          published: true,
          archived: false,
          audience: { in: [ResourceAudience.STUDENT, ResourceAudience.BOTH] },
          schoolEntitlements: {
            some: {
              schoolId: school.id,
              publisherId: publisher.id,
              status: "ACTIVE",
            },
          },
          AND: [
            {
              OR: [
                { bookId: null },
                {
                  book: {
                    schoolEntitlements: {
                      some: {
                        schoolId: school.id,
                        publisherId: publisher.id,
                        status: "ACTIVE",
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
        select: {
          id: true,
          publisherId: true,
          title: true,
          description: true,
          subject: true,
          classLevel: true,
          type: true,
          audience: true,
          thumbnail: true,
          published: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { subject: { sortOrder: "asc" } }],
  });
  const assignments = subjects.length ? await prisma.teacherAssignment.findMany({
    where: {
      schoolId: school.id,
      academicYearId: enrollment.academicYearId,
      schoolClassId: enrollment.schoolClassId,
      sectionId: enrollment.sectionId,
      subjectId: { in: subjects.map((item) => item.subject.id) },
      type: TeacherAssignmentType.SUBJECT_TEACHER,
      active: true,
      teacher: { active: true, schoolId: school.id },
    },
    select: {
      schoolId: true,
      academicYearId: true,
      schoolClassId: true,
      sectionId: true,
      subjectId: true,
      type: true,
      active: true,
      teacher: { select: { active: true, schoolId: true, user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  }) : [];
  return buildStudentSubjectViewModels(
    {
      schoolId: school.id,
      publisherId: publisher.id,
      academicYearId: enrollment.academicYearId,
      schoolClassId: enrollment.schoolClassId,
      className: enrollment.schoolClass.name,
      sectionId: enrollment.sectionId,
      resourcesEnabled,
    },
    subjects.map((subject) => ({
      ...subject,
      adoptions: subject.bookAdoptions,
      assignments: assignments.filter((assignment) => assignment.subjectId === subject.subject.id),
    })),
  );
});

export async function getStudentSubject(sectionSubjectId: string) {
  return (await getStudentSubjects()).find((subject) => subject.sectionSubjectId === sectionSubjectId) ?? null;
}

export type StudentDashboardIdentity = Awaited<ReturnType<typeof requireStudent>>;

export async function resolveStudentResource(
  resourceId: string,
  identity: StudentDashboardIdentity,
) {
  if (!identity.student.userId) return null;
  return authorizeStudentResourceFromSubjects(
    {
      resourceId,
      userId: identity.student.userId,
      academicYearId: identity.enrollment.academicYearId,
      sectionId: identity.enrollment.sectionId,
      subjects: await getStudentSubjects(),
    },
    resolveResourceEntitlementForAuthenticatedUser,
  );
}
