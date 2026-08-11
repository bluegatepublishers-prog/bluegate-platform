import "server-only";

import { prisma } from "@/lib/prisma";

export async function listPublisherWorksheetItems(publisherId: string, bookId: string, worksheetId: string) {
  return prisma.publisherWorksheetItem.findMany({
    where: { worksheetId, worksheet: { publisherId, bookId, archivedAt: null } },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: { question: { include: { chapter: { select: { title: true, chapterNumber: true } }, module: { select: { title: true } } } } },
  });
}

export async function addPublisherWorksheetQuestions(input: { publisherId: string; bookId: string; worksheetId: string; questionIds: string[] }) {
  const questionIds = [...new Set(input.questionIds.filter(Boolean))];
  if (!questionIds.length) return;
  await prisma.$transaction(async (tx) => {
    const worksheet = await tx.publisherWorksheet.findFirst({ where: { id: input.worksheetId, publisherId: input.publisherId, bookId: input.bookId, archivedAt: null }, select: { id: true } });
    if (!worksheet) throw new Error("Worksheet not found.");
    const questions = await tx.bookQuestion.findMany({ where: { id: { in: questionIds }, bookId: input.bookId, book: { publisherId: input.publisherId }, approved: true, archived: false }, select: { id: true } });
    if (questions.length !== questionIds.length) throw new Error("Only approved, active questions from this book can be added.");
    const existing = await tx.publisherWorksheetItem.findMany({ where: { worksheetId: worksheet.id, questionId: { in: questionIds } }, select: { questionId: true } });
    if (existing.length) throw new Error("A selected question is already in this worksheet.");
    const last = await tx.publisherWorksheetItem.aggregate({ where: { worksheetId: worksheet.id }, _max: { position: true } });
    await tx.publisherWorksheetItem.createMany({ data: questionIds.map((questionId, index) => ({ worksheetId: worksheet.id, questionId, position: (last._max.position ?? -1) + index + 1 })) });
  });
}

export async function removePublisherWorksheetItem(input: { publisherId: string; bookId: string; worksheetId: string; itemId: string }) {
  await prisma.publisherWorksheetItem.deleteMany({ where: { id: input.itemId, worksheetId: input.worksheetId, worksheet: { publisherId: input.publisherId, bookId: input.bookId, archivedAt: null } } });
}

export async function movePublisherWorksheetItem(input: { publisherId: string; bookId: string; worksheetId: string; itemId: string; direction: -1 | 1 }) {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.publisherWorksheetItem.findMany({ where: { worksheetId: input.worksheetId, worksheet: { publisherId: input.publisherId, bookId: input.bookId, archivedAt: null } }, orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true, position: true } });
    const index = rows.findIndex((row) => row.id === input.itemId); const current = rows[index]; const neighbor = rows[index + input.direction];
    if (!current || !neighbor) return;
    await Promise.all([tx.publisherWorksheetItem.update({ where: { id: current.id }, data: { position: neighbor.position } }), tx.publisherWorksheetItem.update({ where: { id: neighbor.id }, data: { position: current.position } })]);
  });
}
