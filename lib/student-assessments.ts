import "server-only";

import {
  AssessmentAttemptStatus,
  AssessmentResultRelease,
  AssessmentReviewStatus,
  AssessmentStatus,
  LearningActivityType,
  Prisma,
} from "@prisma/client";
import { recordLearningActivity } from "@/lib/analytics";
import { refreshLearningSupportBestEffort } from "@/lib/learning-support";
import { completeMatchingRemedialSteps } from "@/lib/remedials/completion";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student-dashboard";
import { getStudentBook, getStudentBooks } from "@/lib/student-books";
import { getPremiumFeatureEntitlementForAuthenticatedUser } from "@/lib/entitlements/features";
import {
  calculateAssessmentExpiry,
  calculateAssessmentSummary,
  canReleaseAssessmentResult,
  gradeAssessmentAnswer,
  isAssessmentExpired,
  isEmptyAssessmentAnswer,
  isValidAssessmentQuestion,
  normalizeAssessmentQuestionType,
  toSafeAssessmentQuestion,
  validateAssessmentDuration,
  type AssessmentQuestionSnapshot,
} from "@/lib/assessment-policy";

const SAFE_UNAVAILABLE = "This assessment is not available for your account.";
const SAFE_SAVE_ERROR = "We could not save your answer. Please try again.";

const assessmentQuestionSelect = {
  id: true,
  questionId: true,
  bookId: true,
  chapterId: true,
  sequence: true,
  questionType: true,
  questionText: true,
  options: true,
  correctAnswer: true,
  explanation: true,
  marks: true,
  competency: true,
  learningOutcome: true,
  question: { select: { bookId: true, chapterId: true, approved: true } },
  chapter: { select: { bookId: true } },
} satisfies Prisma.AssessmentQuestionSelect;

const assessmentInclude = {
  settings: true,
  book: { select: { title: true } },
  chapter: { select: { id: true, chapterNumber: true, title: true } },
  sectionSubject: { select: { sectionId: true } },
  questions: { orderBy: { sequence: "asc" as const }, select: assessmentQuestionSelect },
} satisfies Prisma.AssessmentInclude;

export class AssessmentError extends Error {
  constructor(message = SAFE_UNAVAILABLE, readonly status = 400, readonly code = "ASSESSMENT_UNAVAILABLE") {
    super(message);
    this.name = "AssessmentError";
  }
}

async function getAssessmentFeatureDecision(userId: string, academicYearId: string) {
  return getPremiumFeatureEntitlementForAuthenticatedUser(
    { id: userId, role: "STUDENT" },
    { feature: "ASSESSMENTS", academicYearId },
  );
}

async function resolveAssessmentScope(assessmentId: string) {
  const identity = await requireStudent();
  if (!identity.student.userId) throw new AssessmentError();
  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      publisherId: identity.publisher.id,
      schoolId: identity.school.id,
      academicYearId: identity.academicYear.id,
      sectionId: identity.enrollment.sectionId,
      status: AssessmentStatus.PUBLISHED,
    },
    include: assessmentInclude,
  });
  if (!assessment || !assessment.settings || assessment.sectionSubject.sectionId !== identity.enrollment.sectionId) {
    throw new AssessmentError();
  }
  const [book, entitlement] = await Promise.all([
    getStudentBook(assessment.bookId),
    getAssessmentFeatureDecision(identity.student.userId, identity.academicYear.id),
  ]);
  if (!book || book.sectionSubjectId !== assessment.sectionSubjectId || !entitlement.allowed) {
    throw new AssessmentError(SAFE_UNAVAILABLE, 403);
  }
  return { identity, assessment, book, entitlement };
}

function assertAssessmentCanStart(assessment: Awaited<ReturnType<typeof resolveAssessmentScope>>["assessment"], now: Date) {
  if ((assessment.opensAt && now < assessment.opensAt) || (assessment.dueAt && now >= assessment.dueAt)) throw new AssessmentError();
  if (!validateAssessmentDuration(assessment.durationMinutes) || assessment.settings!.maxAttempts < 1) throw new AssessmentError();
  if (!assessment.questions.length || assessment.questions.some((question) => !isValidAssessmentQuestion(question as AssessmentQuestionSnapshot))) throw new AssessmentError();
  if (assessment.questions.some((question) =>
    question.bookId !== assessment.bookId ||
    question.chapter.bookId !== assessment.bookId ||
    !question.question.approved ||
    question.question.bookId !== question.bookId ||
    question.question.chapterId !== question.chapterId
  )) throw new AssessmentError();
  if (assessment.type === "CHAPTER" && (!assessment.chapterId || assessment.questions.some((question) => question.chapterId !== assessment.chapterId))) throw new AssessmentError();
}

