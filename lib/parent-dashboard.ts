import "server-only";
import { PlatformFeatureKey } from "@prisma/client";
import { auth } from "@/auth";
import { canReleaseAssessmentResult } from "@/lib/assessment-policy";
import { getEffectiveStudentPlan } from "@/lib/entitlements/student-plan";
import {
  assertParentSurfacePermission,
  getParentPortalLoginReadinessForUserId,
  parentPermissionsFor,
  type ParentPortalSurface,
} from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { effectiveSchoolAccessStatus } from "@/lib/school-access-policy";
import { canParentViewChild, friendlyPlan, friendlyPlanSource, parentGapMessage } from "./parent-policy";

export class ParentAccessError extends Error {}

export async function requireParent() {
  const session = await auth();
  const readiness = await getParentPortalLoginReadinessForUserId(session?.user?.id);
  if (!readiness.ok) throw new ParentAccessError(readiness.message);
  return {
    id: readiness.actor.parent.id,
    userId: readiness.actor.parent.userId,
    active: readiness.actor.parent.active,
    phone: readiness.actor.parent.phone,
    user: readiness.actor.user,
    permissions: readiness.permissions,
  };
}

export async function requireParentChildAccess(studentId: string, options?: { surface?: ParentPortalSurface }) {
  const parent = await requireParent();
  const relationship = await prisma.parentStudentRelationship.findFirst({
    where: { parentId: parent.id, studentId, status: "APPROVED", canViewLearning: true },
    include: {
      student: {
        include: {
          school: {
            include: {
              publisher: { select: { id: true, name: true, active: true } },
              accessSubscription: { select: { plan: true, status: true, startsAt: true, expiresAt: true } },
              portalPermissions: true,
            },
          },
          enrollments: {
            where: { status: "ACTIVE", academicYear: { active: true, current: true }, schoolClass: { active: true }, section: { active: true } },
            include: { academicYear: true, schoolClass: true, section: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  const enrollment = relationship?.student.enrollments[0], publisher = relationship?.student.school.publisher;
  const schoolSubscription = relationship?.student.school.accessSubscription;
  const schoolAccessActive = schoolSubscription
    ? effectiveSchoolAccessStatus(schoolSubscription) === "ACTIVE"
    : false;
  const permissions = relationship ? parentPermissionsFor(relationship.student.school.portalPermissions) : parent.permissions;
  const featureEnabled = publisher ? await isPublisherFeatureEnabled(publisher.id, PlatformFeatureKey.PARENT_PORTAL) : false;
  if (!relationship || !enrollment || !publisher || !canParentViewChild({ parentActive: parent.active, studentActive: relationship.student.active, relationshipStatus: relationship.status, canViewLearning: relationship.canViewLearning, schoolApproved: relationship.student.school.status === "APPROVED", schoolAccessActive, publisherActive: publisher.active, featureEnabled, relationshipStudentId: relationship.studentId, requestedStudentId: studentId })) throw new ParentAccessError("This child is unavailable.");
  if (!permissions.parentLoginEnabled) throw new ParentAccessError("Parent login is disabled by this school.");
  if (options?.surface) {
    const decision = assertParentSurfacePermission({ ok: true, category: "READY", actor: { user: parent.user, parent: { id: parent.id, userId: parent.userId, active: parent.active, phone: parent.phone } }, permissions, schoolId: relationship.student.schoolId, publisherId: publisher.id }, options.surface);
    if (!decision.ok) throw new ParentAccessError(decision.message);
  }
  return { parent, relationship, student: relationship.student, enrollment, publisher, permissions };
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
    scope.permissions.mentorParentVisibleUpdates
      ? prisma.mentorStudentAssignment.findFirst({ where: { studentId, academicYearId: yearId, status: "ACTIVE", role: "PRIMARY", mentor: { active: true } }, include: { mentor: { include: { user: { select: { name: true } }, sessions: { where: { studentId, academicYearId: yearId, status: "COMPLETED" }, select: { id: true } } } } }, orderBy: { startsAt: "desc" } })
      : Promise.resolve(null),
    prisma.assessmentAttempt.findMany({ where: { studentId, academicYearId: yearId, status: { in: ["SUBMITTED", "PENDING_REVIEW", "GRADED"] } }, include: { assessment: { include: { settings: true } }, result: true }, orderBy: { submittedAt: "desc" }, take: 12 }),
    prisma.studentChapterAnalytics.count({ where: { studentId, academicYearId: yearId, aiRequests: { gt: 0 } } }),
    getEffectiveStudentPlan(studentId, yearId),
  ]);
  const assessments = assessmentAttempts.map(attempt => { const settings = attempt.assessment.settings; const released = Boolean(attempt.result?.publishedAt && settings && canReleaseAssessmentResult({ release: settings.resultRelease, dueAt: attempt.assessment.dueAt })); return { id: attempt.id, title: attempt.assessment.title, completedAt: attempt.submittedAt, released, score: released && settings?.showScore ? attempt.result?.percentage ?? null : null, subjectivePending: Boolean(attempt.result?.subjectivePending) }; });
  return { ...scope, analytics, subjects, timeline, gaps: gaps.map(g => ({ id: g.id, message: parentGapMessage({ subject: g.subject?.name, chapter: g.chapter?.title }) })), remedials: remedials.map(r => ({ id: r.id, status: r.status, area: r.gap.chapter?.title ?? r.gap.subject?.name ?? "Learning support", completed: r.steps.filter(s => s.status === "COMPLETED").length, total: r.steps.length, teacherReviewed: Boolean(r.reviewedAt) })), mentor: mentor ? { name: mentor.mentor.user.name, type: mentor.mentor.type, status: mentor.status, completedSessions: mentor.mentor.sessions.length } : null, assessments, ai: { requests: analytics?.aiRequests ?? 0, sessions: analytics?.aiSessions ?? 0, chapterCount: aiChapters, recentUsageAt: timeline.find(t => t.activityType === "STUDENT_AI")?.occurredAt ?? null }, plan: { ...plan, label: friendlyPlan(plan.plan), sourceLabel: friendlyPlanSource(plan.source) }, notifications: [] as Array<never> };
}

export async function getParentChildPortalData(studentId: string) {
  const learning = await getParentChildLearningSummary(studentId);
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const [classTeacher, assignments, assessments, plannerItems, latestNotice, reportCards, latestFeedback] = await Promise.all([
    prisma.teacherAssignment.findFirst({
      where: { schoolClassId: learning.enrollment.schoolClassId, type: "CLASS_TEACHER", active: true, teacher: { active: true } },
      select: { teacher: { select: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    learning.permissions.parentHomeworkVisibility ? prisma.classroomAssignment.findMany({
      where: {
        schoolId: learning.student.schoolId,
        academicYearId: learning.enrollment.academicYearId,
        sectionId: learning.enrollment.sectionId,
        status: "PUBLISHED",
        OR: [{ dueAt: null }, { dueAt: { gte: today, lte: nextWeek } }],
      },
      include: {
        sectionSubject: { select: { subject: { select: { name: true } } } },
        submissions: {
          where: { studentId: learning.student.id },
          orderBy: { attemptNumber: "desc" },
          take: 1,
          select: { id: true, status: true, submittedAt: true, returnedAt: true, isLate: true, marksAwarded: true, teacherFeedback: true },
        },
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 8,
    }) : Promise.resolve([]),
    learning.permissions.parentAssessmentVisibility ? prisma.assessment.findMany({
      where: {
        schoolId: learning.student.schoolId,
        academicYearId: learning.enrollment.academicYearId,
        sectionId: learning.enrollment.sectionId,
        status: "PUBLISHED",
        OR: [{ opensAt: { gte: now } }, { dueAt: { gte: today, lte: nextWeek } }],
      },
      include: {
        sectionSubject: { select: { subject: { select: { name: true } } } },
        settings: true,
        attempts: {
          where: { studentId: learning.student.id },
          orderBy: { submittedAt: "desc" },
          take: 1,
          include: { result: true },
        },
      },
      orderBy: [{ dueAt: "asc" }, { opensAt: "asc" }],
      take: 8,
    }) : Promise.resolve([]),
    learning.permissions.parentPlannerVisibility ? prisma.academicPlannerItem.findMany({
      where: {
        schoolId: learning.student.schoolId,
        academicYearId: learning.enrollment.academicYearId,
        OR: [{ sectionId: null }, { sectionId: learning.enrollment.sectionId }],
        type: { in: ["NOTICE", "HOLIDAY", "EMERGENCY_HOLIDAY", "EVENT", "ASSIGNMENT", "ASSESSMENT"] },
        status: { notIn: ["CANCELLED", "SKIPPED"] },
        currentDate: { gte: today, lte: nextWeek },
      },
      include: {
        assignment: { select: { id: true, title: true } },
        assessment: { select: { id: true, title: true } },
        sectionSubject: { select: { subject: { select: { name: true } } } },
        reschedules: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [{ currentDate: "asc" }, { createdAt: "desc" }],
      take: 12,
    }) : Promise.resolve([]),
    prisma.academicPlannerItem.findFirst({
      where: {
        schoolId: learning.student.schoolId,
        academicYearId: learning.enrollment.academicYearId,
        OR: [{ sectionId: null }, { sectionId: learning.enrollment.sectionId }],
        type: { in: ["NOTICE", "HOLIDAY", "EMERGENCY_HOLIDAY", "EVENT"] },
        status: { not: "CANCELLED" },
      },
      include: { sectionSubject: { select: { subject: { select: { name: true } } } } },
      orderBy: [{ currentDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.reportCardSnapshot.findMany({
      where: { studentId, schoolId: learning.student.schoolId, academicYearId: learning.enrollment.academicYearId },
      select: {
        id: true,
        documentId: true,
        version: true,
        schoolDisplayName: true,
        academicYearName: true,
        classDisplayName: true,
        sectionDisplayName: true,
        issuedAt: true,
        attendanceSnapshot: true,
      },
      orderBy: [{ issuedAt: "desc" }, { version: "desc" }],
      take: 10,
    }),
    prisma.assignmentSubmission.findFirst({
      where: {
        studentId: learning.student.id,
        schoolId: learning.student.schoolId,
        academicYearId: learning.enrollment.academicYearId,
        teacherFeedback: { not: null },
        returnedAt: { not: null },
      },
      select: {
        id: true,
        teacherFeedback: true,
        marksAwarded: true,
        isLate: true,
        returnedAt: true,
        submittedAt: true,
        assignment: { select: { title: true, subject: { select: { name: true } } } },
      },
      orderBy: [{ returnedAt: "desc" }, { updatedAt: "desc" }],
    }),
  ]);

  const overallStatus = determineParentLearningStatus(learning.analytics, learning.subjects);
  const latestPublishedResult = learning.assessments.find((item) => item.released && item.score != null) ?? learning.assessments.find((item) => item.released) ?? null;

  return {
    ...learning,
    overallStatus,
    classTeacher: classTeacher?.teacher.user.name ?? null,
    latestPublishedResult,
    upcomingAssignments: assignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      subject: assignment.sectionSubject?.subject.name ?? null,
      dueAt: assignment.dueAt,
      status: assignment.submissions[0]?.status ?? "DRAFT",
      submittedAt: assignment.submissions[0]?.submittedAt ?? null,
      returnedAt: assignment.submissions[0]?.returnedAt ?? null,
      isLate: assignment.submissions[0]?.isLate ?? false,
      marksAwarded: assignment.submissions[0]?.marksAwarded ?? null,
      teacherFeedback: assignment.submissions[0]?.teacherFeedback ?? null,
    })),
    upcomingAssessments: assessments.map((assessment) => {
      const attempt = assessment.attempts[0];
      const released = Boolean(
        attempt?.result?.publishedAt &&
        assessment.settings &&
        canReleaseAssessmentResult({ release: assessment.settings.resultRelease, dueAt: assessment.dueAt }),
      );
      return {
        id: assessment.id,
        title: assessment.title,
        subject: assessment.sectionSubject?.subject.name ?? null,
        opensAt: assessment.opensAt,
        dueAt: assessment.dueAt,
        released,
        score: released && assessment.settings?.showScore ? attempt?.result?.percentage ?? null : null,
        teacherRemarks: released ? attempt?.result?.subjectivePending ? "Published with pending review" : null : null,
      };
    }),
    plannerItems: plannerItems.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      date: item.currentDate,
      status: item.status,
      subject: item.sectionSubject?.subject.name ?? null,
      assignmentTitle: item.assignment?.title ?? null,
      assessmentTitle: item.assessment?.title ?? null,
      rescheduled: item.reschedules.length > 0,
    })),
    latestNotice: latestNotice
      ? {
          id: latestNotice.id,
          type: latestNotice.type,
          title: latestNotice.title,
          description: latestNotice.description,
          date: latestNotice.currentDate,
          subject: latestNotice.sectionSubject?.subject.name ?? null,
        }
      : null,
    reportCards,
    latestFeedback: latestFeedback
      ? {
          id: latestFeedback.id,
          title: latestFeedback.assignment.title,
          subject: latestFeedback.assignment.subject?.name ?? null,
          feedback: latestFeedback.teacherFeedback,
          marksAwarded: latestFeedback.marksAwarded,
          isLate: latestFeedback.isLate,
          returnedAt: latestFeedback.returnedAt,
          submittedAt: latestFeedback.submittedAt,
        }
      : null,
  };
}

function determineParentLearningStatus(
  analytics: {
    readingPercent: number;
    revisionPercent: number;
    practicePercent: number;
    assessmentPercent: number;
    booksCompleted: number;
    assessmentsCompleted: number;
  } | null,
  subjects: Array<{ completionPercent: number }>,
) {
  const values = [
    analytics?.readingPercent,
    analytics?.revisionPercent,
    analytics?.practicePercent,
    analytics?.assessmentPercent,
    ...subjects.map((subject) => subject.completionPercent),
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!values.length || values.every((value) => value <= 0)) return "Not Started";
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (average >= 85) return "Excellent";
  if (average >= 70) return "On Track";
  if (average >= 50) return "Needs Practice";
  return "Needs Support";
}
