import {
  BookContentTargetType,
  Prisma,
  QrAccessAudience,
  QrDestinationType,
  QrRevisionReason,
  QrStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  normalizeApprovedExternalUrl,
  normalizeInternalRoute,
  QrDestinationPolicyError,
} from "@/lib/qr/destination-policy";
import {
  assertPublisherAccess,
  QrAdminActor,
  QrAuthorizationError,
} from "@/lib/qr/qr-authorization";
import { generateQrPublicCode } from "@/lib/qr/public-code";

const TARGET_TYPES = new Set(Object.values(BookContentTargetType));
const DESTINATION_TYPES = new Set(Object.values(QrDestinationType));
const AUDIENCES = new Set(Object.values(QrAccessAudience));
const STATUSES = new Set(Object.values(QrStatus));

const qrInclude = {
  book: {
    select: {
      id: true,
      title: true,
    },
  },
  currentDestination: {
    select: {
      id: true,
      type: true,
      resourceId: true,
      bookResourceLinkId: true,
      validatedExternalUrl: true,
      externalHost: true,
      internalRoute: true,
      audience: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.DynamicQrCodeInclude;

const revisionDestinationSelect = {
  id: true,
  type: true,
  resourceId: true,
  bookResourceLinkId: true,
  validatedExternalUrl: true,
  externalHost: true,
  internalRoute: true,
  audience: true,
  active: true,
  createdAt: true,
} satisfies Prisma.QrDestinationSelect;

type JsonRecord = Record<string, unknown>;
type DbClient = Prisma.TransactionClient | typeof prisma;

export class QrServiceError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 409,
    public readonly reasonCode: string,
  ) {
    super(message);
    this.name = "QrServiceError";
  }
}

export function qrErrorResponse(error: unknown) {
  if (error instanceof QrAuthorizationError) {
    return Response.json(
      { error: error.message, reasonCode: error.reasonCode },
      { status: error.status },
    );
  }

  if (
    error instanceof QrServiceError ||
    error instanceof QrDestinationPolicyError
  ) {
    return Response.json(
      { error: error.message, reasonCode: error.reasonCode },
      { status: error instanceof QrServiceError ? error.status : 400 },
    );
  }

  console.error("Dynamic QR request failed", error);
  return Response.json(
    { error: "Unable to complete the QR request." },
    { status: 500 },
  );
}

export function jsonObject(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new QrServiceError(
      "A JSON object is required.",
      400,
      "INVALID_REQUEST_BODY",
    );
  }

  return value as JsonRecord;
}

function stringValue(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string") {
    throw new QrServiceError(
      `${field} must be a string.`,
      400,
      `INVALID_${field.toUpperCase()}`,
    );
  }

  const result = value.trim();
  if (!result || result.length > maxLength) {
    throw new QrServiceError(
      `${field} is required and must not exceed ${maxLength} characters.`,
      400,
      `INVALID_${field.toUpperCase()}`,
    );
  }

  return result;
}

function optionalDate(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new QrServiceError(
      `${field} must be an ISO date or null.`,
      400,
      `INVALID_${field.toUpperCase()}`,
    );
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new QrServiceError(
      `${field} is invalid.`,
      400,
      `INVALID_${field.toUpperCase()}`,
    );
  }

  return date;
}

function enumValue<T extends string>(
  value: unknown,
  values: Set<T>,
  field: string,
): T {
  if (typeof value !== "string" || !values.has(value as T)) {
    throw new QrServiceError(
      `${field} is invalid.`,
      400,
      `INVALID_${field.toUpperCase()}`,
    );
  }
  return value as T;
}

function checkSchedule(activatesAt: Date | null, expiresAt: Date | null) {
  if (activatesAt && expiresAt && expiresAt <= activatesAt) {
    throw new QrServiceError(
      "Expiration must be after activation.",
      400,
      "INVALID_QR_SCHEDULE",
    );
  }
}

