import "server-only";

import { Prisma, type CurriculumDifficultyLevel, type CurriculumExerciseType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  runCurriculumMutationWithDeniedAudit,
  writeCurriculumAuditEvent,
} from "@/lib/curriculum/audit";
import {
  createCurriculumValidationLoaders,
  CurriculumValidationError,
  normalizeCurriculumCode,
  type CurriculumActor,
  validateBookOwnership,
  validateChapterBelongsToBook,
  validateModuleBelongsToChapter,
  validateTopicBelongsToModule,
} from "@/lib/curriculum/validation.service";

export type ExerciseWriteInput = {
  chapterId?: string;
  moduleId?: string | null;
  topicId?: string | null;
  code?: string | null;
  title?: string;
  instructions?: Prisma.InputJsonValue | null;
  type?: CurriculumExerciseType;
  marks?: number | null;
  estimatedMinutes?: number | null;
  difficulty?: CurriculumDifficultyLevel | null;
  published?: boolean;
  archived?: boolean;
  displayOrder?: number;
};

function normalizeExerciseWriteInput(input: ExerciseWriteInput) {
  return {
    ...(input.chapterId !== undefined ? { chapterId: input.chapterId } : {}),
    ...(input.moduleId !== undefined ? { moduleId: input.moduleId || null } : {}),
    ...(input.topicId !== undefined ? { topicId: input.topicId || null } : {}),
    ...(input.code !== undefined ? { code: normalizeCurriculumCode(input.code) } : {}),
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.instructions !== undefined ? { instructions: input.instructions ?? Prisma.JsonNull } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.marks !== undefined ? { marks: input.marks } : {}),
    ...(input.estimatedMinutes !== undefined ? { estimatedMinutes: input.estimatedMinutes } : {}),
    ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
    ...(input.published !== undefined ? { published: input.published } : {}),
    ...(input.archived !== undefined ? { archived: input.archived } : {}),
    ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
  };
}

async function validateExerciseParentChain(
  input: { actor: CurriculumActor; bookId: string; chapterId: string; moduleId?: string | null; topicId?: string | null; requirePublished?: boolean },
  loaders: ReturnType<typeof createCurriculumValidationLoaders>,
) {
  await validateChapterBelongsToBook(
    { actor: input.actor, bookId: input.bookId, chapterId: input.chapterId },
    loaders,
  );
  if (!input.moduleId && !input.topicId) return;
  if (input.topicId && !input.moduleId) {
    const topic = await loaders.loadTopic(input.topicId);
    if (!topic || topic.bookId !== input.bookId || topic.chapterId !== input.chapterId) {
      throw new CurriculumValidationError("INVALID_PARENT_CHAIN", "Topic does not belong to the provided chapter chain.");
    }
    if (!topic.moduleId) {
      throw new CurriculumValidationError(
        "INVALID_PARENT_CHAIN",
        "This exercise service requires the topic to belong to a lesson group.",
      );
    }
    await validateTopicBelongsToModule(
      {
        actor: input.actor,
        bookId: input.bookId,
        chapterId: input.chapterId,
        moduleId: topic.moduleId,
        topicId: input.topicId,
        requirePublished: input.requirePublished,
      },
      loaders,
    );
    return;
  }
  if (input.moduleId && !input.topicId) {
    await validateModuleBelongsToChapter(
      {
        actor: input.actor,
        bookId: input.bookId,
        chapterId: input.chapterId,
        moduleId: input.moduleId,
        requirePublished: input.requirePublished,
      },
      loaders,
    );
    return;
  }
  await validateTopicBelongsToModule(
    {
      actor: input.actor,
      bookId: input.bookId,
      chapterId: input.chapterId,
      moduleId: input.moduleId!,
      topicId: input.topicId!,
      requirePublished: input.requirePublished,
    },
    loaders,
  );
}