export async function getStudentAssessments() {
  const identity = await requireStudent();
  if (!identity.student.userId) return { state: "UNAVAILABLE" as const, assessments: [] };
  const entitlement = await getAssessmentFeatureDecision(identity.student.userId, identity.academicYear.id);
  if (!entitlement.allowed) {
    return {
      state: entitlement.reason === "FEATURE_DISABLED" ? "FEATURE_DISABLED" as const : "LOCKED" as const,
      assessments: [],
    };
  }
  const books = await getStudentBooks();
  const sectionSubjects = new Map(books.map((book) => [book.id, book.sectionSubjectId]));
  if (!books.length) return { state: "AVAILABLE" as const, assessments: [] };
  const rows = await prisma.assessment.findMany({
    where: {
      publisherId: identity.publisher.id,
      schoolId: identity.school.id,
      academicYearId: identity.academicYear.id,
      sectionId: identity.enrollment.sectionId,
      status: AssessmentStatus.PUBLISHED,
      bookId: { in: books.map((book) => book.id) },
    },
    include: {
      ...assessmentInclude,
      attempts: {
        where: { studentId: identity.student.id, academicYearId: identity.academicYear.id },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { result: true },
      },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  const now = new Date();
  return {
    state: "AVAILABLE" as const,
    assessments: rows
      .filter((assessment) => sectionSubjects.get(assessment.bookId) === assessment.sectionSubjectId)
      .map((assessment) => toAssessmentCard(assessment, now)),
  };
}

function toAssessmentCard(assessment: Awaited<ReturnType<typeof prisma.assessment.findMany>>[number] & Record<string, unknown>, now: Date) {
  const row = assessment as unknown as {
    id: string; title: string; type: string; opensAt: Date | null; dueAt: Date | null; durationMinutes: number | null;
    book: { title: string }; chapter: { chapterNumber: number; title: string } | null;
    questions: Array<{ marks: number }>;
    attempts: Array<{ id: string; status: AssessmentAttemptStatus; result: { id: string } | null }>;
    settings: { resultRelease: AssessmentResultRelease } | null;
  };
  const attempt = row.attempts[0] ?? null;
  const released = Boolean(attempt?.result && row.settings && canReleaseAssessmentResult({ release: row.settings.resultRelease, dueAt: row.dueAt, now }));
  const availability = attempt?.status === AssessmentAttemptStatus.IN_PROGRESS
    ? "CONTINUE"
    : attempt
      ? released ? "RESULT" : "COMPLETED"
      : row.opensAt && now < row.opensAt
        ? "UPCOMING"
        : row.dueAt && now >= row.dueAt ? "CLOSED" : "START";
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    bookTitle: row.book.title,
    chapter: row.chapter ? `Chapter ${row.chapter.chapterNumber}: ${row.chapter.title}` : null,
    opensAt: row.opensAt?.toISOString() ?? null,
    dueAt: row.dueAt?.toISOString() ?? null,
    durationMinutes: row.durationMinutes,
    totalQuestions: row.questions.length,
    totalMarks: row.questions.reduce((sum, question) => sum + question.marks, 0),
    availability,
    attemptId: attempt?.id ?? null,
  };
}

export async function startStudentAssessment(assessmentId: string) {
  const scope = await resolveAssessmentScope(assessmentId);
  const now = new Date();
  assertAssessmentCanStart(scope.assessment, now);
  const activeKey = {
    assessmentId,
    studentId: scope.identity.student.id,
    status: AssessmentAttemptStatus.IN_PROGRESS,
  };
  const existing = await prisma.assessmentAttempt.findFirst({ where: activeKey, select: { id: true } });
  if (existing) return { attemptId: existing.id, resumed: true };
  const attempts = await prisma.assessmentAttempt.count({ where: { assessmentId, studentId: scope.identity.student.id } });
  if (attempts >= scope.assessment.settings!.maxAttempts) throw new AssessmentError("You have already completed this assessment.", 409, "ATTEMPT_LIMIT");
  const expiresAt = calculateAssessmentExpiry(now, scope.assessment.durationMinutes, scope.assessment.dueAt);
  try {
    const attempt = await prisma.$transaction(async (tx) => {
      const created = await tx.assessmentAttempt.create({
        data: {
          assessmentId,
          publisherId: scope.identity.publisher.id,
          schoolId: scope.identity.school.id,
          studentId: scope.identity.student.id,
          academicYearId: scope.identity.academicYear.id,
          startedAt: now,
          expiresAt,
          responses: { create: scope.assessment.questions.map((question) => ({ assessmentQuestionId: question.id })) },
        },
        select: { id: true },
      });
      const book = await tx.book.findUnique({ where: { id: scope.assessment.bookId }, select: { subjectId: true } });
      if (!book) throw new AssessmentError();
      await recordLearningActivity(tx, {
        eventKey: `assessment:${created.id}:started`, publisherId: scope.identity.publisher.id, schoolId: scope.identity.school.id,
        studentId: scope.identity.student.id, academicYearId: scope.identity.academicYear.id, activityType: LearningActivityType.ASSESSMENT,
        title: `Started ${scope.assessment.title}`, sourceType: "AssessmentAttempt", sourceId: created.id, occurredAt: now,
        subjectId: book.subjectId, bookId: scope.assessment.bookId, chapterId: scope.assessment.chapterId, completed: false,
      });
      return created;
    });
    return { attemptId: attempt.id, resumed: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const active = await prisma.assessmentAttempt.findFirst({ where: activeKey, select: { id: true } });
      if (active) return { attemptId: active.id, resumed: true };
    }
    throw error;
  }
}

async function loadOwnedAssessmentAttempt(attemptId: string) {
  const identity = await requireStudent();
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: {
      id: attemptId,
      studentId: identity.student.id,
      publisherId: identity.publisher.id,
      schoolId: identity.school.id,
      academicYearId: identity.academicYear.id,
    },
    include: {
      result: true,
      assessment: { include: assessmentInclude },
      responses: { orderBy: { assessmentQuestion: { sequence: "asc" } }, include: { assessmentQuestion: { select: assessmentQuestionSelect } } },
    },
  });
  if (!attempt || attempt.assessment.sectionId !== identity.enrollment.sectionId) throw new AssessmentError(SAFE_UNAVAILABLE, 404);
  const scope = await resolveAssessmentScope(attempt.assessmentId);
  if (scope.assessment.sectionSubjectId !== attempt.assessment.sectionSubjectId) throw new AssessmentError(SAFE_UNAVAILABLE, 404);
  return attempt;
}

