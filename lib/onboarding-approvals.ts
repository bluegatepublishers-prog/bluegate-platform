import "server-only";

import { SchoolOnboardingStatus, TeacherOnboardingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePublisherAdmin } from "@/lib/publisher-context";
import { requireSchool } from "@/lib/school-dashboard";
import { cleanText } from "./onboarding-policy";
import { generateActivationCode, activationCodeHash, OnboardingError } from "./onboarding";
import { sendOnboardingNoticeBestEffort } from "./onboarding-mail";

export async function getPublisherSchoolRequests() {
  const { publisher } = await requirePublisherAdmin();
  return prisma.school.findMany({ where: { publisherId: publisher.id }, include: { user: { select: { name: true, email: true, phone: true } }, onboardingReviews: { orderBy: { createdAt: "desc" }, take: 1, select: { reason: true, createdAt: true } } }, orderBy: [{ status: "asc" }, { schoolName: "asc" }], take: 200 });
}

export async function reviewSchoolRequest(input: { schoolId: string; status: string; reason?: unknown }) {
  const { user, publisher } = await requirePublisherAdmin();
  if (![SchoolOnboardingStatus.APPROVED, SchoolOnboardingStatus.REJECTED, SchoolOnboardingStatus.SUSPENDED].includes(input.status as never)) throw new OnboardingError("This review action is unavailable.");
  const status = input.status as SchoolOnboardingStatus, reason = cleanText(input.reason, 500) || null;
  if (status !== SchoolOnboardingStatus.APPROVED && (!reason || reason.length < 5)) throw new OnboardingError("Provide a short reason.");
  const result = await prisma.$transaction(async (tx) => {
    const school = await tx.school.findFirst({ where: { id: input.schoolId, publisherId: publisher.id }, include: { user: { select: { email: true } } } });
    if (!school || school.status === status) throw new OnboardingError("This request changed before review.");
    await tx.school.update({ where: { id: school.id }, data: { status } });
    await tx.schoolOnboardingReview.create({ data: { schoolId: school.id, publisherId: publisher.id, reviewerUserId: user.id!, fromStatus: school.status, toStatus: status, reason } });
    if (status === SchoolOnboardingStatus.SUSPENDED) await tx.teacher.updateMany({ where: { schoolId: school.id }, data: { active: false, status: TeacherOnboardingStatus.SUSPENDED } });
    return school;
  });
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
    await tx.teacher.update({ where: { id: current.teacherId }, data: { schoolId: approved ? school.id : current.teacher.schoolId, schoolName: school.schoolName, verified: approved, active: approved, status } });
    if (status === TeacherOnboardingStatus.SUSPENDED) await tx.teacherAssignment.updateMany({ where: { teacherId: current.teacherId, schoolId: school.id, active: true }, data: { active: false } });
    return current;
  });
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
