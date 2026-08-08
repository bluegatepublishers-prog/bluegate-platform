import "server-only";

import type { PlatformFeatureKey } from "@prisma/client";

import { effectiveSchoolAccessStatus } from "@/lib/school-access-policy";
import { getPublisherFeatures, getPlatformFeatureAvailability } from "@/lib/publisher-features";
import { prisma } from "@/lib/prisma";
import {
  getSchoolFeatureDefinition,
  getSchoolFeatureState,
  SCHOOL_FEATURE_DEFINITIONS,
  type SchoolFeatureKey,
} from "@/lib/school-feature-entitlements";
import { requireSchool } from "@/lib/school-dashboard";

const unavailableMessage = "This feature is not enabled for your school.";

export class SchoolFeatureAccessError extends Error {
  constructor() {
    super(unavailableMessage);
    this.name = "SchoolFeatureAccessError";
  }
}

type SchoolFeatureSchool = {
  id: string;
  publisherId: string | null;
};


async function getFeatureFacts(school: SchoolFeatureSchool) {
  const subscription = await prisma.schoolAccessSubscription.findUnique({
    where: { schoolId: school.id },
    select: { publisherId: true, featureConfig: true, plan: true, status: true, startsAt: true, expiresAt: true },
  });

  const definitions = SCHOOL_FEATURE_DEFINITIONS;
  if (!subscription || !school.publisherId || subscription.publisherId !== school.publisherId) {
    return { subscription, state: getSchoolFeatureState(null), publisherFeatures: null, platformFeatures: null, definitions };
  }

  const [publisherFeatures, platformFeatures] = await Promise.all([
    getPublisherFeatures(school.publisherId),
    getPlatformFeatureAvailability(),
  ]);
  return {
    subscription,
    state: getSchoolFeatureState(subscription),
    publisherFeatures,
    platformFeatures,
    definitions,
  };
}

export async function getSchoolFeatureAccessForSchool(school: SchoolFeatureSchool, key: SchoolFeatureKey) {
  const facts = await getFeatureFacts(school);
  const definition = getSchoolFeatureDefinition(key);
  const publisherFeature = definition?.publisherFeature as PlatformFeatureKey | undefined;
  const subscription = facts.subscription;
  const access = {
    key,
    allowed: Boolean(
      subscription &&
      publisherFeature &&
      facts.publisherFeatures?.[publisherFeature] &&
      facts.platformFeatures?.[publisherFeature] &&
      facts.state[key] &&
      effectiveSchoolAccessStatus(subscription) === "ACTIVE",
    ),
    message: unavailableMessage,
  };
  return access;
}

export async function getSchoolFeatureAccess(key: SchoolFeatureKey) {
  return getSchoolFeatureAccessForSchool(await requireSchool(), key);
}

export async function requireSchoolFeature(key: SchoolFeatureKey) {
  const access = await getSchoolFeatureAccess(key);
  if (!access.allowed) throw new SchoolFeatureAccessError();
  return access;
}

export async function getSchoolFeatureAccessMap(school: SchoolFeatureSchool) {
  const facts = await getFeatureFacts(school);
  const subscriptionActive = Boolean(facts.subscription && effectiveSchoolAccessStatus(facts.subscription) === "ACTIVE");
  return Object.fromEntries(
    facts.definitions.map((definition) => {
      const publisherFeature = definition.publisherFeature;
      return [definition.key, Boolean(subscriptionActive && facts.state[definition.key] && facts.publisherFeatures?.[publisherFeature] && facts.platformFeatures?.[publisherFeature])];
    }),
  ) as Record<SchoolFeatureKey, boolean>;
}
