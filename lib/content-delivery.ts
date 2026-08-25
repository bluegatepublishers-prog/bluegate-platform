import "server-only";

import { ResourceAudience } from "@prisma/client";

import type { BookStructureNodeType } from "@/lib/book-structure-management";
import {
  documentHasRenderableContent,
  filterDocumentForMode,
  filterResolvedAssetsForMode,
  filterResolvedKnowledgeForMode,
  filterResolvedMediaForMode,
  type ContentRenderMode,
} from "@/lib/content-audience";
import { normalizeContentDocument, type ContentDocument } from "@/lib/content-document";
import { isLinkedAssetBlock } from "@/lib/content-document";
import { isLayoutV2Document, type LayoutV2Frame } from "@/lib/content-layout-v2";
import { loadPublishedContentDocument, releaseTargetForNode } from "@/lib/content-release";
import { resolveActivitiesForLinkedAssetDocument } from "@/lib/activity-studio";
import { resolveWorksheetsForLinkedAssetDocument } from "@/lib/worksheet-studio";
import {
  getContentNodeScope,
  loadContentSectionDefinitions,
  resolveLinkedAssetsForDocument,
} from "@/lib/content-linked-assets";
import { resolveMediaForDocument } from "@/lib/content-media";
import { resolveKnowledgeDefinitionsForDocument } from "@/lib/content-knowledge";
import { prisma } from "@/lib/prisma";
import { getStudentChapterWorkspace } from "@/lib/student-workspaces";
import { requireBookEntitlement } from "@/lib/entitlements/book";
import { requireTeacherSubject } from "@/lib/teacher-experience";

export type SafeStructuredContentModel = {
  id: string;
  title: string;
  type: BookStructureNodeType;
  mode: ContentRenderMode;
  document: ContentDocument;
  linkedAssets: Awaited<ReturnType<typeof resolveLinkedAssetsForDocument>>;
  activities: Awaited<ReturnType<typeof resolveActivitiesForLinkedAssetDocument>>;
  worksheets: Awaited<ReturnType<typeof resolveWorksheetsForLinkedAssetDocument>>;
  media: Awaited<ReturnType<typeof resolveMediaForDocument>>;
  knowledgeDefinitions: Awaited<ReturnType<typeof resolveKnowledgeDefinitionsForDocument>>;
  sections: Awaited<ReturnType<typeof loadContentSectionDefinitions>>;
  v2ResourceUrls: Record<string, string>;
  hasContent: boolean;
};

export async function loadPublishedModuleStructuredContent(input: {
  publisherId: string;
  bookId: string;
  moduleId: string;
  mode: ContentRenderMode;
}) {
  const moduleNode = await prisma.bookModule.findFirst({
    where: { id: input.moduleId, bookId: input.bookId, published: true, archived: false },
    select: { id: true, title: true, content: true },
  });
  if (!moduleNode) return null;
  return buildSafeStructuredContent({
    publisherId: input.publisherId,
    bookId: input.bookId,
    nodeType: "MODULE",
    nodeId: moduleNode.id,
    title: moduleNode.title,
    rawContent: moduleNode.content,
    mode: input.mode,
  });
}

