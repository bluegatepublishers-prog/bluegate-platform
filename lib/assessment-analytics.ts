import "server-only";

import { AssessmentAttemptStatus, AssessmentReviewStatus, LearningActivityType, PlatformFeatureKey, SecurityAuditOutcome, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { average, percent } from "@/lib/analytics-policy";
import { isEmptyAssessmentAnswer, normalizeAssessmentQuestionType } from "@/lib/assessment-policy";
import { recordLearningActivity } from "@/lib/analytics";
import { requireTeacherSubject } from "@/lib/teacher-experience";
import { requirePublisherFeature } from "@/lib/publisher-features";
import { accountAuditActor, recordTrustedAuditBestEffort } from "@/lib/security-audit";

export class AssessmentAnalyticsError extends Error {
  constructor(message: string, readonly code = "INVALID_STATE") {
    super(message);
    this.name = "AssessmentAnalyticsError";
  }
}

function teacherActor(input: { teacherUserId: string; publisherId: string }) {
  return accountAuditActor({ id: input.teacherUserId, role: UserRole.TEACHER, publisherId: input.publisherId });
}

function performanceLabel(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Needs Review";
  if (value >= 80) return "Strong";
  if (value >= 50) return "Moderate";
  return "Needs Review";
}

function performanceBand(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "NEEDS_REVIEW";
  if (value >= 80) return "STRONG";
  if (value >= 50) return "MODERATE";
  return "NEEDS_REVIEW";
}

function questionPerformanceLabel(successPercentage: number, reviewCompletion: number) {
  if (reviewCompletion < 100) return "Needs Review";
  if (successPercentage >= 75) return "Strong";
  if (successPercentage >= 50) return "Moderate";
  return "Needs Review";
}

async function loadAssessmentAnalyticsScope(sectionId: string, assessmentId: string) {
  const { scope } = await requireTeacherSubject(sectionId);
  await requirePublisherFeature(scope.publisherId, PlatformFeatureKey.REPORTS);
  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      academicYearId: scope.academicYear.id,
      sectionId,
      createdById: scope.teacher.userId,
    },
    include: {
      sectionSubject: { include: { subject: true } },
      chapter: { select: { id: true, chapterNumber: true, title: true } },
      questions: {
        orderBy: { sequence: "asc" },
        select: {
          id: true,
          sequence: true,
          questionType: true,
          marks: true,
          chapterId: true,
        },
      },
      settings: true,
    },
  });
  if (!assessment) throw new AssessmentAnalyticsError("This assessment is not available.", "NOT_FOUND");
  return { scope, assessment };
}

export async function processPublishedAssessmentAnalytics(input: {
  actorUserId: string;
  publisherId: string;
  schoolId: string;
  assessmentId: string;
  studentId: string;
  academicYearId: string;
  subjectId: string;
  bookId: string;
  chapterId: string | null;
  attemptId: string;
  title: string;
  submittedAt: Date | null;
  percentage: number | null;
  provisional: boolean;
  timeTakenSeconds: number | null;
  auditPurpose: "process" | "retry";
}) {
  if (input.auditPurpose === "process") {
    await recordTrustedAuditBestEffort({
      actor: teacherActor({ teacherUserId: input.actorUserId, publisherId: input.publisherId }),
      action: "classroom.assessment.analytics.process",
      targetType: "Assessment",
      targetId: input.assessmentId,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", purpose: "assessment_analytics", attempt: input.attemptId },
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await recordLearningActivity(tx, {
        eventKey: `assessment:${input.attemptId}:submitted`,
        publisherId: input.publisherId,
        schoolId: input.schoolId,
        studentId: input.studentId,
        academicYearId: input.academicYearId,
        activityType: LearningActivityType.ASSESSMENT,
        title: `Completed ${input.title}`,
        sourceType: "AssessmentAttempt",
        sourceId: input.attemptId,
        occurredAt: input.submittedAt ?? new Date(),
        subjectId: input.subjectId,
        bookId: input.bookId,
        chapterId: input.chapterId,
        completed: true,
        provisional: input.provisional,
        scorePercent: input.percentage,
        durationSeconds: input.timeTakenSeconds,
      });
    });
    return true;
  } catch {
    await recordTrustedAuditBestEffort({
      actor: teacherActor({ teacherUserId: input.actorUserId, publisherId: input.publisherId }),
      action: "classroom.assessment.analytics.failed",
      targetType: "Assessment",
      targetId: input.assessmentId,
      outcome: SecurityAuditOutcome.FAILURE,
      reasonCode: "UNEXPECTED_FAILURE",
      metadata: { scope: "classroom", purpose: "assessment_analytics", failureCategory: "PROCESSING_FAILED" },
    });
    return false;
  }
}

