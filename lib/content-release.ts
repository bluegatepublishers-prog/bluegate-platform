import "server-only";

import { createHash } from "node:crypto";
import { ContentReleaseLifecycle, ContentReleaseTargetType, Prisma } from "@prisma/client";

import type { BookStructureNodeType } from "@/lib/book-structure-management";
import {
  isLinkedAssetBlock,
  isMediaBlock,
  isTextBlock,
  normalizeContentDocument,
  type ContentDocument,
} from "@/lib/content-document";
import {
  getContentNodeScope,
  validateLinkedAssetDocument,
} from "@/lib/content-linked-assets";
import { validateKnowledgeDocument } from "@/lib/content-knowledge";
import { validateMediaDocument } from "@/lib/content-media";
import { getV2AssessmentLauncherPayload } from "@/lib/v2-assessment-launcher";
import { prisma } from "@/lib/prisma";

export type ReleaseActor = {
  userId: string;
  publisherId: string;
};

export type ReleaseValidationMessage = {
  severity: "ERROR" | "WARNING" | "INFO";
  code: string;
  message: string;
};

export type ReleaseValidationResult = {
  errors: ReleaseValidationMessage[];
  warnings: ReleaseValidationMessage[];
  info: ReleaseValidationMessage[];
};

export type ReleaseSummary = {
  releaseId: string | null;
  targetType: ContentReleaseTargetType;
  targetId: string;
  lifecycle: ContentReleaseLifecycle;
  currentVersionNumber: number | null;
  latestVersionNumber: number;
  lastPublishedAt: string | null;
  draftChanged: boolean;
  validation: ReleaseValidationResult;
  history: {
    id: string;
    versionNumber: number;
    lifecycle: ContentReleaseLifecycle;
    checksum: string;
    releaseNotes: string | null;
    publishedAt: string | null;
    createdAt: string;
  }[];
};

export type ReleaseSnapshot = {
  schemaVersion: 1;
  targetType: ContentReleaseTargetType;
  targetId: string;
  bookId: string | null;
  title: string;
  record: Record<string, unknown>;
  contentDocument?: ContentDocument;
};

type SnapshotQuestionLauncher = {
  exerciseId: string;
  groupId: string;
  questionType: string;
  questionIds: string[];
};

export type SnapshotDependencyIds = {
  resourceIds: string[];
  exerciseIds: string[];
  questionLaunchers: SnapshotQuestionLauncher[];
};

export type ReleaseVersionPreview = {
  versionId: string;
  releaseId: string;
  targetType: ContentReleaseTargetType;
  targetId: string;
  title: string;
  versionNumber: number;
  lifecycle: ContentReleaseLifecycle;
  releaseNotes: string | null;
  checksum: string;
  publishedAt: string | null;
  createdAt: string;
  document: ContentDocument | null;
  compare: ReleaseComparisonSummary;
};

export type ReleaseComparisonSummary = {
  draftBlockCount: number;
  versionBlockCount: number;
  addedBlocks: number;
  removedBlocks: number;
  changedBlocks: number;
  linkedAssetChanges: number;
  knowledgeReferenceChanges: number;
};

const hierarchyTargetMap: Partial<Record<BookStructureNodeType, ContentReleaseTargetType>> = {
  CHAPTER: "CHAPTER",
  MODULE: "MODULE",
  TOPIC: "TOPIC",
};

export async function loadReleaseSummary(input: {
  actor: ReleaseActor;
  bookId: string;
  targetType: ContentReleaseTargetType;
  targetId: string;
}): Promise<ReleaseSummary> {
  const snapshot = await buildTargetSnapshot(input.actor.publisherId, input.bookId, input.targetType, input.targetId);
  const checksum = checksumJson(snapshot);
  const [release, validation] = await Promise.all([
    prisma.contentRelease.findUnique({
      where: {
        publisherId_targetType_targetId: {
          publisherId: input.actor.publisherId,
          targetType: input.targetType,
          targetId: input.targetId,
        },
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 8,
          select: {
            id: true,
            versionNumber: true,
            lifecycle: true,
            checksum: true,
            releaseNotes: true,
            publishedAt: true,
            createdAt: true,
          },
        },
      },
    }),
    validateReleaseTarget(input.actor.publisherId, input.bookId, input.targetType, input.targetId),
  ]);
  const current = release?.currentVersionId
    ? release.versions.find((version) => version.id === release.currentVersionId) ??
      await prisma.contentReleaseVersion.findUnique({
        where: { id: release.currentVersionId },
        select: { versionNumber: true, checksum: true },
      })
    : null;
  return {
    releaseId: release?.id ?? null,
    targetType: input.targetType,
    targetId: input.targetId,
    lifecycle: release?.lifecycle ?? "DRAFT",
    currentVersionNumber: current?.versionNumber ?? null,
    latestVersionNumber: release?.latestVersionNumber ?? 0,
    lastPublishedAt: release?.lastPublishedAt?.toISOString() ?? null,
    draftChanged: checksum !== (current?.checksum ?? ""),
    validation,
    history: release?.versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      lifecycle: version.lifecycle,
      checksum: version.checksum,
      releaseNotes: version.releaseNotes,
      publishedAt: version.publishedAt?.toISOString() ?? null,
      createdAt: version.createdAt.toISOString(),
    })) ?? [],
  };
}

