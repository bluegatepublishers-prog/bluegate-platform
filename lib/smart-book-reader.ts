import "server-only";

import { prisma } from "@/lib/prisma";
import { buildSmartBookContents } from "@/lib/smart-book-contents";

export async function getSmartBookContents(bookId: string) {
  const [parts, units, chapters, modules, topics, exercises, frontMatterItems] = await Promise.all([
    prisma.bookPart.findMany({ where: { bookId, published: true, archived: false }, select: { id: true, title: true, startPage: true, displayOrder: true, published: true, archived: true } }),
    prisma.bookUnit.findMany({ where: { bookId, published: true, archived: false }, select: { id: true, partId: true, title: true, startPage: true, displayOrder: true, published: true, archived: true } }),
    prisma.bookChapter.findMany({ where: { bookId, published: true, archived: false }, select: { id: true, partId: true, unitId: true, title: true, chapterNumber: true, startPage: true, sortOrder: true, published: true, archived: true } }),
    prisma.bookModule.findMany({ where: { bookId, published: true, archived: false }, select: { id: true, chapterId: true, title: true, startPage: true, displayOrder: true, published: true, archived: true } }),
    prisma.bookTopic.findMany({ where: { bookId, published: true, archived: false }, select: { id: true, chapterId: true, moduleId: true, title: true, displayOrder: true, published: true, archived: true } }),
    prisma.bookExercise.findMany({ where: { bookId, published: true, archived: false }, select: { id: true, chapterId: true, moduleId: true, topicId: true, title: true, startPage: true, displayOrder: true, published: true, archived: true } }),
    prisma.bookFrontMatterItem.findMany({ where: { bookId }, select: { id: true, title: true, startPage: true, displayOrder: true } }),
  ]);
  return buildSmartBookContents({
    parts,
    units,
    chapters: chapters.map((item) => ({ ...item, displayOrder: item.sortOrder })),
    modules,
    topics: topics.map((item) => ({ ...item, startPage: null })),
    exercises,
    frontMatterItems,
  });
}
