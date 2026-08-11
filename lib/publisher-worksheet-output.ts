import "server-only";

import { adaptBookQuestion, type BookQuestionSource, type NormalizedQuestion } from "@/lib/normalized-question";
import { prisma } from "@/lib/prisma";

export type PublisherWorksheetOutput = {
  title: string;
  instructions: string | null;
  bookTitle: string;
  chapterTitle: string;
  questions: NormalizedQuestion[];
  versionNumber: number | null;
};

export async function loadPublisherWorksheetOutput(input: {
  publisherId: string;
  bookId: string;
  worksheetId: string;
  preferPublished?: boolean;
}): Promise<PublisherWorksheetOutput> {
  const worksheet = await prisma.publisherWorksheet.findFirst({
    where: { id: input.worksheetId, publisherId: input.publisherId, bookId: input.bookId },
    include: {
      book: { select: { title: true } },
      chapter: { select: { title: true } },
      items: { orderBy: [{ position: "asc" }, { id: "asc" }], include: { question: true } },
    },
  });
  if (!worksheet) throw new Error("Worksheet not found.");

  if (input.preferPublished !== false) {
    const release = await prisma.contentRelease.findFirst({
      where: {
        publisherId: input.publisherId,
        bookId: input.bookId,
        targetType: "WORKSHEET",
        targetId: input.worksheetId,
        currentVersionId: { not: null },
      },
      select: { currentVersionId: true },
    });
    if (release?.currentVersionId) {
      const version = await prisma.contentReleaseVersion.findFirst({
        where: { id: release.currentVersionId, publisherId: input.publisherId, bookId: input.bookId, targetType: "WORKSHEET", targetId: input.worksheetId },
        select: { versionNumber: true, snapshot: true },
      });
      const snapshot = worksheetOutputFromSnapshot(version?.snapshot, worksheet.book.title, worksheet.chapter.title);
      if (snapshot) return { ...snapshot, versionNumber: version?.versionNumber ?? null };
    }
  }

  return {
    title: worksheet.title,
    instructions: worksheet.instructions,
    bookTitle: worksheet.book.title,
    chapterTitle: worksheet.chapter.title,
    questions: worksheet.items.map((item) => adaptBookQuestion(item.question)),
    versionNumber: null,
  };
}

function worksheetOutputFromSnapshot(snapshot: unknown, bookTitle: string, chapterTitle: string): Omit<PublisherWorksheetOutput, "versionNumber"> | null {
  if (!isRecord(snapshot) || !isRecord(snapshot.record)) return null;
  const record = snapshot.record;
  if (typeof record.title !== "string" || !Array.isArray(record.items)) return null;
  const questions = record.items.flatMap((item) => {
    if (!isRecord(item) || !isRecord(item.question)) return [];
    const source = bookQuestionSource(item.question);
    return source ? [adaptBookQuestion(source)] : [];
  });
  if (questions.length !== record.items.length) return null;
  return {
    title: record.title,
    instructions: typeof record.instructions === "string" ? record.instructions : null,
    bookTitle,
    chapterTitle,
    questions,
  };
}

function bookQuestionSource(value: Record<string, unknown>): BookQuestionSource | null {
  if (typeof value.id !== "string" || typeof value.bookId !== "string" || typeof value.chapterId !== "string" || typeof value.questionType !== "string" || typeof value.questionText !== "string") return null;
  return {
    id: value.id,
    bookId: value.bookId,
    chapterId: value.chapterId,
    moduleId: typeof value.moduleId === "string" ? value.moduleId : null,
    imageResourceId: typeof value.imageResourceId === "string" ? value.imageResourceId : null,
    questionType: value.questionType,
    questionText: value.questionText,
    options: value.options,
    correctAnswer: typeof value.correctAnswer === "string" ? value.correctAnswer : null,
    explanation: typeof value.explanation === "string" ? value.explanation : null,
    marks: typeof value.marks === "number" ? value.marks : undefined,
    difficulty: typeof value.difficulty === "string" ? value.difficulty : null,
    bloomLevel: typeof value.bloomLevel === "string" ? value.bloomLevel : null,
    competency: typeof value.competency === "string" ? value.competency : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
