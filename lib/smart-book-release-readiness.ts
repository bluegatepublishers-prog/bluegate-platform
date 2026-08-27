import { normalizeContentDocument } from "@/lib/content-document";
import {
  buildSmartBookReleaseManifestFromDatabase,
  collectSmartBookManagedObjectKeys,
  SmartBookManifestError,
  type SmartBookStoredReleaseManifestV2,
  type SmartBookReleaseManifestV2,
} from "@/lib/smart-book-release-manifest";
import { prisma } from "@/lib/prisma";
import { isPublisherUploadUrl } from "@/lib/storage/upload-policy";

export const SMART_BOOK_READINESS_ISSUE_CODES = [
  "BOOK_NOT_FOUND",
  "IMMUTABLE_PDF_VERSION_MISSING",
  "PDF_POINTER_INVALID",
  "PDF_PAGE_COUNT_MISMATCH",
  "STALE_QUESTION_REFERENCE",
  "STALE_GROUP_REFERENCE",
  "STALE_RESOURCE_REFERENCE",
  "INVALID_HIERARCHY",
  "CROSS_BOOK_DEPENDENCY",
  "CROSS_PUBLISHER_DEPENDENCY",
  "UNSUPPORTED_DEPENDENCY",
  "MISSING_MANAGED_OBJECT",
  "INVALID_MANAGED_OBJECT",
  "UNSUPPORTED_EXTERNAL_REFERENCE",
  "EXTERNAL_VIDEO_REFERENCE",
] as const;

export type SmartBookReadinessIssueCode = (typeof SMART_BOOK_READINESS_ISSUE_CODES)[number];

export type SmartBookReadinessIssue = {
  code: SmartBookReadinessIssueCode;
  message: string;
};

export type SmartBookReadinessSummary = {
  hierarchyCount: number;
  dependencyCount: number;
  assetCounts: Record<"resources" | "media" | "activities" | "worksheets" | "assessments" | "questions", number>;
};

export type SmartBookReleaseReadiness =
  | {
      status: "READY";
      issues: [];
       summary: SmartBookReadinessSummary;
       warnings: SmartBookReadinessIssue[];
    }
  | {
      status: "BLOCKED";
      issues: [SmartBookReadinessIssue, ...SmartBookReadinessIssue[]];
    };

export type SmartBookReleasePreparation =
  | {
      status: "READY";
       manifest: SmartBookReleaseManifestV2;
       summary: SmartBookReadinessSummary;
       warnings: SmartBookReadinessIssue[];
    }
  | {
      status: "BLOCKED";
      issues: [SmartBookReadinessIssue, ...SmartBookReadinessIssue[]];
    };

const SAFE_MESSAGES: Record<SmartBookReadinessIssueCode, string> = {
  BOOK_NOT_FOUND: "The selected Smart Book is unavailable.",
  IMMUTABLE_PDF_VERSION_MISSING: "An immutable PDF version is required before this Smart Book can use the new release format. Save or re-upload the full Book PDF first.",
  PDF_POINTER_INVALID: "The current full Book PDF pointer is invalid. Save or re-upload the full Book PDF before checking readiness.",
  PDF_PAGE_COUNT_MISMATCH: "The current full Book PDF does not match its immutable page-count record. Re-validate the full Book PDF before checking readiness.",
  STALE_QUESTION_REFERENCE: "Smart Book readiness is blocked because some linked questions are no longer available. Open the affected activity, save valid questions, and try again.",
  STALE_GROUP_REFERENCE: "Smart Book readiness is blocked because a linked exercise group is no longer available. Open the affected activity, save valid questions, and try again.",
  STALE_RESOURCE_REFERENCE: "Smart Book readiness is blocked because a linked resource is no longer available. Open the affected content and save a valid resource before trying again.",
  INVALID_HIERARCHY: "Smart Book readiness is blocked by an invalid chapter, module, page-range, or hierarchy relationship.",
  CROSS_BOOK_DEPENDENCY: "Smart Book readiness is blocked because linked content belongs to a different Book.",
  CROSS_PUBLISHER_DEPENDENCY: "Smart Book readiness is blocked because linked content is outside this Publisher.",
  UNSUPPORTED_DEPENDENCY: "Smart Book readiness is blocked because linked content uses an unsupported release dependency.",
  MISSING_MANAGED_OBJECT: "Smart Book readiness is blocked because a required file is missing from managed storage.",
  INVALID_MANAGED_OBJECT: "Smart Book readiness is blocked because a required file has an invalid managed storage identity.",
  UNSUPPORTED_EXTERNAL_REFERENCE: "Smart Book readiness is blocked because a controlled Smart Book resource uses an unsupported external file URL.",
  EXTERNAL_VIDEO_REFERENCE: "This Smart Book includes an external video reference; Edora does not guarantee third-party video bytes.",
};

