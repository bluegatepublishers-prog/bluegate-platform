import "server-only";

import { LearningActivityType, PlatformFeatureKey, PracticeAttemptStatus, Prisma } from "@prisma/client";
import { recordLearningActivity } from "@/lib/analytics";
import { refreshLearningSupportBestEffort } from "@/lib/learning-support";
import { completeMatchingRemedialSteps } from "@/lib/remedials/completion";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student-dashboard";
import { getStudentBook } from "@/lib/student-books";
import { getPremiumFeatureEntitlementForAuthenticatedUser } from "@/lib/entitlements/features";
import {
  calculatePracticeResult,
  gradePracticeAnswer,
  isSupportedPracticeQuestion,
  selectPracticeQuestions,
  toSafePracticeQuestion,
  type PracticeQuestionCandidate,
} from "@/lib/student-practice-policy";

export const PRACTICE_FEATURE = PlatformFeatureKey.INTERACTIVE_QUIZZES;

class PracticeError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

const questionSelect = {
  id: true, bookId: true, chapterId: true, questionType: true, questionText: true,
  options: true, correctAnswer: true, explanation: true, marks: true, approved: true, createdAt: true,
} satisfies Prisma.BookQuestionSelect;

async function resolvePracticeScope(bookId: string, chapterId: string) {
  const identity = await requireStudent();
  const book = await getStudentBook(bookId);
  if (!book || !identity.student.userId) throw new PracticeError("This practice activity is not available for your account.", 404);
  const entitlement = await getPremiumFeatureEntitlementForAuthenticatedUser(
    { id: identity.student.userId, role: "STUDENT" },
    { feature: "INTERACTIVE_QUIZZES", academicYearId: identity.academicYear.id },
  );
  const chapter = await prisma.bookChapter.findFirst({ where: { id: chapterId, bookId, approved: true }, select: { id: true, title: true, chapterNumber: true } });
  if (!chapter) throw new PracticeError("This practice activity is not available for your account.", 404);
  return { identity, book, chapter, entitlement };
}

export async function getStudentPracticeAvailability(bookId: string, chapterId: string) {
  try {
    const scope = await resolvePracticeScope(bookId, chapterId);
    if (!scope.entitlement.allowed) return { state: "LOCKED" as const, basic: scope.identity.effectivePlan.plan === "SCHOOL_BASIC" };
    const [supported, active, submitted] = await Promise.all([
      loadSelectedQuestions(bookId, chapterId, 1),
      prisma.studentPracticeAttempt.findFirst({ where: { studentId: scope.identity.student.id, academicYearId: scope.identity.academicYear.id, chapterId, status: PracticeAttemptStatus.IN_PROGRESS }, select: { id: true } }),
      prisma.studentPracticeAttempt.findFirst({ where: { studentId: scope.identity.student.id, academicYearId: scope.identity.academicYear.id, chapterId, status: PracticeAttemptStatus.SUBMITTED }, orderBy: { submittedAt: "desc" }, select: { id: true } }),
    ]);
    if (active) return { state: "CONTINUE" as const, attemptId: active.id };
    if (!supported.length) return { state: "EMPTY" as const };
    if (submitted) return { state: "RETRY" as const, resultAttemptId: submitted.id };
    return { state: "START" as const };
  } catch (error) {
    if (error instanceof PracticeError) return { state: "UNAVAILABLE" as const };
    throw error;
  }
}

