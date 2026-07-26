import "server-only";

import { randomBytes } from "node:crypto";
import {
  Prisma,
  SchoolOnboardingStatus,
  SecurityAuditOutcome,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import {
  publisherAdminAuditActor,
  writeSecurityAuditEvent,
} from "@/lib/security-audit";

export class SchoolLifecycleError extends Error {}

export const SCHOOL_LIFECYCLE_TRANSITIONS = {
  pause: {
    from: [SchoolOnboardingStatus.APPROVED],
    to: SchoolOnboardingStatus.PAUSED,
    action: "publisher.school.pause",
  },
  resume: {
    from: [SchoolOnboardingStatus.PAUSED, SchoolOnboardingStatus.SUSPENDED],
    to: SchoolOnboardingStatus.APPROVED,
    action: "publisher.school.resume",
  },
  suspend: {
    from: [SchoolOnboardingStatus.APPROVED, SchoolOnboardingStatus.PAUSED],
    to: SchoolOnboardingStatus.SUSPENDED,
    action: "publisher.school.suspend",
  },
  revoke: {
    from: [
      SchoolOnboardingStatus.APPROVED,
      SchoolOnboardingStatus.PAUSED,
      SchoolOnboardingStatus.SUSPENDED,
    ],
    to: SchoolOnboardingStatus.REVOKED,
    action: "publisher.school.revoke",
  },
  archive: {
    from: [
      SchoolOnboardingStatus.APPROVED,
      SchoolOnboardingStatus.PAUSED,
      SchoolOnboardingStatus.SUSPENDED,
      SchoolOnboardingStatus.REVOKED,
      SchoolOnboardingStatus.REJECTED,
    ],
    to: SchoolOnboardingStatus.ARCHIVED,
    action: "publisher.school.archive",
  },
  restore: {
    from: [SchoolOnboardingStatus.ARCHIVED],
    to: SchoolOnboardingStatus.PAUSED,
    action: "publisher.school.restore",
  },
} as const;

export type SchoolLifecycleAction = keyof typeof SCHOOL_LIFECYCLE_TRANSITIONS;

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

export async function createPublisherSchool(input: {
  schoolName: unknown;
  city: unknown;
  state: unknown;
  principalName?: unknown;
  email: unknown;
  phone?: unknown;
}) {
  const actor = await requireLivePublisherAdmin();
  const schoolName = clean(input.schoolName, 160);
  const city = clean(input.city, 80);
  const state = clean(input.state, 80);
  const principalName = clean(input.principalName, 120) || null;
  const email = clean(input.email, 254).toLowerCase();
  const phone = clean(input.phone, 30) || null;
  if (!schoolName || !city || !state || !email.includes("@")) {
    throw new SchoolLifecycleError("School name, city, state, and a valid email are required.");
  }
  const password = await hashPassword(randomBytes(32).toString("base64url"));
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: principalName || schoolName,
        email,
        phone,
        password,
        role: "SCHOOL",
        active: true,
        mustChangePassword: true,
        emailVerifiedAt: new Date(),
      },
    });
    const school = await tx.school.create({
      data: {
        userId: user.id,
        publisherId: actor.publisherId,
        schoolName,
        city,
        state,
        principalName,
        status: SchoolOnboardingStatus.PAUSED,
      },
    });
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.school.create",
      targetType: "School",
      targetId: school.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { toStatus: SchoolOnboardingStatus.PAUSED },
    });
    return school;
  });
}

export async function transitionPublisherSchool(
  schoolId: string,
  requestedAction: SchoolLifecycleAction,
  reason?: unknown,
) {
  const actor = await requireLivePublisherAdmin();
  const transition = SCHOOL_LIFECYCLE_TRANSITIONS[requestedAction];
  if (!transition) throw new SchoolLifecycleError("This lifecycle action is unavailable.");
  const note = clean(reason, 500) || null;

  return prisma.$transaction(async (tx) => {
    const school = await tx.school.findFirst({
      where: { id: schoolId, publisherId: actor.publisherId },
      select: { id: true, status: true },
    });
    if (!school) throw new SchoolLifecycleError("School not found.");
    if (!(transition.from as readonly SchoolOnboardingStatus[]).includes(school.status)) {
      throw new SchoolLifecycleError("This school cannot make that lifecycle change from its current status.");
    }

    const updated = await tx.school.updateMany({
      where: {
        id: school.id,
        publisherId: actor.publisherId,
        status: school.status,
      },
      data: { status: transition.to },
    });
    if (updated.count !== 1) throw new SchoolLifecycleError("The school changed before this action completed.");

    await tx.schoolOnboardingReview.create({
      data: {
        schoolId: school.id,
        publisherId: actor.publisherId,
        reviewerUserId: actor.userId,
        fromStatus: school.status,
        toStatus: transition.to,
        reason: note,
      },
    });
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: transition.action,
      targetType: "School",
      targetId: school.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { fromStatus: school.status, toStatus: transition.to },
    });
    return transition.to;
  });
}

