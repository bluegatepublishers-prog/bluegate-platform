import "server-only";

import {
  LearningActivityType,
  AssessmentAttemptStatus,
  AssessmentReviewStatus,
  AssessmentResultRelease,
  AssessmentStatus,
  PlatformFeatureKey,
  Prisma,
  SecurityAuditOutcome,
  TeacherQuestionStatus,
  UserRole,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  accountAuditActor,
  recordTrustedAuditBestEffort,
  recordTrustedDeniedAudit,
  writeSecurityAuditEvent,
} from "@/lib/security-audit";
import {
  SUBJECTIVE_ASSESSMENT_TYPES,
  calculateAssessmentSummary,
  canReleaseAssessmentResult,
  isValidAssessmentQuestion,
  normalizeAssessmentQuestionType,
  toSafeAssessmentQuestion,
  validateAssessmentDuration,
  type AssessmentQuestionSnapshot,
} from "@/lib/assessment-policy";
import {
  TEACHER_QUESTION_ASSESSMENT_TYPES,
  isTeacherQuestionAssessmentContextCompatible,
  mapTeacherQuestionAssessmentType,
  mapTeacherQuestionToAssessmentSnapshot,
} from "@/lib/teacher-assessment-question-bridge";
import { processPublishedAssessmentAnalytics } from "@/lib/assessment-analytics";
import { refreshLearningSupportBestEffort } from "@/lib/learning-support";
import { completeMatchingRemedialSteps } from "@/lib/remedials/completion";
import { requireTeacherSubject } from "@/lib/teacher-experience";
import { isPublisherFeatureEnabled, requirePublisherFeature } from "@/lib/publisher-features";

export type TeacherAssessmentLifecycleStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "ACTIVE"
  | "CLOSED"
  | "ARCHIVED";

export type TeacherAssessmentGradingFilter =
  | "ALL"
  | "NEEDS_GRADING"
  | "SUBMITTED"
  | "GRADED"
  | "RESULT_PUBLISHED"
  | "NOT_SUBMITTED";

export class TeacherAssessmentError extends Error {
  constructor(message: string, readonly code = "INVALID_STATE") {
    super(message);
    this.name = "TeacherAssessmentError";
  }
}

function teacherActor(input: { teacherUserId: string; publisherId: string }) {
  return accountAuditActor({
    id: input.teacherUserId,
    role: UserRole.TEACHER,
    publisherId: input.publisherId,
  });
}

export function deriveTeacherAssessmentLifecycleStatus(input: {
  status: AssessmentStatus;
  opensAt: Date | null;
  dueAt: Date | null;
  now?: Date;
}): TeacherAssessmentLifecycleStatus {
  if (input.status === AssessmentStatus.DRAFT) return "DRAFT";
  if (input.status === AssessmentStatus.ARCHIVED) return "ARCHIVED";
  if (input.status === AssessmentStatus.CLOSED) return "CLOSED";
  const now = input.now ?? new Date();
  if (input.opensAt && now < input.opensAt) return "SCHEDULED";
  if (input.dueAt && now >= input.dueAt) return "CLOSED";
  return "ACTIVE";
}

function normalizeOptionLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function asJsonInput(value: Prisma.JsonValue | null | undefined) {
  if (value === null) return Prisma.JsonNull;
  if (value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}

function normalizeDate(value: FormDataEntryValue | null) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeInt(value: FormDataEntryValue | null) {
  if (value == null) return null;
  const parsed = Number(String(value).trim());
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeAssessmentType(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (["CHAPTER", "UNIT", "TERM", "CUSTOM", "SCHOOL", "TEACHER", "BOARD"].includes(raw)) {
    return raw as "CHAPTER" | "UNIT" | "TERM" | "CUSTOM" | "SCHOOL" | "TEACHER" | "BOARD";
  }
  return "CUSTOM" as const;
}

function normalizeQuestionType(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().toUpperCase().replace(/[\s/-]+/g, "_");
  if ([
    "MCQ",
    "TRUE_FALSE",
    "FILL_BLANK",
    "MATCH",
    "MULTIPLE_SELECT",
    "VERY_SHORT",
    "SHORT",
    "SHORT_ANSWER",
    "LONG",
    "LONG_ANSWER",
    "CASE_STUDY",
    "CASE_BASED",
    "COMPETENCY",
    "HOTS",
  ].includes(raw)) {
    return raw;
  }
  return null;
}


function normalizeRelease(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (raw === AssessmentResultRelease.AFTER_DUE_DATE) return AssessmentResultRelease.AFTER_DUE_DATE;
  if (raw === AssessmentResultRelease.NEVER) return AssessmentResultRelease.NEVER;
  return AssessmentResultRelease.IMMEDIATE;
}

function isSubjectiveQuestionType(value: string) {
  const normalized = normalizeAssessmentQuestionType(value);
  return Boolean(normalized && SUBJECTIVE_ASSESSMENT_TYPES.includes(normalized as (typeof SUBJECTIVE_ASSESSMENT_TYPES)[number]));
}

function toGradingStatusLabel(status: AssessmentAttemptStatus | "NOT_SUBMITTED") {
  if (status === "NOT_SUBMITTED") return "Not Submitted";
  if (status === AssessmentAttemptStatus.IN_PROGRESS) return "In Progress";
  if (status === AssessmentAttemptStatus.SUBMITTED) return "Submitted";
  if (status === AssessmentAttemptStatus.PENDING_REVIEW) return "Needs Grading";
  if (status === AssessmentAttemptStatus.GRADED) return "Graded";
  return "Abandoned";
}

function toResultStatusLabel(publishedAt: Date | null, resultRelease: AssessmentResultRelease) {
  if (publishedAt) return "Published";
  if (resultRelease === AssessmentResultRelease.IMMEDIATE) return "Ready (Immediate)";
  if (resultRelease === AssessmentResultRelease.AFTER_DUE_DATE) return "Ready (After Due Date)";
  return "Release Controlled";
}

type PublicationBlockReason =
  | "ALREADY_PUBLISHED"
  | "NOT_GRADED"
  | "MISSING_RESULT"
  | "RELEASE_DISABLED"
  | "RELEASE_PENDING";

function evaluatePublicationReadiness(input: {
  status: AssessmentAttemptStatus | "NOT_SUBMITTED";
  hasResult: boolean;
  publishedAt: Date | null;
  releasePolicy: AssessmentResultRelease;
  dueAt: Date | null;
  now?: Date;
}) {
  if (input.publishedAt) {
    return { canPublish: false as const, reason: "ALREADY_PUBLISHED" as PublicationBlockReason };
  }
  if (!input.hasResult) {
    return { canPublish: false as const, reason: "MISSING_RESULT" as PublicationBlockReason };
  }
  if (input.status !== AssessmentAttemptStatus.GRADED) {
    return { canPublish: false as const, reason: "NOT_GRADED" as PublicationBlockReason };
  }
  if (input.releasePolicy === AssessmentResultRelease.NEVER) {
    return { canPublish: false as const, reason: "RELEASE_DISABLED" as PublicationBlockReason };
  }
  if (!canReleaseAssessmentResult({ release: input.releasePolicy, dueAt: input.dueAt, now: input.now })) {
    return { canPublish: false as const, reason: "RELEASE_PENDING" as PublicationBlockReason };
  }
  return { canPublish: true as const, reason: null as PublicationBlockReason | null };
}

function publicationBlockLabel(reason: PublicationBlockReason | null) {
  if (!reason) return null;
  if (reason === "ALREADY_PUBLISHED") return "Already published";
  if (reason === "NOT_GRADED") return "Complete grading first";
  if (reason === "MISSING_RESULT") return "Result record missing";
  if (reason === "RELEASE_DISABLED") return "Release policy is set to Never";
  return "Awaiting due date release window";
}

function computeAttemptMarks(responses: Array<{ autoGraded: boolean; marksAwarded: number | null }>) {
  let objective = 0;
  let subjective = 0;
  for (const response of responses) {
    const marks = response.marksAwarded ?? 0;
    if (response.autoGraded) objective += marks;
    else subjective += marks;
  }
  return { objective, subjective, total: objective + subjective };
}

async function recomputeAssessmentAttemptResult(tx: Prisma.TransactionClient, attemptId: string) {
  const attempt = await tx.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      result: true,
      responses: {
        include: {
          assessmentQuestion: {
            select: {
              questionType: true,
              marks: true,
            },
          },
        },
      },
    },
  });
  if (!attempt || !attempt.result) throw new TeacherAssessmentError("Attempt result is unavailable.", "NOT_FOUND");

  const summary = calculateAssessmentSummary(
    attempt.responses.map((response) => ({
      answer: response.answer,
      correct: response.correct,
      marksAwarded: response.marksAwarded,
      reviewStatus: response.reviewStatus,
      question: { marks: response.assessmentQuestion.marks },
    })),
    attempt.startedAt,
    attempt.submittedAt ?? new Date(),
  );

  const updatedResult = await tx.assessmentResult.update({
    where: { id: attempt.result.id },
    data: {
      totalMarks: summary.totalMarks,
      awardedMarks: summary.awardedMarks,
      percentage: summary.percentage,
      correctCount: summary.correctCount,
      wrongCount: summary.wrongCount,
      skippedCount: summary.skippedCount,
      subjectivePending: summary.subjectivePending,
      timeTakenSeconds: summary.timeTakenSeconds,
      provisional: summary.provisional,
    },
  });

  return { attempt, summary, result: updatedResult };
}

async function loadOwnedAssessment(sectionId: string, assessmentId: string) {
  const { scope } = await requireTeacherSubject(sectionId);
  if (!await isPublisherFeatureEnabled(scope.publisherId, PlatformFeatureKey.ASSESSMENTS)) {
    throw new TeacherAssessmentError("Assessments are not enabled for this publisher.", "FEATURE_DISABLED");
  }
  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      academicYearId: scope.academicYear.id,
      sectionId,
      createdById: scope.teacher.userId,
      sectionSubjectId: { in: scope.sectionSubjects.map((item) => item.id) },
    },
    include: {
      settings: true,
      sectionSubject: { include: { subject: true } },
      chapter: { select: { id: true, chapterNumber: true, title: true } },
      questions: {
        orderBy: { sequence: "asc" },
        include: { question: { select: { approved: true, questionText: true } } },
      },
      _count: { select: { attempts: true } },
    },
  });
  if (!assessment) throw new TeacherAssessmentError("This assessment is not available.", "NOT_FOUND");
  return { scope, assessment };
}

