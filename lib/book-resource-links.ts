import "server-only";

import {
  BookContentTargetType,
  Prisma,
  ResourceAudience,
  SecurityAuditOutcome,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { publisherAdminAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";

export class BookResourceLinkError extends Error {}

type TargetIds = {
  partId?: string | null;
  unitId?: string | null;
  chapterId?: string | null;
  moduleId?: string | null;
  topicId?: string | null;
};

function targetId(type: BookContentTargetType, ids: TargetIds) {
  if (type === "BOOK") return null;
  if (type === "PART") return ids.partId || null;
  if (type === "UNIT") return ids.unitId || null;
  if (type === "CHAPTER") return ids.chapterId || null;
  if (type === "MODULE") return ids.moduleId || null;
  return ids.topicId || null;
}

async function requireTarget(
  tx: Prisma.TransactionClient,
  bookId: string,
  type: BookContentTargetType,
  ids: TargetIds,
) {
  const id = targetId(type, ids);
  if (type === "BOOK") return;
  if (!id) throw new BookResourceLinkError("Select a valid content target.");
  const found =
    type === "PART" ? await tx.bookPart.findFirst({ where: { id, bookId } })
      : type === "UNIT" ? await tx.bookUnit.findFirst({ where: { id, bookId } })
        : type === "CHAPTER" ? await tx.bookChapter.findFirst({ where: { id, bookId } })
          : type === "MODULE" ? await tx.bookModule.findFirst({ where: { id, bookId } })
            : await tx.bookTopic.findFirst({ where: { id, bookId } });
  if (!found) throw new BookResourceLinkError("The selected target does not belong to this book.");
}

export async function attachResourceToBookContent(input: {
  bookId: string;
  resourceId: string;
  targetType: BookContentTargetType;
  ids: TargetIds;
  audienceOverride?: ResourceAudience | null;
  qrEligible?: boolean;
}) {
  const actor = await requireLivePublisherAdmin();
  return prisma.$transaction(async (tx) => {
    const [book, resource] = await Promise.all([
      tx.book.findFirst({
        where: { id: input.bookId, publisherId: actor.publisherId, archived: false },
        select: { id: true },
      }),
      tx.resource.findFirst({
        where: { id: input.resourceId, publisherId: actor.publisherId, archived: false },
        select: { id: true },
      }),
    ]);
    if (!book || !resource) throw new BookResourceLinkError("Book or resource not found.");
    await requireTarget(tx, input.bookId, input.targetType, input.ids);
    const id = targetId(input.targetType, input.ids);
    const targetKey = `${input.targetType}:${id ?? input.bookId}`;
    const link = await tx.bookResourceLink.upsert({
      where: {
        resourceId_targetKey: {
          resourceId: input.resourceId,
          targetKey,
        },
      },
      create: {
        publisherId: actor.publisherId,
        bookId: input.bookId,
        resourceId: input.resourceId,
        targetType: input.targetType,
        targetKey,
        partId: input.targetType === "PART" ? id : null,
        unitId: input.targetType === "UNIT" ? id : null,
        chapterId: input.targetType === "CHAPTER" ? id : null,
        moduleId: input.targetType === "MODULE" ? id : null,
        topicId: input.targetType === "TOPIC" ? id : null,
        audienceOverride: input.audienceOverride ?? null,
        qrEligible: Boolean(input.qrEligible),
        displayOrder: await tx.bookResourceLink.count({
          where: { bookId: input.bookId, targetKey, active: true },
        }),
      },
      update: {
        active: true,
        audienceOverride: input.audienceOverride ?? null,
        qrEligible: Boolean(input.qrEligible),
      },
    });
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book_resource.attach",
      targetType: "BookResourceLink",
      targetId: link.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: ["resourceId", "targetType", "audienceOverride", "qrEligible", "active"] },
    });
    return link;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function detachResourceFromBookContent(bookId: string, linkId: string) {
  const actor = await requireLivePublisherAdmin();
  return prisma.$transaction(async (tx) => {
    const link = await tx.bookResourceLink.findFirst({
      where: {
        id: linkId,
        bookId,
        publisherId: actor.publisherId,
        book: { publisherId: actor.publisherId },
      },
      select: { id: true },
    });
    if (!link) throw new BookResourceLinkError("Resource link not found.");
    await tx.bookResourceLink.update({ where: { id: link.id }, data: { active: false } });
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book_resource.detach",
      targetType: "BookResourceLink",
      targetId: link.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: ["active"] },
    });
  });
}

export async function moveBookResourceLink(bookId: string, linkId: string, direction: -1 | 1) {
  const actor = await requireLivePublisherAdmin();
  return prisma.$transaction(async (tx) => {
    const link = await tx.bookResourceLink.findFirst({
      where: { id: linkId, bookId, publisherId: actor.publisherId, active: true },
    });
    if (!link) throw new BookResourceLinkError("Resource link not found.");
    const siblings = await tx.bookResourceLink.findMany({
      where: { bookId, targetKey: link.targetKey, active: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, displayOrder: true },
    });
    const index = siblings.findIndex((item) => item.id === link.id);
    const sibling = siblings[index + direction];
    if (sibling) {
      await tx.bookResourceLink.update({ where: { id: sibling.id }, data: { displayOrder: link.displayOrder } });
      await tx.bookResourceLink.update({ where: { id: link.id }, data: { displayOrder: sibling.displayOrder } });
    }
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book_resource.reorder",
      targetType: "BookResourceLink",
      targetId: link.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: ["displayOrder"] },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
