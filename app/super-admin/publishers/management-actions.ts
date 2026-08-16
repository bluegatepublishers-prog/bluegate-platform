"use server";

import { Prisma, SecurityAuditOutcome } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/publisher-context";
import {
  platformOwnerAuditActor,
  recordTrustedDeniedAudit,
  writeSecurityAuditEvent,
} from "@/lib/security-audit";
import { parsePublisherCreationInput, type PublisherCreateState } from "@/lib/super-admin-publisher-policy";



export async function createPublisher(
  _previous: PublisherCreateState,
  form: FormData,
): Promise<PublisherCreateState> {
  const owner = await requireSuperAdmin();
  let input;
  try {
    input = parsePublisherCreationInput({
      name: form.get("name"),
      slug: form.get("slug"),
      shortName: form.get("shortName"),
      supportEmail: form.get("supportEmail"),
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Enter valid Publisher details." };
  }

  const actor = platformOwnerAuditActor(owner);
  try {
    const publisher = await prisma.$transaction(async (tx) => {
      const definitions = await tx.featureDefinition.findMany({ select: { id: true } });
      const created = await tx.publisher.create({
        data: {
          name: input.name,
          slug: input.slug,
          shortName: input.shortName,
          supportEmail: input.supportEmail,
          active: true,
        },
        select: { id: true },
      });
      if (definitions.length) {
        await tx.publisherFeature.createMany({
          data: definitions.map((feature) => ({
            id: `${created.id}_${feature.id}`,
            publisherId: created.id,
            featureId: feature.id,
            enabled: false,
          })),
        });
      }
      await writeSecurityAuditEvent(tx, {
        actor,
        action: "platform.publisher.update",
        targetType: "Publisher",
        targetId: created.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { decision: "CREATE", toStatus: "ACTIVE", scope: "platform" },
      });
      return created;
    });
    revalidatePath("/super-admin");
    revalidatePath("/super-admin/publishers");
    redirect(`/super-admin/publishers/${publisher.id}`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, message: "A Publisher with that slug already exists." };
    }
    throw error;
  }
}

async function setPublisherActive(id: string, active: boolean) {
  const owner = await requireSuperAdmin();
  const actor = platformOwnerAuditActor(owner);
  const existing = await prisma.publisher.findUnique({
    where: { id },
    select: { id: true, active: true },
  });
  if (!existing) {
    await recordTrustedDeniedAudit({
      actor,
      action: "platform.publisher.update",
      targetType: "Publisher",
      reasonCode: "TARGET_NOT_FOUND",
      metadata: { scope: "platform" },
    });
    throw new Error("Publisher not found.");
  }
  if (existing.active === active) return;

  await prisma.$transaction(async (tx) => {
    const updated = await tx.publisher.updateMany({
      where: { id: existing.id, active: existing.active },
      data: { active },
    });
    if (updated.count !== 1) throw new Error("The Publisher changed before this action completed.");
    await writeSecurityAuditEvent(tx, {
      actor,
      action: active ? "platform.publisher.update" : "platform.publisher.update",
      targetType: "Publisher",
      targetId: existing.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: {
        decision: active ? "REACTIVATE" : "SUSPEND",
        fromStatus: existing.active ? "ACTIVE" : "SUSPENDED",
        toStatus: active ? "ACTIVE" : "SUSPENDED",
        scope: "platform",
      },
    });
  });

  revalidatePath("/super-admin");
  revalidatePath("/super-admin/publishers");
  revalidatePath(`/super-admin/publishers/${id}`);
}

export async function suspendPublisher(id: string) {
  await setPublisherActive(id, false);
}

export async function reactivatePublisher(id: string) {
  await setPublisherActive(id, true);
}
