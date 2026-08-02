import "server-only";

import { PlatformFeatureKey, SchoolStaffMembershipStatus, UserRole } from "@prisma/client";

import { effectiveSchoolAccessStatus } from "@/lib/school-access-policy";
import { mergeSchoolPortalPermissionDefaults, SCHOOL_PORTAL_PERMISSION_DEFAULTS } from "@/lib/school-portal-permissions";
import { canAccessMentorAssignment } from "@/lib/mentor-policy";
import { prisma } from "@/lib/prisma";

type AccessCategory = "READY" | "FEATURE_DISABLED" | "SUBSCRIPTION_BLOCKED" | "ACCOUNT_NOT_READY" | "UNAUTHORIZED";

export type ParentPortalPermissions = Pick<typeof SCHOOL_PORTAL_PERMISSION_DEFAULTS,
  | "parentLoginEnabled"
  | "parentActivationAllowed"
  | "parentPlannerVisibility"
  | "parentAttendanceVisibility"
  | "parentHomeworkVisibility"
  | "parentTeacherMaterialVisibility"
  | "parentAssessmentVisibility"
  | "parentAnnouncementAcknowledgement"
  | "mentorParentVisibleUpdates"
>;

export type MentorPortalPermissions = Pick<typeof SCHOOL_PORTAL_PERMISSION_DEFAULTS,
  | "mentorLoginEnabled"
  | "mentorActivationAllowed"
  | "mentorAssignedStudentVisibility"
  | "mentorPlannerVisibility"
  | "mentorAttendanceVisibility"
  | "mentorAcademicProgressVisibility"
  | "mentorPlanCreation"
  | "mentorParentVisibleUpdates"
>;

export type ParentPortalSurface = "ATTENDANCE" | "PLANNER" | "HOMEWORK" | "ASSESSMENTS" | "MENTOR_UPDATES";
export type MentorPortalSurface = "ASSIGNED_STUDENTS" | "ATTENDANCE" | "ACADEMIC_PROGRESS" | "MENTOR_PLAN_CREATION";

export type ParentPortalDeniedCode =
  | "UNAUTHENTICATED_PARENT"
  | "PARENT_ROLE_REQUIRED"
  | "PARENT_USER_INACTIVE"
  | "PARENT_PROFILE_INACTIVE"
  | "PARENT_PORTAL_DISABLED"
  | "PARENT_PORTAL_FEATURE_DISABLED"
  | "PARENT_SUBSCRIPTION_BLOCKED"
  | "PARENT_RELATIONSHIP_INACTIVE"
  | "PARENT_ENROLLMENT_INACTIVE"
  | "PARENT_OWNERSHIP_MISMATCH"
  | "PARENT_SURFACE_DISABLED";

export type MentorPortalDeniedCode =
  | "UNAUTHENTICATED_MENTOR"
  | "MENTOR_ROLE_REQUIRED"
  | "MENTOR_USER_INACTIVE"
  | "MENTOR_PROFILE_INACTIVE"
  | "MENTOR_PORTAL_DISABLED"
  | "MENTOR_PORTAL_FEATURE_DISABLED"
  | "MENTOR_SUBSCRIPTION_BLOCKED"
  | "MENTOR_MEMBERSHIP_INACTIVE"
  | "MENTOR_ASSIGNMENT_INACTIVE"
  | "MENTOR_ENROLLMENT_INACTIVE"
  | "MENTOR_OWNERSHIP_MISMATCH"
  | "MENTOR_SURFACE_DISABLED";

type ParentReadinessReady = {
  ok: true;
  category: "READY";
  actor: {
    user: { id: string; name: string; email: string; active: boolean };
    parent: { id: string; userId: string; active: boolean; phone: string | null };
  };
  permissions: ParentPortalPermissions;
  schoolId: string;
  publisherId: string;
};

type MentorReadinessReady = {
  ok: true;
  category: "READY";
  actor: {
    user: { id: string; name: string; email: string; phone: string | null; active: boolean; publisherId: string | null };
    mentor: { id: string; userId: string; publisherId: string; active: boolean; type: string };
  };
  permissions: MentorPortalPermissions;
  schoolId: string;
  publisherId: string;
};

type Denied<TCode extends string, TPermissions> = {
  ok: false;
  category: AccessCategory;
  code: TCode;
  message: string;
  permissions: TPermissions | null;
  schoolId: string | null;
  publisherId: string | null;
};

