import "server-only";

import {
  Prisma,
  StudentWorksheetAttemptStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getStudentBook } from "@/lib/student-books";
import { requireStudent } from "@/lib/student-dashboard";
import {
  calculateStudentWorksheetAttempt,
  getStudentWorksheetFeedback,
  gradeStudentWorksheetResponse,
  isAvailableStudentWorksheetQuestion,
  toSafeStudentWorksheetQuestion,
} from "@/lib/student-worksheet-policy";
import type { StudentWorksheetQuestionCandidate } from "@/lib/student-worksheet-policy";
import { hasPublishedSmartBookRelease, resolvePublishedSmartBookContent, resolveSmartBookContentReleaseVersion } from "@/lib/smart-book-release-runtime";
import { resolveManifestWorksheetExecution } from "@/lib/smart-book-release-projection";

class StudentWorksheetError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

const questionSelect = {
  id: true,
  bookId: true,
  chapterId: true,
  moduleId: true,
  imageResourceId: true,
  questionType: true,
  questionText: true,
  options: true,
  correctAnswer: true,
  explanation: true,
  marks: true,
  difficulty: true,
  approved: true,
  archived: true,
  createdAt: true,
} satisfies Prisma.BookQuestionSelect;


type StudentWorksheetScope = {
  identity: Awaited<ReturnType<typeof requireStudent>>;
  book: NonNullable<Awaited<ReturnType<typeof getStudentBook>>>;
  worksheet: {
    id: string;
    publisherId: string;
    bookId: string;
    chapterId: string;
    title: string;
    instructions: string | null;
    showAnswersAfterSubmit: boolean;
    book: { id: string; title: string };
    chapter: { id: string; title: string; chapterNumber: number | null };
  };
  questions: Array<{ position: number; question: StudentWorksheetQuestionCandidate }>;
  releaseVersionId: string | null;
};

async function resolveBoundStudentWorksheetScope(
  worksheetId: string,
  identity: StudentWorksheetScope["identity"],
): Promise<StudentWorksheetScope | null> {
  if (!worksheetId.trim()) throw new StudentWorksheetError("This worksheet is not available for your account.", 404);
  const source = await prisma.publisherWorksheet.findFirst({
    where: { id: worksheetId, publisherId: identity.publisher.id },
    select: { bookId: true },
  });
  if (!source) throw new StudentWorksheetError("This worksheet is not available for your account.", 404);
  const book = await getStudentBook(source.bookId);
  if (!book || !identity.student.userId) throw new StudentWorksheetError("This worksheet is not available for your account.", 404);

  const release = await resolvePublishedSmartBookContent({ publisherId: identity.publisher.id, bookId: source.bookId });
  if (!release) {
    if (await hasPublishedSmartBookRelease({ publisherId: identity.publisher.id, bookId: source.bookId })) {
      throw new StudentWorksheetError("This worksheet is not available for your account.", 404);
    }
    return null;
  }
  const execution = resolveManifestWorksheetExecution({ manifest: release.manifest, protectedPayload: release.protectedPayload, publisherId: identity.publisher.id, bookId: source.bookId, worksheetId });
  if (!execution) throw new StudentWorksheetError("This worksheet is not available for your account.", 404);
  return {
    identity,
    book,
    worksheet: {
      ...execution.worksheet,
      publisherId: identity.publisher.id,
      bookId: source.bookId,
      chapterId: execution.worksheet.chapter.id,
    },
    questions: execution.questions,
    releaseVersionId: release.releaseVersionId,
  };
}

async function resolveStudentWorksheetScope(worksheetId: string): Promise<StudentWorksheetScope> {
  if (!worksheetId.trim()) {
    throw new StudentWorksheetError(
      "This worksheet is not available for your account.",
      404,
    );
  }

  const identity = await requireStudent();
  const worksheet = await prisma.publisherWorksheet.findFirst({
    where: {
      id: worksheetId,
      publisherId: identity.publisher.id,
      active: true,
      published: true,
      archivedAt: null,
      allowOnlineAttempt: true,
      audience: { in: ["STUDENT", "BOTH"] },
    },
    select: {
      id: true,
      publisherId: true,
      bookId: true,
      chapterId: true,
      title: true,
      instructions: true,
      showAnswersAfterSubmit: true,
      book: { select: { id: true, title: true } },
      chapter: { select: { id: true, title: true, chapterNumber: true } },
      items: {
        orderBy: { position: "asc" },
        select: {
          position: true,
          question: { select: questionSelect },
        },
      },
    },
  });
  if (!worksheet || !identity.student.userId) {
    throw new StudentWorksheetError(
      "This worksheet is not available for your account.",
      404,
    );
  }

  const book = await getStudentBook(worksheet.bookId);
  if (!book) {
    throw new StudentWorksheetError(
      "This worksheet is not available for your account.",
      404,
    );
  }

  const questions = worksheet.items.flatMap((item) =>
    item.question.bookId === worksheet.bookId &&
    isAvailableStudentWorksheetQuestion(item.question)
      ? [{ position: item.position, question: item.question }]
      : [],
  );
  if (!questions.length) {
    throw new StudentWorksheetError(
      "This worksheet has no questions available yet.",
      404,
    );
  }

  return { identity, book, worksheet, questions, releaseVersionId: null };
}


