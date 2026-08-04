import "server-only";

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
  hasContent: boolean;
};

export async function loadStudentChapterStructuredContent(
  sectionSubjectId: string,
  chapterId: string,
) {
  const workspace = await getStudentChapterWorkspace(sectionSubjectId, chapterId);
  if (!workspace?.subject.book) return null;
  const modules = await prisma.bookModule.findMany({
    where: {
      bookId: workspace.subject.book.id,
      chapterId,
      published: true,
      archived: false,
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
}) {
  const { scope, subject } = await requireTeacherSubject(input.sectionId, input.sectionSubjectId);
  const adoption = subject.bookAdoptions[0];
  if (!adoption?.book) return null;
  const chapter = await prisma.bookChapter.findFirst({
    where: {
      id: input.chapterId,
      bookId: adoption.book.id,
      published: true,
      archived: false,
    },
    select: { id: true, title: true, chapterNumber: true },
  });
  if (!chapter) return null;
  const modules = await prisma.bookModule.findMany({
    where: { bookId: adoption.book.id, chapterId: chapter.id, published: true, archived: false },
    select: { id: true, title: true, content: true },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });
  const rendered = await Promise.all(
    modules.map((moduleNode) =>
      buildSafeStructuredContent({
        publisherId: scope.publisherId,
        bookId: adoption.book.id,
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
    hasContent: documentHasRenderableContent(document),
  };
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
