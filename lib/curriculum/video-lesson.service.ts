import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  runCurriculumMutationWithDeniedAudit,
  writeCurriculumAuditEvent,
} from "@/lib/curriculum/audit";
import {
  createCurriculumValidationLoaders,
  CurriculumValidationError,
  type CurriculumActor,
  validateBookOwnership,
  validateChapterBelongsToBook,
  validateChapterBelongsToUnit,
  validateEditionBelongsToBook,
  validateExerciseBelongsToTopic,
  validateModuleBelongsToChapter,
  validateTopicBelongsToModule,
  validateUnitBelongsToBook,
  validateVideoLessonBelongsToBook,
} from "@/lib/curriculum/validation.service";

export type VideoLessonWriteInput = {
  editionId?: string | null;
  unitId?: string | null;
  chapterId?: string | null;
  moduleId?: string | null;
  topicId?: string | null;
  exerciseId?: string | null;
  title?: string;
  description?: string | null;
  provider?: string;
  externalId?: string | null;
  videoUrl?: string;
  thumbnailUrl?: string | null;
  transcript?: Prisma.InputJsonValue | null;
  captionsUrl?: string | null;
  durationSeconds?: number | null;
  completionPercent?: number;
  published?: boolean;
  archived?: boolean;
  displayOrder?: number;
};

function normalizeVideoLessonWriteInput(input: VideoLessonWriteInput) {
  return {
    ...(input.editionId !== undefined ? { editionId: input.editionId || null } : {}),
    ...(input.unitId !== undefined ? { unitId: input.unitId || null } : {}),
    ...(input.chapterId !== undefined ? { chapterId: input.chapterId || null } : {}),
    ...(input.moduleId !== undefined ? { moduleId: input.moduleId || null } : {}),
    ...(input.topicId !== undefined ? { topicId: input.topicId || null } : {}),
    ...(input.exerciseId !== undefined ? { exerciseId: input.exerciseId || null } : {}),
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
    ...(input.provider !== undefined ? { provider: input.provider.trim() } : {}),
    ...(input.externalId !== undefined ? { externalId: input.externalId?.trim() || null } : {}),
    ...(input.videoUrl !== undefined ? { videoUrl: input.videoUrl.trim() } : {}),
    ...(input.thumbnailUrl !== undefined ? { thumbnailUrl: input.thumbnailUrl?.trim() || null } : {}),
    ...(input.transcript !== undefined ? { transcript: input.transcript ?? Prisma.JsonNull } : {}),
    ...(input.captionsUrl !== undefined ? { captionsUrl: input.captionsUrl?.trim() || null } : {}),
    ...(input.durationSeconds !== undefined ? { durationSeconds: input.durationSeconds } : {}),
    ...(input.completionPercent !== undefined ? { completionPercent: input.completionPercent } : {}),
    ...(input.published !== undefined ? { published: input.published } : {}),
    ...(input.archived !== undefined ? { archived: input.archived } : {}),
    ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
  };
}

async function validateOptionalLessonChain(
  input: {
    actor: CurriculumActor;
    bookId: string;
    chapterId?: string | null;
    moduleId?: string | null;
    topicId?: string | null;
    exerciseId?: string | null;
    requirePublished?: boolean;
  },
  loaders: ReturnType<typeof createCurriculumValidationLoaders>,
) {
  if (!input.chapterId && !input.moduleId && !input.topicId && !input.exerciseId) {
    return;
  }
  if (input.exerciseId) {
    if (!input.chapterId || !input.moduleId || !input.topicId) {
      throw new CurriculumValidationError(
        "INVALID_PARENT_CHAIN",
        "exerciseId requires chapterId, moduleId, and topicId.",
      );
    }
    await validateExerciseBelongsToTopic(
      {
        actor: input.actor,
        bookId: input.bookId,
        chapterId: input.chapterId,
        moduleId: input.moduleId,
        topicId: input.topicId,
        exerciseId: input.exerciseId,
        requirePublished: input.requirePublished,
      },
      loaders,
    );
    return;
  }
  if (input.topicId && (!input.moduleId || !input.chapterId)) {
    throw new CurriculumValidationError("INVALID_PARENT_CHAIN", "topicId requires chapterId and moduleId.");
  }
  if (input.moduleId && !input.chapterId) {
    throw new CurriculumValidationError("INVALID_PARENT_CHAIN", "moduleId requires chapterId.");
  }
}