async function assertExerciseCodeAvailable(
  tx: Prisma.TransactionClient,
  input: {
    chapterId: string;
    moduleId: string | null;
    topicId: string | null;
    code: string | null | undefined;
    currentId?: string;
  },
) {
  if (!input.code) return;
  const where =
    input.topicId
      ? { topicId: input.topicId, code: input.code }
      : input.moduleId
        ? { moduleId: input.moduleId, topicId: null, code: input.code }
        : { chapterId: input.chapterId, moduleId: null, topicId: null, code: input.code };
  const conflict = await tx.bookExercise.findFirst({
    where: {
      ...where,
      ...(input.currentId ? { NOT: { id: input.currentId } } : {}),
    },
    select: { id: true },
  });
  if (conflict) {
    throw new CurriculumValidationError("DUPLICATE_CODE", "Exercise code already exists in the selected scope.");
  }
}

export async function createExercise(
  input: {
    actor: CurriculumActor;
    bookId: string;
    data: Required<Pick<ExerciseWriteInput, "chapterId" | "title" | "type">> & ExerciseWriteInput;
  },
) {
  const normalized = normalizeExerciseWriteInput(input.data);
  if (!normalized.chapterId) {
    throw new CurriculumValidationError("INVALID_INPUT", "Exercise chapterId is required.");
  }
  if (!normalized.title) {
    throw new CurriculumValidationError("INVALID_INPUT", "Exercise title is required.");
  }
  if (!normalized.type) {
    throw new CurriculumValidationError("INVALID_INPUT", "Exercise type is required.");
  }
  const chapterId = normalized.chapterId;
  const title = normalized.title;
  const type = normalized.type;
  if (normalized.published === true && normalized.archived === true) {
    throw new CurriculumValidationError("INVALID_STATE", "Archived exercises cannot be published.");
  }
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.exercise.create",
    targetType: "BookExercise",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    await validateBookOwnership(
      { actor: input.actor, bookId: input.bookId, requirePublished: normalized.published === true },
      loaders,
    );
    await validateExerciseParentChain(
      {
        actor: input.actor,
        bookId: input.bookId,
        chapterId,
        moduleId: normalized.moduleId,
        topicId: normalized.topicId,
        requirePublished: normalized.published === true,
      },
      loaders,
    );
    await assertExerciseCodeAvailable(tx, {
      chapterId,
      moduleId: normalized.moduleId ?? null,
      topicId: normalized.topicId ?? null,
      code: normalized.code,
    });
    const created = await tx.bookExercise.create({
      data: {
        bookId: input.bookId,
        chapterId,
        moduleId: normalized.moduleId ?? null,
        topicId: normalized.topicId ?? null,
        code: normalized.code ?? null,
        title,
        instructions: normalized.instructions ?? Prisma.JsonNull,
        type,
        marks: normalized.marks ?? null,
        estimatedMinutes: normalized.estimatedMinutes ?? null,
        difficulty: normalized.difficulty ?? null,
        published: normalized.published ?? false,
        archived: normalized.archived ?? false,
        displayOrder: normalized.displayOrder ?? 0,
      },
    });
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.exercise.create",
      targetType: "BookExercise",
      targetId: created.id,
      changedFields: ["chapterId", "moduleId", "topicId", "title", "type", "published", "archived", "displayOrder"],
    });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function updateExercise(
  input: { actor: CurriculumActor; bookId: string; exerciseId: string; data: ExerciseWriteInput },
) {
  const normalized = normalizeExerciseWriteInput(input.data);
  if (normalized.title !== undefined && !normalized.title) {
    throw new CurriculumValidationError("INVALID_INPUT", "Exercise title is required.");
  }
  if (normalized.published === true && normalized.archived === true) {
    throw new CurriculumValidationError("INVALID_STATE", "Archived exercises cannot be published.");
  }
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.exercise.update",
    targetType: "BookExercise",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    const existing = await tx.bookExercise.findFirst({
      where: { id: input.exerciseId, bookId: input.bookId },
      select: { chapterId: true, moduleId: true, topicId: true },
    });
    if (!existing) throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Exercise was not found for update.");
    const effectiveChapterId = normalized.chapterId ?? existing.chapterId;
    const effectiveModuleId = normalized.moduleId !== undefined ? normalized.moduleId : existing.moduleId;
    const effectiveTopicId = normalized.topicId !== undefined ? normalized.topicId : existing.topicId;
    await validateExerciseParentChain(
      {
        actor: input.actor,
        bookId: input.bookId,
        chapterId: effectiveChapterId,
        moduleId: effectiveModuleId,
        topicId: effectiveTopicId,
        requirePublished: normalized.published === true,
      },
      loaders,
    );
    await assertExerciseCodeAvailable(tx, {
      chapterId: effectiveChapterId,
      moduleId: effectiveModuleId,
      topicId: effectiveTopicId,
      code: normalized.code,
      currentId: input.exerciseId,
    });
    const updated = await tx.bookExercise.updateMany({
      where: { id: input.exerciseId, bookId: input.bookId },
      data: normalized,
    });
    if (updated.count !== 1) throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Exercise was not found for update.");
    const exercise = await tx.bookExercise.findFirst({ where: { id: input.exerciseId, bookId: input.bookId } });
    if (!exercise) throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Exercise was not found after update.");
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.exercise.update",
      targetType: "BookExercise",
      targetId: exercise.id,
      changedFields: Object.keys(normalized),
    });
      return exercise;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function archiveExercise(
  input: { actor: CurriculumActor; bookId: string; exerciseId: string },
) {
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.exercise.archive",
    targetType: "BookExercise",
    operation: () => prisma.$transaction(async (tx) => {
      const loaders = createCurriculumValidationLoaders(tx);
      const existing = await tx.bookExercise.findFirst({
        where: { id: input.exerciseId, bookId: input.bookId },
        select: { chapterId: true, moduleId: true, topicId: true },
      });
      if (!existing) {
        throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Exercise was not found for archive.");
      }
      await validateExerciseParentChain(
        {
          actor: input.actor,
          bookId: input.bookId,
          chapterId: existing.chapterId,
          moduleId: existing.moduleId,
          topicId: existing.topicId,
        },
        loaders,
      );
      const archived = await tx.bookExercise.update({ where: { id: input.exerciseId }, data: { archived: true } });
      await writeCurriculumAuditEvent(tx, {
        actor: input.actor,
        action: "publisher.curriculum.exercise.archive",
        targetType: "BookExercise",
        targetId: archived.id,
        changedFields: ["archived"],
        fromStatus: "ACTIVE",
        toStatus: "ARCHIVED",
      });
      return archived;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function restoreExercise(
  input: { actor: CurriculumActor; bookId: string; exerciseId: string },
) {
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.exercise.restore",
    targetType: "BookExercise",
    operation: () => prisma.$transaction(async (tx) => {
      const loaders = createCurriculumValidationLoaders(tx);
      const existing = await tx.bookExercise.findFirst({
        where: { id: input.exerciseId, bookId: input.bookId },
        select: { chapterId: true, moduleId: true, topicId: true },
      });
      if (!existing) {
        throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Exercise was not found for restore.");
      }
      await validateExerciseParentChain(
        {
          actor: input.actor,
          bookId: input.bookId,
          chapterId: existing.chapterId,
          moduleId: existing.moduleId,
          topicId: existing.topicId,
        },
        loaders,
      );
      const restored = await tx.bookExercise.update({ where: { id: input.exerciseId }, data: { archived: false } });
      await writeCurriculumAuditEvent(tx, {
        actor: input.actor,
        action: "publisher.curriculum.exercise.restore",
        targetType: "BookExercise",
        targetId: restored.id,
        changedFields: ["archived"],
        fromStatus: "ARCHIVED",
        toStatus: "ACTIVE",
      });
      return restored;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}
