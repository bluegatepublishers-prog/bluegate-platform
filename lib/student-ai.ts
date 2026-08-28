import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student-dashboard";
import { getStudentBook } from "@/lib/student-books";
import { getPremiumFeatureEntitlementForAuthenticatedUser } from "@/lib/entitlements/features";
import { retrieveStudentSmartBookAiGrounding } from "@/lib/ai/student-smart-book-retrieval";
import { extractStudentImmutableVocabulary } from "@/lib/ai/student-immutable-vocabulary";
import { buildImmutableStudentLearningPrompt } from "@/lib/ai/prompt-builder";
import { validateStudentAiProviderContent } from "@/lib/ai/response-validator";
import { getAiProvider, resolveProviderId } from "@/lib/ai/runtime/provider-registry";
import { executeStudentAiProviderStep } from "@/lib/ai/student-orchestrator";
import type {
  AiProvider,
  StudentImmutableGrounding,
} from "@/lib/ai/types";
import {
  getDeterministicStudentAiRefusal,
  getStudentAiDisplayQuestion,
  parseStudentAiInput,
  STUDENT_AI_DAILY_LIMITS,
  STUDENT_AI_INTENT_METADATA,
  STUDENT_AI_SAFE_REFUSAL,
  STUDENT_AI_TEMPORARY_FAILURE,
  STUDENT_AI_UNAVAILABLE,
  validateStudentAiReference,
  type ParsedStudentAiInput,
  type StudentAiPlan,
} from "@/lib/ai/student-policy";
import {
  getStudentAiQuotaSummary,
  persistStudentAiRefusal,
  persistStudentAiSuccess,
  releaseStudentAiQuota,
  reserveStudentAiQuota,
  StudentAiQuotaError,
} from "@/lib/ai/student-quota";

type StudentIdentity = Awaited<ReturnType<typeof requireStudent>>;

async function resolveStudentAiScope(
  bookId: string,
  chapterId: string,
) {
  const identity = await requireStudent();
  const book = await getStudentBook(bookId);

  if (!book || !identity.student.userId) {
    throw new StudentAiError(STUDENT_AI_UNAVAILABLE, 404);
  }

  /*
   * The browser supplies bookId/chapterId only as requested navigation
   * targets. sectionSubjectId is taken from the authenticated,
   * entitlement-checked Student book returned by getStudentBook().
   *
   * Immutable educational grounding is then resolved through the
   * Student Smart Book content-delivery path.
   */
  const [entitlement, grounding] = await Promise.all([
    getPremiumFeatureEntitlementForAuthenticatedUser(
      { id: identity.student.userId, role: "STUDENT" },
      {
        feature: "STUDENT_AI",
        academicYearId: identity.academicYear.id,
      },
    ),

    retrieveStudentSmartBookAiGrounding({
      sectionSubjectId: book.sectionSubjectId,
      chapterId,
    }),
  ]);

  if (!grounding) {
    throw new StudentAiError(STUDENT_AI_UNAVAILABLE, 404);
  }

  /*
   * Fail closed if the immutable grounding resolved to a different
   * entitled book/chapter/subject context than the requested scope.
   */
  if (
    grounding.audience !== "STUDENT" ||
    grounding.book.id !== bookId ||
    grounding.chapter.id !== chapterId ||
    grounding.sectionSubjectId !== book.sectionSubjectId
  ) {
    throw new StudentAiError(STUDENT_AI_UNAVAILABLE, 404);
  }

  return {
    identity,
    book,
    grounding,
    entitlement,
  };
}