async function validateVideoLessonParentChain(
  input: {
    actor: CurriculumActor;
    bookId: string;
    editionId?: string | null;
    unitId?: string | null;
    chapterId?: string | null;
    moduleId?: string | null;
    topicId?: string | null;
    exerciseId?: string | null;
    requirePublished?: boolean;
  },
  loaders: ReturnType<typeof createCurriculumValidationLoaders>,
) {
  await validateBookOwnership(
    { actor: input.actor, bookId: input.bookId, requirePublished: input.requirePublished },
    loaders,
  );

  if (input.editionId) {
    await validateEditionBelongsToBook(
      {
        actor: input.actor,
        bookId: input.bookId,
        editionId: input.editionId,
        requirePublished: input.requirePublished,
      },
      loaders,
    );
  }

  if (input.unitId) {
    const unit = await validateUnitBelongsToBook(
      {
        actor: input.actor,
        bookId: input.bookId,
        unitId: input.unitId,
        editionId: input.editionId ?? undefined,
        requirePublished: input.requirePublished,
      },
      loaders,
    );
    if (input.editionId && unit.editionId !== input.editionId) {
      throw new CurriculumValidationError("INVALID_PARENT_CHAIN", "Unit does not belong to the provided edition.");
    }
  }

  if (input.chapterId) {
    if (input.unitId) {
      await validateChapterBelongsToUnit(
        {
          actor: input.actor,
          bookId: input.bookId,
          chapterId: input.chapterId,
          unitId: input.unitId,
          requirePublished: input.requirePublished,
        },
        loaders,
      );
    } else {
      const chapter = await validateChapterBelongsToBook(
        { actor: input.actor, bookId: input.bookId, chapterId: input.chapterId },
        loaders,
      );
      if (input.editionId && chapter.editionId !== input.editionId) {
        throw new CurriculumValidationError("INVALID_PARENT_CHAIN", "Chapter does not belong to the provided edition.");
      }
    }
  }

  if (input.moduleId) {
    if (!input.chapterId) {
      throw new CurriculumValidationError("INVALID_PARENT_CHAIN", "moduleId requires chapterId.");
    }
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
  }

  if (input.topicId) {
    if (!input.moduleId || !input.chapterId) {
      throw new CurriculumValidationError("INVALID_PARENT_CHAIN", "topicId requires moduleId and chapterId.");
    }
    await validateTopicBelongsToModule(
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
  }

  await validateOptionalLessonChain(
    {
      actor: input.actor,
      bookId: input.bookId,
      chapterId: input.chapterId,
      moduleId: input.moduleId,
      topicId: input.topicId,
      exerciseId: input.exerciseId,
      requirePublished: input.requirePublished,
    },
    loaders,
  );
}

export async function createVideoLesson(
  input: {
    actor: CurriculumActor;
    bookId: string;
    data: Required<Pick<VideoLessonWriteInput, "title" | "provider" | "videoUrl">> & VideoLessonWriteInput;
  },
) {
  const normalized = normalizeVideoLessonWriteInput(input.data);
  if (!normalized.title) {
    throw new CurriculumValidationError("INVALID_INPUT", "Video lesson title is required.");
  }
  if (!normalized.provider) {
    throw new CurriculumValidationError("INVALID_INPUT", "Video lesson provider is required.");
  }
  if (!normalized.videoUrl) {
    throw new CurriculumValidationError("INVALID_INPUT", "Video lesson URL is required.");
  }
  if (normalized.published === true && normalized.archived === true) {
    throw new CurriculumValidationError("INVALID_STATE", "Archived lessons cannot be published.");
  }
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.video_lesson.create",
    targetType: "VideoLesson",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    await validateVideoLessonParentChain(
      {
        actor: input.actor,
        bookId: input.bookId,
        editionId: normalized.editionId,
        unitId: normalized.unitId,
        chapterId: normalized.chapterId,
        moduleId: normalized.moduleId,
        topicId: normalized.topicId,
        exerciseId: normalized.exerciseId,
        requirePublished: normalized.published === true,
      },
      loaders,
    );
    const created = await tx.videoLesson.create({
      data: {
        publisherId: input.actor.publisherId,
        bookId: input.bookId,
        editionId: normalized.editionId ?? null,
        unitId: normalized.unitId ?? null,
        chapterId: normalized.chapterId ?? null,
        moduleId: normalized.moduleId ?? null,
        topicId: normalized.topicId ?? null,
        exerciseId: normalized.exerciseId ?? null,
        title: normalized.title ?? "",
        description: normalized.description ?? null,
        provider: normalized.provider ?? "",
        externalId: normalized.externalId ?? null,
        videoUrl: normalized.videoUrl ?? "",
        thumbnailUrl: normalized.thumbnailUrl ?? null,
        transcript: normalized.transcript ?? Prisma.JsonNull,
        captionsUrl: normalized.captionsUrl ?? null,
        durationSeconds: normalized.durationSeconds ?? null,
        completionPercent: normalized.completionPercent ?? 90,
        published: normalized.published ?? false,
        archived: normalized.archived ?? false,
        displayOrder: normalized.displayOrder ?? 0,
      },
    });
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.video_lesson.create",
      targetType: "VideoLesson",
      targetId: created.id,
      changedFields: ["title", "provider", "published", "archived", "chapterId", "moduleId", "topicId", "exerciseId"],
    });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function updateVideoLesson(
  input: { actor: CurriculumActor; bookId: string; videoLessonId: string; data: VideoLessonWriteInput },
) {
  const normalized = normalizeVideoLessonWriteInput(input.data);
  if (normalized.title !== undefined && !normalized.title) {
    throw new CurriculumValidationError("INVALID_INPUT", "Video lesson title is required.");
  }
  if (normalized.provider !== undefined && !normalized.provider) {
    throw new CurriculumValidationError("INVALID_INPUT", "Video lesson provider is required.");
  }
  if (normalized.videoUrl !== undefined && !normalized.videoUrl) {
    throw new CurriculumValidationError("INVALID_INPUT", "Video lesson URL is required.");
  }
  if (normalized.published === true && normalized.archived === true) {
    throw new CurriculumValidationError("INVALID_STATE", "Archived lessons cannot be published.");
  }
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.video_lesson.update",
    targetType: "VideoLesson",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    const lesson = await validateVideoLessonBelongsToBook(
      { actor: input.actor, bookId: input.bookId, videoLessonId: input.videoLessonId },
      loaders,
    );
    await validateVideoLessonParentChain(
      {
        actor: input.actor,
        bookId: input.bookId,
        editionId: normalized.editionId ?? lesson.editionId,
        unitId: normalized.unitId ?? lesson.unitId,
        chapterId: normalized.chapterId ?? lesson.chapterId,
        moduleId: normalized.moduleId ?? lesson.moduleId,
        topicId: normalized.topicId ?? lesson.topicId,
        exerciseId: normalized.exerciseId ?? lesson.exerciseId,
        requirePublished: normalized.published === true,
      },
      loaders,
    );
    const updated = await tx.videoLesson.updateMany({
      where: {
        id: input.videoLessonId,
        publisherId: input.actor.publisherId,
        bookId: input.bookId,
      },
      data: normalized,
    });
    if (updated.count !== 1) throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Video lesson was not found for update.");
    const current = await tx.videoLesson.findFirst({
      where: { id: input.videoLessonId, publisherId: input.actor.publisherId, bookId: input.bookId },
    });
    if (!current) throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Video lesson was not found after update.");
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.video_lesson.update",
      targetType: "VideoLesson",
      targetId: current.id,
      changedFields: Object.keys(normalized),
    });
      return current;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function archiveVideoLesson(
  input: { actor: CurriculumActor; bookId: string; videoLessonId: string },
) {
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.video_lesson.archive",
    targetType: "VideoLesson",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    await validateVideoLessonBelongsToBook(
      { actor: input.actor, bookId: input.bookId, videoLessonId: input.videoLessonId },
      loaders,
    );
    const archived = await tx.videoLesson.update({ where: { id: input.videoLessonId }, data: { archived: true } });
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.video_lesson.archive",
      targetType: "VideoLesson",
      targetId: archived.id,
      changedFields: ["archived"],
      fromStatus: "ACTIVE",
      toStatus: "ARCHIVED",
    });
      return archived;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function restoreVideoLesson(
  input: { actor: CurriculumActor; bookId: string; videoLessonId: string },
) {
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.video_lesson.restore",
    targetType: "VideoLesson",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    await validateVideoLessonBelongsToBook(
      { actor: input.actor, bookId: input.bookId, videoLessonId: input.videoLessonId, allowArchived: true },
      loaders,
    );
    const restored = await tx.videoLesson.update({ where: { id: input.videoLessonId }, data: { archived: false } });
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.video_lesson.restore",
      targetType: "VideoLesson",
      targetId: restored.id,
      changedFields: ["archived"],
      fromStatus: "ARCHIVED",
      toStatus: "ACTIVE",
    });
      return restored;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}