export async function updatePublisherSchoolProfile(
  schoolId: string,
  input: {
    schoolName: unknown;
    city: unknown;
    state: unknown;
    principalName?: unknown;
    address?: unknown;
    pincode?: unknown;
  },
) {
  const actor = await requireLivePublisherAdmin();
  const data = {
    schoolName: clean(input.schoolName, 160),
    city: clean(input.city, 80),
    state: clean(input.state, 80),
    principalName: clean(input.principalName, 120) || null,
    address: clean(input.address, 300) || null,
    pincode: clean(input.pincode, 12) || null,
  };
  if (!data.schoolName || !data.city || !data.state) {
    throw new SchoolLifecycleError("School name, city, and state are required.");
  }

  return prisma.$transaction(async (tx) => {
    const school = await tx.school.findFirst({
      where: { id: schoolId, publisherId: actor.publisherId },
      select: { id: true },
    });
    if (!school) throw new SchoolLifecycleError("School not found.");
    await tx.school.update({ where: { id: school.id }, data });
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.school.update",
      targetType: "School",
      targetId: school.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: Object.keys(data) },
    });
  });
}

export type SchoolDependencyCounts = Record<
  | "teacherMemberships"
  | "teacherProfiles"
  | "studentEnrollments"
  | "studentProfiles"
  | "parentRelationships"
  | "academicYears"
  | "classes"
  | "assignments"
  | "submissions"
  | "assessments"
  | "results"
  | "reportCards"
  | "bookAdoptions"
  | "bookEntitlements"
  | "resourceEntitlements"
  | "resourceAssignments"
  | "auditEvents",
  number
>;

export async function countSchoolDeletionDependencies(
  tx: Prisma.TransactionClient | typeof prisma,
  schoolId: string,
): Promise<SchoolDependencyCounts> {
  const [
    teacherMemberships,
    teacherProfiles,
    studentEnrollments,
    studentProfiles,
    parentRelationships,
    academicYears,
    classes,
    assignments,
    submissions,
    assessments,
    results,
    reportCards,
    bookAdoptions,
    bookEntitlements,
    resourceEntitlements,
    resourceAssignments,
    auditEvents,
  ] = await Promise.all([
    tx.schoolStaffMembership.count({ where: { schoolId } }),
    tx.teacher.count({ where: { schoolId } }),
    tx.studentEnrollment.count({ where: { schoolId } }),
    tx.student.count({ where: { schoolId } }),
    tx.parentStudentRelationship.count({ where: { student: { enrollments: { some: { schoolId } } } } }),
    tx.academicYear.count({ where: { schoolId } }),
    tx.schoolClass.count({ where: { schoolId } }),
    tx.classroomAssignment.count({ where: { schoolId } }),
    tx.assignmentSubmission.count({ where: { schoolId } }),
    tx.assessment.count({ where: { schoolId } }),
    tx.assessmentResult.count({ where: { attempt: { schoolId } } }),
    tx.reportCardSnapshot.count({ where: { schoolId } }),
    tx.schoolBookAdoption.count({ where: { schoolId } }),
    tx.schoolBookEntitlement.count({ where: { schoolId } }),
    tx.schoolResourceEntitlement.count({ where: { schoolId } }),
    tx.sectionSubject.count({ where: { section: { schoolClass: { schoolId } }, resources: { some: {} } } }),
    tx.securityAuditEvent.count({ where: { targetType: "School", targetId: schoolId } }),
  ]);
  return {
    teacherMemberships,
    teacherProfiles,
    studentEnrollments,
    studentProfiles,
    parentRelationships,
    academicYears,
    classes,
    assignments,
    submissions,
    assessments,
    results,
    reportCards,
    bookAdoptions,
    bookEntitlements,
    resourceEntitlements,
    resourceAssignments,
    auditEvents,
  };
}

export async function explainBlockedPublisherSchoolDeletion(schoolId: string) {
  const actor = await requireLivePublisherAdmin();
  const school = await prisma.school.findFirst({
    where: { id: schoolId, publisherId: actor.publisherId },
    select: { id: true },
  });
  if (!school) throw new SchoolLifecycleError("School not found.");
  const counts = await countSchoolDeletionDependencies(prisma, school.id);
  const dependencyCount = Object.values(counts).reduce((total, count) => total + count, 0);
  await prisma.$transaction((tx) => writeSecurityAuditEvent(tx, {
    actor: publisherAdminAuditActor(actor),
    action: "publisher.school.permanent_delete.blocked",
    targetType: "School",
    targetId: school.id,
    outcome: SecurityAuditOutcome.DENIED,
    reasonCode: "INVALID_STATE",
    metadata: { dependencyCount },
  }));
  return {
    allowed: false as const,
    message: dependencyCount
      ? "Permanent deletion is blocked because this school has retained identity or academic records."
      : "Permanent deletion is not available to publisher administrators.",
    counts,
  };
}
