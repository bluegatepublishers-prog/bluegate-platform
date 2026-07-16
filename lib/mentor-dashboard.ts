import "server-only";

import { MentorActivityType, MentorNoteType, PlatformFeatureKey, RemedialPlanStatus } from "@prisma/client";
import { auth } from "@/auth";
import { getEffectiveStudentPlan } from "@/lib/entitlements/student-plan";
import { prisma } from "@/lib/prisma";
import { isPublisherFeatureEnabled, requirePublisherFeature } from "@/lib/publisher-features";
import { canAccessMentorAssignment, learningTrend, validMentorNote } from "./mentor-policy";

export class MentorAccessError extends Error {}

export async function requireMentor() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "MENTOR") throw new MentorAccessError("Mentor access is unavailable.");
  const mentor = await prisma.mentor.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { id: true, name: true, email: true } }, publisher: { select: { id: true, name: true, active: true } } },
  });
  if (!mentor?.active || !mentor.publisher.active) throw new MentorAccessError("Mentor access is unavailable.");
  await requirePublisherFeature(mentor.publisherId, PlatformFeatureKey.TUTOR_PLATFORM);
  return mentor;
}

async function loadOwnedAssignment(studentId: string) {
  const mentor = await requireMentor();
  const assignment = await prisma.mentorStudentAssignment.findFirst({
    where: { mentorId: mentor.id, studentId, status: "ACTIVE", academicYear: { active: true, current: true } },
    include: {
      student: { select: { id: true, name: true, admissionNumber: true, schoolId: true, active: true, school: { select: { schoolName: true, publisherId: true } } } },
      academicYear: { select: { id: true, name: true, active: true, current: true } },
    },
    orderBy: { startsAt: "desc" },
  });
  if (!assignment?.student.active || !assignment.academicYear.active || !assignment.academicYear.current) throw new MentorAccessError("This student is unavailable.");
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
  return { mentor, assignment, enrollment, plan: effectivePlan.plan };
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
  return { mentor, assignments, openGaps, activeRemedials, recentActivity, upcomingSessions, unreadNotes: 0 };
}

export async function getAssignedStudents() {
  const dashboard = await getMentorDashboard();
  return dashboard.assignments.map(({ assignment, enrollment }) => ({ id: assignment.student.id, name: assignment.student.name, admissionNumber: assignment.student.admissionNumber, school: assignment.student.school.schoolName, academicYear: assignment.academicYear.name, className: enrollment.schoolClass.name, sectionName: enrollment.section.name, role: assignment.role, source: assignment.source }));
}

export async function getMentorStudentProfile(studentId: string) {
  const scope = await loadOwnedAssignment(studentId);
  const where = { studentId, academicYearId: scope.assignment.academicYearId };
  const [analytics, subjects, chapters, timeline, gaps, remedials, notes, sessions] = await prisma.$transaction([
    prisma.studentAnalytics.findUnique({ where: { studentId_academicYearId: where } }),
    prisma.studentSubjectAnalytics.findMany({ where, include: { subject: { select: { name: true } } }, orderBy: { completionPercent: "desc" } }),
    prisma.studentChapterAnalytics.findMany({ where, include: { book: { select: { title: true } }, chapter: { select: { title: true, chapterNumber: true } } }, orderBy: { lastActivityAt: "desc" }, take: 30 }),
    prisma.learningTimeline.findMany({ where, select: { id: true, title: true, activityType: true, completed: true, scorePercent: true, occurredAt: true }, orderBy: { occurredAt: "desc" }, take: 40 }),
    prisma.studentLearningGap.findMany({ where: { ...where, status: { in: ["OPEN", "ACKNOWLEDGED"] } }, include: { subject: { select: { name: true } }, chapter: { select: { title: true } } }, orderBy: [{ severity: "desc" }, { lastDetectedAt: "desc" }] }),
    prisma.remedialPlan.findMany({ where: { ...where, status: { in: ["ACTIVE", "COMPLETED"] } }, include: { gap: { include: { subject: { select: { name: true } }, chapter: { select: { title: true } } } }, steps: { select: { status: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.mentorNote.findMany({ where: { assignmentId: scope.assignment.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.mentorSession.findMany({ where: { assignmentId: scope.assignment.id }, orderBy: { scheduledAt: "desc" }, take: 30 }),
  ]);
  return { ...scope, analytics, subjects, chapters, timeline, gaps, remedials, notes, sessions };
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

export async function recordMentorRemedialReview(input: { studentId: string; planId: string; action: "REVIEW" | "RECOMMEND_COMPLETION" }) {
  const scope = await loadOwnedAssignment(input.studentId);
  await requirePublisherFeature(scope.assignment.publisherId, PlatformFeatureKey.REMEDIALS);
  const plan = await prisma.remedialPlan.findFirst({ where: { id: input.planId, studentId: input.studentId, academicYearId: scope.assignment.academicYearId, publisherId: scope.assignment.publisherId, schoolId: scope.assignment.schoolId, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { id: true } });
  if (!plan) throw new MentorAccessError("This learning path is unavailable.");
  await prisma.mentorActivity.create({ data: { assignmentId: scope.assignment.id, mentorId: scope.mentor.id, studentId: scope.assignment.studentId, publisherId: scope.assignment.publisherId, schoolId: scope.assignment.schoolId, academicYearId: scope.assignment.academicYearId, actorUserId: scope.mentor.userId, type: input.action === "REVIEW" ? MentorActivityType.REMEDIAL_REVIEWED : MentorActivityType.REMEDIAL_COMPLETION_RECOMMENDED, targetType: "REMEDIAL_PLAN", targetId: plan.id } });
}

export async function launchMentorStudentAi(studentId: string) {
  const scope = await loadOwnedAssignment(studentId);
  await requirePublisherFeature(scope.assignment.publisherId, PlatformFeatureKey.STUDENT_AI);
  await prisma.mentorActivity.create({ data: { assignmentId: scope.assignment.id, mentorId: scope.mentor.id, studentId: scope.assignment.studentId, publisherId: scope.assignment.publisherId, schoolId: scope.assignment.schoolId, academicYearId: scope.assignment.academicYearId, actorUserId: scope.mentor.userId, type: MentorActivityType.STUDENT_AI_LAUNCHED, targetType: "STUDENT_AI_HANDOFF" } });
  return { launched: true as const };
}

export async function getMentorReport() {
  const students = await getAssignedStudents();
  const rows = await Promise.all(students.map(async (student) => {
    const profile = await getMentorStudentProfile(student.id);
    return { ...student, openGaps: profile.gaps.length, completedRemedials: profile.remedials.filter((row) => row.status === "COMPLETED").length, trend: learningTrend(profile.analytics?.readingPercent ?? null, profile.analytics?.averagePractice ?? null, profile.analytics?.averageAssessment ?? null), studyConsistency: profile.analytics ? `${profile.analytics.currentStreak} day current · ${profile.analytics.longestStreak} day longest` : "No activity yet" };
  }));
  return { studentsAssigned: rows.length, completedRemedials: rows.reduce((sum, row) => sum + row.completedRemedials, 0), openGaps: rows.reduce((sum, row) => sum + row.openGaps, 0), rows };
}