export async function loadSmartBookStructuredContent(input: {
  publisherId: string;
  bookId: string;
  mode: ContentRenderMode;
  requirePublishedRelease?: boolean;
}) {
  const book = await prisma.book.findFirst({
    where: { id: input.bookId, publisherId: input.publisherId, published: true, archived: false },
    select: { id: true, title: true, content: true },
  });
  if (!book) return null;

  const publishedDocument = await loadPublishedContentDocument({
    publisherId: input.publisherId,
    bookId: input.bookId,
    targetType: "BOOK",
    targetId: input.bookId,
  });
  if (!publishedDocument && input.requirePublishedRelease) return null;
  const rawDocument = publishedDocument ?? normalizeContentDocument(book.content ?? { version: 2, blocks: [] });
  const [scope, sections] = await Promise.all([
    getContentNodeScope(input.publisherId, input.bookId, "BOOK", input.bookId),
    loadContentSectionDefinitions(input.publisherId, input.bookId),
  ]);
  const document = filterDocumentForMode(rawDocument, input.mode, sections);
  const v2ResourceUrls = isLayoutV2Document(document)
    ? await resolveV2ResourceUrls(document, input.publisherId, input.bookId, input.mode)
    : {};
  const activityBlocks = document.blocks
    .filter(isLinkedAssetBlock)
    .map((block) => ({ id: block.id, targetType: block.targetType, targetId: block.targetId }));
  const [linkedAssets, activities, worksheets, media, knowledgeDefinitions] = await Promise.all([
    resolveLinkedAssetsForDocument(scope, document),
    resolveActivitiesForLinkedAssetDocument({ publisherId: input.publisherId, bookId: input.bookId, mode: input.mode, blocks: activityBlocks }),
    resolveWorksheetsForLinkedAssetDocument({ publisherId: input.publisherId, bookId: input.bookId, mode: input.mode, blocks: activityBlocks }),
    resolveMediaForDocument(scope, document),
    resolveKnowledgeDefinitionsForDocument(scope, document),
  ]);
  return {
    document,
    linkedAssets: filterResolvedAssetsForMode(document, linkedAssets, input.mode),
    activities,
    worksheets,
    media: filterResolvedMediaForMode(document, media, input.mode),
    sections,
    knowledgeDefinitions: filterResolvedKnowledgeForMode(knowledgeDefinitions, input.mode),
    v2ResourceUrls,
  };
}

export async function loadStudentChapterStructuredContent(
  sectionSubjectId: string,
  chapterId: string,
  moduleId?: string,
) {
  const workspace = await getStudentChapterWorkspace(sectionSubjectId, chapterId);
  if (!workspace?.subject.book) return null;
  const modules = await prisma.bookModule.findMany({
    where: {
      bookId: workspace.subject.book.id,
      chapterId,
      published: true,
      archived: false,
      ...(moduleId?.trim() ? { id: moduleId.trim() } : {}),
    },
    select: { id: true, title: true, content: true },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });
  const rendered = await Promise.all(
    modules.map((moduleNode) =>
      buildSafeStructuredContent({
        publisherId: workspace.identity.publisher.id,
        bookId: workspace.subject.book!.id,
        nodeType: "MODULE",
        nodeId: moduleNode.id,
        title: moduleNode.title,
        rawContent: moduleNode.content,
        mode: "STUDENT",
      }),
    ),
  );
  return {
    workspace,
    items: rendered
      .filter((item) => item.hasContent)
      .map((item) => ({
        ...item,
        linkedAssets: remapStudentLinkedAssets(
          item.linkedAssets,
          sectionSubjectId,
          chapterId,
        ),
        worksheets: remapStudentWorksheets(item.worksheets, sectionSubjectId, chapterId),
        media: remapStudentMedia(item.media),
      })),
  };
}

