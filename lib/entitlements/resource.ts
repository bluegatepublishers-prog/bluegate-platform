import "server-only";

import {
  EnrollmentStatus,
  PlatformFeatureKey,
  ResourceAudience,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decideSchoolAccess } from "@/lib/school-access-policy";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import {
  requireSchoolResourceAccess,
  requireTeacherResourceAccess,
} from "@/lib/resource-audience";
import { SafeEntitlementError } from "./errors";
import type {
  AuthenticatedEntitlementUser,
  EntitlementDecision,
  ResourceEntitlementRequest,
} from "./types";
import type { ResourceAccessRecord } from "@/lib/resource-access-service";

interface ResourceEntitlementResolution {
  decision: EntitlementDecision;
  resource?: ResourceAccessRecord;
  actorId?: string;
}

const denied = (reason: EntitlementDecision & { allowed: false }) => ({
  decision: reason,
});

async function schoolCanUseAssignedResources(schoolId: string, role: "SCHOOL" | "TEACHER" | "STUDENT") {
  const subscription = await prisma.schoolAccessSubscription.findUnique({ where: { schoolId } });
  return Boolean(subscription && decideSchoolAccess({ subscription, capability: "RESOURCE_CONTENT", role, contentEntitled: true }).allowed);
}

export async function resolveResourceEntitlementForAuthenticatedUser(
  user: AuthenticatedEntitlementUser,
  request: ResourceEntitlementRequest,
): Promise<ResourceEntitlementResolution> {
  if (!user.id) return denied({ allowed: false, reason: "NOT_AUTHENTICATED" });
  if (!user.role || user.role === "SUPER_ADMIN") {
    return denied({ allowed: false, reason: "WRONG_ROLE" });
  }

  if (user.role === "TEACHER") {
    const access = await requireTeacherResourceAccess(user.id, request.resourceId);
    if (access?.teacher.schoolId && !(await schoolCanUseAssignedResources(access.teacher.schoolId, "TEACHER"))) {
      return denied({ allowed: false, reason: "SCHOOL_INACTIVE" });
    }
    return access
      ? {
          decision: {
            allowed: true,
            reason: "ALLOWED",
            source: "TEACHER_ASSIGNMENT",
          },
          resource: access.resource,
          actorId: access.teacher.id,
        }
      : denied({ allowed: false, reason: "RECORD_NOT_FOUND" });
  }

  if (user.role === "SCHOOL") {
    const access = await requireSchoolResourceAccess(user.id, request.resourceId);
    if (access && !(await schoolCanUseAssignedResources(access.school.id, "SCHOOL"))) {
      return denied({ allowed: false, reason: "SCHOOL_INACTIVE" });
    }
    return access
      ? {
          decision: {
            allowed: true,
            reason: "ALLOWED",
            source: "SCHOOL_RESOURCE_ASSIGNMENT",
          },
          resource: access.resource,
          actorId: access.school.id,
        }
      : denied({ allowed: false, reason: "RECORD_NOT_FOUND" });
  }

  if (user.role === "ADMIN") {
    const admin = await prisma.user.findUnique({
      where: { id: user.id },
      select: { publisherId: true, publisher: { select: { active: true } } },
    });
    if (!admin?.publisherId || !admin.publisher?.active) {
      return denied({ allowed: false, reason: "PUBLISHER_INACTIVE" });
    }
    if (
      !(await isPublisherFeatureEnabled(
        admin.publisherId,
        PlatformFeatureKey.RESOURCES,
      ))
    ) {
      return denied({ allowed: false, reason: "FEATURE_DISABLED" });
    }
    const resource = await prisma.resource.findFirst({
      where: { id: request.resourceId, publisherId: admin.publisherId },
    });
    return resource
      ? {
          decision: {
            allowed: true,
            reason: "ALLOWED",
            source: "PUBLISHER_ADMIN",
          },
          resource,
          actorId: admin.publisherId,
        }
      : denied({ allowed: false, reason: "RECORD_NOT_FOUND" });
  }

  if (user.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: { userId: user.id },
      include: { school: { include: { publisher: { select: { active: true } }, accessSubscription: true } } },
    });
    if (!student?.active || !student.school.publisherId) {
      return denied({ allowed: false, reason: "NO_ENROLLMENT" });
    }
    if (!student.school.publisher?.active) {
      return denied({ allowed: false, reason: "PUBLISHER_INACTIVE" });
    }
    if (!student.school.accessSubscription || !decideSchoolAccess({ subscription: student.school.accessSubscription, capability: "RESOURCE_CONTENT", role: "STUDENT", contentEntitled: true }).allowed) {
      return denied({ allowed: false, reason: "SCHOOL_INACTIVE" });
    }
    if (
      !(await isPublisherFeatureEnabled(
        student.school.publisherId,
        PlatformFeatureKey.RESOURCES,
      ))
    ) {
      return denied({ allowed: false, reason: "FEATURE_DISABLED" });
    }
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId: student.id,
        schoolId: student.schoolId,
        academicYearId: request.academicYearId,
        sectionId: request.sectionId,
        status: EnrollmentStatus.ACTIVE,
        academicYear: {
          active: true,
          current: request.academicYearId ? undefined : true,
        },
        schoolClass: { active: true },
        section: { active: true },
      },
      select: { academicYearId: true, sectionId: true },
    });
    if (!enrollment) return denied({ allowed: false, reason: "NO_ENROLLMENT" });
    const resource = await prisma.resource.findFirst({
      where: {
        id: request.resourceId,
        publisherId: student.school.publisherId,
        published: true,
        archived: false,
        audience: { in: [ResourceAudience.STUDENT, ResourceAudience.BOTH] },
        schoolEntitlements: {
          some: {
            schoolId: student.schoolId,
            publisherId: student.school.publisherId,
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
                      schoolId: student.schoolId,
                      publisherId: student.school.publisherId,
                      status: "ACTIVE",
                    },
                  },
                },
              },
            ],
          },
        ],
        sectionSubjects: {
          some: {
            id: request.sectionSubjectId,
            active: true,
            sectionId: enrollment.sectionId,
          },
        },
      },
    });
    return resource
      ? {
          decision: {
            allowed: true,
            reason: "ALLOWED",
            source: "STUDENT_ENROLLMENT",
          },
          resource,
          actorId: student.id,
        }
      : denied({ allowed: false, reason: "RECORD_NOT_FOUND" });
  }

  return denied({ allowed: false, reason: "WRONG_ROLE" });
}

