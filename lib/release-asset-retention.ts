import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { parseStoredSmartBookReleaseManifest, collectSmartBookManagedObjectKeys } from "@/lib/smart-book-release-manifest";

const MAX_RELEASE_VERSIONS_TO_SCAN = 5000;

/**
 * Retained release cleanup is a rare path. Keep the no-schema implementation
 * bounded, but compare exact normalized asset identities rather than searching
 * arbitrary snapshot text for a substring.
 */
export async function isObjectKeyProtectedByRelease(input: {
  publisherId: string;
  objectKey: string;
}) {
  const candidate = normalizeReference(input.objectKey);
  if (!candidate) return true;
  const versions = await prisma.contentReleaseVersion.findMany({
    where: {
      publisherId: input.publisherId,
      lifecycle: { in: ["PUBLISHED", "ARCHIVED"] },
    },
    select: { snapshot: true },
    take: MAX_RELEASE_VERSIONS_TO_SCAN + 1,
  });
  if (versions.length > MAX_RELEASE_VERSIONS_TO_SCAN) return true;
  return versions.some((version) => releaseReferences(version.snapshot, candidate));
}

function releaseReferences(snapshot: unknown, candidate: string) {
  if (isRecord(snapshot) && snapshot.schemaVersion === 2) {
    try {
      const manifest = parseStoredSmartBookReleaseManifest(snapshot);
      const references = new Set<string>(collectSmartBookManagedObjectKeys(manifest));
      for (const resource of manifest.assets.resources) addUrl(references, resource.storage?.value);
      for (const media of manifest.assets.media) addUrl(references, media.immutableReference?.value);
      for (const worksheet of manifest.protected.worksheets) addUrl(references, worksheet.answerKeyStorage?.value);
      return references.has(candidate);
    } catch {
      return true;
    }
  }
  // Keep legacy cleanup conservative without allowing substring false positives.
  return collectStringValues(snapshot).some((value) => normalizeReference(value) === candidate);
}

function addUrl(references: Set<string>, value: string | undefined) {
  const normalized = normalizeReference(value);
  if (normalized) references.add(normalized);
}

function normalizeReference(value: string | undefined) {
  if (!value?.trim()) return null;
  try { return normalizeAndValidateObjectKey(value); } catch { return value.trim(); }
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  if (isRecord(value)) return Object.values(value).flatMap(collectStringValues);
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
