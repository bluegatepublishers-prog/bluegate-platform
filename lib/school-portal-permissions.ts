import "server-only";

import { Prisma, SecurityAuditOutcome, SchoolPortalPermission, UserRole } from "@prisma/client";

import { requireSchool } from "@/lib/school-dashboard";
import { prisma } from "@/lib/prisma";
import { accountAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";

export type SchoolPortalPermissionFlags = {
  parentLoginEnabled: boolean;
  parentActivationAllowed: boolean;
  parentPlannerVisibility: boolean;
  parentAttendanceVisibility: boolean;
  parentHomeworkVisibility: boolean;
  parentTeacherMaterialVisibility: boolean;
  parentAssessmentVisibility: boolean;
  parentAnnouncementAcknowledgement: boolean;
  mentorLoginEnabled: boolean;
  mentorActivationAllowed: boolean;
  mentorAssignedStudentVisibility: boolean;
  mentorPlannerVisibility: boolean;
  mentorAttendanceVisibility: boolean;
  mentorAcademicProgressVisibility: boolean;
  mentorPlanCreation: boolean;
  mentorParentVisibleUpdates: boolean;
};

export const SCHOOL_PORTAL_PERMISSION_DEFAULTS: SchoolPortalPermissionFlags = {
  parentLoginEnabled: true,
  parentActivationAllowed: true,
  parentPlannerVisibility: true,
  parentAttendanceVisibility: true,
  parentHomeworkVisibility: true,
  parentTeacherMaterialVisibility: true,
  parentAssessmentVisibility: true,
  parentAnnouncementAcknowledgement: true,
  mentorLoginEnabled: true,
  mentorActivationAllowed: true,
  mentorAssignedStudentVisibility: true,
  mentorPlannerVisibility: true,
  mentorAttendanceVisibility: true,
  mentorAcademicProgressVisibility: true,
  mentorPlanCreation: true,
  mentorParentVisibleUpdates: true,
};

export type SchoolPortalPermissionSnapshot = SchoolPortalPermissionFlags;

export type SchoolPortalPermissionInput =
  | SchoolPortalPermission
  | (Partial<SchoolPortalPermissionFlags> & Record<string, unknown>)
  | null
  | undefined;

export type SchoolPortalPermissionFormInput = {
  confirmDisablingPortalAccess?: boolean;
} & SchoolPortalPermissionSnapshot;

const PERMISSION_FIELDS = Object.keys(SCHOOL_PORTAL_PERMISSION_DEFAULTS) as Array<keyof SchoolPortalPermissionSnapshot>;

export function mergeSchoolPortalPermissionDefaults(
  row: SchoolPortalPermissionInput,
): SchoolPortalPermissionSnapshot {
  return { ...SCHOOL_PORTAL_PERMISSION_DEFAULTS, ...row };
}

export async function getSchoolPortalPermissionsBySchoolId(schoolId: string) {
  const row = await prisma.schoolPortalPermission.findUnique({
    where: { schoolId },
    select: {
      parentLoginEnabled: true,
      parentActivationAllowed: true,
      parentPlannerVisibility: true,
      parentAttendanceVisibility: true,
      parentHomeworkVisibility: true,
      parentTeacherMaterialVisibility: true,
      parentAssessmentVisibility: true,
      parentAnnouncementAcknowledgement: true,
      mentorLoginEnabled: true,
      mentorActivationAllowed: true,
      mentorAssignedStudentVisibility: true,
      mentorPlannerVisibility: true,
      mentorAttendanceVisibility: true,
      mentorAcademicProgressVisibility: true,
      mentorPlanCreation: true,
      mentorParentVisibleUpdates: true,
    },
  });
  return mergeSchoolPortalPermissionDefaults(row);
}

export async function getSchoolPortalPermissions() {
  const school = await requireSchool();
  return getSchoolPortalPermissionsBySchoolId(school.id);
}

export async function updateSchoolPortalPermissions(input: SchoolPortalPermissionFormInput) {
  const school = await requireSchool();
  const publisherId = school.publisherId;
  if (!publisherId) throw new Error("School portal permissions are unavailable for this school.");

  if (
    input.confirmDisablingPortalAccess !== true &&
    (!input.parentLoginEnabled || !input.mentorLoginEnabled)
  ) {
    throw new Error("Confirm portal access changes before disabling login.");
  }

  const nextValues = PERMISSION_FIELDS.reduce((acc, key) => {
    acc[key] = Boolean(input[key]);
    return acc;
  }, {} as SchoolPortalPermissionSnapshot);

  return prisma.$transaction(async (tx) => {
    const currentRow = await tx.schoolPortalPermission.findUnique({
      where: { schoolId: school.id },
      select: { id: true, ...PERMISSION_FIELDS.reduce((acc, key) => ({ ...acc, [key]: true }), {}) },
    });
    const currentValues = mergeSchoolPortalPermissionDefaults(currentRow ?? null);

    const changedFields = PERMISSION_FIELDS.filter((key) => currentValues[key] !== nextValues[key]);

    const updated = await tx.schoolPortalPermission.upsert({
      where: { schoolId: school.id },
      create: {
        schoolId: school.id,
        publisherId,
        ...nextValues,
      },
      update: nextValues,
    });

    if (changedFields.length) {
      await writeSecurityAuditEvent(tx, {
        actor: accountAuditActor({ id: school.userId, role: UserRole.SCHOOL, publisherId: school.publisherId }),
        action: "school.portal_permissions.update",
        targetType: "School",
        targetId: school.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { changedFields },
      });
    }

    if (currentValues.parentLoginEnabled !== updated.parentLoginEnabled) {
      await writeSecurityAuditEvent(tx, {
        actor: accountAuditActor({ id: school.userId, role: UserRole.SCHOOL, publisherId: school.publisherId }),
        action: updated.parentLoginEnabled ? "school.parent_portal.enable" : "school.parent_portal.disable",
        targetType: "School",
        targetId: school.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { enabled: updated.parentLoginEnabled, scope: "parent_portal" },
      });
    }

    if (currentValues.mentorLoginEnabled !== updated.mentorLoginEnabled) {
      await writeSecurityAuditEvent(tx, {
        actor: accountAuditActor({ id: school.userId, role: UserRole.SCHOOL, publisherId: school.publisherId }),
        action: updated.mentorLoginEnabled ? "school.mentor_portal.enable" : "school.mentor_portal.disable",
        targetType: "School",
        targetId: school.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { enabled: updated.mentorLoginEnabled, scope: "mentor_portal" },
      });
    }

    return mergeSchoolPortalPermissionDefaults(updated);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
