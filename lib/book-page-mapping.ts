import "server-only";

import { BookFrontMatterType, CurriculumExerciseType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import {
  validateChapterPageRange,
  validateChapterWithinPart,
  validateChapterWithinUnit,
  validateFrontMatterPageRange,
  validateModulePageRange,
  validatePartPageRange,
  validateUnitPageRange,
  type BookPageRange,
} from "@/lib/book-page-range";

function range(startPage: number | null, endPage: number | null): BookPageRange {
  return { startPage, endPage };
}

export async function mapPartPages(
  bookId: string,
  partId: string,
  startPage: number | null,
  endPage: number | null,
) {
  const actor = await requireLivePublisherAdmin();
  const book = await prisma.book.findFirst({
    where: { id: bookId, publisherId: actor.publisherId },
    select: { pages: true },
  });
  if (!book) throw new Error("Book not found.");

  validatePartPageRange(range(startPage, endPage), book.pages);

  const part = await prisma.bookPart.findFirst({
    where: { id: partId, bookId },
    select: { id: true },
  });
  if (!part) throw new Error("Part not found.");

  const child = await prisma.bookUnit.findFirst({
    where: {
      bookId,
      partId,
      startPage: { not: null },
      endPage: { not: null },
      OR: [
        { startPage: { lt: startPage ?? 0 } },
        { endPage: { gt: endPage ?? Number.MAX_SAFE_INTEGER } },
      ],
    },
    select: { id: true },
  });

  if (child) {
    throw new Error(
      "Part range must contain every mapped child unit. Fix the child mapping first.",
    );
  }

  await prisma.bookPart.update({
    where: { id: partId },
    data: { startPage, endPage },
  });
}

export async function mapUnitPages(
  bookId: string,
  unitId: string,
  startPage: number | null,
  endPage: number | null,
) {
  const actor = await requireLivePublisherAdmin();
  const book = await prisma.book.findFirst({
    where: { id: bookId, publisherId: actor.publisherId },
    select: { pages: true },
  });
  if (!book) throw new Error("Book not found.");

  const unit = await prisma.bookUnit.findFirst({
    where: { id: unitId, bookId },
    select: { partId: true },
  });
  if (!unit) throw new Error("Unit not found.");

  const part = unit.partId
    ? await prisma.bookPart.findFirst({
        where: { id: unit.partId, bookId },
        select: { startPage: true, endPage: true },
      })
    : null;

  validateUnitPageRange(range(startPage, endPage), part, book.pages);

  const chapterOutside = await prisma.bookChapter.findFirst({
    where: {
      bookId,
      unitId,
      startPage: { not: null },
      endPage: { not: null },
      OR: [
        { startPage: { lt: startPage ?? 0 } },
        { endPage: { gt: endPage ?? Number.MAX_SAFE_INTEGER } },
      ],
    },
    select: { id: true },
  });

  if (chapterOutside) {
    throw new Error(
      "Unit range must contain every mapped child chapter. Fix the child mapping first.",
    );
  }

  await prisma.bookUnit.update({
    where: { id: unitId },
    data: { startPage, endPage },
  });
}

export async function mapChapterPages(
  bookId: string,
  chapterId: string,
  startPage: number | null,
  endPage: number | null,
) {
  const actor = await requireLivePublisherAdmin();
  const book = await prisma.book.findFirst({
    where: { id: bookId, publisherId: actor.publisherId },
    select: { pages: true },
  });
  if (!book) throw new Error("Book not found.");

  const chapter = await prisma.bookChapter.findFirst({
    where: { id: chapterId, bookId },
    select: { unitId: true, partId: true },
  });
  if (!chapter) throw new Error("Chapter not found.");

  validateChapterPageRange(range(startPage, endPage), book.pages);

  const unit = chapter.unitId
    ? await prisma.bookUnit.findFirst({
        where: { id: chapter.unitId, bookId },
        select: { startPage: true, endPage: true },
      })
    : null;

  const part = chapter.partId
    ? await prisma.bookPart.findFirst({
        where: { id: chapter.partId, bookId },
        select: { startPage: true, endPage: true },
      })
    : null;

  validateChapterWithinUnit(range(startPage, endPage), unit);
  validateChapterWithinPart(range(startPage, endPage), part);

  const moduleOutside = await prisma.bookModule.findFirst({
    where: {
      bookId,
      chapterId,
      startPage: { not: null },
      endPage: { not: null },
      OR: [
        { startPage: { lt: startPage ?? 0 } },
        { endPage: { gt: endPage ?? Number.MAX_SAFE_INTEGER } },
      ],
    },
    select: { id: true },
  });

  if (moduleOutside) {
    throw new Error(
      "Chapter range must contain every mapped child module. Fix the child mapping first.",
    );
  }

  const exerciseOutside = await prisma.bookExercise.findFirst({
    where: {
      bookId,
      chapterId,
      moduleId: null,
      topicId: null,
      type: CurriculumExerciseType.PRACTICE,
      archived: false,
      startPage: { not: null },
      endPage: { not: null },
      OR: [
        { startPage: { lt: startPage ?? 0 } },
        { endPage: { gt: endPage ?? Number.MAX_SAFE_INTEGER } },
      ],
    },
    select: { id: true },
  });

  if (exerciseOutside) {
    throw new Error(
      "Chapter range must contain the mapped Exercise. Fix the Exercise mapping first.",
    );
  }

  await prisma.bookChapter.update({
    where: { id: chapterId },
    data: { startPage, endPage },
  });
}

export async function mapModulePages(
  bookId: string,
  chapterId: string,
  moduleId: string,
  startPage: number | null,
  endPage: number | null,
) {
  const actor = await requireLivePublisherAdmin();
  const book = await prisma.book.findFirst({
    where: { id: bookId, publisherId: actor.publisherId },
    select: { pages: true },
  });
  if (!book) throw new Error("Book not found.");

  const chapter = await prisma.bookChapter.findFirst({
    where: { id: chapterId, bookId },
    select: { startPage: true, endPage: true },
  });
  if (!chapter) throw new Error("Chapter not found.");

  validateModulePageRange(range(startPage, endPage), chapter, book.pages);

  const updated = await prisma.bookModule.updateMany({
    where: { id: moduleId, bookId, chapterId },
    data: { startPage, endPage },
  });

  if (updated.count !== 1) {
    throw new Error("Module not found in the selected chapter.");
  }
}

export async function mapExercisePages(
  bookId: string,
  chapterId: string,
  exerciseId: string,
  startPage: number | null,
  endPage: number | null,
) {
  const actor = await requireLivePublisherAdmin();

  const book = await prisma.book.findFirst({
    where: {
      id: bookId,
      publisherId: actor.publisherId,
    },
    select: {
      pages: true,
    },
  });

  if (!book) {
    throw new Error("Book not found.");
  }

  const chapter = await prisma.bookChapter.findFirst({
    where: {
      id: chapterId,
      bookId,
    },
    select: {
      startPage: true,
      endPage: true,
    },
  });

  if (!chapter) {
    throw new Error("Chapter not found.");
  }

  validateModulePageRange(
    range(startPage, endPage),
    chapter,
    book.pages,
  );

  const updated = await prisma.bookExercise.updateMany({
    where: {
      id: exerciseId,
      bookId,
      chapterId,
      moduleId: null,
      topicId: null,
      type: CurriculumExerciseType.PRACTICE,
      archived: false,
    },
    data: {
      startPage,
      endPage,
    },
  });

  if (updated.count !== 1) {
    throw new Error(
      "Exercise not found in the selected chapter.",
    );
  }
}

export async function createFrontMatterItem(
  bookId: string,
  input: {
    type: BookFrontMatterType;
    title: string;
    startPage: number | null;
    endPage: number | null;
  },
) {
  const actor = await requireLivePublisherAdmin();
  const book = await prisma.book.findFirst({
    where: { id: bookId, publisherId: actor.publisherId },
    select: { pages: true },
  });
  if (!book) throw new Error("Book not found.");

  validateFrontMatterPageRange(
    range(input.startPage, input.endPage),
    book.pages,
  );

  if (!input.title.trim()) {
    throw new Error("Front-matter title is required.");
  }

  const last = await prisma.bookFrontMatterItem.findFirst({
    where: { bookId },
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });

  return prisma.bookFrontMatterItem.create({
    data: {
      bookId,
      type: input.type,
      title: input.title.trim(),
      startPage: input.startPage,
      endPage: input.endPage,
      displayOrder: (last?.displayOrder ?? -1) + 1,
    },
  });
}

export async function mapFrontMatterPages(
  bookId: string,
  itemId: string,
  startPage: number | null,
  endPage: number | null,
) {
  const actor = await requireLivePublisherAdmin();
  const book = await prisma.book.findFirst({
    where: { id: bookId, publisherId: actor.publisherId },
    select: { pages: true },
  });
  if (!book) throw new Error("Book not found.");

  validateFrontMatterPageRange(range(startPage, endPage), book.pages);

  const updated = await prisma.bookFrontMatterItem.updateMany({
    where: { id: itemId, bookId },
    data: { startPage, endPage },
  });

  if (updated.count !== 1) {
    throw new Error("Front-matter item not found.");
  }
}

export async function updateFrontMatterItem(
  bookId: string,
  itemId: string,
  input: {
    type: BookFrontMatterType;
    title: string;
    startPage: number | null;
    endPage: number | null;
  },
) {
  const actor = await requireLivePublisherAdmin();
  const book = await prisma.book.findFirst({
    where: { id: bookId, publisherId: actor.publisherId },
    select: { pages: true },
  });
  if (!book) throw new Error("Book not found.");

  validateFrontMatterPageRange(
    range(input.startPage, input.endPage),
    book.pages,
  );

  if (!input.title.trim()) {
    throw new Error("Front-matter title is required.");
  }

  const updated = await prisma.bookFrontMatterItem.updateMany({
    where: { id: itemId, bookId },
    data: {
      type: input.type,
      title: input.title.trim(),
      startPage: input.startPage,
      endPage: input.endPage,
    },
  });

  if (updated.count !== 1) {
    throw new Error("Front-matter item not found.");
  }
}

export async function deleteFrontMatterItem(
  bookId: string,
  itemId: string,
) {
  const actor = await requireLivePublisherAdmin();
  const book = await prisma.book.findFirst({
    where: { id: bookId, publisherId: actor.publisherId },
    select: { id: true },
  });
  if (!book) throw new Error("Book not found.");

  const deleted = await prisma.bookFrontMatterItem.deleteMany({
    where: { id: itemId, bookId },
  });

  if (deleted.count !== 1) {
    throw new Error("Front-matter item not found.");
  }
}

export async function reorderFrontMatterItems(
  bookId: string,
  orderedIds: string[],
) {
  const actor = await requireLivePublisherAdmin();
  const book = await prisma.book.findFirst({
    where: { id: bookId, publisherId: actor.publisherId },
    select: { id: true },
  });
  if (!book) throw new Error("Book not found.");

  const items = await prisma.bookFrontMatterItem.findMany({
    where: { bookId },
    select: { id: true },
  });

  if (
    items.length !== orderedIds.length ||
    items.some((item) => !orderedIds.includes(item.id))
  ) {
    throw new Error(
      "Front-matter order contains an item outside this book.",
    );
  }

  await prisma.$transaction(
    orderedIds.map((id, displayOrder) =>
      prisma.bookFrontMatterItem.update({
        where: { id },
        data: { displayOrder },
      }),
    ),
  );
}