async function ownedBook(actor: QrAdminActor, bookId: string) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      title: true,
      publisherId: true,
      archived: true,
      publisherTenant: {
        select: {
          active: true,
        },
      },
    },
  });

  if (!book) {
    throw new QrServiceError("Book not found.", 404, "BOOK_NOT_FOUND");
  }
  if (!book.publisherId || !book.publisherTenant?.active) {
    throw new QrServiceError(
      "The Book does not belong to an active publisher.",
      400,
      "BOOK_PUBLISHER_UNAVAILABLE",
    );
  }
  assertPublisherAccess(actor, book.publisherId);
  if (book.archived) {
    throw new QrServiceError(
      "Archived Books cannot receive QR codes.",
      400,
      "BOOK_ARCHIVED",
    );
  }

  return {
    id: book.id,
    title: book.title,
    publisherId: book.publisherId,
  };
}

async function hierarchyTarget(
  bookId: string,
  typeValue: unknown,
  targetIdValue: unknown,
) {
  const targetType =
    typeValue === undefined
      ? BookContentTargetType.BOOK
      : enumValue(typeValue, TARGET_TYPES, "targetType");

  if (targetType === BookContentTargetType.BOOK) {
    if (targetIdValue !== undefined && targetIdValue !== null) {
      throw new QrServiceError(
        "Book targets must not include a targetId.",
        400,
        "INVALID_BOOK_TARGET",
      );
    }
    return { targetType };
  }

  const targetId = stringValue(targetIdValue, "targetId", 191);
  const baseSelect = { id: true, bookId: true, archived: true } as const;
  let target: { id: string; bookId: string; archived: boolean } | null = null;

  switch (targetType) {
    case BookContentTargetType.PART:
      target = await prisma.bookPart.findUnique({
        where: { id: targetId },
        select: baseSelect,
      });
      break;
    case BookContentTargetType.UNIT:
      target = await prisma.bookUnit.findUnique({
        where: { id: targetId },
        select: baseSelect,
      });
      break;
    case BookContentTargetType.CHAPTER:
      target = await prisma.bookChapter.findUnique({
        where: { id: targetId },
        select: baseSelect,
      });
      break;
    case BookContentTargetType.MODULE:
      target = await prisma.bookModule.findUnique({
        where: { id: targetId },
        select: baseSelect,
      });
      break;
    case BookContentTargetType.TOPIC:
      target = await prisma.bookTopic.findUnique({
        where: { id: targetId },
        select: baseSelect,
      });
      break;
  }

  if (!target || target.bookId !== bookId || target.archived) {
    throw new QrServiceError(
      "The hierarchy target is unavailable for this Book.",
      400,
      "INVALID_HIERARCHY_TARGET",
    );
  }

  return {
    targetType,
    partId:
      targetType === BookContentTargetType.PART ? target.id : undefined,
    unitId:
      targetType === BookContentTargetType.UNIT ? target.id : undefined,
    chapterId:
      targetType === BookContentTargetType.CHAPTER ? target.id : undefined,
    moduleId:
      targetType === BookContentTargetType.MODULE ? target.id : undefined,
    topicId:
      targetType === BookContentTargetType.TOPIC ? target.id : undefined,
  };
}

async function destinationData(
  db: DbClient,
  actor: QrAdminActor,
  publisherId: string,
  bookId: string,
  value: unknown,
) {
  const input = jsonObject(value);
  const type = enumValue(input.type, DESTINATION_TYPES, "destinationType");
  const audience =
    input.audience === undefined
      ? QrAccessAudience.PUBLIC
      : enumValue(input.audience, AUDIENCES, "destinationAudience");

  if (type === QrDestinationType.RESOURCE) {
    const resourceId = stringValue(input.resourceId, "resourceId", 191);
    const resource = await db.resource.findFirst({
      where: { id: resourceId, publisherId },
      select: { id: true },
    });
    if (!resource) {
      throw new QrServiceError(
        "Publisher-owned Resource not found.",
        404,
        "RESOURCE_NOT_FOUND",
      );
    }
    return { type, audience, resourceId };
  }

  if (type === QrDestinationType.BOOK_RESOURCE_LINK) {
    const bookResourceLinkId = stringValue(
      input.bookResourceLinkId,
      "bookResourceLinkId",
      191,
    );
    const link = await db.bookResourceLink.findFirst({
      where: {
        id: bookResourceLinkId,
        publisherId,
        bookId,
        active: true,
        qrEligible: true,
      },
      select: { id: true },
    });
    if (!link) {
      throw new QrServiceError(
        "An active, QR-eligible Book Resource Link was not found.",
        404,
        "BOOK_RESOURCE_LINK_NOT_FOUND",
      );
    }
    return { type, audience, bookResourceLinkId };
  }

  if (type === QrDestinationType.EXTERNAL_URL) {
    const normalized = normalizeApprovedExternalUrl(input.externalUrl);
    return {
      type,
      audience,
      validatedExternalUrl: normalized.url,
      externalHost: normalized.host,
      validatedAt: new Date(),
      externalApprovedAt: new Date(),
      externalApprovedById: actor.userId,
    };
  }

  return {
    type,
    audience,
    internalRoute: normalizeInternalRoute(input.internalRoute),
    validatedAt: new Date(),
  };
}

