import type { Prisma, PrismaClient } from "@prisma/client";

export type CurriculumActor = {
  userId: string;
  publisherId: string;
};

export const CURRICULUM_ERROR_CODES = [
  "INVALID_INPUT",
  "BOOK_NOT_FOUND",
  "CROSS_PUBLISHER_SCOPE",
  "ENTITY_NOT_FOUND",
  "CROSS_BOOK_SCOPE",
  "INVALID_PARENT_CHAIN",
  "PARENT_ARCHIVED",
  "PARENT_UNPUBLISHED",
  "DUPLICATE_CODE",
  "INVALID_STATE",
] as const;

export type CurriculumErrorCode = (typeof CURRICULUM_ERROR_CODES)[number];

export class CurriculumValidationError extends Error {
  constructor(
    public readonly code: CurriculumErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CurriculumValidationError";
  }
}

export function normalizeCurriculumCode(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

type BookRecord = {
  id: string;
  publisherId: string | null;
  published: boolean;
};

type EditionRecord = {
  id: string;
  bookId: string;
  published: boolean;
  archived: boolean;
};

type UnitRecord = {
  id: string;
  bookId: string;
  editionId: string | null;
  published: boolean;
  archived: boolean;
};

type ChapterRecord = {
  id: string;
  bookId: string;
  unitId: string | null;
  editionId: string | null;
};

type ModuleRecord = {
  id: string;
  bookId: string;
  chapterId: string;
  unitId: string | null;
  published: boolean;
  archived: boolean;
};

type TopicRecord = {
  id: string;
  bookId: string;
  chapterId: string;
  moduleId: string;
  published: boolean;
  archived: boolean;
};

type ExerciseRecord = {
  id: string;
  bookId: string;
  chapterId: string;
  moduleId: string | null;
  topicId: string | null;
  published: boolean;
  archived: boolean;
};

type QuestionRecord = {
  id: string;
  bookId: string;
  chapterId: string;
  exerciseId: string | null;
};

type VideoLessonRecord = {
  id: string;
  publisherId: string;
  bookId: string;
  editionId: string | null;
  unitId: string | null;
  chapterId: string | null;
  moduleId: string | null;
  topicId: string | null;
  exerciseId: string | null;
  published: boolean;
  archived: boolean;
};

export type CurriculumValidationLoaders = {
  loadBook(bookId: string): Promise<BookRecord | null>;
  loadEdition(editionId: string): Promise<EditionRecord | null>;
  loadUnit(unitId: string): Promise<UnitRecord | null>;
  loadChapter(chapterId: string): Promise<ChapterRecord | null>;
  loadModule(moduleId: string): Promise<ModuleRecord | null>;
  loadTopic(topicId: string): Promise<TopicRecord | null>;
  loadExercise(exerciseId: string): Promise<ExerciseRecord | null>;
  loadQuestion(questionId: string): Promise<QuestionRecord | null>;
  loadVideoLesson(videoLessonId: string): Promise<VideoLessonRecord | null>;
};

type PrismaCurriculumReader = Pick<
  PrismaClient,
  | "book"
  | "bookEdition"
  | "bookUnit"
  | "bookChapter"
  | "bookModule"
  | "bookTopic"
  | "bookExercise"
  | "bookQuestion"
  | "videoLesson"
> | Pick<
  Prisma.TransactionClient,
  | "book"
  | "bookEdition"
  | "bookUnit"
  | "bookChapter"
  | "bookModule"
  | "bookTopic"
  | "bookExercise"
  | "bookQuestion"
  | "videoLesson"
>;

export function createCurriculumValidationLoaders(
  reader: PrismaCurriculumReader,
): CurriculumValidationLoaders {
  return {
    loadBook(bookId) {
      return reader.book.findFirst({
        where: { id: bookId },
        select: { id: true, publisherId: true, published: true },
      });
    },
    loadEdition(editionId) {
      return reader.bookEdition.findFirst({
        where: { id: editionId },
        select: { id: true, bookId: true, published: true, archived: true },
      });
    },
    loadUnit(unitId) {
      return reader.bookUnit.findFirst({
        where: { id: unitId },
        select: { id: true, bookId: true, editionId: true, published: true, archived: true },
      });
    },
    loadChapter(chapterId) {
      return reader.bookChapter.findFirst({
        where: { id: chapterId },
        select: { id: true, bookId: true, unitId: true, editionId: true },
      });
    },
    loadModule(moduleId) {
      return reader.bookModule.findFirst({
        where: { id: moduleId },
        select: { id: true, bookId: true, chapterId: true, unitId: true, published: true, archived: true },
      });
    },
    loadTopic(topicId) {
      return reader.bookTopic.findFirst({
        where: { id: topicId },
        select: { id: true, bookId: true, chapterId: true, moduleId: true, published: true, archived: true },
      });
    },
    loadExercise(exerciseId) {
      return reader.bookExercise.findFirst({
        where: { id: exerciseId },
        select: { id: true, bookId: true, chapterId: true, moduleId: true, topicId: true, published: true, archived: true },
      });
    },
    loadQuestion(questionId) {
      return reader.bookQuestion.findFirst({
        where: { id: questionId },
        select: { id: true, bookId: true, chapterId: true, exerciseId: true },
      });
    },
    loadVideoLesson(videoLessonId) {
      return reader.videoLesson.findFirst({
        where: { id: videoLessonId },
        select: {
          id: true,
          publisherId: true,
          bookId: true,
          editionId: true,
          unitId: true,
          chapterId: true,
          moduleId: true,
          topicId: true,
          exerciseId: true,
          published: true,
          archived: true,
        },
      });
    },
  };
}

function ensureId(value: string, name: string) {
  if (!value?.trim()) throw new CurriculumValidationError("INVALID_INPUT", `${name} is required.`);
}

function ensureEntity<T>(value: T | null, label: string): T {
  if (!value) throw new CurriculumValidationError("ENTITY_NOT_FOUND", `${label} was not found.`);
  return value;
}

function ensureActiveParent(
  label: string,
  parent: { archived?: boolean; published?: boolean },
  options?: { requirePublished?: boolean },
) {
  if (parent.archived) throw new CurriculumValidationError("PARENT_ARCHIVED", `${label} is archived.`);
  if (options?.requirePublished && parent.published === false) {
    throw new CurriculumValidationError("PARENT_UNPUBLISHED", `${label} is unpublished.`);
  }
}

export async function validateBookOwnership(
  input: { actor: CurriculumActor; bookId: string; requirePublished?: boolean },
  loaders: CurriculumValidationLoaders,
) {
  ensureId(input.bookId, "bookId");
  const book = await loaders.loadBook(input.bookId);
  if (!book) throw new CurriculumValidationError("BOOK_NOT_FOUND", "Book was not found.");
  if (book.publisherId !== input.actor.publisherId) {
    throw new CurriculumValidationError("CROSS_PUBLISHER_SCOPE", "Book does not belong to the actor publisher.");
  }
  if (input.requirePublished && !book.published) {
    throw new CurriculumValidationError("PARENT_UNPUBLISHED", "Book is unpublished.");
  }
  return book;
}

export async function validateEditionBelongsToBook(
  input: {
    actor: CurriculumActor;
    bookId: string;
    editionId: string;
    requirePublished?: boolean;
    allowArchived?: boolean;
  },
  loaders: CurriculumValidationLoaders,
) {
  await validateBookOwnership({ actor: input.actor, bookId: input.bookId }, loaders);
  const edition = ensureEntity(await loaders.loadEdition(input.editionId), "Edition");
  if (edition.bookId !== input.bookId) {
    throw new CurriculumValidationError("CROSS_BOOK_SCOPE", "Edition does not belong to the provided book.");
  }
  if (!input.allowArchived) {
    ensureActiveParent("Edition", edition, { requirePublished: input.requirePublished });
  } else if (input.requirePublished && edition.published === false) {
    throw new CurriculumValidationError("PARENT_UNPUBLISHED", "Edition is unpublished.");
  }
  return edition;
}

export async function validateUnitBelongsToBook(
  input: {
    actor: CurriculumActor;
    bookId: string;
    unitId: string;
    editionId?: string | null;
    requirePublished?: boolean;
    allowArchived?: boolean;
  },
  loaders: CurriculumValidationLoaders,
) {
  await validateBookOwnership({ actor: input.actor, bookId: input.bookId }, loaders);
  const unit = ensureEntity(await loaders.loadUnit(input.unitId), "Unit");
  if (unit.bookId !== input.bookId) {
    throw new CurriculumValidationError("CROSS_BOOK_SCOPE", "Unit does not belong to the provided book.");
  }
  if (input.editionId !== undefined && unit.editionId !== input.editionId) {
    throw new CurriculumValidationError("INVALID_PARENT_CHAIN", "Unit does not belong to the provided edition.");
  }
  if (!input.allowArchived) {
    ensureActiveParent("Unit", unit, { requirePublished: input.requirePublished });
  } else if (input.requirePublished && unit.published === false) {
    throw new CurriculumValidationError("PARENT_UNPUBLISHED", "Unit is unpublished.");
  }
  return unit;
}

export async function validateChapterBelongsToBook(
  input: {
    actor: CurriculumActor;
    bookId: string;
    chapterId: string;
  },
  loaders: CurriculumValidationLoaders,
) {
  await validateBookOwnership({ actor: input.actor, bookId: input.bookId }, loaders);
  const chapter = ensureEntity(await loaders.loadChapter(input.chapterId), "Chapter");
  if (chapter.bookId !== input.bookId) {
    throw new CurriculumValidationError("CROSS_BOOK_SCOPE", "Chapter does not belong to the provided book.");
  }
  return chapter;
}

export async function validateChapterBelongsToUnit(
  input: {
    actor: CurriculumActor;
    bookId: string;
    chapterId: string;
    unitId: string;
    requirePublished?: boolean;
  },
  loaders: CurriculumValidationLoaders,
) {
  const unit = await validateUnitBelongsToBook(
    {
      actor: input.actor,
      bookId: input.bookId,
      unitId: input.unitId,
      requirePublished: input.requirePublished,
    },
    loaders,
  );
  const chapter = ensureEntity(await loaders.loadChapter(input.chapterId), "Chapter");
  if (chapter.bookId !== input.bookId) {
    throw new CurriculumValidationError("CROSS_BOOK_SCOPE", "Chapter does not belong to the provided book.");
  }
  if (chapter.unitId !== unit.id) {
    throw new CurriculumValidationError("INVALID_PARENT_CHAIN", "Chapter does not belong to the provided unit.");
  }
  return chapter;
}

export async function validateModuleBelongsToChapter(
  input: {
    actor: CurriculumActor;
    bookId: string;
    chapterId: string;
    moduleId: string;
    requirePublished?: boolean;
    allowArchived?: boolean;
  },
  loaders: CurriculumValidationLoaders,
) {
  await validateChapterBelongsToBook(
    { actor: input.actor, bookId: input.bookId, chapterId: input.chapterId },
    loaders,
  );
  const moduleNode = ensureEntity(await loaders.loadModule(input.moduleId), "Module");
  if (moduleNode.bookId !== input.bookId) {
    throw new CurriculumValidationError("CROSS_BOOK_SCOPE", "Module does not belong to the provided book.");
  }
  if (moduleNode.chapterId !== input.chapterId) {
    throw new CurriculumValidationError("INVALID_PARENT_CHAIN", "Module does not belong to the provided chapter.");
  }
  if (!input.allowArchived) {
    ensureActiveParent("Module", moduleNode, { requirePublished: input.requirePublished });
  } else if (input.requirePublished && moduleNode.published === false) {
    throw new CurriculumValidationError("PARENT_UNPUBLISHED", "Module is unpublished.");
  }
  return moduleNode;
}

export async function validateTopicBelongsToModule(
  input: {
    actor: CurriculumActor;
    bookId: string;
    chapterId: string;
    moduleId: string;
    topicId: string;
    requirePublished?: boolean;
    allowArchived?: boolean;
  },
  loaders: CurriculumValidationLoaders,
) {
  const moduleNode = await validateModuleBelongsToChapter(
    {
      actor: input.actor,
      bookId: input.bookId,
      chapterId: input.chapterId,
      moduleId: input.moduleId,
      requirePublished: input.requirePublished,
    },
    loaders,
  );
  const topic = ensureEntity(await loaders.loadTopic(input.topicId), "Topic");
  if (topic.bookId !== input.bookId) {
    throw new CurriculumValidationError("CROSS_BOOK_SCOPE", "Topic does not belong to the provided book.");
  }
  if (topic.chapterId !== input.chapterId || topic.moduleId !== moduleNode.id) {
    throw new CurriculumValidationError("INVALID_PARENT_CHAIN", "Topic does not belong to the provided parent chain.");
  }
  if (!input.allowArchived) {
    ensureActiveParent("Topic", topic, { requirePublished: input.requirePublished });
  } else if (input.requirePublished && topic.published === false) {
    throw new CurriculumValidationError("PARENT_UNPUBLISHED", "Topic is unpublished.");
  }
  return topic;
}

export async function validateExerciseBelongsToTopic(
  input: {
    actor: CurriculumActor;
    bookId: string;
    chapterId: string;
    moduleId: string;
    topicId: string;
    exerciseId: string;
    requirePublished?: boolean;
    allowArchived?: boolean;
  },
  loaders: CurriculumValidationLoaders,
) {
  const topic = await validateTopicBelongsToModule(
    {
      actor: input.actor,
      bookId: input.bookId,
      chapterId: input.chapterId,
      moduleId: input.moduleId,
      topicId: input.topicId,
      requirePublished: input.requirePublished,
    },
    loaders,
  );
  const exercise = ensureEntity(await loaders.loadExercise(input.exerciseId), "Exercise");
  if (exercise.bookId !== input.bookId) {
    throw new CurriculumValidationError("CROSS_BOOK_SCOPE", "Exercise does not belong to the provided book.");
  }
  if (exercise.chapterId !== input.chapterId || exercise.moduleId !== input.moduleId || exercise.topicId !== topic.id) {
    throw new CurriculumValidationError("INVALID_PARENT_CHAIN", "Exercise does not belong to the provided parent chain.");
  }
  if (!input.allowArchived) {
    ensureActiveParent("Exercise", exercise, { requirePublished: input.requirePublished });
  } else if (input.requirePublished && exercise.published === false) {
    throw new CurriculumValidationError("PARENT_UNPUBLISHED", "Exercise is unpublished.");
  }
  return exercise;
}

export async function validateQuestionBelongsToExercise(
  input: {
    actor: CurriculumActor;
    bookId: string;
    chapterId: string;
    exerciseId: string;
    questionId: string;
  },
  loaders: CurriculumValidationLoaders,
) {
  await validateBookOwnership({ actor: input.actor, bookId: input.bookId }, loaders);
  const exercise = ensureEntity(await loaders.loadExercise(input.exerciseId), "Exercise");
  if (exercise.bookId !== input.bookId || exercise.chapterId !== input.chapterId) {
    throw new CurriculumValidationError("INVALID_PARENT_CHAIN", "Exercise does not belong to the provided chapter.");
  }
  const question = ensureEntity(await loaders.loadQuestion(input.questionId), "Question");
  if (question.bookId !== input.bookId || question.chapterId !== input.chapterId) {
    throw new CurriculumValidationError("CROSS_BOOK_SCOPE", "Question does not belong to the provided book chapter.");
  }
  if (question.exerciseId !== input.exerciseId) {
    throw new CurriculumValidationError("INVALID_PARENT_CHAIN", "Question does not belong to the provided exercise.");
  }
  return question;
}

export async function validateVideoLessonBelongsToBook(
  input: {
    actor: CurriculumActor;
    bookId: string;
    videoLessonId: string;
    requirePublished?: boolean;
    allowArchived?: boolean;
  },
  loaders: CurriculumValidationLoaders,
) {
  await validateBookOwnership({ actor: input.actor, bookId: input.bookId }, loaders);
  const lesson = ensureEntity(await loaders.loadVideoLesson(input.videoLessonId), "Video lesson");
  if (lesson.publisherId !== input.actor.publisherId) {
    throw new CurriculumValidationError("CROSS_PUBLISHER_SCOPE", "Video lesson does not belong to the actor publisher.");
  }
  if (lesson.bookId !== input.bookId) {
    throw new CurriculumValidationError("CROSS_BOOK_SCOPE", "Video lesson does not belong to the provided book.");
  }
  if (!input.allowArchived) {
    ensureActiveParent("Video lesson", lesson, { requirePublished: input.requirePublished });
  } else if (input.requirePublished && lesson.published === false) {
    throw new CurriculumValidationError("PARENT_UNPUBLISHED", "Video lesson is unpublished.");
  }
  return lesson;
}
