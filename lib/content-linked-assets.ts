import "server-only";

import { ResourceAudience, ResourceType } from "@prisma/client";

import type { BookStructureNodeType } from "@/lib/book-structure-management";
import {
  type ContentDocument,
  isLinkedAssetBlock,
} from "@/lib/content-document";
import {
  linkedAssetKey,
  CONTENT_SECTION_AUDIENCES,
  CONTENT_SECTION_CONTEXTS,
  CONTENT_SECTION_ICONS,
  LINKED_ASSET_KINDS,
  type ContentSectionContext,
  type ContentSectionAudience,
  type ContentSectionDefinitionSummary,
  type ContentSectionIcon,
  type ContentStudioAssetOption,
  type LinkedAssetAudience,
  type LinkedAssetKind,
  type ResolvedLinkedAsset,
} from "@/lib/content-linked-asset-types";
import { prisma } from "@/lib/prisma";

export type ContentNodeScope = {
  publisherId: string;
  bookId: string;
  nodeType: BookStructureNodeType;
  nodeId: string;
  chapterId: string | null;
  moduleId: string | null;
  topicId: string | null;
};

type LoaderResult = {
  scope: ContentNodeScope;
  options: ContentStudioAssetOption[];
  byKey: Map<string, ContentStudioAssetOption>;
};

type ValidationError = {
  blockId: string;
  message: string;
};

export async function getContentNodeScope(
  publisherId: string,
  bookId: string,
  nodeType: BookStructureNodeType,
  nodeId: string,
): Promise<ContentNodeScope> {
  if (nodeType === "PART") {
    const row = await prisma.bookPart.findFirst({
      where: { id: nodeId, bookId, book: { publisherId } },
      select: { id: true },
    });
    if (!row) throw new Error("Part not found.");
    return { publisherId, bookId, nodeType, nodeId, chapterId: null, moduleId: null, topicId: null };
  }

  if (nodeType === "UNIT") {
    const row = await prisma.bookUnit.findFirst({
      where: { id: nodeId, bookId, book: { publisherId } },
      select: { id: true },
    });
    if (!row) throw new Error("Unit not found.");
    return { publisherId, bookId, nodeType, nodeId, chapterId: null, moduleId: null, topicId: null };
  }

  if (nodeType === "CHAPTER") {
    const row = await prisma.bookChapter.findFirst({
      where: { id: nodeId, bookId, book: { publisherId } },
      select: { id: true },
    });
    if (!row) throw new Error("Chapter not found.");
    return { publisherId, bookId, nodeType, nodeId, chapterId: nodeId, moduleId: null, topicId: null };
  }

  if (nodeType === "MODULE") {
    const row = await prisma.bookModule.findFirst({
      where: { id: nodeId, bookId, book: { publisherId } },
      select: { id: true, chapterId: true },
    });
    if (!row) throw new Error("Module not found.");
    return {
      publisherId,
      bookId,
      nodeType,
      nodeId,
      chapterId: row.chapterId,
      moduleId: row.id,
      topicId: null,
    };
  }

  const row = await prisma.bookTopic.findFirst({
    where: { id: nodeId, bookId, book: { publisherId } },
    select: { id: true, chapterId: true, moduleId: true },
  });
  if (!row) throw new Error("Topic not found.");
  return {
    publisherId,
    bookId,
    nodeType,
    nodeId,
    chapterId: row.chapterId,
    moduleId: row.moduleId,
    topicId: row.id,
  };
}

export async function loadLinkedAssetOptions(scope: ContentNodeScope) {
  const loaded = await loadAssetLibrary(scope);
  return loaded.options;
}

