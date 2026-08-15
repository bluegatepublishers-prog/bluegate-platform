"use server";

import { revalidatePath } from "next/cache";
import type { BookFrontMatterType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createFrontMatterItem,
  deleteFrontMatterItem,
  mapChapterPages,
  mapExercisePages,
  mapFrontMatterPages,
  mapModulePages,
  mapPartPages,
  mapUnitPages,
  reorderFrontMatterItems,
  updateFrontMatterItem,
} from "@/lib/book-page-mapping";

type MappingType =
  | "PART"
  | "UNIT"
  | "CHAPTER"
  | "MODULE"
  | "EXERCISE"
  | "FRONT_MATTER";

export async function saveBookPageMapping(
  bookId: string,
  type: MappingType,
  nodeId: string,
  chapterId: string | null,
  startPage: number | null,
  endPage: number | null,
) {
  if (type === "PART") {
    await mapPartPages(
      bookId,
      nodeId,
      startPage,
      endPage,
    );
  } else if (type === "UNIT") {
    await mapUnitPages(
      bookId,
      nodeId,
      startPage,
      endPage,
    );
  } else if (type === "CHAPTER") {
    await mapChapterPages(
      bookId,
      nodeId,
      startPage,
      endPage,
    );
  } else if (type === "MODULE") {
    const resolvedChapterId =
      chapterId ??
      (
        await prisma.bookModule.findFirst({
          where: {
            id: nodeId,
            bookId,
          },
          select: {
            chapterId: true,
          },
        })
      )?.chapterId;

    if (!resolvedChapterId) {
      throw new Error(
        "Module chapter is unavailable.",
      );
    }

    await mapModulePages(
      bookId,
      resolvedChapterId,
      nodeId,
      startPage,
      endPage,
    );
  } else if (type === "EXERCISE") {
    const resolvedChapterId =
      chapterId ??
      (
        await prisma.bookExercise.findFirst({
          where: {
            id: nodeId,
            bookId,
          },
          select: {
            chapterId: true,
          },
        })
      )?.chapterId;

    if (!resolvedChapterId) {
      throw new Error(
        "Exercise chapter is unavailable.",
      );
    }

    await mapExercisePages(
      bookId,
      resolvedChapterId,
      nodeId,
      startPage,
      endPage,
    );
  } else {
    await mapFrontMatterPages(
      bookId,
      nodeId,
      startPage,
      endPage,
    );
  }

  revalidatePath(
    `/admin/books/${bookId}/content`,
  );
}

export async function createBookFrontMatterItem(
  bookId: string,
  input: {
    type: BookFrontMatterType;
    title: string;
    startPage: number | null;
    endPage: number | null;
  },
) {
  const item = await createFrontMatterItem(
    bookId,
    input,
  );

  revalidatePath(
    `/admin/books/${bookId}/content`,
  );

  return item;
}

export async function editBookFrontMatterItem(
  bookId: string,
  itemId: string,
  input: {
    type: BookFrontMatterType;
    title: string;
    startPage: number | null;
    endPage: number | null;
  },
) {
  await updateFrontMatterItem(
    bookId,
    itemId,
    input,
  );

  revalidatePath(
    `/admin/books/${bookId}/content`,
  );
}

export async function removeBookFrontMatterItem(
  bookId: string,
  itemId: string,
) {
  await deleteFrontMatterItem(
    bookId,
    itemId,
  );

  revalidatePath(
    `/admin/books/${bookId}/content`,
  );
}

export async function reorderBookFrontMatterItems(
  bookId: string,
  orderedIds: string[],
) {
  await reorderFrontMatterItems(
    bookId,
    orderedIds,
  );

  revalidatePath(
    `/admin/books/${bookId}/content`,
  );
}

export async function saveChapterPageMapping(
  bookId: string,
  chapterId: string,
  startPage: number | null,
  endPage: number | null,
) {
  await mapChapterPages(
    bookId,
    chapterId,
    startPage,
    endPage,
  );

  revalidatePath(
    `/admin/books/${bookId}/structure`,
  );
}

export async function saveModulePageMapping(
  bookId: string,
  chapterId: string,
  moduleId: string,
  startPage: number | null,
  endPage: number | null,
) {
  await mapModulePages(
    bookId,
    chapterId,
    moduleId,
    startPage,
    endPage,
  );

  revalidatePath(
    `/admin/books/${bookId}/structure`,
  );
}