export async function transitionRelease(input: {
  actor: ReleaseActor;
  bookId: string;
  targetType: ContentReleaseTargetType;
  targetId: string;
  action: "SUBMIT_REVIEW" | "RETURN_DRAFT" | "APPROVE" | "PUBLISH" | "UNPUBLISH" | "ARCHIVE" | "RESTORE";
  releaseNotes?: string | null;
  confirm?: boolean;
}) {
  if (["PUBLISH", "UNPUBLISH", "ARCHIVE"].includes(input.action) && !input.confirm) {
    throw new Error("Explicit confirmation is required for this release action.");
  }
  const snapshot = await buildTargetSnapshot(input.actor.publisherId, input.bookId, input.targetType, input.targetId);
  const validation = await validateReleaseTarget(input.actor.publisherId, input.bookId, input.targetType, input.targetId);
  if (input.action === "PUBLISH" && validation.errors.length) {
    throw new Error(validation.errors[0]?.message ?? "Publishing validation failed.");
  }
  const checksum = checksumJson(snapshot);
  const now = new Date();
  if (input.action === "UNPUBLISH" || input.action === "ARCHIVE") {
    await assertNoPublishedDependents(
      input.actor.publisherId,
      input.bookId,
      input.targetType,
      input.targetId,
    );
  }
  return prisma.$transaction(async (tx) => {
    const release = await upsertRelease(tx, input.actor.publisherId, input.bookId, input.targetType, input.targetId);
    if (input.action === "UNPUBLISH") {
      await updateLegacyPublishedFlag(tx, input.actor.publisherId, input.bookId, input.targetType, input.targetId, false);
      return tx.contentRelease.update({
        where: { id: release.id },
        data: { lifecycle: "DRAFT", currentVersionId: null, unpublishedAt: now },
      });
    }
    if (input.action === "ARCHIVE") {
      await updateLegacyPublishedFlag(tx, input.actor.publisherId, input.bookId, input.targetType, input.targetId, false);
      return tx.contentRelease.update({
        where: { id: release.id },
        data: { lifecycle: "ARCHIVED", currentVersionId: null, archivedAt: now },
      });
    }
    if (input.action === "RESTORE") {
      return tx.contentRelease.update({
        where: { id: release.id },
        data: { lifecycle: "DRAFT", archivedAt: null },
      });
    }
    if (input.action === "SUBMIT_REVIEW") {
      return tx.contentRelease.update({
        where: { id: release.id },
        data: { lifecycle: "IN_REVIEW", draftChecksum: checksum, lastValidatedAt: now },
      });
    }
    if (input.action === "RETURN_DRAFT") {
      return tx.contentRelease.update({
        where: { id: release.id },
        data: { lifecycle: "DRAFT", draftChecksum: checksum },
      });
    }
    if (input.action === "APPROVE") {
      return tx.contentRelease.update({
        where: { id: release.id },
        data: { lifecycle: "APPROVED", draftChecksum: checksum, lastValidatedAt: now },
      });
    }

    const currentVersion = release.currentVersionId
      ? await tx.contentReleaseVersion.findUnique({ where: { id: release.currentVersionId }, select: { id: true } })
      : null;
    const versionNumber = release.latestVersionNumber + 1;
    const version = await tx.contentReleaseVersion.create({
      data: {
        releaseId: release.id,
        publisherId: input.actor.publisherId,
        bookId: input.bookId,
        targetType: input.targetType,
        targetId: input.targetId,
        versionNumber,
        lifecycle: "PUBLISHED",
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        dependencies: collectDependencies(snapshot) as Prisma.InputJsonValue,
        releaseNotes: input.releaseNotes?.trim() || null,
        checksum,
        previousVersionId: currentVersion?.id ?? null,
        createdById: input.actor.userId,
        approvedById: input.actor.userId,
        publishedById: input.actor.userId,
        approvedAt: now,
        publishedAt: now,
      },
    });
    await updateLegacyPublishedFlag(tx, input.actor.publisherId, input.bookId, input.targetType, input.targetId, true);
    await publishSnapshotDependencies(tx, input.actor.publisherId, input.bookId, snapshot);
    return tx.contentRelease.update({
      where: { id: release.id },
      data: {
        lifecycle: "PUBLISHED",
        currentVersionId: version.id,
        latestVersionNumber: versionNumber,
        draftChecksum: checksum,
        lastValidatedAt: now,
        lastPublishedAt: now,
        unpublishedAt: null,
      },
    });
  });
}

