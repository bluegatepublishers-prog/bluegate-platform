import "server-only";

import { prisma } from "@/lib/prisma";
import { buildSmartBookContents } from "@/lib/smart-book-contents";

/**
 * Loads the structural table of contents for the read-only Smart Book.
 *
 * IMPORTANT:
 * The Book itself is the published deliverable.
 *
 * Parts, Units, Chapters, Modules and structural Exercises are authored
 * inside that Book and must not disappear merely because their legacy
 * per-node `published` flag is false.
 *
 * This intentionally follows the Content Studio structural hierarchy:
 *
 * - include active/non-archived structural nodes
 * - preserve their display order
 * - let page mapping control navigation only
 * - do not require every hierarchy node to be individually published
 *
 * Book-level access/publication is already enforced before this loader is
 * called by the Teacher/Student book authorization flow.
 */
export async function getSmartBookContents(
  bookId: string,
) {
  const [
    parts,
    units,
    chapters,
    modules,
    topics,
    exercises,
    frontMatterItems,
  ] = await Promise.all([
    prisma.bookPart.findMany({
      where: {
        bookId,
        archived: false,
      },
      select: {
        id: true,
        title: true,
        startPage: true,
        displayOrder: true,
        archived: true,
      },
    }),

    prisma.bookUnit.findMany({
      where: {
        bookId,
        archived: false,
      },
      select: {
        id: true,
        partId: true,
        title: true,
        startPage: true,
        displayOrder: true,
        archived: true,
      },
    }),

    prisma.bookChapter.findMany({
      where: {
        bookId,
        archived: false,
      },
      select: {
        id: true,
        partId: true,
        unitId: true,
        title: true,
        chapterNumber: true,
        startPage: true,
        sortOrder: true,
        archived: true,
      },
    }),

    prisma.bookModule.findMany({
      where: {
        bookId,
        archived: false,
      },
      select: {
        id: true,
        chapterId: true,
        title: true,
        startPage: true,
        displayOrder: true,
        archived: true,
      },
    }),

    prisma.bookTopic.findMany({
      where: {
        bookId,
        archived: false,
      },
      select: {
        id: true,
        chapterId: true,
        moduleId: true,
        title: true,
        displayOrder: true,
        archived: true,
      },
    }),

    prisma.bookExercise.findMany({
      where: {
        bookId,
        archived: false,
        type: "PRACTICE",
      },
      select: {
        id: true,
        chapterId: true,
        moduleId: true,
        topicId: true,
        title: true,
        startPage: true,
        displayOrder: true,
        archived: true,
        type: true,
      },
    }),

    prisma.bookFrontMatterItem.findMany({
      where: {
        bookId,
      },
      select: {
        id: true,
        title: true,
        startPage: true,
        displayOrder: true,
      },
    }),
  ]);

  return buildSmartBookContents({
    parts,
    units,

    chapters: chapters.map((item) => ({
      ...item,
      displayOrder: item.sortOrder,
    })),

    modules,

    /*
     * Topic rows currently do not carry their own PDF mapping in the
     * existing structure, so they remain structural headings unless/until
     * the model provides a mapped start page.
     */
    topics: topics.map((item) => ({
      ...item,
      startPage: null,
    })),

    exercises,
    frontMatterItems,
  });
}