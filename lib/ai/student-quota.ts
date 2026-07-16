import "server-only";

import {
  AiUsageStatus,
  LearningActivityType,
  Prisma,
  StudentAiIntent,
  StudentAiRefusalReason,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordLearningActivity } from "@/lib/analytics";
import { refreshLearningSupportBestEffort } from "@/lib/learning-support";
import { completeMatchingRemedialSteps } from "@/lib/remedials/completion";
import type {
  StudentAiIntentValue,
  StudentAiRefusalReasonValue,
  StudentAiValidatedResponse,
} from "./student-policy";

const RESERVATION_MINUTES = 10;
const IST_OFFSET_MS = 330 * 60 * 1000;

export function getStudentAiDayBounds(now = new Date()) {
  const shifted = new Date(now.getTime() + IST_OFFSET_MS);
  const startShifted = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
  return {
    start: new Date(startShifted - IST_OFFSET_MS),
    end: new Date(startShifted + 86_400_000 - IST_OFFSET_MS),
    resetAt: new Date(startShifted + 86_400_000 - IST_OFFSET_MS),
    timezone: "Asia/Kolkata" as const,
  };
}

export async function getStudentAiQuotaSummary(input: {
  studentId: string;
  academicYearId: string;
  limit: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const bounds = getStudentAiDayBounds(now);
  const [used, reserved] = await Promise.all([
    prisma.studentAiUsage.count({
      where: {
        studentId: input.studentId,
        academicYearId: input.academicYearId,
        status: AiUsageStatus.CONSUMED,
        consumedAt: { gte: bounds.start, lt: bounds.end },
      },
    }),
    prisma.studentAiUsage.count({
      where: {
        studentId: input.studentId,
        academicYearId: input.academicYearId,
        status: AiUsageStatus.RESERVED,
        expiresAt: { gt: now },
      },
    }),
  ]);
  return {
    limit: input.limit,
    used,
    remaining: Math.max(0, input.limit - used - reserved),
    resetAt: bounds.resetAt,
    timezone: bounds.timezone,
  };
}

export async function reserveStudentAiQuota(input: {
  studentId: string;
  academicYearId: string;
  conversationId: string;
  requestId: string;
  intent: StudentAiIntentValue;
  limit: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return prisma.$transaction(
    async (tx) => {
      await lockStudentAi(tx, input.studentId, input.academicYearId);
      const bounds = getStudentAiDayBounds(now);
      await tx.studentAiUsage.updateMany({
        where: {
          studentId: input.studentId,
          academicYearId: input.academicYearId,
          status: AiUsageStatus.RESERVED,
          expiresAt: { lte: now },
        },
        data: { status: AiUsageStatus.RELEASED, releasedAt: now },
      });
      const occupied = await tx.studentAiUsage.count({
        where: {
          studentId: input.studentId,
          academicYearId: input.academicYearId,
          OR: [
            {
              status: AiUsageStatus.CONSUMED,
              consumedAt: { gte: bounds.start, lt: bounds.end },
            },
            { status: AiUsageStatus.RESERVED, expiresAt: { gt: now } },
          ],
        },
      });
      if (input.limit <= 0 || occupied >= input.limit) {
        throw new StudentAiQuotaError("LIMIT_REACHED");
      }
      return tx.studentAiUsage.create({
        data: {
          studentId: input.studentId,
          academicYearId: input.academicYearId,
          conversationId: input.conversationId,
          requestId: input.requestId,
          intent: input.intent as StudentAiIntent,
          status: AiUsageStatus.RESERVED,
          expiresAt: new Date(now.getTime() + RESERVATION_MINUTES * 60_000),
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function releaseStudentAiQuota(input: {
  studentId: string;
  academicYearId: string;
  requestId: string;
}) {
  return prisma.$transaction(
    async (tx) => {
      await lockStudentAi(tx, input.studentId, input.academicYearId);
      const now = new Date();
      return tx.studentAiUsage.updateMany({
        where: {
          studentId: input.studentId,
          academicYearId: input.academicYearId,
          requestId: input.requestId,
          status: AiUsageStatus.RESERVED,
        },
        data: { status: AiUsageStatus.RELEASED, releasedAt: now },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function persistStudentAiSuccess(input: {
  studentId: string;
  academicYearId: string;
  conversationId: string;
  requestId: string;
  intent: StudentAiIntentValue;
  question: string;
  response: StudentAiValidatedResponse;
}) {
  const message = await prisma.$transaction(
    async (tx) => {
      await lockStudentAi(tx, input.studentId, input.academicYearId);
      const usage = await tx.studentAiUsage.findUnique({
        where: { requestId: input.requestId },
      });
      const now = new Date();
      if (
        !usage ||
        usage.studentId !== input.studentId ||
        usage.academicYearId !== input.academicYearId ||
        usage.conversationId !== input.conversationId ||
        usage.status !== AiUsageStatus.RESERVED ||
        usage.expiresAt <= now
      ) {
        throw new StudentAiQuotaError("RESERVATION_INVALID");
      }
      const message = await tx.studentAiMessage.create({
        data: {
          conversationId: input.conversationId,
          requestId: input.requestId,
          intent: input.intent as StudentAiIntent,
          question: input.question,
          answer: input.response.answer,
          refused: input.response.refused,
          refusalReason: input.response.refusalReason as StudentAiRefusalReason | null,
        },
      });
      await tx.studentAiConversation.update({
        where: { id: input.conversationId },
        data: { active: true, lastMessageAt: now },
      });
      await tx.studentAiUsage.update({
        where: { id: usage.id },
        data: { status: AiUsageStatus.CONSUMED, consumedAt: now },
      });
      const conversation = await tx.studentAiConversation.findUnique({
        where: { id: input.conversationId },
        include: { book: { select: { subjectId: true } }, chapter: { select: { title: true } } },
      });
      if (!conversation) throw new StudentAiQuotaError("RESERVATION_INVALID");
      await recordLearningActivity(tx, {
        eventKey: `student-ai:${message.id}`,
        publisherId: conversation.publisherId,
        schoolId: conversation.schoolId,
        studentId: input.studentId,
        academicYearId: input.academicYearId,
        activityType: LearningActivityType.STUDENT_AI,
        title: `Used learning assistant for ${conversation.chapter.title}`,
        sourceType: input.conversationId,
        sourceId: message.id,
        occurredAt: now,
        subjectId: conversation.book.subjectId,
        bookId: conversation.bookId,
        chapterId: conversation.chapterId,
        completed: true,
        aiIntent: input.intent as StudentAiIntent,
      });
      return message;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  const conversation = await prisma.studentAiConversation.findUnique({ where: { id: input.conversationId }, select: { bookId: true, chapterId: true } });
  if (conversation) await completeMatchingRemedialSteps({ studentId: input.studentId, academicYearId: input.academicYearId, type: "STUDENT_AI", bookId: conversation.bookId, chapterId: conversation.chapterId, sourceId: message.id });
  await refreshLearningSupportBestEffort({ studentId: input.studentId, academicYearId: input.academicYearId });
  return message;
}

export async function persistStudentAiRefusal(input: {
  conversationId: string;
  requestId: string;
  intent: StudentAiIntentValue;
  question: string;
  reason: StudentAiRefusalReasonValue;
  answer: string;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.studentAiMessage.findUnique({
      where: {
        conversationId_requestId: {
          conversationId: input.conversationId,
          requestId: input.requestId,
        },
      },
    });
    if (existing) return existing;
    const now = new Date();
    const message = await tx.studentAiMessage.create({
      data: {
        conversationId: input.conversationId,
        requestId: input.requestId,
        intent: input.intent as StudentAiIntent,
        question: input.question,
        answer: input.answer,
        refused: true,
        refusalReason: input.reason as StudentAiRefusalReason,
      },
    });
    await tx.studentAiConversation.update({
      where: { id: input.conversationId },
      data: { active: true, lastMessageAt: now },
    });
    return message;
  });
}

async function lockStudentAi(
  tx: Prisma.TransactionClient,
  studentId: string,
  academicYearId: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`student-ai:${studentId}:${academicYearId}`}))`;
}

export class StudentAiQuotaError extends Error {
  constructor(readonly code: "LIMIT_REACHED" | "RESERVATION_INVALID") {
    super(code);
    this.name = "StudentAiQuotaError";
  }
}
