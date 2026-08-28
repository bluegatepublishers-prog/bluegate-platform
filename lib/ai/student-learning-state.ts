import "server-only";

import { GapSeverity, GapStatus } from "@prisma/client";

import { getPremiumFeatureEntitlementForAuthenticatedUser } from "@/lib/entitlements/features";
import { prisma } from "@/lib/prisma";

export type StudentLearningEvidenceState =
  | "INSUFFICIENT"
  | "SUFFICIENT";

export type StudentLearningSupportState =
  | "NO_SIGNAL"
  | "A_LITTLE_MORE_PRACTICE"
  | "NEEDS_ATTENTION"
  | "NEEDS_FOCUSED_PRACTICE"
  | "TEACHER_SUPPORT_RECOMMENDED";

export type StudentLearningStateProjection = {
  evidenceState: StudentLearningEvidenceState;
  supportState: StudentLearningSupportState;
  learningArea: string | null;
  message: string | null;
};

export type StudentLearningStateScope = {
  userId: string;
  studentId: string;
  academicYearId: string;
  publisherId: string;
  schoolId: string;
  bookId: string;
  chapterId: string;
};

const NO_SIGNAL: StudentLearningStateProjection = {
  evidenceState: "INSUFFICIENT",
  supportState: "NO_SIGNAL",
  learningArea: null,
  message: null,
};

const severityRank: Record<GapSeverity, number> = {
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  CRITICAL: 4,
};

const supportStateBySeverity: Record<
  GapSeverity,
  StudentLearningSupportState
> = {
  LOW: "A_LITTLE_MORE_PRACTICE",
  MODERATE: "NEEDS_ATTENTION",
  HIGH: "NEEDS_FOCUSED_PRACTICE",
  CRITICAL: "TEACHER_SUPPORT_RECOMMENDED",
};

const supportMessageBySeverity: Record<
  GapSeverity,
  string
> = {
  LOW:
    "Recent scored learning activity suggests that a little more practice may help in this learning area.",
  MODERATE:
    "Recent scored learning activity suggests that this learning area needs some attention.",
  HIGH:
    "Recent scored learning activity suggests that focused practice may help in this learning area.",
  CRITICAL:
    "Recent scored learning activity suggests that teacher support may be helpful in this learning area.",
};

/**
 * Returns a deliberately small Student-safe learning-state projection.
 *
 * Important boundaries:
 *
 * - Student identity, publisher, school and academic year are supplied by
 *   an already-authenticated server caller.
 * - GAP_ANALYSIS entitlement is checked independently. Ask My Book must
 *   not gain access to premium learning-gap information merely because
 *   STUDENT_AI is enabled.
 * - Only deterministic persisted Gap-engine outputs are consumed.
 * - Raw LearningTimeline rows, assessment responses, practice answers,
 *   percentages, marks, sample sizes and teacher review notes are never
 *   exposed by this projection.
 * - Only OPEN or ACKNOWLEDGED signals are considered active learning
 *   support context.
 */
export async function getStudentLearningStateProjection(
  scope: StudentLearningStateScope,
): Promise<StudentLearningStateProjection> {
  const entitlement =
    await getPremiumFeatureEntitlementForAuthenticatedUser(
      {
        id: scope.userId,
        role: "STUDENT",
      },
      {
        feature: "GAP_ANALYSIS",
        academicYearId: scope.academicYearId,
      },
    );

  if (!entitlement.allowed) {
    return NO_SIGNAL;
  }

  const latestRun = await prisma.gapAnalysisRun.findFirst({
    where: {
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      studentId: scope.studentId,
      academicYearId: scope.academicYearId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      sufficientEvidenceCount: true,
    },
  });

  if (!latestRun?.sufficientEvidenceCount) {
    return NO_SIGNAL;
  }

  const gaps = await prisma.studentLearningGap.findMany({
    where: {
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      studentId: scope.studentId,
      academicYearId: scope.academicYearId,

      status: {
        in: [
          GapStatus.OPEN,
          GapStatus.ACKNOWLEDGED,
        ],
      },

      OR: [
        {
          chapterId: scope.chapterId,
          bookId: scope.bookId,
        },
        {
          chapterId: null,
          bookId: scope.bookId,
        },
      ],
    },

    select: {
      severity: true,
      dimension: true,
      skillLabel: true,

      chapter: {
        select: {
          title: true,
        },
      },

      book: {
        select: {
          title: true,
        },
      },

      subject: {
        select: {
          name: true,
        },
      },
    },

    take: 25,
  });

  if (!gaps.length) {
    return {
      evidenceState: "SUFFICIENT",
      supportState: "NO_SIGNAL",
      learningArea: null,
      message: null,
    };
  }

  const strongest = [...gaps].sort(
    (left, right) =>
      severityRank[right.severity] -
      severityRank[left.severity],
  )[0];

  const learningArea =
    cleanLabel(strongest.skillLabel) ??
    cleanLabel(strongest.chapter?.title) ??
    cleanLabel(strongest.book?.title) ??
    cleanLabel(strongest.subject?.name) ??
    "this learning area";

  return {
    evidenceState: "SUFFICIENT",
    supportState:
      supportStateBySeverity[strongest.severity],
    learningArea,
    message:
      supportMessageBySeverity[strongest.severity],
  };
}

/**
 * Provider-safe conversion.
 *
 * Keep this separate from the database projection so future AI callers
 * have one explicitly allowlisted representation rather than serialising
 * a Prisma object or arbitrary analytics structure.
 */
export function toStudentAiLearningStateContext(
  projection: StudentLearningStateProjection,
) {
  if (
    projection.evidenceState !== "SUFFICIENT" ||
    projection.supportState === "NO_SIGNAL" ||
    !projection.learningArea ||
    !projection.message
  ) {
    return null;
  }

  return {
    supportLevel: providerSafeSupportLabel(
      projection.supportState,
    ),
    learningArea: projection.learningArea,
    guidance: projection.message,
  };
}

function providerSafeSupportLabel(
  state: Exclude<
    StudentLearningSupportState,
    "NO_SIGNAL"
  >,
) {
  if (state === "A_LITTLE_MORE_PRACTICE") {
    return "A little more practice";
  }

  if (state === "NEEDS_ATTENTION") {
    return "Needs attention";
  }

  if (state === "NEEDS_FOCUSED_PRACTICE") {
    return "Needs focused practice";
  }

  return "Teacher support recommended";
}

function cleanLabel(
  value: string | null | undefined,
) {
  if (!value) return null;

  const clean = value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  return clean || null;
}