function ensureSchedulable(opensAt: Date | null, dueAt: Date | null) {
  if (opensAt && dueAt && opensAt >= dueAt) {
    throw new TeacherAssessmentError("Start date must be before end date.", "VALIDATION_FAILED");
  }
}

function ensureQuestionEditAllowed(input: { status: AssessmentStatus; attempts: number }) {
  if (input.status === AssessmentStatus.ARCHIVED) {
    throw new TeacherAssessmentError("Archived assessments are read-only.", "INVALID_STATE");
  }
  if (input.status === AssessmentStatus.PUBLISHED && input.attempts > 0) {
    throw new TeacherAssessmentError("Question content is locked after the first student attempt.", "LOCKED_AFTER_ATTEMPTS");
  }
}

function ensureMetadataEditAllowed(input: { status: AssessmentStatus }) {
  if (input.status === AssessmentStatus.ARCHIVED) {
    throw new TeacherAssessmentError("Archived assessments are read-only.", "INVALID_STATE");
  }
}

async function nextSequence(assessmentId: string, tx: Prisma.TransactionClient) {
  const latest = await tx.assessmentQuestion.findFirst({
    where: { assessmentId },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });
  return (latest?.sequence ?? 0) + 1;
}

async function appendBookQuestions(input: {
  tx: Prisma.TransactionClient;
  assessmentId: string;
  bookQuestionIds: string[];
  allowedBookIds: string[];
}) {
  if (!input.bookQuestionIds.length) return 0;
  const questions = await input.tx.bookQuestion.findMany({
    where: {
      id: { in: input.bookQuestionIds },
      approved: true,
      bookId: { in: input.allowedBookIds },
    },
    orderBy: { id: "asc" },
  });
  if (!questions.length) return 0;

  const existing = await input.tx.assessmentQuestion.findMany({
    where: { assessmentId: input.assessmentId },
    select: { questionId: true },
  });
  const existingQuestionIds = new Set(existing.map((item) => item.questionId));
  const unique = questions.filter((question) => !existingQuestionIds.has(question.id));
  if (!unique.length) return 0;

  let sequence = await nextSequence(input.assessmentId, input.tx);
  for (const question of unique) {
    await input.tx.assessmentQuestion.create({
      data: {
        assessmentId: input.assessmentId,
        questionId: question.id,
        bookId: question.bookId,
        chapterId: question.chapterId,
        sequence,
        questionType: question.questionType,
        questionText: question.questionText,
        options: asJsonInput(question.options),
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        marks: question.marks,
        competency: question.competency,
        learningOutcome: null,
      },
    });
    sequence += 1;
  }
  return unique.length;
}

async function ensurePublishable(assessmentId: string, expectedTotalMarks: number | null) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      settings: true,
      questions: {
        orderBy: { sequence: "asc" },
        include: { question: { select: { approved: true, bookId: true, chapterId: true } } },
      },
    },
  });
  if (!assessment || !assessment.settings) {
    throw new TeacherAssessmentError("Assessment settings are missing.", "VALIDATION_FAILED");
  }
  if (!assessment.questions.length) {
    throw new TeacherAssessmentError("Add at least one question before publishing.", "VALIDATION_FAILED");
  }
  if (!validateAssessmentDuration(assessment.durationMinutes)) {
    throw new TeacherAssessmentError("Assessment duration must be between 1 and 300 minutes.", "VALIDATION_FAILED");
  }
  if (assessment.settings.maxAttempts < 1 || assessment.settings.maxAttempts > 20) {
    throw new TeacherAssessmentError("Attempts allowed must be between 1 and 20.", "VALIDATION_FAILED");
  }
  ensureSchedulable(assessment.opensAt, assessment.dueAt);

  const snapshots = assessment.questions.map((question) => ({
    id: question.id,
    questionType: question.questionType,
    questionText: question.questionText,
    options: question.options,
    correctAnswer: question.correctAnswer,
    marks: question.marks,
  })) satisfies AssessmentQuestionSnapshot[];
  if (snapshots.some((snapshot) => !isValidAssessmentQuestion(snapshot))) {
    throw new TeacherAssessmentError("One or more selected questions are invalid.", "VALIDATION_FAILED");
  }

  if (
    assessment.questions.some((row) =>
      !row.question.approved ||
      row.question.bookId !== row.bookId ||
      row.question.chapterId !== row.chapterId ||
      row.bookId !== assessment.bookId ||
      (assessment.chapterId ? row.chapterId !== assessment.chapterId : false),
    )
  ) {
    throw new TeacherAssessmentError("Question snapshots are no longer compatible with this assessment scope.", "VALIDATION_FAILED");
  }

  const totalMarks = assessment.questions.reduce((sum, question) => sum + question.marks, 0);
  if (expectedTotalMarks != null && expectedTotalMarks > 0 && totalMarks !== expectedTotalMarks) {
    throw new TeacherAssessmentError("Total question marks must match the maximum marks value.", "VALIDATION_FAILED");
  }
  return { assessment, totalMarks };
}

export async function getTeacherAssessmentList(sectionId: string, sectionSubjectId?: string | null) {
  const { scope, subject } = await requireTeacherSubject(sectionId, sectionSubjectId);
  if (!await isPublisherFeatureEnabled(scope.publisherId, PlatformFeatureKey.ASSESSMENTS)) {
    throw new TeacherAssessmentError("Assessments are not enabled for this publisher.", "FEATURE_DISABLED");
  }
  const rows = await prisma.assessment.findMany({
    where: {
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      academicYearId: scope.academicYear.id,
      sectionId,
      sectionSubjectId: subject.id,
      createdById: scope.teacher.userId,
    },
    include: {
      chapter: { select: { chapterNumber: true, title: true } },
      questions: { select: { marks: true } },
      _count: { select: { attempts: true } },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  const now = new Date();
  const items = rows.map((row) => {
    const lifecycle = deriveTeacherAssessmentLifecycleStatus({
      status: row.status,
      opensAt: row.opensAt,
      dueAt: row.dueAt,
      now,
    });
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      subject: subject.subject.name,
      chapter: row.chapter ? `Chapter ${row.chapter.chapterNumber}: ${row.chapter.title}` : "All chapters",
      totalQuestions: row.questions.length,
      totalMarks: row.questions.reduce((sum, question) => sum + question.marks, 0),
      attempts: row._count.attempts,
      status: row.status,
      lifecycle,
      opensAt: row.opensAt,
      dueAt: row.dueAt,
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
    };
  });

  const groups = {
    DRAFT: items.filter((item) => item.lifecycle === "DRAFT"),
    SCHEDULED: items.filter((item) => item.lifecycle === "SCHEDULED"),
    ACTIVE: items.filter((item) => item.lifecycle === "ACTIVE"),
    CLOSED: items.filter((item) => item.lifecycle === "CLOSED"),
    ARCHIVED: items.filter((item) => item.lifecycle === "ARCHIVED"),
  } as const;

  return { scope, subject, items, groups };
}

export async function getTeacherAssessmentBuilderOptions(sectionId: string, sectionSubjectId?: string | null) {
  const { scope, subject } = await requireTeacherSubject(sectionId, sectionSubjectId);
  if (!await isPublisherFeatureEnabled(scope.publisherId, PlatformFeatureKey.ASSESSMENTS)) {
    throw new TeacherAssessmentError("Assessments are not enabled for this publisher.", "FEATURE_DISABLED");
  }
  const adopted = subject.bookAdoptions.map((item) => item.book);
  return {
    scope,
    subject,
    books: adopted.map((book) => ({
      id: book.id,
      title: book.title,
      chapters: book.chapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        chapterNumber: chapter.chapterNumber,
      })),
    })),
  };
}

export async function createTeacherAssessment(sectionId: string, formData: FormData) {
  const { scope, subject } = await requireTeacherSubject(sectionId, String(formData.get("sectionSubjectId") ?? "") || null);
  if (!await isPublisherFeatureEnabled(scope.publisherId, PlatformFeatureKey.ASSESSMENTS)) {
    throw new TeacherAssessmentError("Assessments are not enabled for this publisher.", "FEATURE_DISABLED");
  }
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 3 || title.length > 160) {
    throw new TeacherAssessmentError("Assessment name must be 3-160 characters.", "VALIDATION_FAILED");
  }

  const type = normalizeAssessmentType(formData.get("type"));
  const instructions = String(formData.get("instructions") ?? "").trim() || null;
  const durationMinutes = normalizeInt(formData.get("durationMinutes"));
  if (!validateAssessmentDuration(durationMinutes)) {
    throw new TeacherAssessmentError("Duration must be between 1 and 300 minutes.", "VALIDATION_FAILED");
  }

  const maxAttempts = normalizeInt(formData.get("maxAttempts"));
  if (!maxAttempts || maxAttempts < 1 || maxAttempts > 20) {
    throw new TeacherAssessmentError("Attempts allowed must be between 1 and 20.", "VALIDATION_FAILED");
  }

  const opensAt = normalizeDate(formData.get("opensAt"));
  const dueAt = normalizeDate(formData.get("dueAt"));
  ensureSchedulable(opensAt, dueAt);

  const chapterIdRaw = String(formData.get("chapterId") ?? "").trim();
  const bookIdRaw = String(formData.get("bookId") ?? "").trim();
  const selectedBook = subject.bookAdoptions.map((row) => row.book).find((book) => book.id === bookIdRaw);
  if (!selectedBook) throw new TeacherAssessmentError("Select an adopted book for this subject.", "VALIDATION_FAILED");

  const chapterId = chapterIdRaw
    ? selectedBook.chapters.find((chapter) => chapter.id === chapterIdRaw)?.id ?? null
    : null;
  if (chapterIdRaw && !chapterId) throw new TeacherAssessmentError("Select a valid chapter.", "VALIDATION_FAILED");

  const resultRelease = normalizeRelease(formData.get("resultRelease"));
  const showScore = formData.get("showScore") === "on";
  const showCorrectAnswers = formData.get("showCorrectAnswers") === "on";
  const showExplanations = formData.get("showExplanations") === "on";

  const assessment = await prisma.$transaction(async (tx) => {
    const created = await tx.assessment.create({
      data: {
        publisherId: scope.publisherId,
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
        sectionId,
        sectionSubjectId: subject.id,
        schoolClassId: scope.schoolClass.id,
        bookId: selectedBook.id,
        chapterId,
        createdById: scope.teacher.userId,
        type,
        title,
        instructions,
        opensAt,
        dueAt,
        durationMinutes,
        status: AssessmentStatus.DRAFT,
      },
      select: { id: true },
    });

    await tx.assessmentSettings.create({
      data: {
        assessmentId: created.id,
        maxAttempts,
        resultRelease,
        showScore,
        showCorrectAnswers,
        showExplanations,
      },
    });

    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.create",
      targetType: "Assessment",
      targetId: created.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", toStatus: "DRAFT" },
    });

    return created;
  });

  return { assessmentId: assessment.id };
}

