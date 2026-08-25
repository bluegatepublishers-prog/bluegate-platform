import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import {
  MentorAssignmentSource,
  MentorStudentAssignment,
  MentorType,
  PlatformFeatureKey,
  Prisma,
  SchoolStaffMembershipStatus,
  SchoolStaffRole,
  SecurityAuditOutcome,
  UserRole,
} from "@prisma/client";
import { assignPrimaryMentor, revokeMentorAssignment } from "@/lib/mentor-assignments";
import { generateResetCompletionToken, hashSecurityValue, securelyMatchesHash } from "@/lib/account-security-policy";
import { cleanText, normalizeEmail, validEmail, validatePassword } from "@/lib/onboarding-policy";
import { hashPassword } from "@/lib/password";
import { mentorPermissionsFor } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import { accountAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";
import { sendConfiguredMail } from "@/lib/mail-runtime";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { effectiveSchoolAccessStatus } from "@/lib/school-access-policy";
import { isSchoolFeatureEnabled } from "@/lib/school-feature-entitlements";
import { requireSchool } from "@/lib/school-dashboard";
import { requireSchoolFeature } from "@/lib/school-feature-access";

export class SchoolMentorError extends Error {}

const activationLifetimeMs = 7 * 24 * 60 * 60 * 1000;

function accountStatus(user: { active: boolean; emailVerifiedAt: Date | null; mustChangePassword: boolean }) {
  if (!user.active) return "Account disabled";
  if (!user.emailVerifiedAt || user.mustChangePassword) return "Activation pending";
  return "Account ready";
}

export async function getSchoolMentors() {
  const school = await requireSchool();
  await requireSchoolFeature("MENTOR_PORTAL");
  const [rows, publisherFeatureEnabled, subscription] = await Promise.all([
    prisma.schoolStaffMembership.findMany({
      where: {
        schoolId: school.id,
        user: { role: UserRole.MENTOR, mentor: { is: { publisherId: school.publisherId ?? "" } } },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            active: true,
            emailVerifiedAt: true,
            mustChangePassword: true,
            mentor: {
              select: {
                id: true,
                active: true,
                specialty: true,
                _count: { select: { assignments: { where: { schoolId: school.id, status: "ACTIVE" } } } },
              },
            },
          },
        },
      },
      orderBy: [{ active: "desc" }, { joinedAt: "desc" }],
    }),
    school.publisherId
      ? isPublisherFeatureEnabled(school.publisherId, PlatformFeatureKey.TUTOR_PLATFORM)
      : Promise.resolve(false),
    prisma.schoolAccessSubscription.findUnique({
      where: { schoolId: school.id },
      select: { featureConfig: true },
    }),
  ]);

  const latestByUser = new Map<string, (typeof rows)[number]>();
  for (const row of rows) if (!latestByUser.has(row.userId)) latestByUser.set(row.userId, row);
  const mentors = [...latestByUser.values()].flatMap((membership) => {
    const mentor = membership.user.mentor;
    if (!mentor) return [];
    return [{
      id: mentor.id,
      name: membership.user.name,
      email: membership.user.email,
      phone: membership.user.phone,
      designation: mentor.specialty ?? "School Mentor",
      accountStatus: accountStatus(membership.user),
      active: membership.active && membership.status === SchoolStaffMembershipStatus.ACTIVE && mentor.active,
      assignedStudents: mentor._count.assignments,
    }];
  });
  return {
    school,
    mentors,
    featureEnabled: publisherFeatureEnabled && isSchoolFeatureEnabled(subscription, "MENTOR_PORTAL"),
  };
}

