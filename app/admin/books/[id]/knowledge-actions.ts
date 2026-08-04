"use server";

import { Prisma, SecurityAuditOutcome } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import {
  archiveActivityStudioRecord,
  saveActivityStudioRecord,
} from "@/lib/activity-studio";
import { prisma } from "@/lib/prisma";
import {
  publisherAdminAuditActor,
  recordTrustedDeniedAudit,
  recordTrustedFailureAudit,
  writeSecurityAuditEvent,
} from "@/lib/security-audit";

const QUESTION_TYPES = [
  "MCQ",
  "FILL_BLANK",
  "TRUE_FALSE",
  "MATCH",
  "MULTIPLE_SELECT",
  "VERY_SHORT",
  "SHORT",
  "SHORT_ANSWER",
  "LONG",
  "LONG_ANSWER",
  "ASSERTION_REASON",
  "CASE_STUDY",
  "CASE_BASED",
  "COMPETENCY",
  "HOTS",
  "PRACTICAL_ACTIVITY",
] as const;

const chapterSchema = z.object({
  chapterNumber: z.number().int().min(1),
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(220),
  startPage: z.number().int().min(1).nullable(),
  endPage: z.number().int().min(1).nullable(),
  extractedText: z.string().trim().nullable(),
  reviewedText: z.string().trim().nullable(),
  summary: z.string().trim().nullable(),
  keywords: z.array(z.string().trim().min(1).max(80)).max(50),
  approved: z.boolean(),
  sortOrder: z.number().int().min(0),
}).refine((value) => {
  if (value.startPage === null || value.endPage === null) return true;
  return value.endPage >= value.startPage;
}, { message: "End page must not be before start page.", path: ["endPage"] });

const questionSchema = z.object({
  chapterId: z.string().trim().min(1),
  questionType: z.enum(QUESTION_TYPES),
  questionText: z.string().trim().min(1),
  optionsText: z.string(),
  correctAnswerText: z.string(),
  explanation: z.string().trim().nullable(),
  marks: z.number().int().min(1),
  difficulty: z.string().trim().min(1).max(30),
  bloomLevel: z.string().trim().nullable(),
  competency: z.string().trim().nullable(),
  approved: z.boolean(),
});

const outcomeSchema = z.object({
  id: z.string().trim().optional(),
  chapterId: z.string().trim().min(1),
  outcome: z.string().trim().min(1),
  bloomLevel: z.string().trim().nullable(),
  competency: z.string().trim().nullable(),
  sortOrder: z.number().int().min(0),
});

const activitySchema = z.object({
  id: z.string().trim().optional(),
  chapterId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  objective: z.string().trim().min(1),
  materials: z.string().trim().nullable(),
  durationMinutes: z.number().int().min(1).nullable(),
  groupType: z.string().trim().nullable(),
  instructions: z.string().trim().min(1),
  expectedLearning: z.string().trim().nullable(),
  assessment: z.string().trim().nullable(),
  safetyNotes: z.string().trim().nullable(),
  approved: z.boolean(),
});

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const parsedNumber = (formData: FormData, key: string) => {
  const value = Number(formData.get(key));
  return Number.isInteger(value) ? value : null;
};
const nonNegative = (formData: FormData, key: string) => {
  const value = parsedNumber(formData, key);
  return value !== null && value >= 0 ? value : null;
};
const positive = (formData: FormData, key: string) => {
  const value = parsedNumber(formData, key);
  return value !== null && value >= 1 ? value : null;
};
const asOptional = (value: string) => value || null;
const makeSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function requireOwnedBookForAction(bookId: string, action: "publisher.book.update" | "publisher.book.delete") {
  const actor = await requireLivePublisherAdmin();
  const book = await prisma.book.findFirst({
    where: { id: bookId, publisherId: actor.publisherId },
    select: { id: true },
  });
  if (!book) {
    await recordTrustedDeniedAudit({
      actor: publisherAdminAuditActor(actor),
      action,
      targetType: "Book",
      reasonCode: "CROSS_TENANT_SCOPE",
      metadata: { scope: "book_content" },
    });
    throw new Error("Book not found.");
  }
  return actor;
}

async function writeBookAudit(
  tx: Prisma.TransactionClient,
  actor: { userId: string; publisherId: string },
  action: "publisher.book.update" | "publisher.book.delete",
  bookId: string,
  changedFields: string[],
) {
  await writeSecurityAuditEvent(tx, {
    actor: publisherAdminAuditActor(actor),
    action,
    targetType: "Book",
    targetId: bookId,
    outcome: SecurityAuditOutcome.SUCCESS,
    metadata: { changedFields },
  });
}