export async function getTeacherAssessmentEditor(input: {
  sectionId: string;
  assessmentId: string;
  search?: string;
  chapterId?: string;
}) {
  const { scope, assessment } = await loadOwnedAssessment(input.sectionId, input.assessmentId);
  const search = (input.search ?? "").trim();
  const chapterId = (input.chapterId ?? "").trim();
  const subject = scope.sectionSubjects.find((item) => item.id === assessment.sectionSubjectId) ?? scope.sectionSubjects[0];
  if (!subject) throw new TeacherAssessmentError("This subject is not assigned to you.");

  const adoptedBooks = subject.bookAdoptions.map((item) => item.book);
  const adoptedBookIds = adoptedBooks.map((book) => book.id);
  const selectedBook = adoptedBooks.find((book) => book.id === assessment.bookId) ?? adoptedBooks[0] ?? null;
  const selectedChapterId = chapterId || assessment.chapterId || "";

  const questionWhere: Prisma.BookQuestionWhereInput = {
    approved: true,
    bookId: { in: adoptedBookIds },
    ...(selectedChapterId ? { chapterId: selectedChapterId } : {}),
    ...(search
      ? {
          OR: [
            { questionText: { contains: search, mode: "insensitive" } },
            { competency: { contains: search, mode: "insensitive" } },
            { bloomLevel: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const teacherQuestionWhere: Prisma.TeacherQuestionWhereInput = {
    publisherId: scope.publisherId,
    schoolId: scope.schoolId,
    teacherId: scope.teacher.id,
    status: TeacherQuestionStatus.ACTIVE,
    questionType: { in: TEACHER_QUESTION_ASSESSMENT_TYPES },
    AND: [
      { OR: [{ sectionSubjectId: assessment.sectionSubjectId }, { sectionSubjectId: null }] },
      { OR: [{ bookId: assessment.bookId }, { bookId: null }] },
      ...(selectedChapterId
        ? [{ OR: [{ chapterId: selectedChapterId }, { chapterId: null }] }]
        : []),
      ...(search
        ? [{
            OR: [
              { questionText: { contains: search, mode: "insensitive" as const } },
              { competency: { contains: search, mode: "insensitive" as const } },
              { bloomLevel: { contains: search, mode: "insensitive" as const } },
              { tags: { has: search } },
            ],
          }]
        : []),
    ],
  };

  const [myQuestions, publisherQuestions, previousSnapshots] = await Promise.all([
    prisma.teacherQuestion.findMany({
      where: teacherQuestionWhere,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 120,
      select: {
        id: true,
        sectionSubjectId: true,
        bookId: true,
        chapterId: true,
        moduleId: true,
        questionType: true,
        questionText: true,
        marks: true,
        difficulty: true,
        bloomLevel: true,
        competency: true,
        tags: true,
      },
    }),
    prisma.bookQuestion.findMany({
      where: questionWhere,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 120,
      select: {
        id: true,
        chapterId: true,
        questionType: true,
        questionText: true,
        marks: true,
        competency: true,
      },
    }),
    prisma.assessmentQuestion.findMany({
      where: {
        assessment: {
          publisherId: scope.publisherId,
          schoolId: scope.schoolId,
          sectionId: input.sectionId,
          sectionSubjectId: assessment.sectionSubjectId,
        },
        ...(selectedChapterId ? { chapterId: selectedChapterId } : {}),
        ...(search ? { questionText: { contains: search, mode: "insensitive" } } : {}),
      },
      include: { assessment: { select: { id: true, title: true } } },
      orderBy: [{ createdAt: "desc" }],
      take: 120,
    }),
  ]);

  const selectedQuestionIds = new Set(assessment.questions.map((row) => row.questionId));
  const selectedSnapshotIds = new Set(assessment.questions.map((row) => row.id));

  return {
    scope,
    assessment,
    subject,
    selectedBook,
    selectedChapterId,
    search,
    canEditQuestions:
      assessment.status === AssessmentStatus.DRAFT ||
      (assessment.status === AssessmentStatus.PUBLISHED && assessment._count.attempts === 0),
    publisherQuestions: publisherQuestions.map((row) => ({
      ...row,
      alreadyAdded: selectedQuestionIds.has(row.id),
    })),
    myQuestions: myQuestions.map((row) => ({
      id: row.id,
      sectionSubjectId: row.sectionSubjectId,
      bookId: row.bookId,
      chapterId: row.chapterId,
      moduleId: row.moduleId,
      questionType: mapTeacherQuestionAssessmentType(row.questionType),
      questionText: row.questionText,
      marks: row.marks,
      difficulty: row.difficulty,
      bloomLevel: row.bloomLevel,
      competency: row.competency,
      tags: row.tags,
      alreadyAdded: false,
    })),
    previousSnapshots: previousSnapshots.map((row) => ({
      id: row.id,
      assessmentId: row.assessmentId,
      assessmentTitle: row.assessment.title,
      questionType: row.questionType,
      questionText: row.questionText,
      marks: row.marks,
      questionId: row.questionId,
      chapterId: row.chapterId,
      alreadyAdded: selectedQuestionIds.has(row.questionId) || selectedSnapshotIds.has(row.id),
    })),
  };
}

export async function updateTeacherAssessmentSettings(sectionId: string, assessmentId: string, formData: FormData) {
  const { scope, assessment } = await loadOwnedAssessment(sectionId, assessmentId);
  ensureMetadataEditAllowed({ status: assessment.status });

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 3 || title.length > 160) {
    throw new TeacherAssessmentError("Assessment name must be 3-160 characters.", "VALIDATION_FAILED");
  }

  const instructions = String(formData.get("instructions") ?? "").trim() || null;
  const durationMinutes = normalizeInt(formData.get("durationMinutes"));
  if (!validateAssessmentDuration(durationMinutes)) {
    throw new TeacherAssessmentError("Duration must be between 1 and 300 minutes.", "VALIDATION_FAILED");
  }
  const opensAt = normalizeDate(formData.get("opensAt"));
  const dueAt = normalizeDate(formData.get("dueAt"));
  ensureSchedulable(opensAt, dueAt);

  const maxAttempts = normalizeInt(formData.get("maxAttempts"));
  if (!maxAttempts || maxAttempts < 1 || maxAttempts > 20) {
    throw new TeacherAssessmentError("Attempts allowed must be between 1 and 20.", "VALIDATION_FAILED");
  }

  const resultRelease = normalizeRelease(formData.get("resultRelease"));
  const showScore = formData.get("showScore") === "on";
  const showCorrectAnswers = formData.get("showCorrectAnswers") === "on";
  const showExplanations = formData.get("showExplanations") === "on";

  const chapterIdRaw = String(formData.get("chapterId") ?? "").trim();
  const sectionSubjectIdRaw = String(formData.get("sectionSubjectId") ?? "").trim() || assessment.sectionSubjectId;
  const subject = scope.sectionSubjects.find((item) => item.id === sectionSubjectIdRaw);
  if (!subject) throw new TeacherAssessmentError("This subject is not assigned to you.", "VALIDATION_FAILED");

  const bookIdRaw = String(formData.get("bookId") ?? "").trim() || assessment.bookId;
  const selectedBook = subject.bookAdoptions.map((item) => item.book).find((book) => book.id === bookIdRaw);
  if (!selectedBook) throw new TeacherAssessmentError("Select an adopted book for this subject.", "VALIDATION_FAILED");

  const chapterId = chapterIdRaw
    ? selectedBook.chapters.find((chapter) => chapter.id === chapterIdRaw)?.id ?? null
    : null;

  const attemptsCount = assessment._count.attempts;
  const contentLocked = assessment.status === AssessmentStatus.PUBLISHED && attemptsCount > 0;

  await prisma.$transaction(async (tx) => {
    await tx.assessment.update({
      where: { id: assessment.id },
      data: {
        title,
        instructions,
        opensAt,
        dueAt,
        durationMinutes,
        ...(contentLocked
          ? {}
          : {
              type: normalizeAssessmentType(formData.get("type")),
              sectionSubjectId: subject.id,
              bookId: selectedBook.id,
              chapterId,
            }),
      },
    });

    await tx.assessmentSettings.update({
      where: { assessmentId: assessment.id },
      data: {
        maxAttempts,
        resultRelease,
        showScore,
        showCorrectAnswers,
        showExplanations,
      },
    });

    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.update",
      targetType: "Assessment",
      targetId: assessment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", fromStatus: assessment.status, toStatus: assessment.status },
    });
  });
}

export async function addPublisherQuestionsToAssessment(sectionId: string, assessmentId: string, questionIds: string[]) {
  const { scope, assessment } = await loadOwnedAssessment(sectionId, assessmentId);
  ensureQuestionEditAllowed({ status: assessment.status, attempts: assessment._count.attempts });

  const subject = scope.sectionSubjects.find((item) => item.id === assessment.sectionSubjectId);
  if (!subject) throw new TeacherAssessmentError("This subject is not assigned to you.");
  const allowedBookIds = subject.bookAdoptions.map((item) => item.bookId);

  const uniqueIds = [...new Set(questionIds.filter(Boolean))];
  if (!uniqueIds.length) return { added: 0 };

  const added = await prisma.$transaction(async (tx) => {
    const count = await appendBookQuestions({
      tx,
      assessmentId: assessment.id,
      bookQuestionIds: uniqueIds,
      allowedBookIds,
    });
    if (count > 0) {
      await writeSecurityAuditEvent(tx, {
        actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
        action: "classroom.assessment.update",
        targetType: "Assessment",
        targetId: assessment.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { scope: "classroom", fileCount: count },
      });
    }
    return count;
  });

  return { added };
}

export async function addTeacherQuestionsToAssessment(sectionId: string, assessmentId: string, teacherQuestionIds: string[]) {
  const { scope, assessment } = await loadOwnedAssessment(sectionId, assessmentId);
  ensureQuestionEditAllowed({ status: assessment.status, attempts: assessment._count.attempts });

  const uniqueIds = [...new Set(teacherQuestionIds.map((id) => id.trim()).filter(Boolean))];
  if (!uniqueIds.length) return { added: 0 };

  const added = await prisma.$transaction(async (tx) => {
    const sourceRows = await tx.teacherQuestion.findMany({
      where: {
        id: { in: uniqueIds },
        publisherId: scope.publisherId,
        schoolId: scope.schoolId,
        teacherId: scope.teacher.id,
        status: TeacherQuestionStatus.ACTIVE,
      },
      select: {
        id: true,
        publisherId: true,
        schoolId: true,
        teacherId: true,
        sectionSubjectId: true,
        bookId: true,
        chapterId: true,
        moduleId: true,
        questionType: true,
        questionText: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        marks: true,
        competency: true,
      },
    });

    if (sourceRows.length !== uniqueIds.length) {
      throw new TeacherAssessmentError("One or more selected My Questions are not available.", "QUESTION_NOT_AVAILABLE");
    }

    const sourceById = new Map(sourceRows.map((row) => [row.id, row]));
    const existing = await tx.assessmentQuestion.findMany({
      where: { assessmentId: assessment.id },
      select: { questionId: true },
    });
    const usedAnchorIds = new Set(existing.map((row) => row.questionId));
    let sequence = await nextSequence(assessment.id, tx);

    for (const teacherQuestionId of uniqueIds) {
      const source = sourceById.get(teacherQuestionId);
      if (!source) {
        throw new TeacherAssessmentError("One or more selected My Questions are not available.", "QUESTION_NOT_AVAILABLE");
      }

      if (!isTeacherQuestionAssessmentContextCompatible({
        question: source,
        assessment: {
          sectionSubjectId: assessment.sectionSubjectId,
          bookId: assessment.bookId,
          chapterId: assessment.chapterId,
        },
      })) {
        throw new TeacherAssessmentError("A selected My Question is outside this assessment context.", "QUESTION_NOT_AVAILABLE");
      }

      const bookId = source.bookId ?? assessment.bookId;
      const chapterId = source.chapterId ?? assessment.chapterId;
      if (!chapterId || bookId !== assessment.bookId) {
        throw new TeacherAssessmentError("A selected My Question has no compatible book/chapter context.", "QUESTION_NOT_AVAILABLE");
      }

      const chapter = await tx.bookChapter.findFirst({
        where: { id: chapterId, bookId },
        select: { id: true },
      });
      if (!chapter) {
        throw new TeacherAssessmentError("A selected My Question has invalid hierarchy context.", "QUESTION_NOT_AVAILABLE");
      }

      if (source.moduleId) {
        const moduleRecord = await tx.bookModule.findFirst({
          where: { id: source.moduleId, bookId, chapterId },
          select: { id: true },
        });
        if (!moduleRecord) {
          throw new TeacherAssessmentError("A selected My Question has invalid hierarchy context.", "QUESTION_NOT_AVAILABLE");
        }
      }

      const snapshot = mapTeacherQuestionToAssessmentSnapshot(source);
      if (!snapshot) {
        throw new TeacherAssessmentError("A selected My Question uses an unsupported or invalid question type.", "QUESTION_NOT_AVAILABLE");
      }

      const anchor = await tx.bookQuestion.findFirst({
        where: {
          id: { notIn: [...usedAnchorIds] },
          bookId,
          chapterId,
          approved: true,
          archived: false,
        },
        orderBy: { id: "asc" },
        select: { id: true },
      });
      if (!anchor) {
        throw new TeacherAssessmentError("No compatible approved question anchor is available for this assessment.", "QUESTION_NOT_AVAILABLE");
      }

      await tx.assessmentQuestion.create({
        data: {
          assessmentId: assessment.id,
          questionId: anchor.id,
          bookId,
          chapterId,
          sequence,
          questionType: snapshot.questionType,
          questionText: snapshot.questionText,
          options: asJsonInput(snapshot.options as Prisma.JsonValue | null),
          correctAnswer: snapshot.correctAnswer,
          explanation: snapshot.explanation ?? null,
          marks: snapshot.marks,
          competency: snapshot.competency ?? null,
          learningOutcome: null,
        },
      });
      usedAnchorIds.add(anchor.id);
      sequence += 1;
    }

    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.update",
      targetType: "Assessment",
      targetId: assessment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", fileOperation: "teacher_question_snapshot", fileCount: uniqueIds.length },
    });

    return uniqueIds.length;
  });

  return { added };
}