export async function loadTeacherChapterStructuredContent(input: {
  sectionId: string;
  sectionSubjectId?: string | null;
  chapterId: string;
  bookId?: string | null;
  moduleId?: string | null;
}) {
  const { scope, subject } = await requireTeacherSubject(input.sectionId, input.sectionSubjectId);
  const defaultBook = subject.book;
  const bookId = input.bookId?.trim() || defaultBook?.id;
  if (!bookId) return null;
  await requireBookEntitlement(
    { id: scope.teacher.userId, role: "TEACHER" },
    { bookId, academicYearId: scope.academicYear.id, sectionId: scope.section.id, sectionSubjectId: subject.id },
  );
  const chapter = await prisma.bookChapter.findFirst({
    where: {
      id: input.chapterId,
      bookId,
      published: true,
      archived: false,
    },
    select: { id: true, title: true, chapterNumber: true },
  });
  if (!chapter) return null;
  const modules = await prisma.bookModule.findMany({
    where: {
      bookId,
      chapterId: chapter.id,
      published: true,
      archived: false,
      ...(input.moduleId?.trim() ? { id: input.moduleId.trim() } : {}),
    },
    select: { id: true, title: true, content: true },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });
  const rendered = await Promise.all(
    modules.map((moduleNode) =>
      buildSafeStructuredContent({
        publisherId: scope.publisherId,
        bookId,
        nodeType: "MODULE",
        nodeId: moduleNode.id,
        title: moduleNode.title,
        rawContent: moduleNode.content,
        mode: "TEACHER",
      }),
    ),
  );
  return {
    scope,
    subject,
    chapter,
    items: rendered.filter((item) => item.hasContent),
  };
}
async function buildSafeStructuredContent(input: {
  publisherId: string;
  bookId: string;
  nodeType: BookStructureNodeType;
  nodeId: string;
  title: string;
  rawContent: unknown;
  mode: ContentRenderMode;
}): Promise<SafeStructuredContentModel> {
  const releaseTarget = releaseTargetForNode(input.nodeType);
  const publishedDocument = releaseTarget
    ? await loadPublishedContentDocument({
        publisherId: input.publisherId,
        bookId: input.bookId,
        targetType: releaseTarget,
        targetId: input.nodeId,
      })
    : null;
  const rawDocument = publishedDocument ?? normalizeContentDocument({ version: 2, blocks: [] });
  const [scope, sections] = await Promise.all([
    getContentNodeScope(input.publisherId, input.bookId, input.nodeType, input.nodeId),
    loadContentSectionDefinitions(input.publisherId, input.bookId),
  ]);
  const document = filterDocumentForMode(rawDocument, input.mode, sections);
  const v2ResourceUrls = isLayoutV2Document(document)
    ? await resolveV2ResourceUrls(document, input.publisherId, input.bookId, input.mode)
    : {};
  const activityBlocks = document.blocks
    .filter(isLinkedAssetBlock)
    .map((block) => ({ id: block.id, targetType: block.targetType, targetId: block.targetId }));
  const [linkedAssets, activities, worksheets, media, knowledgeDefinitions] = await Promise.all([
    resolveLinkedAssetsForDocument(scope, document),
    resolveActivitiesForLinkedAssetDocument({
      publisherId: input.publisherId,
      bookId: input.bookId,
      mode: input.mode,
      blocks: activityBlocks,
    }),
    resolveWorksheetsForLinkedAssetDocument({
      publisherId: input.publisherId,
      bookId: input.bookId,
      mode: input.mode,
      blocks: activityBlocks,
    }),
    resolveMediaForDocument(scope, document),
    resolveKnowledgeDefinitionsForDocument(scope, document),
  ]);
  return {
    id: input.nodeId,
    title: input.title,
    type: input.nodeType,
    mode: input.mode,
    document,
    linkedAssets: filterResolvedAssetsForMode(document, linkedAssets, input.mode),
    activities,
    worksheets,
    media: filterResolvedMediaForMode(document, media, input.mode),
    knowledgeDefinitions: filterResolvedKnowledgeForMode(knowledgeDefinitions, input.mode),
    sections,
    v2ResourceUrls,
    hasContent: isLayoutV2Document(document) ? hasRenderableV2Content(document) : documentHasRenderableContent(document),
  };
}

function hasRenderableV2Content(document: ContentDocument) {
  if (document.pageLayout?.pages.some((page) => page.background?.resourceId || page.frames.some(hasRenderableV2Frame))) return true;
  return false;
}