function mapQuestionOptions(value: string, questionType: (typeof QUESTION_TYPES)[number], rawAnswer: string) {
  let options: Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull;
  let correctAnswer = rawAnswer || null;
  if (questionType === "MATCH") {
    const pairs = value.split("\n")
      .map((line) => line.split("=>").map((part) => part.trim()))
      .filter((parts) => parts.length === 2 && parts.every(Boolean));
    if (pairs.length < 2) throw new Error("Match questions need at least two lines in Left => Right format.");
    options = { left: pairs.map((parts) => parts[0]), right: pairs.map((parts) => parts[1]) };
    correctAnswer = JSON.stringify(Object.fromEntries(pairs));
    return { options, correctAnswer };
  }
  if (value) {
    const optionValues = value.split("\n").map((part) => part.trim()).filter(Boolean);
    options = optionValues;
    if (questionType === "MULTIPLE_SELECT") {
      const selected = rawAnswer.split(/[\n,]/).map((part) => part.trim()).filter(Boolean);
      if (!selected.length || selected.some((answer) => !optionValues.includes(answer))) {
        throw new Error("Multiple-select answers must match the listed options.");
      }
      correctAnswer = JSON.stringify(selected);
    }
  }
  return { options, correctAnswer };
}

export async function saveChapter(bookId: string, chapterId: string | undefined, formData: FormData) {
  const actor = await requireOwnedBookForAction(bookId, "publisher.book.update");
  const parsed = chapterSchema.safeParse({
    chapterNumber: positive(formData, "chapterNumber"),
    title: text(formData, "title"),
    slug: text(formData, "slug"),
    startPage: positive(formData, "startPage"),
    endPage: positive(formData, "endPage"),
    extractedText: asOptional(text(formData, "extractedText")),
    reviewedText: asOptional(text(formData, "reviewedText")),
    summary: asOptional(text(formData, "summary")),
    keywords: text(formData, "keywords").split(",").map((item) => item.trim()).filter(Boolean),
    approved: formData.get("approved") === "on",
    sortOrder: nonNegative(formData, "sortOrder") ?? positive(formData, "chapterNumber") ?? 0,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Chapter input is invalid.");

  const payload = {
    ...parsed.data,
    slug: makeSlug(parsed.data.slug || parsed.data.title),
  };

  try {
    await prisma.$transaction(async (tx) => {
      if (chapterId) {
        const found = await tx.bookChapter.findFirst({ where: { id: chapterId, bookId }, select: { id: true } });
        if (!found) throw new Error("Chapter not found.");
        await tx.bookChapter.update({ where: { id: chapterId }, data: payload });
      } else {
        await tx.bookChapter.create({ data: { ...payload, bookId } });
      }
      await writeBookAudit(tx, actor, "publisher.book.update", bookId, ["book_content", "chapter"]);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    await recordTrustedFailureAudit({
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book.update",
      targetType: "Book",
    });
    throw error;
  }

  revalidatePath(`/admin/books/${bookId}`);
  redirect(`/admin/books/${bookId}/chapters`);
}

export async function deleteChapter(bookId: string, chapterId: string) {
  const actor = await requireOwnedBookForAction(bookId, "publisher.book.delete");
  try {
    await prisma.$transaction(async (tx) => {
      const chapter = await tx.bookChapter.findFirst({
        where: { id: chapterId, bookId },
        select: { id: true },
      });
      if (!chapter) throw new Error("Chapter not found.");
      await tx.bookChapter.update({
        where: { id: chapterId },
        data: { archived: true, archivedAt: new Date(), published: false },
      });
      await writeBookAudit(tx, actor, "publisher.book.delete", bookId, ["book_content", "chapter"]);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    await recordTrustedFailureAudit({
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book.delete",
      targetType: "Book",
    });
    throw error;
  }
  revalidatePath(`/admin/books/${bookId}/chapters`);
}

export async function moveChapter(bookId: string, chapterId: string, direction: -1 | 1) {
  const actor = await requireOwnedBookForAction(bookId, "publisher.book.update");
  try {
    await prisma.$transaction(async (tx) => {
      const chapters = await tx.bookChapter.findMany({
        where: { bookId },
        orderBy: [{ sortOrder: "asc" }, { chapterNumber: "asc" }],
        select: { id: true, sortOrder: true },
      });
      const index = chapters.findIndex((value) => value.id === chapterId);
      const sibling = chapters[index + direction];
      if (index < 0 || !sibling) return;
      await tx.bookChapter.update({ where: { id: chapterId }, data: { sortOrder: sibling.sortOrder } });
      await tx.bookChapter.update({ where: { id: sibling.id }, data: { sortOrder: chapters[index].sortOrder } });
      await writeBookAudit(tx, actor, "publisher.book.update", bookId, ["book_content", "chapter", "reorder"]);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    await recordTrustedFailureAudit({
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book.update",
      targetType: "Book",
    });
    throw error;
  }
  revalidatePath(`/admin/books/${bookId}/chapters`);
}

export async function saveQuestion(bookId: string, questionId: string | undefined, formData: FormData) {
  const actor = await requireOwnedBookForAction(bookId, "publisher.book.update");
  const parsed = questionSchema.safeParse({
    chapterId: text(formData, "chapterId"),
    questionType: text(formData, "questionType"),
    questionText: text(formData, "questionText"),
    optionsText: text(formData, "options"),
    correctAnswerText: text(formData, "correctAnswer"),
    explanation: asOptional(text(formData, "explanation")),
    marks: positive(formData, "marks") ?? 1,
    difficulty: text(formData, "difficulty") || "MEDIUM",
    bloomLevel: asOptional(text(formData, "bloomLevel")),
    competency: asOptional(text(formData, "competency")),
    approved: formData.get("approved") === "on",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Question input is invalid.");

  const chapter = await prisma.bookChapter.findFirst({
    where: { id: parsed.data.chapterId, bookId },
    select: { id: true },
  });
  if (!chapter) throw new Error("Valid chapter, type, and question text are required.");

  const mapped = mapQuestionOptions(parsed.data.optionsText, parsed.data.questionType, parsed.data.correctAnswerText);
  const payload = {
    chapterId: parsed.data.chapterId,
    questionType: parsed.data.questionType,
    questionText: parsed.data.questionText,
    options: mapped.options,
    correctAnswer: mapped.correctAnswer,
    explanation: parsed.data.explanation,
    marks: parsed.data.marks,
    difficulty: parsed.data.difficulty,
    bloomLevel: parsed.data.bloomLevel,
    competency: parsed.data.competency,
    approved: parsed.data.approved,
  };

  try {
    await prisma.$transaction(async (tx) => {
      if (questionId) {
        const found = await tx.bookQuestion.findFirst({ where: { id: questionId, bookId }, select: { id: true } });
        if (!found) throw new Error("Question not found.");
        await tx.bookQuestion.update({ where: { id: questionId }, data: payload });
      } else {
        await tx.bookQuestion.create({ data: { ...payload, bookId } });
      }
      await writeBookAudit(tx, actor, "publisher.book.update", bookId, ["book_content", "question"]);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    await recordTrustedFailureAudit({
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book.update",
      targetType: "Book",
    });
    throw error;
  }
  revalidatePath(`/admin/books/${bookId}/questions`);
  redirect(`/admin/books/${bookId}/questions`);
}

export async function deleteQuestion(bookId: string, id: string) {
  const actor = await requireOwnedBookForAction(bookId, "publisher.book.delete");
  try {
    await prisma.$transaction(async (tx) => {
      const question = await tx.bookQuestion.findFirst({
        where: { id, bookId },
        select: { id: true, _count: { select: { practiceResponses: true, assessmentQuestions: true } } },
      });
      if (!question) throw new Error("Question not found.");
      if (question._count.practiceResponses + question._count.assessmentQuestions > 0) {
        throw new Error("This question is already used. Remove linked practice and assessment records first.");
      }
      await tx.bookQuestion.delete({ where: { id } });
      await writeBookAudit(tx, actor, "publisher.book.delete", bookId, ["book_content", "question"]);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    await recordTrustedFailureAudit({
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book.delete",
      targetType: "Book",
    });
    throw error;
  }
  revalidatePath(`/admin/books/${bookId}/questions`);
}

export async function saveOutcome(bookId: string, formData: FormData) {
  const actor = await requireOwnedBookForAction(bookId, "publisher.book.update");
  const parsed = outcomeSchema.safeParse({
    id: text(formData, "id") || undefined,
    chapterId: text(formData, "chapterId"),
    outcome: text(formData, "outcome"),
    bloomLevel: asOptional(text(formData, "bloomLevel")),
    competency: asOptional(text(formData, "competency")),
    sortOrder: nonNegative(formData, "sortOrder") ?? 0,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Outcome input is invalid.");
  const chapter = await prisma.bookChapter.findFirst({
    where: { id: parsed.data.chapterId, bookId },
    select: { id: true },
  });
  if (!chapter) throw new Error("Valid chapter and outcome are required.");

  try {
    await prisma.$transaction(async (tx) => {
      if (parsed.data.id) {
        await tx.chapterLearningOutcome.updateMany({
          where: { id: parsed.data.id, chapter: { bookId } },
          data: parsed.data,
        });
      } else {
        await tx.chapterLearningOutcome.create({ data: parsed.data });
      }
      await writeBookAudit(tx, actor, "publisher.book.update", bookId, ["book_content", "topic"]);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    await recordTrustedFailureAudit({
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book.update",
      targetType: "Book",
    });
    throw error;
  }
  revalidatePath(`/admin/books/${bookId}/learning-outcomes`);
  revalidatePath(`/admin/books/${bookId}/content`);
}

export async function deleteOutcome(bookId: string, id: string) {
  const actor = await requireOwnedBookForAction(bookId, "publisher.book.delete");
  try {
    await prisma.$transaction(async (tx) => {
      await tx.chapterLearningOutcome.deleteMany({ where: { id, chapter: { bookId } } });
      await writeBookAudit(tx, actor, "publisher.book.delete", bookId, ["book_content", "topic"]);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    await recordTrustedFailureAudit({
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book.delete",
      targetType: "Book",
    });
    throw error;
  }
  revalidatePath(`/admin/books/${bookId}/learning-outcomes`);
  revalidatePath(`/admin/books/${bookId}/content`);
}

export async function moveOutcome(bookId: string, outcomeId: string, direction: -1 | 1) {
  const actor = await requireOwnedBookForAction(bookId, "publisher.book.update");
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.chapterLearningOutcome.findFirst({
        where: { id: outcomeId, chapter: { bookId } },
        select: { id: true, chapterId: true },
      });
      if (!current) throw new Error("Outcome not found.");
      const outcomes = await tx.chapterLearningOutcome.findMany({
        where: { chapterId: current.chapterId },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: { id: true, sortOrder: true },
      });
      const index = outcomes.findIndex((item) => item.id === current.id);
      const sibling = outcomes[index + direction];
      if (index < 0 || !sibling) return;
      await tx.chapterLearningOutcome.update({
        where: { id: current.id },
        data: { sortOrder: sibling.sortOrder },
      });
      await tx.chapterLearningOutcome.update({
        where: { id: sibling.id },
        data: { sortOrder: outcomes[index].sortOrder },
      });
      await writeBookAudit(tx, actor, "publisher.book.update", bookId, ["book_content", "topic", "reorder"]);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    await recordTrustedFailureAudit({
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book.update",
      targetType: "Book",
    });
    throw error;
  }
  revalidatePath(`/admin/books/${bookId}/learning-outcomes`);
  revalidatePath(`/admin/books/${bookId}/content`);
}

export async function saveActivity(bookId: string, formData: FormData) {
  const actor = await requireOwnedBookForAction(bookId, "publisher.book.update");
  const parsed = activitySchema.safeParse({
    id: text(formData, "id") || undefined,
    chapterId: text(formData, "chapterId"),
    title: text(formData, "title"),
    objective: text(formData, "objective"),
    materials: asOptional(text(formData, "materials")),
    durationMinutes: positive(formData, "durationMinutes"),
    groupType: asOptional(text(formData, "groupType")),
    instructions: text(formData, "instructions"),
    expectedLearning: asOptional(text(formData, "expectedLearning")),
    assessment: asOptional(text(formData, "assessment")),
    safetyNotes: asOptional(text(formData, "safetyNotes")),
    approved: formData.get("approved") === "on",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Activity input is invalid.");
  const chapter = await prisma.bookChapter.findFirst({
    where: { id: parsed.data.chapterId, bookId, book: { publisherId: actor.publisherId } },
    select: { id: true },
  });
  if (!chapter) throw new Error("Chapter, title, objective, and instructions are required.");

  try {
    await saveActivityStudioRecord({
      actor,
      bookId,
      data: {
        ...parsed.data,
        activityType: "CLASSROOM_ACTIVITY",
        audience: "BOTH",
        active: true,
        published: parsed.data.approved,
      },
    });
    await prisma.$transaction(async (tx) => {
      await writeBookAudit(tx, actor, "publisher.book.update", bookId, ["book_content", "exercise"]);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    await recordTrustedFailureAudit({
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book.update",
      targetType: "Book",
    });
    throw error;
  }
  revalidatePath(`/admin/books/${bookId}/activities`);
  revalidatePath(`/admin/books/${bookId}/content`);
}

export async function deleteActivity(bookId: string, id: string) {
  const actor = await requireOwnedBookForAction(bookId, "publisher.book.delete");
  try {
    await archiveActivityStudioRecord({ actor, bookId, activityId: id });
    await prisma.$transaction(async (tx) => {
      await writeBookAudit(tx, actor, "publisher.book.delete", bookId, ["book_content", "exercise"]);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    await recordTrustedFailureAudit({
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book.delete",
      targetType: "Book",
    });
    throw error;
  }
  revalidatePath(`/admin/books/${bookId}/activities`);
  revalidatePath(`/admin/books/${bookId}/content`);
}