export async function getStudentAssessmentAttempt(attemptId: string) {
  let attempt = await loadOwnedAssessmentAttempt(attemptId);
  if (attempt.status === AssessmentAttemptStatus.IN_PROGRESS && isAssessmentExpired(attempt.expiresAt)) {
    await finalizeStudentAssessment(attempt.id, new Date(), true);
    attempt = await loadOwnedAssessmentAttempt(attemptId);
  }
  if (attempt.status !== AssessmentAttemptStatus.IN_PROGRESS) {
    return { state: "SUBMITTED" as const, attemptId: attempt.id };
  }
  const questions = attempt.responses.map((response, index) => {
    const safe = toSafeAssessmentQuestion(response.assessmentQuestion as AssessmentQuestionSnapshot, index + 1);
    if (!safe) throw new AssessmentError();
    return { ...safe, answer: response.answer, savedAt: response.answeredAt?.toISOString() ?? null };
  });
  return {
    state: "IN_PROGRESS" as const,
    id: attempt.id,
    title: attempt.assessment.title,
    instructions: attempt.assessment.instructions,
    bookTitle: attempt.assessment.book.title,
    chapter: attempt.assessment.chapter ? `Chapter ${attempt.assessment.chapter.chapterNumber}: ${attempt.assessment.chapter.title}` : null,
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: attempt.expiresAt?.toISOString() ?? null,
    serverNow: new Date().toISOString(),
    questions,
  };
}