export async function rollbackRelease(input: {
  actor: ReleaseActor;
  bookId: string;
  targetType: ContentReleaseTargetType;
  targetId: string;
  versionId: string;
  releaseNotes?: string | null;
  confirm?: boolean;
}) {
  if (!input.confirm) throw new Error("Explicit confirmation is required for rollback.");
  const version = await prisma.contentReleaseVersion.findFirst({
    where: {
      id: input.versionId,
      publisherId: input.actor.publisherId,
      bookId: input.bookId,
      targetType: input.targetType,
      targetId: input.targetId,
      lifecycle: "PUBLISHED",
    },
  });
  if (!version) throw new Error("Release version not found.");
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const release = await upsertRelease(tx, input.actor.publisherId, input.bookId, input.targetType, input.targetId);
    const versionNumber = release.latestVersionNumber + 1;
    const next = await tx.contentReleaseVersion.create({
      data: {
        releaseId: release.id,
        publisherId: input.actor.publisherId,
        bookId: input.bookId,
        targetType: input.targetType,
        targetId: input.targetId,
        versionNumber,
        lifecycle: "PUBLISHED",
        snapshot: version.snapshot as Prisma.InputJsonValue,
        dependencies: version.dependencies as Prisma.InputJsonValue,
        releaseNotes: input.releaseNotes?.trim() || `Rollback to v${version.versionNumber}`,
        checksum: version.checksum,
        previousVersionId: release.currentVersionId,
        rollbackFromId: version.id,
        createdById: input.actor.userId,
        approvedById: input.actor.userId,
        publishedById: input.actor.userId,
        approvedAt: now,
        publishedAt: now,
      },
    });
    await updateLegacyPublishedFlag(tx, input.actor.publisherId, input.bookId, input.targetType, input.targetId, true);
    return tx.contentRelease.update({
      where: { id: release.id },
      data: {
        lifecycle: "PUBLISHED",
        currentVersionId: next.id,
        latestVersionNumber: versionNumber,
        lastPublishedAt: now,
      },
    });
  });
}

export async function bulkPublishRelease(input: {
  actor: ReleaseActor;
  bookId: string;
  targetType: "BOOK" | "CHAPTER";
  targetId: string;
  releaseNotes?: string | null;
  confirm?: boolean;
}) {
  if (!input.confirm) throw new Error("Explicit confirmation is required for bulk publish.");
  const targets = await resolveBulkTargets(input.actor.publisherId, input.bookId, input.targetType, input.targetId);
  const validations = await Promise.all(
    targets.map((target) => validateReleaseTarget(input.actor.publisherId, input.bookId, target.targetType, target.targetId)),
  );
  const firstError = validations.flatMap((result) => result.errors)[0];
  if (firstError) throw new Error(firstError.message);
  for (const target of targets) {
    await transitionRelease({
      actor: input.actor,
      bookId: input.bookId,
      targetType: target.targetType,
      targetId: target.targetId,
      action: "PUBLISH",
      releaseNotes: input.releaseNotes,
      confirm: true,
    });
  }
  return { count: targets.length };
}

export async function loadPublishedContentDocument(input: {
  publisherId: string;
  bookId: string;
  targetType: ContentReleaseTargetType;
  targetId: string;
}) {
  const version = await prisma.contentRelease.findUnique({
    where: {
      publisherId_targetType_targetId: {
        publisherId: input.publisherId,
        targetType: input.targetType,
        targetId: input.targetId,
      },
    },
    select: {
      lifecycle: true,
      currentVersionId: true,
      versions: {
        where: { lifecycle: "PUBLISHED" },
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: { id: true, snapshot: true },
      },
    },
  });
  if (!version || version.lifecycle !== "PUBLISHED") return null;
  const current = version.versions.find((entry) => entry.id === version.currentVersionId) ?? version.versions[0] ?? null;
  if (!current || !isRecord(current.snapshot)) return null;
  return normalizeContentDocument(current.snapshot.contentDocument);
}

export async function loadReleaseVersionPreview(input: {
  actor: ReleaseActor;
  bookId: string;
  versionId: string;
}): Promise<ReleaseVersionPreview | null> {
  const version = await prisma.contentReleaseVersion.findFirst({
    where: {
      id: input.versionId,
      publisherId: input.actor.publisherId,
      bookId: input.bookId,
      lifecycle: "PUBLISHED",
    },
    select: {
      id: true,
      releaseId: true,
      targetType: true,
      targetId: true,
      versionNumber: true,
      lifecycle: true,
      snapshot: true,
      releaseNotes: true,
      checksum: true,
      publishedAt: true,
      createdAt: true,
    },
  });
  if (!version || !isRecord(version.snapshot)) return null;
  const historicalDocument =
    "contentDocument" in version.snapshot
      ? normalizeContentDocument(version.snapshot.contentDocument)
      : null;
  const title = String(version.snapshot.title ?? `${version.targetType} ${version.targetId}`);
  const draft = await buildTargetSnapshot(
    input.actor.publisherId,
    input.bookId,
    version.targetType,
    version.targetId,
  ).catch(() => null);
  return {
    versionId: version.id,
    releaseId: version.releaseId,
    targetType: version.targetType,
    targetId: version.targetId,
    title,
    versionNumber: version.versionNumber,
    lifecycle: version.lifecycle,
    releaseNotes: version.releaseNotes,
    checksum: version.checksum,
    publishedAt: version.publishedAt?.toISOString() ?? null,
    createdAt: version.createdAt.toISOString(),
    document: historicalDocument,
    compare: compareReleaseDocuments(draft?.contentDocument ?? null, historicalDocument),
  };
}

export function releaseTargetForNode(type: BookStructureNodeType): ContentReleaseTargetType | null {
  return hierarchyTargetMap[type] ?? null;
}