export async function loadContentSectionDefinitions(
  publisherId: string,
  bookId: string,
): Promise<ContentSectionDefinitionSummary[]> {
  const sections = await prisma.contentSectionDefinition.findMany({
    where: {
      publisherId,
      OR: [{ bookId }, { bookId: null }],
      archivedAt: null,
    },
    select: {
      id: true,
      code: true,
      label: true,
      icon: true,
      audience: true,
      allowedAssetKinds: true,
      visibleIn: true,
      sortOrder: true,
      active: true,
      published: true,
      archivedAt: true,
      updatedAt: true,
    },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }, { id: "asc" }],
  });

  return sections.map((section) => ({
    id: section.id,
    code: section.code,
    label: section.label,
    icon: normalizeContentSectionIcon(section.icon),
    audience: normalizeContentSectionAudience(section.audience),
    allowedAssetKinds: normalizeAllowedAssetKinds(section.allowedAssetKinds),
    visibleIn: normalizeSectionContexts(section.visibleIn),
    sortOrder: section.sortOrder,
    active: section.active,
    published: section.published,
    archived: Boolean(section.archivedAt),
    updatedAt: section.updatedAt.toISOString(),
  }));
}

export async function resolveLinkedAssetsForDocument(scope: ContentNodeScope, document: ContentDocument) {
  const loaded = await loadAssetLibrary(scope);
  const resolved: Record<string, ResolvedLinkedAsset | null> = {};
  for (const block of document.blocks) {
    if (!isLinkedAssetBlock(block)) continue;
    const option = loaded.byKey.get(linkedAssetKey(block.targetType, block.targetId));
    resolved[block.id] = option
      ? {
          assetKind: option.assetKind,
          targetType: option.targetType,
          targetId: option.targetId,
          title: option.title,
          label: block.label,
          sourceBadge: option.sourceBadge,
          sourceDetail: option.sourceDetail,
          scopeLabel: option.scopeLabel,
          teacherOnly: option.teacherOnly,
          audienceOptions: option.audienceOptions,
          openModes: option.openModes,
          route: option.route,
          available: true,
        }
      : null;
  }
  return resolved;
}

export async function validateLinkedAssetDocument(scope: ContentNodeScope, document: ContentDocument) {
  const [loaded, sections] = await Promise.all([
    loadAssetLibrary(scope),
    loadContentSectionDefinitions(scope.publisherId, scope.bookId),
  ]);
  const sectionsById = new Map(sections.map((section) => [section.id, section]));
  const errors: ValidationError[] = [];

  const blocks = document.blocks.map((block) => {
    if (!isLinkedAssetBlock(block)) return block;
    const option = loaded.byKey.get(linkedAssetKey(block.targetType, block.targetId));
    if (!option) {
      errors.push({ blockId: block.id, message: "Linked asset is unavailable for this publisher or content scope." });
      return block;
    }

    const label = block.label.trim().slice(0, 200) || option.defaultLabel;
    const audience = block.audience.filter((entry): entry is LinkedAssetAudience =>
      option.audienceOptions.includes(entry),
    );
    if (!audience.length) {
      errors.push({ blockId: block.id, message: "Linked asset audience is not permitted for the selected source." });
      return block;
    }

    const displayStyle = option.displayStyles.includes(block.displayStyle)
      ? block.displayStyle
      : option.displayStyles[0];
    const openMode = option.openModes.includes(block.openMode)
      ? block.openMode
      : option.openModes[0];
    const sectionDefinitionId = block.sectionDefinitionId?.trim() || undefined;
    if (sectionDefinitionId) {
      const section = sectionsById.get(sectionDefinitionId);
      if (!section || section.archived) {
        errors.push({ blockId: block.id, message: "Section definition is unavailable for this publisher or book." });
        return block;
      }
      if (section.allowedAssetKinds.length && !section.allowedAssetKinds.includes(option.assetKind)) {
        errors.push({ blockId: block.id, message: "Section definition does not allow this asset kind." });
        return block;
      }
    }

    return {
      ...block,
      assetKind: option.assetKind,
      label,
      audience,
      displayStyle,
      openMode,
      required: Boolean(block.required),
      sectionDefinitionId,
    };
  });

  if (errors.length) {
    throw new Error(errors[0]?.message ?? "Linked asset validation failed.");
  }

  return {
    ...document,
    blocks,
  };
}

export function normalizeAllowedAssetKinds(value: string[]): LinkedAssetKind[] {
  return value.filter((entry): entry is LinkedAssetKind =>
    (LINKED_ASSET_KINDS as readonly string[]).includes(entry),
  );
}

