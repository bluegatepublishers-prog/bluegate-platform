import "server-only";

import { PlatformFeatureKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student-dashboard";
import { requireTeacher } from "@/lib/teacher-dashboard";
import { requireSchool } from "@/lib/school-dashboard";
import { requirePublisherAdmin } from "@/lib/publisher-context";
import { isPublisherFeatureEnabled, requirePublisherFeature } from "@/lib/publisher-features";
import { getPremiumFeatureEntitlementForAuthenticatedUser } from "@/lib/entitlements/features";
import { getTeacherOpenGapProjection } from "@/lib/gaps/teacher";
import { average, percent } from "@/lib/analytics-policy";
import { AssessmentAttemptStatus, SecurityAuditOutcome, UserRole } from "@prisma/client";
import { accountAuditActor, recordTrustedAuditBestEffort } from "@/lib/security-audit";

export async function getStudentAnalyticsReport() {
  const identity = await requireStudent();
  if (!identity.student.userId) return { state: "LOCKED" as const };
  const entitlement = await getPremiumFeatureEntitlementForAuthenticatedUser(
    { id: identity.student.userId, role: "STUDENT" },
    { feature: "REPORTS", academicYearId: identity.academicYear.id },
  );
  if (!entitlement.allowed) return { state: entitlement.reason === "FEATURE_DISABLED" ? "FEATURE_DISABLED" as const : "LOCKED" as const };
  const gapEntitlement = await getPremiumFeatureEntitlementForAuthenticatedUser(
    { id: identity.student.userId, role: "STUDENT" },
    { feature: "GAP_ANALYSIS", academicYearId: identity.academicYear.id },
  );
  const [summary, subjects, chapters, skills, timeline] = await prisma.$transaction([
    prisma.studentAnalytics.findUnique({ where: { studentId_academicYearId: { studentId: identity.student.id, academicYearId: identity.academicYear.id } } }),
    prisma.studentSubjectAnalytics.findMany({ where: { studentId: identity.student.id, academicYearId: identity.academicYear.id }, include: { subject: { select: { name: true } } }, orderBy: { completionPercent: "desc" } }),
    prisma.studentChapterAnalytics.findMany({ where: { studentId: identity.student.id, academicYearId: identity.academicYear.id }, include: { chapter: { select: { title: true, chapterNumber: true } }, book: { select: { title: true } } }, orderBy: { lastActivityAt: "desc" } }),
    prisma.studentSkillAnalytics.findMany({ where: { studentId: identity.student.id, academicYearId: identity.academicYear.id }, orderBy: [{ dimension: "asc" }, { averagePercent: "asc" }] }),
    prisma.learningTimeline.findMany({ where: { studentId: identity.student.id, academicYearId: identity.academicYear.id }, orderBy: { occurredAt: "desc" }, take: 30, select: { id: true, activityType: true, title: true, scorePercent: true, occurredAt: true, completed: true } }),
  ]);
  const openGapCount = gapEntitlement.allowed ? await prisma.studentLearningGap.count({ where: { studentId: identity.student.id, academicYearId: identity.academicYear.id, status: { in: ["OPEN", "ACKNOWLEDGED"] } } }) : 0;
  return { state: "READY" as const, year: identity.academicYear.name, summary, subjects, chapters, skills, timeline, gapEnabled: gapEntitlement.allowed, openGapCount };
}

export async function getTeacherAnalyticsReport() {
  const teacher = await requireTeacher();
  if (!teacher.schoolId || !teacher.school?.publisherId) return { rows: [] };
  await requirePublisherFeature(teacher.school.publisherId, PlatformFeatureKey.REPORTS);
  const rows = await prisma.teacherAnalytics.findMany({ where: { teacherId: teacher.id, academicYear: { current: true, active: true } }, include: { academicYear: { select: { name: true } }, subject: { select: { name: true } } }, orderBy: { subject: { name: "asc" } } });
  const gapEnabled = await isPublisherFeatureEnabled(teacher.school.publisherId, PlatformFeatureKey.GAP_ANALYSIS);
  return { rows, gapEnabled, gapProjection: gapEnabled ? await getTeacherOpenGapProjection() : { openGapCount: 0, studentsWithOpenGaps: 0 } };
}

export async function getSchoolAnalyticsReport() {
  const school = await requireSchool();
  if (!school.publisherId) return { summary: null };
  await requirePublisherFeature(school.publisherId, PlatformFeatureKey.REPORTS);
  await recordTrustedAuditBestEffort({
    actor: accountAuditActor({ id: school.user.id, role: UserRole.SCHOOL, publisherId: school.publisherId }),
    action: "school.assessment.analytics.view",
    targetType: "School",
    targetId: school.id,
    outcome: SecurityAuditOutcome.SUCCESS,
    metadata: { scope: "school", purpose: "assessment_analytics" },
  });
  const summary = await prisma.schoolAnalytics.findFirst({ where: { schoolId: school.id, academicYear: { current: true, active: true } }, include: { academicYear: { select: { name: true } } } });
  const gapEnabled = await isPublisherFeatureEnabled(school.publisherId, PlatformFeatureKey.GAP_ANALYSIS);
  const openGapCount = gapEnabled ? await prisma.studentLearningGap.count({ where: { schoolId: school.id, academicYear: { current: true, active: true }, status: { in: ["OPEN", "ACKNOWLEDGED"] } } }) : 0;
  const academicYear = await prisma.academicYear.findFirst({ where: { schoolId: school.id, current: true, active: true }, select: { id: true } });
  const assessmentSummary = academicYear ? await prisma.$transaction(async (tx) => {
    const [enrolledStudents, attempts, subjectRows] = await Promise.all([
      tx.studentEnrollment.count({ where: { schoolId: school.id, academicYearId: academicYear.id, status: "ACTIVE", student: { active: true } } }),
      tx.assessmentAttempt.findMany({
        where: { schoolId: school.id, academicYearId: academicYear.id },
        select: {
          studentId: true,
          status: true,
          result: { select: { percentage: true, publishedAt: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      tx.studentSubjectAnalytics.findMany({
        where: { schoolId: school.id, academicYearId: academicYear.id },
        select: { averageAssessment: true, subjectId: true },
      }),
    ]);

    const published = attempts.filter((attempt) => attempt.result?.publishedAt);
    const startedStudents = new Set(attempts.map((attempt) => attempt.studentId));
    const submittedStudents = new Set(attempts.filter((attempt) => attempt.status !== AssessmentAttemptStatus.IN_PROGRESS && attempt.status !== AssessmentAttemptStatus.ABANDONED).map((attempt) => attempt.studentId));
    const gradedStudents = new Set(attempts.filter((attempt) => attempt.status === AssessmentAttemptStatus.GRADED).map((attempt) => attempt.studentId));
    const publishedPercentages = published.map((attempt) => attempt.result?.percentage ?? null).filter((value): value is number => typeof value === "number");
    const subjectAverage = average(subjectRows.map((row) => row.averageAssessment));
    return {
      enrolledStudents,
      startedStudents: startedStudents.size,
      submittedStudents: submittedStudents.size,
      gradedStudents: gradedStudents.size,
      publishedResults: published.length,
      assessmentDeliveryCompletion: percent(submittedStudents.size, enrolledStudents),
      gradingCompletion: percent(gradedStudents.size, submittedStudents.size),
      publishedResultRate: percent(published.length, enrolledStudents),
      classAverage: average(publishedPercentages),
      subjectAverage,
      performanceDistribution: {
        STRONG: publishedPercentages.filter((value) => value >= 80).length,
        MODERATE: publishedPercentages.filter((value) => value >= 50 && value < 80).length,
        NEEDS_REVIEW: publishedPercentages.filter((value) => value < 50).length,
      },
      studentsNeedingSupport: publishedPercentages.filter((value) => value < 50).length,
    };
  }) : null;
  return { summary, gapEnabled, openGapCount, assessmentSummary };
}

export async function getPublisherAnalyticsReport() {
  const { publisher } = await requirePublisherAdmin();
  await requirePublisherFeature(publisher.id, PlatformFeatureKey.REPORTS);
  const summary = await prisma.publisherAnalytics.findUnique({ where: { publisherId_scopeKey: { publisherId: publisher.id, scopeKey: "ALL" } } });
  const gapEnabled = await isPublisherFeatureEnabled(publisher.id, PlatformFeatureKey.GAP_ANALYSIS);
  const openGapCount = gapEnabled ? await prisma.studentLearningGap.count({ where: { publisherId: publisher.id, academicYear: { current: true, active: true }, status: { in: ["OPEN", "ACKNOWLEDGED"] } } }) : 0;
  return { publisher, summary, gapEnabled, openGapCount };
}