async function loadSelectedQuestions(bookId: string, chapterId: string, requestedCount: unknown) {
  const rows = await prisma.bookQuestion.findMany({
    where: { bookId, chapterId, approved: true, questionType: { in: ["MCQ", "TRUE_FALSE", "FILL_BLANK"] } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: questionSelect,
    take: 20,
  });
  return selectPracticeQuestions(rows as PracticeQuestionCandidate[], { bookId, chapterId, requestedCount });
}

export async function startStudentPractice(input: { bookId: string; chapterId: string; requestedCount?: unknown }) {
  const scope = await resolvePracticeScope(input.bookId, input.chapterId);
  if (!scope.entitlement.allowed) throw new PracticeError("This practice activity is not available for your account.", 403);
  const key = { studentId: scope.identity.student.id, academicYearId: scope.identity.academicYear.id, chapterId: input.chapterId, status: PracticeAttemptStatus.IN_PROGRESS };
  const existing = await prisma.studentPracticeAttempt.findFirst({ where: key, select: { id: true } });
  if (existing) return { attemptId: existing.id, resumed: true };
  const questions = await loadSelectedQuestions(input.bookId, input.chapterId, input.requestedCount);
  if (!questions.length) throw new PracticeError("No practice questions are available for this chapter yet.", 404);
  try {
    const attempt = await prisma.$transaction(async (tx) => {
      const created = await tx.studentPracticeAttempt.create({
        data: {
          studentId: scope.identity.student.id,
          bookId: input.bookId,
          chapterId: input.chapterId,
          academicYearId: scope.identity.academicYear.id,
          totalQuestions: questions.length,
          totalMarks: questions.reduce((sum, question) => sum + question.marks, 0),
          responses: { create: questions.map((question) => ({ questionId: question.id })) },
        },
        select: { id: true },
      });
      const book = await tx.book.findUnique({ where: { id: input.bookId }, select: { subjectId: true } });
      if (!book) throw new PracticeError("This practice activity is not available for your account.");
      await recordLearningActivity(tx, {
        eventKey: `practice:${created.id}:started`, publisherId: scope.identity.publisher.id, schoolId: scope.identity.school.id,
        studentId: scope.identity.student.id, academicYearId: scope.identity.academicYear.id, activityType: LearningActivityType.PRACTICE,
        title: `Started practice for ${scope.chapter.title}`, sourceType: "StudentPracticeAttempt", sourceId: created.id, occurredAt: new Date(),
        subjectId: book.subjectId, bookId: input.bookId, chapterId: input.chapterId, completed: false,
      });
      return created;
    });
    return { attemptId: attempt.id, resumed: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const active = await prisma.studentPracticeAttempt.findFirst({ where: key, select: { id: true } });
      if (active) return { attemptId: active.id, resumed: true };
    }
    throw error;
  }
}

async function loadOwnedAttempt(attemptId: string) {
  const identity = await requireStudent();
  const attempt = await prisma.studentPracticeAttempt.findFirst({
    where: { id: attemptId, studentId: identity.student.id, academicYearId: identity.academicYear.id },
    include: { book: { select: { title: true } }, chapter: { select: { title: true, chapterNumber: true } }, responses: { orderBy: { createdAt: "asc" }, include: { question: { select: questionSelect } } } },
  });
  if (!attempt) throw new PracticeError("This practice activity is not available for your account.", 404);
  const scope = await resolvePracticeScope(attempt.bookId, attempt.chapterId);
  if (!scope.entitlement.allowed) {
    throw new PracticeError("This practice activity is not available for your account.", 403);
  }
  if (
    attempt.responses.some(
      (response) =>
        response.question.bookId !== attempt.bookId ||
        response.question.chapterId !== attempt.chapterId ||
        !isSupportedPracticeQuestion(response.question as PracticeQuestionCandidate),
    )
  ) {
    throw new PracticeError("This practice activity is not available for your account.", 404);
  }
  return attempt;
}

export async function getStudentPracticeAttempt(attemptId: string) {
  const attempt = await loadOwnedAttempt(attemptId);
  return {
    id: attempt.id, status: attempt.status, bookTitle: attempt.book.title,
    chapterTitle: attempt.chapter.title, chapterNumber: attempt.chapter.chapterNumber,
    questions: attempt.responses.map((response, index) => ({
      ...toSafePracticeQuestion(response.question as PracticeQuestionCandidate, index + 1),
      answered: response.answeredAt !== null,
      studentAnswer: response.answeredAt ? response.answer : null,
      feedback: response.answeredAt ? { correct: response.correct === true, correctAnswer: response.question.correctAnswer, explanation: response.question.explanation } : null,
    })),
  };
}

export async function answerStudentPractice(input: { attemptId: string; questionId: string; answer: unknown }) {
  const attempt = await loadOwnedAttempt(input.attemptId);
  if (attempt.status !== PracticeAttemptStatus.IN_PROGRESS) throw new PracticeError("We could not save your answer. Please try again.");
  const response = attempt.responses.find((item) => item.questionId === input.questionId);
  if (!response || response.answeredAt) throw new PracticeError("We could not save your answer. Please try again.");
  const grade = gradePracticeAnswer(response.question as PracticeQuestionCandidate, input.answer);
  if (!grade.ok) throw new PracticeError(grade.message);
  await prisma.$transaction(async (tx) => {
    const updated = await tx.studentPracticeResponse.updateMany({ where: { id: response.id, answeredAt: null }, data: { answer: grade.answer as Prisma.InputJsonValue, correct: grade.correct, marksAwarded: grade.marksAwarded, answeredAt: new Date() } });
    if (updated.count !== 1) throw new PracticeError("We could not save your answer. Please try again.");
    await tx.studentPracticeAttempt.update({ where: { id: attempt.id }, data: { attemptedCount: { increment: 1 }, correctCount: { increment: grade.correct ? 1 : 0 }, marksAwarded: { increment: grade.marksAwarded } } });
  });
  return { correct: grade.correct, correctAnswer: response.question.correctAnswer!, explanation: response.question.explanation };
}

export async function submitStudentPractice(attemptId: string) {
  const attempt = await loadOwnedAttempt(attemptId);
  if (attempt.status !== PracticeAttemptStatus.IN_PROGRESS) throw new PracticeError("This practice activity is not available for your account.");
  if (attempt.responses.some((response) => !response.answeredAt)) throw new PracticeError("Please answer all questions before submitting.");
  const result = calculatePracticeResult(attempt.responses);
  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const submitted = await tx.studentPracticeAttempt.updateMany({ where: { id: attempt.id, status: PracticeAttemptStatus.IN_PROGRESS }, data: { ...result, status: PracticeAttemptStatus.SUBMITTED, submittedAt: now } });
    if (submitted.count !== 1) throw new PracticeError("This practice activity is not available for your account.");
    const context = await tx.student.findUnique({ where: { id: attempt.studentId }, select: { schoolId: true, school: { select: { publisherId: true } } } });
    const book = await tx.book.findUnique({ where: { id: attempt.bookId }, select: { subjectId: true } });
    if (!context?.school.publisherId || !book) throw new PracticeError("This practice activity is not available for your account.");
    await recordLearningActivity(tx, {
      eventKey: `practice:${attempt.id}:submitted`,
      publisherId: context.school.publisherId,
      schoolId: context.schoolId,
      studentId: attempt.studentId,
      academicYearId: attempt.academicYearId,
      activityType: LearningActivityType.PRACTICE,
      title: `Practised ${attempt.chapter.title}`,
      sourceType: "StudentPracticeAttempt",
      sourceId: attempt.id,
      occurredAt: now,
      subjectId: book.subjectId,
      bookId: attempt.bookId,
      chapterId: attempt.chapterId,
      completed: true,
      scorePercent: result.scorePercent,
      durationSeconds: Math.max(0, Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000)),
    });
  });
  await completeMatchingRemedialSteps({ studentId: attempt.studentId, academicYearId: attempt.academicYearId, type: "INTERACTIVE_PRACTICE", bookId: attempt.bookId, chapterId: attempt.chapterId, sourceId: attempt.id });
  await refreshLearningSupportBestEffort({ studentId: attempt.studentId, academicYearId: attempt.academicYearId });
  return { attemptId: attempt.id };
}

export async function getStudentPracticeResult(attemptId: string) {
  const attempt = await loadOwnedAttempt(attemptId);
  if (attempt.status !== PracticeAttemptStatus.SUBMITTED) throw new PracticeError("This practice activity is not available for your account.", 404);
  return {
    id: attempt.id, bookId: attempt.bookId, chapterId: attempt.chapterId,
    bookTitle: attempt.book.title, chapterTitle: attempt.chapter.title, chapterNumber: attempt.chapter.chapterNumber,
    attemptedCount: attempt.attemptedCount, correctCount: attempt.correctCount, totalQuestions: attempt.totalQuestions,
    scorePercent: attempt.scorePercent ?? 0,
    responses: attempt.responses.filter((response) => response.answeredAt).map((response, index) => ({
      questionNumber: index + 1, questionText: response.question.questionText, studentAnswer: response.answer,
      correct: response.correct === true, correctAnswer: response.question.correctAnswer!, explanation: response.question.explanation,
    })),
  };
}

export function practiceErrorResponse(error: unknown) {
  if (error instanceof PracticeError) return { status: error.status, message: error.message };
  return { status: 400, message: "This practice activity is not available for your account." };
}
