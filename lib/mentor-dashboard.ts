import "server-only";

import { MentorActivityType, MentorNoteType, PlatformFeatureKey, RemedialPlanStatus } from "@prisma/client";
import { auth } from "@/auth";
import { getEffectiveStudentPlan } from "@/lib/entitlements/student-plan";
import {
  assertMentorSurfacePermission,
  getMentorPortalLoginReadinessForUserId,
  mentorPermissionsFor,
  type MentorPortalSurface,
} from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import { isPublisherFeatureEnabled, requirePublisherFeature } from "@/lib/publisher-features";
import { effectiveSchoolAccessStatus } from "@/lib/school-access-policy";
import { isSchoolFeatureEnabled } from "@/lib/school-feature-entitlements";
import { canAccessMentorAssignment, learningTrend, validMentorNote } from "./mentor-policy";

export class MentorAccessError extends Error {}

function hasActiveMentorSchoolAccess(subscription: { plan: "FREE" | "PAID"; status: "ACTIVE" | "SUSPENDED" | "EXPIRED"; startsAt: Date | null; expiresAt: Date | null } | null | undefined) {
  if (!subscription) return false;
  if (subscription.plan !== "PAID") return false;
  return effectiveSchoolAccessStatus(subscription) === "ACTIVE";
}

export async function requireMentor() {
  const session = await auth();
  const readiness = await getMentorPortalLoginReadinessForUserId(session?.user?.id);
  if (!readiness.ok) throw new MentorAccessError(readiness.message);
  const mentor = await prisma.mentor.findUnique({
    where: { id: readiness.actor.mentor.id },
    include: { user: { select: { id: true, name: true, email: true, phone: true, active: true, publisherId: true } }, publisher: { select: { id: true, name: true, active: true } } },
  });
  if (!mentor) throw new MentorAccessError("Mentor access is unavailable.");
  await requirePublisherFeature(mentor.publisherId, PlatformFeatureKey.TUTOR_PLATFORM);
  return { ...mentor, permissions: readiness.permissions };
}

async function loadOwnedAssignment(studentId: string, options?: { surface?: MentorPortalSurface }) {
  const mentor = await requireMentor();
  const assignment = await prisma.mentorStudentAssignment.findFirst({
    where: { mentorId: mentor.id, studentId, status: "ACTIVE", academicYear: { active: true, current: true } },
    include: {
      student: { select: { id: true, name: true, admissionNumber: true, schoolId: true, active: true, school: { select: { id: true, schoolName: true, status: true, publisherId: true, publisher: { select: { active: true } }, accessSubscription: { select: { plan: true, status: true, startsAt: true, expiresAt: true, featureConfig: true } }, portalPermissions: true } } } },
      academicYear: { select: { id: true, name: true, active: true, current: true } },
    },
    orderBy: { startsAt: "desc" },
  });
  if (!assignment?.student.active || !assignment.academicYear.active || !assignment.academicYear.current) throw new MentorAccessError("This student is unavailable.");
  if (assignment.student.school.status !== "APPROVED" || !assignment.student.school.publisher?.active || !hasActiveMentorSchoolAccess(assignment.student.school.accessSubscription) || !isSchoolFeatureEnabled(assignment.student.school.accessSubscription, "MENTOR_PORTAL")) throw new MentorAccessError("This student is unavailable.");
  const permissions = mentorPermissionsFor(assignment.student.school.portalPermissions);
  if (!permissions.mentorLoginEnabled) throw new MentorAccessError("Mentor login is disabled by this school.");
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId, schoolId: assignment.schoolId, academicYearId: assignment.academicYearId, status: "ACTIVE", schoolClass: { active: true }, section: { active: true } },
    include: { schoolClass: { select: { name: true } }, section: { select: { name: true } } },
  });
  if (!enrollment) throw new MentorAccessError("This student is unavailable.");
  const [effectivePlan, featureEnabled] = await Promise.all([
    getEffectiveStudentPlan(studentId, assignment.academicYearId),
    isPublisherFeatureEnabled(mentor.publisherId, PlatformFeatureKey.TUTOR_PLATFORM),
  ]);
  if (!canAccessMentorAssignment({ status: assignment.status, startsAt: assignment.startsAt, endsAt: assignment.endsAt, assignmentPublisherId: assignment.publisherId, mentorPublisherId: mentor.publisherId, schoolPublisherId: assignment.student.school.publisherId, assignmentSchoolId: assignment.schoolId, studentSchoolId: assignment.student.schoolId, assignmentAcademicYearId: assignment.academicYearId, enrollmentAcademicYearId: enrollment.academicYearId, plan: effectivePlan.plan, mentorActive: mentor.active, publisherActive: mentor.publisher.active, mentorFeatureEnabled: featureEnabled })) throw new MentorAccessError("This student is unavailable.");
  if (options?.surface) {
    const decision = assertMentorSurfacePermission({ ok: true, category: "READY", actor: { user: mentor.user, mentor: { id: mentor.id, userId: mentor.userId, publisherId: mentor.publisherId, active: mentor.active, type: mentor.type } }, permissions, schoolId: assignment.schoolId, publisherId: assignment.publisherId }, options.surface);
    if (!decision.ok) throw new MentorAccessError(decision.message);
  }
  return { mentor, assignment, enrollment, plan: effectivePlan.plan, permissions };
}