export async function saveStudentAssessmentAnswer(input: { attemptId: string; assessmentQuestionId: string; answer: unknown }) {
  const attempt = await loadOwnedAssessmentAttempt(input.attemptId);
  if (attempt.status !== AssessmentAttemptStatus.IN_PROGRESS) throw new AssessmentError(SAFE_SAVE_ERROR, 409);
  if (isAssessmentExpired(attempt.expiresAt)) {
    await finalizeStudentAssessment(attempt.id, new Date(), true);
    throw new AssessmentError("Time is up. Your saved answers were submitted.", 409, "TIME_EXPIRED");
  }
  const response = attempt.responses.find((item) => item.assessmentQuestionId === input.assessmentQuestionId);
  if (!response) throw new AssessmentError(SAFE_SAVE_ERROR);
  if (isEmptyAssessmentAnswer(input.answer)) {
    await prisma.assessmentResponse.update({
      where: { id: response.id },
      data: { answer: Prisma.DbNull, autoGraded: false, correct: null, marksAwarded: null, reviewStatus: AssessmentReviewStatus.NOT_REQUIRED, answeredAt: null },
    });
    return { saved: true, cleared: true };
  }
  const grade = gradeAssessmentAnswer(response.assessmentQuestion as AssessmentQuestionSnapshot, input.answer);
  if (!grade.ok) throw new AssessmentError(SAFE_SAVE_ERROR);
  await prisma.assessmentResponse.update({
    where: { id: response.id },
    data: {
      answer: grade.answer as Prisma.InputJsonValue,
      autoGraded: grade.autoGraded,
      correct: grade.correct,
      marksAwarded: grade.marksAwarded,
      reviewStatus: grade.reviewStatus,
      answeredAt: new Date(),
    },
  });
  return { saved: true, cleared: false };
}

export async function submitStudentAssessment(attemptId: string) {
  const attempt = await loadOwnedAssessmentAttempt(attemptId);
  if (attempt.status !== AssessmentAttemptStatus.IN_PROGRESS) return { attemptId: attempt.id };
  await finalizeStudentAssessment(attempt.id, new Date(), isAssessmentExpired(attempt.expiresAt));
  return { attemptId: attempt.id };
}

async function finalizeStudentAssessment(attemptId: string, now: Date, timedOut: boolean) {
  const outcome = await prisma.$transaction(async (tx) => {
    const attempt = await tx.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assessment: { include: { settings: true } },
        responses: { include: { assessmentQuestion: { select: assessmentQuestionSelect } } },
      },
    });
    if (!attempt || !attempt.assessment.settings) throw new AssessmentError();
    if (attempt.status !== AssessmentAttemptStatus.IN_PROGRESS) return null;
    const submittedAt = timedOut && attempt.expiresAt && attempt.expiresAt < now ? attempt.expiresAt : now;
    const normalized = [];
    for (const response of attempt.responses) {
      const grade = isEmptyAssessmentAnswer(response.answer)
        ? null
        : gradeAssessmentAnswer(response.assessmentQuestion as AssessmentQuestionSnapshot, response.answer);
      if (grade && !grade.ok) throw new AssessmentError();
      const data = grade
        ? { autoGraded: grade.autoGraded, correct: grade.correct, marksAwarded: grade.marksAwarded, reviewStatus: grade.reviewStatus }
        : { autoGraded: false, correct: null, marksAwarded: null, reviewStatus: AssessmentReviewStatus.NOT_REQUIRED };
      await tx.assessmentResponse.update({ where: { id: response.id }, data });
      normalized.push({ answer: response.answer, ...data, question: { marks: response.assessmentQuestion.marks } });
    }
    const summary = calculateAssessmentSummary(normalized, attempt.startedAt, submittedAt);
    const status = summary.subjectivePending ? AssessmentAttemptStatus.PENDING_REVIEW : AssessmentAttemptStatus.SUBMITTED;
    const claimed = await tx.assessmentAttempt.updateMany({
      where: { id: attempt.id, status: AssessmentAttemptStatus.IN_PROGRESS },
      data: { status, submittedAt },
    });
    if (claimed.count !== 1) throw new AssessmentError();
    const publishedAt = canReleaseAssessmentResult({ release: attempt.assessment.settings.resultRelease, dueAt: attempt.assessment.dueAt, now: submittedAt }) ? submittedAt : null;
    const result = await tx.assessmentResult.create({ data: { attemptId: attempt.id, ...summary, publishedAt } });
    const book = await tx.book.findUnique({ where: { id: attempt.assessment.bookId }, select: { subjectId: true } });
    if (!book) throw new AssessmentError();
    await recordLearningActivity(tx, {
      eventKey: `assessment:${attempt.id}:submitted`,
      publisherId: attempt.publisherId,
      schoolId: attempt.schoolId,
      studentId: attempt.studentId,
      academicYearId: attempt.academicYearId,
      activityType: LearningActivityType.ASSESSMENT,
      title: `Completed ${attempt.assessment.title}`,
      sourceType: "AssessmentAttempt",
      sourceId: attempt.id,
      occurredAt: submittedAt,
      subjectId: book.subjectId,
      bookId: attempt.assessment.bookId,
      chapterId: attempt.assessment.chapterId,
      completed: true,
      provisional: result.provisional,
      scorePercent: result.percentage,
      durationSeconds: result.timeTakenSeconds,
    });
    return { result, studentId: attempt.studentId, academicYearId: attempt.academicYearId, assessmentId: attempt.assessmentId, attemptId: attempt.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (!outcome) return null;
  await completeMatchingRemedialSteps({ studentId: outcome.studentId, academicYearId: outcome.academicYearId, type: "ASSESSMENT_RETRY", assessmentId: outcome.assessmentId, sourceId: outcome.attemptId });
  await refreshLearningSupportBestEffort({ studentId: outcome.studentId, academicYearId: outcome.academicYearId });
  return outcome.result;
}

