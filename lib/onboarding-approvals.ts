import "server-only";

import { SchoolAccessStatus, SchoolOnboardingStatus, SchoolStaffMembershipStatus, SecurityAuditOutcome, TeacherOnboardingStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePublisherAdmin } from "@/lib/publisher-context";
import { requireSchool } from "@/lib/school-dashboard";
import { cleanText } from "./onboarding-policy";
import { generateActivationCode, activationCodeHash, OnboardingError } from "./onboarding";
import { sendOnboardingNoticeBestEffort } from "./onboarding-mail";
import { accountAuditActor, publisherAdminAuditActor, writeSecurityAuditEvent } from "./security-audit";
import { syncSchoolAccessLifecycle } from "./school-access";

export async function getPublisherSchoolRequests() {
  const { publisher } = await requirePublisherAdmin();
  return prisma.school.findMany({ where: { publisherId: publisher.id, status: SchoolOnboardingStatus.PENDING }, include: { user: { select: { name: true, email: true, phone: true } }, onboardingReviews: { orderBy: { createdAt: "desc" }, take: 1, select: { reason: true, createdAt: true } } }, orderBy: { schoolName: "asc" }, take: 200 });
}

export async function reviewSchoolRequest(input: { schoolId: string; status: string; reason?: unknown }) {
  const { actor, user, publisher } = await requirePublisherAdmin();
  if (![SchoolOnboardingStatus.APPROVED, SchoolOnboardingStatus.REJECTED, SchoolOnboardingStatus.SUSPENDED].includes(input.status as never)) throw new OnboardingError("This review action is unavailable.");
  const status = input.status as SchoolOnboardingStatus, reason = cleanText(input.reason, 500) || null;
  if (status !== SchoolOnboardingStatus.APPROVED && (!reason || reason.length < 5)) throw new OnboardingError("Provide a short reason.");
  const result = await prisma.$transaction(async (tx) => {
    const school = await tx.school.findFirst({ where: { id: input.schoolId, publisherId: publisher.id }, include: { user: { select: { email: true } } } });
    if (!school || school.status === status) throw new OnboardingError("This request changed before review.");
    const updated = await tx.school.updateMany({ where: { id: school.id, publisherId: publisher.id }, data: { status } });
    if (updated.count !== 1) throw new OnboardingError("This request changed before review.");
    await syncSchoolAccessLifecycle(tx, {
      schoolId: school.id,
      publisherId: publisher.id,
      status: status === SchoolOnboardingStatus.APPROVED
        ? SchoolAccessStatus.ACTIVE
        : status === SchoolOnboardingStatus.REJECTED
          ? SchoolAccessStatus.EXPIRED
          : SchoolAccessStatus.SUSPENDED,
    });
    await tx.schoolOnboardingReview.create({ data: { schoolId: school.id, publisherId: publisher.id, reviewerUserId: user.id!, fromStatus: school.status, toStatus: status, reason } });
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor), action: "publisher.school.status.set",
      targetType: "School", targetId: school.id, outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { fromStatus: school.status, toStatus: status },
    });
    return school;
  });
  if (!result.user.email) throw new OnboardingError("This school account has no email address for notification.");
  await sendOnboardingNoticeBestEffort({ to: result.user.email, subject: `School account ${status.toLowerCase()}`, text: status === SchoolOnboardingStatus.APPROVED ? "Your school account has been approved. You may now sign in." : `Your school account status is now ${status.toLowerCase()}.` });
}

export async function getSchoolTeacherRequests() {
  const school = await requireSchool();
  return prisma.teacherSchoolRequest.findMany({ where: { schoolId: school.id }, include: { teacher: { include: { user: { select: { name: true, email: true, phone: true } } } } }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200 });
}

