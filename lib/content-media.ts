import "server-only";

import { ResourceAudience, ResourceType } from "@prisma/client";

import {
  type ContentDocument,
  type MediaBlock,
  isMediaBlock,
} from "@/lib/content-document";
import {
  type ContentNodeScope,
  isScopedAsset,
  loadContentSectionDefinitions,
  resourceAudienceOptions,
  scopeText,
} from "@/lib/content-linked-assets";
import {
  type ContentStudioMediaOption,
  type ResolvedMediaBlock,
  mediaKey,
} from "@/lib/content-media-types";
import { prisma } from "@/lib/prisma";

type ValidationError = {
  blockId: string;
  message: string;
};

type MediaLibrary = {
  options: ContentStudioMediaOption[];
  byKey: Map<string, ContentStudioMediaOption>;
};

const playableResourceTypes = new Set<ResourceType>([
  ResourceType.VIDEO,
  ResourceType.AUDIO,
  ResourceType.INTERACTIVE,
]);

export async function loadContentStudioMediaOptions(scope: ContentNodeScope) {
  const loaded = await loadMediaLibrary(scope);
  return loaded.options;
}

export async function resolveMediaForDocument(
  scope: ContentNodeScope,
  document: ContentDocument,
) {
  const [loaded, posterRoutes] = await Promise.all([
    loadMediaLibrary(scope),
    loadPosterRoutes(scope, document),
  ]);
  const resolved: Record<string, ResolvedMediaBlock | null> = {};
  for (const block of document.blocks) {
    if (!isMediaBlock(block)) continue;
    const option = loaded.byKey.get(mediaKey(block.targetType, block.targetId));
    if (!option || !isCompatibleMedia(block, option)) {
      resolved[block.id] = null;
      continue;
    }
    resolved[block.id] = mediaFromOption(block, option, posterRoutes.get(block.posterResourceId ?? "") ?? null);
  }
  return resolved;
}

export async function validateMediaDocument(scope: ContentNodeScope, document: ContentDocument) {
  const [loaded, sections, posterRoutes] = await Promise.all([
    loadMediaLibrary(scope),
    loadContentSectionDefinitions(scope.publisherId, scope.bookId),
    loadPosterRoutes(scope, document),
  ]);
  const sectionsById = new Map(sections.map((section) => [section.id, section]));
  const errors: ValidationError[] = [];

  const blocks = document.blocks.map((block) => {
    if (!isMediaBlock(block)) return block;
    const option = loaded.byKey.get(mediaKey(block.targetType, block.targetId));
    if (!option) {
      errors.push({ blockId: block.id, message: "Media source is unavailable for this publisher or content scope." });
      return block;
    }
    if (!isCompatibleMedia(block, option)) {
      errors.push({ blockId: block.id, message: "Media source is not compatible with the selected media kind." });
      return block;
    }

    const audience = block.audience.filter((entry) => option.audienceOptions.includes(entry));
    if (!audience.length) {
      errors.push({ blockId: block.id, message: "Media audience is not permitted for the selected source." });
      return block;
    }

    const sectionDefinitionId = block.sectionDefinitionId?.trim() || undefined;
    if (sectionDefinitionId) {
      const section = sectionsById.get(sectionDefinitionId);
      if (!section || section.archived) {
        errors.push({ blockId: block.id, message: "Section definition is unavailable for this publisher or book." });
        return block;
      }
      const allowedSectionKinds = block.mediaKind === "video" ? ["video", "resource"] : ["resource"];
      if (
        section.allowedAssetKinds.length &&
        !section.allowedAssetKinds.some((kind) => allowedSectionKinds.includes(kind))
      ) {
        errors.push({ blockId: block.id, message: "Section definition does not allow media assets." });
        return block;
      }
    }

    if (block.posterResourceId) {
      if (!posterRoutes.has(block.posterResourceId)) {
        errors.push({ blockId: block.id, message: "Poster resource is unavailable for this publisher or content scope." });
        return block;
      }
    }

    return {
      ...block,
      label: block.label.trim().slice(0, 200) || option.defaultLabel,
      caption: block.caption?.trim().slice(0, 500) || undefined,
      posterResourceId: block.posterResourceId?.trim() || undefined,
      autoplay: false as const,
      controls: block.controls !== false,
      required: Boolean(block.required),
      audience,
      sectionDefinitionId,
    };
  });

  if (errors.length) throw new Error(errors[0]?.message ?? "Media validation failed.");

  return {
    ...document,
    blocks,
  };
}