export function compareReleaseDocuments(
  draftDocument: ContentDocument | null,
  versionDocument: ContentDocument | null,
): ReleaseComparisonSummary {
  const draftBlocks = draftDocument?.blocks ?? [];
  const versionBlocks = versionDocument?.blocks ?? [];
  const draftById = new Map(draftBlocks.map((block) => [block.id, block]));
  const versionById = new Map(versionBlocks.map((block) => [block.id, block]));
  let addedBlocks = 0;
  let removedBlocks = 0;
  let changedBlocks = 0;
  for (const id of draftById.keys()) {
    if (!versionById.has(id)) addedBlocks += 1;
  }
  for (const [id, block] of versionById.entries()) {
    const draft = draftById.get(id);
    if (!draft) {
      removedBlocks += 1;
      continue;
    }
    if (JSON.stringify(draft) !== JSON.stringify(block)) changedBlocks += 1;
  }
  return {
    draftBlockCount: draftBlocks.length,
    versionBlockCount: versionBlocks.length,
    addedBlocks,
    removedBlocks,
    changedBlocks,
    linkedAssetChanges: countSetDelta(collectDocumentRefs(draftDocument, "assets"), collectDocumentRefs(versionDocument, "assets")),
    knowledgeReferenceChanges: countSetDelta(collectDocumentRefs(draftDocument, "knowledge"), collectDocumentRefs(versionDocument, "knowledge")),
  };
}

async function validateReleaseTarget(
  publisherId: string,
  bookId: string,
  targetType: ContentReleaseTargetType,
  targetId: string,
): Promise<ReleaseValidationResult> {
  const errors: ReleaseValidationMessage[] = [];
  const warnings: ReleaseValidationMessage[] = [];
  const info: ReleaseValidationMessage[] = [];
  try {
    const snapshot = await buildTargetSnapshot(publisherId, bookId, targetType, targetId);
    if (!snapshot.title.trim()) errors.push(message("ERROR", "TITLE_REQUIRED", "Title is required."));
    if (snapshot.contentDocument) {
      if (!snapshot.contentDocument.blocks.length) warnings.push(message("WARNING", "EMPTY_DOCUMENT", "Structured content is empty."));
      const scope = await getContentNodeScope(publisherId, bookId, targetType as BookStructureNodeType, targetId);
      const linked = await validateLinkedAssetDocument(scope, snapshot.contentDocument);
      const media = await validateMediaDocument(scope, linked);
      await validateKnowledgeDocument(scope, media);
      for (const block of media.blocks) {
        if (isMediaBlock(block) && block.required && !block.targetId) errors.push(message("ERROR", "MEDIA_REQUIRED", "Required media block has no target."));
        if (isLinkedAssetBlock(block) && block.required && !block.targetId) errors.push(message("ERROR", "ASSET_REQUIRED", "Required linked asset block has no target."));
      }
    }
    if (targetType === "EXERCISE") {
      const count = await prisma.bookQuestion.count({ where: { exerciseId: targetId, archived: false, approved: true } });
      if (count === 0) errors.push(message("ERROR", "EXERCISE_EMPTY", "Exercise must contain at least one approved question."));
    }
    if (targetType === "WORKSHEET") {
      const worksheet = await prisma.publisherWorksheet.findFirst({
        where: { id: targetId, publisherId, bookId, archivedAt: null },
        select: { title: true, exerciseId: true, printableResourceId: true, allowOnlineAttempt: true, allowPrint: true, answerKeyResourceId: true, items: { select: { question: { select: { bookId: true, approved: true, archived: true } } } }, _count: { select: { items: true } } },
      });
      if (!worksheet?.title.trim()) errors.push(message("ERROR", "WORKSHEET_TITLE_REQUIRED", "Worksheet title is required."));
      if (!worksheet?.exerciseId && !worksheet?.printableResourceId && !worksheet?._count.items) errors.push(message("ERROR", "WORKSHEET_BACKING_REQUIRED", "Worksheet needs at least one selected question, exercise, or printable resource."));
      if (worksheet?.items.some((item) => item.question.bookId !== bookId || !item.question.approved || item.question.archived)) {
        errors.push(message("ERROR", "WORKSHEET_QUESTION_INVALID", "Worksheet questions must be approved, active questions from this book."));
      }
      if (worksheet?.answerKeyResourceId) info.push(message("INFO", "ANSWER_KEY_PROTECTED", "Answer key is excluded from student renderer."));
    }
    if (targetType === "ACTIVITY") {
      const activity = await prisma.chapterActivity.findFirst({
        where: { id: targetId, chapter: { bookId, book: { publisherId } }, archivedAt: null },
        select: { objective: true, instructions: true },
      });
      if (!activity?.objective || !activity.instructions) errors.push(message("ERROR", "ACTIVITY_REQUIRED_FIELDS", "Activity objective and instructions are required."));
    }
  } catch (error) {
    errors.push(message("ERROR", "TARGET_INVALID", error instanceof Error ? error.message : "Target is invalid."));
  }
  return { errors, warnings, info };
}