export async function getSchoolMentor(mentorId: string) {
  const school = await requireSchool();
  await requireSchoolFeature("MENTOR_PORTAL");
  const membership = await prisma.schoolStaffMembership.findFirst({
    where: { schoolId: school.id, user: { role: UserRole.MENTOR, mentor: { is: { id: mentorId, publisherId: school.publisherId ?? "" } } } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          active: true,
          emailVerifiedAt: true,
          mustChangePassword: true,
          mentor: {
            select: {
              id: true,
              active: true,
              specialty: true,
              type: true,
              assignments: {
                where: { schoolId: school.id, status: "ACTIVE" },
                include: {
                  student: {
                    select: {
                      id: true,
                      name: true,
                      admissionNumber: true,
                      enrollments: {
                        where: { status: "ACTIVE", academicYear: { active: true, current: true } },
                        select: { schoolClass: { select: { name: true } }, section: { select: { name: true } } },
                        take: 1,
                      },
                    },
                  },
                  academicYear: { select: { name: true } },
                },
                orderBy: { startsAt: "desc" },
              },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });
  const mentor = membership?.user.mentor;
  if (!membership || !mentor) throw new SchoolMentorError("This mentor is unavailable.");

  const [students, publisherFeatureEnabled, subscription] = await Promise.all([
    prisma.student.findMany({
      where: {
        schoolId: school.id,
        active: true,
        enrollments: { some: { status: "ACTIVE", academicYear: { active: true, current: true }, schoolClass: { active: true }, section: { active: true } } },
      },
      select: {
        id: true,
        name: true,
        admissionNumber: true,
        enrollments: {
          where: { status: "ACTIVE", academicYear: { active: true, current: true } },
          select: { schoolClass: { select: { name: true } }, section: { select: { name: true } } },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    }),
    school.publisherId ? isPublisherFeatureEnabled(school.publisherId, PlatformFeatureKey.TUTOR_PLATFORM) : Promise.resolve(false),
    prisma.schoolAccessSubscription.findUnique({ where: { schoolId: school.id }, select: { featureConfig: true, plan: true, status: true, startsAt: true, expiresAt: true } }),
  ]);
  const active = membership.active && membership.status === SchoolStaffMembershipStatus.ACTIVE && mentor.active;
  const paidSchoolAccess = Boolean(subscription?.plan === "PAID" && effectiveSchoolAccessStatus(subscription) === "ACTIVE");
  const featureEnabled = publisherFeatureEnabled && isSchoolFeatureEnabled(subscription, "MENTOR_PORTAL");
  const loginReady = membership.user.active && Boolean(membership.user.emailVerifiedAt) && !membership.user.mustChangePassword && active && mentor.assignments.length > 0 && featureEnabled && paidSchoolAccess;
  const assignedIds = new Set(mentor.assignments.map((assignment) => assignment.studentId));
  return {
    school,
    membership,
    mentor,
    accountStatus: accountStatus(membership.user),
    active,
    loginReady,
    featureEnabled,
    paidSchoolAccess,
    candidateStudents: students.filter((student) => !assignedIds.has(student.id)),
  };
}

async function issueActivation(user: { id: string; email: string | null }, schoolName: string) {
  if (!user.email) return false;
  const reference = randomUUID();
  const completionToken = generateResetCompletionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + activationLifetimeMs);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`mentor-activation:${user.id}`}))`;
    await tx.passwordResetChallenge.updateMany({ where: { userId: user.id, consumedAt: null, revokedAt: null }, data: { revokedAt: now } });
    await tx.passwordResetChallenge.create({
      data: {
        reference,
        userId: user.id,
        codeHash: hashSecurityValue("mentor-activation-code", reference, randomBytes(24).toString("base64url")),
        expiresAt,
        verifiedAt: now,
        completionTokenHash: hashSecurityValue("password-reset-completion", reference, completionToken),
        completionExpiresAt: expiresAt,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  const baseUrl = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const activationUrl = `${baseUrl}/mentor-activate?reference=${encodeURIComponent(reference)}&token=${encodeURIComponent(completionToken)}`;
  const delivery = await sendConfiguredMail(
    {
      to: user.email,
      subject: `${schoolName} invited you to Bluegate Mentor Portal`,
      text: `${schoolName} created a Bluegate Mentor account for you. Set your password using this secure link:\n\n${activationUrl}\n\nThis link expires in 7 days. If you were not expecting this invitation, contact the school office.`,
    },
    { requireSecuritySecret: true, failureCode: "MENTOR_INVITATION_SEND_FAILED", failureMessage: "Mentor invitation could not be sent." },
  );
  if (delivery.state === "SENT") {
    await prisma.passwordResetChallenge.updateMany({ where: { reference, consumedAt: null, revokedAt: null }, data: { lastSentAt: new Date() } });
  }
  return delivery.state === "SENT";
}

export async function createSchoolMentor(input: Record<string, unknown>) {
  const school = await requireSchool();
  await requireSchoolFeature("MENTOR_PORTAL");
  const publisherId = school.publisherId;
  if (!publisherId || !await isPublisherFeatureEnabled(publisherId, PlatformFeatureKey.TUTOR_PLATFORM)) {
    throw new SchoolMentorError("Mentor onboarding is not enabled for this school.");
  }
  const [permissions, subscription] = await Promise.all([
    mentorPermissionsFor(await prisma.schoolPortalPermission.findUnique({ where: { schoolId: school.id } })),
    prisma.schoolAccessSubscription.findUnique({ where: { schoolId: school.id }, select: { featureConfig: true } }),
  ]);
  if (!isSchoolFeatureEnabled(subscription, "MENTOR_PORTAL")) {
    throw new SchoolMentorError("Mentor onboarding is not enabled for this school.");
  }
  if (!permissions.mentorActivationAllowed) {
    throw new SchoolMentorError("Mentor account activation is disabled by this school.");
  }
  const name = cleanText(input.name, 120);
  const email = normalizeEmail(input.email);
  const phone = cleanText(input.phone, 30);
  const designation = cleanText(input.designation, 100);
  if (name.length < 2 || !validEmail(email) || !designation) throw new SchoolMentorError("Enter a valid name, email, and designation.");

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email }, include: { mentor: true } });
    if (existing) {
      if (existing.role !== UserRole.MENTOR || !existing.mentor || existing.mentor.publisherId !== publisherId) {
        throw new SchoolMentorError("This email belongs to an account that cannot be linked as this school's mentor.");
      }
      const membership = await tx.schoolStaffMembership.findFirst({ where: { schoolId: school.id, userId: existing.id }, orderBy: { joinedAt: "desc" } });
      if (membership?.active && membership.status === SchoolStaffMembershipStatus.ACTIVE) throw new SchoolMentorError("This mentor is already connected to your school.");
      if (membership) {
        await tx.schoolStaffMembership.update({ where: { id: membership.id }, data: { active: true, status: SchoolStaffMembershipStatus.ACTIVE, activeKey: `${school.id}:${existing.id}`, leftAt: null, role: SchoolStaffRole.OTHER } });
      } else {
        await tx.schoolStaffMembership.create({ data: { schoolId: school.id, userId: existing.id, role: SchoolStaffRole.OTHER, status: SchoolStaffMembershipStatus.ACTIVE, active: true, activeKey: `${school.id}:${existing.id}` } });
      }
      await tx.mentor.update({ where: { id: existing.mentor.id }, data: { active: true, specialty: designation } });
      return { mentorId: existing.mentor.id, user: { id: existing.id, email: existing.email }, activationNeeded: !existing.emailVerifiedAt || existing.mustChangePassword };
    }

    const password = await hashPassword(randomBytes(32).toString("base64url"));
    const user = await tx.user.create({ data: { name, email, phone: phone || null, password, role: UserRole.MENTOR, publisherId, active: true, mustChangePassword: true } });
    const mentor = await tx.mentor.create({ data: { userId: user.id, publisherId, type: MentorType.SCHOOL_MENTOR, active: true, specialty: designation } });
    await tx.schoolStaffMembership.create({ data: { schoolId: school.id, userId: user.id, role: SchoolStaffRole.OTHER, status: SchoolStaffMembershipStatus.ACTIVE, active: true, activeKey: `${school.id}:${user.id}` } });
    return { mentorId: mentor.id, user: { id: user.id, email: user.email }, activationNeeded: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  const invitationSent = result.activationNeeded ? await issueActivation(result.user, school.schoolName) : false;
  return { mentorId: result.mentorId, invitationSent, accountAlreadyReady: !result.activationNeeded };
}

export async function resendSchoolMentorActivation(mentorId: string) {
  const detail = await getSchoolMentor(mentorId);
  if (!detail.school.publisherId) throw new SchoolMentorError("Mentor activation is unavailable.");
  if (!detail.featureEnabled) throw new SchoolMentorError("Mentor onboarding is not enabled for this school.");
  const permissions = mentorPermissionsFor(await prisma.schoolPortalPermission.findUnique({ where: { schoolId: detail.school.id } }));
  if (!permissions.mentorActivationAllowed) throw new SchoolMentorError("Mentor account activation is disabled by this school.");
  if (!detail.membership.active || detail.membership.status !== SchoolStaffMembershipStatus.ACTIVE) throw new SchoolMentorError("Activate this mentor before sending an account invitation.");
  if (detail.membership.user.emailVerifiedAt && !detail.membership.user.mustChangePassword) throw new SchoolMentorError("This mentor account is already ready for sign-in.");
  const sent = await issueActivation({ id: detail.membership.user.id, email: detail.membership.user.email }, detail.school.schoolName);
  if (!sent) throw new SchoolMentorError("The activation email could not be sent. Check email delivery settings and try again.");
}

export async function setSchoolMentorActive(mentorId: string, active: boolean) {
  const detail = await getSchoolMentor(mentorId);
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.schoolStaffMembership.update({
      where: { id: detail.membership.id },
      data: { active, status: active ? SchoolStaffMembershipStatus.ACTIVE : SchoolStaffMembershipStatus.LEFT, activeKey: active ? `${detail.school.id}:${detail.membership.userId}` : null, leftAt: active ? null : now },
    });
    if (!active) {
      await tx.mentorStudentAssignment.updateMany({
        where: { mentorId, schoolId: detail.school.id, status: "ACTIVE" },
        data: { status: "REVOKED", activeKey: null, activePrimaryKey: null, endsAt: now, revokedAt: now, revokedById: detail.school.userId, reason: "Mentor deactivated by school" },
      });
    }
    const otherActiveMembership = await tx.schoolStaffMembership.findFirst({ where: { userId: detail.membership.userId, schoolId: { not: detail.school.id }, active: true, status: SchoolStaffMembershipStatus.ACTIVE }, select: { id: true } });
    await tx.mentor.update({ where: { id: mentorId }, data: { active: active || Boolean(otherActiveMembership) } });
    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor({ id: detail.school.userId, role: UserRole.SCHOOL, publisherId: detail.school.publisherId }),
      action: active ? "school.mentor.activate" : "school.mentor.deactivate",
      targetType: "User",
      targetId: detail.membership.userId,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { enabled: active, scope: "mentor_account" },
    });
  });
}

export async function assignSchoolMentorStudent(mentorId: string, studentId: string) {
  const detail = await getSchoolMentor(mentorId);
  if (!detail.active) throw new SchoolMentorError("Activate this mentor before assigning students.");
  if (!detail.featureEnabled) throw new SchoolMentorError("Mentor assignments are not enabled for this school.");
  return assignPrimaryMentor({ mentorId, studentId, source: MentorAssignmentSource.SCHOOL, reason: "Assigned by school" });
}

export async function removeSchoolMentorStudent(mentorId: string, assignmentId: string) {
  const detail = await getSchoolMentor(mentorId);
  const assignment = detail.mentor.assignments.find((item) => item.id === assignmentId);
  if (!assignment) throw new SchoolMentorError("This student assignment is unavailable.");
  await revokeMentorAssignment(assignmentId, "Removed by school");
}

export async function activateSchoolMentorAccount(input: { reference?: string; token?: string; password: unknown; confirmation: unknown }) {
  const passwordError = validatePassword(input.password, input.confirmation);
  if (!input.reference || !input.token || passwordError) return { ok: false as const, message: passwordError ?? "This mentor invitation is unavailable." };
  const reference = input.reference;
  const token = input.token;
  const password = await hashPassword(String(input.password));
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`mentor-activation:${reference}`}))`;
    const now = new Date();
    const challenge = await tx.passwordResetChallenge.findUnique({
      where: { reference },
      include: {
        user: {
          include: {
            publisher: { select: { active: true } },
            mentor: { select: { active: true, publisherId: true } },
            staffMemberships: { where: { active: true, status: SchoolStaffMembershipStatus.ACTIVE }, select: { id: true } },
          },
        },
      },
    });
    const actualTokenHash = hashSecurityValue("password-reset-completion", reference, token);
    if (!challenge || challenge.consumedAt || challenge.revokedAt || !challenge.completionTokenHash || !challenge.completionExpiresAt || challenge.completionExpiresAt <= now || challenge.user.role !== UserRole.MENTOR || !challenge.user.mentor?.active || challenge.user.mentor.publisherId !== challenge.user.publisherId || !challenge.user.publisher?.active || challenge.user.staffMemberships.length === 0 || !securelyMatchesHash(challenge.completionTokenHash, actualTokenHash)) {
      return { ok: false as const, message: "This mentor invitation is invalid or has expired. Ask your school to send a new invitation." };
    }
    const activeMembership = await tx.schoolStaffMembership.findFirst({
      where: { userId: challenge.userId, active: true, status: SchoolStaffMembershipStatus.ACTIVE },
      select: { schoolId: true },
      orderBy: { joinedAt: "desc" },
    });
    if (!activeMembership) return { ok: false as const, message: "This mentor invitation is invalid or has expired. Ask your school to send a new invitation." };
    const schoolSubscription = await tx.schoolAccessSubscription.findUnique({ where: { schoolId: activeMembership.schoolId }, select: { featureConfig: true } });
    if (!isSchoolFeatureEnabled(schoolSubscription, "MENTOR_PORTAL")) return { ok: false as const, message: "This mentor invitation is invalid or has expired. Ask your school to send a new invitation." };
    const permissions = mentorPermissionsFor(await tx.schoolPortalPermission.findUnique({ where: { schoolId: activeMembership.schoolId } }));
    if (!permissions.mentorActivationAllowed) return { ok: false as const, message: "Mentor account activation is disabled by this school." };
    await tx.user.update({ where: { id: challenge.userId }, data: { password, emailVerifiedAt: now, mustChangePassword: false, active: true } });
    await tx.passwordResetChallenge.update({ where: { id: challenge.id }, data: { consumedAt: now, completionTokenHash: null, completionExpiresAt: null } });
    await tx.passwordResetChallenge.updateMany({ where: { userId: challenge.userId, id: { not: challenge.id }, consumedAt: null, revokedAt: null }, data: { revokedAt: now } });
    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor({ id: challenge.user.id, role: UserRole.MENTOR, publisherId: challenge.user.publisherId }),
      action: "account.password_reset.complete",
      targetType: "User",
      targetId: challenge.user.id,
      outcome: SecurityAuditOutcome.SUCCESS,
    });
    return { ok: true as const, message: "Your mentor account is ready. Sign in with your email and new password." };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export type SchoolMentorAssignment = MentorStudentAssignment;