export type ParentPortalReadiness = ParentReadinessReady | Denied<ParentPortalDeniedCode, ParentPortalPermissions>;
export type MentorPortalReadiness = MentorReadinessReady | Denied<MentorPortalDeniedCode, MentorPortalPermissions>;

const parentFeatureWhere = {
  enabled: true,
  feature: { key: PlatformFeatureKey.PARENT_PORTAL, active: true, implemented: true },
};

const mentorFeatureWhere = {
  enabled: true,
  feature: { key: PlatformFeatureKey.TUTOR_PLATFORM, active: true, implemented: true },
};

export function parentPermissionsFor(row: Partial<typeof SCHOOL_PORTAL_PERMISSION_DEFAULTS> | null | undefined): ParentPortalPermissions {
  const merged = mergeSchoolPortalPermissionDefaults(row);
  return {
    parentLoginEnabled: merged.parentLoginEnabled,
    parentActivationAllowed: merged.parentActivationAllowed,
    parentPlannerVisibility: merged.parentPlannerVisibility,
    parentAttendanceVisibility: merged.parentAttendanceVisibility,
    parentHomeworkVisibility: merged.parentHomeworkVisibility,
    parentTeacherMaterialVisibility: merged.parentTeacherMaterialVisibility,
    parentAssessmentVisibility: merged.parentAssessmentVisibility,
    parentAnnouncementAcknowledgement: merged.parentAnnouncementAcknowledgement,
    mentorParentVisibleUpdates: merged.mentorParentVisibleUpdates,
  };
}

export function mentorPermissionsFor(row: Partial<typeof SCHOOL_PORTAL_PERMISSION_DEFAULTS> | null | undefined): MentorPortalPermissions {
  const merged = mergeSchoolPortalPermissionDefaults(row);
  return {
    mentorLoginEnabled: merged.mentorLoginEnabled,
    mentorActivationAllowed: merged.mentorActivationAllowed,
    mentorAssignedStudentVisibility: merged.mentorAssignedStudentVisibility,
    mentorPlannerVisibility: merged.mentorPlannerVisibility,
    mentorAttendanceVisibility: merged.mentorAttendanceVisibility,
    mentorAcademicProgressVisibility: merged.mentorAcademicProgressVisibility,
    mentorPlanCreation: merged.mentorPlanCreation,
    mentorParentVisibleUpdates: merged.mentorParentVisibleUpdates,
  };
}

function parentSurfaceEnabled(permissions: ParentPortalPermissions, surface: ParentPortalSurface) {
  if (surface === "ATTENDANCE") return permissions.parentAttendanceVisibility;
  if (surface === "PLANNER") return permissions.parentPlannerVisibility;
  if (surface === "HOMEWORK") return permissions.parentHomeworkVisibility;
  if (surface === "ASSESSMENTS") return permissions.parentAssessmentVisibility;
  return permissions.mentorParentVisibleUpdates;
}

function mentorSurfaceEnabled(permissions: MentorPortalPermissions, surface: MentorPortalSurface) {
  if (surface === "ASSIGNED_STUDENTS") return permissions.mentorAssignedStudentVisibility;
  if (surface === "ATTENDANCE") return permissions.mentorAttendanceVisibility;
  if (surface === "ACADEMIC_PROGRESS") return permissions.mentorAcademicProgressVisibility;
  return permissions.mentorPlanCreation;
}