async function buildTargetSnapshot(
  publisherId: string,
  bookId: string,
  targetType: ContentReleaseTargetType,
  targetId: string,
): Promise<ReleaseSnapshot> {
  if (targetType === "BOOK") {
    const row = await prisma.book.findFirst({ where: { id: targetId, publisherId }, select: { id: true, title: true, slug: true, content: true, published: true, archived: true, updatedAt: true } });
    if (!row) throw new Error("Book not found.");
    return { schemaVersion: 1, targetType, targetId, bookId: row.id, title: row.title, record: toJsonRecord(omitContent(row)), contentDocument: row.content ? normalizeContentDocument(row.content) : undefined };
  }
  if (targetType === "CHAPTER") {
    const row = await prisma.bookChapter.findFirst({ where: { id: targetId, bookId, book: { publisherId } }, select: { id: true, title: true, content: true, published: true, archived: true, updatedAt: true } });
    if (!row) throw new Error("Chapter not found.");
    return { schemaVersion: 1, targetType, targetId, bookId, title: row.title, record: toJsonRecord(omitContent(row)), contentDocument: normalizeContentDocument(row.content) };
  }
  if (targetType === "MODULE") {
    const row = await prisma.bookModule.findFirst({ where: { id: targetId, bookId, book: { publisherId } }, select: { id: true, title: true, content: true, published: true, archived: true, updatedAt: true } });
    if (!row) throw new Error("Module not found.");
    return { schemaVersion: 1, targetType, targetId, bookId, title: row.title, record: toJsonRecord(omitContent(row)), contentDocument: normalizeContentDocument(row.content) };
  }
  if (targetType === "TOPIC") {
    const row = await prisma.bookTopic.findFirst({ where: { id: targetId, bookId, book: { publisherId } }, select: { id: true, title: true, content: true, published: true, archived: true, updatedAt: true } });
    if (!row) throw new Error("Topic not found.");
    return { schemaVersion: 1, targetType, targetId, bookId, title: row.title, record: toJsonRecord(omitContent(row)), contentDocument: normalizeContentDocument(row.content) };
  }
  const record = await loadNonHierarchyRecord(publisherId, bookId, targetType, targetId);
  const jsonRecord = toJsonRecord(record);
  return {
    schemaVersion: 1,
    targetType,
    targetId,
    bookId,
    title: String(jsonRecord.title ?? jsonRecord.label ?? jsonRecord.term ?? jsonRecord.code ?? targetId),
    record: jsonRecord,
  };
}

async function loadNonHierarchyRecord(publisherId: string, bookId: string, targetType: ContentReleaseTargetType, targetId: string) {
  if (targetType === "ACTIVITY") {
    const row = await prisma.chapterActivity.findFirst({ where: { id: targetId, chapter: { bookId, book: { publisherId } }, archivedAt: null } });
    if (!row) throw new Error("Activity not found.");
    return row;
  }
  if (targetType === "WORKSHEET") {
    const row = await prisma.publisherWorksheet.findFirst({ where: { id: targetId, publisherId, bookId, archivedAt: null }, include: { items: { orderBy: [{ position: "asc" }, { id: "asc" }], include: { question: true } } } });
    if (!row) throw new Error("Worksheet not found.");
    return row;
  }
  if (targetType === "EXERCISE") {
    const row = await prisma.bookExercise.findFirst({ where: { id: targetId, bookId, book: { publisherId }, archived: false } });
    if (!row) throw new Error("Exercise not found.");
    return row;
  }
  if (targetType === "VOCABULARY") {
    const row = await prisma.publisherVocabulary.findFirst({ where: { id: targetId, publisherId, OR: [{ bookId }, { bookId: null }] } });
    if (!row) throw new Error("Vocabulary not found.");
    return row;
  }
  if (targetType === "CONCEPT") {
    const row = await prisma.publisherConcept.findFirst({ where: { id: targetId, publisherId, OR: [{ bookId }, { bookId: null }] } });
    if (!row) throw new Error("Concept not found.");
    return row;
  }
  if (targetType === "SECTION") {
    const row = await prisma.contentSectionDefinition.findFirst({ where: { id: targetId, publisherId, OR: [{ bookId }, { bookId: null }], archivedAt: null } });
    if (!row) throw new Error("Section not found.");
    return row;
  }
  throw new Error("Unsupported release target.");
}

async function resolveBulkTargets(publisherId: string, bookId: string, targetType: "BOOK" | "CHAPTER", targetId: string) {
  if (targetType === "BOOK") {
    const modules = await prisma.bookModule.findMany({ where: { bookId: targetId, book: { publisherId }, archived: false }, select: { id: true } });
    const topics = await prisma.bookTopic.findMany({ where: { bookId: targetId, book: { publisherId }, archived: false }, select: { id: true } });
    return [
      { targetType: "BOOK" as const, targetId },
      ...modules.map((row) => ({ targetType: "MODULE" as const, targetId: row.id })),
      ...topics.map((row) => ({ targetType: "TOPIC" as const, targetId: row.id })),
    ];
  }
  const chapter = await prisma.bookChapter.findFirst({ where: { id: targetId, bookId, book: { publisherId }, archived: false }, select: { id: true } });
  if (!chapter) throw new Error("Chapter not found.");
  const modules = await prisma.bookModule.findMany({ where: { bookId, chapterId: targetId, archived: false }, select: { id: true } });
  const topics = await prisma.bookTopic.findMany({ where: { bookId, chapterId: targetId, archived: false }, select: { id: true } });
  return [
    { targetType: "CHAPTER" as const, targetId },
    ...modules.map((row) => ({ targetType: "MODULE" as const, targetId: row.id })),
    ...topics.map((row) => ({ targetType: "TOPIC" as const, targetId: row.id })),
  ];
}