async function audit(
  db: DbClient,
  actor: QrAdminActor,
  publisherId: string,
  action: string,
  targetId: string,
  metadata?: Prisma.InputJsonValue,
) {
  await db.securityAuditEvent.create({
    data: {
      actorUserId: actor.userId,
      actorRole: actor.role,
      publisherId,
      action,
      targetType: "DYNAMIC_QR_CODE",
      targetId,
      outcome: "SUCCESS",
      metadata,
    },
  });
}

async function lockQrCode(tx: Prisma.TransactionClient, qrCodeId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "DynamicQrCode"
    WHERE "id" = ${qrCodeId}
    FOR UPDATE
  `;
  if (rows.length === 0) {
    throw new QrServiceError("QR code not found.", 404, "QR_CODE_NOT_FOUND");
  }
}

async function appendRevision(
  tx: Prisma.TransactionClient,
  data: {
    qrCodeId: string;
    previousDestinationId: string | null;
    newDestinationId: string | null;
    fromStatus: QrStatus | null;
    toStatus: QrStatus | null;
    reason: QrRevisionReason;
    changedById: string;
    effectiveAt?: Date;
    appliedAt?: Date;
    metadata?: Prisma.InputJsonValue;
  },
) {
  const latest = await tx.qrRedirectRevision.aggregate({
    where: { qrCodeId: data.qrCodeId },
    _max: { revisionNumber: true },
  });
  const now = new Date();
  return tx.qrRedirectRevision.create({
    data: {
      qrCodeId: data.qrCodeId,
      revisionNumber: (latest._max.revisionNumber ?? 0) + 1,
      previousDestinationId: data.previousDestinationId,
      newDestinationId: data.newDestinationId,
      fromStatus: data.fromStatus,
      toStatus: data.toStatus,
      reason: data.reason,
      changedById: data.changedById,
      effectiveAt: data.effectiveAt ?? now,
      appliedAt: data.appliedAt ?? now,
      ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
    },
  });
}

function sameDate(left: Date | null, right: Date | null) {
  return left?.getTime() === right?.getTime();
}

function destinationMatchesData(
  current: {
    type: QrDestinationType;
    audience: QrAccessAudience;
    resourceId: string | null;
    bookResourceLinkId: string | null;
    validatedExternalUrl: string | null;
    internalRoute: string | null;
  } | null,
  data: Record<string, unknown>,
) {
  if (!current) return false;
  return (
    current.type === data.type &&
    current.audience === data.audience &&
    current.resourceId === (data.resourceId ?? null) &&
    current.bookResourceLinkId === (data.bookResourceLinkId ?? null) &&
    current.validatedExternalUrl === (data.validatedExternalUrl ?? null) &&
    current.internalRoute === (data.internalRoute ?? null)
  );
}

function revisionReason(
  currentStatus: QrStatus,
  nextStatus: QrStatus,
  destinationChanged: boolean,
  expirationChanged: boolean,
) {
  if (destinationChanged) return QrRevisionReason.DESTINATION_CHANGED;
  if (currentStatus !== nextStatus) {
    if (nextStatus === QrStatus.ACTIVE) {
      return currentStatus === QrStatus.PAUSED
        ? QrRevisionReason.RESUMED
        : QrRevisionReason.ACTIVATED;
    }
    if (nextStatus === QrStatus.PAUSED) return QrRevisionReason.PAUSED;
    if (nextStatus === QrStatus.ARCHIVED) return QrRevisionReason.ARCHIVED;
    if (
      currentStatus === QrStatus.ARCHIVED &&
      nextStatus === QrStatus.DRAFT
    ) {
      return QrRevisionReason.RESTORED;
    }
    if (nextStatus === QrStatus.EXPIRED) return QrRevisionReason.EXPIRED;
    if (nextStatus === QrStatus.SUSPENDED) return QrRevisionReason.SUSPENDED;
    if (currentStatus === QrStatus.SUSPENDED) {
      return QrRevisionReason.UNSUSPENDED;
    }
  }
  return expirationChanged ? QrRevisionReason.EXPIRATION_CHANGED : null;
}

function isPublicCodeCollision(error: unknown) {
  if (
    !error ||
    typeof error !== "object" ||
    !("code" in error) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  return Array.isArray(target)
    ? target.includes("publicCode")
    : String(target ?? "").includes("publicCode");
}

export async function createQrCode(
  actor: QrAdminActor,
  input: JsonRecord,
) {
  const name = stringValue(input.name, "name", 160);
  const bookId = stringValue(input.bookId, "bookId", 191);
  const book = await ownedBook(actor, bookId);
  const target = await hierarchyTarget(
    book.id,
    input.targetType,
    input.targetId,
  );
  const audience =
    input.audience === undefined
      ? QrAccessAudience.PUBLIC
      : enumValue(input.audience, AUDIENCES, "audience");
  const activatesAt = optionalDate(input.activatesAt, "activatesAt") ?? null;
  const expiresAt = optionalDate(input.expiresAt, "expiresAt") ?? null;
  checkSchedule(activatesAt, expiresAt);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const publicCode = generateQrPublicCode();
    try {
      return await prisma.$transaction(async (tx) => {
        const qrCode = await tx.dynamicQrCode.create({
          data: {
            publicCode,
            name,
            publisherId: book.publisherId,
            bookId: book.id,
            ...target,
            audience,
            activatesAt,
            expiresAt,
            createdById: actor.userId,
          },
        });

        let currentDestinationId: string | null = null;
        if (input.destination !== undefined) {
          const data = await destinationData(
            tx,
            actor,
            book.publisherId,
            book.id,
            input.destination,
          );
          const destination = await tx.qrDestination.create({
            data: {
              qrCodeId: qrCode.id,
              createdById: actor.userId,
              ...data,
            },
          });
          await tx.dynamicQrCode.update({
            where: { id: qrCode.id },
            data: { currentDestinationId: destination.id },
          });
          currentDestinationId = destination.id;
        }

        await appendRevision(tx, {
          qrCodeId: qrCode.id,
          previousDestinationId: null,
          newDestinationId: currentDestinationId,
          fromStatus: null,
          toStatus: qrCode.status,
          reason: QrRevisionReason.CREATED,
          changedById: actor.userId,
          effectiveAt: qrCode.activatesAt ?? qrCode.createdAt,
          appliedAt: qrCode.createdAt,
        });

        await audit(tx, actor, book.publisherId, "QR_CREATE", qrCode.id, {
          publicCode,
          bookId: book.id,
          targetType: target.targetType,
        });

        return tx.dynamicQrCode.findUniqueOrThrow({
          where: { id: qrCode.id },
          include: qrInclude,
        });
      });
    } catch (error) {
      if (isPublicCodeCollision(error) && attempt < 4) continue;
      throw error;
    }
  }

  throw new QrServiceError(
    "A unique QR public code could not be allocated.",
    409,
    "PUBLIC_CODE_COLLISION",
  );
}

export async function listQrCodes(
  actor: QrAdminActor,
  options: {
    q?: string;
    bookId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(options.pageSize ?? 25)));
  const q = options.q?.trim().slice(0, 100);
  const status = options.status
    ? enumValue(options.status, STATUSES, "status")
    : undefined;

  const where: Prisma.DynamicQrCodeWhereInput = {
    ...(actor.role === "ADMIN" ? { publisherId: actor.publisherId! } : {}),
    ...(options.bookId ? { bookId: options.bookId } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { publicCode: { contains: q.toUpperCase() } },
            { book: { title: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.dynamicQrCode.findMany({
      where,
      include: qrInclude,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.dynamicQrCode.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

async function ownedQrCode(actor: QrAdminActor, id: string) {
  const qrCode = await prisma.dynamicQrCode.findUnique({
    where: { id },
    include: qrInclude,
  });
  if (!qrCode) {
    throw new QrServiceError("QR code not found.", 404, "QR_CODE_NOT_FOUND");
  }
  assertPublisherAccess(actor, qrCode.publisherId);
  return qrCode;
}

export async function getQrCode(actor: QrAdminActor, id: string) {
  return ownedQrCode(actor, id);
}

function validateTransition(
  actor: QrAdminActor,
  current: QrStatus,
  next: QrStatus,
) {
  if (current === next) return;
  if (next === QrStatus.SUSPENDED || current === QrStatus.SUSPENDED) {
    if (actor.role !== "SUPER_ADMIN") {
      throw new QrAuthorizationError(
        "Only Edora Super Admin can change suspension state.",
        403,
        "SUSPENSION_REQUIRES_SUPER_ADMIN",
      );
    }
    return;
  }

  const allowed: Partial<Record<QrStatus, QrStatus[]>> = {
    DRAFT: [QrStatus.ACTIVE, QrStatus.ARCHIVED],
    ACTIVE: [QrStatus.PAUSED, QrStatus.ARCHIVED, QrStatus.EXPIRED],
    PAUSED: [QrStatus.ACTIVE, QrStatus.ARCHIVED],
    EXPIRED: [QrStatus.DRAFT, QrStatus.ACTIVE, QrStatus.ARCHIVED],
    ARCHIVED: [QrStatus.DRAFT],
  };

  if (!allowed[current]?.includes(next)) {
    throw new QrServiceError(
      `The transition from ${current} to ${next} is not allowed.`,
      409,
      "INVALID_STATUS_TRANSITION",
    );
  }
}

function auditAction(current: QrStatus, next: QrStatus | undefined) {
  if (!next || next === current) return "QR_UPDATE";
  if (next === QrStatus.ACTIVE) return "QR_ACTIVATE";
  if (next === QrStatus.PAUSED) return "QR_PAUSE";
  if (next === QrStatus.ARCHIVED) return "QR_ARCHIVE";
  return "QR_UPDATE";
}

export async function updateQrCode(
  actor: QrAdminActor,
  id: string,
  input: JsonRecord,
) {
  await ownedQrCode(actor, id);
  const name =
    input.name === undefined ? undefined : stringValue(input.name, "name", 160);
  const audience =
    input.audience === undefined
      ? undefined
      : enumValue(input.audience, AUDIENCES, "audience");
  const status =
    input.status === undefined
      ? undefined
      : enumValue(input.status, STATUSES, "status");
  const activatesAt = optionalDate(input.activatesAt, "activatesAt");
  const expiresAt = optionalDate(input.expiresAt, "expiresAt");

  if (input.qrEligible !== undefined && typeof input.qrEligible !== "boolean") {
    throw new QrServiceError(
      "qrEligible must be a boolean.",
      400,
      "INVALID_QR_ELIGIBLE",
    );
  }

  return prisma.$transaction(async (tx) => {
    await lockQrCode(tx, id);
    const existing = await tx.dynamicQrCode.findUniqueOrThrow({
      where: { id },
      include: qrInclude,
    });
    assertPublisherAccess(actor, existing.publisherId);
    if (status) validateTransition(actor, existing.status, status);

    const nextActivatesAt =
      activatesAt === undefined ? existing.activatesAt : activatesAt;
    const nextExpiresAt =
      expiresAt === undefined ? existing.expiresAt : expiresAt;
    checkSchedule(nextActivatesAt, nextExpiresAt);

    let currentDestinationId = existing.currentDestinationId;

    if (input.destination !== undefined) {
      const data = await destinationData(
        tx,
        actor,
        existing.publisherId,
        existing.bookId,
        input.destination,
      );
      if (
        destinationMatchesData(
          existing.currentDestination,
          data as Record<string, unknown>,
        )
      ) {
        throw new QrServiceError(
          "The QR code already uses this destination.",
          409,
          "QR_DESTINATION_NO_CHANGE",
        );
      }
      const destination = await tx.qrDestination.create({
        data: {
          qrCodeId: existing.id,
          createdById: actor.userId,
          ...data,
        },
      });

      currentDestinationId = destination.id;
    }

    const nextStatus = status ?? existing.status;
    const nextQrEligible =
      typeof input.qrEligible === "boolean"
        ? input.qrEligible
        : existing.qrEligible;

    if (nextStatus === QrStatus.ACTIVE) {
      if (!currentDestinationId || !nextQrEligible) {
        throw new QrServiceError(
          "An eligible QR code requires an active destination before activation.",
          409,
          "QR_NOT_ACTIVATABLE",
        );
      }
      if (nextExpiresAt && nextExpiresAt <= new Date()) {
        throw new QrServiceError(
          "An expired QR code cannot be activated.",
          409,
          "QR_ALREADY_EXPIRED",
        );
      }
    }

    const now = new Date();
    const updated = await tx.dynamicQrCode.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(audience !== undefined ? { audience } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(activatesAt !== undefined ? { activatesAt } : {}),
        ...(expiresAt !== undefined ? { expiresAt } : {}),
        ...(typeof input.qrEligible === "boolean"
          ? { qrEligible: input.qrEligible }
          : {}),
        ...(currentDestinationId !== existing.currentDestinationId
          ? { currentDestinationId }
          : {}),
        ...(status === QrStatus.ARCHIVED ? { archivedAt: now } : {}),
        ...(status === QrStatus.DRAFT && existing.status === QrStatus.ARCHIVED
          ? { archivedAt: null }
          : {}),
        ...(status === QrStatus.SUSPENDED
          ? {
              suspendedAt: now,
              suspendedById: actor.userId,
              suspensionReason:
                typeof input.suspensionReason === "string"
                  ? input.suspensionReason.trim().slice(0, 500) || null
                  : null,
            }
          : {}),
        ...(existing.status === QrStatus.SUSPENDED &&
        status &&
        status !== QrStatus.SUSPENDED
          ? {
              suspendedAt: null,
              suspendedById: null,
              suspensionReason: null,
            }
          : {}),
      },
      include: qrInclude,
    });

    const destinationChanged =
      currentDestinationId !== existing.currentDestinationId;
    const expirationChanged = !sameDate(existing.expiresAt, nextExpiresAt);
    const reason = revisionReason(
      existing.status,
      updated.status,
      destinationChanged,
      expirationChanged,
    );

    if (reason) {
      await appendRevision(tx, {
        qrCodeId: existing.id,
        previousDestinationId: existing.currentDestinationId,
        newDestinationId: currentDestinationId,
        fromStatus: existing.status,
        toStatus: updated.status,
        reason,
        changedById: actor.userId,
        metadata: {
          destinationChanged,
          expirationChanged,
          previousExpiresAt: existing.expiresAt?.toISOString() ?? null,
          expiresAt: updated.expiresAt?.toISOString() ?? null,
        },
      });
    }

    await audit(
      tx,
      actor,
      existing.publisherId,
      auditAction(existing.status, status),
      existing.id,
      {
        previousStatus: existing.status,
        status: updated.status,
        destinationChanged,
        revisionCreated: reason !== null,
      },
    );

    return updated;
  });
}

export async function archiveQrCode(actor: QrAdminActor, id: string) {
  return updateQrCode(actor, id, { status: QrStatus.ARCHIVED });
}

export async function listQrRevisions(
  actor: QrAdminActor,
  id: string,
  options: { page?: number; pageSize?: number },
) {
  await ownedQrCode(actor, id);
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(options.pageSize ?? 20)));
  const where = { qrCodeId: id };
  const [items, total] = await prisma.$transaction([
    prisma.qrRedirectRevision.findMany({
      where,
      select: {
        id: true,
        revisionNumber: true,
        reason: true,
        fromStatus: true,
        toStatus: true,
        previousDestination: { select: revisionDestinationSelect },
        newDestination: { select: revisionDestinationSelect },
        changedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        changedAt: true,
        effectiveAt: true,
        appliedAt: true,
      },
      orderBy: [{ revisionNumber: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.qrRedirectRevision.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

function destinationInputFromHistorical(
  destination: {
    type: QrDestinationType;
    audience: QrAccessAudience;
    resourceId: string | null;
    bookResourceLinkId: string | null;
    validatedExternalUrl: string | null;
    internalRoute: string | null;
  },
) {
  if (destination.type === QrDestinationType.RESOURCE) {
    return {
      type: destination.type,
      audience: destination.audience,
      resourceId: destination.resourceId,
    };
  }
  if (destination.type === QrDestinationType.BOOK_RESOURCE_LINK) {
    return {
      type: destination.type,
      audience: destination.audience,
      bookResourceLinkId: destination.bookResourceLinkId,
    };
  }
  if (destination.type === QrDestinationType.EXTERNAL_URL) {
    return {
      type: destination.type,
      audience: destination.audience,
      externalUrl: destination.validatedExternalUrl,
    };
  }
  return {
    type: destination.type,
    audience: destination.audience,
    internalRoute: destination.internalRoute,
  };
}

function sameDestination(
  current: {
    type: QrDestinationType;
    audience: QrAccessAudience;
    resourceId: string | null;
    bookResourceLinkId: string | null;
    validatedExternalUrl: string | null;
    internalRoute: string | null;
  } | null,
  historical: {
    type: QrDestinationType;
    audience: QrAccessAudience;
    resourceId: string | null;
    bookResourceLinkId: string | null;
    validatedExternalUrl: string | null;
    internalRoute: string | null;
  },
) {
  if (!current) return false;
  return (
    current.type === historical.type &&
    current.audience === historical.audience &&
    current.resourceId === historical.resourceId &&
    current.bookResourceLinkId === historical.bookResourceLinkId &&
    current.validatedExternalUrl === historical.validatedExternalUrl &&
    current.internalRoute === historical.internalRoute
  );
}

export async function rollbackQrCode(
  actor: QrAdminActor,
  id: string,
  revisionId: string,
) {
  await ownedQrCode(actor, id);

  return prisma.$transaction(async (tx) => {
    await lockQrCode(tx, id);
    const existing = await tx.dynamicQrCode.findUniqueOrThrow({
      where: { id },
      include: qrInclude,
    });
    assertPublisherAccess(actor, existing.publisherId);

    const historicalRevision = await tx.qrRedirectRevision.findFirst({
      where: { id: revisionId, qrCodeId: id },
      include: { newDestination: true },
    });
    if (!historicalRevision) {
      throw new QrServiceError(
        "Revision not found for this QR code.",
        404,
        "QR_REVISION_NOT_FOUND",
      );
    }
    if (!historicalRevision.newDestination) {
      throw new QrServiceError(
        "This revision does not contain a destination to restore.",
        409,
        "QR_REVISION_HAS_NO_DESTINATION",
      );
    }
    if (
      sameDestination(
        existing.currentDestination,
        historicalRevision.newDestination,
      )
    ) {
      throw new QrServiceError(
        "The QR code already uses this destination.",
        409,
        "QR_ROLLBACK_NO_CHANGE",
      );
    }

    const data = await destinationData(
      tx,
      actor,
      existing.publisherId,
      existing.bookId,
      destinationInputFromHistorical(historicalRevision.newDestination),
    );
    const replacement = await tx.qrDestination.create({
      data: {
        qrCodeId: existing.id,
        createdById: actor.userId,
        metadata: {
          rollbackRevisionId: historicalRevision.id,
          historicalDestinationId: historicalRevision.newDestination.id,
        },
        ...data,
      },
    });

    const updated = await tx.dynamicQrCode.update({
      where: { id: existing.id },
      data: { currentDestinationId: replacement.id },
      include: qrInclude,
    });

    await appendRevision(tx, {
      qrCodeId: existing.id,
      previousDestinationId: existing.currentDestinationId,
      newDestinationId: replacement.id,
      fromStatus: existing.status,
      toStatus: existing.status,
      reason: QrRevisionReason.ROLLED_BACK,
      changedById: actor.userId,
      metadata: {
        sourceRevisionId: historicalRevision.id,
        sourceRevisionNumber: historicalRevision.revisionNumber,
        historicalDestinationId: historicalRevision.newDestination.id,
      },
    });

    await audit(
      tx,
      actor,
      existing.publisherId,
      "QR_ROLLBACK",
      existing.id,
      {
        sourceRevisionId: historicalRevision.id,
        sourceRevisionNumber: historicalRevision.revisionNumber,
        previousDestinationId: existing.currentDestinationId,
        newDestinationId: replacement.id,
      },
    );

    return updated;
  });
}