export async function getParentPortalLoginReadinessForUserId(userId: string | null | undefined): Promise<ParentPortalReadiness> {
  if (!userId) {
    return { ok: false, category: "UNAUTHORIZED", code: "UNAUTHENTICATED_PARENT", message: "Sign in as a parent to continue.", permissions: null, schoolId: null, publisherId: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      parent: {
        include: {
          relationships: {
            orderBy: { requestedAt: "asc" },
            include: {
              student: {
                include: {
                  school: {
                    include: {
                      publisher: { select: { id: true, active: true, name: true } },
                      accessSubscription: { select: { plan: true, status: true, startsAt: true, expiresAt: true } },
                      portalPermissions: true,
                    },
                  },
                  enrollments: {
                    where: {
                      status: "ACTIVE",
                      academicYear: { active: true, current: true },
                      schoolClass: { active: true },
                      section: { active: true },
                    },
                    select: { id: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return { ok: false, category: "UNAUTHORIZED", code: "UNAUTHENTICATED_PARENT", message: "Sign in as a parent to continue.", permissions: null, schoolId: null, publisherId: null };
  }
  if (user.role !== UserRole.PARENT) {
    return { ok: false, category: "UNAUTHORIZED", code: "PARENT_ROLE_REQUIRED", message: "This account is not configured for the Parent Portal.", permissions: null, schoolId: null, publisherId: null };
  }
  if (!user.active) {
    return { ok: false, category: "ACCOUNT_NOT_READY", code: "PARENT_USER_INACTIVE", message: "Your account is inactive. Contact your school office.", permissions: null, schoolId: null, publisherId: null };
  }
  if (!user.parent?.active) {
    return { ok: false, category: "ACCOUNT_NOT_READY", code: "PARENT_PROFILE_INACTIVE", message: "Your parent profile is inactive. Contact your school office.", permissions: null, schoolId: null, publisherId: null };
  }

  const relationships = user.parent.relationships;
  if (!relationships.length) {
    return { ok: false, category: "ACCOUNT_NOT_READY", code: "PARENT_RELATIONSHIP_INACTIVE", message: "No school-approved parent relationship is available yet.", permissions: null, schoolId: null, publisherId: null };
  }

  for (const relationship of relationships) {
    const school = relationship.student.school;
    const permissions = parentPermissionsFor(school.portalPermissions);
    const publisher = school.publisher;
    const schoolId = school.id;
    const publisherId = school.publisherId ?? null;
    const schoolAccessActive = school.accessSubscription
      ? effectiveSchoolAccessStatus(school.accessSubscription) === "ACTIVE"
      : false;
    const featureEnabled = publisherId
      ? Boolean(await prisma.publisherFeature.findFirst({ where: { publisherId, ...parentFeatureWhere }, select: { id: true } }))
      : false;

    if (!permissions.parentLoginEnabled) {
      return { ok: false, category: "FEATURE_DISABLED", code: "PARENT_PORTAL_DISABLED", message: "Parent login is disabled by this school.", permissions, schoolId, publisherId };
    }
    if (!publisherId || relationship.student.schoolId !== school.id) {
      return { ok: false, category: "ACCOUNT_NOT_READY", code: "PARENT_OWNERSHIP_MISMATCH", message: "Parent access could not be verified for this school.", permissions, schoolId, publisherId };
    }
    if (!featureEnabled || !publisher?.active || school.status !== "APPROVED") {
      return { ok: false, category: "FEATURE_DISABLED", code: "PARENT_PORTAL_FEATURE_DISABLED", message: "The Parent Portal is not enabled for this school.", permissions, schoolId, publisherId };
    }
    if (!schoolAccessActive) {
      return { ok: false, category: "SUBSCRIPTION_BLOCKED", code: "PARENT_SUBSCRIPTION_BLOCKED", message: "Parent access is blocked because this school's subscription is inactive.", permissions, schoolId, publisherId };
    }
    if (relationship.status !== "APPROVED" || !relationship.canViewLearning) {
      continue;
    }
    if (!relationship.student.active) {
      return { ok: false, category: "ACCOUNT_NOT_READY", code: "PARENT_RELATIONSHIP_INACTIVE", message: "This child is no longer active for parent access.", permissions, schoolId, publisherId };
    }
    if (!relationship.student.enrollments.length) {
      return { ok: false, category: "ACCOUNT_NOT_READY", code: "PARENT_ENROLLMENT_INACTIVE", message: "No current student enrollment is available for this child.", permissions, schoolId, publisherId };
    }

    return {
      ok: true,
      category: "READY",
      actor: {
        user: { id: user.id, name: user.name, email: user.email, active: user.active },
        parent: { id: user.parent.id, userId: user.parent.userId, active: user.parent.active, phone: user.parent.phone ?? null },
      },
      permissions,
      schoolId,
      publisherId,
    };
  }

  const firstSchool = relationships[0]?.student.school;
  return {
    ok: false,
    category: "ACCOUNT_NOT_READY",
    code: "PARENT_RELATIONSHIP_INACTIVE",
    message: "No active school-approved parent-student relationship is ready for portal access.",
    permissions: firstSchool ? parentPermissionsFor(firstSchool.portalPermissions) : null,
    schoolId: firstSchool?.id ?? null,
    publisherId: firstSchool?.publisherId ?? null,
  };
}

export async function getMentorPortalLoginReadinessForUserId(userId: string | null | undefined): Promise<MentorPortalReadiness> {
  if (!userId) {
    return { ok: false, category: "UNAUTHORIZED", code: "UNAUTHENTICATED_MENTOR", message: "Sign in as a mentor to continue.", permissions: null, schoolId: null, publisherId: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      publisher: { select: { id: true, active: true, name: true } },
      mentor: {
        include: {
          assignments: {
            where: { status: "ACTIVE", academicYear: { active: true, current: true } },
            orderBy: { startsAt: "desc" },
            include: {
              student: {
                include: {
                  school: {
                    include: {
                      publisher: { select: { id: true, active: true, name: true } },
                      accessSubscription: { select: { plan: true, status: true, startsAt: true, expiresAt: true } },
                      portalPermissions: true,
                    },
                  },
                  enrollments: {
                    where: {
                      status: "ACTIVE",
                      schoolClass: { active: true },
                      section: { active: true },
                    },
                    select: { academicYearId: true },
                    take: 5,
                  },
                },
              },
              academicYear: { select: { id: true, active: true, current: true } },
            },
          },
        },
      },
      staffMemberships: {
        where: { active: true, status: SchoolStaffMembershipStatus.ACTIVE },
        select: { schoolId: true, status: true, active: true },
      },
    },
  });

  if (!user) {
    return { ok: false, category: "UNAUTHORIZED", code: "UNAUTHENTICATED_MENTOR", message: "Sign in as a mentor to continue.", permissions: null, schoolId: null, publisherId: null };
  }
  if (user.role !== UserRole.MENTOR) {
    return { ok: false, category: "UNAUTHORIZED", code: "MENTOR_ROLE_REQUIRED", message: "This account is not configured for the Mentor Portal.", permissions: null, schoolId: null, publisherId: null };
  }
  if (!user.active) {
    return { ok: false, category: "ACCOUNT_NOT_READY", code: "MENTOR_USER_INACTIVE", message: "Your account is inactive. Contact your school office.", permissions: null, schoolId: null, publisherId: null };
  }
  if (!user.mentor?.active || !user.publisher?.active || user.publisherId !== user.mentor?.publisherId) {
    return { ok: false, category: "ACCOUNT_NOT_READY", code: "MENTOR_PROFILE_INACTIVE", message: "Your mentor profile is inactive. Contact your school office.", permissions: null, schoolId: null, publisherId: user.publisherId ?? null };
  }

  const featureEnabled = Boolean(await prisma.publisherFeature.findFirst({
    where: { publisherId: user.mentor.publisherId, ...mentorFeatureWhere },
    select: { id: true },
  }));

  if (!featureEnabled) {
    return { ok: false, category: "FEATURE_DISABLED", code: "MENTOR_PORTAL_FEATURE_DISABLED", message: "The Mentor Portal is not enabled by your publisher.", permissions: null, schoolId: null, publisherId: user.mentor.publisherId };
  }

  const assignments = user.mentor.assignments;
  if (!assignments.length) {
    return { ok: false, category: "ACCOUNT_NOT_READY", code: "MENTOR_ASSIGNMENT_INACTIVE", message: "No active mentor assignment is available yet.", permissions: null, schoolId: null, publisherId: user.mentor.publisherId };
  }

  for (const assignment of assignments) {
    const school = assignment.student.school;
    const permissions = mentorPermissionsFor(school.portalPermissions);
    const schoolId = school.id;
    const publisherId = school.publisherId ?? null;
    const schoolAccessActive = Boolean(
      school.accessSubscription &&
      school.accessSubscription.plan === "PAID" &&
      effectiveSchoolAccessStatus(school.accessSubscription) === "ACTIVE",
    );
    const hasMembership = user.staffMemberships.some((membership) => membership.schoolId === school.id);
    const enrollment = assignment.student.enrollments.find((row) => row.academicYearId === assignment.academicYearId) ?? null;

    if (!permissions.mentorLoginEnabled) {
      return { ok: false, category: "FEATURE_DISABLED", code: "MENTOR_PORTAL_DISABLED", message: "Mentor login is disabled by this school.", permissions, schoolId, publisherId };
    }
    if (!publisherId || assignment.publisherId !== user.mentor.publisherId || school.publisherId !== user.mentor.publisherId || assignment.schoolId !== school.id || assignment.student.schoolId !== school.id) {
      return { ok: false, category: "ACCOUNT_NOT_READY", code: "MENTOR_OWNERSHIP_MISMATCH", message: "Mentor access could not be verified for this school.", permissions, schoolId, publisherId };
    }
    if (!hasMembership) {
      return { ok: false, category: "ACCOUNT_NOT_READY", code: "MENTOR_MEMBERSHIP_INACTIVE", message: "An active mentor school membership is required before sign-in.", permissions, schoolId, publisherId };
    }
    if (!schoolAccessActive) {
      return { ok: false, category: "SUBSCRIPTION_BLOCKED", code: "MENTOR_SUBSCRIPTION_BLOCKED", message: "Mentor access is blocked because this school's subscription is inactive.", permissions, schoolId, publisherId };
    }
    if (!enrollment) {
      return { ok: false, category: "ACCOUNT_NOT_READY", code: "MENTOR_ENROLLMENT_INACTIVE", message: "No current student enrollment is available for this assignment.", permissions, schoolId, publisherId };
    }

    if (!canAccessMentorAssignment({
      status: assignment.status,
      startsAt: assignment.startsAt,
      endsAt: assignment.endsAt,
      assignmentPublisherId: assignment.publisherId,
      mentorPublisherId: user.mentor.publisherId,
      schoolPublisherId: school.publisherId,
      assignmentSchoolId: assignment.schoolId,
      studentSchoolId: assignment.student.schoolId,
      assignmentAcademicYearId: assignment.academicYearId,
      enrollmentAcademicYearId: enrollment.academicYearId,
      plan: "INDIVIDUAL_PREMIUM_MENTOR",
      mentorActive: user.mentor.active,
      publisherActive: user.publisher.active,
      mentorFeatureEnabled: featureEnabled,
    })) {
      continue;
    }

    return {
      ok: true,
      category: "READY",
      actor: {
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone ?? null, active: user.active, publisherId: user.publisherId ?? null },
        mentor: { id: user.mentor.id, userId: user.mentor.userId, publisherId: user.mentor.publisherId, active: user.mentor.active, type: user.mentor.type },
      },
      permissions,
      schoolId,
      publisherId,
    };
  }

  const firstSchool = assignments[0]?.student.school;
  return {
    ok: false,
    category: "ACCOUNT_NOT_READY",
    code: "MENTOR_ASSIGNMENT_INACTIVE",
    message: "No current mentor assignment is ready for portal access.",
    permissions: firstSchool ? mentorPermissionsFor(firstSchool.portalPermissions) : null,
    schoolId: firstSchool?.id ?? null,
    publisherId: firstSchool?.publisherId ?? null,
  };
}

export function assertParentSurfacePermission(readiness: ParentReadinessReady, surface: ParentPortalSurface) {
  if (!parentSurfaceEnabled(readiness.permissions, surface)) {
    return {
      ok: false as const,
      category: "FEATURE_DISABLED" as const,
      code: "PARENT_SURFACE_DISABLED" as const,
      message:
        surface === "ATTENDANCE"
          ? "Attendance is hidden by this school's parent portal settings."
          : surface === "PLANNER"
            ? "Planner access is hidden by this school's parent portal settings."
            : surface === "HOMEWORK"
              ? "Homework access is hidden by this school's parent portal settings."
              : surface === "ASSESSMENTS"
                ? "Assessment access is hidden by this school's parent portal settings."
                : "Mentor updates are hidden by this school's parent portal settings.",
      permissions: readiness.permissions,
      schoolId: readiness.schoolId,
      publisherId: readiness.publisherId,
    };
  }
  return { ok: true as const };
}

export function assertMentorSurfacePermission(readiness: MentorReadinessReady, surface: MentorPortalSurface) {
  if (!mentorSurfaceEnabled(readiness.permissions, surface)) {
    return {
      ok: false as const,
      category: "FEATURE_DISABLED" as const,
      code: "MENTOR_SURFACE_DISABLED" as const,
      message:
        surface === "ASSIGNED_STUDENTS"
          ? "Assigned-student access is hidden by this school's mentor portal settings."
          : surface === "ATTENDANCE"
            ? "Attendance is hidden by this school's mentor portal settings."
            : surface === "ACADEMIC_PROGRESS"
              ? "Academic progress is hidden by this school's mentor portal settings."
              : "Mentor plan actions are disabled by this school's mentor portal settings.",
      permissions: readiness.permissions,
      schoolId: readiness.schoolId,
      publisherId: readiness.publisherId,
    };
  }
  return { ok: true as const };
}