async function upsertRelease(
  tx: Prisma.TransactionClient,
  publisherId: string,
  bookId: string | null,
  targetType: ContentReleaseTargetType,
  targetId: string,
) {
  return tx.contentRelease.upsert({
    where: { publisherId_targetType_targetId: { publisherId, targetType, targetId } },
    update: {},
    create: { publisherId, bookId, targetType, targetId },
  });
}

export function collectSnapshotDependencyIds(snapshot: ReleaseSnapshot): SnapshotDependencyIds {
  const resourceIds = new Set<string>();
  const exerciseIds = new Set<string>();
  const questionLaunchers: SnapshotQuestionLauncher[] = [];
  const launcherKeys = new Set<string>();

  for (const block of snapshot.contentDocument?.blocks ?? []) {
    collectBlockResourceIds(block, resourceIds);

    if (isLinkedAssetBlock(block)) {
      if (block.targetType === "RESOURCE") addResourceId(resourceIds, block.targetId);
      if (block.targetType === "BOOK_EXERCISE") addResourceId(exerciseIds, block.targetId);
    }

    if (isMediaBlock(block)) {
      if (block.targetType === "RESOURCE") addResourceId(resourceIds, block.targetId);
      addResourceId(resourceIds, block.posterResourceId);
    }
  }

  for (const page of snapshot.contentDocument?.pageLayout?.pages ?? []) {
    addResourceId(resourceIds, page.background?.resourceId);
    addResourceId(resourceIds, page.replica?.resourceId);
    addResourceId(resourceIds, page.narration?.resourceId);
    for (const segment of page.narration?.segments ?? []) addResourceId(resourceIds, segment.resourceId);
    for (const frame of page.frames) collectFrameDependencies(frame, resourceIds, exerciseIds, questionLaunchers, launcherKeys);
  }

  return {
    resourceIds: [...resourceIds],
    exerciseIds: [...exerciseIds],
    questionLaunchers,
  };
}

export async function publishSnapshotDependencies(
  tx: Prisma.TransactionClient,
  publisherId: string,
  bookId: string,
  snapshot: ReleaseSnapshot,
) {
  const dependencies = collectSnapshotDependencyIds(snapshot);
  const resourceIds = new Set(dependencies.resourceIds);
  const exerciseIds = new Set(dependencies.exerciseIds);

  for (const launcher of dependencies.questionLaunchers) exerciseIds.add(launcher.exerciseId);

  await publishResources(tx, publisherId, bookId, resourceIds);

  if (exerciseIds.size) {
    await tx.bookExercise.updateMany({
      where: {
        id: { in: [...exerciseIds] },
        bookId,
        book: { publisherId },
        archived: false,
      },
      data: { published: true },
    });
  }

  for (const launcher of dependencies.questionLaunchers) {
    const group = await tx.bookExerciseQuestionGroup.findFirst({
      where: {
        id: launcher.groupId,
        exerciseId: launcher.exerciseId,
        exercise: {
          bookId,
          book: { publisherId },
          archived: false,
        },
      },
      select: { id: true },
    });
    if (!group) continue;

    await tx.bookExerciseQuestionGroup.updateMany({
      where: {
        id: group.id,
        exerciseId: launcher.exerciseId,
        exercise: {
          bookId,
          book: { publisherId },
          archived: false,
        },
      },
      data: { active: true },
    });

    const questionWhere: Prisma.BookQuestionWhereInput = {
      ...(launcher.questionIds.length ? { id: { in: launcher.questionIds } } : {}),
      bookId,
      exerciseId: launcher.exerciseId,
      exerciseGroupId: group.id,
      questionType: launcher.questionType,
      archived: false,
      exercise: {
        bookId,
        book: { publisherId },
        archived: false,
      },
      exerciseGroup: {
        id: group.id,
        exerciseId: launcher.exerciseId,
        active: true,
      },
    };
    const questions = await tx.bookQuestion.findMany({
      where: questionWhere,
      select: { imageResourceId: true },
    });
    if (!questions.length) continue;

    await tx.bookQuestion.updateMany({
      where: questionWhere,
      data: { approved: true },
    });
    for (const question of questions) addResourceId(resourceIds, question.imageResourceId);
  }

  await publishResources(tx, publisherId, bookId, resourceIds);
}

function collectBlockResourceIds(block: ContentDocument["blocks"][number], resourceIds: Set<string>) {
  if ((block.type === "image" || block.type === "diagram") && "resourceId" in block) {
    addResourceId(resourceIds, block.resourceId);
  }
  if (block.type === "imageGallery") {
    for (const image of block.images) addResourceId(resourceIds, image.resourceId);
  }
  if (block.type === "activity") {
    for (const field of block.fields) addResourceId(resourceIds, field.resourceId);
  }
  if (block.type === "worksheet") {
    for (const question of block.questions) addResourceId(resourceIds, question.resourceId);
  }
}

