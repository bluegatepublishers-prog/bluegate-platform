import "server-only";

import {
  BookPartKind,
  Prisma,
  SecurityAuditOutcome,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import {
  publisherAdminAuditActor,
  writeSecurityAuditEvent,
} from "@/lib/security-audit";
import type {
  SecurityAuditAction,
  SecurityAuditTargetType,
} from "@/lib/security-audit-policy";

export type BookStructureNodeType = "PART" | "UNIT" | "CHAPTER" | "MODULE" | "TOPIC";

export type BookStructureWriteInput = {
  type: BookStructureNodeType;
  id?: string;
  parentId?: string | null;
  secondaryParentId?: string | null;
  title: string;
  subtitle?: string | null;
  shortTitle?: string | null;
  code?: string | null;
  slug?: string | null;
  label?: string | null;
  description?: string | null;
  content?: Prisma.InputJsonValue | null;
  estimatedMinutes?: number | null;
  pageStart?: number | null;
  pageEnd?: number | null;
  imageUrl?: string | null;
  published?: boolean;
  partKind?: BookPartKind;
};

export class BookStructureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookStructureError";
  }
}

function clean(value: string | null | undefined, max = 300) {
  return value?.trim().replace(/\s+/g, " ").slice(0, max) || null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 180);
}

async function actorAndBook(bookId: string) {
  const actor = await requireLivePublisherAdmin();
  const book = await prisma.book.findFirst({
    where: { id: bookId, publisherId: actor.publisherId },
    select: { id: true },
  });
  if (!book) throw new BookStructureError("Book not found.");
  return { actor, book };
}

function auditDescriptor(type: BookStructureNodeType, create: boolean): {
  action: SecurityAuditAction;
  targetType: SecurityAuditTargetType;
} {
  if (type === "PART") {
    return {
      action: create ? "publisher.book_part.create" : "publisher.book_part.update",
      targetType: "BookPart",
    };
  }
  if (type === "UNIT") {
    return {
      action: create ? "publisher.curriculum.unit.create" : "publisher.curriculum.unit.update",
      targetType: "BookUnit",
    };
  }
  if (type === "CHAPTER") {
    return {
      action: create ? "publisher.curriculum.chapter.create" : "publisher.curriculum.chapter.update",
      targetType: "BookChapter",
    };
  }
  if (type === "MODULE") {
    return {
      action: create ? "publisher.curriculum.module.create" : "publisher.curriculum.module.update",
      targetType: "BookModule",
    };
  }
  return {
    action: create ? "publisher.curriculum.topic.create" : "publisher.curriculum.topic.update",
    targetType: "BookTopic",
  };
}

async function validateParentChain(
  tx: Prisma.TransactionClient,
  bookId: string,
  input: BookStructureWriteInput,
) {
  if (input.type === "PART") return;
  if (input.type === "UNIT" && input.parentId) {
    const part = await tx.bookPart.findFirst({
      where: { id: input.parentId, bookId, archived: false },
      select: { id: true },
    });
    if (!part) throw new BookStructureError("The selected part or module is unavailable.");
  }
  if (input.type === "CHAPTER") {
    if (input.parentId) {
      const unit = await tx.bookUnit.findFirst({
        where: { id: input.parentId, bookId, archived: false },
        select: { id: true, partId: true },
      });
      if (!unit) throw new BookStructureError("The selected unit is unavailable.");
      if (input.secondaryParentId && unit.partId !== input.secondaryParentId) {
        throw new BookStructureError("The selected unit does not belong to that part.");
      }
    } else if (input.secondaryParentId) {
      const part = await tx.bookPart.findFirst({
        where: { id: input.secondaryParentId, bookId, archived: false },
        select: { id: true },
      });
      if (!part) throw new BookStructureError("The selected part is unavailable.");
    }
  }
  if (input.type === "MODULE") {
    const chapter = input.parentId
      ? await tx.bookChapter.findFirst({
          where: { id: input.parentId, bookId, archived: false },
          select: { id: true, unitId: true },
        })
      : null;
    if (!chapter) throw new BookStructureError("A valid chapter is required.");
  }
  if (input.type === "TOPIC") {
    const chapter = input.parentId
      ? await tx.bookChapter.findFirst({
          where: { id: input.parentId, bookId, archived: false },
          select: { id: true },
        })
      : null;
    if (!chapter) throw new BookStructureError("A valid chapter is required.");
    if (input.secondaryParentId) {
      const moduleNode = await tx.bookModule.findFirst({
        where: {
          id: input.secondaryParentId,
          bookId,
          chapterId: chapter.id,
          archived: false,
        },
        select: { id: true },
      });
      if (!moduleNode) throw new BookStructureError("The selected lesson group is unavailable.");
    }
  }
}

