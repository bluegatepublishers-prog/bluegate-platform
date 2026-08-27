import { AssessmentStatus, AssessmentType, Prisma } from "@prisma/client";

import { isValidAssessmentQuestion, validateAssessmentDuration } from "@/lib/assessment-policy";
import type { ReleasedSmartBookAssessmentExecution } from "@/lib/smart-book-release-projection";

export const SMART_BOOK_ASSESSMENT_UNAVAILABLE = "This assessment is unavailable in this Smart Book release.";

export class SmartBookAssessmentSnapshotError extends Error {
  constructor(message = SMART_BOOK_ASSESSMENT_UNAVAILABLE) {
    super(message);
    this.name = "SmartBookAssessmentSnapshotError";
  }
}

export type PreparedPublisherAssessmentInstantiation = {
  publisherId: string;
  schoolId: string;
  academicYearId: string;
  schoolClassId: string;
  sectionId: string;
  sectionSubjectId: string;
  bookId: string;
  teachingPeriodId: string | null;
  createdById: string;
  contentReleaseVersionId: string;
  publisherAssessmentId: string;
  assessment: ReleasedSmartBookAssessmentExecution["assessment"];
  questions: ReleasedSmartBookAssessmentExecution["questions"];
};

export function buildCanonicalAssessmentReleaseSnapshot(prepared: PreparedPublisherAssessmentInstantiation) {
  const title = prepared.assessment.title.trim();
  const questionMarks = prepared.questions.reduce((sum, question) => sum + question.marks, 0);
  const invalidQuestion = prepared.questions.some((question, index) =>
    question.sequence !== index + 1 ||
    question.bookId !== prepared.bookId ||
    !isValidAssessmentQuestion({
      id: question.sourceQuestionId,
      questionType: question.questionType,
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      marks: question.marks,
    }),
  );
  if (
    title.length < 3 ||
    title.length > 160 ||
    !validateAssessmentDuration(prepared.assessment.durationMinutes) ||
    !prepared.questions.length ||
    invalidQuestion ||
    prepared.assessment.totalMarks !== questionMarks
  ) {
    throw new SmartBookAssessmentSnapshotError();
  }
  return {
    assessment: {
      publisherId: prepared.publisherId,
      schoolId: prepared.schoolId,
      academicYearId: prepared.academicYearId,
      schoolClassId: prepared.schoolClassId,
      sectionId: prepared.sectionId,
      sectionSubjectId: prepared.sectionSubjectId,
      bookId: prepared.bookId,
      contentReleaseVersionId: prepared.contentReleaseVersionId,
      publisherAssessmentId: prepared.publisherAssessmentId,
      chapterId: assessmentChapterId(prepared),
      teachingPeriodId: prepared.teachingPeriodId,
      createdById: prepared.createdById,
      type: mapPublisherAssessmentType(prepared.assessment.kind),
      title,
      instructions: prepared.assessment.instructions,
      durationMinutes: prepared.assessment.durationMinutes,
      status: AssessmentStatus.DRAFT,
    },
    settings: {
      showScore: true,
      showCorrectAnswers: false,
      showExplanations: false,
      showSolutions: false,
      resultRelease: "IMMEDIATE" as const,
      maxAttempts: 1,
    },
    questions: prepared.questions.map((question) => ({
      questionId: question.sourceQuestionId,
      bookId: question.bookId,
      chapterId: question.chapterId,
      sequence: question.sequence,
      questionType: question.questionType,
      questionText: question.questionText,
      options: jsonInput(question.options),
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      marks: question.marks,
      competency: null,
      learningOutcome: null,
    })),
  };
}

function assessmentChapterId(prepared: PreparedPublisherAssessmentInstantiation) {
  if (prepared.assessment.kind !== "CHAPTER_TEST" || !prepared.assessment.chapterId) return null;
  return prepared.questions.every((question) => question.chapterId === prepared.assessment.chapterId)
    ? prepared.assessment.chapterId
    : null;
}

function mapPublisherAssessmentType(kind: string): AssessmentType {
  if (kind === "CHAPTER_TEST") return AssessmentType.CHAPTER;
  if (kind === "UNIT_TEST") return AssessmentType.UNIT;
  if (kind === "TERM_TEST" || kind === "MULTI_TERM_TEST") return AssessmentType.TERM;
  return AssessmentType.CUSTOM;
}

function jsonInput(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null || value === undefined ? Prisma.JsonNull : value as Prisma.InputJsonValue;
}