export async function retryTeacherAssessmentAnalytics(sectionId: string, assessmentId: string) {
  const { scope, assessment } = await loadAssessmentAnalyticsScope(sectionId, assessmentId);
  const book = await prisma.book.findUnique({ where: { id: assessment.bookId }, select: { subjectId: true } });
  if (!book) throw new AssessmentAnalyticsError("Assessment subject is unavailable.", "NOT_FOUND");

  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      assessmentId: assessment.id,
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      academicYearId: scope.academicYear.id,
      result: { publishedAt: { not: null } },
    },
    select: {
      id: true,
      studentId: true,
      submittedAt: true,
      result: { select: { percentage: true, provisional: true, timeTakenSeconds: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  await recordTrustedAuditBestEffort({
    actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
    action: "classroom.assessment.analytics.retry",
    targetType: "Assessment",
    targetId: assessment.id,
    outcome: SecurityAuditOutcome.SUCCESS,
    metadata: { scope: "classroom", purpose: "assessment_analytics", resultCount: attempts.length },
  });

  let processed = 0;
  let failed = 0;
  for (const attempt of attempts) {
    const ok = await processPublishedAssessmentAnalytics({
      actorUserId: scope.teacher.userId,
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      assessmentId: assessment.id,
      studentId: attempt.studentId,
      academicYearId: scope.academicYear.id,
      subjectId: book.subjectId,
      bookId: assessment.bookId,
      chapterId: assessment.chapterId,
      attemptId: attempt.id,
      title: assessment.title,
      submittedAt: attempt.submittedAt,
      percentage: attempt.result?.percentage ?? null,
      provisional: attempt.result?.provisional ?? false,
      timeTakenSeconds: attempt.result?.timeTakenSeconds ?? null,
      auditPurpose: "retry",
    });
    if (ok) processed += 1;
    else failed += 1;
  }

  return { ok: true as const, processed, failed };
}

export async function getTeacherAssessmentAnalyticsWorkspace(input: {
  sectionId: string;
  assessmentId: string;
  search?: string | null;
  band?: string | null;
  publishedDate?: string | null;
  attempt?: string | null;
  page?: number | null;
  pageSize?: number | null;
}) {
  const { scope, assessment } = await loadAssessmentAnalyticsScope(input.sectionId, input.assessmentId);

  await recordTrustedAuditBestEffort({
    actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
    action: "classroom.assessment.analytics.view",
    targetType: "Assessment",
    targetId: assessment.id,
    outcome: SecurityAuditOutcome.SUCCESS,
    metadata: { scope: "classroom", purpose: "assessment_analytics" },
  });

  const pageSize = Math.min(50, Math.max(5, Number.isInteger(input.pageSize) ? Number(input.pageSize) : 10));
  const safePage = Number.isInteger(input.page) && (input.page ?? 1) > 0 ? Number(input.page) : 1;
  const search = String(input.search ?? "").trim().toLocaleLowerCase("en-IN");
  const band = String(input.band ?? "ALL").trim().toUpperCase();
  const publishedDate = String(input.publishedDate ?? "").trim();
  const attemptFilter = Number.isInteger(Number(input.attempt)) ? Number(input.attempt) : null;

  const [enrollments, attempts, subjectRows, chapterRows] = await Promise.all([
    prisma.studentEnrollment.findMany({
      where: {
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
        sectionId: scope.section.id,
        status: "ACTIVE",
        student: { active: true },
      },
      select: {
        studentId: true,
        rollNumber: true,
        student: { select: { name: true, admissionNumber: true, displayName: true } },
      },
      orderBy: [{ rollNumber: "asc" }, { student: { name: "asc" } }],
    }),
    prisma.assessmentAttempt.findMany({
      where: {
        assessmentId: assessment.id,
        publisherId: scope.publisherId,
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
      },
      include: {
        result: true,
        responses: {
          include: {
            assessmentQuestion: {
              select: {
                sequence: true,
                questionType: true,
                marks: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.studentSubjectAnalytics.findMany({
      where: {
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
        subjectId: assessment.sectionSubject.subjectId,
        student: {
          enrollments: {
            some: {
              sectionId: scope.section.id,
              academicYearId: scope.academicYear.id,
              status: "ACTIVE",
            },
          },
        },
      },
      orderBy: [{ lastScoredAt: "desc" }, { updatedAt: "desc" }],
    }),
    assessment.chapterId
      ? prisma.studentChapterAnalytics.findMany({
          where: {
            schoolId: scope.schoolId,
            academicYearId: scope.academicYear.id,
            chapterId: assessment.chapterId,
            student: {
              enrollments: {
                some: {
                  sectionId: scope.section.id,
                  academicYearId: scope.academicYear.id,
                  status: "ACTIVE",
                },
              },
            },
          },
          orderBy: [{ lastScoredAt: "desc" }, { updatedAt: "desc" }],
        })
      : Promise.resolve([] as const),
  ]);

  const enrollmentByStudent = new Map(enrollments.map((enrollment) => [enrollment.studentId, enrollment]));
  const totalQuestions = assessment.questions.length;
  const totalStudents = enrollments.length;
  const publishedAttempts = attempts.filter((attempt) => attempt.result?.publishedAt);
  const startedStudents = new Set(attempts.map((attempt) => attempt.studentId));
  const submittedStudents = new Set(attempts.filter((attempt) => attempt.status !== AssessmentAttemptStatus.IN_PROGRESS && attempt.status !== AssessmentAttemptStatus.ABANDONED).map((attempt) => attempt.studentId));
  const gradedStudents = new Set(attempts.filter((attempt) => attempt.status === AssessmentAttemptStatus.GRADED).map((attempt) => attempt.studentId));
  const publishedStudents = new Set(publishedAttempts.map((attempt) => attempt.studentId));
  const publishedPercentages = publishedAttempts.map((attempt) => attempt.result?.percentage ?? null).filter((value): value is number => typeof value === "number");
  const averageScore = average(publishedPercentages);
  const highestScore = publishedPercentages.length ? Math.max(...publishedPercentages) : null;
  const lowestScore = publishedPercentages.length ? Math.min(...publishedPercentages) : null;
  const scoreDistribution = [
    { label: "90-100", count: publishedPercentages.filter((value) => value >= 90).length },
    { label: "75-89", count: publishedPercentages.filter((value) => value >= 75 && value < 90).length },
    { label: "60-74", count: publishedPercentages.filter((value) => value >= 60 && value < 75).length },
    { label: "40-59", count: publishedPercentages.filter((value) => value >= 40 && value < 60).length },
    { label: "Below 40", count: publishedPercentages.filter((value) => value < 40).length },
  ].map((row) => ({
    ...row,
    percentage: publishedPercentages.length ? Math.round((row.count / publishedPercentages.length) * 1000) / 10 : 0,
  }));

  const questionAnalytics = assessment.questions.map((question, index) => {
    const perQuestion = publishedAttempts.map((attempt) => attempt.responses.find((response) => response.assessmentQuestionId === question.id));
    const attemptedCount = perQuestion.filter((response) => response && !isEmptyAssessmentAnswer(response.answer)).length;
    const unansweredCount = publishedAttempts.length - attemptedCount;
    const objectiveResponses = perQuestion.filter((response): response is NonNullable<typeof response> => {
      if (!response) return false;
      return !["SHORT_ANSWER", "LONG_ANSWER", "CASE_BASED", "COMPETENCY", "HOTS"].includes(normalizeAssessmentQuestionType(response.assessmentQuestion.questionType) ?? "");
    });
    const correctCount = objectiveResponses.filter((response) => response.correct === true).length;
    const incorrectCount = objectiveResponses.filter((response) => response.correct === false).length;
    const averageAwardedMarks = average(perQuestion.map((response) => response?.marksAwarded ?? null));
    const successPercentage = averageAwardedMarks === null || !question.marks ? 0 : Math.round((averageAwardedMarks / question.marks) * 1000) / 10;
    const subjectiveResponses = perQuestion.filter((response): response is NonNullable<typeof response> => {
      if (!response) return false;
      const questionType = normalizeAssessmentQuestionType(response.assessmentQuestion.questionType);
      return questionType === "SHORT_ANSWER" || questionType === "LONG_ANSWER" || questionType === "CASE_BASED" || questionType === "COMPETENCY" || questionType === "HOTS";
    });
    const manualReviewCompletion = subjectiveResponses.length ? Math.round((subjectiveResponses.filter((response) => response.reviewStatus === AssessmentReviewStatus.REVIEWED).length / subjectiveResponses.length) * 1000) / 10 : 100;
    return {
      questionNumber: index + 1,
      questionId: question.id,
      type: normalizeAssessmentQuestionType(question.questionType) ?? question.questionType,
      maximumMarks: question.marks,
      attemptedCount,
      unansweredCount,
      correctCount,
      incorrectCount,
      averageAwardedMarks,
      successPercentage,
      manualReviewCompletion,
      performanceLabel: questionPerformanceLabel(successPercentage, manualReviewCompletion),
    };
  });

  const latestByStudent = new Map<string, typeof publishedAttempts[number]>();
  for (const attempt of publishedAttempts) {
    const current = latestByStudent.get(attempt.studentId);
    const left = current?.result?.publishedAt?.getTime() ?? 0;
    const right = attempt.result?.publishedAt?.getTime() ?? 0;
    if (!current || right > left || (right === left && attempt.createdAt > current.createdAt)) {
      latestByStudent.set(attempt.studentId, attempt);
    }
  }

  const studentRows = [...latestByStudent.values()].map((attempt) => {
    const enrollment = enrollmentByStudent.get(attempt.studentId);
    const attemptNumber = attempts.filter((item) => item.studentId === attempt.studentId && item.status !== AssessmentAttemptStatus.ABANDONED && item.createdAt <= attempt.createdAt).length;
    const answeredCount = attempt.responses.filter((response) => !isEmptyAssessmentAnswer(response.answer)).length;
    const percentage = attempt.result?.percentage ?? null;
    return {
      studentId: attempt.studentId,
      studentName: enrollment?.student.displayName ?? enrollment?.student.name ?? "Unknown student",
      rollNumber: enrollment?.rollNumber ?? enrollment?.student.admissionNumber ?? "-",
      attemptId: attempt.id,
      attemptNumber,
      publishedAt: attempt.result?.publishedAt ?? null,
      marks: attempt.result?.awardedMarks ?? null,
      percentage,
      performanceStatus: performanceLabel(percentage),
      questionCompletion: `${answeredCount}/${totalQuestions}`,
      band: performanceBand(percentage),
      searchIndex: `${(enrollment?.student.displayName ?? enrollment?.student.name ?? "").toLocaleLowerCase("en-IN")} ${(enrollment?.student.admissionNumber ?? "").toLocaleLowerCase("en-IN")} ${(enrollment?.rollNumber ?? "").toLocaleLowerCase("en-IN")}`,
      publishedDateKey: attempt.result?.publishedAt ? attempt.result.publishedAt.toISOString().slice(0, 10) : "",
    };
  });

  const filteredRows = studentRows.filter((row) => {
    if (search && !row.searchIndex.includes(search)) return false;
    if (band !== "ALL" && row.band !== band) return false;
    if (publishedDate && row.publishedDateKey !== publishedDate) return false;
    if (attemptFilter && row.attemptNumber !== attemptFilter) return false;
    return true;
  });

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const page = Math.min(safePage, totalPages);
  const rows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const subjectAverage = average(subjectRows.map((row) => row.averageAssessment));
  const chapterAverage = chapterRows.length ? average(chapterRows.map((row) => row.averageAssessment)) : null;

  const supportNeeded = studentRows
    .filter((row) => row.percentage !== null && row.percentage < 50)
    .map((row) => ({
      studentId: row.studentId,
      studentName: row.studentName,
      primaryConcern: row.percentage !== null && row.percentage < 40 ? "Below passing threshold" : "Low percentage",
      evidence: `${row.percentage ?? 0}% score · ${row.questionCompletion} completion`,
      suggestedAction: "Review result",
      attemptId: row.attemptId,
    }));

  const improvingStudents = [...latestByStudent.values()]
    .map((attempt) => {
      const history = publishedAttempts
        .filter((item) => item.studentId === attempt.studentId && item.result?.percentage !== null)
        .sort((left, right) => (left.result?.publishedAt?.getTime() ?? 0) - (right.result?.publishedAt?.getTime() ?? 0));
      if (history.length < 2) return null;
      const previous = history.at(-2);
      const latest = history.at(-1);
      const delta = (latest?.result?.percentage ?? 0) - (previous?.result?.percentage ?? 0);
      if (delta <= 0) return null;
      const enrollment = enrollmentByStudent.get(attempt.studentId);
      return {
        studentId: attempt.studentId,
        studentName: enrollment?.student.displayName ?? enrollment?.student.name ?? "Unknown student",
        improvement: Math.round(delta * 10) / 10,
        fromPercentage: previous?.result?.percentage ?? null,
        toPercentage: latest?.result?.percentage ?? null,
        attemptId: latest?.id ?? attempt.id,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .sort((a, b) => b.improvement - a.improvement)
    .slice(0, 5);

  return {
    scope,
    assessment,
    header: {
      assessmentTitle: assessment.title,
      subjectName: assessment.sectionSubject.subject.name,
      className: scope.schoolClass.name,
      sectionName: scope.section.name,
      publishedResults: publishedStudents.size,
      lastUpdatedAt: [assessment.updatedAt, ...publishedAttempts.map((attempt) => attempt.result?.updatedAt).filter((date): date is Date => Boolean(date))].sort((a, b) => +b - +a)[0] ?? assessment.updatedAt,
    },
    summary: {
      enrolledStudents: totalStudents,
      startedStudents: startedStudents.size,
      submittedStudents: submittedStudents.size,
      gradedStudents: gradedStudents.size,
      publishedResults: publishedStudents.size,
      averageScore,
      highestScore,
      lowestScore,
      submissionRate: percent(submittedStudents.size, totalStudents),
      publishedResultRate: percent(publishedStudents.size, totalStudents),
      assessmentCompletionStatus: publishedStudents.size === 0 ? "Not published" : publishedStudents.size < totalStudents ? "Partially published" : "Published",
    },
    scoreDistribution,
    questionAnalytics,
    students: {
      rows,
      pagination: {
        page,
        pageSize,
        totalRows,
        totalPages,
      },
    },
    subjectAnalytics: {
      completedAssessments: subjectRows.reduce((sum, row) => sum + row.assessmentsCompleted, 0),
      averagePercentage: subjectAverage,
      recentTrend: averageScore === null || subjectAverage === null ? "Unavailable" : averageScore > subjectAverage + 5 ? "Improving" : averageScore < subjectAverage - 5 ? "Needs Support" : "Stable",
      strength: performanceLabel(subjectAverage),
    },
    chapterAnalytics: assessment.chapterId
      ? {
          available: chapterRows.length > 0,
          completedAssessments: chapterRows.reduce((sum, row) => sum + row.assessmentsCompleted, 0),
          averageMarks: chapterAverage,
          completion: average(chapterRows.map((row) => row.completionPercent)),
          indicator: averageScore === null || chapterAverage === null ? "Unavailable" : averageScore > chapterAverage + 5 ? "Improving" : averageScore < chapterAverage - 5 ? "Needs Support" : "Stable",
        }
      : {
          available: false,
          completedAssessments: 0,
          averageMarks: null,
          completion: null,
          indicator: "Unavailable",
        },
    classAnalytics: {
      classAverage: averageScore,
      submissionRate: percent(submittedStudents.size, totalStudents),
      publishedResultRate: percent(publishedStudents.size, totalStudents),
      performanceDistribution: {
        STRONG: publishedPercentages.filter((value) => value >= 80).length,
        MODERATE: publishedPercentages.filter((value) => value >= 50 && value < 80).length,
        NEEDS_REVIEW: publishedPercentages.filter((value) => value < 50).length,
      },
      studentsNeedingSupport: supportNeeded.length,
      highestImprovingStudents: improvingStudents,
      assessmentCompletionStatus: publishedStudents.size === 0 ? "Not published" : publishedStudents.size < totalStudents ? "Partially published" : "Published",
    },
    supportNeeded,
  };
}
