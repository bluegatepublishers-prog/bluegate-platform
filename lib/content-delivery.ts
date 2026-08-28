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
import { resolvePublishedSmartBookContent, type PublishedSmartBookContent } from "@/lib/smart-book-release-runtime";
import { restrictPublishedBookDocumentToModuleRange } from "@/lib/teaching-plan-policy";
import { resolveManifestActivities, resolveManifestLinkedAssets, resolveManifestMedia, resolveManifestQuestions, resolveManifestResourceUrls, resolveManifestWorksheets } from "@/lib/smart-book-release-projection";

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
  immutableRelease: boolean;
};

export async function loadPublishedModuleStructuredContent(input: {
  publisherId: string;
  bookId: string;
  moduleId: string;
  mode: ContentRenderMode;
}) {
  const release = await resolvePublishedSmartBookContent({ publisherId: input.publisherId, bookId: input.bookId });
  if (!release) return null;
  const moduleNode = release.manifest.hierarchy.find((node) => node.kind === "MODULE" && node.sourceId === input.moduleId);
  if (!moduleNode?.chapterSourceId) return null;
  return buildImmutableChapterModuleContent({ release, chapterId: moduleNode.chapterSourceId, moduleId: moduleNode.sourceId, mode: input.mode })[0] ?? null;
}

export async function loadSmartBookStructuredContent(input: {
  publisherId: string;
  bookId: string;
  mode: ContentRenderMode;
  requirePublishedRelease?: boolean;
  publishedContent?: PublishedSmartBookContent | null;
}) {
  const book = await prisma.book.findFirst({
    where: { id: input.bookId, publisherId: input.publisherId, published: true, archived: false },
    select: { id: true },
  });
  if (!book) return null;

  const release = input.publishedContent === undefined
    ? await resolvePublishedSmartBookContent({ publisherId: input.publisherId, bookId: input.bookId })
    : input.publishedContent;
  if (!release) return null;
  return buildImmutableSmartBookStructuredContent(release, input.mode);
}