async function loadOwnedStudentWorksheetAttempt(attemptId: string) {
  const identity = await requireStudent();
  const attempt = await prisma.studentWorksheetAttempt.findFirst({
    where: {
      id: attemptId,
      studentId: identity.student.id,
      schoolId: identity.school.id,
      academicYearId: identity.academicYear.id,
      publisherId: identity.publisher.id,
    },
    select: {
      id: true,
      worksheetId: true,
      studentId: true,
      schoolId: true,
      academicYearId: true,
      publisherId: true,
      bookId: true,
      contentReleaseVersionId: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      questionCount: true,
      totalMarks: true,
      marksAwarded: true,
      percentage: true,
      responses: {
        select: {
          id: true,
          questionId: true,
          response: true,
          correct: true,
          marksAwarded: true,
        },
      },
    },
  });
  if (!attempt) throw new StudentWorksheetError("This worksheet is not available for your account.", 404);

  const book = await getStudentBook(attempt.bookId);
  if (!book || !identity.student.userId) throw new StudentWorksheetError("This worksheet is not available for your account.", 404);

  if (attempt.contentReleaseVersionId) {
    const release = await resolveSmartBookContentReleaseVersion({
      publisherId: identity.publisher.id,
      bookId: attempt.bookId,
      releaseVersionId: attempt.contentReleaseVersionId,
    });
    const execution = release
      ? resolveManifestWorksheetExecution({ manifest: release.manifest, protectedPayload: release.protectedPayload, publisherId: identity.publisher.id, bookId: attempt.bookId, worksheetId: attempt.worksheetId })
      : null;
    if (!release || !execution) throw new StudentWorksheetError("This worksheet attempt is unavailable.", 404);
    const scope: StudentWorksheetScope = {
      identity,
      book,
      worksheet: {
        ...execution.worksheet,
        publisherId: identity.publisher.id,
        bookId: attempt.bookId,
        chapterId: execution.worksheet.chapter.id,
      },
      questions: execution.questions,
      releaseVersionId: attempt.contentReleaseVersionId,
    };
    return { attempt, scope };
  }

  if (await hasPublishedSmartBookRelease({ publisherId: identity.publisher.id, bookId: attempt.bookId })) {
    throw new StudentWorksheetError("This worksheet attempt is unavailable.", 404);
  }
  const scope = await resolveStudentWorksheetScope(attempt.worksheetId);
  if (
    attempt.bookId !== scope.worksheet.bookId ||
    attempt.schoolId !== scope.identity.school.id ||
    attempt.publisherId !== scope.identity.publisher.id ||
    attempt.academicYearId !== scope.identity.academicYear.id
  ) throw new StudentWorksheetError("This worksheet is not available for your account.", 404);
  return { attempt, scope };
}

function worksheetMetadata(scope: Pick<StudentWorksheetScope, "worksheet">) {
  return {
    id: scope.worksheet.id,
    title: scope.worksheet.title,
    instructions: scope.worksheet.instructions,
    showAnswersAfterSubmit: scope.worksheet.showAnswersAfterSubmit,
    book: {
      id: scope.worksheet.book.id,
      title: scope.worksheet.book.title,
    },
    chapter: {
      id: scope.worksheet.chapter.id,
      title: scope.worksheet.chapter.title,
      chapterNumber: scope.worksheet.chapter.chapterNumber,
    },
  };
}


export async function startStudentWorksheetAttempt(worksheetId: string) {
  const identity = await requireStudent();
  const scope = await resolveBoundStudentWorksheetScope(worksheetId, identity)
    ?? await resolveStudentWorksheetScope(worksheetId);
  const summary = calculateStudentWorksheetAttempt(
    scope.questions.map((item) => item.question),
    [],
  );
  const attempt = await prisma.studentWorksheetAttempt.create({
    data: {
      worksheetId: scope.worksheet.id,
      studentId: scope.identity.student.id,
      schoolId: scope.identity.school.id,
      academicYearId: scope.identity.academicYear.id,
      publisherId: scope.identity.publisher.id,
      bookId: scope.worksheet.bookId,
      contentReleaseVersionId: scope.releaseVersionId,
      questionCount: summary.questionCount,
      totalMarks: summary.totalMarks,
    },
    select: { id: true },
  });

  return {
    attemptId: attempt.id,
    worksheet: worksheetMetadata(scope),
    questions: scope.questions.map((item, index) =>
      toSafeStudentWorksheetQuestion(item.question, item.position, index + 1),
    ),
  };
}

