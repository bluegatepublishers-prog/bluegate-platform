import "server-only";

import { prisma } from "@/lib/prisma";
import { parseStoredSmartBookReleaseManifest, type SmartBookReleaseManifestV2 } from "@/lib/smart-book-release-manifest";

export type PublishedSmartBookContent = {
  releaseId: string;
  releaseVersionId: string;
  versionNumber: number;
  manifest: SmartBookReleaseManifestV2;
  document: SmartBookReleaseManifestV2["contentDocument"];
  protectedPayload: import("@/lib/smart-book-release-protected").SmartBookProtectedReleasePayload;
};

type ReleaseVersionLookup = {
  publisherId: string;
  bookId: string;
  releaseVersionId: string;
  releaseId?: string;
};

export async function resolveSmartBookContentReleaseVersion(input: ReleaseVersionLookup): Promise<PublishedSmartBookContent | null> {
  const version = await prisma.contentReleaseVersion.findFirst({
    where: {
      id: input.releaseVersionId,
      releaseId: input.releaseId,
      publisherId: input.publisherId,
      bookId: input.bookId,
      targetType: "BOOK",
      targetId: input.bookId,
      lifecycle: "PUBLISHED",
      release: {
        publisherId: input.publisherId,
        bookId: input.bookId,
        targetType: "BOOK",
        targetId: input.bookId,
      },
    },
    select: {
      id: true,
      releaseId: true,
      versionNumber: true,
      snapshot: true,
    },
  });

  if (!version) return null;

  try {
    const storedManifest = parseStoredSmartBookReleaseManifest(version.snapshot);
    const { protected: _protected, ...manifest } = storedManifest;
    if (
      manifest.identity.publisherId !== input.publisherId ||
      manifest.identity.bookId !== input.bookId ||
      manifest.identity.targetId !== input.bookId
    ) {
      throw new Error("Manifest identity does not match the authorized Book.");
    }
    return {
      releaseId: version.releaseId,
      releaseVersionId: version.id,
      versionNumber: version.versionNumber,
      manifest,
      document: manifest.contentDocument,
      protectedPayload: storedManifest.protected,
    };
  } catch {
    return null;
  }
}

export async function resolvePublishedSmartBookContent(input: {
  publisherId: string;
  bookId: string;
}): Promise<PublishedSmartBookContent | null> {
  const release = await prisma.contentRelease.findUnique({
    where: {
      publisherId_targetType_targetId: {
        publisherId: input.publisherId,
        targetType: "BOOK",
        targetId: input.bookId,
      },
    },
    select: {
      id: true,
      lifecycle: true,
      currentVersionId: true,
    },
  });

  if (!release || release.lifecycle !== "PUBLISHED" || !release.currentVersionId) return null;
  return resolveSmartBookContentReleaseVersion({
    publisherId: input.publisherId,
    bookId: input.bookId,
    releaseId: release.id,
    releaseVersionId: release.currentVersionId,
  });
}

export async function hasPublishedSmartBookRelease(input: {
  publisherId: string;
  bookId: string;
}) {
  const release = await prisma.contentRelease.findUnique({
    where: {
      publisherId_targetType_targetId: {
        publisherId: input.publisherId,
        targetType: "BOOK",
        targetId: input.bookId,
      },
    },
    select: { lifecycle: true, currentVersionId: true },
  });
  return release?.lifecycle === "PUBLISHED" && Boolean(release.currentVersionId);
}