export async function saveBookStructureNode(bookId: string, input: BookStructureWriteInput) {
  const { actor } = await actorAndBook(bookId);
  const title = clean(input.title, 200);
  if (!title) throw new BookStructureError("Title is required.");
  if (input.pageStart && input.pageEnd && input.pageEnd < input.pageStart) {
    throw new BookStructureError("End page must not be before start page.");
  }

  return prisma.$transaction(async (tx) => {
    await validateParentChain(tx, bookId, input);
    const now = new Date();
    const common = {
      title,
      subtitle: clean(input.subtitle, 240),
      shortTitle: clean(input.shortTitle, 100),
    };
    let result: { id: string };
    const isCreate = !input.id;

    if (input.type === "PART") {
      const data = {
        ...common,
        kind: input.partKind ?? BookPartKind.MODULE,
        code: clean(input.code, 80),
        slug: slugify(input.slug || title),
        description: clean(input.description, 2000),
        content: input.content ?? Prisma.JsonNull,
        estimatedMinutes: input.estimatedMinutes ?? null,
        imageUrl: clean(input.imageUrl, 1000),
        published: Boolean(input.published),
        publishedAt: input.published ? now : null,
      };
      result = input.id
        ? await tx.bookPart.update({
            where: { id: input.id, bookId },
            data,
            select: { id: true },
          })
        : await tx.bookPart.create({
            data: {
              ...data,
              bookId,
              displayOrder: await tx.bookPart.count({ where: { bookId } }),
            },
            select: { id: true },
          });
    } else if (input.type === "UNIT") {
      const data = {
        ...common,
        partId: input.parentId || null,
        code: clean(input.code, 80),
        slug: slugify(input.slug || title),
        number: clean(input.label, 80),
        description: clean(input.description, 2000),
        content: input.content ?? Prisma.JsonNull,
        estimatedMinutes: input.estimatedMinutes ?? null,
        imageUrl: clean(input.imageUrl, 1000),
        published: Boolean(input.published),
        publishedAt: input.published ? now : null,
      };
      result = input.id
        ? await tx.bookUnit.update({
            where: { id: input.id, bookId },
            data,
            select: { id: true },
          })
        : await tx.bookUnit.create({
            data: {
              ...data,
              bookId,
              displayOrder: await tx.bookUnit.count({ where: { bookId, partId: input.parentId || null } }),
            },
            select: { id: true },
          });
    } else if (input.type === "CHAPTER") {
      const chapterNumber = Number(input.label);
      const number = Number.isInteger(chapterNumber) && chapterNumber > 0
        ? chapterNumber
        : (await tx.bookChapter.aggregate({
            where: { bookId },
            _max: { chapterNumber: true },
          }))._max.chapterNumber! + 1 || 1;
      const data = {
        ...common,
        partId: input.secondaryParentId || null,
        unitId: input.parentId || null,
        chapterNumber: number,
        slug: slugify(input.slug || title),
        description: clean(input.description, 2000),
        content: input.content ?? Prisma.JsonNull,
        estimatedMinutes: input.estimatedMinutes ?? null,
        thumbnail: clean(input.imageUrl, 1000),
        startPage: input.pageStart ?? null,
        endPage: input.pageEnd ?? null,
        published: Boolean(input.published),
        publishedAt: input.published ? now : null,
      };
      result = input.id
        ? await tx.bookChapter.update({
            where: { id: input.id, bookId },
            data,
            select: { id: true },
          })
        : await tx.bookChapter.create({
            data: {
              ...data,
              bookId,
              approved: false,
              sortOrder: await tx.bookChapter.count({
                where: { bookId, unitId: input.parentId || null, partId: input.secondaryParentId || null },
              }),
            },
            select: { id: true },
          });
    } else if (input.type === "MODULE") {
      const chapter = await tx.bookChapter.findFirstOrThrow({
        where: { id: input.parentId!, bookId },
        select: { unitId: true },
      });
      const data = {
        ...common,
        chapterId: input.parentId!,
        unitId: chapter.unitId,
        code: clean(input.code, 80),
        slug: slugify(input.slug || title),
        number: clean(input.label, 80),
        description: clean(input.description, 2000),
        content: input.content ?? Prisma.JsonNull,
        estimatedMinutes: input.estimatedMinutes ?? null,
        imageUrl: clean(input.imageUrl, 1000),
        published: Boolean(input.published),
        publishedAt: input.published ? now : null,
      };
      result = input.id
        ? await tx.bookModule.update({
            where: { id: input.id, bookId },
            data,
            select: { id: true },
          })
        : await tx.bookModule.create({
            data: {
              ...data,
              bookId,
              displayOrder: await tx.bookModule.count({ where: { chapterId: input.parentId! } }),
            },
            select: { id: true },
          });
    } else {
      const data = {
        ...common,
        chapterId: input.parentId!,
        moduleId: input.secondaryParentId || null,
        code: clean(input.code, 80),
        slug: slugify(input.slug || title),
        number: clean(input.label, 80),
        description: clean(input.description, 2000),
        content: input.content ?? Prisma.JsonNull,
        estimatedMinutes: input.estimatedMinutes ?? null,
        imageUrl: clean(input.imageUrl, 1000),
        published: Boolean(input.published),
        publishedAt: input.published ? now : null,
      };
      result = input.id
        ? await tx.bookTopic.update({
            where: { id: input.id, bookId },
            data,
            select: { id: true },
          })
        : await tx.bookTopic.create({
            data: {
              ...data,
              bookId,
              displayOrder: await tx.bookTopic.count({
                where: {
                  chapterId: input.parentId!,
                  moduleId: input.secondaryParentId || null,
                },
              }),
            },
            select: { id: true },
          });
    }

    const descriptor = auditDescriptor(input.type, isCreate);
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: descriptor.action,
      targetType: descriptor.targetType,
      targetId: result.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: {
        changedFields: [
          "title",
          "parent",
          "content",
          "publicationState",
          "displayOrder",
        ],
      },
    });
    return result;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function nodeRecord(
  tx: Prisma.TransactionClient,
  bookId: string,
  type: BookStructureNodeType,
  id: string,
) {
  if (type === "PART") return tx.bookPart.findFirst({ where: { id, bookId } });
  if (type === "UNIT") return tx.bookUnit.findFirst({ where: { id, bookId } });
  if (type === "CHAPTER") return tx.bookChapter.findFirst({ where: { id, bookId } });
  if (type === "MODULE") return tx.bookModule.findFirst({ where: { id, bookId } });
  return tx.bookTopic.findFirst({ where: { id, bookId } });
}

export async function renameBookStructureNode(
  bookId: string,
  type: BookStructureNodeType,
  id: string,
  title: string,
) {
  const { actor } = await actorAndBook(bookId);
  const cleanTitle = clean(title, 200);
  if (!cleanTitle) throw new BookStructureError("Title is required.");
  return prisma.$transaction(async (tx) => {
    const existing = await nodeRecord(tx, bookId, type, id);
    if (!existing) throw new BookStructureError("Structure item not found.");
    if (type === "PART") await tx.bookPart.update({ where: { id }, data: { title: cleanTitle } });
    else if (type === "UNIT") await tx.bookUnit.update({ where: { id }, data: { title: cleanTitle } });
    else if (type === "CHAPTER") await tx.bookChapter.update({ where: { id }, data: { title: cleanTitle } });
    else if (type === "MODULE") await tx.bookModule.update({ where: { id }, data: { title: cleanTitle } });
    else await tx.bookTopic.update({ where: { id }, data: { title: cleanTitle } });
    const descriptor = auditDescriptor(type, false);
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: descriptor.action,
      targetType: descriptor.targetType,
      targetId: id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: ["title"] },
    });
    return { id, title: cleanTitle };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function deleteBookStructureNode(
  bookId: string,
  type: BookStructureNodeType,
  id: string,
  confirmationTitle: string,
) {
  const { actor } = await actorAndBook(bookId);
  return prisma.$transaction(async (tx) => {
    const existing = await nodeRecord(tx, bookId, type, id);
    if (!existing) throw new BookStructureError("Structure item not found.");
    if (existing.title !== confirmationTitle.trim()) {
      throw new BookStructureError("The final confirmation did not match the node title.");
    }
    if (type === "MODULE") {
      const legacyTopics =
        await tx.bookTopic.findMany({
          where: {
            bookId,
            moduleId: id,
          },
          select: {
            id: true,
            title: true,
          },
        });

      for (const topic of legacyTopics) {
        const topicDependencies =
          await structureDependencies(
            tx,
            bookId,
            "TOPIC",
            topic.id,
          );

        if (topicDependencies.length) {
          throw new BookStructureError(
            `This module contains legacy topic "${topic.title}" with ${topicDependencies.join(
              ", ",
            )}. Remove or move those linked items before deleting the module.`,
          );
        }
      }

      if (legacyTopics.length) {
        await tx.bookTopic.deleteMany({
          where: {
            bookId,
            moduleId: id,
          },
        });
      }
    }

    const dependencies =
      await structureDependencies(
        tx,
        bookId,
        type,
        id,
      );

    if (dependencies.length) {
      throw new BookStructureError(
        `This item cannot be permanently deleted because it has ${dependencies.join(
          ", ",
        )}.`,
      );
    }

    if (type === "PART") await tx.bookPart.delete({ where: { id } });
    else if (type === "UNIT") await tx.bookUnit.delete({ where: { id } });
    else if (type === "CHAPTER") await tx.bookChapter.delete({ where: { id } });
    else if (type === "MODULE") await tx.bookModule.delete({ where: { id } });
    else await tx.bookTopic.delete({ where: { id } });
    const descriptor = auditDescriptor(type, false);
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: type === "PART" ? "publisher.book_part.delete" : `publisher.curriculum.${type.toLowerCase()}.delete` as never,
      targetType: descriptor.targetType,
      targetId: id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: ["deleted"] },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function structureDependencies(
  tx: Prisma.TransactionClient,
  bookId: string,
  type: BookStructureNodeType,
  id: string,
) {
  const dependencyCount = async (label: string, count: Promise<number>) => (await count) > 0 ? label : null;
  const checks: Promise<string | null>[] = [];
  if (type === "PART") {
    checks.push(dependencyCount("child units", tx.bookUnit.count({ where: { bookId, partId: id } })));
    checks.push(dependencyCount("child chapters", tx.bookChapter.count({ where: { bookId, partId: id } })));
    checks.push(dependencyCount("linked resources", tx.bookResourceLink.count({ where: { bookId, partId: id, active: true } })));
    checks.push(dependencyCount("QR destinations", tx.dynamicQrCode.count({ where: { bookId, partId: id } })));
    checks.push(dependencyCount("published releases", tx.contentRelease.count({ where: { bookId, targetId: id, lifecycle: "PUBLISHED" } })));
  } else if (type === "UNIT") {
    checks.push(dependencyCount("child chapters", tx.bookChapter.count({ where: { bookId, unitId: id } })));
    checks.push(dependencyCount("child modules", tx.bookModule.count({ where: { bookId, unitId: id } })));
    checks.push(dependencyCount("linked resources", tx.bookResourceLink.count({ where: { bookId, unitId: id, active: true } })));
    checks.push(dependencyCount("QR destinations", tx.dynamicQrCode.count({ where: { bookId, unitId: id } })));
    checks.push(dependencyCount("published releases", tx.contentRelease.count({ where: { bookId, targetId: id, lifecycle: "PUBLISHED" } })));
  } else if (type === "CHAPTER") {
    checks.push(dependencyCount("modules", tx.bookModule.count({ where: { bookId, chapterId: id } })));
    checks.push(dependencyCount("topics", tx.bookTopic.count({ where: { bookId, chapterId: id } })));
    checks.push(dependencyCount("activities", tx.chapterActivity.count({ where: { chapterId: id } })));
    checks.push(dependencyCount("worksheets", tx.publisherWorksheet.count({ where: { bookId, chapterId: id } })));
    checks.push(dependencyCount("exercises", tx.bookExercise.count({ where: { bookId, chapterId: id } })));
    checks.push(dependencyCount("questions", tx.bookQuestion.count({ where: { bookId, chapterId: id } })));
    checks.push(dependencyCount("student attempts", tx.studentPracticeAttempt.count({ where: { bookId, chapterId: id } })));
    checks.push(dependencyCount("linked resources", tx.bookResourceLink.count({ where: { bookId, chapterId: id, active: true } })));
    checks.push(dependencyCount("QR destinations", tx.dynamicQrCode.count({ where: { bookId, chapterId: id } })));
    checks.push(dependencyCount("published releases", tx.contentRelease.count({ where: { bookId, targetType: "CHAPTER", targetId: id, lifecycle: "PUBLISHED" } })));
  } else if (type === "MODULE") {
    checks.push(dependencyCount("topics", tx.bookTopic.count({ where: { bookId, moduleId: id } })));
    checks.push(dependencyCount("activities", tx.chapterActivity.count({ where: { moduleId: id } })));
    checks.push(dependencyCount("worksheets", tx.publisherWorksheet.count({ where: { bookId, moduleId: id } })));
    checks.push(dependencyCount("exercises", tx.bookExercise.count({ where: { bookId, moduleId: id } })));
    checks.push(dependencyCount("questions", tx.bookQuestion.count({ where: { bookId, moduleId: id } })));
    checks.push(dependencyCount("linked resources", tx.bookResourceLink.count({ where: { bookId, moduleId: id, active: true } })));
    checks.push(dependencyCount("QR destinations", tx.dynamicQrCode.count({ where: { bookId, moduleId: id } })));
    checks.push(dependencyCount("published releases", tx.contentRelease.count({ where: { bookId, targetType: "MODULE", targetId: id, lifecycle: "PUBLISHED" } })));
  } else {
    checks.push(dependencyCount("activities", tx.chapterActivity.count({ where: { topicId: id } })));
    checks.push(dependencyCount("worksheets", tx.publisherWorksheet.count({ where: { bookId, topicId: id } })));
    checks.push(dependencyCount("exercises", tx.bookExercise.count({ where: { bookId, topicId: id } })));
    checks.push(dependencyCount("questions", tx.bookQuestion.count({ where: { bookId, topicId: id } })));
    checks.push(dependencyCount("linked resources", tx.bookResourceLink.count({ where: { bookId, topicId: id, active: true } })));
    checks.push(dependencyCount("QR destinations", tx.dynamicQrCode.count({ where: { bookId, topicId: id } })));
    checks.push(dependencyCount("published releases", tx.contentRelease.count({ where: { bookId, targetType: "TOPIC", targetId: id, lifecycle: "PUBLISHED" } })));
  }
  return (await Promise.all(checks)).filter((item): item is string => Boolean(item));
}

export async function setBookStructureNodeArchived(
  bookId: string,
  type: BookStructureNodeType,
  id: string,
  archived: boolean,
) {
  const { actor } = await actorAndBook(bookId);
  return prisma.$transaction(async (tx) => {
    const existing = await nodeRecord(tx, bookId, type, id);
    if (!existing) throw new BookStructureError("Structure item not found.");
    const now = new Date();
    const data = archived
      ? { archived: true, archivedAt: now, published: false }
      : { archived: false, archivedAt: null };
    if (type === "PART") await tx.bookPart.update({ where: { id }, data });
    else if (type === "UNIT") await tx.bookUnit.update({ where: { id }, data });
    else if (type === "CHAPTER") await tx.bookChapter.update({ where: { id }, data });
    else if (type === "MODULE") await tx.bookModule.update({ where: { id }, data });
    else await tx.bookTopic.update({ where: { id }, data });
    const descriptor = auditDescriptor(type, false);
    const action = type === "PART"
      ? archived ? "publisher.book_part.archive" : "publisher.book_part.restore"
      : type === "UNIT"
        ? archived ? "publisher.curriculum.unit.archive" : "publisher.curriculum.unit.restore"
        : type === "CHAPTER"
          ? archived ? "publisher.curriculum.chapter.archive" : "publisher.curriculum.chapter.restore"
          : type === "MODULE"
            ? archived ? "publisher.curriculum.module.archive" : "publisher.curriculum.module.restore"
            : archived ? "publisher.curriculum.topic.archive" : "publisher.curriculum.topic.restore";
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action,
      targetType: descriptor.targetType,
      targetId: id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: {
        changedFields: ["archived", "publicationState"],
        fromStatus: archived ? "ACTIVE" : "ARCHIVED",
        toStatus: archived ? "ARCHIVED" : "ACTIVE",
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function reorderBookStructureNodes(
  bookId: string,
  type: BookStructureNodeType,
  orderedIds: readonly string[],
) {
  const { actor } = await actorAndBook(bookId);
  const ids = [...new Set(orderedIds)];
  if (!ids.length || ids.length !== orderedIds.length) {
    throw new BookStructureError("A complete unique order is required.");
  }
  return prisma.$transaction(async (tx) => {
    const found = await Promise.all(ids.map((id) => nodeRecord(tx, bookId, type, id)));
    if (found.some((item) => !item)) throw new BookStructureError("A structure item is unavailable.");
    for (const [displayOrder, id] of ids.entries()) {
      if (type === "PART") await tx.bookPart.update({ where: { id }, data: { displayOrder } });
      else if (type === "UNIT") await tx.bookUnit.update({ where: { id }, data: { displayOrder } });
      else if (type === "CHAPTER") await tx.bookChapter.update({ where: { id }, data: { sortOrder: displayOrder } });
      else if (type === "MODULE") await tx.bookModule.update({ where: { id }, data: { displayOrder } });
      else await tx.bookTopic.update({ where: { id }, data: { displayOrder } });
    }
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book_structure.reorder",
      targetType: "Book",
      targetId: bookId,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: ["displayOrder"], dependencyCount: ids.length },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function moveBookStructureNode(
  bookId: string,
  type: Exclude<BookStructureNodeType, "PART">,
  id: string,
  parentId: string | null,
  secondaryParentId?: string | null,
) {
  const { actor } = await actorAndBook(bookId);
  return prisma.$transaction(async (tx) => {
    const existing = await nodeRecord(tx, bookId, type, id);
    if (!existing) throw new BookStructureError("Structure item not found.");
    await validateParentChain(tx, bookId, {
      type,
      title: "Validated move",
      parentId,
      secondaryParentId,
    });
    if (type === "UNIT") {
      await tx.bookUnit.update({ where: { id }, data: { partId: parentId } });
    } else if (type === "CHAPTER") {
      const unit = parentId
        ? await tx.bookUnit.findFirstOrThrow({
            where: { id: parentId, bookId },
            select: { partId: true },
          })
        : null;
      await tx.bookChapter.update({
        where: { id },
        data: {
          unitId: parentId,
          partId: unit?.partId ?? secondaryParentId ?? null,
        },
      });
    } else if (type === "MODULE") {
      const chapter = await tx.bookChapter.findFirstOrThrow({
        where: { id: parentId!, bookId },
        select: { unitId: true },
      });
      await tx.bookModule.update({
        where: { id },
        data: { chapterId: parentId!, unitId: chapter.unitId },
      });
    } else {
      await tx.bookTopic.update({
        where: { id },
        data: { chapterId: parentId!, moduleId: secondaryParentId ?? null },
      });
    }
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book_structure.reorder",
      targetType: auditDescriptor(type, false).targetType,
      targetId: id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: ["parent", "displayOrder"] },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function duplicateBookStructureNode(
  bookId: string,
  type: BookStructureNodeType,
  id: string,
) {
  const { actor } = await actorAndBook(bookId);
  return prisma.$transaction(async (tx) => {
    const existing = await nodeRecord(tx, bookId, type, id);
    if (!existing) throw new BookStructureError("Structure item not found.");
    let created: { id: string };
    if (type === "PART") {
      const item = existing as Prisma.BookPartGetPayload<object>;
      created = await tx.bookPart.create({
        data: {
          bookId,
          editionId: item.editionId,
          kind: item.kind,
          code: null,
          slug: `${item.slug}-copy-${Date.now()}`,
          title: `${item.title} copy`,
          subtitle: item.subtitle,
          shortTitle: item.shortTitle,
          description: item.description,
          content: item.content ?? Prisma.JsonNull,
          estimatedMinutes: item.estimatedMinutes,
          imageUrl: item.imageUrl,
          displayOrder: item.displayOrder + 1,
        },
      });
    } else if (type === "UNIT") {
      const item = existing as Prisma.BookUnitGetPayload<object>;
      created = await tx.bookUnit.create({
        data: {
          bookId,
          editionId: item.editionId,
          partId: item.partId,
          code: null,
          slug: item.slug ? `${item.slug}-copy-${Date.now()}` : null,
          title: `${item.title} copy`,
          subtitle: item.subtitle,
          shortTitle: item.shortTitle,
          number: null,
          description: item.description,
          introduction: item.introduction,
          learningGoals: item.learningGoals ?? Prisma.JsonNull,
          content: item.content ?? Prisma.JsonNull,
          estimatedMinutes: item.estimatedMinutes,
          imageUrl: item.imageUrl,
          displayOrder: item.displayOrder + 1,
        },
      });
    } else if (type === "CHAPTER") {
      const item = existing as Prisma.BookChapterGetPayload<object>;
      const max = await tx.bookChapter.aggregate({ where: { bookId }, _max: { chapterNumber: true } });
      created = await tx.bookChapter.create({
        data: {
          bookId,
          partId: item.partId,
          unitId: item.unitId,
          editionId: item.editionId,
          chapterNumber: (max._max.chapterNumber ?? 0) + 1,
          title: `${item.title} copy`,
          slug: `${item.slug}-copy-${Date.now()}`,
          subtitle: item.subtitle,
          shortTitle: item.shortTitle,
          description: item.description,
          content: item.content ?? Prisma.JsonNull,
          estimatedMinutes: item.estimatedMinutes,
          thumbnail: item.thumbnail,
          startPage: item.startPage,
          endPage: item.endPage,
          sortOrder: item.sortOrder + 1,
        },
      });
    } else if (type === "MODULE") {
      const item = existing as Prisma.BookModuleGetPayload<object>;
      created = await tx.bookModule.create({
        data: {
          bookId,
          chapterId: item.chapterId,
          unitId: item.unitId,
          code: null,
          slug: item.slug ? `${item.slug}-copy-${Date.now()}` : null,
          title: `${item.title} copy`,
          subtitle: item.subtitle,
          shortTitle: item.shortTitle,
          number: null,
          description: item.description,
          content: item.content ?? Prisma.JsonNull,
          estimatedMinutes: item.estimatedMinutes,
          imageUrl: item.imageUrl,
          displayOrder: item.displayOrder + 1,
        },
      });
    } else {
      const item = existing as Prisma.BookTopicGetPayload<object>;
      created = await tx.bookTopic.create({
        data: {
          bookId,
          chapterId: item.chapterId,
          moduleId: item.moduleId,
          code: null,
          slug: item.slug ? `${item.slug}-copy-${Date.now()}` : null,
          title: `${item.title} copy`,
          subtitle: item.subtitle,
          shortTitle: item.shortTitle,
          number: null,
          description: item.description,
          content: item.content ?? Prisma.JsonNull,
          keywords: item.keywords,
          estimatedMinutes: item.estimatedMinutes,
          imageUrl: item.imageUrl,
          displayOrder: item.displayOrder + 1,
        },
      });
    }
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book_structure.duplicate",
      targetType: auditDescriptor(type, true).targetType,
      targetId: created.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: ["duplicatedStructure"] },
    });
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}