export async function getStudentAssessmentResult(attemptId: string) {
  const attempt = await loadOwnedAssessmentAttempt(attemptId);
  if (attempt.status === AssessmentAttemptStatus.IN_PROGRESS || !attempt.result || !attempt.assessment.settings) throw new AssessmentError(SAFE_UNAVAILABLE, 404);
  const settings = attempt.assessment.settings;
  const released = canReleaseAssessmentResult({ release: settings.resultRelease, dueAt: attempt.assessment.dueAt });
  if (!released) {
    return {
      state: "HELD" as const,
      title: attempt.assessment.title,
      message: settings.resultRelease === AssessmentResultRelease.AFTER_DUE_DATE
        ? "Your result will be available after the assessment due date."
        : "Results are not available for this assessment.",
    };
  }
  if (!attempt.result.publishedAt) await prisma.assessmentResult.update({ where: { id: attempt.result.id }, data: { publishedAt: new Date() } });
  return {
    state: "AVAILABLE" as const,
    title: attempt.assessment.title,
    bookTitle: attempt.assessment.book.title,
    chapter: attempt.assessment.chapter ? `Chapter ${attempt.assessment.chapter.chapterNumber}: ${attempt.assessment.chapter.title}` : null,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    pendingReview: attempt.result.subjectivePending,
    score: settings.showScore ? {
      totalMarks: attempt.result.totalMarks,
      awardedMarks: attempt.result.awardedMarks,
      percentage: attempt.result.percentage,
      provisional: attempt.result.provisional,
    } : null,
    counts: {
      correct: settings.showScore ? attempt.result.correctCount : null,
      wrong: settings.showScore ? attempt.result.wrongCount : null,
      skipped: attempt.result.skippedCount,
      subjectivePending: attempt.result.subjectivePending,
    },
    timeTakenSeconds: attempt.result.timeTakenSeconds,
    responses: attempt.responses.map((response, index) => ({
      questionNumber: index + 1,
      questionText: response.assessmentQuestion.questionText,
      questionType: normalizeAssessmentQuestionType(response.assessmentQuestion.questionType),
      studentAnswer: response.answer,
      correct: settings.showCorrectAnswers ? response.correct : null,
      correctAnswer: settings.showCorrectAnswers ? response.assessmentQuestion.correctAnswer : null,
      explanation: settings.showExplanations ? response.assessmentQuestion.explanation : null,
      reviewPending: response.reviewStatus === AssessmentReviewStatus.PENDING,
    })),
  };
}

export function assessmentErrorResponse(error: unknown) {
  if (error instanceof AssessmentError) return { status: error.status, message: error.message, code: error.code };
  return { status: 400, message: SAFE_UNAVAILABLE, code: "ASSESSMENT_UNAVAILABLE" };
}