async function loadMediaLibrary(scope: ContentNodeScope): Promise<MediaLibrary> {
  const [resources, videos] = await Promise.all([
    prisma.resource.findMany({
      where: {
        publisherId: scope.publisherId,
        archived: false,
        type: { in: [...playableResourceTypes] },
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
        mimeType: true,
        published: true,
        bookId: true,
        chapterId: true,
        moduleId: true,
        topicId: true,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 250,
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
        provider: true,
        durationSeconds: true,
        published: true,
        chapterId: true,
        moduleId: true,
        topicId: true,
      },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    }),
  ]);

  const options: ContentStudioMediaOption[] = [];
  for (const resource of resources) {
    if (!isScopedAsset(scope, resource.chapterId, resource.moduleId, resource.topicId)) continue;
    const kind = resourceKind(resource.type, resource.mimeType);
    if (!kind) continue;
    const audienceOptions = resourceAudienceOptions(resource.audience);
    options.push({
      mediaKind: kind,
      targetType: "RESOURCE",
      targetId: resource.id,
      title: resource.title,
      defaultLabel: resource.title,
      sourceBadge: "Publisher Resource",
      sourceDetail: resource.mimeType || resource.type,
      scopeLabel: scopeText(resource.chapterId, resource.moduleId, resource.topicId),
      audienceOptions,
      defaultAudience: audienceOptions,
      route: { href: `/api/resources/${encodeURIComponent(resource.id)}/play`, openMode: "route" },
      posterRoute: null,
      durationSeconds: null,
      published: resource.published,
      teacherOnly: resource.audience === ResourceAudience.TEACHER_ONLY,
    });
  }

  for (const video of videos) {
    if (!isScopedAsset(scope, video.chapterId, video.moduleId, video.topicId)) continue;
    const href = safeVideoLessonRoute(video.videoUrl);
    options.push({
      mediaKind: "video",
      targetType: "VIDEO_LESSON",
      targetId: video.id,
      title: video.title,
      defaultLabel: video.title,
      sourceBadge: "Video Lesson",
      sourceDetail: video.provider,
      scopeLabel: scopeText(video.chapterId, video.moduleId, video.topicId),
      audienceOptions: ["TEACHER", "STUDENT"],
      defaultAudience: ["TEACHER", "STUDENT"],
      route: href ? { href, openMode: "route" } : null,
      posterRoute: null,
      durationSeconds: video.durationSeconds,
      published: video.published,
      teacherOnly: false,
    });
  }

  const byKey = new Map<string, ContentStudioMediaOption>();
  for (const option of options) byKey.set(mediaKey(option.targetType, option.targetId), option);
  return { options: [...byKey.values()], byKey };
}

async function loadPosterRoutes(scope: ContentNodeScope, document: ContentDocument) {
  const posterIds = Array.from(
    new Set(
      document.blocks
        .filter(isMediaBlock)
        .map((block) => block.posterResourceId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  if (!posterIds.length) return new Map<string, { href: string; openMode: "route" }>();
  const posters = await prisma.resource.findMany({
    where: {
      id: { in: posterIds },
      publisherId: scope.publisherId,
      archived: false,
      OR: [
        { bookId: scope.bookId },
        { bookResourceLinks: { some: { bookId: scope.bookId, active: true } } },
      ],
    },
    select: {
      id: true,
      chapterId: true,
      moduleId: true,
      topicId: true,
    },
  });
  return new Map(
    posters
      .filter((resource) => isScopedAsset(scope, resource.chapterId, resource.moduleId, resource.topicId))
      .map((resource) => [
        resource.id,
        { href: `/api/resources/${encodeURIComponent(resource.id)}/play`, openMode: "route" as const },
      ]),
  );
}

function mediaFromOption(
  block: MediaBlock,
  option: ContentStudioMediaOption,
  posterRoute: { href: string; openMode: "route" } | null,
): ResolvedMediaBlock {
  return {
    mediaKind: block.mediaKind,
    targetType: block.targetType,
    targetId: block.targetId,
    title: option.title,
    label: block.label || option.defaultLabel,
    caption: block.caption ?? null,
    sourceBadge: option.sourceBadge,
    sourceDetail: option.sourceDetail,
    scopeLabel: option.scopeLabel,
    route: option.route,
    posterRoute: posterRoute ?? option.posterRoute,
    displayMode: block.displayMode,
    autoplay: false,
    controls: block.controls !== false,
    required: block.required,
    audienceOptions: option.audienceOptions,
    durationSeconds: option.durationSeconds,
    published: option.published,
    teacherOnly: option.teacherOnly,
    available: Boolean(option.route),
    offline: {
      contentVersion: 2,
      mediaKind: block.mediaKind,
      targetType: block.targetType,
      targetId: block.targetId,
      posterResourceId: block.posterResourceId ?? null,
    },
  };
}

function isCompatibleMedia(block: MediaBlock, option: ContentStudioMediaOption) {
  if (block.targetType !== option.targetType || block.targetId !== option.targetId) return false;
  if (block.targetType === "VIDEO_LESSON") return block.mediaKind === "video" && option.mediaKind === "video";
  return block.mediaKind === option.mediaKind;
}

function resourceKind(type: ResourceType, mimeType: string | null): MediaBlock["mediaKind"] | null {
  if (type === ResourceType.VIDEO || mimeType?.startsWith("video/")) return "video";
  if (type === ResourceType.AUDIO || mimeType?.startsWith("audio/")) return "audio";
  if (mimeType === "text/html") return "html5";
  if (mimeType === "image/gif" || mimeType === "image/svg+xml") return "animation";
  if (type === ResourceType.INTERACTIVE) return "simulation";
  return null;
}

function safeVideoLessonRoute(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
