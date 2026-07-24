import "server-only";

import { PlatformFeatureKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
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

const defaultDependencies: ResourceAccessDependencies = {
  findTeacher: (userId) =>
    prisma.teacher.findUnique({
      where: { userId },
      include: { school: { include: { publisher: true } } },
    }),
  findTeacherAssignments: (teacherId, schoolId) =>
    prisma.teacherAssignment.findMany({
      where: buildActiveTeacherAssignmentsWhere(teacherId, schoolId),
      select: { sectionId: true, subjectId: true, academicYearId: true },
    }),
  findEntitledSectionSubjects: (assignments, schoolId, publisherId) =>
    prisma.sectionSubject.findMany({
      where: buildEntitledSectionSubjectsWhere(
        assignments,
        schoolId,
        publisherId,
      ),
      select: { id: true },
    }),
  findSchool: (userId) =>
    prisma.school.findUnique({
      where: { userId },
      include: { publisher: true },
    }),
  isResourcesEnabled: (publisherId) =>
    isPublisherFeatureEnabled(publisherId, PlatformFeatureKey.RESOURCES),
  findResource: (where) => prisma.resource.findFirst({ where }),
};

export { getStudentVisibleResourceWhere, getTeacherVisibleResourceWhere };

export function requireTeacherResourceAccess(userId: string, resourceId: string) {
  return requireTeacherResourceAccessWithDependencies(
    userId,
    resourceId,
    defaultDependencies,
  );
}

export function getTeacherResourceScope(userId: string) {
  return getTeacherResourceScopeWithDependencies(userId, defaultDependencies);
}

export function getTeacherResourceAccessState(userId: string) {
  return getTeacherResourceAccessWithDependencies(userId, defaultDependencies);
}

export function requireSchoolResourceAccess(userId: string, resourceId: string) {
  return requireSchoolResourceAccessWithDependencies(
    userId,
    resourceId,
    defaultDependencies,
  );
}

export function getSchoolResourceScope(userId: string) {
  return getSchoolResourceScopeWithDependencies(userId, defaultDependencies);
}

// Phase 9 will add authenticated enrollment/adoption checks around this resource-level predicate.
export async function requireStudentResourceAccess(
  publisherId: string,
  resourceId: string,
) {
  return prisma.resource.findFirst({
    where: { id: resourceId, ...getStudentVisibleResourceWhere(publisherId) },
  });
}
