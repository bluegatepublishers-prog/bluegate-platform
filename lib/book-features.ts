import "server-only";

import { Prisma, SecurityAuditOutcome } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { publisherAdminAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";

export class BookFeatureError extends Error {}

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function keyFromTitle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "").slice(0, 100);
}

async function ownedBook(
  tx: Prisma.TransactionClient,
  bookId: string,
  publisherId: string,
) {
  const book = await tx.book.findFirst({
    where: { id: bookId, publisherId },
    select: { id: true },
  });
  if (!book) throw new BookFeatureError("Book not found.");
  return book;
}

export async function createBookFeatureDefinition(input: {
  title: unknown;
  description?: unknown;
  icon?: unknown;
}) {
  const actor = await requireLivePublisherAdmin();
  const title = clean(input.title, 160);
  if (!title) throw new BookFeatureError("Feature title is required.");
  const key = keyFromTitle(title);
  if (!key) throw new BookFeatureError("Feature title is invalid.");
  return prisma.$transaction(async (tx) => {
    const feature = await tx.bookFeatureDefinition.upsert({
      where: { publisherId_key: { publisherId: actor.publisherId, key } },
      create: {
        publisherId: actor.publisherId,
        key,
        title,
        description: clean(input.description, 500) || null,
        icon: clean(input.icon, 80) || null,
      },
      update: {
        title,
        description: clean(input.description, 500) || null,
        icon: clean(input.icon, 80) || null,
        active: true,
        archivedAt: null,
      },
    });
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book_feature.create",
      targetType: "BookFeatureDefinition",
      targetId: feature.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: ["title", "description", "icon", "active"] },
    });
    return feature;
  });
}

export async function attachFeatureToBook(
  bookId: string,
  featureId: string,
  input: { highlighted?: boolean; customText?: unknown },
) {
  const actor = await requireLivePublisherAdmin();
  return prisma.$transaction(async (tx) => {
    await ownedBook(tx, bookId, actor.publisherId);
    const feature = await tx.bookFeatureDefinition.findFirst({
      where: { id: featureId, publisherId: actor.publisherId, active: true },
      select: { id: true },
    });
    if (!feature) throw new BookFeatureError("Feature not found.");
    const assignment = await tx.bookFeatureAssignment.upsert({
      where: { bookId_featureId: { bookId, featureId } },
      create: {
        bookId,
        featureId,
        displayOrder: await tx.bookFeatureAssignment.count({ where: { bookId } }),
        highlighted: Boolean(input.highlighted),
        customText: clean(input.customText, 500) || null,
      },
      update: {
        active: true,
        highlighted: Boolean(input.highlighted),
        customText: clean(input.customText, 500) || null,
      },
    });
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book_feature.attach",
      targetType: "BookFeatureAssignment",
      targetId: assignment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: ["featureId", "highlighted", "customText", "active"] },
    });
    return assignment;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function detachFeatureFromBook(bookId: string, assignmentId: string) {
  const actor = await requireLivePublisherAdmin();
  return prisma.$transaction(async (tx) => {
    await ownedBook(tx, bookId, actor.publisherId);
    const assignment = await tx.bookFeatureAssignment.findFirst({
      where: {
        id: assignmentId,
        bookId,
        feature: { publisherId: actor.publisherId },
      },
      select: { id: true },
    });
    if (!assignment) throw new BookFeatureError("Book feature not found.");
    await tx.bookFeatureAssignment.update({
      where: { id: assignment.id },
      data: { active: false },
    });
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book_feature.detach",
      targetType: "BookFeatureAssignment",
      targetId: assignment.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: ["active"] },
    });
  });
}

export async function updateBookFeatureAssignment(
  bookId: string,
  assignmentId: string,
  input: { highlighted: boolean; customText?: unknown; direction?: -1 | 1 },
) {
  const actor = await requireLivePublisherAdmin();
  return prisma.$transaction(async (tx) => {
    await ownedBook(tx, bookId, actor.publisherId);
    const assignment = await tx.bookFeatureAssignment.findFirst({
      where: {
        id: assignmentId,
        bookId,
        feature: { publisherId: actor.publisherId },
      },
    });
    if (!assignment) throw new BookFeatureError("Book feature not found.");
    let displayOrder = assignment.displayOrder;
    if (input.direction) {
      const siblings = await tx.bookFeatureAssignment.findMany({
        where: { bookId, active: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, displayOrder: true },
      });
      const index = siblings.findIndex((item) => item.id === assignment.id);
      const sibling = siblings[index + input.direction];
      if (sibling) {
        await tx.bookFeatureAssignment.update({
          where: { id: sibling.id },
          data: { displayOrder: assignment.displayOrder },
        });
        displayOrder = sibling.displayOrder;
      }
    }
    const updated = await tx.bookFeatureAssignment.update({
      where: { id: assignment.id },
      data: {
        highlighted: input.highlighted,
        customText: clean(input.customText, 500) || null,
        displayOrder,
      },
    });
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: input.direction ? "publisher.book_feature.reorder" : "publisher.book_feature.update",
      targetType: "BookFeatureAssignment",
      targetId: updated.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: ["highlighted", "customText", "displayOrder"] },
    });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function archiveBookFeatureDefinition(featureId: string) {
  const actor = await requireLivePublisherAdmin();
  return prisma.$transaction(async (tx) => {
    const feature = await tx.bookFeatureDefinition.findFirst({
      where: { id: featureId, publisherId: actor.publisherId },
      select: { id: true },
    });
    if (!feature) throw new BookFeatureError("Feature not found.");
    await tx.bookFeatureDefinition.update({
      where: { id: feature.id },
      data: { active: false, archivedAt: new Date() },
    });
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book_feature.update",
      targetType: "BookFeatureDefinition",
      targetId: feature.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: ["active", "archivedAt"] },
    });
  });
}
