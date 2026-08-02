import "server-only";

import {
  AssessmentAttemptStatus,
  AssessmentResultRelease,
  AssessmentReviewStatus,
  AssessmentStatus,
  LearningActivityType,
  Prisma,
  UserRole,
} from "@prisma/client";
import { recordLearningActivity } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import {
  accountAuditActor,
  recordTrustedDeniedAudit,
  writeSecurityAuditEvent,
} from "@/lib/security-audit";
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
  sectionSubject: { select: { sectionId: true, id: true, subject: { select: { name: true } } } },
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
    await recordTrustedDeniedAudit({
      actor: accountAuditActor({ id: identity.student.userId, role: UserRole.STUDENT, publisherId: identity.publisher.id }),
      action: "classroom.assessment.update",
      targetType: "Assessment",
      targetId: assessmentId,
      reasonCode: "AUTHORIZATION_DENIED",
      metadata: { scope: "student_assessment", purpose: "attempt_denied" },
    });
    throw new AssessmentError();
  }
  const [book, entitlement] = await Promise.all([
    getStudentBook(assessment.bookId),
    getAssessmentFeatureDecision(identity.student.userId, identity.academicYear.id),
  ]);
  if (!book || book.sectionSubjectId !== assessment.sectionSubjectId || !entitlement.allowed) {
    await recordTrustedDeniedAudit({
      actor: accountAuditActor({ id: identity.student.userId, role: UserRole.STUDENT, publisherId: identity.publisher.id }),
      action: "classroom.assessment.update",
      targetType: "Assessment",
      targetId: assessmentId,
      reasonCode: "AUTHORIZATION_DENIED",
      metadata: { scope: "student_assessment", purpose: "attempt_denied" },
    });
    throw new AssessmentError(SAFE_UNAVAILABLE, 403);
  }
  return { identity, assessment, book, entitlement };
}

function releaseMessage(release: AssessmentResultRelease, dueAt: Date | null) {
  if (release === AssessmentResultRelease.IMMEDIATE) return "Result available immediately after submission.";
  if (release === AssessmentResultRelease.AFTER_DUE_DATE) {
    return dueAt
      ? "Result available after the assessment due date."
      : "Result is released after the configured assessment closing time.";
  }
  return "Result will be released by your teacher or school.";
}