export async function saveStudentWorksheetResponse(
  attemptId: string,
  questionId: string,
  response: unknown,
) {
  const { attempt, scope } = await loadOwnedStudentWorksheetAttempt(attemptId);
  if (attempt.status !== StudentWorksheetAttemptStatus.IN_PROGRESS) {
    throw new StudentWorksheetError("We could not save your answer. Please try again.");
  }

  const selected = scope.questions.find((item) => item.question.id === questionId);
  if (!selected) {
    throw new StudentWorksheetError("We could not save your answer. Please try again.");
  }

  const grade = gradeStudentWorksheetResponse(selected.question, response);
  if (!grade.ok) {
    throw new StudentWorksheetError(grade.message);
  }

  await prisma.$transaction(async (tx) => {
    const active = await tx.studentWorksheetAttempt.updateMany({
      where: {
        id: attempt.id,
        studentId: scope.identity.student.id,
        status: StudentWorksheetAttemptStatus.IN_PROGRESS,
      },
      data: { updatedAt: new Date() },
    });
    if (active.count !== 1) {
      throw new StudentWorksheetError("We could not save your answer. Please try again.");
    }

    await tx.studentWorksheetResponse.upsert({
      where: {
        attemptId_questionId: {
          attemptId: attempt.id,
          questionId: selected.question.id,
        },
      },
      create: {
        attemptId: attempt.id,
        questionId: selected.question.id,
        response: grade.answer as Prisma.InputJsonValue,
        correct: grade.correct,
        marksAwarded: grade.marksAwarded,
      },
      update: {
        response: grade.answer as Prisma.InputJsonValue,
        correct: grade.correct,
        marksAwarded: grade.marksAwarded,
      },
    });
  });

  return { saved: true };
}

export async function submitStudentWorksheetAttempt(attemptId: string) {
  const { attempt, scope } = await loadOwnedStudentWorksheetAttempt(attemptId);
  if (attempt.status !== StudentWorksheetAttemptStatus.IN_PROGRESS) {
    throw new StudentWorksheetError(
      "This worksheet is not available for your account.",
      404,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const active = await tx.studentWorksheetAttempt.updateMany({
      where: {
        id: attempt.id,
        studentId: scope.identity.student.id,
        status: StudentWorksheetAttemptStatus.IN_PROGRESS,
      },
      data: { updatedAt: new Date() },
    });
    if (active.count !== 1) {
      throw new StudentWorksheetError(
        "This worksheet is not available for your account.",
        404,
      );
    }

    const responses = await tx.studentWorksheetResponse.findMany({
      where: { attemptId: attempt.id },
      select: {
        questionId: true,
        response: true,
        correct: true,
        marksAwarded: true,
      },
    });
    const responseByQuestionId = new Map(
      responses.map((response) => [response.questionId, response]),
    );
    if (
      scope.questions.some(
        (item) => responseByQuestionId.get(item.question.id)?.response === null ||
          responseByQuestionId.get(item.question.id) === undefined,
      )
    ) {
      throw new StudentWorksheetError("Please answer all questions before submitting.");
    }

    const summary = calculateStudentWorksheetAttempt(
      scope.questions.map((item) => item.question),
      responses,
    );
    const now = new Date();
    await tx.studentWorksheetAttempt.update({
      where: { id: attempt.id },
      data: {
        questionCount: summary.questionCount,
        totalMarks: summary.totalMarks,
        marksAwarded: summary.marksAwarded,
        percentage: summary.percentage,
        status: StudentWorksheetAttemptStatus.SUBMITTED,
        submittedAt: now,
      },
    });

    return { ...summary, submittedAt: now };
  });

  return { attemptId: attempt.id, ...result };
}

export async function getStudentWorksheetAttempt(attemptId: string) {
  const { attempt, scope } = await loadOwnedStudentWorksheetAttempt(attemptId);
  const responsesByQuestionId = new Map(
    attempt.responses.map((response) => [response.questionId, response]),
  );
  const feedbackAllowed =
    attempt.status === StudentWorksheetAttemptStatus.SUBMITTED &&
    scope.worksheet.showAnswersAfterSubmit;

  return {
    id: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    questionCount: attempt.questionCount,
    totalMarks: attempt.totalMarks,
    marksAwarded: attempt.marksAwarded,
    percentage: attempt.percentage,
    worksheet: worksheetMetadata(scope),
    questions: scope.questions.map((item, index) => {
      const saved = responsesByQuestionId.get(item.question.id);
      return {
        ...toSafeStudentWorksheetQuestion(item.question, item.position, index + 1),
        response: saved?.response ?? null,
        feedback: getStudentWorksheetFeedback(item.question, saved, feedbackAllowed),
      };
    }),
  };
}

export function studentWorksheetErrorResponse(error: unknown) {
  if (error instanceof StudentWorksheetError) {
    return { status: error.status, message: error.message };
  }
  return {
    status: 400,
    message: "This worksheet is not available for your account.",
  };
}