function collectFrameDependencies(
  frame: NonNullable<ContentDocument["pageLayout"]>["pages"][number]["frames"][number],
  resourceIds: Set<string>,
  exerciseIds: Set<string>,
  questionLaunchers: SnapshotQuestionLauncher[],
  launcherKeys: Set<string>,
) {
  addResourceId(resourceIds, frame.resourceId);
  addResourceId(resourceIds, frame.contentRef?.resourceId);

  if (frame.type === "ASSESSMENT_LAUNCHER") {
    const payload = getV2AssessmentLauncherPayload(frame);
    if (payload?.launcherType === "question") {
      const target = payload.target;
      const exerciseId = target.exerciseId.trim();
      const groupId = target.groupId.trim();
      if (exerciseId && groupId) {
        exerciseIds.add(exerciseId);
        const questionIds = [...new Set((target.questionIds ?? []).map((id) => id.trim()).filter(Boolean))];
        const key = [exerciseId, groupId, target.questionType, ...questionIds].join("|");
        if (!launcherKeys.has(key)) {
          launcherKeys.add(key);
          questionLaunchers.push({ exerciseId, groupId, questionType: target.questionType, questionIds });
        }
      }
    }
  }

  for (const child of frame.children ?? []) {
    collectFrameDependencies(child, resourceIds, exerciseIds, questionLaunchers, launcherKeys);
  }
}

function addResourceId(ids: Set<string>, value: unknown) {
  if (typeof value === "string" && value.trim()) ids.add(value.trim());
}

async function publishResources(
  tx: Prisma.TransactionClient,
  publisherId: string,
  bookId: string,
  resourceIds: Set<string>,
) {
  if (!resourceIds.size) return;
  await tx.resource.updateMany({
    where: {
      id: { in: [...resourceIds] },
      publisherId,
      archived: false,
      OR: [{ bookId }, { bookId: null }],
    },
    data: { published: true },
  });
}

function collectDependencies(snapshot: ReleaseSnapshot) {
  const dependencies: Record<string, string[]> = {};
  for (const block of snapshot.contentDocument?.blocks ?? []) {
    if (isLinkedAssetBlock(block)) {
      if (block.targetId) {
        const key = block.targetType;
        dependencies[key] = [...(dependencies[key] ?? []), block.targetId];
      }
      if (block.sectionDefinitionId) {
        dependencies.CONTENT_SECTION = [...(dependencies.CONTENT_SECTION ?? []), block.sectionDefinitionId];
      }
    }
    if (isMediaBlock(block)) {
      if (block.targetId) {
        const key = `MEDIA_${block.targetType}`;
        dependencies[key] = [...(dependencies[key] ?? []), block.targetId];
      }
      if (block.posterResourceId) dependencies.RESOURCE = [...(dependencies.RESOURCE ?? []), block.posterResourceId];
      if (block.sectionDefinitionId) {
        dependencies.CONTENT_SECTION = [...(dependencies.CONTENT_SECTION ?? []), block.sectionDefinitionId];
      }
    }
    if (isTextBlock(block)) {
      for (const reference of block.knowledgeReferences ?? []) {
        const key = reference.type === "VOCABULARY" ? "VOCABULARY" : "CONCEPT";
        dependencies[key] = [...(dependencies[key] ?? []), reference.targetId];
      }
    }
  }

  const snapshotDependencies = collectSnapshotDependencyIds(snapshot);
  if (snapshotDependencies.resourceIds.length) {
    dependencies.RESOURCE = [...(dependencies.RESOURCE ?? []), ...snapshotDependencies.resourceIds];
  }
  if (snapshotDependencies.exerciseIds.length) {
    dependencies.BOOK_EXERCISE = [...(dependencies.BOOK_EXERCISE ?? []), ...snapshotDependencies.exerciseIds];
  }
  for (const launcher of snapshotDependencies.questionLaunchers) {
    dependencies.BOOK_EXERCISE_GROUP = [...(dependencies.BOOK_EXERCISE_GROUP ?? []), launcher.groupId];
    if (launcher.questionIds.length) {
      dependencies.BOOK_QUESTION = [...(dependencies.BOOK_QUESTION ?? []), ...launcher.questionIds];
    }
  }

  return {
    schemaVersion: 1,
    dependencies: Object.fromEntries(
      Object.entries(dependencies).map(([key, ids]) => [key, [...new Set(ids)]]),
    ),
  };
}

