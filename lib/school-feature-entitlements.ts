import "server-only";

import { PlatformFeatureKey, Prisma, SecurityAuditOutcome } from "@prisma/client";

import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { getPlatformFeatureAvailability, isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { prisma } from "@/lib/prisma";
import {
  publisherAdminAuditActor,
  writeSecurityAuditEvent,
} from "@/lib/security-audit";

export const SCHOOL_FEATURE_DEFINITIONS = [
  {
    key: "PARENT_PORTAL",
    label: "Parent Portal",
    category: "Communication",
    publisherFeature: PlatformFeatureKey.PARENT_PORTAL,
  },
  {
    key: "MENTOR_PORTAL",
    label: "Mentor Portal",
    category: "Communication",
    publisherFeature: PlatformFeatureKey.TUTOR_PLATFORM,
  },
  {
    key: "ATTENDANCE",
    label: "Attendance",
    category: "Academic",
    publisherFeature: PlatformFeatureKey.ATTENDANCE,
  },
  {
    key: "PLANNER",
    label: "Planner",
    category: "Academic",
    publisherFeature: PlatformFeatureKey.CALENDAR,
  },
  {
    key: "HOMEWORK",
    label: "Homework",
    category: "Academic",
    publisherFeature: PlatformFeatureKey.HOMEWORK,
  },
  {
    key: "ASSESSMENTS",
    label: "Assessments",
    category: "Academic",
    publisherFeature: PlatformFeatureKey.ASSESSMENTS,
  },
  {
    key: "TIMETABLE",
    label: "Timetable",
    category: "Academic",
    publisherFeature: PlatformFeatureKey.TIMETABLE,
  },
  {
    key: "ANNOUNCEMENTS",
    label: "Announcements",
    category: "Communication",
    publisherFeature: PlatformFeatureKey.NOTIFICATIONS,
  },
  {
    key: "TEACHER_RESOURCES",
    label: "Teacher Resources",
    category: "Resources",
    publisherFeature: PlatformFeatureKey.RESOURCES,
  },
  {
    key: "STUDENT_RESOURCES",
    label: "Student Resources",
    category: "Resources",
    publisherFeature: PlatformFeatureKey.RESOURCES,
  },
  {
    key: "PARENT_RESOURCES",
    label: "Parent Resources",
    category: "Resources",
    publisherFeature: PlatformFeatureKey.RESOURCES,
  },
  {
    key: "DIGITAL_LIBRARY",
    label: "Digital Library",
    category: "Resources",
    publisherFeature: PlatformFeatureKey.RESOURCES,
  },
  {
    key: "QR_LEARNING",
    label: "QR Learning",
    category: "Resources",
    publisherFeature: PlatformFeatureKey.INTERACTIVE_QUIZZES,
  },
  {
    key: "AI_LESSON_PLANNER",
    label: "AI Lesson Planner",
    category: "AI",
    publisherFeature: PlatformFeatureKey.AI_STUDIO,
  },
  {
    key: "AI_QUESTION_PAPER",
    label: "AI Question Paper",
    category: "AI",
    publisherFeature: PlatformFeatureKey.AI_STUDIO,
  },
  {
    key: "AI_WORKSHEET_GENERATOR",
    label: "AI Worksheet Generator",
    category: "AI",
    publisherFeature: PlatformFeatureKey.AI_STUDIO,
  },
  {
    key: "REPORTS",
    label: "Reports",
    category: "Administration",
    publisherFeature: PlatformFeatureKey.REPORTS,
  },
  {
    key: "ANALYTICS",
    label: "Analytics",
    category: "Administration",
    publisherFeature: PlatformFeatureKey.GAP_ANALYSIS,
  },
  {
    key: "NOTIFICATIONS",
    label: "Notifications",
    category: "Administration",
    publisherFeature: PlatformFeatureKey.NOTIFICATIONS,
  },
] as const;

export type SchoolFeatureKey = (typeof SCHOOL_FEATURE_DEFINITIONS)[number]["key"];
export type SchoolFeatureDefinition = (typeof SCHOOL_FEATURE_DEFINITIONS)[number];
export type SchoolFeatureState = Partial<Record<SchoolFeatureKey, boolean>>;
export type SchoolFeatureInput = Partial<Record<SchoolFeatureKey, boolean>> | null | undefined;

const FEATURE_KEYS = SCHOOL_FEATURE_DEFINITIONS.map((definition) => definition.key) as SchoolFeatureKey[];
const PUBLISHER_FEATURE_BY_SCHOOL_FEATURE = new Map<SchoolFeatureKey, PlatformFeatureKey>(
  SCHOOL_FEATURE_DEFINITIONS.map((definition) => [definition.key, definition.publisherFeature]),
);

type SchoolFeatureConfigRow = {
  featureConfig?: Prisma.JsonValue | null;
};

function asBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function normalizeFeatureConfig(value: Prisma.JsonValue | null | undefined): SchoolFeatureState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const row = value as Record<string, unknown>;
  const normalized: SchoolFeatureState = {};
  for (const key of FEATURE_KEYS) {
    if (asBoolean(row[key])) {
      normalized[key] = row[key];
    }
  }
  return normalized;
}