export async function addSnapshotQuestionsToAssessment(sectionId: string, assessmentId: string, snapshotIds: string[]) {
  const { scope, assessment } = await loadOwnedAssessment(sectionId, assessmentId);
  ensureQuestionEditAllowed({ status: assessment.status, attempts: assessment._count.attempts });
  const uniqueIds = [...new Set(snapshotIds.filter(Boolean))];
  if (!uniqueIds.length) return { added: 0 };

  const sourceRows = await prisma.assessmentQuestion.findMany({
    where: {
      id: { in: uniqueIds },
      assessment: {
        publisherId: scope.publisherId,
        schoolId: scope.schoolId,
      },
    },
    select: {
      questionId: true,
      bookId: true,
      chapterId: true,
      questionType: true,
      questionText: true,
      options: true,
      correctAnswer: true,
      explanation: true,
      marks: true,
      competency: true,
      learningOutcome: true,
    },
  });

  if (!sourceRows.length) return { added: 0 };

  const existing = await prisma.assessmentQuestion.findMany({
    where: { assessmentId: assessment.id },
    select: { questionId: true },
  });
  const existingSet = new Set(existing.map((row) => row.questionId));
  const filtered = sourceRows.filter((row) => !existingSet.has(row.questionId));
  if (!filtered.length) return { added: 0 };

  const added = await prisma.$transaction(async (tx) => {
    let sequence = await nextSequence(assessment.id, tx);
    for (const row of filtered) {
      await tx.assessmentQuestion.create({
        data: {
          assessmentId: assessment.id,
          questionId: row.questionId,
          bookId: row.bookId,
          chapterId: row.chapterId,
          sequence,
          questionType: row.questionType,
          questionText: row.questionText,
          options: asJsonInput(row.options),
          correctAnswer: row.correctAnswer,
          explanation: row.explanation,
          marks: row.marks,
          competency: row.competency,
          learningOutcome: row.learningOutcome,
        },
      });
      sequence += 1;
    }

    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.update",
      targetType: "Assessment",
      targetId: assessment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", fileCount: filtered.length },
    });

    return filtered.length;
  });

  return { added };
}

export async function addManualQuestionToAssessment(sectionId: string, assessmentId: string, formData: FormData) {
  const { scope, assessment } = await loadOwnedAssessment(sectionId, assessmentId);
  ensureQuestionEditAllowed({ status: assessment.status, attempts: assessment._count.attempts });

  const anchorQuestionId = String(formData.get("anchorQuestionId") ?? "").trim();
  const questionType = normalizeQuestionType(formData.get("questionType"));
  const questionText = String(formData.get("questionText") ?? "").trim();
  const marks = normalizeInt(formData.get("marks"));
  if (!anchorQuestionId || !questionType || questionText.length < 3 || !marks || marks < 1 || marks > 100) {
    throw new TeacherAssessmentError("Complete all manual question fields.", "VALIDATION_FAILED");
  }

  const anchor = await prisma.bookQuestion.findFirst({
    where: {
      id: anchorQuestionId,
      approved: true,
      bookId: assessment.bookId,
      ...(assessment.chapterId ? { chapterId: assessment.chapterId } : {}),
    },
    select: { id: true, bookId: true, chapterId: true },
  });
  if (!anchor) {
    throw new TeacherAssessmentError("Select a valid anchor question from this book/chapter.", "VALIDATION_FAILED");
  }

  const optionsText = String(formData.get("options") ?? "");
  const correctAnswerText = String(formData.get("correctAnswer") ?? "").trim() || null;

  let options: Prisma.InputJsonValue | Prisma.NullTypes.DbNull = Prisma.DbNull;
  if (questionType === "MCQ" || questionType === "MULTIPLE_SELECT") {
    const values = normalizeOptionLines(optionsText);
    if (values.length < 2) throw new TeacherAssessmentError("Add at least two options.", "VALIDATION_FAILED");
    options = values;
  } else if (questionType === "MATCH") {
    const pairs = normalizeOptionLines(optionsText)
      .map((line) => line.split("=>").map((part) => part.trim()))
      .filter((parts) => parts.length === 2 && parts[0] && parts[1]);
    if (pairs.length < 2) throw new TeacherAssessmentError("Use Left => Right format for match options.", "VALIDATION_FAILED");
    options = {
      left: pairs.map((parts) => parts[0]),
      right: pairs.map((parts) => parts[1]),
    };
  }

  if (["MCQ", "TRUE_FALSE", "FILL_BLANK", "MATCH", "MULTIPLE_SELECT"].includes(questionType) && !correctAnswerText) {
    throw new TeacherAssessmentError("Correct answer is required for objective question types.", "VALIDATION_FAILED");
  }

  const explanation = String(formData.get("explanation") ?? "").trim() || null;
  const competency = String(formData.get("competency") ?? "").trim() || null;

  const snapshot: AssessmentQuestionSnapshot = {
    id: "manual",
    questionType,
    questionText,
    options: options === Prisma.DbNull ? null : options,
    correctAnswer: correctAnswerText,
    marks,
  };
  if (!isValidAssessmentQuestion(snapshot)) {
    throw new TeacherAssessmentError("Manual question content is invalid for the selected type.", "VALIDATION_FAILED");
  }

  await prisma.$transaction(async (tx) => {
    const sequence = await nextSequence(assessment.id, tx);
    await tx.assessmentQuestion.create({
      data: {
        assessmentId: assessment.id,
        questionId: anchor.id,
        bookId: anchor.bookId,
        chapterId: anchor.chapterId,
        sequence,
        questionType,
        questionText,
        options,
        correctAnswer: correctAnswerText,
        explanation,
        marks,
        competency,
        learningOutcome: null,
      },
    });

    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.update",
      targetType: "Assessment",
      targetId: assessment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", fileOperation: "manual_question" },
    });
  });
}

