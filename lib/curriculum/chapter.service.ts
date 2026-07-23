import "server-only";

import { prisma } from "@/lib/prisma";
import {
  createCurriculumValidationLoaders,
  CurriculumValidationError,
  type CurriculumActor,
  validateBookOwnership,
} from "@/lib/curriculum/validation.service";

export async function getChapterWithCurriculum(input: {
  actor: CurriculumActor;
  bookId: string;
  chapterId: string;
  requirePublishedParents?: boolean;
}) {
  const loaders = createCurriculumValidationLoaders(prisma);
  await validateBookOwnership(
    {
      actor: input.actor,
      bookId: input.bookId,
      requirePublished: input.requirePublishedParents,
    },
    loaders,
  );

  const chapter = await prisma.bookChapter.findFirst({
    where: { id: input.chapterId, bookId: input.bookId },
    select: {
      id: true,
      title: true,
      chapterNumber: true,
      sortOrder: true,
      unitId: true,
      editionId: true,
      book: {
        select: {
          id: true,
          title: true,
          publisherId: true,
          editions: {
            orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
            select: { id: true, title: true, code: true, published: true, archived: true },
          },
          units: {
            orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              title: true,
              code: true,
              editionId: true,
              published: true,
              archived: true,
            },
          },
        },
      },
      edition: {
        select: { id: true, title: true, code: true, published: true, archived: true },
      },
      unit: {
        select: { id: true, title: true, code: true, published: true, archived: true },
      },
      modules: {
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          title: true,
          code: true,
          unitId: true,
          published: true,
          archived: true,
          topics: {
            orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              title: true,
              code: true,
              keywords: true,
              published: true,
              archived: true,
              exercises: {
                orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
                select: {
                  id: true,
                  title: true,
                  code: true,
                  type: true,
                  difficulty: true,
                  published: true,
                  archived: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!chapter) throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Chapter was not found in the provided book.");

  if (input.requirePublishedParents) {
    if (chapter.edition && (!chapter.edition.published || chapter.edition.archived)) {
      throw new CurriculumValidationError("PARENT_UNPUBLISHED", "Chapter edition is not currently publishable.");
    }
    if (chapter.unit && (!chapter.unit.published || chapter.unit.archived)) {
      throw new CurriculumValidationError("PARENT_UNPUBLISHED", "Chapter unit is not currently publishable.");
    }
  }

  return {
    book: {
      id: chapter.book.id,
      title: chapter.book.title,
      publisherId: chapter.book.publisherId,
    },
    edition: chapter.edition,
    unit: chapter.unit,
    chapter: {
      id: chapter.id,
      title: chapter.title,
      chapterNumber: chapter.chapterNumber,
      sortOrder: chapter.sortOrder,
      editionId: chapter.editionId,
      unitId: chapter.unitId,
    },
    modules: chapter.modules,
  };
}