export function normalizeContentSectionAudience(value: string): ContentSectionAudience {
  return (CONTENT_SECTION_AUDIENCES as readonly string[]).includes(value) ? value as ContentSectionAudience : "BOTH";
}

export function normalizeContentSectionIcon(value: string): ContentSectionIcon {
  return (CONTENT_SECTION_ICONS as readonly string[]).includes(value)
    ? value as ContentSectionIcon
    : "layers";
}

export function normalizeSectionContexts(value: string[]): ContentSectionContext[] {
  const next = value.filter((entry): entry is ContentSectionContext =>
    (CONTENT_SECTION_CONTEXTS as readonly string[]).includes(entry),
  );
  return next.length ? next : ["ADMIN"];
}

async function loadAssetLibrary(scope: ContentNodeScope): Promise<LoaderResult> {
  const [resources, links, videos, activities, worksheets, exercises, outcomes] = await Promise.all([
    prisma.resource.findMany({
      where: {
        publisherId: scope.publisherId,
        archived: false,
        OR: [
          { bookId: scope.bookId },
          { bookResourceLinks: { some: { bookId: scope.bookId, active: true } } },
        ],
      },
      select: {
        id: true,
        title: true,
        type: true,
        audience: true,
        bookId: true,
        chapterId: true,
        moduleId: true,
        topicId: true,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 250,
    }),
    prisma.bookResourceLink.findMany({
      where: {
        publisherId: scope.publisherId,
        bookId: scope.bookId,
        active: true,
      },
      select: {
        id: true,
        targetType: true,
        partId: true,
        unitId: true,
        chapterId: true,
        moduleId: true,
        topicId: true,
        audienceOverride: true,
        resource: {
          select: {
            id: true,
            title: true,
            type: true,
            audience: true,
          },
        },
      },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    }),
    prisma.videoLesson.findMany({
      where: {
        publisherId: scope.publisherId,
        bookId: scope.bookId,
        archived: false,
      },
      select: {
        id: true,
        title: true,
        videoUrl: true,
        chapterId: true,
        moduleId: true,
        topicId: true,
      },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    }),
    prisma.chapterActivity.findMany({
      where: {
        chapter: {
          bookId: scope.bookId,
          book: { publisherId: scope.publisherId },
        },
        archivedAt: null,
      },
      select: {
        id: true,
        title: true,
        active: true,
        published: true,
        chapterId: true,
        moduleId: true,
        topicId: true,
      },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
    }),
    prisma.publisherWorksheet.findMany({
      where: {
        publisherId: scope.publisherId,
        bookId: scope.bookId,
        archivedAt: null,
        active: true,
      },
      select: {
        id: true,
        title: true,
        type: true,
        published: true,
        chapterId: true,
        moduleId: true,
        topicId: true,
      },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
    }),
    prisma.bookExercise.findMany({
      where: {
        bookId: scope.bookId,
      },
      select: {
        id: true,
        title: true,
        published: true,
        archived: true,
        chapterId: true,
        moduleId: true,
        topicId: true,
      },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    }),
    prisma.chapterLearningOutcome.findMany({
      where: {
        chapter: {
          bookId: scope.bookId,
          book: { publisherId: scope.publisherId },
        },
      },
      select: {
        id: true,
        outcome: true,
        chapterId: true,
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
  ]);

  const options: ContentStudioAssetOption[] = [];

  for (const resource of resources) {
    if (!isScopedAsset(scope, resource.chapterId, resource.moduleId, resource.topicId)) continue;
    options.push({
      assetKind: resource.type === ResourceType.WORKSHEET ? "worksheet" : resource.type === ResourceType.VIDEO ? "video" : "resource",
      targetType: "RESOURCE",
      targetId: resource.id,
      title: resource.title,
      defaultLabel: resource.title,
      sourceBadge: "Publisher Resource",
      sourceDetail: resource.type,
      scopeLabel: scopeText(resource.chapterId, resource.moduleId, resource.topicId),
      audienceOptions: resourceAudienceOptions(resource.audience),
      defaultAudience: resourceAudienceOptions(resource.audience),
      displayStyles: ["button", "inline", "callout"],
      openModes: resource.type === ResourceType.VIDEO ? ["route"] : ["route", "download"],
      teacherOnly: resource.audience === ResourceAudience.TEACHER_ONLY,
      route: {
        href: `/api/resources/${encodeURIComponent(resource.id)}/download`,
        openMode: resource.type === ResourceType.VIDEO ? "route" : "download",
      },
    });
  }

  for (const link of links) {
    if (!isScopedAsset(scope, link.chapterId, link.moduleId, link.topicId)) continue;
    options.push({
      assetKind: link.resource.type === ResourceType.WORKSHEET ? "worksheet" : link.resource.type === ResourceType.VIDEO ? "video" : "resource",
      targetType: "BOOK_RESOURCE_LINK",
      targetId: link.id,
      title: link.resource.title,
      defaultLabel: link.resource.title,
      sourceBadge: "Book Resource",
      sourceDetail: link.resource.type,
      scopeLabel: scopeText(link.chapterId, link.moduleId, link.topicId),
      audienceOptions: resourceAudienceOptions(link.audienceOverride ?? link.resource.audience),
      defaultAudience: resourceAudienceOptions(link.audienceOverride ?? link.resource.audience),
      displayStyles: ["button", "inline", "callout"],
      openModes: link.resource.type === ResourceType.VIDEO ? ["route"] : ["route", "download"],
      teacherOnly: (link.audienceOverride ?? link.resource.audience) === ResourceAudience.TEACHER_ONLY,
      route: {
        href: `/api/resources/${encodeURIComponent(link.resource.id)}/download`,
        openMode: link.resource.type === ResourceType.VIDEO ? "route" : "download",
      },
    });
  }

  for (const video of videos) {
    if (!isScopedAsset(scope, video.chapterId, video.moduleId, video.topicId)) continue;
    const href = safeExternalRoute(video.videoUrl);
    options.push({
      assetKind: "video",
      targetType: "VIDEO_LESSON",
      targetId: video.id,
      title: video.title,
      defaultLabel: video.title,
      sourceBadge: "Video",
      sourceDetail: "Video Lesson",
      scopeLabel: scopeText(video.chapterId, video.moduleId, video.topicId),
      audienceOptions: ["TEACHER", "STUDENT"],
      defaultAudience: ["TEACHER", "STUDENT"],
      displayStyles: ["button", "inline", "callout"],
      openModes: ["route"],
      teacherOnly: false,
      route: href ? { href, openMode: "route" } : null,
    });
  }

  for (const activity of activities) {
    if (!activity.active) continue;
    if (!isScopedAsset(scope, activity.chapterId, activity.moduleId, activity.topicId)) continue;
    options.push({
      assetKind: "activity",
      targetType: "CHAPTER_ACTIVITY",
      targetId: activity.id,
      title: activity.title,
      defaultLabel: activity.title,
      sourceBadge: "Activity",
      sourceDetail: activity.published ? "Published" : "Draft",
      scopeLabel: scopeText(activity.chapterId, activity.moduleId, activity.topicId),
      audienceOptions: ["TEACHER", "STUDENT"],
      defaultAudience: ["TEACHER", "STUDENT"],
      displayStyles: ["button", "inline", "callout"],
      openModes: ["route"],
      teacherOnly: false,
      route: {
        href: `/admin/books/${scope.bookId}/content?selected=${encodeURIComponent(`FOLDER:${activity.chapterId}:activities`)}`,
        openMode: "route",
      },
    });
  }

  for (const worksheet of worksheets) {
    if (!isScopedAsset(scope, worksheet.chapterId, worksheet.moduleId, worksheet.topicId)) continue;
    options.push({
      assetKind: "worksheet",
      targetType: "PUBLISHER_WORKSHEET",
      targetId: worksheet.id,
      title: worksheet.title,
      defaultLabel: worksheet.title,
      sourceBadge: "Worksheet",
      sourceDetail: worksheet.published ? `${worksheet.type} - Published` : `${worksheet.type} - Draft`,
      scopeLabel: scopeText(worksheet.chapterId, worksheet.moduleId, worksheet.topicId),
      audienceOptions: ["TEACHER", "STUDENT"],
      defaultAudience: ["TEACHER", "STUDENT"],
      displayStyles: ["button", "inline", "callout"],
      openModes: ["route"],
      teacherOnly: false,
      route: {
        href: `/admin/books/${scope.bookId}/content?selected=${encodeURIComponent(`FOLDER:${worksheet.chapterId}:worksheets`)}`,
        openMode: "route",
      },
    });
  }

  for (const exercise of exercises) {
    if (exercise.archived) continue;
    if (!isScopedAsset(scope, exercise.chapterId, exercise.moduleId, exercise.topicId)) continue;
    options.push({
      assetKind: "exercise",
      targetType: "BOOK_EXERCISE",
      targetId: exercise.id,
      title: exercise.title,
      defaultLabel: exercise.title,
      sourceBadge: "Exercise",
      sourceDetail: exercise.published ? "Published" : "Draft",
      scopeLabel: scopeText(exercise.chapterId, exercise.moduleId, exercise.topicId),
      audienceOptions: ["TEACHER", "STUDENT"],
      defaultAudience: ["TEACHER", "STUDENT"],
      displayStyles: ["button", "inline", "callout"],
      openModes: ["route"],
      teacherOnly: false,
      route: {
        href: `/admin/books/${scope.bookId}/content?selected=${encodeURIComponent(`FOLDER:${exercise.chapterId}:exercises`)}`,
        openMode: "route",
      },
    });
  }

  for (const outcome of outcomes) {
    if (!isScopedAsset(scope, outcome.chapterId, null, null)) continue;
    options.push({
      assetKind: "learningOutcome",
      targetType: "CHAPTER_LEARNING_OUTCOME",
      targetId: outcome.id,
      title: outcome.outcome,
      defaultLabel: outcome.outcome,
      sourceBadge: "Outcome",
      sourceDetail: "Learning Outcome",
      scopeLabel: scopeText(outcome.chapterId, null, null),
      audienceOptions: ["TEACHER", "STUDENT"],
      defaultAudience: ["TEACHER", "STUDENT"],
      displayStyles: ["button", "inline", "callout"],
      openModes: ["route"],
      teacherOnly: false,
      route: {
        href: `/admin/books/${scope.bookId}/content?selected=${encodeURIComponent(`FOLDER:${outcome.chapterId}:outcomes`)}`,
        openMode: "route",
      },
    });
  }

  const deduped = new Map<string, ContentStudioAssetOption>();
  for (const option of options) {
    deduped.set(linkedAssetKey(option.targetType, option.targetId), option);
  }

  return {
    scope,
    options: [...deduped.values()],
    byKey: deduped,
  };
}

export function isScopedAsset(
  scope: ContentNodeScope,
  chapterId: string | null,
  moduleId: string | null,
  topicId: string | null,
) {
  if (scope.nodeType === "PART" || scope.nodeType === "UNIT") return true;
  if (scope.nodeType === "CHAPTER") {
    return chapterId === null || chapterId === scope.chapterId;
  }
  if (scope.nodeType === "MODULE") {
    if (topicId) return false;
    if (moduleId) return moduleId === scope.moduleId;
    return chapterId === null || chapterId === scope.chapterId;
  }
  if (topicId) return topicId === scope.topicId;
  if (moduleId) return moduleId === scope.moduleId;
  return chapterId === null || chapterId === scope.chapterId;
}

export function scopeText(chapterId: string | null, moduleId: string | null, topicId: string | null) {
  if (topicId) return "Topic";
  if (moduleId) return "Module";
  if (chapterId) return "Chapter";
  return "Book";
}

export function resourceAudienceOptions(audience: ResourceAudience): LinkedAssetAudience[] {
  if (audience === ResourceAudience.TEACHER_ONLY) return ["TEACHER"];
  if (audience === ResourceAudience.STUDENT) return ["STUDENT"];
  return ["TEACHER", "STUDENT"];
}

function safeExternalRoute(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