export async function getMentorStudentScope(studentId: string, options?: { surface?: MentorPortalSurface }) {
  return loadOwnedAssignment(studentId, options);
}

export async function getMentorDashboard() {
  const mentor = await requireMentor();
  const candidates = await prisma.mentorStudentAssignment.findMany({ where: { mentorId: mentor.id, status: "ACTIVE", academicYear: { active: true, current: true } }, select: { studentId: true }, take: 200 });
  const assignments = [];
  for (const candidate of candidates) {
    try { assignments.push(await loadOwnedAssignment(candidate.studentId)); } catch (error) { if (!(error instanceof MentorAccessError)) throw error; }
  }
  const assignedScopes = assignments.map((row) => ({ studentId: row.assignment.studentId, academicYearId: row.assignment.academicYearId }));
  const assignmentIds = assignments.map((row) => row.assignment.id);
  const [openGaps, activeRemedials, recentActivity, upcomingSessions] = assignmentIds.length ? await Promise.all([
    prisma.studentLearningGap.count({ where: { OR: assignedScopes, status: { in: ["OPEN", "ACKNOWLEDGED"] } } }),
    prisma.remedialPlan.count({ where: { OR: assignedScopes, status: RemedialPlanStatus.ACTIVE } }),
    prisma.mentorActivity.findMany({ where: { mentorId: mentor.id, assignmentId: { in: assignmentIds } }, include: { student: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.mentorSession.findMany({ where: { mentorId: mentor.id, assignmentId: { in: assignmentIds }, status: "SCHEDULED", scheduledAt: { gte: new Date() } }, include: { student: { select: { name: true } } }, orderBy: { scheduledAt: "asc" }, take: 8 }),
  ]) : [0, 0, [], []];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [sessionsThisMonth, recentNotes] = assignmentIds.length ? await Promise.all([
    prisma.mentorSession.count({ where: { mentorId: mentor.id, assignmentId: { in: assignmentIds }, scheduledAt: { gte: monthStart, lt: monthEnd } } }),
    prisma.mentorNote.findMany({ where: { mentorId: mentor.id, assignmentId: { in: assignmentIds } }, orderBy: { createdAt: "desc" }, take: 8, include: { student: { select: { name: true } } } }),
  ]) : [0, []];
  return { mentor, permissions: mentor.permissions, assignments, openGaps, activeRemedials, recentActivity, upcomingSessions, unreadNotes: 0, sessionsThisMonth, recentNotes };
}

export async function getAssignedStudents() {
  const mentor = await requireMentor();
  const assignedStudents = assertMentorSurfacePermission({ ok: true, category: "READY", actor: { user: mentor.user, mentor: { id: mentor.id, userId: mentor.userId, publisherId: mentor.publisherId, active: mentor.active, type: mentor.type } }, permissions: mentor.permissions, schoolId: "", publisherId: mentor.publisherId }, "ASSIGNED_STUDENTS");
  if (!assignedStudents.ok) throw new MentorAccessError(assignedStudents.message);
  const dashboard = await getMentorDashboard();
  return dashboard.assignments.map(({ assignment, enrollment }) => ({ id: assignment.student.id, name: assignment.student.name, admissionNumber: assignment.student.admissionNumber, school: assignment.student.school.schoolName, academicYear: assignment.academicYear.name, className: enrollment.schoolClass.name, sectionName: enrollment.section.name, role: assignment.role, source: assignment.source }));
}

export async function getMentorStudentProfile(studentId: string) {
  const scope = await loadOwnedAssignment(studentId, { surface: "ACADEMIC_PROGRESS" });
  const where = { studentId, academicYearId: scope.assignment.academicYearId };
  const [analytics, subjects, chapters, timeline, gaps, remedials, notes, sessions, assignments, assessments, latestReportCard] = await prisma.$transaction([
    prisma.studentAnalytics.findUnique({ where: { studentId_academicYearId: where } }),
    prisma.studentSubjectAnalytics.findMany({ where, include: { subject: { select: { name: true } } }, orderBy: { completionPercent: "desc" } }),
    prisma.studentChapterAnalytics.findMany({ where, include: { book: { select: { title: true } }, chapter: { select: { title: true, chapterNumber: true } } }, orderBy: { lastActivityAt: "desc" }, take: 30 }),
    prisma.learningTimeline.findMany({ where, select: { id: true, title: true, activityType: true, completed: true, scorePercent: true, occurredAt: true }, orderBy: { occurredAt: "desc" }, take: 40 }),
    prisma.studentLearningGap.findMany({ where: { ...where, status: { in: ["OPEN", "ACKNOWLEDGED"] } }, include: { subject: { select: { name: true } }, chapter: { select: { title: true } } }, orderBy: [{ severity: "desc" }, { lastDetectedAt: "desc" }] }),
    prisma.remedialPlan.findMany({ where: { ...where, status: { in: ["ACTIVE", "COMPLETED"] } }, include: { gap: { include: { subject: { select: { name: true } }, chapter: { select: { title: true } } } }, steps: { select: { status: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.mentorNote.findMany({ where: { assignmentId: scope.assignment.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.mentorSession.findMany({ where: { assignmentId: scope.assignment.id }, orderBy: { scheduledAt: "desc" }, take: 30 }),
    prisma.classroomAssignment.findMany({ where: { sectionId: scope.enrollment.sectionId, academicYearId: scope.assignment.academicYearId, status: { in: ["PUBLISHED", "CLOSED"] } }, include: { subject: { select: { name: true } }, submissions: { where: { studentId }, orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { dueAt: "desc" }, take: 50 }),
    prisma.assessment.findMany({ where: { sectionId: scope.enrollment.sectionId, academicYearId: scope.assignment.academicYearId, status: { in: ["PUBLISHED", "CLOSED"] } }, include: { sectionSubject: { include: { subject: { select: { name: true } } } }, settings: true, attempts: { where: { studentId }, include: { result: true }, orderBy: { submittedAt: "desc" }, take: 2 } }, orderBy: { dueAt: "desc" }, take: 40 }),
    prisma.reportCardSnapshot.findFirst({ where: { studentId, schoolId: scope.assignment.schoolId, academicYearId: scope.assignment.academicYearId }, orderBy: { issuedAt: "desc" } }),
  ]);
  return { ...scope, analytics, subjects, chapters, timeline, gaps, remedials, notes, sessions, assignments, assessments, latestReportCard };
}

export async function createMentorNote(input: { studentId: string; type: string; body: unknown }) {
  const scope = await loadOwnedAssignment(input.studentId);
  if (!Object.values(MentorNoteType).includes(input.type as MentorNoteType)) throw new MentorAccessError("Choose a valid note type.");
  const body = validMentorNote(input.body);
  if (!body) throw new MentorAccessError("Write a note between 5 and 2,000 characters.");
  await prisma.$transaction(async (tx) => {
    const note = await tx.mentorNote.create({ data: { assignmentId: scope.assignment.id, mentorId: scope.mentor.id, studentId: scope.assignment.studentId, publisherId: scope.assignment.publisherId, schoolId: scope.assignment.schoolId, academicYearId: scope.assignment.academicYearId, type: input.type as MentorNoteType, body } });
    await tx.mentorActivity.create({ data: { assignmentId: scope.assignment.id, mentorId: scope.mentor.id, studentId: scope.assignment.studentId, publisherId: scope.assignment.publisherId, schoolId: scope.assignment.schoolId, academicYearId: scope.assignment.academicYearId, actorUserId: scope.mentor.userId, type: MentorActivityType.NOTE_CREATED, targetType: "MENTOR_NOTE", targetId: note.id } });
  });
}

export async function scheduleMentorSession(input: { studentId: string; scheduledAt: Date; durationMinutes?: number; topic?: string }) {
  const scope = await loadOwnedAssignment(input.studentId);
  if (Number.isNaN(input.scheduledAt.getTime()) || input.scheduledAt <= new Date()) throw new MentorAccessError("Choose a future date and time for this session.");
  if (input.durationMinutes != null && (input.durationMinutes < 10 || input.durationMinutes > 240)) throw new MentorAccessError("Session duration must be between 10 and 240 minutes.");
  const topic = (input.topic ?? "Mentor session").trim().slice(0, 160) || "Mentor session";
  return prisma.mentorSession.create({ data: { assignmentId: scope.assignment.id, mentorId: scope.mentor.id, studentId: scope.assignment.studentId, publisherId: scope.assignment.publisherId, schoolId: scope.assignment.schoolId, academicYearId: scope.assignment.academicYearId, status: "SCHEDULED", scheduledAt: input.scheduledAt, durationMinutes: input.durationMinutes ?? 45, topic, createdById: scope.mentor.userId } });
}

export async function completeMentorSession(input: { studentId: string; sessionId: string; summary?: string }) {
  const scope = await loadOwnedAssignment(input.studentId);
  const session = await prisma.mentorSession.findFirst({ where: { id: input.sessionId, assignmentId: scope.assignment.id, mentorId: scope.mentor.id } });
  if (!session) throw new MentorAccessError("Session is unavailable.");
  if (session.status !== "SCHEDULED") throw new MentorAccessError("Only upcoming sessions can be marked complete.");
  await prisma.$transaction(async (tx) => {
    await tx.mentorSession.update({ where: { id: session.id }, data: { status: "COMPLETED", completedAt: new Date() } });
    if (input.summary?.trim()) {
      await tx.mentorNote.create({ data: { assignmentId: scope.assignment.id, mentorId: scope.mentor.id, studentId: scope.assignment.studentId, publisherId: scope.assignment.publisherId, schoolId: scope.assignment.schoolId, academicYearId: scope.assignment.academicYearId, type: MentorNoteType.OBSERVATION, body: `Session summary (${session.scheduledAt.toLocaleDateString("en-IN")}): ${input.summary.trim().slice(0, 1800)}` } });
    }
    await tx.mentorActivity.create({ data: { assignmentId: scope.assignment.id, mentorId: scope.mentor.id, studentId: scope.assignment.studentId, publisherId: scope.assignment.publisherId, schoolId: scope.assignment.schoolId, academicYearId: scope.assignment.academicYearId, actorUserId: scope.mentor.userId, type: MentorActivityType.SESSION_STATUS_CHANGED, targetType: "MENTOR_SESSION", targetId: session.id } });
  });
}

export async function cancelMentorSession(input: { studentId: string; sessionId: string; reason: string }) {
  const scope = await loadOwnedAssignment(input.studentId);
  const session = await prisma.mentorSession.findFirst({ where: { id: input.sessionId, assignmentId: scope.assignment.id, mentorId: scope.mentor.id } });
  if (!session) throw new MentorAccessError("Session is unavailable.");
  if (session.status !== "SCHEDULED") throw new MentorAccessError("Only upcoming sessions can be cancelled.");
  const reason = input.reason.trim().replace(/\s+/g, " ");
  if (reason.length < 5 || reason.length > 500) throw new MentorAccessError("Provide a short cancellation reason.");
  await prisma.$transaction(async (tx) => {
    await tx.mentorSession.update({ where: { id: session.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    await tx.mentorNote.create({ data: { assignmentId: scope.assignment.id, mentorId: scope.mentor.id, studentId: scope.assignment.studentId, publisherId: scope.assignment.publisherId, schoolId: scope.assignment.schoolId, academicYearId: scope.assignment.academicYearId, type: MentorNoteType.PRIVATE_NOTE, body: `Cancelled session note (${session.scheduledAt.toLocaleDateString("en-IN")}): ${reason}` } });
    await tx.mentorActivity.create({ data: { assignmentId: scope.assignment.id, mentorId: scope.mentor.id, studentId: scope.assignment.studentId, publisherId: scope.assignment.publisherId, schoolId: scope.assignment.schoolId, academicYearId: scope.assignment.academicYearId, actorUserId: scope.mentor.userId, type: MentorActivityType.SESSION_STATUS_CHANGED, targetType: "MENTOR_SESSION", targetId: session.id } });
  });
}

export async function reviseMentorNote(input: { studentId: string; noteId: string; type: string; body: string }) {
  const scope = await loadOwnedAssignment(input.studentId);
  const original = await prisma.mentorNote.findFirst({ where: { id: input.noteId, mentorId: scope.mentor.id, assignmentId: scope.assignment.id } });
  if (!original) throw new MentorAccessError("Note is unavailable.");
  if (!Object.values(MentorNoteType).includes(input.type as MentorNoteType)) throw new MentorAccessError("Choose a valid note type.");
  const next = validMentorNote(input.body);
  if (!next) throw new MentorAccessError("Write a note between 5 and 2,000 characters.");
  await prisma.$transaction(async (tx) => {
    await tx.mentorNote.create({ data: { assignmentId: scope.assignment.id, mentorId: scope.mentor.id, studentId: scope.assignment.studentId, publisherId: scope.assignment.publisherId, schoolId: scope.assignment.schoolId, academicYearId: scope.assignment.academicYearId, type: input.type as MentorNoteType, body: `Revision of note ${original.id}: ${next}` } });
    await tx.mentorActivity.create({ data: { assignmentId: scope.assignment.id, mentorId: scope.mentor.id, studentId: scope.assignment.studentId, publisherId: scope.assignment.publisherId, schoolId: scope.assignment.schoolId, academicYearId: scope.assignment.academicYearId, actorUserId: scope.mentor.userId, type: MentorActivityType.NOTE_CREATED, targetType: "MENTOR_NOTE", targetId: original.id } });
  });
}

export async function updateMentorProfile(input: { name: string; email: string; phone: string }) {
  const mentor = await requireMentor();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  if (name.length < 2 || name.length > 120) throw new MentorAccessError("Provide a valid name.");
  if (!email || !email.includes("@")) throw new MentorAccessError("Provide a valid email address.");
  if (phone && phone.length > 20) throw new MentorAccessError("Provide a valid phone number.");

  const existing = await prisma.user.findFirst({ where: { email, id: { not: mentor.userId } }, select: { id: true } });
  if (existing) throw new MentorAccessError("That email is already in use.");

  await prisma.user.update({ where: { id: mentor.userId }, data: { name, email, phone: phone || null } });
}

export async function recordMentorRemedialReview(input: { studentId: string; planId: string; action: "REVIEW" | "RECOMMEND_COMPLETION" }) {
  const scope = await loadOwnedAssignment(input.studentId, { surface: "MENTOR_PLAN_CREATION" });
  await requirePublisherFeature(scope.assignment.publisherId, PlatformFeatureKey.REMEDIALS);
  const plan = await prisma.remedialPlan.findFirst({ where: { id: input.planId, studentId: input.studentId, academicYearId: scope.assignment.academicYearId, publisherId: scope.assignment.publisherId, schoolId: scope.assignment.schoolId, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { id: true } });
  if (!plan) throw new MentorAccessError("This learning path is unavailable.");
  await prisma.mentorActivity.create({ data: { assignmentId: scope.assignment.id, mentorId: scope.mentor.id, studentId: scope.assignment.studentId, publisherId: scope.assignment.publisherId, schoolId: scope.assignment.schoolId, academicYearId: scope.assignment.academicYearId, actorUserId: scope.mentor.userId, type: input.action === "REVIEW" ? MentorActivityType.REMEDIAL_REVIEWED : MentorActivityType.REMEDIAL_COMPLETION_RECOMMENDED, targetType: "REMEDIAL_PLAN", targetId: plan.id } });
}

export async function launchMentorStudentAi(studentId: string) {
  const scope = await loadOwnedAssignment(studentId, { surface: "ACADEMIC_PROGRESS" });
  await requirePublisherFeature(scope.assignment.publisherId, PlatformFeatureKey.STUDENT_AI);
  await prisma.mentorActivity.create({ data: { assignmentId: scope.assignment.id, mentorId: scope.mentor.id, studentId: scope.assignment.studentId, publisherId: scope.assignment.publisherId, schoolId: scope.assignment.schoolId, academicYearId: scope.assignment.academicYearId, actorUserId: scope.mentor.userId, type: MentorActivityType.STUDENT_AI_LAUNCHED, targetType: "STUDENT_AI_HANDOFF" } });
  return { launched: true as const };
}

export async function getMentorReport() {
  const mentor = await requireMentor();
  const progress = assertMentorSurfacePermission({ ok: true, category: "READY", actor: { user: mentor.user, mentor: { id: mentor.id, userId: mentor.userId, publisherId: mentor.publisherId, active: mentor.active, type: mentor.type } }, permissions: mentor.permissions, schoolId: "", publisherId: mentor.publisherId }, "ACADEMIC_PROGRESS");
  if (!progress.ok) throw new MentorAccessError(progress.message);
  const students = await getAssignedStudents();
  const rows = await Promise.all(students.map(async (student) => {
    const profile = await getMentorStudentProfile(student.id);
    return { ...student, openGaps: profile.gaps.length, completedRemedials: profile.remedials.filter((row) => row.status === "COMPLETED").length, trend: learningTrend(profile.analytics?.readingPercent ?? null, profile.analytics?.averagePractice ?? null, profile.analytics?.averageAssessment ?? null), studyConsistency: profile.analytics ? `${profile.analytics.currentStreak} day current · ${profile.analytics.longestStreak} day longest` : "No activity yet" };
  }));
  return { studentsAssigned: rows.length, completedRemedials: rows.reduce((sum, row) => sum + row.completedRemedials, 0), openGaps: rows.reduce((sum, row) => sum + row.openGaps, 0), rows };
}