function hasRenderableV2Frame(frame: LayoutV2Frame) {
  if (frame.hidden) return false;
  if (frame.type === "SHAPE" || frame.type === "EDUCATIONAL") return true;
  return Boolean(frame.contentRef?.blockId || frame.contentRef?.resourceId || frame.resourceId || frame.payload);
}
async function resolveV2ResourceUrls(
  document: ContentDocument,
  publisherId: string,
  bookId: string,
  mode: ContentRenderMode,
) {
  const resourceIds = collectV2ResourceIds(document);
  if (!resourceIds.length) return {};
  const audience = mode === "STUDENT"
    ? { in: [ResourceAudience.STUDENT, ResourceAudience.BOTH] }
    : { in: [ResourceAudience.TEACHER_ONLY, ResourceAudience.BOTH] };
  const resources = await prisma.resource.findMany({
    where: {
      id: { in: resourceIds },
      publisherId,
      published: true,
      archived: false,
      audience,
      OR: [
        { bookId },
        { bookResourceLinks: { some: { bookId, active: true } } },
      ],
    },
    select: { id: true },
  });
  const prefix = mode === "STUDENT" ? "/api/student/resources" : "/api/resources";
  const suffix = mode === "STUDENT" ? "/open" : "/play";
  return Object.fromEntries(resources.map((resource) => [
    resource.id,
    `${prefix}/${encodeURIComponent(resource.id)}${suffix}`,
  ]));
}

function collectV2ResourceIds(document: ContentDocument) {
  const ids = new Set<string>();
  const collectFrame = (frame: LayoutV2Frame) => {
    const resourceId = frame.resourceId ?? frame.contentRef?.resourceId;
    if (resourceId) ids.add(resourceId);
    frame.children?.forEach(collectFrame);
  };
  document.pageLayout?.pages.forEach((page) => {
    if (page.narration?.resourceId) ids.add(page.narration.resourceId);
    page.narration?.segments?.forEach((segment) => { if (segment.resourceId) ids.add(segment.resourceId); });
    if (page.background?.resourceId) ids.add(page.background.resourceId);
    page.frames.forEach(collectFrame);
  });
  return [...ids];
}
function remapStudentLinkedAssets(
  linkedAssets: Awaited<ReturnType<typeof resolveLinkedAssetsForDocument>>,
  sectionSubjectId: string,
  chapterId: string,
) {
  const next: typeof linkedAssets = {};
  for (const [blockId, asset] of Object.entries(linkedAssets)) {
    if (!asset) {
      next[blockId] = null;
      continue;
    }
    if (asset.targetType !== "BOOK_EXERCISE") {
      next[blockId] = asset;
      continue;
    }
    next[blockId] = {
      ...asset,
      route: {
        href: `/student-dashboard/subjects/${sectionSubjectId}/chapters/${chapterId}/exercises/${asset.targetId}`,
        openMode: "route",
      },
    };
  }
  return next;
}

function remapStudentMedia(
  media: Awaited<ReturnType<typeof resolveMediaForDocument>>,
) {
  const next: typeof media = {};
  for (const [blockId, item] of Object.entries(media)) {
    if (!item) {
      next[blockId] = null;
      continue;
    }
    if (item.targetType !== "RESOURCE") {
      next[blockId] = item;
      continue;
    }
    next[blockId] = {
      ...item,
      route: item.route
        ? {
            href: `/api/student/resources/${encodeURIComponent(item.targetId)}/open`,
            openMode: "route",
          }
        : null,
      posterRoute: item.offline.posterResourceId
        ? {
            href: `/api/student/resources/${encodeURIComponent(item.offline.posterResourceId)}/open`,
            openMode: "route",
          }
        : item.posterRoute,
    };
  }
  return next;
}

function remapStudentWorksheets(
  worksheets: Awaited<ReturnType<typeof resolveWorksheetsForLinkedAssetDocument>>,
  sectionSubjectId: string,
  chapterId: string,
) {
  const next: typeof worksheets = {};
  for (const [blockId, worksheet] of Object.entries(worksheets)) {
    if (!worksheet) {
      next[blockId] = null;
      continue;
    }
    next[blockId] = {
      ...worksheet,
      exercise: worksheet.exercise
        ? {
            ...worksheet.exercise,
            route: {
              href: `/student-dashboard/subjects/${sectionSubjectId}/chapters/${chapterId}/exercises/${worksheet.exercise.id}`,
              openMode: "route",
            },
          }
        : null,
    };
  }
  return next;
}
