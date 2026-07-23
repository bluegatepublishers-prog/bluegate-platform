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
  normalizeCurriculumCode,
  type CurriculumActor,
  validateBookOwnership,
  validateChapterBelongsToBook,
  validateChapterBelongsToUnit,
  validateModuleBelongsToChapter,
} from "@/lib/curriculum/validation.service";

export type ModuleWriteInput = {
  chapterId?: string;
  unitId?: string | null;
  code?: string | null;
  title?: string;
  number?: string | null;
  description?: string | null;
  teacherNotes?: Prisma.InputJsonValue | null;
  studentNotes?: Prisma.InputJsonValue | null;
  estimatedMinutes?: number | null;
  published?: boolean;
  archived?: boolean;
  displayOrder?: number;
};

function normalizeModuleWriteInput(input: ModuleWriteInput) {
  return {
    ...(input.chapterId !== undefined ? { chapterId: input.chapterId } : {}),
    ...(input.unitId !== undefined ? { unitId: input.unitId || null } : {}),
    ...(input.code !== undefined ? { code: normalizeCurriculumCode(input.code) } : {}),
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.number !== undefined ? { number: input.number?.trim() || null } : {}),
    ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
    ...(input.teacherNotes !== undefined ? { teacherNotes: input.teacherNotes ?? Prisma.JsonNull } : {}),
    ...(input.studentNotes !== undefined ? { studentNotes: input.studentNotes ?? Prisma.JsonNull } : {}),
    ...(input.estimatedMinutes !== undefined ? { estimatedMinutes: input.estimatedMinutes } : {}),
    ...(input.published !== undefined ? { published: input.published } : {}),
    ...(input.archived !== undefined ? { archived: input.archived } : {}),
    ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
  };
}

async function assertModuleCodeAvailable(
  tx: Prisma.TransactionClient,
  input: { chapterId: string; code: string | null | undefined; currentId?: string },
) {
  if (!input.code) return;
  const conflict = await tx.bookModule.findFirst({
    where: {
      chapterId: input.chapterId,
      code: input.code,
      ...(input.currentId ? { NOT: { id: input.currentId } } : {}),
    },
    select: { id: true },
  });
  if (conflict) {
    throw new CurriculumValidationError("DUPLICATE_CODE", "Module code already exists in this chapter.");
  }
}

async function validateChapterChain(
  input: { actor: CurriculumActor; bookId: string; chapterId: string; unitId?: string | null; requirePublished?: boolean },
  loaders: ReturnType<typeof createCurriculumValidationLoaders>,
) {
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
    return;
  }
  const chapter = await loaders.loadChapter(input.chapterId);
  if (!chapter || chapter.bookId !== input.bookId) {
    throw new CurriculumValidationError("INVALID_PARENT_CHAIN", "Chapter does not belong to the provided book.");
  }
}

