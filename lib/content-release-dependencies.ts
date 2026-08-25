export type SnapshotPageSource = {
  source?: unknown;
  pageNumber?: unknown;
};

export type SnapshotHierarchyChapterCandidate = {
  id: string;
  bookId: string;
  startPage: number | null;
  endPage: number | null;
  archived: boolean;
};

export type SnapshotHierarchyModuleCandidate = {
  id: string;
  bookId: string;
  chapterId: string | null;
  startPage: number | null;
  endPage: number | null;
  archived: boolean;
};

export type SnapshotHierarchyExerciseCandidate = {
  id: string;
  bookId: string;
  chapterId: string | null;
  moduleId: string | null;
  archived: boolean;
};

export type SnapshotHierarchyDependencyIds = {
  chapterIds: string[];
  moduleIds: string[];
};

export function collectSnapshotPdfPageNumbers(snapshot: { pages?: Array<{ pdfBackground?: unknown }> }) {
  return [...new Set(
    (snapshot.pages ?? [])
      .map((page) => page.pdfBackground)
      .filter((background): background is SnapshotPageSource => Boolean(background) && typeof background === "object")
      .filter((background) => background.source === "BOOK_FULL_PDF")
      .map((background) => background.pageNumber)
      .filter((pageNumber): pageNumber is number => typeof pageNumber === "number" && Number.isInteger(pageNumber) && pageNumber > 0),
  )];
}

export function collectSnapshotHierarchyDependencyIds(input: {
  bookId: string;
  pageNumbers: number[];
  referencedExerciseIds: string[];
  chapters: SnapshotHierarchyChapterCandidate[];
  modules: SnapshotHierarchyModuleCandidate[];
  exercises: SnapshotHierarchyExerciseCandidate[];
}): SnapshotHierarchyDependencyIds {
  const chaptersById = new Map(input.chapters.map((chapter) => [chapter.id, chapter]));
  const modulesById = new Map(input.modules.map((module) => [module.id, module]));
  const exercisesById = new Map(input.exercises.map((exercise) => [exercise.id, exercise]));
  const chapterIds = new Set<string>();
  const moduleIds = new Set<string>();

  for (const chapter of input.chapters) {
    if (!isActiveBookRow(chapter, input.bookId)) continue;
    if (input.pageNumbers.some((pageNumber) => includesPage(chapter.startPage, chapter.endPage, pageNumber))) {
      chapterIds.add(chapter.id);
    }
  }

  for (const exerciseId of input.referencedExerciseIds) {
    const exercise = exercisesById.get(exerciseId);
    if (!exercise || !isActiveBookRow(exercise, input.bookId)) continue;
    const chapter = exercise.chapterId ? chaptersById.get(exercise.chapterId) : null;
    if (chapter && isActiveBookRow(chapter, input.bookId)) chapterIds.add(chapter.id);
    const module = exercise.moduleId ? modulesById.get(exercise.moduleId) : null;
    if (module && isActiveBookRow(module, input.bookId) && module.chapterId === exercise.chapterId) {
      moduleIds.add(module.id);
    }
  }

  for (const module of input.modules) {
    if (!isActiveBookRow(module, input.bookId) || !module.chapterId || !chapterIds.has(module.chapterId)) continue;
    if (input.pageNumbers.some((pageNumber) => includesPage(module.startPage, module.endPage, pageNumber))) {
      moduleIds.add(module.id);
    }
  }

  for (const moduleId of moduleIds) {
    const module = modulesById.get(moduleId);
    if (module?.chapterId && chaptersById.has(module.chapterId)) chapterIds.add(module.chapterId);
  }

  return {
    chapterIds: [...chapterIds].sort(),
    moduleIds: [...moduleIds].sort(),
  };
}

function isActiveBookRow(row: { bookId: string; archived: boolean }, bookId: string) {
  return row.bookId === bookId && !row.archived;
}

function includesPage(startPage: number | null, endPage: number | null, pageNumber: number) {
  return startPage !== null && endPage !== null && startPage <= pageNumber && pageNumber <= endPage;
}
