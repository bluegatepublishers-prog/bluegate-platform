import "server-only";

import { auth } from "@/auth";
import { getBookEntitlementForAuthenticatedUser } from "@/lib/entitlements/book";
import { loadStudentIdentity } from "@/lib/student-identity";
import { prisma } from "@/lib/prisma";
import { isPublisherUploadUrl, uploadPrefixForScope } from "@/lib/storage/upload-policy";
import { normalizeAndValidateObjectKey, sanitizeFilenameForHeader } from "@/lib/storage/object-key";
import { parseStoredSmartBookReleaseManifest, type SmartBookManifestResource } from "@/lib/smart-book-release-manifest";

export type SmartBookReleaseAssetMode = "STUDENT" | "TEACHER";

export type ReleasedManagedAsset = {
  releaseVersionId: string;
  publisherId: string;
  bookId: string;
  resourceId: string;
  title: string;
  filename: string;
  contentType: string | null;
  storage:
    | { kind: "OBJECT_KEY"; key: string }
    | { kind: "MANAGED_URL"; url: string };
};

export async function resolveSmartBookReleaseAsset(input: {
  releaseVersionId: string;
  resourceId: string;
  mode: SmartBookReleaseAssetMode;
}): Promise<ReleasedManagedAsset | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || user.role !== input.mode) return null;

  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, active: true },
  });
  if (!currentUser?.active || currentUser.role !== input.mode) return null;

  const version = await prisma.contentReleaseVersion.findFirst({
    where: {
      id: input.releaseVersionId,
      lifecycle: "PUBLISHED",
      targetType: "BOOK",
      targetId: { not: "" },
    },
    select: { id: true, publisherId: true, bookId: true, targetId: true, snapshot: true },
  });
  if (!version || version.targetId !== version.bookId) return null;

  let manifest;
  try {
    manifest = parseStoredSmartBookReleaseManifest(version.snapshot);
  } catch {
    return null;
  }
  if (
    manifest.identity.publisherId !== version.publisherId ||
    manifest.identity.bookId !== version.bookId ||
    manifest.identity.targetId !== version.bookId
  ) return null;

  const authorized = input.mode === "STUDENT"
    ? await authorizeStudentBook(user.id, user.publisherId ?? null, version.publisherId, version.bookId)
    : await authorizeTeacherBook(user.id, user.publisherId ?? null, version.publisherId, version.bookId);
  if (!authorized) return null;

  const resource = manifest.assets.resources.find((item) => item.sourceId === input.resourceId);
  if (!resource || !isAudienceAllowed(resource, input.mode)) return null;
  const storage = resolveManagedStorage(resource, version.publisherId);
  if (!storage) return null;

  return {
    releaseVersionId: version.id,
    publisherId: version.publisherId,
    bookId: version.bookId,
    resourceId: resource.sourceId,
    title: resource.title,
    filename: sanitizeFilenameForHeader(resource.title || "resource"),
    contentType: resource.mimeType,
    storage,
  };
}

async function authorizeStudentBook(userId: string, sessionPublisherId: string | null, publisherId: string, bookId: string) {
  const identity = await loadStudentIdentity(userId, "STUDENT", sessionPublisherId);
  if (!identity.ok || identity.value.publisher.id !== publisherId) return false;
  const decision = await getBookEntitlementForAuthenticatedUser(
    { id: userId, role: "STUDENT" },
    {
      bookId,
      academicYearId: identity.value.enrollment.academicYearId,
      sectionId: identity.value.enrollment.sectionId,
    },
  );
  return decision.allowed;
}

async function authorizeTeacherBook(userId: string, sessionPublisherId: string | null, publisherId: string, bookId: string) {
  if (sessionPublisherId && sessionPublisherId !== publisherId) return false;
  const decision = await getBookEntitlementForAuthenticatedUser({ id: userId, role: "TEACHER" }, { bookId });
  return decision.allowed;
}

function isAudienceAllowed(resource: SmartBookManifestResource, mode: SmartBookReleaseAssetMode) {
  const audience = resource.audience.trim().toUpperCase();
  return mode === "STUDENT"
    ? audience === "STUDENT" || audience === "BOTH"
    : audience === "TEACHER_ONLY" || audience === "BOTH";
}

function resolveManagedStorage(resource: SmartBookManifestResource, publisherId: string): ReleasedManagedAsset["storage"] | null {
  const reference = resource.storage;
  if (!reference) return null;
  if (reference.kind === "OBJECT_KEY") {
    let key: string;
    try { key = normalizeAndValidateObjectKey(reference.value); } catch { return null; }
    if (!key.startsWith(`${uploadPrefixForScope("resource-file")}/${publisherId}/`)) return null;
    return { kind: "OBJECT_KEY", key };
  }
  if ((reference.kind === "MANAGED_URL" || reference.kind === "LEGACY_URL") && isPublisherUploadUrl(reference.value, publisherId, ["resource-file"])) {
    return { kind: "MANAGED_URL", url: reference.value };
  }
  return null;
}