export async function getStudentAiAvailability(
  bookId: string,
  chapterId: string,
) {
  try {
    const scope = await resolveStudentAiScope(bookId, chapterId);

    if (!scope.entitlement.allowed) {
      return scope.entitlement.reason === "FEATURE_DISABLED"
        ? { state: "FEATURE_DISABLED" as const }
        : { state: "LOCKED" as const };
    }

    const plan = scope.identity.effectivePlan.plan as StudentAiPlan;

    const quota = await getStudentAiQuotaSummary({
      studentId: scope.identity.student.id,
      academicYearId: scope.identity.academicYear.id,
      limit: STUDENT_AI_DAILY_LIMITS[plan],
    });

    return {
      state: "AVAILABLE" as const,
      remaining: quota.remaining,
    };
  } catch (error) {
    if (error instanceof StudentAiError) {
      return { state: "UNAVAILABLE" as const };
    }

    throw error;
  }
}

export async function getStudentAiPageData(
  bookId: string,
  chapterId: string,
) {
  const scope = await resolveStudentAiScope(bookId, chapterId);

  if (!scope.entitlement.allowed) {
    throw new StudentAiError(STUDENT_AI_UNAVAILABLE, 403);
  }

  const conversation = await findOwnedConversation(
    scope.identity,
    bookId,
    chapterId,
  );

  const plan = scope.identity.effectivePlan.plan as StudentAiPlan;

  const [quota, history] = await Promise.all([
    getStudentAiQuotaSummary({
      studentId: scope.identity.student.id,
      academicYearId: scope.identity.academicYear.id,
      limit: STUDENT_AI_DAILY_LIMITS[plan],
    }),

    conversation
      ? loadConversationMessages(conversation.id)
      : Promise.resolve([]),
  ]);

  /*
   * Student UI selections are intentionally bounded to immutable
   * release-derived hierarchy labels. Mutable chapter summary,
   * keywords, outcomes, questions and activities are not used as
   * Student AI educational context.
   */
  const moduleTitles = unique(
    scope.grounding.chunks.map(
      (chunk) => chunk.citation.moduleTitle,
    ),
  );

  const selections = unique([
    scope.grounding.chapter.title,
    ...moduleTitles,
  ]);

  /*
   * Vocabulary is derived deterministically from the exact same
   * bounded STUDENT-safe immutable release grounding used by the
   * AI request. No mutable BookChapter keywords or live vocabulary
   * records are consulted.
   */
  const keywords =
    extractStudentImmutableVocabulary(scope.grounding);

  return {
    bookTitle: scope.grounding.book.title,
    chapterTitle: scope.grounding.chapter.title,
    chapterNumber: scope.grounding.chapter.number,
    planLabel: planLabel(plan),

    quota: {
      ...quota,
      resetAt: quota.resetAt.toISOString(),
    },

    modes: Object.entries(STUDENT_AI_INTENT_METADATA).map(
      ([intent, metadata]) => ({
        intent,
        ...metadata,
      }),
    ),

    selections,
    keywords,

    history: history.map(toSafeHistoryMessage),
  };
}

