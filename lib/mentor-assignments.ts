import "server-only";

import { MentorAssignmentSource, MentorAssignmentStatus, MentorAssignmentRole, PlatformFeatureKey, Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { getEffectiveStudentPlan } from "@/lib/entitlements/student-plan";
import { assignmentKeys } from "@/lib/mentor-policy";
import { prisma } from "@/lib/prisma";
import { requirePublisherAdmin } from "@/lib/publisher-context";
import { requirePublisherFeature } from "@/lib/publisher-features";
import { requireSchool } from "@/lib/school-dashboard";

export class MentorAssignmentError extends Error {}

async function assignmentAuthority(source: MentorAssignmentSource) {
  const session = await auth();
  if (!session?.user?.id) throw new MentorAssignmentError("Mentor assignment is unavailable.");
  if (session.user.role === "ADMIN") {
    if (source !== MentorAssignmentSource.PUBLISHER && source !== MentorAssignmentSource.INDIVIDUAL_PREMIUM) throw new MentorAssignmentError("This assignment source is unavailable.");
    const { publisher } = await requirePublisherAdmin();
    return { actorUserId: session.user.id, publisherId: publisher.id, schoolId: null as string | null };
  }
  if (session.user.role === "SCHOOL") {
    if (source !== MentorAssignmentSource.SCHOOL) throw new MentorAssignmentError("This assignment source is unavailable.");
    const school = await requireSchool();
    if (!school.publisherId) throw new MentorAssignmentError("Mentor assignment is unavailable.");
    return { actorUserId: session.user.id, publisherId: school.publisherId, schoolId: school.id };
  }
  throw new MentorAssignmentError("Mentor assignment is unavailable.");
}

export async function assignPrimaryMentor(input: { mentorId: string; studentId: string; source: MentorAssignmentSource; reason?: string }) {
  if (input.source === MentorAssignmentSource.FUTURE_PARENT_REQUEST) throw new MentorAssignmentError("Parent mentor requests are not available yet.");
  const authority = await assignmentAuthority(input.source);
  await requirePublisherFeature(authority.publisherId, PlatformFeatureKey.TUTOR_PLATFORM);
  const [mentor, student] = await Promise.all([
    prisma.mentor.findFirst({ where: { id: input.mentorId, publisherId: authority.publisherId, active: true }, select: { id: true } }),
    prisma.student.findFirst({ where: { id: input.studentId, active: true, school: { publisherId: authority.publisherId, ...(authority.schoolId ? { id: authority.schoolId } : {}) } }, select: { id: true, schoolId: true } }),
  ]);
  if (!mentor || !student) throw new MentorAssignmentError("The mentor or student is unavailable.");
  const enrollment = await prisma.studentEnrollment.findFirst({ where: { studentId: student.id, schoolId: student.schoolId, status: "ACTIVE", academicYear: { current: true, active: true }, schoolClass: { active: true }, section: { active: true } }, select: { academicYearId: true } });
  if (!enrollment || (await getEffectiveStudentPlan(student.id, enrollment.academicYearId)).plan !== "INDIVIDUAL_PREMIUM_MENTOR") throw new MentorAssignmentError("This student does not have an active Mentor plan.");
  const keys = assignmentKeys(student.id, enrollment.academicYearId, mentor.id, MentorAssignmentRole.PRIMARY);
  const reason = input.reason?.trim().slice(0, 500) || null;
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`mentor-primary:${student.id}:${enrollment.academicYearId}`}))`;
    const now = new Date();
    await tx.mentorStudentAssignment.updateMany({ where: { studentId: student.id, academicYearId: enrollment.academicYearId, status: MentorAssignmentStatus.ACTIVE, role: MentorAssignmentRole.PRIMARY }, data: { status: MentorAssignmentStatus.ENDED, endsAt: now, revokedAt: now, revokedById: authority.actorUserId, activeKey: null, activePrimaryKey: null, reason } });
    return tx.mentorStudentAssignment.create({ data: { mentorId: mentor.id, studentId: student.id, publisherId: authority.publisherId, schoolId: student.schoolId, academicYearId: enrollment.academicYearId, source: input.source, role: MentorAssignmentRole.PRIMARY, activeKey: keys.activeKey, activePrimaryKey: keys.activePrimaryKey, assignedById: authority.actorUserId, reason } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function revokeMentorAssignment(assignmentId: string, reasonInput: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new MentorAssignmentError("Mentor assignment is unavailable.");
  const reason = typeof reasonInput === "string" ? reasonInput.trim().replace(/\s+/g, " ") : "";
  if (reason.length < 5 || reason.length > 500) throw new MentorAssignmentError("Provide a short revocation reason.");
  const assignment = await prisma.mentorStudentAssignment.findUnique({ where: { id: assignmentId }, select: { publisherId: true, schoolId: true, status: true } });
  if (!assignment || assignment.status !== MentorAssignmentStatus.ACTIVE) throw new MentorAssignmentError("This assignment is unavailable.");
  if (session.user.role === "ADMIN") {
    const { publisher } = await requirePublisherAdmin();
    if (publisher.id !== assignment.publisherId) throw new MentorAssignmentError("This assignment is unavailable.");
  } else if (session.user.role === "SCHOOL") {
    const school = await requireSchool();
    if (school.id !== assignment.schoolId || school.publisherId !== assignment.publisherId) throw new MentorAssignmentError("This assignment is unavailable.");
  } else throw new MentorAssignmentError("This assignment is unavailable.");
  await prisma.mentorStudentAssignment.update({ where: { id: assignmentId }, data: { status: MentorAssignmentStatus.REVOKED, activeKey: null, activePrimaryKey: null, endsAt: new Date(), revokedAt: new Date(), revokedById: session.user.id, reason } });
}
