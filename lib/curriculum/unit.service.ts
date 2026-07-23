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
  validateEditionBelongsToBook,
  validateUnitBelongsToBook,
} from "@/lib/curriculum/validation.service";

export type UnitWriteInput = {
  editionId?: string | null;
  code?: string | null;
  title?: string;
  number?: string | null;
  description?: string | null;
  introduction?: string | null;
  learningGoals?: Prisma.InputJsonValue | null;
  estimatedMinutes?: number | null;
  imageUrl?: string | null;
  published?: boolean;
  archived?: boolean;
  displayOrder?: number;
};

function normalizeUnitWriteInput(input: UnitWriteInput) {
  return {
    ...(input.editionId !== undefined ? { editionId: input.editionId || null } : {}),
    ...(input.code !== undefined ? { code: normalizeCurriculumCode(input.code) } : {}),
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.number !== undefined ? { number: input.number?.trim() || null } : {}),
    ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
    ...(input.introduction !== undefined ? { introduction: input.introduction?.trim() || null } : {}),
    ...(input.learningGoals !== undefined ? { learningGoals: input.learningGoals ?? Prisma.JsonNull } : {}),
    ...(input.estimatedMinutes !== undefined ? { estimatedMinutes: input.estimatedMinutes } : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl?.trim() || null } : {}),
    ...(input.published !== undefined ? { published: input.published } : {}),
    ...(input.archived !== undefined ? { archived: input.archived } : {}),
    ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
  };
}

async function assertUnitCodeAvailable(
  tx: Prisma.TransactionClient,
  input: { bookId: string; editionId: string | null; code: string | null | undefined; currentId?: string },
) {
  if (!input.code) return;
  const where =
    input.editionId
      ? {
        editionId: input.editionId,
        code: input.code,
      }
      : {
        bookId: input.bookId,
        editionId: null,
        code: input.code,
      };
  const conflict = await tx.bookUnit.findFirst({
    where: {
      ...where,
      ...(input.currentId ? { NOT: { id: input.currentId } } : {}),
    },
    select: { id: true },
  });
  if (conflict) {
    throw new CurriculumValidationError(
      "DUPLICATE_CODE",
      input.editionId
        ? "Unit code already exists in this edition."
        : "Unit code already exists among edition-less units in this book.",
    );
  }
}

export async function createUnit(
  input: { actor: CurriculumActor; bookId: string; data: Required<Pick<UnitWriteInput, "title">> & UnitWriteInput },
) {
  const normalized = normalizeUnitWriteInput(input.data);
  if (!normalized.title) {
    throw new CurriculumValidationError("INVALID_INPUT", "Unit title is required.");
  }
  if (normalized.published === true && normalized.archived === true) {
    throw new CurriculumValidationError("INVALID_STATE", "Archived units cannot be published.");
  }
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.unit.create",
    targetType: "BookUnit",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    await validateBookOwnership(
      { actor: input.actor, bookId: input.bookId, requirePublished: normalized.published === true },
      loaders,
    );
    if (normalized.editionId) {
      await validateEditionBelongsToBook(
        {
          actor: input.actor,
          bookId: input.bookId,
          editionId: normalized.editionId,
          requirePublished: normalized.published === true,
        },
        loaders,
      );
    }
    await assertUnitCodeAvailable(tx, {
      bookId: input.bookId,
      editionId: normalized.editionId ?? null,
      code: normalized.code,
    });
    const created = await tx.bookUnit.create({
      data: {
        bookId: input.bookId,
        editionId: normalized.editionId ?? null,
        code: normalized.code ?? null,
        title: normalized.title ?? "",
        number: normalized.number ?? null,
        description: normalized.description ?? null,
        introduction: normalized.introduction ?? null,
        learningGoals: normalized.learningGoals ?? Prisma.JsonNull,
        estimatedMinutes: normalized.estimatedMinutes ?? null,
        imageUrl: normalized.imageUrl ?? null,
        published: normalized.published ?? false,
        archived: normalized.archived ?? false,
        displayOrder: normalized.displayOrder ?? 0,
      },
    });
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.unit.create",
      targetType: "BookUnit",
      targetId: created.id,
      changedFields: ["title", "code", "editionId", "published", "archived", "displayOrder"],
    });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function updateUnit(
  input: { actor: CurriculumActor; bookId: string; unitId: string; data: UnitWriteInput },
) {
  const normalized = normalizeUnitWriteInput(input.data);
  if (normalized.title !== undefined && !normalized.title) {
    throw new CurriculumValidationError("INVALID_INPUT", "Unit title is required.");
  }
  if (normalized.published === true && normalized.archived === true) {
    throw new CurriculumValidationError("INVALID_STATE", "Archived units cannot be published.");
  }
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.unit.update",
    targetType: "BookUnit",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    await validateUnitBelongsToBook(
      {
        actor: input.actor,
        bookId: input.bookId,
        unitId: input.unitId,
        requirePublished: normalized.published === true,
      },
      loaders,
    );
    if (normalized.editionId) {
      await validateEditionBelongsToBook(
        {
          actor: input.actor,
          bookId: input.bookId,
          editionId: normalized.editionId,
          requirePublished: normalized.published === true,
        },
        loaders,
      );
    }
    const effectiveEditionId =
      normalized.editionId !== undefined
        ? normalized.editionId
        : (await tx.bookUnit.findFirst({
          where: { id: input.unitId, bookId: input.bookId },
          select: { editionId: true },
        }))?.editionId ?? null;
    await assertUnitCodeAvailable(tx, {
      bookId: input.bookId,
      editionId: effectiveEditionId,
      code: normalized.code,
      currentId: input.unitId,
    });
    const updated = await tx.bookUnit.updateMany({
      where: { id: input.unitId, bookId: input.bookId },
      data: normalized,
    });
    if (updated.count !== 1) throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Unit was not found for update.");
    const unit = await tx.bookUnit.findFirst({ where: { id: input.unitId, bookId: input.bookId } });
    if (!unit) throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Unit was not found after update.");
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.unit.update",
      targetType: "BookUnit",
      targetId: unit.id,
      changedFields: Object.keys(normalized),
    });
      return unit;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function archiveUnit(
  input: { actor: CurriculumActor; bookId: string; unitId: string },
) {
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.unit.archive",
    targetType: "BookUnit",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    await validateUnitBelongsToBook({ actor: input.actor, bookId: input.bookId, unitId: input.unitId }, loaders);
    const archived = await tx.bookUnit.update({ where: { id: input.unitId }, data: { archived: true } });
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.unit.archive",
      targetType: "BookUnit",
      targetId: archived.id,
      changedFields: ["archived"],
      fromStatus: "ACTIVE",
      toStatus: "ARCHIVED",
    });
      return archived;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function restoreUnit(
  input: { actor: CurriculumActor; bookId: string; unitId: string },
) {
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.unit.restore",
    targetType: "BookUnit",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    const unit = await validateUnitBelongsToBook(
      { actor: input.actor, bookId: input.bookId, unitId: input.unitId, allowArchived: true },
      loaders,
    );
    if (unit.editionId) {
      await validateEditionBelongsToBook({ actor: input.actor, bookId: input.bookId, editionId: unit.editionId }, loaders);
    }
    const restored = await tx.bookUnit.update({ where: { id: input.unitId }, data: { archived: false } });
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.unit.restore",
      targetType: "BookUnit",
      targetId: restored.id,
      changedFields: ["archived"],
      fromStatus: "ARCHIVED",
      toStatus: "ACTIVE",
    });
      return restored;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}