export async function updateAssessmentQuestionMarks(sectionId: string, assessmentId: string, assessmentQuestionId: string, marks: number) {
  const { scope, assessment } = await loadOwnedAssessment(sectionId, assessmentId);
  ensureQuestionEditAllowed({ status: assessment.status, attempts: assessment._count.attempts });
  if (!Number.isInteger(marks) || marks < 1 || marks > 100) {
    throw new TeacherAssessmentError("Marks must be between 1 and 100.", "VALIDATION_FAILED");
  }

  const found = assessment.questions.find((question) => question.id === assessmentQuestionId);
  if (!found) throw new TeacherAssessmentError("Question not found.", "NOT_FOUND");

  await prisma.$transaction(async (tx) => {
    await tx.assessmentQuestion.update({ where: { id: found.id }, data: { marks } });
    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.update",
      targetType: "Assessment",
      targetId: assessment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", fileOperation: "marks" },
    });
  });
}

export async function removeAssessmentQuestion(sectionId: string, assessmentId: string, assessmentQuestionId: string) {
  const { scope, assessment } = await loadOwnedAssessment(sectionId, assessmentId);
  ensureQuestionEditAllowed({ status: assessment.status, attempts: assessment._count.attempts });

  const found = assessment.questions.find((question) => question.id === assessmentQuestionId);
  if (!found) throw new TeacherAssessmentError("Question not found.", "NOT_FOUND");

  await prisma.$transaction(async (tx) => {
    await tx.assessmentQuestion.delete({ where: { id: found.id } });
    const remaining = await tx.assessmentQuestion.findMany({
      where: { assessmentId: assessment.id },
      orderBy: { sequence: "asc" },
      select: { id: true },
    });
    for (const [index, question] of remaining.entries()) {
      await tx.assessmentQuestion.update({ where: { id: question.id }, data: { sequence: index + 1 } });
    }
    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.update",
      targetType: "Assessment",
      targetId: assessment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", fileOperation: "remove_question" },
    });
  });
}

export async function moveAssessmentQuestion(sectionId: string, assessmentId: string, assessmentQuestionId: string, direction: "UP" | "DOWN") {
  const { scope, assessment } = await loadOwnedAssessment(sectionId, assessmentId);
  ensureQuestionEditAllowed({ status: assessment.status, attempts: assessment._count.attempts });

  const index = assessment.questions.findIndex((question) => question.id === assessmentQuestionId);
  const swap = direction === "UP" ? index - 1 : index + 1;
  if (index < 0 || swap < 0 || swap >= assessment.questions.length) return;

  const current = assessment.questions[index];
  const sibling = assessment.questions[swap];

  await prisma.$transaction(async (tx) => {
    await tx.assessmentQuestion.update({ where: { id: current.id }, data: { sequence: sibling.sequence } });
    await tx.assessmentQuestion.update({ where: { id: sibling.id }, data: { sequence: current.sequence } });
    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.update",
      targetType: "Assessment",
      targetId: assessment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", fileOperation: "reorder" },
    });
  });
}

export async function shuffleAssessmentQuestions(sectionId: string, assessmentId: string) {
  const { scope, assessment } = await loadOwnedAssessment(sectionId, assessmentId);
  ensureQuestionEditAllowed({ status: assessment.status, attempts: assessment._count.attempts });
  if (assessment.questions.length < 2) return;

  const shuffled = [...assessment.questions]
    .map((question) => ({ key: Math.random(), id: question.id }))
    .sort((a, b) => a.key - b.key);

  await prisma.$transaction(async (tx) => {
    for (const [index, question] of shuffled.entries()) {
      await tx.assessmentQuestion.update({ where: { id: question.id }, data: { sequence: index + 1 } });
    }
    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.update",
      targetType: "Assessment",
      targetId: assessment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", fileOperation: "shuffle" },
    });
  });
}

export async function duplicateAssessmentQuestion(sectionId: string, assessmentId: string, assessmentQuestionId: string) {
  const { scope, assessment } = await loadOwnedAssessment(sectionId, assessmentId);
  ensureQuestionEditAllowed({ status: assessment.status, attempts: assessment._count.attempts });

  const source = assessment.questions.find((question) => question.id === assessmentQuestionId);
  if (!source) throw new TeacherAssessmentError("Question not found.", "NOT_FOUND");

  const used = new Set(assessment.questions.map((question) => question.questionId));
  const anchor = await prisma.bookQuestion.findFirst({
    where: {
      approved: true,
      bookId: source.bookId,
      chapterId: source.chapterId,
      id: { notIn: [...used] },
    },
    select: { id: true },
  });
  if (!anchor) {
    throw new TeacherAssessmentError(
      "This question cannot be duplicated because no additional anchor question is available in this chapter.",
      "VALIDATION_FAILED",
    );
  }

  await prisma.$transaction(async (tx) => {
    const sequence = await nextSequence(assessment.id, tx);
    await tx.assessmentQuestion.create({
      data: {
        assessmentId: assessment.id,
        questionId: anchor.id,
        bookId: source.bookId,
        chapterId: source.chapterId,
        sequence,
        questionType: source.questionType,
        questionText: source.questionText,
        options: asJsonInput(source.options),
        correctAnswer: source.correctAnswer,
        explanation: source.explanation,
        marks: source.marks,
        competency: source.competency,
        learningOutcome: source.learningOutcome,
      },
    });
    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.update",
      targetType: "Assessment",
      targetId: assessment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", fileOperation: "duplicate_question" },
    });
  });
}

export async function publishTeacherAssessment(sectionId: string, assessmentId: string, expectedTotalMarks: number | null) {
  const { scope, assessment } = await loadOwnedAssessment(sectionId, assessmentId);
  if (assessment.status === AssessmentStatus.ARCHIVED) {
    throw new TeacherAssessmentError("Restore this assessment before publishing.", "INVALID_STATE");
  }
  await ensurePublishable(assessment.id, expectedTotalMarks);

  await prisma.$transaction(async (tx) => {
    await tx.assessment.update({
      where: { id: assessment.id },
      data: {
        status: AssessmentStatus.PUBLISHED,
        publishedAt: assessment.publishedAt ?? new Date(),
      },
    });
    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.publish",
      targetType: "Assessment",
      targetId: assessment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", fromStatus: assessment.status, toStatus: "PUBLISHED" },
    });
  });
}

export async function duplicateTeacherAssessment(sectionId: string, assessmentId: string) {
  const { scope, assessment } = await loadOwnedAssessment(sectionId, assessmentId);

  const duplicate = await prisma.$transaction(async (tx) => {
    const created = await tx.assessment.create({
      data: {
        publisherId: assessment.publisherId,
        schoolId: assessment.schoolId,
        academicYearId: assessment.academicYearId,
        schoolClassId: assessment.schoolClassId,
        sectionId: assessment.sectionId,
        sectionSubjectId: assessment.sectionSubjectId,
        bookId: assessment.bookId,
        chapterId: assessment.chapterId,
        createdById: assessment.createdById,
        type: assessment.type,
        title: `${assessment.title} (Copy)`.slice(0, 160),
        instructions: assessment.instructions,
        status: AssessmentStatus.DRAFT,
        opensAt: assessment.opensAt,
        dueAt: assessment.dueAt,
        durationMinutes: assessment.durationMinutes,
      },
      select: { id: true },
    });

    if (assessment.settings) {
      await tx.assessmentSettings.create({
        data: {
          assessmentId: created.id,
          showScore: assessment.settings.showScore,
          showCorrectAnswers: assessment.settings.showCorrectAnswers,
          showExplanations: assessment.settings.showExplanations,
          showSolutions: assessment.settings.showSolutions,
          resultRelease: assessment.settings.resultRelease,
          maxAttempts: assessment.settings.maxAttempts,
        },
      });
    }

    for (const question of assessment.questions) {
      await tx.assessmentQuestion.create({
        data: {
          assessmentId: created.id,
          questionId: question.questionId,
          bookId: question.bookId,
          chapterId: question.chapterId,
          sequence: question.sequence,
          questionType: question.questionType,
          questionText: question.questionText,
          options: asJsonInput(question.options),
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          marks: question.marks,
          competency: question.competency,
          learningOutcome: question.learningOutcome,
        },
      });
    }

    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.duplicate",
      targetType: "Assessment",
      targetId: created.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", fromStatus: assessment.status, toStatus: "DRAFT" },
    });

    return created;
  });

  return { assessmentId: duplicate.id };
}

export async function archiveTeacherAssessment(sectionId: string, assessmentId: string) {
  const { scope, assessment } = await loadOwnedAssessment(sectionId, assessmentId);
  if (assessment.status === AssessmentStatus.ARCHIVED) return;
  await prisma.$transaction(async (tx) => {
    await tx.assessment.update({ where: { id: assessment.id }, data: { status: AssessmentStatus.ARCHIVED } });
    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.archive",
      targetType: "Assessment",
      targetId: assessment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", fromStatus: assessment.status, toStatus: "ARCHIVED" },
    });
  });
}

export async function restoreTeacherAssessment(sectionId: string, assessmentId: string) {
  const { scope, assessment } = await loadOwnedAssessment(sectionId, assessmentId);
  if (assessment.status !== AssessmentStatus.ARCHIVED) return;
  const nextStatus = assessment._count.attempts > 0 ? AssessmentStatus.CLOSED : AssessmentStatus.DRAFT;
  await prisma.$transaction(async (tx) => {
    await tx.assessment.update({ where: { id: assessment.id }, data: { status: nextStatus } });
    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.restore",
      targetType: "Assessment",
      targetId: assessment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", fromStatus: "ARCHIVED", toStatus: nextStatus },
    });
  });
}

export async function closeTeacherAssessment(sectionId: string, assessmentId: string) {
  const { scope, assessment } = await loadOwnedAssessment(sectionId, assessmentId);
  if (assessment.status === AssessmentStatus.ARCHIVED) {
    throw new TeacherAssessmentError("Restore this assessment before closing it.", "INVALID_STATE");
  }
  if (assessment.status === AssessmentStatus.CLOSED) return;
  await prisma.$transaction(async (tx) => {
    await tx.assessment.update({ where: { id: assessment.id }, data: { status: AssessmentStatus.CLOSED } });
    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.update",
      targetType: "Assessment",
      targetId: assessment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", fromStatus: assessment.status, toStatus: "CLOSED" },
    });
  });
}

export async function getTeacherAssessmentPreview(sectionId: string, assessmentId: string) {
  const { assessment } = await loadOwnedAssessment(sectionId, assessmentId);
  const questions = assessment.questions
    .map((question, index) =>
      toSafeAssessmentQuestion(
        {
          id: question.id,
          questionType: question.questionType,
          questionText: question.questionText,
          options: question.options,
          correctAnswer: question.correctAnswer,
          marks: question.marks,
        },
        index + 1,
      ),
    )
    .filter((question): question is NonNullable<typeof question> => Boolean(question));
  return { assessment, questions };
}