export async function runStudentAiRequest(
  rawInput: unknown,
  options: { provider?: AiProvider } = {},
) {
  const inputRecord = record(rawInput);
  const bookId = text(inputRecord.bookId);
  const chapterId = text(inputRecord.chapterId);

  const scope = await resolveStudentAiScope(bookId, chapterId);

  if (!scope.entitlement.allowed) {
    throw new StudentAiError(STUDENT_AI_UNAVAILABLE, 403);
  }

  const parsed = parseStudentAiInput(rawInput);

  if (!parsed.ok) {
    throw new StudentAiError(STUDENT_AI_UNAVAILABLE, 400);
  }

  const plan = scope.identity.effectivePlan.plan as StudentAiPlan;
  const limit = STUDENT_AI_DAILY_LIMITS[plan];

  const conversation = await ensureConversation(
    scope.identity,
    bookId,
    chapterId,
  );

  const existing = await prisma.studentAiMessage.findUnique({
    where: {
      conversationId_requestId: {
        conversationId: conversation.id,
        requestId: parsed.value.requestId,
      },
    },
  });

  const quotaBefore = await getStudentAiQuotaSummary({
    studentId: scope.identity.student.id,
    academicYearId: scope.identity.academicYear.id,
    limit,
  });

  if (quotaBefore.remaining < 1) {
    if (existing) {
      return resultFromMessage(
        existing,
        quotaBefore.remaining,
      );
    }

    throw new StudentAiError(
      "You have reached today's Ask My Book limit.",
      429,
    );
  }

  if (existing) {
    return resultFromMessage(
      existing,
      quotaBefore.remaining,
    );
  }

  const recent = await loadConversationMessages(
    conversation.id,
    8,
  );

  validateStructuredRequest(
    parsed.value,
    scope.grounding,
  );

  const displayQuestion =
    getStudentAiDisplayQuestion(parsed.value);

  if (parsed.value.question) {
    const refusal = getDeterministicStudentAiRefusal({
      question: parsed.value.question,
      chapterNumber: scope.grounding.chapter.number,
      groundingTerms: groundingTerms(scope.grounding),
      hasHistory: recent.length > 0,
    });

    if (refusal) {
      const message = await persistStudentAiRefusal({
        conversationId: conversation.id,
        requestId: parsed.value.requestId,
        intent: parsed.value.intent,
        question: displayQuestion,
        reason: refusal,
        answer: STUDENT_AI_SAFE_REFUSAL,
      });

      return resultFromMessage(
        message,
        quotaBefore.remaining,
      );
    }
  }

  try {
    const request = buildImmutableStudentLearningPrompt({
      request: parsed.value,
      grounding: scope.grounding,
      history: recent.map((message) => ({
        question: message.question,
        answer: message.answer,
      })),
    });

    const provider =
      options.provider ??
      getAiProvider(resolveProviderId());

    const execution = await executeStudentAiProviderStep({
      request,
      provider,

      reserve: () =>
        reserveStudentAiQuota({
          studentId: scope.identity.student.id,
          academicYearId:
            scope.identity.academicYear.id,
          conversationId: conversation.id,
          requestId: parsed.value.requestId,
          intent: parsed.value.intent,
          limit,
        }),

      validate: validateStudentAiProviderContent,

      persistAndConsume: (response) =>
        persistStudentAiSuccess({
          studentId: scope.identity.student.id,
          academicYearId:
            scope.identity.academicYear.id,
          conversationId: conversation.id,
          requestId: parsed.value.requestId,
          intent: parsed.value.intent,
          question: displayQuestion,
          response,
        }),

      release: () =>
        releaseStudentAiQuota({
          studentId: scope.identity.student.id,
          academicYearId:
            scope.identity.academicYear.id,
          requestId: parsed.value.requestId,
        }),
    });

    return {
      ...resultFromMessage(
        execution.persisted,
        Math.max(
          0,
          quotaBefore.remaining - 1,
        ),
      ),

      followUpPrompts:
        execution.response.followUpPrompts,
    };
  } catch (error) {
    if (error instanceof StudentAiError) {
      throw error;
    }

    if (
      error instanceof StudentAiQuotaError &&
      error.code === "LIMIT_REACHED"
    ) {
      throw new StudentAiError(
        "You have reached today's Ask My Book limit.",
        429,
      );
    }

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const duplicate =
        await prisma.studentAiMessage.findUnique({
          where: {
            conversationId_requestId: {
              conversationId: conversation.id,
              requestId: parsed.value.requestId,
            },
          },
        });

      if (duplicate) {
        return resultFromMessage(
          duplicate,
          quotaBefore.remaining,
        );
      }
    }

    throw new StudentAiError(
      STUDENT_AI_TEMPORARY_FAILURE,
      503,
    );
  }
}

function validateStructuredRequest(
  request: ParsedStudentAiInput,
  grounding: StudentImmutableGrounding,
) {
  const moduleTitles = unique(
    grounding.chunks.map(
      (chunk) => chunk.citation.moduleTitle,
    ),
  );

  const selections = unique([
    grounding.chapter.title,
    ...moduleTitles,
  ]);

  /*
   * The browser-submitted vocabulary reference is never trusted.
   *
   * Re-derive the permitted vocabulary from the exact authorised
   * immutable Student grounding and require an exact policy match.
   * This keeps the server authoritative even if a client tampers
   * with the dropdown value.
   */
  const keywords =
    extractStudentImmutableVocabulary(grounding);

  if (
    !validateStudentAiReference(
      request,
      selections,
      keywords,
    )
  ) {
    throw new StudentAiError(
      STUDENT_AI_UNAVAILABLE,
      400,
    );
  }
}

