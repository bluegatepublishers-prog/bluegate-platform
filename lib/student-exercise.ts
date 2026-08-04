import "server-only";

import {
  AssessmentReviewStatus,
  LearningActivityType,
  PlatformFeatureKey,
  PracticeAttemptStatus,
  Prisma,
  type ResourceType,
} from "@prisma/client";

import { recordLearningActivity } from "@/lib/analytics";
import { requireTeacherClass } from "@/lib/classroom";
import { getPremiumFeatureEntitlementForAuthenticatedUser } from "@/lib/entitlements/features";
import { parseInstructionText } from "@/lib/exercise-authoring-types";
import { refreshLearningSupportBestEffort } from "@/lib/learning-support";
import { prisma } from "@/lib/prisma";
import { completeMatchingRemedialSteps } from "@/lib/remedials/completion";
import { getStudentBook } from "@/lib/student-books";
import { requireStudent } from "@/lib/student-dashboard";

const AUTO_CHECKED_TYPES = ["MCQ", "TRUE_FALSE", "FILL_BLANK", "VERY_SHORT"] as const;
type AutoCheckedQuestionType = (typeof AUTO_CHECKED_TYPES)[number];

type ExerciseQuestionRecord = {
  id: string;
  exerciseGroupId: string | null;
  questionType: string;
  questionText: string;
  options: Prisma.JsonValue | null;
  correctAnswer: string | null;
  explanation: string | null;
  marks: number;
  difficulty: string;
  imageResource: {
    id: string;
    title: string;
    fileUrl: string;
    thumbnail: string | null;
    type: ResourceType;
  } | null;
};

type AttemptResponseRecord = {
  id: string;
  questionId: string;
  answer: Prisma.JsonValue | null;
  autoGraded: boolean;
  correct: boolean | null;
  marksAwarded: number | null;
  reviewStatus: AssessmentReviewStatus;
  feedback: string | null;
  answeredAt: Date | null;
  reviewedAt: Date | null;
  question: ExerciseQuestionRecord;
};

class StudentExerciseError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

const questionSelect = {
  id: true,
  exerciseGroupId: true,
  questionType: true,
  questionText: true,
  options: true,
  correctAnswer: true,
  explanation: true,
  marks: true,
  difficulty: true,
  imageResource: {
    select: {
      id: true,
      title: true,
      fileUrl: true,
      thumbnail: true,
      type: true,
    },
  },
} satisfies Prisma.BookQuestionSelect;

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCompare(value: string) {
  return normalizeText(value).toLocaleLowerCase("en");
}

function parseMcqOptions(value: Prisma.JsonValue | null) {
  if (!Array.isArray(value)) return [];
  return value
    .map((option) => {
      if (option && typeof option === "object" && !Array.isArray(option)) {
        const id = typeof option.id === "string" ? option.id.trim() : "";
        const label = typeof option.label === "string" ? option.label.trim() : "";
        return id && label ? { id, label } : null;
      }
      if (typeof option === "string") {
        const label = option.trim();
        return label ? { id: label, label } : null;
      }
      return null;
    })
    .filter((option): option is { id: string; label: string } => Boolean(option));
}

function parseAcceptedAnswers(question: ExerciseQuestionRecord) {
  const answers = new Set<string>();
  if (Array.isArray(question.options)) {
    for (const option of question.options) {
      if (typeof option === "string" && option.trim()) {
        answers.add(normalizeCompare(option));
      }
    }
  }
  if (question.correctAnswer?.trim()) answers.add(normalizeCompare(question.correctAnswer));
  return [...answers];
}

function isAutoCheckedType(type: string): type is AutoCheckedQuestionType {
  return AUTO_CHECKED_TYPES.includes(type as AutoCheckedQuestionType);
}

