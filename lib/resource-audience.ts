import "server-only";

import {
  PlatformFeatureKey,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  isPublisherFeatureEnabled,
} from "@/lib/publisher-features";

import {
  buildActiveTeacherAssignmentsWhere,
  buildEntitledSectionSubjectsWhere,
  getStudentVisibleResourceWhere,
  getTeacherVisibleResourceWhere,
} from "@/lib/resource-access-policy";

import {
  getTeacherResourceAccessWithDependencies,
  getSchoolResourceScopeWithDependencies,
  getTeacherResourceScopeWithDependencies,
  requireSchoolResourceAccessWithDependencies,
  requireTeacherResourceAccessWithDependencies,
  type ResourceAccessDependencies,
} from "@/lib/resource-access-service";

export {
  RESOURCE_AUDIENCE_OPTIONS,
  assertStudentCanUseResource,
  assertTeacherCanUseResource,
  canStudentUseResource,
  canTeacherUseResource,
  filterResourcesForStudent,
  filterResourcesForTeacher,
  getResourceAudienceBadgeClass,
  getResourceAudienceDescription,
  getResourceAudienceLabel,
  validateResourceAudience,
} from "@/lib/resource-audience-ui";

const defaultDependencies:
  ResourceAccessDependencies = {
  findTeacher: (
    userId,
  ) =>
    prisma.teacher.findUnique({
      where: {
        userId,
      },

      include: {
        school: {
          include: {
            publisher:
              true,
          },
        },

        schoolMemberships: {
          where: {
            active: true,
            status:
              "ACTIVE",
          },

          select: {
            schoolId: true,
            active: true,
            status: true,
          },
        },
      },
    }),

  findTeacherAssignments: (
    teacherId,
    schoolId,
  ) =>
    prisma.teacherAssignment.findMany({
      where:
        buildActiveTeacherAssignmentsWhere(
          teacherId,
          schoolId,
        ),

      select: {
        sectionId: true,
        subjectId: true,
        academicYearId: true,
      },
    }),

  /*
   * IMPORTANT:
   * Keep id for the existing Resource Library
   * authorization and also return bookId for the
   * Smart Book embedded-resource authorization.
   */
  findEntitledSectionSubjects: (
    assignments,
  ) =>
    prisma.sectionSubject.findMany({
      where:
        buildEntitledSectionSubjectsWhere(
          assignments,
        ),

      select: {
        id: true,
        bookId: true,
      },
    }),

  findSchool: (
    userId,
  ) =>
    prisma.school.findUnique({
      where: {
        userId,
      },

      include: {
        publisher:
          true,
      },
    }),

  isResourcesEnabled: (
    publisherId,
  ) =>
    isPublisherFeatureEnabled(
      publisherId,
      PlatformFeatureKey.RESOURCES,
    ),

  findResource: (
    where,
  ) =>
    prisma.resource.findFirst({
      where,
    }),
};

export {
  getStudentVisibleResourceWhere,
  getTeacherVisibleResourceWhere,
};

export function requireTeacherResourceAccess(
  userId: string,
  resourceId: string,
) {
  return requireTeacherResourceAccessWithDependencies(
    userId,
    resourceId,
    defaultDependencies,
  );
}

export function getTeacherResourceScope(
  userId: string,
) {
  return getTeacherResourceScopeWithDependencies(
    userId,
    defaultDependencies,
  );
}

export function getTeacherResourceAccessState(
  userId: string,
) {
  return getTeacherResourceAccessWithDependencies(
    userId,
    defaultDependencies,
  );
}

export function requireSchoolResourceAccess(
  userId: string,
  resourceId: string,
) {
  return requireSchoolResourceAccessWithDependencies(
    userId,
    resourceId,
    defaultDependencies,
  );
}

export function getSchoolResourceScope(
  userId: string,
) {
  return getSchoolResourceScopeWithDependencies(
    userId,
    defaultDependencies,
  );
}

/*
 * Student direct resource authorization remains
 * unchanged here.
 *
 * Smart Book Student media authorization can be
 * handled separately after Teacher playback has
 * been verified.
 */
export async function requireStudentResourceAccess(
  publisherId: string,
  resourceId: string,
) {
  return prisma.resource.findFirst({
    where: {
      id: resourceId,

      ...getStudentVisibleResourceWhere(
        publisherId,
      ),
    },
  });
}