async function ensureConversation(
  identity: StudentIdentity,
  bookId: string,
  chapterId: string,
) {
  const conversation =
    await prisma.studentAiConversation.upsert({
      where: {
        studentId_academicYearId_bookId_chapterId: {
          studentId: identity.student.id,
          academicYearId:
            identity.academicYear.id,
          bookId,
          chapterId,
        },
      },

      create: {
        publisherId: identity.publisher.id,
        schoolId: identity.school.id,
        studentId: identity.student.id,
        academicYearId:
          identity.academicYear.id,
        bookId,
        chapterId,
      },

      update: {
        active: true,
      },
    });

  if (
    conversation.publisherId !==
      identity.publisher.id ||
    conversation.schoolId !== identity.school.id
  ) {
    throw new StudentAiError(
      STUDENT_AI_UNAVAILABLE,
      404,
    );
  }

  return conversation;
}

function findOwnedConversation(
  identity: StudentIdentity,
  bookId: string,
  chapterId: string,
) {
  return prisma.studentAiConversation.findFirst({
    where: {
      studentId: identity.student.id,
      publisherId: identity.publisher.id,
      schoolId: identity.school.id,
      academicYearId:
        identity.academicYear.id,
      bookId,
      chapterId,
      active: true,
    },

    select: {
      id: true,
    },
  });
}

async function loadConversationMessages(
  conversationId: string,
  take = 50,
) {
  const messages =
    await prisma.studentAiMessage.findMany({
      where: {
        conversationId,
      },

      orderBy: {
        createdAt: "desc",
      },

      take,
    });

  return messages.reverse();
}

function toSafeHistoryMessage(
  message: Awaited<
    ReturnType<typeof loadConversationMessages>
  >[number],
) {
  return {
    id: message.id,
    intent: message.intent,

    mode:
      STUDENT_AI_INTENT_METADATA[
        message.intent
      ].label,

    question: message.question,
    answer: message.answer,
    refused: message.refused,

    createdAt:
      message.createdAt.toISOString(),
  };
}

function resultFromMessage(
  message: Awaited<
    ReturnType<typeof loadConversationMessages>
  >[number],
  remaining: number,
) {
  return {
    ok: true as const,
    message: toSafeHistoryMessage(message),
    followUpPrompts: [] as string[],
    remaining,
  };
}

function groundingTerms(
  grounding: StudentImmutableGrounding,
) {
  return unique([
    grounding.chapter.title,

    ...grounding.chunks.map(
      (chunk) => chunk.citation.moduleTitle,
    ),

    /*
     * These strings come only from the bounded STUDENT-safe
     * immutable release extraction.
     */
    ...grounding.chunks.map(
      (chunk) => chunk.text,
    ),
  ]);
}

function planLabel(
  plan: StudentAiPlan,
) {
  if (plan === "SCHOOL_PREMIUM") {
    return "School Premium";
  }

  if (plan === "INDIVIDUAL_PREMIUM") {
    return "Individual Premium";
  }

  if (
    plan ===
    "INDIVIDUAL_PREMIUM_MENTOR"
  ) {
    return "Premium with Mentor";
  }

  return "School Basic";
}

function unique(
  values: readonly string[],
) {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

function record(
  value: unknown,
): Record<string, unknown> {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export class StudentAiError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "StudentAiError";
  }
}

export function studentAiErrorResponse(
  error: unknown,
) {
  return error instanceof StudentAiError
    ? {
        status: error.status,
        message: error.message,
      }
    : {
        status: 503,
        message:
          STUDENT_AI_TEMPORARY_FAILURE,
      };
}