export async function getResourceEntitlementForAuthenticatedUser(
  user: AuthenticatedEntitlementUser,
  request: ResourceEntitlementRequest,
) {
  return (await resolveResourceEntitlementForAuthenticatedUser(user, request))
    .decision;
}

export async function requireResourceEntitlement(
  user: AuthenticatedEntitlementUser,
  request: ResourceEntitlementRequest,
) {
  const resolution = await resolveResourceEntitlementForAuthenticatedUser(
    user,
    request,
  );
  if (!resolution.decision.allowed || !resolution.resource) {
    throw new SafeEntitlementError("resource");
  }
  return resolution;
}

export async function requireTeacherResourceEntitlementAccess(
  userId: string,
  resourceId: string,
) {
  const resolution = await resolveResourceEntitlementForAuthenticatedUser(
    { id: userId, role: "TEACHER" },
    { resourceId },
  );
  return resolution.decision.allowed && resolution.resource && resolution.actorId
    ? { teacher: { id: resolution.actorId }, resource: resolution.resource }
    : null;
}

export async function requireSchoolResourceEntitlementAccess(
  userId: string,
  resourceId: string,
) {
  const resolution = await resolveResourceEntitlementForAuthenticatedUser(
    { id: userId, role: "SCHOOL" },
    { resourceId },
  );
  return resolution.decision.allowed && resolution.resource && resolution.actorId
    ? { school: { id: resolution.actorId }, resource: resolution.resource }
    : null;
}
