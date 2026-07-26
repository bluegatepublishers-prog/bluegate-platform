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
  validateModuleBelongsToChapter,
  validateTopicBelongsToModule,
} from "@/lib/curriculum/validation.service";

export type TopicWriteInput = {
  chapterId?: string;
  moduleId?: string;
  code?: string | null;
  title?: string;
  number?: string | null;
  explanation?: Prisma.InputJsonValue | null;
  examples?: Prisma.InputJsonValue | null;
  summary?: Prisma.InputJsonValue | null;
  keywords?: string[];
  published?: boolean;
  archived?: boolean;
  displayOrder?: number;
};

function normalizeTopicWriteInput(input: TopicWriteInput) {
  return {
    ...(input.chapterId !== undefined ? { chapterId: input.chapterId } : {}),
    ...(input.moduleId !== undefined ? { moduleId: input.moduleId } : {}),
    ...(input.code !== undefined ? { code: normalizeCurriculumCode(input.code) } : {}),
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.number !== undefined ? { number: input.number?.trim() || null } : {}),
    ...(input.explanation !== undefined ? { explanation: input.explanation ?? Prisma.JsonNull } : {}),
    ...(input.examples !== undefined ? { examples: input.examples ?? Prisma.JsonNull } : {}),
    ...(input.summary !== undefined ? { summary: input.summary ?? Prisma.JsonNull } : {}),
    ...(input.keywords !== undefined
      ? { keywords: input.keywords.map((value) => value.trim()).filter((value) => value.length > 0) }
      : {}),
    ...(input.published !== undefined ? { published: input.published } : {}),
    ...(input.archived !== undefined ? { archived: input.archived } : {}),
    ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
  };
}

async function assertTopicCodeAvailable(
  tx: Prisma.TransactionClient,
  input: { moduleId: string; code: string | null | undefined; currentId?: string },
) {
  if (!input.code) return;
  const conflict = await tx.bookTopic.findFirst({
    where: {
      moduleId: input.moduleId,
      code: input.code,
      ...(input.currentId ? { NOT: { id: input.currentId } } : {}),
    },
    select: { id: true },
  });
  if (conflict) {
    throw new CurriculumValidationError("DUPLICATE_CODE", "Topic code already exists in this module.");
  }
}

