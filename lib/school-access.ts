import "server-only";

import {
  Prisma,
  SchoolAccessPlan,
  SchoolAccessStatus,
  SecurityAuditOutcome,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import {
  publisherAdminAuditActor,
  writeSecurityAuditEvent,
} from "@/lib/security-audit";

export class SchoolAccessError extends Error {}

export type SchoolAccessInput = {
  plan: SchoolAccessPlan;
  status: SchoolAccessStatus;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  notes?: string | null;
};

function validateDates(startsAt: Date | null, expiresAt: Date | null) {
  if (startsAt && Number.isNaN(startsAt.getTime())) throw new SchoolAccessError("Start date is invalid.");
  if (expiresAt && Number.isNaN(expiresAt.getTime())) throw new SchoolAccessError("Expiry date is invalid.");
  if (startsAt && expiresAt && expiresAt <= startsAt) {
    throw new SchoolAccessError("Expiry date must be after the start date.");
  }
}

export async function updatePublisherSchoolAccess(schoolId: string, input: SchoolAccessInput) {
  const actor = await requireLivePublisherAdmin();
  if (!Object.values(SchoolAccessPlan).includes(input.plan)) throw new SchoolAccessError("Select a valid school plan.");
  if (!Object.values(SchoolAccessStatus).includes(input.status)) throw new SchoolAccessError("Select a valid access status.");
  const startsAt = input.startsAt ?? null;
  const expiresAt = input.expiresAt ?? null;
  validateDates(startsAt, expiresAt);
  const notes = input.notes?.trim().slice(0, 500) || null;

  return prisma.$transaction(async (tx) => {
    const school = await tx.school.findFirst({
      where: { id: schoolId, publisherId: actor.publisherId },
      select: { id: true },
    });
    if (!school) throw new SchoolAccessError("School not found.");

    const previous = await tx.schoolAccessSubscription.findUnique({
      where: { schoolId: school.id },
      select: { plan: true, status: true },
    });
    const subscription = await tx.schoolAccessSubscription.upsert({
      where: { schoolId: school.id },
      create: {
        schoolId: school.id,
        publisherId: actor.publisherId,
        plan: input.plan,
        status: input.status,
        startsAt,
        expiresAt,
        notes,
      },
      update: { plan: input.plan, status: input.status, startsAt, expiresAt, notes },
    });
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.school_access.update",
      targetType: "SchoolAccessSubscription",
      targetId: subscription.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: {
        changedFields: [
          ...(previous?.plan !== subscription.plan ? ["plan"] : []),
          ...(previous?.status !== subscription.status ? ["status"] : []),
          "accessWindow",
        ],
      },
    });
    return subscription;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function syncSchoolAccessLifecycle(
  tx: Prisma.TransactionClient,
  input: {
    schoolId: string;
    publisherId: string;
    status: SchoolAccessStatus;
    defaultPlan?: SchoolAccessPlan;
  },
) {
  return tx.schoolAccessSubscription.upsert({
    where: { schoolId: input.schoolId },
    create: {
      schoolId: input.schoolId,
      publisherId: input.publisherId,
      plan: input.defaultPlan ?? SchoolAccessPlan.FREE,
      status: input.status,
    },
    update: { status: input.status },
  });
}