function toAttemptStatus(status: AssessmentAttemptStatus) {
  if (status === AssessmentAttemptStatus.PENDING_REVIEW) return "Pending Teacher Review";
  if (status === AssessmentAttemptStatus.GRADED) return "Graded";
  return "Submitted";
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

function toAssessmentCard(assessment: Awaited<ReturnType<typeof prisma.assessment.findMany>>[number] & Record<string, unknown>, now: Date) {
  const row = assessment as unknown as {
    id: string;
    title: string;
    type: string;
    opensAt: Date | null;
    dueAt: Date | null;
    durationMinutes: number | null;
    book: { title: string };
    chapter: { chapterNumber: number; title: string } | null;
    sectionSubject: { id: string; subject: { name: string } };
    questions: Array<{ marks: number }>;
    attempts: Array<{ id: string; status: AssessmentAttemptStatus; submittedAt: Date | null; createdAt: Date; result: { id: string; percentage: number | null; publishedAt: Date | null } | null }>;
    settings: { resultRelease: AssessmentResultRelease; maxAttempts: number; showScore: boolean } | null;
  };

  const latestAttempt = row.attempts[0] ?? null;
  const attemptUsed = row.attempts.filter((attempt) => attempt.status !== AssessmentAttemptStatus.ABANDONED).length;
  const hasInProgress = row.attempts.some((attempt) => attempt.status === AssessmentAttemptStatus.IN_PROGRESS);
  const released = Boolean(
    latestAttempt?.result &&
      latestAttempt.result.publishedAt &&
      row.settings &&
      canReleaseAssessmentResult({ release: row.settings.resultRelease, dueAt: row.dueAt, now }),
  );

  const availability = hasInProgress
    ? "CONTINUE"
    : latestAttempt
      ? released ? "RESULT" : "COMPLETED"
      : row.opensAt && now < row.opensAt
        ? "UPCOMING"
        : row.dueAt && now >= row.dueAt ? "CLOSED" : "START";

  const tab = availability === "UPCOMING"
    ? "UPCOMING"
    : availability === "CONTINUE"
      ? "IN_PROGRESS"
      : availability === "COMPLETED" || availability === "RESULT"
        ? "COMPLETED"
        : "AVAILABLE";

  return {
    id: row.id,
    title: row.title,
    type: row.type,
    subjectName: row.sectionSubject.subject.name,
    sectionSubjectId: row.sectionSubject.id,
    bookTitle: row.book.title,
    chapter: row.chapter ? `Chapter ${row.chapter.chapterNumber}: ${row.chapter.title}` : null,
    opensAt: row.opensAt?.toISOString() ?? null,
    dueAt: row.dueAt?.toISOString() ?? null,
    durationMinutes: row.durationMinutes,
    totalQuestions: row.questions.length,
    totalMarks: row.questions.reduce((sum, question) => sum + question.marks, 0),
    availability,
    tab,
    attemptId: latestAttempt?.id ?? null,
    attemptsUsed: attemptUsed,
    attemptsAllowed: row.settings?.maxAttempts ?? 1,
    resultRelease: row.settings?.resultRelease ?? AssessmentResultRelease.NEVER,
    resultReleaseMessage: row.settings ? releaseMessage(row.settings.resultRelease, row.dueAt) : "Result policy unavailable.",
    scoreVisibleWhenReleased: Boolean(row.settings?.showScore),
    latestSubmittedAt: latestAttempt?.submittedAt?.toISOString() ?? null,
  };
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
        take: 20,
        select: {
          id: true,
          status: true,
          submittedAt: true,
          createdAt: true,
          result: { select: { id: true, percentage: true, publishedAt: true } },
        },
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

export async function getStudentAssessmentDetails(assessmentId: string) {
  const scope = await resolveAssessmentScope(assessmentId);
  const now = new Date();
  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      assessmentId,
      studentId: scope.identity.student.id,
      academicYearId: scope.identity.academicYear.id,
    },
    include: { result: true },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const active = [...attempts].reverse().find((attempt) => attempt.status === AssessmentAttemptStatus.IN_PROGRESS) ?? null;
  const completed = [...attempts]
    .filter((attempt) => attempt.status !== AssessmentAttemptStatus.IN_PROGRESS && attempt.status !== AssessmentAttemptStatus.ABANDONED)
    .reverse();
  const attemptsAllowed = scope.assessment.settings!.maxAttempts;
  const attemptsUsed = attempts.filter((attempt) => attempt.status !== AssessmentAttemptStatus.ABANDONED).length;
  const attemptsRemaining = Math.max(0, attemptsAllowed - attemptsUsed);

  const history = completed.map((attempt, index) => {
    const attemptNumber = attempts.length - index;
    const released = Boolean(
      attempt.result?.publishedAt &&
        canReleaseAssessmentResult({
          release: scope.assessment.settings!.resultRelease,
          dueAt: scope.assessment.dueAt,
          now,
        }),
    );
    return {
      attemptId: attempt.id,
      attemptNumber,
      status: toAttemptStatus(attempt.status),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      released,
      score: released && scope.assessment.settings!.showScore ? attempt.result?.percentage ?? null : null,
      canViewResult: released,
    };
  });

  const latestCompleted = history[0] ?? null;
  const startState = active
    ? "CONTINUE"
    : scope.assessment.opensAt && now < scope.assessment.opensAt
      ? "UPCOMING"
      : scope.assessment.dueAt && now >= scope.assessment.dueAt
        ? "CLOSED"
        : attemptsUsed >= attemptsAllowed
          ? "ATTEMPT_LIMIT"
          : "START";

  return {
    id: scope.assessment.id,
    title: scope.assessment.title,
    subjectName: scope.assessment.sectionSubject.subject.name,
    chapter: scope.assessment.chapter
      ? `Chapter ${scope.assessment.chapter.chapterNumber}: ${scope.assessment.chapter.title}`
      : null,
    type: scope.assessment.type,
    instructions: scope.assessment.instructions,
    totalQuestions: scope.assessment.questions.length,
    totalMarks: scope.assessment.questions.reduce((sum, question) => sum + question.marks, 0),
    durationMinutes: scope.assessment.durationMinutes,
    opensAt: scope.assessment.opensAt?.toISOString() ?? null,
    dueAt: scope.assessment.dueAt?.toISOString() ?? null,
    attemptsAllowed,
    attemptsUsed,
    attemptsRemaining,
    resultRelease: scope.assessment.settings!.resultRelease,
    resultReleaseMessage: releaseMessage(scope.assessment.settings!.resultRelease, scope.assessment.dueAt),
    showScore: scope.assessment.settings!.showScore,
    showCorrectAnswers: scope.assessment.settings!.showCorrectAnswers,
    showExplanations: scope.assessment.settings!.showExplanations,
    revisitAllowed: true,
    shuffled: false,
    startState,
    activeAttemptId: active?.id ?? null,
    latestCompleted,
    history,
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
      await writeSecurityAuditEvent(tx, {
        actor: accountAuditActor({ id: scope.identity.student.userId!, role: UserRole.STUDENT, publisherId: scope.identity.publisher.id }),
        action: "classroom.assessment.update",
        targetType: "Assessment",
        targetId: scope.assessment.id,
        outcome: "SUCCESS",
        metadata: { scope: "student_assessment", purpose: "attempt_start" },
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
      student: { select: { userId: true } },
      result: true,
      assessment: { include: assessmentInclude },
      responses: { orderBy: { assessmentQuestion: { sequence: "asc" } }, include: { assessmentQuestion: { select: assessmentQuestionSelect } } },
    },
  });
  if (!attempt || attempt.assessment.sectionId !== identity.enrollment.sectionId) throw new AssessmentError(SAFE_UNAVAILABLE, 404);
  const scope = await resolveAssessmentScope(attempt.assessmentId);
  if (scope.assessment.sectionSubjectId !== attempt.assessment.sectionSubjectId) {
    if (identity.student.userId) {
      await recordTrustedDeniedAudit({
        actor: accountAuditActor({ id: identity.student.userId, role: UserRole.STUDENT, publisherId: identity.publisher.id }),
        action: "classroom.assessment.update",
        targetType: "Assessment",
        targetId: attempt.assessmentId,
        reasonCode: "AUTHORIZATION_DENIED",
        metadata: { scope: "student_assessment", purpose: "attempt_denied" },
      });
    }
    throw new AssessmentError(SAFE_UNAVAILABLE, 404);
  }
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
    await prisma.$transaction(async (tx) => {
      await tx.assessmentResponse.update({
        where: { id: response.id },
        data: { answer: Prisma.DbNull, autoGraded: false, correct: null, marksAwarded: null, reviewStatus: AssessmentReviewStatus.NOT_REQUIRED, answeredAt: null },
      });
      if (attempt.student.userId) {
        await writeSecurityAuditEvent(tx, {
          actor: accountAuditActor({ id: attempt.student.userId, role: UserRole.STUDENT, publisherId: attempt.publisherId }),
          action: "classroom.assessment.update",
          targetType: "Assessment",
          targetId: attempt.assessmentId,
          outcome: "SUCCESS",
          metadata: { scope: "student_assessment", purpose: "response_save" },
        });
      }
    });
    return { saved: true, cleared: true };
  }
  const grade = gradeAssessmentAnswer(response.assessmentQuestion as AssessmentQuestionSnapshot, input.answer);
  if (!grade.ok) throw new AssessmentError(SAFE_SAVE_ERROR);
  await prisma.$transaction(async (tx) => {
    await tx.assessmentResponse.update({
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
    if (attempt.student.userId) {
      await writeSecurityAuditEvent(tx, {
        actor: accountAuditActor({ id: attempt.student.userId, role: UserRole.STUDENT, publisherId: attempt.publisherId }),
        action: "classroom.assessment.update",
        targetType: "Assessment",
        targetId: attempt.assessmentId,
        outcome: "SUCCESS",
        metadata: { scope: "student_assessment", purpose: "response_save" },
      });
    }
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
        student: { select: { userId: true } },
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
    const result = await tx.assessmentResult.create({ data: { attemptId: attempt.id, ...summary, publishedAt: null } });
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
      // Assessment performance analytics become final only after teacher publication.
      provisional: true,
      scorePercent: null,
      durationSeconds: result.timeTakenSeconds,
    });
    if (attempt.student.userId) {
      await writeSecurityAuditEvent(tx, {
        actor: accountAuditActor({ id: attempt.student.userId, role: UserRole.STUDENT, publisherId: attempt.publisherId }),
        action: "classroom.assessment.update",
        targetType: "Assessment",
        targetId: attempt.assessmentId,
        outcome: "SUCCESS",
        metadata: { scope: "student_assessment", purpose: timedOut ? "attempt_auto_submit" : "attempt_submit" },
      });
    }
    return { result, studentId: attempt.studentId, academicYearId: attempt.academicYearId, assessmentId: attempt.assessmentId, attemptId: attempt.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (!outcome) return null;
  return outcome.result;
}

export async function getStudentAssessmentResult(attemptId: string) {
  const attempt = await loadOwnedAssessmentAttempt(attemptId);
  if (attempt.status === AssessmentAttemptStatus.IN_PROGRESS || !attempt.result || !attempt.assessment.settings) throw new AssessmentError(SAFE_UNAVAILABLE, 404);
  const settings = attempt.assessment.settings;
  if (!attempt.result.publishedAt) {
    return {
      state: "HELD" as const,
      title: attempt.assessment.title,
      message: "Your result is pending teacher publication.",
    };
  }
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

  const attemptNumber = await prisma.assessmentAttempt.count({
    where: {
      assessmentId: attempt.assessmentId,
      studentId: attempt.studentId,
      createdAt: { lte: attempt.createdAt },
    },
  });

  return {
    state: "AVAILABLE" as const,
    title: attempt.assessment.title,
    bookTitle: attempt.assessment.book.title,
    chapter: attempt.assessment.chapter ? `Chapter ${attempt.assessment.chapter.chapterNumber}: ${attempt.assessment.chapter.title}` : null,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    attemptNumber,
    reviewStatus: toAttemptStatus(attempt.status),
    resultReleaseMessage: releaseMessage(settings.resultRelease, attempt.assessment.dueAt),
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