function coerceDraftAnswer(
  question: ExerciseQuestionRecord,
  answer: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (answer === null || answer === undefined) return Prisma.JsonNull;
  if (question.questionType === "TRUE_FALSE") {
    if (typeof answer === "boolean") return answer;
    if (typeof answer === "string") {
      const normalized = normalizeCompare(answer);
      if (normalized === "true") return true;
      if (normalized === "false") return false;
    }
    throw new StudentExerciseError("We could not save that answer. Please try again.");
  }
  if (typeof answer !== "string") {
    throw new StudentExerciseError("We could not save that answer. Please try again.");
  }
  const normalized = normalizeText(answer);
  return normalized ? normalized : Prisma.JsonNull;
}

function gradeAutoCheckedQuestion(
  question: ExerciseQuestionRecord,
  answer: Prisma.JsonValue | Prisma.InputJsonValue | typeof Prisma.JsonNull | null,
) {
  if (!isAutoCheckedType(question.questionType) || answer === null) {
    return {
      autoGraded: false,
      correct: null,
      marksAwarded: null,
      reviewStatus: AssessmentReviewStatus.NOT_REQUIRED,
    };
  }
  if (question.questionType === "MCQ") {
    if (typeof answer !== "string") throw new StudentExerciseError("We could not save that answer. Please try again.");
    const options = parseMcqOptions(question.options);
    const selected = options.find(
      (option) =>
        normalizeCompare(option.id) === normalizeCompare(answer) ||
        normalizeCompare(option.label) === normalizeCompare(answer),
    );
    if (!selected) throw new StudentExerciseError("We could not save that answer. Please try again.");
    const target = question.correctAnswer?.trim() ?? "";
    const correct =
      normalizeCompare(selected.id) === normalizeCompare(target) ||
      normalizeCompare(selected.label) === normalizeCompare(target);
    return {
      autoGraded: true,
      correct,
      marksAwarded: correct ? question.marks : 0,
      reviewStatus: AssessmentReviewStatus.NOT_REQUIRED,
    };
  }
  if (question.questionType === "TRUE_FALSE") {
    const answerValue = typeof answer === "boolean" ? String(answer) : String(answer);
    const correct = normalizeCompare(answerValue) === normalizeCompare(question.correctAnswer ?? "");
    return {
      autoGraded: true,
      correct,
      marksAwarded: correct ? question.marks : 0,
      reviewStatus: AssessmentReviewStatus.NOT_REQUIRED,
    };
  }
  if (typeof answer !== "string") throw new StudentExerciseError("We could not save that answer. Please try again.");
  const accepted = parseAcceptedAnswers(question);
  const candidate = normalizeCompare(answer);
  const correct = accepted.includes(candidate);
  return {
    autoGraded: true,
    correct,
    marksAwarded: correct ? question.marks : 0,
    reviewStatus: AssessmentReviewStatus.NOT_REQUIRED,
  };
}

function classifyQuestion(
  question: ExerciseQuestionRecord,
  answer: Prisma.JsonValue | Prisma.InputJsonValue | typeof Prisma.JsonNull | null,
) {
  if (answer === null) {
    return {
      autoGraded: false,
      correct: null,
      marksAwarded: null,
      reviewStatus: AssessmentReviewStatus.NOT_REQUIRED,
      answeredAt: null as Date | null,
    };
  }
  if (isAutoCheckedType(question.questionType)) {
    return {
      ...gradeAutoCheckedQuestion(question, answer),
      answeredAt: new Date(),
    };
  }
  return {
    autoGraded: false,
    correct: null,
    marksAwarded: null,
    reviewStatus: AssessmentReviewStatus.PENDING,
    answeredAt: new Date(),
  };
}

function aggregateAttempt(responses: AttemptResponseRecord[]) {
  const attemptedCount = responses.filter((response) => response.answeredAt !== null).length;
  const correctCount = responses.filter((response) => response.correct === true).length;
  const totalMarks = responses.reduce((sum, response) => sum + response.question.marks, 0);
  const marksAwarded = responses.reduce((sum, response) => sum + (response.marksAwarded ?? 0), 0);
  const pendingReviewCount = responses.filter((response) => response.reviewStatus === AssessmentReviewStatus.PENDING).length;
  return {
    attemptedCount,
    correctCount,
    totalMarks,
    marksAwarded,
    pendingReviewCount,
    scorePercent: totalMarks ? Math.round((marksAwarded / totalMarks) * 10000) / 100 : 0,
  };
}