export async function getTeacherAssessmentGradingQueue(input: {
  sectionId: string;
  assessmentId: string;
  filter?: string | null;
  query?: string | null;
  page?: number | null;
  pageSize?: number | null;
}) {
  const { scope, assessment } = await loadOwnedAssessment(input.sectionId, input.assessmentId);
  if (assessment.status === AssessmentStatus.DRAFT) {
    throw new TeacherAssessmentError("Publish this assessment before opening grading.", "INVALID_STATE");
  }

  const filterRaw = String(input.filter ?? "ALL").trim().toUpperCase();
  const filter: TeacherAssessmentGradingFilter = ["ALL", "NEEDS_GRADING", "SUBMITTED", "GRADED", "RESULT_PUBLISHED", "NOT_SUBMITTED"].includes(filterRaw)
    ? (filterRaw as TeacherAssessmentGradingFilter)
    : "ALL";
  const page = Number.isInteger(input.page) && (input.page ?? 1) > 0 ? Number(input.page) : 1;
  const pageSizeCandidate = Number.isInteger(input.pageSize) ? Number(input.pageSize) : 20;
  const pageSize = Math.min(100, Math.max(10, pageSizeCandidate));
  const query = String(input.query ?? "").trim();

  await recordTrustedAuditBestEffort({
    actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
    action: "classroom.assessment.grading.view",
    targetType: "Assessment",
    targetId: assessment.id,
    outcome: SecurityAuditOutcome.SUCCESS,
    metadata: { scope: "classroom", purpose: "grading_queue_view" },
  });

  const enrollmentWhere: Prisma.StudentEnrollmentWhereInput = {
    schoolId: scope.schoolId,
    academicYearId: scope.academicYear.id,
    sectionId: input.sectionId,
    status: "ACTIVE",
    student: { active: true },
    ...(query
      ? {
          OR: [
            { student: { name: { contains: query, mode: "insensitive" } } },
            { rollNumber: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const enrollments = await prisma.studentEnrollment.findMany({
    where: enrollmentWhere,
    select: {
      id: true,
      studentId: true,
      rollNumber: true,
      student: { select: { name: true } },
    },
    orderBy: [{ rollNumber: "asc" }, { student: { name: "asc" } }],
  });

  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      assessmentId: assessment.id,
      schoolId: scope.schoolId,
      academicYearId: scope.academicYear.id,
      studentId: { in: enrollments.map((item) => item.studentId) },
    },
    select: {
      id: true,
      studentId: true,
      status: true,
      submittedAt: true,
      createdAt: true,
      result: { select: { id: true, publishedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const latestAttemptByStudent = new Map<string, (typeof attempts)[number]>();
  for (const attempt of attempts) {
    if (!latestAttemptByStudent.has(attempt.studentId)) latestAttemptByStudent.set(attempt.studentId, attempt);
  }

  const latestAttemptIds = [...new Set([...latestAttemptByStudent.values()].map((item) => item.id))];
  const responses = latestAttemptIds.length
    ? await prisma.assessmentResponse.findMany({
        where: { attemptId: { in: latestAttemptIds } },
        select: {
          attemptId: true,
          autoGraded: true,
          marksAwarded: true,
          reviewStatus: true,
        },
      })
    : [];

  const responseByAttempt = new Map<string, typeof responses>();
  for (const response of responses) {
    const list = responseByAttempt.get(response.attemptId) ?? [];
    list.push(response);
    responseByAttempt.set(response.attemptId, list);
  }

  const rows = enrollments.map((enrollment) => {
    const latest = latestAttemptByStudent.get(enrollment.studentId) ?? null;
    const marks = latest ? computeAttemptMarks(responseByAttempt.get(latest.id) ?? []) : { objective: 0, subjective: 0, total: 0 };
    const status: AssessmentAttemptStatus | "NOT_SUBMITTED" = latest ? latest.status : "NOT_SUBMITTED";
    const resultPublished = Boolean(latest?.result?.publishedAt);
    const publication = evaluatePublicationReadiness({
      status,
      hasResult: Boolean(latest?.result?.id),
      publishedAt: latest?.result?.publishedAt ?? null,
      releasePolicy: assessment.settings?.resultRelease ?? AssessmentResultRelease.NEVER,
      dueAt: assessment.dueAt,
    });
    return {
      studentId: enrollment.studentId,
      studentName: enrollment.student.name,
      rollNumber: enrollment.rollNumber,
      attemptId: latest?.id ?? null,
      attemptNumber: latest
        ? attempts.filter((item) => item.studentId === enrollment.studentId && item.createdAt <= latest.createdAt).length
        : 0,
      submittedAt: latest?.submittedAt?.toISOString() ?? null,
      objectiveScore: marks.objective,
      subjectiveScore: marks.subjective,
      totalScore: marks.total,
      reviewStatus: toGradingStatusLabel(status),
      resultStatus: toResultStatusLabel(latest?.result?.publishedAt ?? null, assessment.settings?.resultRelease ?? AssessmentResultRelease.NEVER),
      status,
      resultPublished,
      canPublishResult: publication.canPublish,
      publishBlockedReason: publication.reason,
      publishBlockedLabel: publicationBlockLabel(publication.reason),
    };
  });

  const filteredRows = rows.filter((row) => {
    if (filter === "ALL") return true;
    if (filter === "NEEDS_GRADING") return row.status === AssessmentAttemptStatus.SUBMITTED || row.status === AssessmentAttemptStatus.PENDING_REVIEW;
    if (filter === "SUBMITTED") return row.status === AssessmentAttemptStatus.SUBMITTED;
    if (filter === "GRADED") return row.status === AssessmentAttemptStatus.GRADED;
    if (filter === "RESULT_PUBLISHED") return row.resultPublished;
    return row.status === "NOT_SUBMITTED" || row.status === AssessmentAttemptStatus.IN_PROGRESS;
  });

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const latestAll = new Map<string, (typeof attempts)[number]>();
  for (const attempt of attempts) {
    if (!latestAll.has(attempt.studentId)) latestAll.set(attempt.studentId, attempt);
  }
  const summaryRows = enrollments.map((enrollment) => latestAll.get(enrollment.studentId) ?? null);
  const resultsPublished = summaryRows.filter((item) => item?.result?.publishedAt).length;
  const graded = summaryRows.filter((item) => item?.status === AssessmentAttemptStatus.GRADED).length;
  const submitted = summaryRows.filter((item) => item?.status === AssessmentAttemptStatus.SUBMITTED).length;
  const pendingReview = summaryRows.filter((item) => item?.status === AssessmentAttemptStatus.PENDING_REVIEW).length;
  const inProgress = summaryRows.filter((item) => item?.status === AssessmentAttemptStatus.IN_PROGRESS).length;
  const notStarted = summaryRows.filter((item) => !item).length;
  const readyToPublish = rows.filter((row) => row.canPublishResult).length;
  const blockedFromPublish = rows.filter((row) => row.attemptId && !row.canPublishResult).length;

  return {
    assessment: {
      id: assessment.id,
      title: assessment.title,
      status: assessment.status,
      releasePolicy: assessment.settings?.resultRelease ?? AssessmentResultRelease.NEVER,
      releaseLabel: toResultStatusLabel(null, assessment.settings?.resultRelease ?? AssessmentResultRelease.NEVER),
    },
    cards: {
      totalStudents: enrollments.length,
      notStarted,
      inProgress,
      submitted,
      needsGrading: submitted + pendingReview,
      graded,
      resultsPublished,
      readyToPublish,
      blockedFromPublish,
    },
    gradingStatus:
      enrollments.length === 0
        ? "NO_SUBMISSIONS"
        : resultsPublished === graded && graded > 0
          ? "RESULTS_PUBLISHED"
          : resultsPublished > 0
            ? "RESULTS_PARTIALLY_PUBLISHED"
            : graded > 0 && graded === summaryRows.filter((item) => item && item.status !== AssessmentAttemptStatus.IN_PROGRESS).length
              ? "FULLY_GRADED"
              : pendingReview > 0
                ? "GRADING_IN_PROGRESS"
                : submitted > 0
                  ? "NEEDS_GRADING"
                  : "GRADING_NOT_STARTED",
    filter,
    query,
    pagination: {
      page: safePage,
      pageSize,
      totalRows,
      totalPages,
    },
    rows: pageRows,
    publicationReadiness: {
      readyToPublish,
      blockedFromPublish,
      releasePolicy: assessment.settings?.resultRelease ?? AssessmentResultRelease.NEVER,
    },
  };
}

export async function getTeacherAssessmentGradingAttempt(input: {
  sectionId: string;
  assessmentId: string;
  attemptId: string;
}) {
  const { scope, assessment } = await loadOwnedAssessment(input.sectionId, input.assessmentId);
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: {
      id: input.attemptId,
      assessmentId: assessment.id,
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      academicYearId: scope.academicYear.id,
    },
    include: {
      student: { select: { name: true } },
      result: true,
      responses: {
        orderBy: { assessmentQuestion: { sequence: "asc" } },
        include: {
          assessmentQuestion: {
            select: {
              id: true,
              sequence: true,
              questionType: true,
              questionText: true,
              options: true,
              correctAnswer: true,
              explanation: true,
              marks: true,
            },
          },
        },
      },
    },
  });
  if (!attempt) throw new TeacherAssessmentError("This attempt is not available.", "NOT_FOUND");
  if (attempt.status === AssessmentAttemptStatus.IN_PROGRESS || attempt.status === AssessmentAttemptStatus.ABANDONED) {
    throw new TeacherAssessmentError("This attempt is not submitted for grading.", "INVALID_STATE");
  }

  await recordTrustedAuditBestEffort({
    actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
    action: "classroom.assessment.grading.view",
    targetType: "AssessmentAttempt",
    targetId: attempt.id,
    outcome: SecurityAuditOutcome.SUCCESS,
    metadata: { scope: "classroom", purpose: "grading_attempt_view", attempt: attempt.id },
  });

  const responseMarks = computeAttemptMarks(
    attempt.responses.map((response) => ({ autoGraded: response.autoGraded, marksAwarded: response.marksAwarded })),
  );

  const totalMaximum = attempt.responses.reduce((sum, response) => sum + response.assessmentQuestion.marks, 0);
  const subjectivePending = attempt.responses.filter((response) => isSubjectiveQuestionType(response.assessmentQuestion.questionType) && response.reviewStatus !== AssessmentReviewStatus.REVIEWED).length;
  const reviewed = attempt.responses.filter((response) => response.reviewStatus === AssessmentReviewStatus.REVIEWED).length;
  const subjective = attempt.responses.filter((response) => isSubjectiveQuestionType(response.assessmentQuestion.questionType)).length;
  const objective = attempt.responses.length - subjective;
  const percentage = totalMaximum > 0 ? Math.round((responseMarks.total / totalMaximum) * 10000) / 100 : 0;
  const publication = evaluatePublicationReadiness({
    status: attempt.status,
    hasResult: Boolean(attempt.result?.id),
    publishedAt: attempt.result?.publishedAt ?? null,
    releasePolicy: assessment.settings?.resultRelease ?? AssessmentResultRelease.NEVER,
    dueAt: assessment.dueAt,
  });

  return {
    assessment: {
      id: assessment.id,
      title: assessment.title,
      className: `${scope.schoolClass.name}-${scope.section.name}`,
    },
    attempt: {
      id: attempt.id,
      status: attempt.status,
      statusLabel: toGradingStatusLabel(attempt.status),
      resultStatusLabel: toResultStatusLabel(attempt.result?.publishedAt ?? null, assessment.settings?.resultRelease ?? AssessmentResultRelease.NEVER),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      startedAt: attempt.startedAt.toISOString(),
      attemptNumber: await prisma.assessmentAttempt.count({
        where: {
          assessmentId: assessment.id,
          studentId: attempt.studentId,
          createdAt: { lte: attempt.createdAt },
        },
      }),
      studentName: attempt.student.name,
      studentId: attempt.studentId,
      canComplete: subjectivePending === 0,
      canReopen: attempt.status === AssessmentAttemptStatus.GRADED && !attempt.result?.publishedAt && assessment.status !== AssessmentStatus.ARCHIVED,
      canPublishResult: publication.canPublish,
      publishBlockedReason: publication.reason,
      publishBlockedLabel: publicationBlockLabel(publication.reason),
    },
    navigator: {
      objective,
      subjective,
      reviewed,
      pending: subjectivePending,
      flagged: 0,
    },
    summary: {
      objectiveMarks: responseMarks.objective,
      subjectiveMarks: responseMarks.subjective,
      totalAwarded: responseMarks.total,
      totalMaximum,
      percentage,
      progressPercent: subjective ? Math.round(((subjective - subjectivePending) / subjective) * 100) : 100,
    },
    questions: attempt.responses.map((response, index) => ({
      responseId: response.id,
      assessmentQuestionId: response.assessmentQuestionId,
      questionNumber: index + 1,
      questionType: response.assessmentQuestion.questionType,
      subjective: isSubjectiveQuestionType(response.assessmentQuestion.questionType),
      questionText: response.assessmentQuestion.questionText,
      maxMarks: response.assessmentQuestion.marks,
      studentResponse: response.answer,
      correctAnswer: response.assessmentQuestion.correctAnswer,
      explanation: response.assessmentQuestion.explanation,
      autoGraded: response.autoGraded,
      correct: response.correct,
      marksAwarded: response.marksAwarded,
      feedback: response.feedback,
      reviewStatus: response.reviewStatus,
      reviewedAt: response.reviewedAt?.toISOString() ?? null,
    })),
  };
}

export async function saveTeacherAssessmentResponseGrade(input: {
  sectionId: string;
  assessmentId: string;
  attemptId: string;
  responseId: string;
  marksAwarded: number;
  feedback?: string | null;
}) {
  const { scope, assessment } = await loadOwnedAssessment(input.sectionId, input.assessmentId);
  if (assessment.status === AssessmentStatus.ARCHIVED) {
    throw new TeacherAssessmentError("Archived assessments cannot be graded.", "INVALID_STATE");
  }

  const result = await prisma.$transaction(async (tx) => {
    const attempt = await tx.assessmentAttempt.findFirst({
      where: {
        id: input.attemptId,
        assessmentId: assessment.id,
        publisherId: scope.publisherId,
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
      },
      select: { id: true, status: true, result: { select: { id: true } } },
    });
    if (!attempt) throw new TeacherAssessmentError("This attempt is not available.", "NOT_FOUND");
    if (attempt.status === AssessmentAttemptStatus.IN_PROGRESS || attempt.status === AssessmentAttemptStatus.ABANDONED) {
      throw new TeacherAssessmentError("This attempt is not submitted for grading.", "INVALID_STATE");
    }

    const response = await tx.assessmentResponse.findFirst({
      where: {
        id: input.responseId,
        attemptId: attempt.id,
      },
      include: {
        assessmentQuestion: { select: { marks: true, questionType: true } },
      },
    });
    if (!response) throw new TeacherAssessmentError("This response is not available.", "NOT_FOUND");
    if (response.autoGraded) {
      throw new TeacherAssessmentError("Objective responses are auto-graded and cannot be overridden in this phase.", "INVALID_STATE");
    }

    if (!Number.isFinite(input.marksAwarded)) {
      throw new TeacherAssessmentError("Marks must be numeric.", "VALIDATION_FAILED");
    }
    const marks = Number(input.marksAwarded);
    if (marks < 0) throw new TeacherAssessmentError("Marks cannot be negative.", "VALIDATION_FAILED");
    if (marks > response.assessmentQuestion.marks) {
      throw new TeacherAssessmentError("Marks cannot exceed question maximum.", "VALIDATION_FAILED");
    }

    await tx.assessmentResponse.update({
      where: { id: response.id },
      data: {
        marksAwarded: marks,
        feedback: String(input.feedback ?? "").trim() || null,
        reviewStatus: AssessmentReviewStatus.REVIEWED,
        reviewedAt: new Date(),
        reviewedById: scope.teacher.userId,
      },
    });

    if (attempt.status !== AssessmentAttemptStatus.PENDING_REVIEW) {
      await tx.assessmentAttempt.update({ where: { id: attempt.id }, data: { status: AssessmentAttemptStatus.PENDING_REVIEW } });
    }

    const recomputed = await recomputeAssessmentAttemptResult(tx, attempt.id);

    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.grading.save",
      targetType: "AssessmentResponse",
      targetId: response.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", purpose: "grading_save", attempt: attempt.id },
    });

    return {
      attemptStatus: AssessmentAttemptStatus.PENDING_REVIEW,
      subjectivePending: recomputed.summary.subjectivePending,
    };
  });

  return { ok: true as const, ...result };
}

export async function completeTeacherAssessmentGrading(input: {
  sectionId: string;
  assessmentId: string;
  attemptId: string;
}) {
  const { scope, assessment } = await loadOwnedAssessment(input.sectionId, input.assessmentId);
  if (assessment.status === AssessmentStatus.ARCHIVED) {
    throw new TeacherAssessmentError("Archived assessments cannot be graded.", "INVALID_STATE");
  }

  const result = await prisma.$transaction(async (tx) => {
    const attempt = await tx.assessmentAttempt.findFirst({
      where: {
        id: input.attemptId,
        assessmentId: assessment.id,
        publisherId: scope.publisherId,
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
      },
      include: {
        responses: {
          include: {
            assessmentQuestion: { select: { marks: true, questionType: true } },
          },
        },
        result: true,
      },
    });
    if (!attempt) throw new TeacherAssessmentError("This attempt is not available.", "NOT_FOUND");
    if (attempt.status === AssessmentAttemptStatus.GRADED) {
      return { status: AssessmentAttemptStatus.GRADED, alreadyComplete: true };
    }
    if (attempt.status === AssessmentAttemptStatus.IN_PROGRESS || attempt.status === AssessmentAttemptStatus.ABANDONED) {
      throw new TeacherAssessmentError("This attempt is not submitted for grading.", "INVALID_STATE");
    }

    for (const response of attempt.responses) {
      if (!response.autoGraded && isSubjectiveQuestionType(response.assessmentQuestion.questionType)) {
        if (response.reviewStatus !== AssessmentReviewStatus.REVIEWED) {
          throw new TeacherAssessmentError("Complete all subjective reviews before finishing grading.", "VALIDATION_FAILED");
        }
        if (response.marksAwarded == null) {
          throw new TeacherAssessmentError("Every reviewed subjective response needs awarded marks.", "VALIDATION_FAILED");
        }
        if (response.marksAwarded < 0 || response.marksAwarded > response.assessmentQuestion.marks) {
          throw new TeacherAssessmentError("A subjective score is outside valid mark limits.", "VALIDATION_FAILED");
        }
      }
      if (response.marksAwarded != null && response.marksAwarded > response.assessmentQuestion.marks) {
        throw new TeacherAssessmentError("A score exceeds the maximum marks for its question.", "VALIDATION_FAILED");
      }
    }

    const recomputed = await recomputeAssessmentAttemptResult(tx, attempt.id);
    if (recomputed.summary.subjectivePending > 0) {
      throw new TeacherAssessmentError("All pending subjective responses must be reviewed.", "VALIDATION_FAILED");
    }

    await tx.assessmentAttempt.update({ where: { id: attempt.id }, data: { status: AssessmentAttemptStatus.GRADED } });

    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.grading.complete",
      targetType: "AssessmentAttempt",
      targetId: attempt.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", purpose: "grading_complete", attempt: attempt.id },
    });

    return { status: AssessmentAttemptStatus.GRADED, alreadyComplete: false };
  });

  return { ok: true as const, ...result };
}

export async function reopenTeacherAssessmentGrading(input: {
  sectionId: string;
  assessmentId: string;
  attemptId: string;
  reason: string;
}) {
  const { scope, assessment } = await loadOwnedAssessment(input.sectionId, input.assessmentId);
  if (assessment.status === AssessmentStatus.ARCHIVED) {
    throw new TeacherAssessmentError("Archived assessments cannot be reopened for grading.", "INVALID_STATE");
  }
  if (!String(input.reason).trim()) {
    throw new TeacherAssessmentError("A reopen reason is required.", "VALIDATION_FAILED");
  }

  const result = await prisma.$transaction(async (tx) => {
    const attempt = await tx.assessmentAttempt.findFirst({
      where: {
        id: input.attemptId,
        assessmentId: assessment.id,
        publisherId: scope.publisherId,
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
      },
      include: {
        result: true,
        responses: {
          include: {
            assessmentQuestion: { select: { questionType: true } },
          },
        },
      },
    });
    if (!attempt) throw new TeacherAssessmentError("This attempt is not available.", "NOT_FOUND");
    if (attempt.status !== AssessmentAttemptStatus.GRADED) {
      throw new TeacherAssessmentError("Only graded attempts can be reopened.", "INVALID_STATE");
    }
    if (attempt.result?.publishedAt) {
      throw new TeacherAssessmentError("Published results cannot be reopened in this phase.", "INVALID_STATE");
    }

    for (const response of attempt.responses) {
      if (!response.autoGraded && isSubjectiveQuestionType(response.assessmentQuestion.questionType)) {
        await tx.assessmentResponse.update({
          where: { id: response.id },
          data: {
            marksAwarded: null,
            reviewStatus: AssessmentReviewStatus.PENDING,
            reviewedAt: null,
            reviewedById: null,
          },
        });
      }
    }

    await tx.assessmentAttempt.update({ where: { id: attempt.id }, data: { status: AssessmentAttemptStatus.PENDING_REVIEW } });
    await recomputeAssessmentAttemptResult(tx, attempt.id);

    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.grading.reopen",
      targetType: "AssessmentAttempt",
      targetId: attempt.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", purpose: "grading_reopen", attempt: attempt.id },
    });

    return { status: AssessmentAttemptStatus.PENDING_REVIEW };
  });

  return { ok: true as const, ...result };
}