function buildImmutableSmartBookStructuredContent(
  release: PublishedSmartBookContent,
  mode: ContentRenderMode,
) {
  const document = filterDocumentForMode(bindImmutableLauncherIdentity(release.document, release.releaseVersionId, release.manifest.identity.bookId), mode, []);
  return {
    releaseVersionId: release.releaseVersionId,
    bookPdfVersionId: release.manifest.pdf.bookPdfVersionId,
    document,
    linkedAssets: resolveManifestLinkedAssets(release.manifest, document, mode, release.releaseVersionId),
    questions: resolveManifestQuestions(release.manifest, mode, release.releaseVersionId),
    activities: resolveManifestActivities(release.manifest, mode, release.releaseVersionId),
    worksheets: resolveManifestWorksheets(release.manifest, mode, release.releaseVersionId),
    media: resolveManifestMedia(release.manifest, document, mode, release.releaseVersionId),
    sections: [],
    knowledgeDefinitions: {},
    v2ResourceUrls: resolveManifestResourceUrls(release.manifest, document, mode, release.releaseVersionId),
  };
}
export async function loadStudentChapterStructuredContent(
  sectionSubjectId: string,
  chapterId: string,
  moduleId?: string,
) {
  const workspace = await getStudentChapterWorkspace(sectionSubjectId, chapterId);
  if (!workspace?.subject.book) return null;
  const release = await resolvePublishedSmartBookContent({ publisherId: workspace.identity.publisher.id, bookId: workspace.subject.book.id });
  if (!release) return null;
  const rendered = buildImmutableChapterModuleContent({ release, chapterId, moduleId, mode: "STUDENT" });
  return {
  workspace,
  release: {
    releaseId: release.releaseId,
    releaseVersionId: release.releaseVersionId,
    versionNumber: release.versionNumber,
  },
  items: rendered.map((item) => ({
      ...item,
      linkedAssets: remapStudentLinkedAssets(item.linkedAssets, sectionSubjectId, chapterId),
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
  const release = await resolvePublishedSmartBookContent({ publisherId: scope.publisherId, bookId });
  if (!release) return null;
  const chapterNode = release.manifest.hierarchy.find((node) => node.kind === "CHAPTER" && node.sourceId === input.chapterId);
  if (!chapterNode) return null;
  const chapter = { id: chapterNode.sourceId, title: chapterNode.title, chapterNumber: chapterNode.number ?? 0 };
  return {
    scope,
    subject,
    bookId,
    chapter,
    release: {
      releaseId: release.releaseId,
      releaseVersionId: release.releaseVersionId,
      versionNumber: release.versionNumber,
    },
    items: buildImmutableChapterModuleContent({ release, chapterId: chapter.id, moduleId: input.moduleId, mode: "TEACHER" }),
  };
}
function buildImmutableChapterModuleContent(input: {
  release: PublishedSmartBookContent;
  chapterId: string;
  moduleId?: string | null;
  mode: ContentRenderMode;
}): SafeStructuredContentModel[] {
  const chapter = input.release.manifest.hierarchy.find((node) => node.kind === "CHAPTER" && node.sourceId === input.chapterId);
  if (!chapter) return [];
  const modules = input.release.manifest.hierarchy
    .filter((node) => node.kind === "MODULE" && node.chapterSourceId === chapter.sourceId && (!input.moduleId?.trim() || node.sourceId === input.moduleId.trim()))
    .sort((left, right) => left.displayOrder - right.displayOrder || left.sourceId.localeCompare(right.sourceId));
  return modules.map((moduleNode) => {
    const rangedDocument = restrictPublishedBookDocumentToModuleRange(input.release.document, {
      moduleStartPage: moduleNode.startPage,
      moduleEndPage: moduleNode.endPage,
      chapterStartPage: chapter.startPage,
      chapterEndPage: chapter.endPage,
    });
    const document = filterDocumentForMode(bindImmutableLauncherIdentity(rangedDocument ?? input.release.document, input.release.releaseVersionId, input.release.manifest.identity.bookId), input.mode, []);
    return {
      id: moduleNode.sourceId,
      title: moduleNode.title,
      type: "MODULE",
      mode: input.mode,
      document,
      linkedAssets: resolveManifestLinkedAssets(input.release.manifest, document, input.mode, input.release.releaseVersionId),
      questions: resolveManifestQuestions(input.release.manifest, input.mode, input.release.releaseVersionId),
      activities: resolveManifestActivities(input.release.manifest, input.mode, input.release.releaseVersionId),
      worksheets: resolveManifestWorksheets(input.release.manifest, input.mode, input.release.releaseVersionId),
      media: resolveManifestMedia(input.release.manifest, document, input.mode, input.release.releaseVersionId),
      knowledgeDefinitions: {},
      sections: [],
      v2ResourceUrls: resolveManifestResourceUrls(input.release.manifest, document, input.mode, input.release.releaseVersionId),
      hasContent: isLayoutV2Document(document) ? hasRenderableV2Content(document) : documentHasRenderableContent(document),
      immutableRelease: true,
    };
  });
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
      route: item.route,
      posterRoute: item.posterRoute,
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


function bindImmutableLauncherIdentity(document: ContentDocument, releaseVersionId: string, bookId: string): ContentDocument {
  const bindFrame = (frame: LayoutV2Frame): LayoutV2Frame => ({ ...frame, payload: (frame.type === "ASSESSMENT_LAUNCHER" || frame.type === "WORKSHEET") && frame.payload && typeof frame.payload === "object" && !Array.isArray(frame.payload) ? { ...(frame.payload as Record<string, unknown>), bookId, releaseVersionId } : frame.payload, children: frame.children?.map(bindFrame) });
  return { ...document, pageLayout: document.pageLayout ? { ...document.pageLayout, pages: document.pageLayout.pages.map((page) => ({ ...page, frames: page.frames.map(bindFrame) })) } : document.pageLayout };
}