export function getSchoolFeatureState(row: SchoolFeatureConfigRow | null | undefined): Record<SchoolFeatureKey, boolean> {
  const normalized = normalizeFeatureConfig(row?.featureConfig);
  return Object.fromEntries(FEATURE_KEYS.map((key) => [key, normalized[key] ?? false])) as Record<SchoolFeatureKey, boolean>;
}

export function isSchoolFeatureEnabled(row: SchoolFeatureConfigRow | null | undefined, key: SchoolFeatureKey) {
  return getSchoolFeatureState(row)[key];
}

export async function isSchoolFeatureAvailableForPublisher(publisherId: string, key: SchoolFeatureKey) {
  const platformAvailability = await getPlatformFeatureAvailability();
  const publisherFeature = PUBLISHER_FEATURE_BY_SCHOOL_FEATURE.get(key);
  return Boolean(publisherFeature && platformAvailability[publisherFeature]);
}

function diffFeatureKeys(current: Record<SchoolFeatureKey, boolean>, next: Record<SchoolFeatureKey, boolean>) {
  return FEATURE_KEYS.filter((key) => current[key] !== next[key]);
}

export async function updatePublisherSchoolFeatures(
  schoolId: string,
  input: SchoolFeatureInput,
) {
  const actor = await requireLivePublisherAdmin();
  const school = await prisma.school.findFirst({
    where: { id: schoolId, publisherId: actor.publisherId },
    select: {
      id: true,
      publisherId: true,
      accessSubscription: {
        select: {
          id: true,
          featureConfig: true,
          plan: true,
          status: true,
          startsAt: true,
          expiresAt: true,
        },
      },
    },
  });
  if (!school) {
    throw new Error("School not found.");
  }
  if (!school.accessSubscription) {
    throw new Error("Set the access plan before configuring platform features.");
  }
  const subscriptionId = school.accessSubscription.id;

  const current = getSchoolFeatureState(school.accessSubscription);
  const next: Record<SchoolFeatureKey, boolean> = { ...current };

  for (const key of FEATURE_KEYS) {
    if (!input || !Object.prototype.hasOwnProperty.call(input, key)) continue;
    const enabled = Boolean(input[key]);
    if (enabled && current[key] !== enabled) {
      const publisherFeature = PUBLISHER_FEATURE_BY_SCHOOL_FEATURE.get(key);
      if (!publisherFeature || !(await isPublisherFeatureEnabled(actor.publisherId, publisherFeature))) {
        throw new Error(`"${SCHOOL_FEATURE_DEFINITIONS.find((definition) => definition.key === key)?.label ?? key}" is disabled by the publisher.`);
      }
    }
    next[key] = enabled;
  }

  const changedKeys = diffFeatureKeys(current, next);
  if (!changedKeys.length) {
    return school.accessSubscription;
  }

  return prisma.$transaction(async (tx) => {
    const subscription = await tx.schoolAccessSubscription.update({
      where: { id: subscriptionId },
      data: { featureConfig: next },
    });

    for (const key of changedKeys) {
      const enabled = next[key];
      await writeSecurityAuditEvent(tx, {
        actor: publisherAdminAuditActor(actor),
        action: enabled ? "publisher.school_feature.enable" : "publisher.school_feature.disable",
        targetType: "SchoolAccessSubscription",
        targetId: subscription.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { featureKey: key, enabled, scope: "school_feature_entitlement" },
      });
    }

    return subscription;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function getSchoolFeatureDefinition(key: SchoolFeatureKey) {
  return SCHOOL_FEATURE_DEFINITIONS.find((definition) => definition.key === key) ?? null;
}

export function getSchoolFeatureDefinitionsByCategory() {
  const grouped = new Map<string, SchoolFeatureDefinition[]>();
  for (const definition of SCHOOL_FEATURE_DEFINITIONS) {
    const rows = grouped.get(definition.category) ?? [];
    rows.push(definition);
    grouped.set(definition.category, rows);
  }
  return [...grouped.entries()].map(([category, features]) => ({ category, features }));
}