export async function publishTeacherAssessmentResult(input: {
  sectionId: string;
  assessmentId: string;
  attemptId: string;
}) {
  const { scope, assessment } = await loadOwnedAssessment(input.sectionId, input.assessmentId);
  if (assessment.status === AssessmentStatus.ARCHIVED) {
    throw new TeacherAssessmentError("Archived assessments cannot publish results.", "INVALID_STATE");
  }

  const book = await prisma.book.findUnique({ where: { id: assessment.bookId }, select: { subjectId: true } });
  if (!book) throw new TeacherAssessmentError("Assessment subject is unavailable.", "NOT_FOUND");

  const published = await prisma.$transaction(async (tx) => {
    const attempt = await tx.assessmentAttempt.findFirst({
      where: {
        id: input.attemptId,
        assessmentId: assessment.id,
        publisherId: scope.publisherId,
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
      },
      include: {
        result: true,
      },
    });
    if (!attempt) throw new TeacherAssessmentError("This attempt is not available.", "NOT_FOUND");
    const readiness = evaluatePublicationReadiness({
      status: attempt.status,
      hasResult: Boolean(attempt.result?.id),
      publishedAt: attempt.result?.publishedAt ?? null,
      releasePolicy: assessment.settings?.resultRelease ?? AssessmentResultRelease.NEVER,
      dueAt: assessment.dueAt,
    });
    if (!readiness.canPublish) {
      if (readiness.reason === "ALREADY_PUBLISHED") {
        return {
          alreadyPublished: true,
          studentId: attempt.studentId,
          attemptId: attempt.id,
          academicYearId: attempt.academicYearId,
          assessmentId: attempt.assessmentId,
          publishedAt: attempt.result?.publishedAt ?? new Date(),
        };
      }
      throw new TeacherAssessmentError(publicationBlockLabel(readiness.reason) ?? "Result cannot be published.", "INVALID_STATE");
    }
    if (!attempt.result) {
      throw new TeacherAssessmentError("Result record is unavailable.", "NOT_FOUND");
    }

    const now = new Date();
    const result = await tx.assessmentResult.update({
      where: { id: attempt.result.id },
      data: { publishedAt: now },
    });

    await writeSecurityAuditEvent(tx, {
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: "classroom.assessment.results.publish",
      targetType: "AssessmentAttempt",
      targetId: attempt.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", purpose: "result_publish", attempt: attempt.id },
    });

    return {
      alreadyPublished: false,
      studentId: attempt.studentId,
      attemptId: attempt.id,
      academicYearId: attempt.academicYearId,
      assessmentId: attempt.assessmentId,
      publishedAt: now,
      submittedAt: attempt.submittedAt,
      percentage: result.percentage,
      provisional: result.provisional,
      timeTakenSeconds: result.timeTakenSeconds,
    };
  });

  if (published.alreadyPublished) {
    return { ok: true as const, ...published };
  }

  await processPublishedAssessmentAnalytics({
    actorUserId: scope.teacher.userId,
    publisherId: scope.publisherId,
    schoolId: scope.schoolId,
    assessmentId: assessment.id,
    studentId: published.studentId,
    academicYearId: published.academicYearId,
    subjectId: book.subjectId,
    bookId: assessment.bookId,
    chapterId: assessment.chapterId,
    attemptId: published.attemptId,
    title: assessment.title,
    submittedAt: published.submittedAt ?? new Date(published.publishedAt),
    percentage: published.percentage ?? null,
    provisional: published.provisional ?? false,
    timeTakenSeconds: published.timeTakenSeconds ?? null,
    auditPurpose: "process",
  });

  await completeMatchingRemedialSteps({
    studentId: published.studentId,
    academicYearId: published.academicYearId,
    type: "ASSESSMENT_RETRY",
    assessmentId: published.assessmentId,
    sourceId: published.attemptId,
  });
  await refreshLearningSupportBestEffort({ studentId: published.studentId, academicYearId: published.academicYearId });

  return { ok: true as const, ...published };
}