async function assertNoPublishedDependents(
  publisherId: string,
  bookId: string | null,
  targetType: ContentReleaseTargetType,
  targetId: string,
) {
  const dependencyKey = dependencyKeyForTarget(targetType);
  if (!dependencyKey) return;
  const releases = await prisma.contentRelease.findMany({
    where: {
      publisherId,
      bookId: bookId ?? undefined,
      lifecycle: "PUBLISHED",
      currentVersionId: { not: null },
      NOT: { targetType, targetId },
    },
    select: { targetType: true, targetId: true, currentVersionId: true },
    take: 200,
  });
  const currentVersionIds = releases
    .map((release) => release.currentVersionId)
    .filter((id): id is string => Boolean(id));
  if (!currentVersionIds.length) return;
  const versions = await prisma.contentReleaseVersion.findMany({
    where: { id: { in: currentVersionIds } },
    select: { targetType: true, targetId: true, dependencies: true },
  });
  const dependent = versions.find((version) =>
    dependencyContains(version.dependencies, dependencyKey, targetId),
  );
  if (dependent) {
    throw new Error(
      `Cannot unpublish or archive this dependency while ${dependent.targetType} ${dependent.targetId} is published and references it.`,
    );
  }
}

function dependencyKeyForTarget(targetType: ContentReleaseTargetType) {
  const keys: Partial<Record<ContentReleaseTargetType, string>> = {
    ACTIVITY: "CHAPTER_ACTIVITY",
    WORKSHEET: "PUBLISHER_WORKSHEET",
    EXERCISE: "BOOK_EXERCISE",
    VOCABULARY: "VOCABULARY",
    CONCEPT: "CONCEPT",
    SECTION: "CONTENT_SECTION",
  };
  return keys[targetType] ?? null;
}

function dependencyContains(value: Prisma.JsonValue | null, key: string, targetId: string) {
  if (!isRecord(value) || !isRecord(value.dependencies)) return false;
  const ids = value.dependencies[key];
  return Array.isArray(ids) && ids.includes(targetId);
}

function collectDocumentRefs(document: ContentDocument | null, kind: "assets" | "knowledge") {
  const refs = new Set<string>();
  for (const block of document?.blocks ?? []) {
    if (kind === "assets" && isLinkedAssetBlock(block)) {
      refs.add(`${block.targetType}:${block.targetId}`);
      if (block.sectionDefinitionId) refs.add(`SECTION:${block.sectionDefinitionId}`);
    }
    if (kind === "assets" && isMediaBlock(block)) {
      refs.add(`MEDIA:${block.targetType}:${block.targetId}`);
      if (block.posterResourceId) refs.add(`RESOURCE:${block.posterResourceId}`);
      if (block.sectionDefinitionId) refs.add(`SECTION:${block.sectionDefinitionId}`);
    }
    if (kind === "knowledge" && isTextBlock(block)) {
      for (const reference of block.knowledgeReferences ?? []) {
        refs.add(`${reference.type}:${reference.targetId}`);
      }
    }
  }
  return refs;
}

function countSetDelta(left: Set<string>, right: Set<string>) {
  let count = 0;
  for (const value of left) if (!right.has(value)) count += 1;
  for (const value of right) if (!left.has(value)) count += 1;
  return count;
}

async function updateLegacyPublishedFlag(
  tx: Prisma.TransactionClient,
  publisherId: string,
  bookId: string | null,
  targetType: ContentReleaseTargetType,
  targetId: string,
  published: boolean,
) {
  if (targetType === "BOOK") {
    await tx.book.updateMany({ where: { id: targetId, publisherId }, data: { published } });
  } else if (targetType === "CHAPTER") {
    await tx.bookChapter.updateMany({ where: { id: targetId, bookId: bookId ?? undefined, book: { publisherId } }, data: { published } });
  } else if (targetType === "MODULE") {
    await tx.bookModule.updateMany({ where: { id: targetId, bookId: bookId ?? undefined, book: { publisherId } }, data: { published } });
  } else if (targetType === "TOPIC") {
    await tx.bookTopic.updateMany({ where: { id: targetId, bookId: bookId ?? undefined, book: { publisherId } }, data: { published } });
  } else if (targetType === "ACTIVITY") {
    await tx.chapterActivity.updateMany({ where: { id: targetId, chapter: { bookId: bookId ?? undefined, book: { publisherId } } }, data: { published } });
  } else if (targetType === "WORKSHEET") {
    await tx.publisherWorksheet.updateMany({ where: { id: targetId, publisherId, bookId: bookId ?? undefined }, data: { published } });
  } else if (targetType === "EXERCISE") {
    await tx.bookExercise.updateMany({ where: { id: targetId, bookId: bookId ?? undefined, book: { publisherId } }, data: { published } });
  } else if (targetType === "VOCABULARY") {
    await tx.publisherVocabulary.updateMany({ where: { id: targetId, publisherId }, data: { published } });
  } else if (targetType === "CONCEPT") {
    await tx.publisherConcept.updateMany({ where: { id: targetId, publisherId }, data: { published } });
  } else if (targetType === "SECTION") {
    await tx.contentSectionDefinition.updateMany({ where: { id: targetId, publisherId }, data: { published } });
  }
}

function checksumJson(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function message(severity: ReleaseValidationMessage["severity"], code: string, text: string): ReleaseValidationMessage {
  return { severity, code, message: text };
}

function omitContent<T extends { content?: unknown }>(value: T) {
  const rest = { ...value };
  delete rest.content;
  return rest;
}

function toJsonRecord(value: unknown): Record<string, unknown> {
  const parsed = JSON.parse(JSON.stringify(value)) as unknown;
  return isRecord(parsed) ? parsed : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