export async function createModule(
  input: { actor: CurriculumActor; bookId: string; data: Required<Pick<ModuleWriteInput, "chapterId" | "title">> & ModuleWriteInput },
) {
  const normalized = normalizeModuleWriteInput(input.data);
  if (!normalized.chapterId) {
    throw new CurriculumValidationError("INVALID_INPUT", "Module chapterId is required.");
  }
  if (!normalized.title) {
    throw new CurriculumValidationError("INVALID_INPUT", "Module title is required.");
  }
  const chapterId = normalized.chapterId;
  const title = normalized.title;
  if (normalized.published === true && normalized.archived === true) {
    throw new CurriculumValidationError("INVALID_STATE", "Archived modules cannot be published.");
  }
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.module.create",
    targetType: "BookModule",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    await validateBookOwnership(
      { actor: input.actor, bookId: input.bookId, requirePublished: normalized.published === true },
      loaders,
    );
    await validateChapterChain(
      {
        actor: input.actor,
        bookId: input.bookId,
        chapterId,
        unitId: normalized.unitId,
        requirePublished: normalized.published === true,
      },
      loaders,
    );
    await assertModuleCodeAvailable(tx, {
      chapterId,
      code: normalized.code,
    });
    const created = await tx.bookModule.create({
      data: {
        bookId: input.bookId,
        chapterId,
        unitId: normalized.unitId ?? null,
        code: normalized.code ?? null,
        title,
        number: normalized.number ?? null,
        description: normalized.description ?? null,
        teacherNotes: normalized.teacherNotes ?? Prisma.JsonNull,
        studentNotes: normalized.studentNotes ?? Prisma.JsonNull,
        estimatedMinutes: normalized.estimatedMinutes ?? null,
        published: normalized.published ?? false,
        archived: normalized.archived ?? false,
        displayOrder: normalized.displayOrder ?? 0,
      },
    });
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.module.create",
      targetType: "BookModule",
      targetId: created.id,
      changedFields: ["chapterId", "unitId", "title", "code", "published", "archived", "displayOrder"],
    });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function updateModule(
  input: { actor: CurriculumActor; bookId: string; moduleId: string; data: ModuleWriteInput },
) {
  const normalized = normalizeModuleWriteInput(input.data);
  if (normalized.title !== undefined && !normalized.title) {
    throw new CurriculumValidationError("INVALID_INPUT", "Module title is required.");
  }
  if (normalized.published === true && normalized.archived === true) {
    throw new CurriculumValidationError("INVALID_STATE", "Archived modules cannot be published.");
  }
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.module.update",
    targetType: "BookModule",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    const moduleRow = await tx.bookModule.findFirst({
      where: { id: input.moduleId, bookId: input.bookId },
      select: { chapterId: true, unitId: true },
    });
    if (!moduleRow) {
      throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Module was not found for update.");
    }
    const existing = await validateModuleBelongsToChapter(
      {
        actor: input.actor,
        bookId: input.bookId,
        chapterId: normalized.chapterId ?? moduleRow.chapterId,
        moduleId: input.moduleId,
        requirePublished: normalized.published === true,
      },
      loaders,
    );
    await validateChapterChain(
      {
        actor: input.actor,
        bookId: input.bookId,
        chapterId: normalized.chapterId ?? existing.chapterId,
        unitId: normalized.unitId ?? existing.unitId,
        requirePublished: normalized.published === true,
      },
      loaders,
    );
    await assertModuleCodeAvailable(tx, {
      chapterId: normalized.chapterId ?? existing.chapterId,
      code: normalized.code,
      currentId: input.moduleId,
    });
    const updated = await tx.bookModule.updateMany({
      where: { id: input.moduleId, bookId: input.bookId },
      data: normalized,
    });
    if (updated.count !== 1) throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Module was not found for update.");
    const moduleNode = await tx.bookModule.findFirst({ where: { id: input.moduleId, bookId: input.bookId } });
    if (!moduleNode) throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Module was not found after update.");
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.module.update",
      targetType: "BookModule",
      targetId: moduleNode.id,
      changedFields: Object.keys(normalized),
    });
      return moduleNode;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function archiveModule(
  input: { actor: CurriculumActor; bookId: string; chapterId: string; moduleId: string },
) {
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.module.archive",
    targetType: "BookModule",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    await validateModuleBelongsToChapter(input, loaders);
    const archived = await tx.bookModule.update({ where: { id: input.moduleId }, data: { archived: true } });
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.module.archive",
      targetType: "BookModule",
      targetId: archived.id,
      changedFields: ["archived"],
      fromStatus: "ACTIVE",
      toStatus: "ARCHIVED",
    });
      return archived;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function restoreModule(
  input: { actor: CurriculumActor; bookId: string; chapterId: string; moduleId: string },
) {
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.module.restore",
    targetType: "BookModule",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    const chapter = await validateChapterBelongsToBook(
      { actor: input.actor, bookId: input.bookId, chapterId: input.chapterId },
      loaders,
    );
    if (chapter.unitId) {
      await validateChapterBelongsToUnit(
        {
          actor: input.actor,
          bookId: input.bookId,
          chapterId: input.chapterId,
          unitId: chapter.unitId,
        },
        loaders,
      );
    }
    await validateModuleBelongsToChapter(
      { ...input, requirePublished: false, allowArchived: true },
      loaders,
    );
    const restored = await tx.bookModule.update({ where: { id: input.moduleId }, data: { archived: false } });
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.module.restore",
      targetType: "BookModule",
      targetId: restored.id,
      changedFields: ["archived"],
      fromStatus: "ARCHIVED",
      toStatus: "ACTIVE",
    });
      return restored;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}
