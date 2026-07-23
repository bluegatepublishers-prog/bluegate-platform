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
} from "@/lib/curriculum/validation.service";

export type EditionWriteInput = {
  title?: string;
  code?: string | null;
  description?: string | null;
  academicYear?: string | null;
  versionNumber?: number;
  isDefault?: boolean;
  published?: boolean;
  archived?: boolean;
  displayOrder?: number;
};

function normalizeEditionWriteInput(input: EditionWriteInput) {
  return {
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.code !== undefined ? { code: normalizeCurriculumCode(input.code) } : {}),
    ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
    ...(input.academicYear !== undefined ? { academicYear: input.academicYear?.trim() || null } : {}),
    ...(input.versionNumber !== undefined ? { versionNumber: input.versionNumber } : {}),
    ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    ...(input.published !== undefined ? { published: input.published } : {}),
    ...(input.archived !== undefined ? { archived: input.archived } : {}),
    ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
  };
}

async function assertEditionCodeAvailable(
  tx: Prisma.TransactionClient,
  input: { bookId: string; code: string | null | undefined; currentId?: string },
) {
  if (!input.code) return;
  const conflict = await tx.bookEdition.findFirst({
    where: {
      bookId: input.bookId,
      code: input.code,
      ...(input.currentId ? { NOT: { id: input.currentId } } : {}),
    },
    select: { id: true },
  });
  if (conflict) {
    throw new CurriculumValidationError("DUPLICATE_CODE", "Edition code already exists in this book.");
  }
}

export async function createEdition(
  input: { actor: CurriculumActor; bookId: string; data: Required<Pick<EditionWriteInput, "title">> & EditionWriteInput },
) {
  const normalized = normalizeEditionWriteInput(input.data);
  if (!normalized.title) {
    throw new CurriculumValidationError("INVALID_INPUT", "Edition title is required.");
  }
  if (normalized.published === true && normalized.archived === true) {
    throw new CurriculumValidationError("INVALID_STATE", "Archived editions cannot be published.");
  }
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.edition.create",
    targetType: "BookEdition",
    operation: () => prisma.$transaction(async (tx) => {
      const loaders = createCurriculumValidationLoaders(tx);
      await validateBookOwnership(
        {
          actor: input.actor,
          bookId: input.bookId,
          requirePublished: normalized.published === true,
        },
        loaders,
      );
      await assertEditionCodeAvailable(tx, { bookId: input.bookId, code: normalized.code });
      const created = await tx.bookEdition.create({
        data: {
          bookId: input.bookId,
          title: normalized.title ?? "",
          code: normalized.code ?? null,
          description: normalized.description ?? null,
          academicYear: normalized.academicYear ?? null,
          versionNumber: normalized.versionNumber ?? 1,
          isDefault: normalized.isDefault ?? false,
          published: normalized.published ?? false,
          archived: normalized.archived ?? false,
          displayOrder: normalized.displayOrder ?? 0,
        },
      });
      await writeCurriculumAuditEvent(tx, {
        actor: input.actor,
        action: "publisher.curriculum.edition.create",
        targetType: "BookEdition",
        targetId: created.id,
        changedFields: ["title", "code", "published", "archived", "displayOrder"],
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function updateEdition(
  input: { actor: CurriculumActor; bookId: string; editionId: string; data: EditionWriteInput },
) {
  const normalized = normalizeEditionWriteInput(input.data);
  if (normalized.title !== undefined && !normalized.title) {
    throw new CurriculumValidationError("INVALID_INPUT", "Edition title is required.");
  }
  if (normalized.published === true && normalized.archived === true) {
    throw new CurriculumValidationError("INVALID_STATE", "Archived editions cannot be published.");
  }
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.edition.update",
    targetType: "BookEdition",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    await validateEditionBelongsToBook(
      {
        actor: input.actor,
        bookId: input.bookId,
        editionId: input.editionId,
        requirePublished: normalized.published === true,
      },
      loaders,
    );
    await assertEditionCodeAvailable(tx, {
      bookId: input.bookId,
      code: normalized.code,
      currentId: input.editionId,
    });
    const updated = await tx.bookEdition.updateMany({
      where: { id: input.editionId, bookId: input.bookId },
      data: normalized,
    });
    if (updated.count !== 1) {
      throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Edition was not found for update.");
    }
    const edition = await tx.bookEdition.findFirst({ where: { id: input.editionId, bookId: input.bookId } });
    if (!edition) throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Edition was not found after update.");
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.edition.update",
      targetType: "BookEdition",
      targetId: edition.id,
      changedFields: Object.keys(normalized),
    });
      return edition;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function archiveEdition(
  input: { actor: CurriculumActor; bookId: string; editionId: string },
) {
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.edition.archive",
    targetType: "BookEdition",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    await validateEditionBelongsToBook(
      { actor: input.actor, bookId: input.bookId, editionId: input.editionId },
      loaders,
    );
    const archived = await tx.bookEdition.update({
      where: { id: input.editionId },
      data: { archived: true },
    });
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.edition.archive",
      targetType: "BookEdition",
      targetId: archived.id,
      changedFields: ["archived"],
      fromStatus: "ACTIVE",
      toStatus: "ARCHIVED",
    });
      return archived;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function restoreEdition(
  input: { actor: CurriculumActor; bookId: string; editionId: string },
) {
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.edition.restore",
    targetType: "BookEdition",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    await validateEditionBelongsToBook(
      { actor: input.actor, bookId: input.bookId, editionId: input.editionId, allowArchived: true },
      loaders,
    );
    const restored = await tx.bookEdition.update({
      where: { id: input.editionId },
      data: { archived: false },
    });
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.edition.restore",
      targetType: "BookEdition",
      targetId: restored.id,
      changedFields: ["archived"],
      fromStatus: "ARCHIVED",
      toStatus: "ACTIVE",
    });
      return restored;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}