async function resolveStudentExerciseScope(input: {
  bookId: string;
  chapterId: string;
  exerciseId: string;
}) {
  const identity = await requireStudent();
  const book = await getStudentBook(input.bookId);
  if (!book || !identity.student.userId) {
    throw new StudentExerciseError("This exercise is not available for your account.", 404);
  }
  const entitlement = await getPremiumFeatureEntitlementForAuthenticatedUser(
    { id: identity.student.userId, role: "STUDENT" },
    { feature: PlatformFeatureKey.INTERACTIVE_QUIZZES, academicYearId: identity.academicYear.id },
  );
  const exercise = await prisma.bookExercise.findFirst({
    where: {
      id: input.exerciseId,
      bookId: input.bookId,
      chapterId: input.chapterId,
      published: true,
      archived: false,
      chapter: { published: true, approved: true, archived: false },
      book: { publisherId: identity.publisher.id, published: true, archived: false },
    },
    select: {
      id: true,
      title: true,
      instructions: true,
      type: true,
      estimatedMinutes: true,
      marks: true,
      chapterId: true,
      bookId: true,
      questions: {
        where: { archived: false, approved: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: questionSelect,
      },
      questionGroups: {
        where: { active: true },
        select: { id: true, title: true, instructions: true, sortOrder: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      },
      chapter: { select: { id: true, title: true, chapterNumber: true } },
      book: { select: { title: true, subjectId: true } },
    },
  });
  if (!exercise) {
    throw new StudentExerciseError("This exercise is not available for your account.", 404);
  }
  return { identity, book, entitlement, exercise };
}

async function loadOwnedExerciseAttempt(attemptId: string) {
  const identity = await requireStudent();
  const attempt = await prisma.studentPracticeAttempt.findFirst({
    where: {
      id: attemptId,
      studentId: identity.student.id,
      academicYearId: identity.academicYear.id,
      exerciseId: { not: null },
    },
    include: {
      book: { select: { title: true, subjectId: true } },
      chapter: { select: { id: true, title: true, chapterNumber: true } },
      exercise: {
        select: {
          id: true,
          title: true,
          type: true,
          instructions: true,
          estimatedMinutes: true,
          published: true,
          archived: true,
          questionGroups: {
            where: { active: true },
            select: { id: true, title: true, instructions: true, sortOrder: true },
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          },
        },
      },
      responses: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: { question: { select: questionSelect } },
      },
    },
  });
  if (!attempt?.exerciseId || !attempt.exercise || !attempt.exercise.published || attempt.exercise.archived) {
    throw new StudentExerciseError("This exercise is not available for your account.", 404);
  }
  const scope = await resolveStudentExerciseScope({
    bookId: attempt.bookId,
    chapterId: attempt.chapterId,
    exerciseId: attempt.exerciseId,
  });
  if (!scope.entitlement.allowed) {
    throw new StudentExerciseError("This exercise is not available for your account.", 403);
  }
  return { attempt, scope };
}

function toStudentQuestion(response: AttemptResponseRecord, index: number) {
  return {
    responseId: response.id,
    questionId: response.questionId,
    questionNumber: index + 1,
    questionType: response.question.questionType,
    questionText: response.question.questionText,
    options: parseMcqOptions(response.question.options),
    acceptedAnswers:
      response.question.questionType === "FILL_BLANK" || response.question.questionType === "VERY_SHORT"
        ? parseAcceptedAnswers(response.question)
        : [],
    marks: response.question.marks,
    difficulty: response.question.difficulty,
    imageResource: response.question.imageResource,
    answer: response.answer,
    answered: response.answeredAt !== null,
    autoGraded: response.autoGraded,
    reviewStatus: response.reviewStatus,
    marksAwarded: response.marksAwarded,
    feedback: response.feedback,
  };
}

export async function getStudentExerciseEntry(input: {
  bookId: string;
  chapterId: string;
  exerciseId: string;
}) {
  const scope = await resolveStudentExerciseScope(input);
  const { identity, exercise, entitlement } = scope;
  const [activeAttempt, lastAttempt] = await Promise.all([
    prisma.studentPracticeAttempt.findFirst({
      where: {
        studentId: identity.student.id,
        academicYearId: identity.academicYear.id,
        exerciseId: input.exerciseId,
        status: PracticeAttemptStatus.IN_PROGRESS,
      },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.studentPracticeAttempt.findFirst({
      where: {
        studentId: identity.student.id,
        academicYearId: identity.academicYear.id,
        exerciseId: input.exerciseId,
        status: { in: [PracticeAttemptStatus.AUTO_CHECKED, PracticeAttemptStatus.NEEDS_REVIEW, PracticeAttemptStatus.REVIEWED] },
      },
      select: {
        id: true,
        status: true,
        scorePercent: true,
        marksAwarded: true,
        totalMarks: true,
        submittedAt: true,
      },
      orderBy: { submittedAt: "desc" },
    }),
  ]);
  return {
    entitled: entitlement.allowed,
    basic: identity.effectivePlan.plan === "SCHOOL_BASIC",
    bookId: input.bookId,
    chapterId: input.chapterId,
    exercise: {
      id: exercise.id,
      title: exercise.title,
      type: exercise.type,
      instructions: parseInstructionText(exercise.instructions),
      estimatedMinutes: exercise.estimatedMinutes,
      marks: exercise.questions.reduce((sum, question) => sum + question.marks, 0),
      totalQuestions: exercise.questions.length,
      chapterTitle: exercise.chapter.title,
      chapterNumber: exercise.chapter.chapterNumber,
      bookTitle: exercise.book.title,
    },
    activeAttemptId: activeAttempt?.id ?? null,
    lastAttempt,
  };
}

export async function startStudentExerciseAttempt(input: {
  bookId: string;
  chapterId: string;
  exerciseId: string;
}) {
  const scope = await resolveStudentExerciseScope(input);
  if (!scope.entitlement.allowed) {
    throw new StudentExerciseError("This exercise is not available for your account.", 403);
  }
  if (!scope.exercise.questions.length) {
    throw new StudentExerciseError("This exercise does not have any published questions yet.", 404);
  }
  const existing = await prisma.studentPracticeAttempt.findFirst({
    where: {
      studentId: scope.identity.student.id,
      academicYearId: scope.identity.academicYear.id,
      exerciseId: input.exerciseId,
      status: PracticeAttemptStatus.IN_PROGRESS,
    },
    select: { id: true },
  });
  if (existing) return { attemptId: existing.id, resumed: true };
  const totalMarks = scope.exercise.questions.reduce((sum, question) => sum + question.marks, 0);
  const attempt = await prisma.$transaction(async (tx) => {
    const created = await tx.studentPracticeAttempt.create({
      data: {
        studentId: scope.identity.student.id,
        bookId: input.bookId,
        chapterId: input.chapterId,
        exerciseId: input.exerciseId,
        academicYearId: scope.identity.academicYear.id,
        totalQuestions: scope.exercise.questions.length,
        totalMarks,
        responses: {
          create: scope.exercise.questions.map((question) => ({ questionId: question.id })),
        },
      },
      select: { id: true },
    });
    await recordLearningActivity(tx, {
      eventKey: `exercise:${created.id}:started`,
      publisherId: scope.identity.publisher.id,
      schoolId: scope.identity.school.id,
      studentId: scope.identity.student.id,
      academicYearId: scope.identity.academicYear.id,
      activityType: LearningActivityType.PRACTICE,
      title: `Started exercise ${scope.exercise.title}`,
      sourceType: "StudentPracticeAttempt",
      sourceId: created.id,
      occurredAt: new Date(),
      subjectId: scope.exercise.book.subjectId,
      bookId: input.bookId,
      chapterId: input.chapterId,
      completed: false,
    });
    return created;
  });
  return { attemptId: attempt.id, resumed: false };
}

export async function getStudentExerciseAttempt(attemptId: string) {
  const { attempt } = await loadOwnedExerciseAttempt(attemptId);
  const exercise = attempt.exercise;
  if (!exercise) {
    throw new StudentExerciseError("This exercise is not available for your account.", 404);
  }
  return {
    id: attempt.id,
    status: attempt.status,
    savedAt: attempt.updatedAt.toISOString(),
    bookTitle: attempt.book.title,
    chapterTitle: attempt.chapter.title,
    chapterNumber: attempt.chapter.chapterNumber,
    exerciseTitle: exercise.title,
    instructions: parseInstructionText(exercise.instructions),
    groups: exercise.questionGroups,
    totalQuestions: attempt.totalQuestions,
    attemptedCount: attempt.attemptedCount,
    questions: attempt.responses.map((response, index) => toStudentQuestion(response, index)),
  };
}

export async function saveStudentExerciseDraft(input: {
  attemptId: string;
  responses: { questionId: string; answer: unknown }[];
}) {
  const { attempt } = await loadOwnedExerciseAttempt(input.attemptId);
  if (attempt.status !== PracticeAttemptStatus.IN_PROGRESS) {
    throw new StudentExerciseError("This exercise can no longer be edited.", 409);
  }
  const responseMap = new Map(attempt.responses.map((response) => [response.questionId, response]));
  const touchedIds = new Set<string>();
  await prisma.$transaction(async (tx) => {
    for (const item of input.responses) {
      const current = responseMap.get(item.questionId);
      if (!current) {
        throw new StudentExerciseError("We could not save that answer. Please try again.");
      }
      const answer = coerceDraftAnswer(current.question, item.answer);
      const classified =
        answer === Prisma.JsonNull
          ? {
              autoGraded: false,
              correct: null,
              marksAwarded: null,
              reviewStatus: AssessmentReviewStatus.NOT_REQUIRED,
              answeredAt: null,
            }
          : classifyQuestion(current.question, answer);
      await tx.studentPracticeResponse.update({
        where: { id: current.id },
        data: {
          answer,
          autoGraded: classified.autoGraded,
          correct: classified.correct,
          marksAwarded: classified.marksAwarded,
          reviewStatus: classified.reviewStatus,
          answeredAt: classified.answeredAt,
          feedback: null,
          reviewedAt: null,
          reviewedByTeacherId: null,
        },
      });
      touchedIds.add(current.id);
    }
  });
  const refreshed = await prisma.studentPracticeResponse.findMany({
    where: { attemptId: attempt.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { question: { select: questionSelect } },
  });
  const totals = aggregateAttempt(refreshed as AttemptResponseRecord[]);
  await prisma.studentPracticeAttempt.update({
    where: { id: attempt.id },
    data: {
      attemptedCount: totals.attemptedCount,
      correctCount: totals.correctCount,
      marksAwarded: totals.marksAwarded,
      scorePercent: totals.scorePercent,
    },
  });
  return {
    savedAt: new Date().toISOString(),
    attemptedCount: totals.attemptedCount,
    pending: refreshed.length - totals.attemptedCount,
    updatedQuestions: refreshed
      .filter((response) => touchedIds.has(response.id))
      .map((response) => ({
        questionId: response.questionId,
        answered: response.answeredAt !== null,
        autoGraded: response.autoGraded,
        marksAwarded: response.marksAwarded,
        reviewStatus: response.reviewStatus,
      })),
  };
}

export async function submitStudentExerciseAttempt(input: {
  attemptId: string;
}) {
  const { attempt, scope } = await loadOwnedExerciseAttempt(input.attemptId);
  const exercise = attempt.exercise;
  if (!exercise) {
    throw new StudentExerciseError("This exercise is not available for your account.", 404);
  }
  if (attempt.status !== PracticeAttemptStatus.IN_PROGRESS) {
    throw new StudentExerciseError("This exercise can no longer be submitted.", 409);
  }
  if (attempt.responses.some((response) => response.answer === null || response.answeredAt === null)) {
    throw new StudentExerciseError("Please answer every question before submitting.");
  }
  const now = new Date();
  const totals = await prisma.$transaction(async (tx) => {
    for (const response of attempt.responses) {
      const classified = classifyQuestion(response.question, response.answer);
      if (classified.answeredAt === null) {
        throw new StudentExerciseError("Please answer every question before submitting.");
      }
      await tx.studentPracticeResponse.update({
        where: { id: response.id },
        data: {
          autoGraded: classified.autoGraded,
          correct: classified.correct,
          marksAwarded: classified.marksAwarded,
          reviewStatus: classified.reviewStatus,
          answeredAt: response.answeredAt ?? now,
          feedback: null,
          reviewedAt: null,
          reviewedByTeacherId: null,
        },
      });
    }
    const refreshed = await tx.studentPracticeResponse.findMany({
      where: { attemptId: attempt.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: { question: { select: questionSelect } },
    });
    const nextTotals = aggregateAttempt(refreshed as AttemptResponseRecord[]);
    const nextStatus =
      nextTotals.pendingReviewCount > 0
        ? PracticeAttemptStatus.NEEDS_REVIEW
        : PracticeAttemptStatus.AUTO_CHECKED;
    await tx.studentPracticeAttempt.update({
      where: { id: attempt.id },
      data: {
        status: nextStatus,
        submittedAt: now,
        attemptedCount: nextTotals.attemptedCount,
        correctCount: nextTotals.correctCount,
        totalMarks: nextTotals.totalMarks,
        marksAwarded: nextTotals.marksAwarded,
        scorePercent: nextTotals.scorePercent,
      },
    });
    await recordLearningActivity(tx, {
      eventKey: `exercise:${attempt.id}:submitted`,
      publisherId: scope.identity.publisher.id,
      schoolId: scope.identity.school.id,
      studentId: attempt.studentId,
      academicYearId: attempt.academicYearId,
      activityType: LearningActivityType.PRACTICE,
      title: `Completed exercise ${exercise.title}`,
      sourceType: "StudentPracticeAttempt",
      sourceId: attempt.id,
      occurredAt: now,
      subjectId: attempt.book.subjectId,
      bookId: attempt.bookId,
      chapterId: attempt.chapterId,
      completed: true,
      scorePercent: nextTotals.scorePercent,
      durationSeconds: Math.max(0, Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000)),
    });
    return { ...nextTotals, status: nextStatus };
  });
  await completeMatchingRemedialSteps({
    studentId: attempt.studentId,
    academicYearId: attempt.academicYearId,
    type: "INTERACTIVE_PRACTICE",
    bookId: attempt.bookId,
    chapterId: attempt.chapterId,
    sourceId: attempt.id,
  });
  await refreshLearningSupportBestEffort({
    studentId: attempt.studentId,
    academicYearId: attempt.academicYearId,
  });
  return {
    attemptId: attempt.id,
    status: totals.status,
    scorePercent: totals.scorePercent,
  };
}

export async function getStudentExerciseResult(attemptId: string) {
  const { attempt } = await loadOwnedExerciseAttempt(attemptId);
  const exercise = attempt.exercise;
  if (!exercise) {
    throw new StudentExerciseError("This exercise result is not available yet.", 404);
  }
  if (
    attempt.status !== PracticeAttemptStatus.AUTO_CHECKED &&
    attempt.status !== PracticeAttemptStatus.NEEDS_REVIEW &&
    attempt.status !== PracticeAttemptStatus.REVIEWED
  ) {
    throw new StudentExerciseError("This exercise result is not available yet.", 404);
  }
  return {
    id: attempt.id,
    status: attempt.status,
    bookId: attempt.bookId,
    chapterId: attempt.chapterId,
    exerciseId: attempt.exerciseId,
    bookTitle: attempt.book.title,
    chapterTitle: attempt.chapter.title,
    chapterNumber: attempt.chapter.chapterNumber,
    exerciseTitle: exercise.title,
    submittedAt: attempt.submittedAt?.toISOString() ?? attempt.updatedAt.toISOString(),
    attemptedCount: attempt.attemptedCount,
    correctCount: attempt.correctCount,
    totalQuestions: attempt.totalQuestions,
    marksAwarded: attempt.marksAwarded,
    totalMarks: attempt.totalMarks,
    scorePercent: attempt.scorePercent ?? 0,
    pendingReviewCount: attempt.responses.filter((response) => response.reviewStatus === AssessmentReviewStatus.PENDING).length,
    responses: attempt.responses.map((response, index) => ({
      questionNumber: index + 1,
      questionText: response.question.questionText,
      questionType: response.question.questionType,
      studentAnswer: response.answer,
      marksAwarded: response.marksAwarded,
      totalMarks: response.question.marks,
      autoGraded: response.autoGraded,
      reviewStatus: response.reviewStatus,
      feedback: response.feedback,
    })),
  };
}

export async function getTeacherExerciseReviewAttempt(sectionId: string, attemptId: string) {
  const scope = await requireTeacherClass(sectionId);
  const allowedBookIds = new Set(
    scope.sectionSubjects.flatMap((subject) => subject.bookAdoptions.map((adoption) => adoption.bookId)),
  );
  const attempt = await prisma.studentPracticeAttempt.findFirst({
    where: {
      id: attemptId,
      exerciseId: { not: null },
      academicYearId: scope.academicYear.id,
      student: {
        enrollments: {
          some: {
            sectionId,
            academicYearId: scope.academicYear.id,
            status: "ACTIVE",
          },
        },
      },
    },
    include: {
      student: { include: { user: { select: { name: true } } } },
      book: { select: { id: true, title: true } },
      chapter: { select: { id: true, title: true, chapterNumber: true } },
      exercise: { select: { id: true, title: true } },
      responses: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: { question: { select: questionSelect } },
      },
    },
  });
  if (!attempt?.exerciseId || !attempt.exercise || !allowedBookIds.has(attempt.book.id)) {
    throw new StudentExerciseError("This exercise review is not available.", 404);
  }
  return {
    scope,
    attempt,
    responses: attempt.responses.map((response, index) => ({
      responseId: response.id,
      questionNumber: index + 1,
      questionType: response.question.questionType,
      questionText: response.question.questionText,
      studentAnswer: response.answer,
      marksAwarded: response.marksAwarded,
      totalMarks: response.question.marks,
      reviewStatus: response.reviewStatus,
      feedback: response.feedback,
      canReview: response.reviewStatus === AssessmentReviewStatus.PENDING,
    })),
  };
}

export async function saveTeacherExerciseResponseReview(input: {
  sectionId: string;
  attemptId: string;
  responseId: string;
  marksAwarded: number;
  feedback: string | null;
}) {
  const review = await getTeacherExerciseReviewAttempt(input.sectionId, input.attemptId);
  const response = review.attempt.responses.find((item) => item.id === input.responseId);
  if (!response || response.reviewStatus !== AssessmentReviewStatus.PENDING) {
    throw new StudentExerciseError("This response is not available for review.", 404);
  }
  const safeMarks = Math.max(0, Math.min(response.question.marks, Math.round(input.marksAwarded)));
  await prisma.$transaction(async (tx) => {
    await tx.studentPracticeResponse.update({
      where: { id: response.id },
      data: {
        marksAwarded: safeMarks,
        feedback: input.feedback ? normalizeText(input.feedback).slice(0, 5000) : null,
        reviewStatus: AssessmentReviewStatus.REVIEWED,
        reviewedAt: new Date(),
        reviewedByTeacherId: review.scope.teacher.id,
      },
    });
    const refreshed = await tx.studentPracticeResponse.findMany({
      where: { attemptId: review.attempt.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: { question: { select: questionSelect } },
    });
    const totals = aggregateAttempt(refreshed as AttemptResponseRecord[]);
    await tx.studentPracticeAttempt.update({
      where: { id: review.attempt.id },
      data: {
        marksAwarded: totals.marksAwarded,
        scorePercent: totals.scorePercent,
        status:
          totals.pendingReviewCount > 0
            ? PracticeAttemptStatus.NEEDS_REVIEW
            : PracticeAttemptStatus.REVIEWED,
      },
    });
  });
  return { ok: true as const };
}

export function studentExerciseErrorResponse(error: unknown) {
  if (error instanceof StudentExerciseError) {
    return { status: error.status, message: error.message };
  }
  return { status: 400, message: "This exercise is not available for your account." };
}