export async function reviewTeacherRequest(input: { requestId: string; status: string; reason?: unknown }) {
  const school = await requireSchool();
  if (![TeacherOnboardingStatus.APPROVED, TeacherOnboardingStatus.REJECTED, TeacherOnboardingStatus.SUSPENDED].includes(input.status as never)) throw new OnboardingError("This review action is unavailable.");
  const status = input.status as TeacherOnboardingStatus, reason = cleanText(input.reason, 500) || null;
  if (status !== TeacherOnboardingStatus.APPROVED && (!reason || reason.length < 5)) throw new OnboardingError("Provide a short reason.");
  const request = await prisma.$transaction(async (tx) => {
    const current = await tx.teacherSchoolRequest.findFirst({ where: { id: input.requestId, schoolId: school.id, publisherId: school.publisherId! }, include: { teacher: { include: { user: { select: { email: true } } } } } });
    if (!current || current.status === status) throw new OnboardingError("This request changed before review.");
    const approved = status === TeacherOnboardingStatus.APPROVED;
    await tx.teacherSchoolRequest.update({ where: { id: current.id }, data: { status, activeKey: approved ? `${current.teacherId}:${school.id}` : null, reviewedById: school.userId, reviewedAt: new Date(), reason } });
    if (approved) {
      const now = new Date();
      await tx.schoolStaffMembership.updateMany({
        where: { teacherId: current.teacherId, active: true },
        data: { active: false, activeKey: null, status: SchoolStaffMembershipStatus.LEFT, leftAt: now },
      });
      await tx.teacherAssignment.updateMany({
        where: { teacherId: current.teacherId, active: true },
        data: { active: false, endedAt: now },
      });
      await tx.teacher.update({ where: { id: current.teacherId }, data: { schoolId: school.id, schoolName: school.schoolName, verified: true, active: true, status: TeacherOnboardingStatus.APPROVED } });
      await tx.schoolStaffMembership.create({
        data: {
          schoolId: school.id,
          userId: current.teacher.userId,
          teacherId: current.teacherId,
          role: "TEACHER",
          status: SchoolStaffMembershipStatus.ACTIVE,
          active: true,
          activeKey: `${school.id}:${current.teacher.userId}`,
          joinedAt: now,
        },
      });
    } else if (status === TeacherOnboardingStatus.SUSPENDED) {
      const now = new Date();
      await tx.schoolStaffMembership.updateMany({
        where: { teacherId: current.teacherId, schoolId: school.id, active: true },
        data: { active: false, activeKey: null, status: SchoolStaffMembershipStatus.SUSPENDED, leftAt: now },
      });
      await tx.teacherAssignment.updateMany({ where: { teacherId: current.teacherId, schoolId: school.id, active: true }, data: { active: false, endedAt: now } });
    }
    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor({ id: school.userId, role: UserRole.SCHOOL, publisherId: school.publisherId }),
      action: "publisher.teacher.status.set", targetType: "Teacher", targetId: current.teacherId,
      outcome: SecurityAuditOutcome.SUCCESS, metadata: { fromStatus: current.status, toStatus: status },
    });
    return current;
  });
  if (!request.teacher.user.email) throw new OnboardingError("This teacher account has no email address for notification.");
  await sendOnboardingNoticeBestEffort({ to: request.teacher.user.email, subject: `Teacher account ${status.toLowerCase()}`, text: status === TeacherOnboardingStatus.APPROVED ? "Your teacher association has been approved. You may now sign in." : `Your teacher account status is now ${status.toLowerCase()}.` });
}

export async function issueStudentActivationCode(studentId: string) {
  const school = await requireSchool();
  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId: school.id, active: true, userId: null }, select: { id: true } });
  if (!student) throw new OnboardingError("This student is not eligible for account activation.");
  const code = generateActivationCode(), now = new Date(), expiresAt = new Date(now.getTime() + 7 * 86_400_000);
  await prisma.$transaction(async (tx) => {
    await tx.studentActivationCode.updateMany({ where: { studentId: student.id, schoolId: school.id, usedAt: null, revokedAt: null }, data: { revokedAt: now } });
    await tx.studentActivationCode.create({ data: { studentId: student.id, schoolId: school.id, codeHash: activationCodeHash(code), expiresAt, createdById: school.userId } });
  });
  return { code, expiresAt };
}
