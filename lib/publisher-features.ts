import "server-only";

import { notFound } from "next/navigation";
import { PlatformFeatureKey } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requirePublisherContext } from "@/lib/publisher-context";

export type SafeFeatureMap = Record<PlatformFeatureKey, boolean>;

const keys = Object.values(PlatformFeatureKey);

function createPlatformAvailabilityMap(defaultValue: boolean) {
  return Object.fromEntries(keys.map((key) => [key, defaultValue])) as SafeFeatureMap;
}

async function loadPlatformFeatureCatalogue() {
  try {
    const rows = await prisma.featureDefinition.findMany({
      select: { key: true, implemented: true, active: true },
    });
    return Object.fromEntries(
      rows.map((row) => [row.key, row.implemented && row.active]),
    ) as Partial<SafeFeatureMap>;
  } catch {
    return null as Partial<SafeFeatureMap> | null;
  }
}

export async function getPlatformFeatureAvailability(): Promise<SafeFeatureMap> {
  const catalogue = await loadPlatformFeatureCatalogue();
  if (!catalogue) return createPlatformAvailabilityMap(false);
  return { ...createPlatformAvailabilityMap(false), ...catalogue };
}

export async function getPublisherFeatures(publisherId: string): Promise<SafeFeatureMap> {
  const map = createPlatformAvailabilityMap(false);
  const rows = await prisma.publisherFeature.findMany({
    where: { publisherId, enabled: true, feature: { active: true, implemented: true } },
    select: { feature: { select: { key: true } } },
  });
  for (const row of rows) map[row.feature.key] = true;
  return map;
}

export async function isPublisherFeatureEnabled(publisherId: string, key: PlatformFeatureKey) {
  return Boolean(
    await prisma.publisherFeature.findFirst({
      where: { publisherId, enabled: true, feature: { key, active: true, implemented: true } },
      select: { id: true },
    }),
  );
}

export async function requirePublisherFeature(publisherId: string, key: PlatformFeatureKey) {
  if (!await isPublisherFeatureEnabled(publisherId, key)) notFound();
}

export async function resolveFeaturesForAuthenticatedUser() {
  const { publisher } = await requirePublisherContext();
  return getPublisherFeatures(publisher.id);
}

export const getSafePublisherFeatureMap = getPublisherFeatures;