function readinessSummary(manifest: SmartBookReleaseManifestV2): SmartBookReadinessSummary {
  return {
    hierarchyCount: manifest.hierarchy.length,
    dependencyCount: manifest.dependencies.length,
    assetCounts: {
      resources: manifest.assets.resources.length,
      media: manifest.assets.media.length,
      activities: manifest.assets.activities.length,
      worksheets: manifest.assets.worksheets.length,
      assessments: manifest.assets.assessments.length,
      questions: manifest.assets.questions.length,
    },
  };
}

export function classifySmartBookReadinessError(error: unknown): SmartBookReadinessIssue {
  const message = error instanceof SmartBookManifestError || error instanceof Error ? error.message : "";
  let code: SmartBookReadinessIssueCode = "UNSUPPORTED_DEPENDENCY";

  if (/Book is not owned|selected Book is unavailable/i.test(message)) code = "BOOK_NOT_FOUND";
  else if (/page count does not match/i.test(message)) code = "PDF_PAGE_COUNT_MISMATCH";
  else if (/current Book PDF pointer is invalid|outside the Publisher storage scope/i.test(message)) code = "PDF_POINTER_INVALID";
  else if (/immutable (Book )?PDF version|active immutable BookPdfVersion/i.test(message)) code = "IMMUTABLE_PDF_VERSION_MISSING";
  else if (/Referenced question dependency is unavailable/i.test(message)) code = "STALE_QUESTION_REFERENCE";
  else if (/Referenced exercise group dependency is unavailable/i.test(message)) code = "STALE_GROUP_REFERENCE";
  else if (/Referenced resource dependency is unavailable/i.test(message)) code = "STALE_RESOURCE_REFERENCE";
  else if (/belongs to another Book/i.test(message)) code = "CROSS_BOOK_DEPENDENCY";
  else if (/authorized publisher|outside this Publisher/i.test(message)) code = "CROSS_PUBLISHER_DEPENDENCY";
  else if (/missing from managed storage|object was not found/i.test(message)) code = "MISSING_MANAGED_OBJECT";
  else if (/invalid managed storage|managed object key/i.test(message)) code = "INVALID_MANAGED_OBJECT";
  else if (/external file URL|unsupported external/i.test(message)) code = "UNSUPPORTED_EXTERNAL_REFERENCE";
  else if (/hierarchy|parent|orphan|page range|relationship/i.test(message)) code = "INVALID_HIERARCHY";

  return { code, message: SAFE_MESSAGES[code] };
}

export async function prepareSmartBookReleaseManifest(input: {
  publisherId: string;
  bookId: string;
}): Promise<SmartBookReleasePreparation> {
  const book = await prisma.book.findFirst({
    where: { id: input.bookId, publisherId: input.publisherId },
    select: { content: true },
  });
  if (!book) {
    return {
      status: "BLOCKED",
      issues: [{ code: "BOOK_NOT_FOUND", message: SAFE_MESSAGES.BOOK_NOT_FOUND }],
    };
  }

  try {
    const manifest = await buildSmartBookReleaseManifestFromDatabase({
      publisherId: input.publisherId,
      bookId: input.bookId,
      document: normalizeContentDocument(book.content),
    });
    const warnings = await assertRequiredManagedObjects(manifest, input.publisherId);
    return { status: "READY", manifest, summary: readinessSummary(manifest), warnings };
  } catch (error) {
    return { status: "BLOCKED", issues: [classifySmartBookReadinessError(error)] };
  }
}