export async function createTopic(
  input: {
    actor: CurriculumActor;
    bookId: string;
    data: Required<Pick<TopicWriteInput, "chapterId" | "moduleId" | "title">> & TopicWriteInput;
  },
) {
  const normalized = normalizeTopicWriteInput(input.data);
  if (!normalized.chapterId || !normalized.moduleId) {
    throw new CurriculumValidationError("INVALID_INPUT", "Topic chapterId and moduleId are required.");
  }
  if (!normalized.title) {
    throw new CurriculumValidationError("INVALID_INPUT", "Topic title is required.");
  }
  const chapterId = normalized.chapterId;
  const moduleId = normalized.moduleId;
  const title = normalized.title;
  if (normalized.published === true && normalized.archived === true) {
    throw new CurriculumValidationError("INVALID_STATE", "Archived topics cannot be published.");
  }
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.topic.create",
    targetType: "BookTopic",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    await validateBookOwnership(
      { actor: input.actor, bookId: input.bookId, requirePublished: normalized.published === true },
      loaders,
    );
    await validateModuleBelongsToChapter(
      {
        actor: input.actor,
        bookId: input.bookId,
        chapterId,
        moduleId,
        requirePublished: normalized.published === true,
      },
      loaders,
    );
    await assertTopicCodeAvailable(tx, {
      moduleId,
      code: normalized.code,
    });
    const created = await tx.bookTopic.create({
      data: {
        bookId: input.bookId,
        chapterId,
        moduleId,
        code: normalized.code ?? null,
        title,
        number: normalized.number ?? null,
        explanation: normalized.explanation ?? Prisma.JsonNull,
        examples: normalized.examples ?? Prisma.JsonNull,
        summary: normalized.summary ?? Prisma.JsonNull,
        keywords: normalized.keywords ?? [],
        published: normalized.published ?? false,
        archived: normalized.archived ?? false,
        displayOrder: normalized.displayOrder ?? 0,
      },
    });
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.topic.create",
      targetType: "BookTopic",
      targetId: created.id,
      changedFields: ["chapterId", "moduleId", "title", "code", "keywords", "published", "archived", "displayOrder"],
    });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function updateTopic(
  input: { actor: CurriculumActor; bookId: string; topicId: string; data: TopicWriteInput },
) {
  const normalized = normalizeTopicWriteInput(input.data);
  if (normalized.title !== undefined && !normalized.title) {
    throw new CurriculumValidationError("INVALID_INPUT", "Topic title is required.");
  }
  if (normalized.published === true && normalized.archived === true) {
    throw new CurriculumValidationError("INVALID_STATE", "Archived topics cannot be published.");
  }
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.topic.update",
    targetType: "BookTopic",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    const existing = await tx.bookTopic.findFirst({
      where: { id: input.topicId, bookId: input.bookId },
      select: { chapterId: true, moduleId: true },
    });
    if (!existing) throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Topic was not found for update.");
    const targetModuleId = normalized.moduleId ?? existing.moduleId;
    if (!targetModuleId) {
      throw new CurriculumValidationError(
        "INVALID_PARENT_CHAIN",
        "This curriculum service requires a topic lesson group.",
      );
    }
    await validateTopicBelongsToModule(
      {
        actor: input.actor,
        bookId: input.bookId,
        chapterId: normalized.chapterId ?? existing.chapterId,
        moduleId: targetModuleId,
        topicId: input.topicId,
        requirePublished: normalized.published === true,
      },
      loaders,
    );
    await assertTopicCodeAvailable(tx, {
      moduleId: targetModuleId,
      code: normalized.code,
      currentId: input.topicId,
    });
    const updated = await tx.bookTopic.updateMany({
      where: { id: input.topicId, bookId: input.bookId },
      data: normalized,
    });
    if (updated.count !== 1) throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Topic was not found for update.");
    const topic = await tx.bookTopic.findFirst({ where: { id: input.topicId, bookId: input.bookId } });
    if (!topic) throw new CurriculumValidationError("ENTITY_NOT_FOUND", "Topic was not found after update.");
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.topic.update",
      targetType: "BookTopic",
      targetId: topic.id,
      changedFields: Object.keys(normalized),
    });
      return topic;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function archiveTopic(
  input: { actor: CurriculumActor; bookId: string; chapterId: string; moduleId: string; topicId: string },
) {
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.topic.archive",
    targetType: "BookTopic",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    await validateTopicBelongsToModule(input, loaders);
    const archived = await tx.bookTopic.update({ where: { id: input.topicId }, data: { archived: true } });
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.topic.archive",
      targetType: "BookTopic",
      targetId: archived.id,
      changedFields: ["archived"],
      fromStatus: "ACTIVE",
      toStatus: "ARCHIVED",
    });
      return archived;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}

export async function restoreTopic(
  input: { actor: CurriculumActor; bookId: string; chapterId: string; moduleId: string; topicId: string },
) {
  return runCurriculumMutationWithDeniedAudit({
    actor: input.actor,
    action: "publisher.curriculum.topic.restore",
    targetType: "BookTopic",
    operation: () => prisma.$transaction(async (tx) => {
    const loaders = createCurriculumValidationLoaders(tx);
    await validateTopicBelongsToModule({ ...input, allowArchived: true }, loaders);
    const restored = await tx.bookTopic.update({ where: { id: input.topicId }, data: { archived: false } });
    await writeCurriculumAuditEvent(tx, {
      actor: input.actor,
      action: "publisher.curriculum.topic.restore",
      targetType: "BookTopic",
      targetId: restored.id,
      changedFields: ["archived"],
      fromStatus: "ARCHIVED",
      toStatus: "ACTIVE",
    });
      return restored;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  });
}
