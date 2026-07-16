import "server-only";
import { PlatformFeatureKey } from "@prisma/client";
import { auth } from "@/auth";
import { canReleaseAssessmentResult } from "@/lib/assessment-policy";
import { getEffectiveStudentPlan } from "@/lib/entitlements/student-plan";
import { prisma } from "@/lib/prisma";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { canParentViewChild, friendlyPlan, friendlyPlanSource, parentGapMessage } from "./parent-policy";

export class ParentAccessError extends Error {}

export async function requireParent() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PARENT") throw new ParentAccessError("Parent access is unavailable.");
  const parent = await prisma.parent.findUnique({ where: { userId: session.user.id }, include: { user: { select: { id: true, name: true, email: true } } } });
  if (!parent?.active) throw new ParentAccessError("Parent access is unavailable.");
  return parent;
}

export async function requireParentChildAccess(studentId: string) {
  const parent = await requireParent();
  const relationship = await prisma.parentStudentRelationship.findFirst({
    where: { parentId: parent.id, studentId, status: "APPROVED", canViewLearning: true },
    include: { student: { include: { school: { include: { publisher: { select: { id: true, name: true, active: true } } } }, enrollments: { where: { status: "ACTIVE", academicYear: { active: true, current: true }, schoolClass: { active: true }, section: { active: true } }, include: { academicYear: true, schoolClass: true, section: true }, orderBy: { createdAt: "desc" }, take: 1 } } } },
  });
  const enrollment = relationship?.student.enrollments[0], publisher = relationship?.student.school.publisher;
  const featureEnabled = publisher ? await isPublisherFeatureEnabled(publisher.id, PlatformFeatureKey.PARENT_PORTAL) : false;
  if (!relationship || !enrollment || !publisher || !canParentViewChild({ parentActive: parent.active, studentActive: relationship.student.active, relationshipStatus: relationship.status, canViewLearning: relationship.canViewLearning, schoolApproved: relationship.student.school.status === "APPROVED", publisherActive: publisher.active, featureEnabled, relationshipStudentId: relationship.studentId, requestedStudentId: studentId })) throw new ParentAccessError("This child is unavailable.");
  return { parent, relationship, student: relationship.student, enrollment, publisher };
}

export async function getParentChildren() {
  const parent = await requireParent();
  const candidates = await prisma.parentStudentRelationship.findMany({ where: { parentId: parent.id, status: "APPROVED", canViewLearning: true }, select: { studentId: true }, orderBy: { requestedAt: "asc" }, take: 50 });
  const children = [];
  for (const row of candidates) { try { children.push(await requireParentChildAccess(row.studentId)); } catch (error) { if (!(error instanceof ParentAccessError)) throw error; } }
  return { parent, children };
}

export async function getParentChildLearningSummary(studentId: string) {
  const scope = await requireParentChildAccess(studentId), yearId = scope.enrollment.academicYearId;
  const [analytics, subjects, timeline, gaps, remedials, mentor, assessmentAttempts, aiChapters, plan] = await Promise.all([
    prisma.studentAnalytics.findUnique({ where: { studentId_academicYearId: { studentId, academicYearId: yearId } } }),
    prisma.studentSubjectAnalytics.findMany({ where: { studentId, academicYearId: yearId }, include: { subject: { select: { name: true } } }, orderBy: { completionPercent: "desc" }, take: 20 }),
    prisma.learningTimeline.findMany({ where: { studentId, academicYearId: yearId }, select: { title: true, activityType: true, completed: true, scorePercent: true, occurredAt: true }, orderBy: { occurredAt: "desc" }, take: 12 }),
    prisma.studentLearningGap.findMany({ where: { studentId, academicYearId: yearId, status: { in: ["OPEN", "ACKNOWLEDGED"] } }, include: { subject: { select: { name: true } }, chapter: { select: { title: true } } }, orderBy: { lastDetectedAt: "desc" }, take: 12 }),
    prisma.remedialPlan.findMany({ where: { studentId, academicYearId: yearId, status: { in: ["ACTIVE", "COMPLETED"] } }, include: { gap: { include: { subject: { select: { name: true } }, chapter: { select: { title: true } } } }, steps: { select: { status: true } } }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.mentorStudentAssignment.findFirst({ where: { studentId, academicYearId: yearId, status: "ACTIVE", role: "PRIMARY", mentor: { active: true } }, include: { mentor: { include: { user: { select: { name: true } }, sessions: { where: { studentId, academicYearId: yearId, status: "COMPLETED" }, select: { id: true } } } } }, orderBy: { startsAt: "desc" } }),
    prisma.assessmentAttempt.findMany({ where: { studentId, academicYearId: yearId, status: "SUBMITTED" }, include: { assessment: { include: { settings: true } }, result: true }, orderBy: { submittedAt: "desc" }, take: 12 }),
    prisma.studentChapterAnalytics.count({ where: { studentId, academicYearId: yearId, aiRequests: { gt: 0 } } }),
    getEffectiveStudentPlan(studentId, yearId),
  ]);
  const assessments = assessmentAttempts.map(attempt => { const settings = attempt.assessment.settings; const released = Boolean(settings && canReleaseAssessmentResult({ release: settings.resultRelease, dueAt: attempt.assessment.dueAt })); return { id: attempt.id, title: attempt.assessment.title, completedAt: attempt.submittedAt, released, score: released && settings?.showScore ? attempt.result?.percentage ?? null : null, subjectivePending: Boolean(attempt.result?.subjectivePending) }; });
  return { ...scope, analytics, subjects, timeline, gaps: gaps.map(g => ({ id: g.id, message: parentGapMessage({ subject: g.subject?.name, chapter: g.chapter?.title }) })), remedials: remedials.map(r => ({ id: r.id, status: r.status, area: r.gap.chapter?.title ?? r.gap.subject?.name ?? "Learning support", completed: r.steps.filter(s => s.status === "COMPLETED").length, total: r.steps.length, teacherReviewed: Boolean(r.reviewedAt) })), mentor: mentor ? { name: mentor.mentor.user.name, type: mentor.mentor.type, status: mentor.status, completedSessions: mentor.mentor.sessions.length } : null, assessments, ai: { requests: analytics?.aiRequests ?? 0, sessions: analytics?.aiSessions ?? 0, chapterCount: aiChapters, recentUsageAt: timeline.find(t => t.activityType === "STUDENT_AI")?.occurredAt ?? null }, plan: { ...plan, label: friendlyPlan(plan.plan), sourceLabel: friendlyPlanSource(plan.source) }, notifications: [] as Array<never> };
}