async function assertRequiredManagedObjects(manifest: SmartBookStoredReleaseManifestV2, publisherId: string): Promise<SmartBookReadinessIssue[]> {
  const { getStorageProvider } = await import("@/lib/storage/provider");
  const warnings: SmartBookReadinessIssue[] = [];
  for (const resource of manifest.assets.resources) {
    if (resource.storage?.kind === "EXTERNAL_REFERENCE") throw new SmartBookManifestError("A controlled Smart Book resource uses an unsupported external file URL.");
    if (resource.storage?.kind === "LEGACY_URL" && !isPublisherUploadUrl(resource.storage.value, publisherId, ["resource-file"])) throw new SmartBookManifestError("A controlled Smart Book resource uses an unsupported external file URL.");
  }
  for (const worksheet of manifest.protected.worksheets) {
    const reference = worksheet.answerKeyStorage;
    if (reference?.kind === "EXTERNAL_REFERENCE") throw new SmartBookManifestError("Protected answer-key storage must be managed.");
    if ((reference?.kind === "MANAGED_URL" || reference?.kind === "LEGACY_URL") && !isPublisherUploadUrl(reference.value, publisherId, ["resource-file"])) throw new SmartBookManifestError("Managed storage URL is outside the Publisher storage scope.");
  }
  const references = [
    { kind: "OBJECT_KEY" as const, value: manifest.pdf.objectKey },
    ...manifest.assets.resources.flatMap((resource) => resource.storage ? [resource.storage] : []),
    ...manifest.assets.media.flatMap((media) => media.immutableReference ? [media.immutableReference] : []),
    ...manifest.protected.worksheets.flatMap((worksheet) => worksheet.answerKeyStorage ? [worksheet.answerKeyStorage] : []),
  ];
  if (manifest.assets.media.some((media) => media.targetType === "VIDEO_LESSON" && media.immutableReference?.kind === "EXTERNAL_REFERENCE")) warnings.push({ code: "EXTERNAL_VIDEO_REFERENCE", message: SAFE_MESSAGES.EXTERNAL_VIDEO_REFERENCE });
  const keys = collectSmartBookManagedObjectKeys(manifest);
  if (keys.length > 1000 || references.length > 2000) throw new SmartBookManifestError("Smart Book release contains too many storage references.");
  const provider = getStorageProvider();
  const checks = new Map<string, Promise<boolean>>();
  for (const key of keys) checks.set(`key:${key}`, provider.headObject({ key }).then(Boolean));
  for (const reference of references) {
    if (reference.kind !== "MANAGED_URL" && reference.kind !== "LEGACY_URL") continue;
    if (!isPublisherUploadUrl(reference.value, publisherId, ["resource-file"])) throw new SmartBookManifestError("Managed storage URL is outside the Publisher storage scope.");
    checks.set(`url:${reference.value}`, fetch(reference.value, { method: "HEAD", redirect: "error", cache: "no-store" }).then((response) => response.ok).catch(() => false));
  }
  const results = await Promise.all([...checks.entries()]);
  if (results.some(([, exists]) => !exists)) throw new SmartBookManifestError("A required managed object was not found.");
  return warnings;
}

export async function validateSmartBookReleaseReadiness(input: {
  publisherId: string;
  bookId: string;
}): Promise<SmartBookReleaseReadiness> {
  const prepared = await prepareSmartBookReleaseManifest(input);
  if (prepared.status === "BLOCKED") return prepared;
  return { status: "READY", issues: [], summary: prepared.summary, warnings: prepared.warnings };
}
