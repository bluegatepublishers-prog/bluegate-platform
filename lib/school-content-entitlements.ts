import "server-only";

import {
  ContentEntitlementStatus,
  Prisma,
  SecurityAuditOutcome,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import {
  publisherAdminAuditActor,
  writeSecurityAuditEvent,
} from "@/lib/security-audit";
import {
  evaluateContentEntitlementTransition,
  type ContentEntitlementAction,
} from "@/lib/content-entitlement-policy";

export class SchoolContentEntitlementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchoolContentEntitlementError";
  }
}

export type EntitlementLifecycleAction = ContentEntitlementAction;

function cleanReason(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 500);
}

function uniqueIds(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

async function requireSchool(
  tx: Prisma.TransactionClient,
  schoolId: string,
  publisherId: string,
) {
  const school = await tx.school.findFirst({
    where: { id: schoolId, publisherId },
    select: { id: true },
  });
  if (!school) throw new SchoolContentEntitlementError("School not found.");
  return school;
}

export async function assignSchoolBooks(schoolId: string, rawBookIds: readonly string[]) {
  const actor = await requireLivePublisherAdmin();
  const bookIds = uniqueIds(rawBookIds);
  if (!bookIds.length || bookIds.length > 100) {
    throw new SchoolContentEntitlementError("Select between 1 and 100 books.");
  }

  return prisma.$transaction(async (tx) => {
    await requireSchool(tx, schoolId, actor.publisherId);
    const books = await tx.book.findMany({
      where: {
        id: { in: bookIds },
        publisherId: actor.publisherId,
        archived: false,
      },
      select: { id: true },
    });
    if (books.length !== bookIds.length) {
      throw new SchoolContentEntitlementError("One or more books are unavailable.");
    }

    const existing = await tx.schoolBookEntitlement.findMany({
      where: { schoolId, bookId: { in: bookIds } },
      select: { id: true, bookId: true, status: true },
    });
    if (existing.some((item) => item.status === ContentEntitlementStatus.ACTIVE)) {
      throw new SchoolContentEntitlementError("A selected book is already active for this school.");
    }

    const now = new Date();
    for (const bookId of bookIds) {
      const previous = existing.find((item) => item.bookId === bookId);
      const entitlement = previous
        ? await tx.schoolBookEntitlement.update({
            where: { id: previous.id },
            data: {
              status: ContentEntitlementStatus.ACTIVE,
              restoredAt: now,
              restoredByUserId: actor.userId,
              reason: null,
            },
          })
        : await tx.schoolBookEntitlement.create({
            data: {
              publisherId: actor.publisherId,
              schoolId,
              bookId,
              assignedAt: now,
              assignedByUserId: actor.userId,
            },
          });
      await writeSecurityAuditEvent(tx, {
        actor: publisherAdminAuditActor(actor),
        action: "publisher.school_book_entitlement.assign",
        targetType: "SchoolBookEntitlement",
        targetId: entitlement.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: {
          fromStatus: previous?.status ?? "UNASSIGNED",
          toStatus: ContentEntitlementStatus.ACTIVE,
        },
      });
    }
    return { count: bookIds.length };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function transitionSchoolBookEntitlement(
  schoolId: string,
  entitlementId: string,
  action: EntitlementLifecycleAction,
  rawReason?: unknown,
) {
  const actor = await requireLivePublisherAdmin();
  const reason = cleanReason(rawReason);

  return prisma.$transaction(async (tx) => {
    await requireSchool(tx, schoolId, actor.publisherId);
    const current = await tx.schoolBookEntitlement.findFirst({
      where: {
        id: entitlementId,
        schoolId,
        publisherId: actor.publisherId,
        book: { publisherId: actor.publisherId },
      },
      select: { id: true, status: true },
    });
    if (!current) throw new SchoolContentEntitlementError("Book entitlement not found.");
    const decision = evaluateContentEntitlementTransition({
      current: current.status,
      action,
      reason,
    });
    if (!decision.allowed) {
      if (decision.reason === "REASON_REQUIRED") {
        throw new SchoolContentEntitlementError("A revoke reason is required.");
      }
      throw new SchoolContentEntitlementError("This book entitlement cannot make that lifecycle change.");
    }

    const now = new Date();
    const data: Prisma.SchoolBookEntitlementUpdateInput = {
      status: decision.next,
      reason: reason || null,
      ...(action === "pause" ? { pausedAt: now, pausedBy: { connect: { id: actor.userId } } } : {}),
      ...(action === "revoke" ? { revokedAt: now, revokedBy: { connect: { id: actor.userId } } } : {}),
      ...(action === "restore" || action === "resume"
        ? { restoredAt: now, restoredBy: { connect: { id: actor.userId } } }
        : {}),
      ...(action === "archive" ? { archivedAt: now, archivedBy: { connect: { id: actor.userId } } } : {}),
    };
    const updated = await tx.schoolBookEntitlement.update({
      where: { id: current.id },
      data,
    });
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: `publisher.school_book_entitlement.${action}`,
      targetType: "SchoolBookEntitlement",
      targetId: updated.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { fromStatus: current.status, toStatus: decision.next },
    });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function assignSchoolResources(
  schoolId: string,
  rawResourceIds: readonly string[],
) {
  const actor = await requireLivePublisherAdmin();
  const resourceIds = uniqueIds(rawResourceIds);
  if (!resourceIds.length || resourceIds.length > 100) {
    throw new SchoolContentEntitlementError("Select between 1 and 100 resources.");
  }

  return prisma.$transaction(async (tx) => {
    await requireSchool(tx, schoolId, actor.publisherId);
    const resources = await tx.resource.findMany({
      where: {
        id: { in: resourceIds },
        publisherId: actor.publisherId,
        archived: false,
      },
      select: { id: true },
    });
    if (resources.length !== resourceIds.length) {
      throw new SchoolContentEntitlementError("One or more resources are unavailable.");
    }

    const existing = await tx.schoolResourceEntitlement.findMany({
      where: { schoolId, resourceId: { in: resourceIds } },
      select: { id: true, resourceId: true, status: true },
    });
    if (existing.some((item) => item.status === ContentEntitlementStatus.ACTIVE)) {
      throw new SchoolContentEntitlementError("A selected resource is already active for this school.");
    }

    const now = new Date();
    for (const resourceId of resourceIds) {
      const previous = existing.find((item) => item.resourceId === resourceId);
      const entitlement = previous
        ? await tx.schoolResourceEntitlement.update({
            where: { id: previous.id },
            data: {
              status: ContentEntitlementStatus.ACTIVE,
              restoredAt: now,
              restoredByUserId: actor.userId,
              reason: null,
            },
          })
        : await tx.schoolResourceEntitlement.create({
            data: {
              publisherId: actor.publisherId,
              schoolId,
              resourceId,
              assignedAt: now,
              assignedByUserId: actor.userId,
            },
          });
      await writeSecurityAuditEvent(tx, {
        actor: publisherAdminAuditActor(actor),
        action: "publisher.school_resource_entitlement.assign",
        targetType: "SchoolResourceEntitlement",
        targetId: entitlement.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: {
          fromStatus: previous?.status ?? "UNASSIGNED",
          toStatus: ContentEntitlementStatus.ACTIVE,
        },
      });
    }
    return { count: resourceIds.length };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function transitionSchoolResourceEntitlement(
  schoolId: string,
  entitlementId: string,
  action: EntitlementLifecycleAction,
  rawReason?: unknown,
) {
  const actor = await requireLivePublisherAdmin();
  const reason = cleanReason(rawReason);

  return prisma.$transaction(async (tx) => {
    await requireSchool(tx, schoolId, actor.publisherId);
    const current = await tx.schoolResourceEntitlement.findFirst({
      where: {
        id: entitlementId,
        schoolId,
        publisherId: actor.publisherId,
        resource: { publisherId: actor.publisherId },
      },
      select: { id: true, status: true },
    });
    if (!current) throw new SchoolContentEntitlementError("Resource entitlement not found.");
    const decision = evaluateContentEntitlementTransition({
      current: current.status,
      action,
      reason,
    });
    if (!decision.allowed) {
      if (decision.reason === "REASON_REQUIRED") {
        throw new SchoolContentEntitlementError("A revoke reason is required.");
      }
      throw new SchoolContentEntitlementError("This resource entitlement cannot make that lifecycle change.");
    }

    const now = new Date();
    const data: Prisma.SchoolResourceEntitlementUpdateInput = {
      status: decision.next,
      reason: reason || null,
      ...(action === "pause" ? { pausedAt: now, pausedBy: { connect: { id: actor.userId } } } : {}),
      ...(action === "revoke" ? { revokedAt: now, revokedBy: { connect: { id: actor.userId } } } : {}),
      ...(action === "restore" || action === "resume"
        ? { restoredAt: now, restoredBy: { connect: { id: actor.userId } } }
        : {}),
      ...(action === "archive" ? { archivedAt: now, archivedBy: { connect: { id: actor.userId } } } : {}),
    };
    const updated = await tx.schoolResourceEntitlement.update({
      where: { id: current.id },
      data,
    });
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: `publisher.school_resource_entitlement.${action}`,
      targetType: "SchoolResourceEntitlement",
      targetId: updated.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { fromStatus: current.status, toStatus: decision.next },
    });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
