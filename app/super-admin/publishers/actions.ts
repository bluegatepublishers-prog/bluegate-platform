"use server";

import { PlatformFeatureKey, SecurityAuditOutcome } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/publisher-context";
import {
  platformOwnerAuditActor,
  recordTrustedDeniedAudit,
  runAuditedMutation,
} from "@/lib/security-audit";

const text = (form: FormData, key: string, length = 120) =>
  String(form.get(key) ?? "").trim().slice(0, length);

export async function updatePublisher(id: string, form: FormData) {
  const owner = await requireSuperAdmin();
  const actor = platformOwnerAuditActor(owner);
  const existing = await prisma.publisher.findUnique({
    where: { id },
    select: {
      id: true, active: true, shortName: true, logoUrl: true,
      primaryColor: true, secondaryColor: true, accentColor: true,
      portalTitle: true, aiName: true, supportEmail: true, supportPhone: true,
    },
  });
  if (!existing) {
    await recordTrustedDeniedAudit({ actor, action: "platform.publisher.update", targetType: "Publisher", reasonCode: "TARGET_NOT_FOUND", metadata: { scope: "platform" } });
    throw new Error("Publisher not found.");
  }
  const colors = ["primaryColor", "secondaryColor", "accentColor"].map((key) => text(form, key, 7));
  if (colors.some((color) => color && !/^#[0-9a-f]{6}$/i.test(color))) throw new Error("Use six-digit hex colors.");
  const data = {
    active: form.get("active") === "on",
    shortName: text(form, "shortName", 60) || null,
    logoUrl: text(form, "logoUrl", 500) || null,
    primaryColor: colors[0] || null,
    secondaryColor: colors[1] || null,
    accentColor: colors[2] || null,
    portalTitle: text(form, "portalTitle", 100) || null,
    aiName: text(form, "aiName", 80) || null,
    supportEmail: text(form, "supportEmail", 200) || null,
    supportPhone: text(form, "supportPhone", 40) || null,
  };
  const changedFields = Object.keys(data).filter((key) => existing[key as keyof typeof existing] !== data[key as keyof typeof data]);
  await runAuditedMutation({
    actor,
    action: "platform.publisher.update",
    targetType: "Publisher",
    targetId: existing.id,
    outcome: SecurityAuditOutcome.SUCCESS,
    metadata: { changedFields },
  }, (tx) => tx.publisher.update({ where: { id: existing.id }, data }));
  revalidatePath(`/super-admin/publishers/${id}`);
  revalidatePath("/super-admin/publishers");
}

export async function togglePublisherFeature(publisherId: string, key: PlatformFeatureKey, form: FormData) {
  const owner = await requireSuperAdmin();
  const actor = platformOwnerAuditActor(owner);
  if (!Object.values(PlatformFeatureKey).includes(key)) throw new Error("Unknown feature.");
  const [publisher, feature] = await Promise.all([
    prisma.publisher.findUnique({ where: { id: publisherId }, select: { id: true } }),
    prisma.featureDefinition.findUnique({ where: { key }, select: { id: true } }),
  ]);
  if (!publisher || !feature) {
    await recordTrustedDeniedAudit({ actor, action: "platform.publisher.feature.set", targetType: "PublisherFeature", reasonCode: "TARGET_NOT_FOUND", metadata: { featureKey: key, scope: "platform" } });
    throw new Error("Publisher or feature not found.");
  }
  const enabled = form.get("enabled") === "true";
  await runAuditedMutation({
    actor,
    action: "platform.publisher.feature.set",
    targetType: "PublisherFeature",
    targetId: `${publisher.id}:${feature.id}`,
    outcome: SecurityAuditOutcome.SUCCESS,
    metadata: { featureKey: key, enabled },
  }, (tx) => tx.publisherFeature.upsert({
    where: { publisherId_featureId: { publisherId, featureId: feature.id } },
    update: { enabled },
    create: { publisherId, featureId: feature.id, enabled },
  }));
  revalidatePath(`/super-admin/publishers/${publisherId}`);
  revalidatePath("/admin", "layout");
  revalidatePath("/school-dashboard", "layout");
  revalidatePath("/teacher-dashboard", "layout");
}