export async function publishTeacherAssessmentResultsBulk(input: {
  sectionId: string;
  assessmentId: string;
}) {
  const { scope, assessment } = await loadOwnedAssessment(input.sectionId, input.assessmentId);
  if (assessment.status === AssessmentStatus.ARCHIVED) {
    throw new TeacherAssessmentError("Archived assessments cannot publish results.", "INVALID_STATE");
  }

  const book = await prisma.book.findUnique({ where: { id: assessment.bookId }, select: { subjectId: true } });
  if (!book) throw new TeacherAssessmentError("Assessment subject is unavailable.", "NOT_FOUND");

  const sideEffects: Array<{
    studentId: string;
    academicYearId: string;
    assessmentId: string;
    attemptId: string;
    submittedAt: Date | null;
    percentage: number | null;
    provisional: boolean;
    timeTakenSeconds: number | null;
  }> = [];
  const summary = await prisma.$transaction(async (tx) => {
    const attempts = await tx.assessmentAttempt.findMany({
      where: {
        assessmentId: assessment.id,
        publisherId: scope.publisherId,
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
      },
      include: { result: true },
      orderBy: { createdAt: "desc" },
    });

    let publishedCount = 0;
    const blocked = {
      alreadyPublished: 0,
      notGraded: 0,
      missingResult: 0,
      releaseDisabled: 0,
      releasePending: 0,
    };

    const book = await tx.book.findUnique({ where: { id: assessment.bookId }, select: { subjectId: true } });
    if (!book) throw new TeacherAssessmentError("Assessment subject is unavailable.", "NOT_FOUND");

    for (const attempt of attempts) {
      const readiness = evaluatePublicationReadiness({
        status: attempt.status,
        hasResult: Boolean(attempt.result?.id),
        publishedAt: attempt.result?.publishedAt ?? null,
        releasePolicy: assessment.settings?.resultRelease ?? AssessmentResultRelease.NEVER,
        dueAt: assessment.dueAt,
      });

      if (!readiness.canPublish) {
        if (readiness.reason === "ALREADY_PUBLISHED") blocked.alreadyPublished += 1;
        else if (readiness.reason === "NOT_GRADED") blocked.notGraded += 1;
        else if (readiness.reason === "MISSING_RESULT") blocked.missingResult += 1;
        else if (readiness.reason === "RELEASE_DISABLED") blocked.releaseDisabled += 1;
        else if (readiness.reason === "RELEASE_PENDING") blocked.releasePending += 1;
        continue;
      }

      if (!attempt.result) {
        blocked.missingResult += 1;
        continue;
      }

      const now = new Date();
      const result = await tx.assessmentResult.update({ where: { id: attempt.result.id }, data: { publishedAt: now } });

      await writeSecurityAuditEvent(tx, {
        actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
        action: "classroom.assessment.results.publish",
        targetType: "AssessmentAttempt",
        targetId: attempt.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { scope: "classroom", purpose: "result_publish", attempt: attempt.id },
      });

      sideEffects.push({
        studentId: attempt.studentId,
        academicYearId: attempt.academicYearId,
        assessmentId: attempt.assessmentId,
        attemptId: attempt.id,
        submittedAt: attempt.submittedAt,
        percentage: result.percentage,
        provisional: result.provisional,
        timeTakenSeconds: result.timeTakenSeconds,
      });
      publishedCount += 1;
    }

    return { publishedCount, blocked };
  });

  for (const item of sideEffects) {
    await processPublishedAssessmentAnalytics({
      actorUserId: scope.teacher.userId,
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      assessmentId: assessment.id,
      studentId: item.studentId,
      academicYearId: item.academicYearId,
      subjectId: book.subjectId,
      bookId: assessment.bookId,
      chapterId: assessment.chapterId,
      attemptId: item.attemptId,
      title: assessment.title,
      submittedAt: item.submittedAt ?? new Date(),
      percentage: item.percentage ?? null,
      provisional: item.provisional ?? false,
      timeTakenSeconds: item.timeTakenSeconds ?? null,
      auditPurpose: "process",
    });
  }

  for (const item of sideEffects) {
    await completeMatchingRemedialSteps({
      studentId: item.studentId,
      academicYearId: item.academicYearId,
      type: "ASSESSMENT_RETRY",
      assessmentId: item.assessmentId,
      sourceId: item.attemptId,
    });
    await refreshLearningSupportBestEffort({ studentId: item.studentId, academicYearId: item.academicYearId });
  }

  return { ok: true as const, ...summary };
}

export async function auditTeacherAssessmentDenial(input: {
  sectionId: string;
  action:
    | "classroom.assessment.create"
    | "classroom.assessment.update"
    | "classroom.assessment.publish"
    | "classroom.assessment.archive"
    | "classroom.assessment.restore"
    | "classroom.assessment.duplicate"
    | "classroom.assessment.grading.save"
    | "classroom.assessment.grading.complete"
    | "classroom.assessment.grading.reopen"
    | "classroom.assessment.results.publish";
}) {
  try {
    const { scope } = await requireTeacherSubject(input.sectionId);
    await recordTrustedDeniedAudit({
      actor: teacherActor({ teacherUserId: scope.teacher.userId, publisherId: scope.publisherId }),
      action: input.action,
      targetType: "Assessment",
      reasonCode: "AUTHORIZATION_DENIED",
      metadata: { scope: "classroom" },
    });
  } catch {
    // Ignore best-effort audit failures.
  }
}
