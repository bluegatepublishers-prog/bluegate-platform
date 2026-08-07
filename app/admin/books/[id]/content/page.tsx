import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";

import BookInspectorEditor from "@/components/admin/books/BookInspectorEditor";
import BookStudioResourcePanel from "@/components/admin/books/BookStudioResourcePanel";
import ContentEditorForm from "@/components/admin/books/ContentEditorForm";
import ContentManuscriptEditor from "@/components/admin/books/ContentManuscriptEditor";
import ContentReleasePanel from "@/components/admin/books/ContentReleasePanel";
import ContentSectionManager from "@/components/admin/books/ContentSectionManager";
import ContentStudioShell from "@/components/admin/books/ContentStudioShell";
import ActivityStudio from "@/components/admin/books/ActivityStudio";
import ExerciseAuthoringStudio from "@/components/admin/books/ExerciseAuthoringStudio";
import WorksheetStudio from "@/components/admin/books/WorksheetStudio";
import {
  getContentNodeScope,
  loadContentSectionDefinitions,
  loadLinkedAssetOptions,
  resolveLinkedAssetsForDocument,
} from "@/lib/content-linked-assets";
import {
  loadContentStudioMediaOptions,
  resolveMediaForDocument,
} from "@/lib/content-media";
import {
  knowledgeKey,
  requireKnowledgeBookScope,
  resolveKnowledgeDefinitionsForDocument,
  searchKnowledgeDefinitions,
} from "@/lib/content-knowledge";
import {
  loadExerciseStudio,
  loadExerciseStudioLookups,
} from "@/lib/exercise-authoring";
import {
  loadActivityResourceOptions,
  loadActivityStudio,
  resolveActivitiesForLinkedAssetDocument,
} from "@/lib/activity-studio";
import {
  loadWorksheetStudio,
  loadWorksheetStudioLookups,
  resolveWorksheetsForLinkedAssetDocument,
} from "@/lib/worksheet-studio";
import { isLinkedAssetBlock, isTextBlock, normalizeContentDocument } from "@/lib/content-document";
import {
  loadReleaseSummary,
  releaseTargetForNode,
} from "@/lib/content-release";
import {
  buildContentStudioTree,
  flattenContentTree,
  type ContentTreeNode,
} from "@/lib/content-studio-tree";
import { prisma } from "@/lib/prisma";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";
import {
  archiveExerciseAction,
  archiveExerciseQuestionAction,
  archiveActivityStudioAction,
  archiveContentSectionDefinitionAction,
  archiveWorksheetStudioAction,
  bulkPublishContentReleaseAction,
  changeContentReleaseAction,
  createWorksheetExerciseAction,
  duplicateActivityStudioAction,
  duplicateExerciseQuestionAction,
  duplicateWorksheetStudioAction,
  moveContentSectionDefinitionAction,
  moveActivityStudioAction,
  moveExerciseQuestionAction,
  moveWorksheetStudioAction,
  saveChapterKnowledgeAction,
  saveContentSectionDefinitionAction,
  saveContentNodeAction,
  saveActivityStudioAction,
  saveExerciseQuestionAction,
  saveExerciseQuestionGroupAction,
  saveExerciseStudioExerciseAction,
  saveWorksheetStudioAction,
  saveKnowledgeDefinitionAction,
  searchKnowledgeDefinitionsAction,
  rollbackContentReleaseAction,
} from "./actions";
import { moveOutcome, saveOutcome } from "../knowledge-actions";
import type { BookStructureNodeType } from "@/lib/book-structure-management";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = {
  selected?: string;
  q?: string;
  type?: string;
  difficulty?: string;
  marks?: string;
  bloom?: string;
  status?: string;
  page?: string;
};

type BookPageData = NonNullable<Awaited<ReturnType<typeof loadBookStudio>>>;

const field =
  "mt-2 w-full rounded-[1.25rem] border border-transparent bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-200";

export default async function ContentStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Params>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const actor = await requirePublisherAdminBookOwnership(id);
  const studio = await loadBookStudio(id, actor.publisherId);
  if (!studio) notFound();
  const sectionDefinitions = await loadContentSectionDefinitions(actor.publisherId, id);
  const knowledgeScope = await requireKnowledgeBookScope(actor.publisherId, id);
  const knowledgeDefinitions = await searchKnowledgeDefinitions(knowledgeScope, "");

  const root = buildContentStudioTree({
    book: { id: studio.id, title: studio.title },
    parts: studio.parts,
    units: studio.units,
    chapters: studio.chapters.map((chapter) => ({
      ...chapter,
      counts: {
        outcomes: chapter._count.learningOutcomes,
        activities: chapter._count.activities,
        worksheets: chapter._count.worksheets,
        exercises: chapter._count.exercises,
        questions: chapter._count.questions,
        assessments: chapter._count.assessments,
        resources: chapter._count.resourceLinks,
        media: chapter._count.resourceLinks,
        qr: chapter._count.dynamicQrCodes,
      },
    })),
    modules: studio.modules,
    topics: studio.topics,
  });

  const selected =
    flattenContentTree(root).find((node) => node.key === query.selected) ?? root;

  return (
    <main className="space-y-4">
      <ContentStudioShell
        bookId={id}
        bookTitle={studio.title}
        root={root}
        selectedKey={selected.key}
        selectedTitle={selected.title}
      >
        <SelectedCanvas
          studio={studio}
          selected={selected}
          bookId={id}
          userId={actor.userId}
          publisherId={actor.publisherId}
          sectionDefinitions={sectionDefinitions}
          knowledgeDefinitions={knowledgeDefinitions}
          query={query}
        />
      </ContentStudioShell>
    </main>
  );
}

async function loadBookStudio(bookId: string, publisherId: string) {
  return prisma.book.findFirst({
    where: { id: bookId, publisherId },
    select: {
      id: true,
      title: true,
      subtitle: true,
      slug: true,
      isbn: true,
      description: true,
      aboutBook: true,
      classId: true,
      subjectId: true,
      seriesId: true,
      boardId: true,
      board: true,
      published: true,
      featured: true,
      featuredOrder: true,
      author: true,
      updatedAt: true,
      parts: {
        select: { id: true, title: true, archived: true, displayOrder: true },
      },
      units: {
        select: {
          id: true,
          title: true,
          archived: true,
          partId: true,
          displayOrder: true,
        },
      },
      chapters: {
        select: {
          id: true,
          title: true,
          archived: true,
          partId: true,
          unitId: true,
          sortOrder: true,
          chapterNumber: true,
          published: true,
          approved: true,
          summary: true,
          keywords: true,
          _count: {
            select: {
              learningOutcomes: true,
              activities: true,
              worksheets: true,
              exercises: true,
              questions: true,
              assessments: true,
              resourceLinks: { where: { active: true } },
              dynamicQrCodes: true,
            },
          },
        },
      },
      modules: {
        select: {
          id: true,
          title: true,
          archived: true,
          chapterId: true,
          displayOrder: true,
        },
      },
      topics: {
        select: {
          id: true,
          title: true,
          archived: true,
          chapterId: true,
          moduleId: true,
          displayOrder: true,
        },
      },
      class: { select: { name: true } },
      subject: { select: { name: true } },
      series: { select: { name: true } },
    },
  });
}

async function SelectedCanvas({
  studio,
  selected,
  bookId,
  userId,
  publisherId,
  sectionDefinitions,
  knowledgeDefinitions,
  query,
}: {
  studio: BookPageData;
  selected: ContentTreeNode;
  bookId: string;
  userId: string;
  publisherId: string;
  sectionDefinitions: Awaited<ReturnType<typeof loadContentSectionDefinitions>>;
  knowledgeDefinitions: Awaited<ReturnType<typeof searchKnowledgeDefinitions>>;
  query: Params;
}) {
  if (selected.type === "BOOK") {
    return <BookCanvas studio={studio} />;
  }
  if (selected.type === "FOLDER") {
    return (
      <FolderCanvas
        studio={studio}
        bookId={bookId}
        publisherId={publisherId}
        userId={userId}
        folder={selected}
        query={query}
      />
    );
  }
  const record = await loadNode(bookId, selected);
  if (!record) {
    return <Empty text="This content item is unavailable." />;
  }

  if (
    selected.type === "PART" ||
    selected.type === "UNIT" ||
    selected.type === "CHAPTER"
  ) {
    return (
      <StructureOnlyCanvas
        selected={selected}
        record={record}
      />
    );
  }

  // Module is the final editable hierarchy level.
  // Legacy Topic rows remain in the database for compatibility,
  // but Topic is no longer reachable from the Content Studio tree.
  if (selected.type !== "MODULE") {
    return (
      <Empty text="Select a module to open the writing editor." />
    );
  }

  const scope = await getContentNodeScope(
    publisherId,
    bookId,
    selected.type as BookStructureNodeType,
    selected.id,
  );
  const releaseTarget = releaseTargetForNode(selected.type as BookStructureNodeType);
  const releaseSummary = releaseTarget
    ? await loadReleaseSummary({
        actor: { userId, publisherId },
        bookId,
        targetType: releaseTarget,
        targetId: selected.id,
      })
    : null;
  const resources = await loadEditorResources(publisherId);
  const assetOptions = await loadLinkedAssetOptions(scope);
  const mediaOptions = await loadContentStudioMediaOptions(scope);
  const normalizedDocument = normalizeContentDocument(record.content);
  const resolvedAssets = await resolveLinkedAssetsForDocument(
    scope,
    normalizedDocument,
  );
  const resolvedActivities = await resolveActivitiesForLinkedAssetDocument({
    publisherId,
    bookId,
    mode: "ADMIN_PREVIEW",
    blocks: normalizedDocument.blocks
      .filter(isLinkedAssetBlock)
      .map((block) => ({ id: block.id, targetType: block.targetType, targetId: block.targetId })),
  });
  const resolvedWorksheets = await resolveWorksheetsForLinkedAssetDocument({
    publisherId,
    bookId,
    mode: "ADMIN_PREVIEW",
    blocks: normalizedDocument.blocks
      .filter(isLinkedAssetBlock)
      .map((block) => ({ id: block.id, targetType: block.targetType, targetId: block.targetId })),
  });
  const resolvedMedia = await resolveMediaForDocument(
    scope,
    normalizedDocument,
  );
  const resolvedKnowledge = await resolveKnowledgeDefinitionsForDocument(
    scope,
    normalizedDocument,
  );
  let activityRows: Awaited<ReturnType<typeof loadActivityStudio>> = [];
  let activityResources: Awaited<ReturnType<typeof loadActivityResourceOptions>> = [];
  let worksheetRows: Awaited<ReturnType<typeof loadWorksheetStudio>> = [];
  let worksheetLookups: Awaited<ReturnType<typeof loadWorksheetStudioLookups>> | null = null;
  let exerciseRows: Awaited<ReturnType<typeof loadExerciseStudio>> = [];
  let exerciseLookups: Awaited<ReturnType<typeof loadExerciseStudioLookups>> | null = null;
  if (scope.chapterId) {
    [
      activityRows,
      activityResources,
      worksheetRows,
      worksheetLookups,
      exerciseRows,
      exerciseLookups,
    ] = await Promise.all([
      loadActivityStudio({ publisherId, bookId, chapterId: scope.chapterId }),
      loadActivityResourceOptions({ publisherId, bookId, chapterId: scope.chapterId }),
      loadWorksheetStudio({ publisherId, bookId, chapterId: scope.chapterId }),
      loadWorksheetStudioLookups({ publisherId, bookId, chapterId: scope.chapterId }),
      loadExerciseStudio(bookId, scope.chapterId),
      loadExerciseStudioLookups({ publisherId, bookId, chapterId: scope.chapterId }),
    ]);
  }
  return (
    <NodeCanvas
      bookId={bookId}
      selected={selected}
      scope={scope}
      record={record}
      resources={resources}
      assetOptions={assetOptions}
      mediaOptions={mediaOptions}
      resolvedAssets={resolvedAssets}
      resolvedActivities={resolvedActivities}
      resolvedWorksheets={resolvedWorksheets}
      resolvedMedia={resolvedMedia}
      sectionDefinitions={sectionDefinitions}
      knowledgeDefinitions={knowledgeDefinitions}
      resolvedKnowledge={resolvedKnowledge}
      activityRows={activityRows}
      activityResources={activityResources}
      worksheetRows={worksheetRows}
      worksheetLookups={worksheetLookups}
      exerciseRows={exerciseRows}
      exerciseLookups={exerciseLookups}
      releaseSummary={releaseSummary}
    />
  );
}

function BookCanvas({
  studio,
}: {
  studio: BookPageData;
}) {
  const unitCount = studio.units.length;
  const chapterCount =
    studio.chapters.length;
  const moduleCount =
    studio.modules.length;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="rounded-[1.5rem] bg-white px-6 py-5 shadow-sm ring-1 ring-slate-200 sm:px-7 sm:py-6">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-700">
          Workspace
        </p>

        <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-950">
          {studio.title}
        </h2>

        {studio.subtitle ? (
          <p className="mt-1 text-[11px] font-medium text-slate-500">
            {studio.subtitle}
          </p>
        ) : null}

        <div className="mt-3 max-w-4xl text-[11px] leading-[1.65] text-slate-600">
          <p>
            {studio.description ||
              studio.aboutBook ||
              "No editorial summary is stored for this book yet."}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <CanvasMetric
          label="Parts"
          value={studio.parts.length}
        />
        <CanvasMetric
          label="Units"
          value={unitCount}
        />
        <CanvasMetric
          label="Chapters"
          value={chapterCount}
        />
        <CanvasMetric
          label="Modules"
          value={moduleCount}
        />
      </section>
    </div>
  );
}

function StructureOnlyCanvas({
  selected,
  record,
}: {
  selected: ContentTreeNode;
  record: NonNullable<
    Awaited<ReturnType<typeof loadNode>>
  >;
}) {
  const children =
    selected.children.filter(
      (child) =>
        child.type !== "FOLDER" &&
        child.type !== "TOPIC",
    );

  const typeLabel =
    selected.type === "PART"
      ? "Part"
      : selected.type === "UNIT"
        ? "Unit"
        : "Chapter";

  const nextLabel =
    selected.type === "PART"
      ? "Units"
      : selected.type === "UNIT"
        ? "Chapters"
        : "Modules";

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <section className="rounded-[1.35rem] bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-blue-700">
          {typeLabel} Structure
        </p>

        <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950">
          {record.title}
        </h2>

        {record.description ? (
          <p className="mt-1.5 max-w-3xl text-[10px] leading-5 text-slate-500">
            {record.description}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px]">
          <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-600">
            {nextLabel}: {children.length}
          </span>

          <span className="rounded-md bg-blue-50 px-2 py-1 font-semibold text-blue-700">
            Writing opens only inside a Module
          </span>
        </div>
      </section>

      <section className="rounded-[1.35rem] bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
              {nextLabel}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Use the + button in the hierarchy to add the next level.
            </p>
          </div>
        </div>

        {children.length ? (
          <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {children.map((child) => (
              <div
                key={child.key}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="min-w-0 truncate text-[10px] font-semibold text-slate-700">
                  {child.title}
                </span>

                <span className="shrink-0 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {child.type}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-[10px] text-slate-400">
            No {nextLabel.toLowerCase()} added yet.
          </div>
        )}
      </section>
    </div>
  );
}

async function NodeCanvas({
  bookId,
  selected,
  scope,
  record,
  resources,
  assetOptions,
  mediaOptions,
  resolvedAssets,
  resolvedActivities,
  resolvedWorksheets,
  resolvedMedia,
  sectionDefinitions,
  knowledgeDefinitions,
  resolvedKnowledge,
  activityRows,
  activityResources,
  worksheetRows,
  worksheetLookups,
  exerciseRows,
  exerciseLookups,
  releaseSummary,
}: {
  bookId: string;
  selected: ContentTreeNode;
  scope: Awaited<ReturnType<typeof getContentNodeScope>>;
  record: Awaited<ReturnType<typeof loadNode>>;
  resources: Awaited<ReturnType<typeof loadEditorResources>>;
  assetOptions: Awaited<ReturnType<typeof loadLinkedAssetOptions>>;
  mediaOptions: Awaited<ReturnType<typeof loadContentStudioMediaOptions>>;
  resolvedAssets: Awaited<ReturnType<typeof resolveLinkedAssetsForDocument>>;
  resolvedActivities: Awaited<ReturnType<typeof resolveActivitiesForLinkedAssetDocument>>;
  resolvedWorksheets: Awaited<ReturnType<typeof resolveWorksheetsForLinkedAssetDocument>>;
  resolvedMedia: Awaited<ReturnType<typeof resolveMediaForDocument>>;
  sectionDefinitions: Awaited<ReturnType<typeof loadContentSectionDefinitions>>;
  knowledgeDefinitions: Awaited<ReturnType<typeof searchKnowledgeDefinitions>>;
  resolvedKnowledge: Awaited<ReturnType<typeof resolveKnowledgeDefinitionsForDocument>>;
  activityRows: Awaited<ReturnType<typeof loadActivityStudio>>;
  activityResources: Awaited<ReturnType<typeof loadActivityResourceOptions>>;
  worksheetRows: Awaited<ReturnType<typeof loadWorksheetStudio>>;
  worksheetLookups: Awaited<ReturnType<typeof loadWorksheetStudioLookups>> | null;
  exerciseRows: Awaited<ReturnType<typeof loadExerciseStudio>>;
  exerciseLookups: Awaited<ReturnType<typeof loadExerciseStudioLookups>> | null;
  releaseSummary: Awaited<ReturnType<typeof loadReleaseSummary>> | null;
}) {
  if (!record) return null;
  return (
    <ContentManuscriptEditor
      bookId={bookId}
      nodeId={selected.id}
      nodeType={selected.type as BookStructureNodeType}
      chapterId={scope.chapterId}
      nodeTitle={record.title}
      nodeSubtitle={record.subtitle ?? ""}
      nodeDescription={record.description ?? ""}
      nodeSlug={record.slug ?? ""}
      nodeLabel={record.label ?? ""}
      nodeEstimatedMinutes={record.estimatedMinutes ?? null}
      nodePublished={record.published}
      nodeContent={record.content}
      resources={resources}
      assetOptions={assetOptions}
      mediaOptions={mediaOptions}
      resolvedAssets={resolvedAssets}
      resolvedActivities={resolvedActivities}
      resolvedWorksheets={resolvedWorksheets}
      resolvedMedia={resolvedMedia}
      sectionDefinitions={sectionDefinitions}
      knowledgeDefinitions={knowledgeDefinitions}
      resolvedKnowledge={resolvedKnowledge}
      searchKnowledgeAction={searchKnowledgeDefinitionsAction.bind(null, bookId)}
      saveKnowledgeAction={saveKnowledgeDefinitionAction.bind(null, bookId)}
      saveActivityAction={
        scope.chapterId ? saveActivityStudioAction.bind(null, bookId, scope.chapterId) : null
      }
      duplicateActivityAction={scope.chapterId ? duplicateActivityStudioAction.bind(null, bookId) : null}
      archiveActivityAction={scope.chapterId ? archiveActivityStudioAction.bind(null, bookId) : null}
      moveActivityAction={
  scope.chapterId
    ? moveActivityStudioAction.bind(
        null,
        bookId,
        scope.chapterId,
        scope.moduleId ?? null,
        scope.topicId ?? null,
      )
    : null
}
      saveWorksheetAction={
        scope.chapterId ? saveWorksheetStudioAction.bind(null, bookId, scope.chapterId) : null
      }
      duplicateWorksheetAction={scope.chapterId ? duplicateWorksheetStudioAction.bind(null, bookId) : null}
      archiveWorksheetAction={scope.chapterId ? archiveWorksheetStudioAction.bind(null, bookId) : null}
      moveWorksheetAction={
  scope.chapterId
    ? moveWorksheetStudioAction.bind(
        null,
        bookId,
        scope.chapterId,
        scope.moduleId ?? null,
        scope.topicId ?? null,
      )
    : null
}
      saveExerciseStudioAction={
        scope.chapterId ? saveExerciseStudioExerciseAction.bind(null, bookId, scope.chapterId) : null
      }
      saveExerciseGroupAction={
        scope.chapterId ? saveExerciseQuestionGroupAction.bind(null, bookId, scope.chapterId) : null
      }
      saveExerciseQuestionAction={
        scope.chapterId ? saveExerciseQuestionAction.bind(null, bookId, scope.chapterId) : null
      }
      moveExerciseQuestionAction={
        scope.chapterId ? moveExerciseQuestionAction.bind(null, bookId, scope.chapterId) : null
      }
      duplicateExerciseQuestionAction={
        scope.chapterId ? duplicateExerciseQuestionAction.bind(null, bookId, scope.chapterId) : null
      }
      archiveExerciseQuestionAction={
        scope.chapterId ? archiveExerciseQuestionAction.bind(null, bookId, scope.chapterId) : null
      }
      archiveExerciseAction={
        scope.chapterId ? archiveExerciseAction.bind(null, bookId, scope.chapterId) : null
      }
      createWorksheetExerciseAction={
        scope.chapterId ? createWorksheetExerciseAction.bind(null, bookId, scope.chapterId) : null
      }
      activityRows={activityRows}
      activityResources={activityResources}
      worksheetRows={worksheetRows}
      worksheetLookups={worksheetLookups}
      exerciseRows={exerciseRows}
      exerciseLookups={exerciseLookups}
      releaseSummary={releaseSummary}
      transitionReleaseAction={
        releaseSummary
          ? changeContentReleaseAction.bind(null, bookId, releaseSummary.targetType, selected.id)
          : null
      }
      rollbackReleaseAction={
        releaseSummary
          ? rollbackContentReleaseAction.bind(null, bookId, releaseSummary.targetType, selected.id)
          : null
      }
      bulkPublishAction={
        releaseSummary?.targetType === "CHAPTER"
          ? bulkPublishContentReleaseAction.bind(null, bookId, "CHAPTER", selected.id)
          : null
      }
      previewBaseHref={`/admin/books/${bookId}/content/releases`}
      saveAction={saveContentNodeAction.bind(
        null,
        bookId,
        selected.type as BookStructureNodeType,
        selected.id,
      )}
    />
  );
}

export async function ChapterKnowledge({
  bookId,
  chapterId,
}: {
  bookId: string;
  chapterId: string;
}) {
  const chapter = await prisma.bookChapter.findFirst({
    where: { id: chapterId, bookId },
    select: {
      summary: true,
      extractedText: true,
      reviewedText: true,
      keywords: true,
      approved: true,
    },
  });
  if (!chapter) return null;

  return (
    <section className="mx-auto max-w-5xl rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
        Chapter Knowledge
      </p>
      <ContentEditorForm
        action={saveChapterKnowledgeAction.bind(null, bookId, chapterId)}
        className="mt-5 space-y-8"
        submitLabel="Save Knowledge"
      >
        <Field label="Summary">
          <textarea
            name="summary"
            rows={5}
            defaultValue={chapter.summary ?? ""}
            className={field}
          />
        </Field>
        <Field label="Source Content">
          <textarea
            name="extractedText"
            rows={10}
            defaultValue={chapter.extractedText ?? ""}
            className={field}
          />
        </Field>
        <Field label="Reviewed Content">
          <textarea
            name="reviewedText"
            rows={12}
            defaultValue={chapter.reviewedText ?? ""}
            className={field}
          />
        </Field>
        <div className="grid gap-4 rounded-[1.5rem] bg-[#f7f4ed] p-5 ring-1 ring-slate-200 lg:grid-cols-[minmax(0,1fr)_auto]">
          <Field label="Keywords">
            <input
              name="keywords"
              defaultValue={chapter.keywords.join(", ")}
              className={field}
            />
          </Field>
          <label className="flex items-center gap-3 rounded-[1.25rem] bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
            <input name="approved" type="checkbox" defaultChecked={chapter.approved} />
            Approved
          </label>
        </div>
      </ContentEditorForm>
    </section>
  );
}

type FolderScopeDetails = {
  scopeType: "CHAPTER" | "MODULE" | "TOPIC";
  chapter: { id: string; title: string; chapterNumber: number } | null;
  module: { id: string; title: string } | null;
  topic: { id: string; title: string } | null;
};

function resolveFolderScope(studio: BookPageData, folder: ContentTreeNode): FolderScopeDetails {
  const chapter = folder.chapterId
    ? studio.chapters.find((item) => item.id === folder.chapterId) ?? null
    : null;
  const moduleNode = folder.moduleId
    ? studio.modules.find((item) => item.id === folder.moduleId) ?? null
    : null;
  const topic = folder.topicId
    ? studio.topics.find((item) => item.id === folder.topicId) ?? null
    : null;
  return {
    scopeType: folder.scopeType ?? "CHAPTER",
    chapter: chapter
      ? { id: chapter.id, title: chapter.title, chapterNumber: chapter.chapterNumber }
      : null,
    module: moduleNode ? { id: moduleNode.id, title: moduleNode.title } : null,
    topic: topic ? { id: topic.id, title: topic.title } : null,
  };
}

function scopePathLabel(scope: FolderScopeDetails) {
  const parts = [
    scope.chapter ? `Chapter ${scope.chapter.chapterNumber}` : null,
    scope.module ? `Module: ${scope.module.title}` : null,
    scope.topic ? `Topic: ${scope.topic.title}` : null,
  ].filter(Boolean);
  return parts.join(" / ") || "Book scope";
}

async function FolderCanvas({
  studio,
  bookId,
  publisherId,
  userId,
  folder,
  query,
}: {
  studio: BookPageData;
  bookId: string;
  publisherId: string;
  userId: string;
  folder: ContentTreeNode;
  query: Params;
}) {
  const chapterId = folder.chapterId;
  const kind = folder.folderKind;
  if (!chapterId || !kind) return <Empty text="This workspace area is unavailable." />;
  const scope = resolveFolderScope(studio, folder);
  const chapter = scope.chapter;
  if (!chapter) return <Empty text="Chapter not found." />;
  const moduleId = scope.module?.id ?? null;
  const topicId = scope.topic?.id ?? null;
  const isChapterLevelScope = scope.scopeType === "CHAPTER";

  if (kind === "outcomes") {
    const rows = await prisma.chapterLearningOutcome.findMany({
      where: {
        chapterId,
        ...(topicId ? { topicId } : moduleId ? { moduleId, topicId: null } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
    return (
      <FolderShell
        title={isChapterLevelScope ? "Chapter-Level Outcomes" : "Learning Outcomes"}
        scope={scope}
      >
        <OutcomeForm
          action={saveOutcome.bind(null, bookId)}
          chapterId={chapterId}
          moduleId={moduleId}
          topicId={topicId}
        />
        <div className="space-y-4">
          {rows.map((row) => (
            <ContentEditorForm
              key={row.id}
              action={saveOutcome.bind(null, bookId)}
              submitLabel="Save Outcome"
              className="space-y-5 rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="chapterId" value={chapterId} />
              <input type="hidden" name="moduleId" value={row.moduleId ?? moduleId ?? ""} />
              <input type="hidden" name="topicId" value={row.topicId ?? topicId ?? ""} />
              <Field label="Outcome">
                <textarea
                  name="outcome"
                  rows={4}
                  defaultValue={row.outcome}
                  className={field}
                />
              </Field>
              <div className="grid gap-4 lg:grid-cols-3">
                <Field label="Bloom Level">
                  <input name="bloomLevel" defaultValue={row.bloomLevel ?? ""} className={field} />
                </Field>
                <Field label="Competency">
                  <input name="competency" defaultValue={row.competency ?? ""} className={field} />
                </Field>
                <Field label="Order">
                  <input name="sortOrder" type="number" min="0" defaultValue={row.sortOrder} className={field} />
                </Field>
              </div>
              <div className="flex gap-2">
                <form action={moveOutcome.bind(null, bookId, row.id, -1)}>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                    Move Up
                  </button>
                </form>
                <form action={moveOutcome.bind(null, bookId, row.id, 1)}>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                    Move Down
                  </button>
                </form>
              </div>
            </ContentEditorForm>
          ))}
        </div>
        {!rows.length ? <Empty text="No learning outcomes yet." /> : null}
      </FolderShell>
    );
  }

  if (kind === "activities") {
    const [rows, resourceOptions] = await Promise.all([
      loadActivityStudio({ publisherId, bookId, chapterId, moduleId, topicId }),
      loadActivityResourceOptions({ publisherId, bookId, chapterId, moduleId, topicId }),
    ]);
    const releaseSummaries = await loadReleaseSummaryMap(
      { userId, publisherId },
      bookId,
      "ACTIVITY",
      rows.map((row) => row.id),
    );
    const modules = studio.modules
      .filter((module) => module.chapterId === chapterId && !module.archived)
      .map((module) => ({ id: module.id, title: module.title }));
    const topics = studio.topics
      .filter((topic) => topic.chapterId === chapterId && !topic.archived)
      .map((topic) => ({ id: topic.id, title: topic.title, moduleId: topic.moduleId }));
    return (
      <FolderShell
        title={isChapterLevelScope ? "Chapter-Level Activities" : "Activities"}
        scope={scope}
      >
        <ActivityStudio
          chapterId={chapterId}
          activities={rows}
          resources={resourceOptions}
          modules={modules}
          topics={topics}
          defaultModuleId={moduleId}
          defaultTopicId={topicId}
          bookTitle={studio.title}
          chapterTitle={chapter.title}
          moduleTitle={scope.module?.title ?? null}
          topicTitle={scope.topic?.title ?? null}
          currentScopeLabel={scopePathLabel(scope)}
          saveAction={saveActivityStudioAction.bind(null, bookId, chapterId)}
          duplicateAction={duplicateActivityStudioAction.bind(null, bookId)}
          archiveAction={archiveActivityStudioAction.bind(null, bookId)}
          moveAction={moveActivityStudioAction.bind(null, bookId, chapterId, moduleId, topicId)}
          releaseSummaries={releaseSummaries}
          transitionReleaseAction={changeContentReleaseAction.bind(null, bookId, "ACTIVITY")}
          rollbackReleaseAction={rollbackContentReleaseAction.bind(null, bookId, "ACTIVITY")}
          previewBaseHref={`/admin/books/${bookId}/content/releases`}
        />
      </FolderShell>
    );
  }

  if (kind === "worksheets") {
    const [rows, lookups] = await Promise.all([
      loadWorksheetStudio({ publisherId, bookId, chapterId, moduleId, topicId }),
      loadWorksheetStudioLookups({ publisherId, bookId, chapterId, moduleId, topicId }),
    ]);
    const releaseSummaries = await loadReleaseSummaryMap(
      { userId, publisherId },
      bookId,
      "WORKSHEET",
      rows.map((row: { id: string }) => row.id)
    );
    return (
      <FolderShell
        title={isChapterLevelScope ? "Chapter-Level Worksheets" : "Worksheets"}
        scope={scope}
      >
        <WorksheetStudio
          chapterId={chapterId}
          worksheets={rows}
          lookups={lookups}
          defaultModuleId={moduleId}
          defaultTopicId={topicId}
          bookTitle={studio.title}
          chapterTitle={chapter.title}
          moduleTitle={scope.module?.title ?? null}
          topicTitle={scope.topic?.title ?? null}
          currentScopeLabel={scopePathLabel(scope)}
          saveAction={saveWorksheetStudioAction.bind(null, bookId, chapterId)}
          duplicateAction={duplicateWorksheetStudioAction.bind(null, bookId)}
          archiveAction={archiveWorksheetStudioAction.bind(null, bookId)}
          moveAction={moveWorksheetStudioAction.bind(null, bookId, chapterId, moduleId, topicId)}
          createExerciseAction={createWorksheetExerciseAction.bind(null, bookId, chapterId)}
          releaseSummaries={releaseSummaries}
          transitionReleaseAction={changeContentReleaseAction.bind(null, bookId, "WORKSHEET")}
          rollbackReleaseAction={rollbackContentReleaseAction.bind(null, bookId, "WORKSHEET")}
          previewBaseHref={`/admin/books/${bookId}/content/releases`}
        />
      </FolderShell>
    );
  }

  if (kind === "exercises") {
    const [rows, lookups] = await Promise.all([
      loadExerciseStudio(bookId, chapterId, { moduleId, topicId, chapterEndOnly: isChapterLevelScope }),
      loadExerciseStudioLookups({ publisherId, bookId, chapterId, moduleId, topicId }),
    ]);
    const releaseSummaries = await loadReleaseSummaryMap(
      { userId, publisherId },
      bookId,
      "EXERCISE",
      rows.map((row) => row.id),
    );
    return (
      <FolderShell
        title={isChapterLevelScope ? "Chapter-End Exercise" : "Exercises"}
        scope={scope}
      >
        <ExerciseAuthoringStudio
          exercises={rows}
          lookups={lookups}
          defaultModuleId={isChapterLevelScope ? null : moduleId}
          defaultTopicId={isChapterLevelScope ? null : topicId}
          bookTitle={studio.title}
          chapterTitle={chapter.title}
          moduleTitle={scope.module?.title ?? null}
          topicTitle={scope.topic?.title ?? null}
          currentScopeLabel={scopePathLabel(scope)}
          saveExerciseAction={saveExerciseStudioExerciseAction.bind(null, bookId, chapterId)}
          saveGroupAction={saveExerciseQuestionGroupAction.bind(null, bookId, chapterId)}
          saveQuestionAction={saveExerciseQuestionAction.bind(null, bookId, chapterId)}
          moveQuestionAction={moveExerciseQuestionAction.bind(null, bookId, chapterId)}
          duplicateQuestionAction={duplicateExerciseQuestionAction.bind(null, bookId, chapterId)}
          archiveQuestionAction={archiveExerciseQuestionAction.bind(null, bookId, chapterId)}
          archiveExerciseAction={archiveExerciseAction.bind(null, bookId, chapterId)}
          releaseSummaries={releaseSummaries}
          transitionReleaseAction={changeContentReleaseAction.bind(null, bookId, "EXERCISE")}
          rollbackReleaseAction={rollbackContentReleaseAction.bind(null, bookId, "EXERCISE")}
          previewBaseHref={`/admin/books/${bookId}/content/releases`}
        />
      </FolderShell>
    );
  }

  if (kind === "questions") {
    return (
      <QuestionsPanel
        bookId={bookId}
        chapterId={chapterId}
        moduleId={moduleId}
        topicId={topicId}
        chapterNumber={chapter.chapterNumber}
        chapterTitle={chapter.title}
        moduleTitle={scope.module?.title ?? null}
        topicTitle={scope.topic?.title ?? null}
        query={query}
      />
    );
  }

  if (kind === "resources" || kind === "media") {
    return (
      <FolderShell
        title={kind === "media" ? (isChapterLevelScope ? "Chapter Media" : "Media") : isChapterLevelScope ? "Chapter Resources" : "Resources"}
        scope={scope}
      >
        <section className="rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-lg font-bold text-slate-950">
            {kind === "media" ? "Media Attachments" : "Resource Attachments"}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Manage reusable {kind === "media" ? "media" : "resource"} links for this {scope.scopeType.toLowerCase()} scope from the Inspector panel without leaving the workspace.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/admin/resources/new?returnTo=${encodeURIComponent(`/admin/books/${bookId}/content?selected=${folder.key}`)}`}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
            >
              {kind === "media" ? "Upload New Media" : "Upload New Resource"}
            </Link>
            <Link
              href="/admin/resources"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Open Resource Library
            </Link>
          </div>
        </section>
      </FolderShell>
    );
  }

  if (kind === "qr") {
    const scopedRows = await prisma.dynamicQrCode.findMany({
      where: {
        bookId,
        chapterId,
        publisherId,
        ...(moduleId ? { moduleId } : { moduleId: null }),
        ...(topicId ? { topicId } : { topicId: null }),
      },
      include: { currentDestination: { select: { type: true } } },
      orderBy: { updatedAt: "desc" },
      take: 25,
    });
    return (
      <FolderShell
        title={isChapterLevelScope ? "Chapter QR Codes" : "QR Codes"}
        scope={scope}
      >
        <section className="space-y-4">
            <Link
              href={`/admin/qr?create=1&bookId=${bookId}&targetType=${topicId ? "TOPIC" : moduleId ? "MODULE" : "CHAPTER"}&targetId=${encodeURIComponent(topicId ?? moduleId ?? chapterId)}&bookTitle=${encodeURIComponent(studio.title)}&targetTitle=${encodeURIComponent(topicId ? scope.topic?.title ?? chapter.title : moduleId ? scope.module?.title ?? chapter.title : chapter.title)}`}
              className="inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
            >
            Create QR For This Scope
          </Link>
          {scopedRows.map((row) => (
            <article key={row.id} className="rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-950">{row.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {row.status} · {row.audience} · {row.currentDestination?.type ?? "No destination"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/qr/r/${row.publicCode}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                    Permanent URL
                  </Link>
                  <Link href={`/admin/qr?qrId=${row.id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                    Details
                  </Link>
                </div>
              </div>
            </article>
          ))}
          {!scopedRows.length ? <Empty text="No QR codes are connected to this chapter." /> : null}
        </section>
      </FolderShell>
    );
  }

  return (
    <FolderShell title="Assessments" scope={scope}>
      <Empty text="Publisher assessment content is not wired into this sprint workspace." />
    </FolderShell>
  );
}

async function QuestionsPanel({
  bookId,
  chapterId,
  moduleId,
  topicId,
  chapterNumber,
  chapterTitle,
  moduleTitle,
  topicTitle,
  query,
}: {
  bookId: string;
  chapterId: string;
  moduleId: string | null;
  topicId: string | null;
  chapterNumber: number;
  chapterTitle: string;
  moduleTitle: string | null;
  topicTitle: string | null;
  query: Params;
}) {
  const page = Math.max(1, Number(query.page) || 1);
  const take = 20;
  const where: Prisma.BookQuestionWhereInput = {
    bookId,
    chapterId,
    ...(topicId ? { topicId } : moduleId ? { moduleId, topicId: null } : {}),
    questionText: query.q ? { contains: query.q, mode: "insensitive" } : undefined,
    questionType: query.type || undefined,
    difficulty: query.difficulty || undefined,
    marks: query.marks ? Number(query.marks) : undefined,
    bloomLevel: query.bloom || undefined,
    approved: query.status === "approved" ? true : query.status === "pending" ? false : undefined,
  };
  const [rows, total] = await Promise.all([
    prisma.bookQuestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.bookQuestion.count({ where }),
  ]);

  return (
    <FolderShell
      title={topicId || moduleId ? "Questions" : "Chapter-Level Questions"}
      scope={{
        scopeType: topicId ? "TOPIC" : moduleId ? "MODULE" : "CHAPTER",
        chapter: { id: chapterId, title: chapterTitle, chapterNumber },
        module: moduleId && moduleTitle ? { id: moduleId, title: moduleTitle } : null,
        topic: topicId && topicTitle ? { id: topicId, title: topicTitle } : null,
      }}
    >
      <section className="space-y-4 rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <form className="grid gap-3 xl:grid-cols-6">
          <input
            type="hidden"
            name="selected"
            value={
              topicId
                ? `FOLDER:TOPIC:${topicId}:questions`
                : moduleId
                  ? `FOLDER:MODULE:${moduleId}:questions`
                  : `FOLDER:${chapterId}:questions`
            }
          />
          <input name="q" defaultValue={query.q} placeholder="Search questions" className={field} />
          <input name="type" defaultValue={query.type} placeholder="Question type" className={field} />
          <input name="difficulty" defaultValue={query.difficulty} placeholder="Difficulty" className={field} />
          <input name="marks" type="number" min="1" defaultValue={query.marks} placeholder="Marks" className={field} />
          <input name="bloom" defaultValue={query.bloom} placeholder="Bloom level" className={field} />
          <div className="flex gap-2">
            <select name="status" defaultValue={query.status ?? ""} className={field}>
              <option value="">All status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
            <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              Filter
            </button>
          </div>
        </form>
        <div className="flex justify-end">
          <Link
            href={`/admin/books/${bookId}/questions/new?chapterId=${chapterId}${moduleId ? `&moduleId=${encodeURIComponent(moduleId)}` : ""}${topicId ? `&topicId=${encodeURIComponent(topicId)}` : ""}`}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Add Question
          </Link>
        </div>
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="rounded-[1.5rem] bg-[#f7f4ed] p-5 ring-1 ring-slate-200">
              <p className="font-medium text-slate-900">{row.questionText}</p>
              <p className="mt-2 text-xs text-slate-500">
                {row.questionType} · {row.difficulty} · {row.marks} marks · {row.bloomLevel ?? "No Bloom level"} · {row.approved ? "Approved" : "Pending"}
              </p>
              <Link href={`/admin/books/${bookId}/questions/${row.id}/edit`} className="mt-3 inline-flex text-sm font-semibold text-blue-700">
                Edit Question
              </Link>
            </article>
          ))}
        </div>
        {!rows.length ? <Empty text="No matching questions." /> : null}
        <div className="flex justify-between text-sm text-slate-500">
          <span>{total} questions · Page {page} of {Math.max(1, Math.ceil(total / take))}</span>
          <div className="flex gap-2">
            {page > 1 ? <PageLink query={query} chapterId={chapterId} moduleId={moduleId} topicId={topicId} page={page - 1} label="Previous" /> : null}
            {page * take < total ? <PageLink query={query} chapterId={chapterId} moduleId={moduleId} topicId={topicId} page={page + 1} label="Next" /> : null}
          </div>
        </div>
      </section>
    </FolderShell>
  );
}

async function InspectorPanel({
  studio,
  selected,
  userId,
  publisherId,
  sectionDefinitions,
  knowledgeDefinitions,
}: {
  studio: BookPageData;
  selected: ContentTreeNode;
  userId: string;
  publisherId: string;
  sectionDefinitions: Awaited<ReturnType<typeof loadContentSectionDefinitions>>;
  knowledgeDefinitions: Awaited<ReturnType<typeof searchKnowledgeDefinitions>>;
}) {
  if (selected.type === "BOOK") {
    const [classes, subjects, series, boards, releaseSummary, sectionReleaseSummaries] = await Promise.all([
      prisma.class.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.subject.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.bookSeries.findMany({
        where: {
          publisherId,
          OR: [{ active: true }, { id: studio.seriesId ?? undefined }],
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.board.findMany({
        where: {
          publisherId,
          OR: [{ active: true }, { id: studio.boardId ?? undefined }],
        },
        select: { id: true, name: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      }),
      loadReleaseSummary({
        actor: { userId, publisherId },
        bookId: studio.id,
        targetType: "BOOK",
        targetId: studio.id,
      }),
      loadReleaseSummaryMap(
        { userId, publisherId },
        studio.id,
        "SECTION",
        sectionDefinitions.map((section) => section.id),
      ),
    ]);
    return (
      <div className="space-y-6">
        <InspectorGroup title="Properties">
          <BookInspectorEditor
            book={{
              id: studio.id,
              title: studio.title,
              subtitle: studio.subtitle ?? "",
              classId: studio.classId,
              subjectId: studio.subjectId,
              seriesId: studio.seriesId ?? "",
              boardId: studio.boardId ?? "",
              isbn: studio.isbn ?? "",
              published: studio.published,
              featured: studio.featured,
              description: studio.description ?? "",
              updatedAt: studio.updatedAt.toISOString(),
            }}
            classes={classes}
            subjects={subjects}
            series={series}
            boards={boards}
          />
        </InspectorGroup>
        <InspectorGroup title="Publishing">
          <ContentReleasePanel
            summary={releaseSummary}
            transitionAction={changeContentReleaseAction.bind(null, studio.id, "BOOK", studio.id)}
            rollbackAction={rollbackContentReleaseAction.bind(null, studio.id, "BOOK", studio.id)}
            bulkPublishAction={bulkPublishContentReleaseAction.bind(null, studio.id, "BOOK", studio.id)}
            previewBaseHref={`/admin/books/${studio.id}/content/releases`}
          />
        </InspectorGroup>
        <InspectorGroup title="Sections">
          <ContentSectionManager
            sections={sectionDefinitions}
            saveAction={saveContentSectionDefinitionAction.bind(null, studio.id)}
            archiveAction={archiveContentSectionDefinitionAction.bind(null, studio.id)}
            moveAction={moveContentSectionDefinitionAction.bind(null, studio.id)}
            releaseSummaries={sectionReleaseSummaries}
            transitionReleaseAction={changeContentReleaseAction.bind(null, studio.id, "SECTION")}
            rollbackReleaseAction={rollbackContentReleaseAction.bind(null, studio.id, "SECTION")}
            previewBaseHref={`/admin/books/${studio.id}/content/releases`}
          />
        </InspectorGroup>
      </div>
    );
  }

  if (selected.type === "FOLDER" && selected.folderKind === "resources" && selected.chapterId) {
    const chapter = studio.chapters.find((item) => item.id === selected.chapterId);
    const sectionReleaseSummaries = await loadReleaseSummaryMap(
      { userId, publisherId },
      studio.id,
      "SECTION",
      sectionDefinitions.map((section) => section.id),
    );
    return (
      <div className="space-y-6">
        <InspectorSummary selected={selected} studio={studio} />
        {chapter ? (
          <InspectorGroup title="Assets">
            <BookStudioResourcePanel
              targetType="CHAPTER"
              targetId={chapter.id}
              targetTitle={`Chapter ${chapter.chapterNumber}: ${chapter.title}`}
            />
          </InspectorGroup>
        ) : null}
        <InspectorGroup title="Sections">
          <ContentSectionManager
            sections={sectionDefinitions}
            saveAction={saveContentSectionDefinitionAction.bind(null, studio.id)}
            archiveAction={archiveContentSectionDefinitionAction.bind(null, studio.id)}
            moveAction={moveContentSectionDefinitionAction.bind(null, studio.id)}
            releaseSummaries={sectionReleaseSummaries}
            transitionReleaseAction={changeContentReleaseAction.bind(null, studio.id, "SECTION")}
            rollbackReleaseAction={rollbackContentReleaseAction.bind(null, studio.id, "SECTION")}
            previewBaseHref={`/admin/books/${studio.id}/content/releases`}
          />
        </InspectorGroup>
      </div>
    );
  }

  const record = selected.type === "FOLDER" ? null : await loadNode(studio.id, selected);
  const document = record ? normalizeContentDocument(record.content) : null;
  const linkedBlocks = document?.blocks.filter(isLinkedAssetBlock) ?? [];
  const knowledgeReferences =
    document?.blocks.flatMap((block) => isTextBlock(block) ? block.knowledgeReferences ?? [] : []) ?? [];
  const knowledgeKeys = new Set(knowledgeReferences.map((reference) => knowledgeKey(reference.type, reference.targetId)));
  const knownKeys = new Set(knowledgeDefinitions.map((definition) => knowledgeKey(definition.type, definition.id)));
  const unusedKnowledge = knowledgeDefinitions.filter(
    (definition) => !knowledgeKeys.has(knowledgeKey(definition.type, definition.id)),
  );
  const brokenKnowledge = knowledgeReferences.filter(
    (reference) => !knownKeys.has(knowledgeKey(reference.type, reference.targetId)),
  );
  const sectionUsage = new Map<string, number>();
  for (const block of linkedBlocks) {
    if (!block.sectionDefinitionId) continue;
    sectionUsage.set(block.sectionDefinitionId, (sectionUsage.get(block.sectionDefinitionId) ?? 0) + 1);
  }
  const assignedSections = sectionDefinitions.filter((section) => sectionUsage.has(section.id));
  const sectionReleaseSummaries = await loadReleaseSummaryMap(
    { userId, publisherId },
    studio.id,
    "SECTION",
    sectionDefinitions.map((section) => section.id),
  );
  const knowledgeReleaseSummaries = await Promise.all(
    knowledgeDefinitions.map(async (definition) => ({
      key: knowledgeKey(definition.type, definition.id),
      summary: await loadReleaseSummary({
        actor: { userId, publisherId },
        bookId: studio.id,
        targetType: definition.type,
        targetId: definition.id,
      }),
    })),
  );
  const knowledgeReleaseMap = new Map(knowledgeReleaseSummaries.map((item) => [item.key, item.summary]));
  const releaseTarget =
    selected.type === "FOLDER"
      ? null
      : releaseTargetForNode(selected.type as BookStructureNodeType);
  const releaseSummary =
    releaseTarget && record
      ? await loadReleaseSummary({
          actor: { userId, publisherId },
          bookId: studio.id,
          targetType: releaseTarget,
          targetId: selected.id,
        })
      : null;

  return (
    <div className="space-y-6">
      <InspectorSummary selected={selected} studio={studio} />
      {record ? (
        <InspectorGroup title="Properties">
          <dl className="space-y-3 text-sm text-slate-600">
            <SummaryRow label="Title" value={record.title} />
            <SummaryRow label="Slug" value={record.slug || "Not set"} />
            <SummaryRow label="Code / Label" value={record.label || "Not supported"} />
            <SummaryRow label="Status" value={record.archived ? "Archived" : "Active"} />
            <SummaryRow label="Publishing" value={record.published ? "Published" : "Draft"} />
            <SummaryRow label="Audience" value="Inherited from linked resources and delivery rules" />
            <SummaryRow
              label="Updated"
              value={record.updatedAt ? record.updatedAt.toLocaleString("en-IN") : "Not available"}
            />
          </dl>
        </InspectorGroup>
      ) : null}
      {releaseSummary ? (
        <InspectorGroup title="Publishing">
          <ContentReleasePanel
            summary={releaseSummary}
            transitionAction={changeContentReleaseAction.bind(null, studio.id, releaseSummary.targetType, selected.id)}
            rollbackAction={rollbackContentReleaseAction.bind(null, studio.id, releaseSummary.targetType, selected.id)}
            previewBaseHref={`/admin/books/${studio.id}/content/releases`}
            bulkPublishAction={
              releaseSummary.targetType === "CHAPTER"
                ? bulkPublishContentReleaseAction.bind(null, studio.id, "CHAPTER", selected.id)
                : undefined
            }
          />
        </InspectorGroup>
      ) : null}
      <InspectorGroup title="Linked Assets">
        <div className="space-y-3 text-sm text-slate-600">
          <SummaryRow label="Blocks" value={String(linkedBlocks.length)} />
          <SummaryRow label="Sectioned" value={String(assignedSections.length)} />
          {assignedSections.length ? (
            <div className="flex flex-wrap gap-2">
              {assignedSections.map((section) => (
                <span key={section.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {section.label} ({sectionUsage.get(section.id)})
                </span>
              ))}
            </div>
          ) : (
            <p>No linked asset blocks use a section label on this node yet.</p>
          )}
        </div>
      </InspectorGroup>
      <InspectorGroup title="Knowledge">
        <div className="space-y-3 text-sm text-slate-600">
          <SummaryRow label="References" value={String(knowledgeReferences.length)} />
          <SummaryRow label="Unused Definitions" value={String(unusedKnowledge.length)} />
          <SummaryRow label="Broken References" value={String(brokenKnowledge.length)} />
          {knowledgeReferences.length ? (
            <div className="space-y-2">
              {[...new Map(knowledgeReferences.map((reference) => [knowledgeKey(reference.type, reference.targetId), reference])).values()]
                .map((reference) => (
                  <span key={reference.id} className={`mr-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    reference.type === "VOCABULARY"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-indigo-100 text-indigo-800"
                  }`}>
                    {reference.label}
                  </span>
                ))}
            </div>
          ) : (
            <p>No vocabulary or concept references on this node yet.</p>
          )}
          <div className="space-y-3">
            {knowledgeDefinitions.slice(0, 8).map((definition) => {
              const key = knowledgeKey(definition.type, definition.id);
              const summary = knowledgeReleaseMap.get(key);
              return summary ? (
                <details key={key} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    {definition.type}: {definition.label}
                  </summary>
                  <div className="mt-3">
                    <ContentReleasePanel
                      summary={summary}
                      transitionAction={changeContentReleaseAction.bind(null, studio.id, definition.type, definition.id)}
                      rollbackAction={rollbackContentReleaseAction.bind(null, studio.id, definition.type, definition.id)}
                      previewBaseHref={`/admin/books/${studio.id}/content/releases`}
                    />
                  </div>
                </details>
              ) : null;
            })}
          </div>
        </div>
      </InspectorGroup>
      <InspectorGroup title="Sections">
        <ContentSectionManager
          sections={sectionDefinitions}
          saveAction={saveContentSectionDefinitionAction.bind(null, studio.id)}
          archiveAction={archiveContentSectionDefinitionAction.bind(null, studio.id)}
          moveAction={moveContentSectionDefinitionAction.bind(null, studio.id)}
          releaseSummaries={sectionReleaseSummaries}
          transitionReleaseAction={changeContentReleaseAction.bind(null, studio.id, "SECTION")}
          rollbackReleaseAction={rollbackContentReleaseAction.bind(null, studio.id, "SECTION")}
          previewBaseHref={`/admin/books/${studio.id}/content/releases`}
        />
      </InspectorGroup>
    </div>
  );
}

void InspectorPanel;

function InspectorSummary({
  selected,
  studio,
}: {
  selected: ContentTreeNode;
  studio: BookPageData;
}) {
  const chapter =
    selected.type === "CHAPTER"
      ? studio.chapters.find((item) => item.id === selected.id)
      : selected.chapterId
        ? studio.chapters.find((item) => item.id === selected.chapterId)
        : null;
  const stats =
    chapter
      ? [
          { label: "Outcomes", value: chapter._count.learningOutcomes },
          { label: "Activities", value: chapter._count.activities },
          { label: "Exercises", value: chapter._count.exercises },
          { label: "Questions", value: chapter._count.questions },
        ]
      : [];

  return (
    <>
      <InspectorGroup title="Context">
        <dl className="space-y-3 text-sm text-slate-600">
          <SummaryRow label="Book" value={studio.title} />
          <SummaryRow label="Selection" value={selected.title} />
          <SummaryRow label="Node Type" value={selected.type} />
          {chapter ? <SummaryRow label="Chapter" value={`${chapter.chapterNumber}. ${chapter.title}`} /> : null}
        </dl>
      </InspectorGroup>
      {stats.length ? (
        <InspectorGroup title="Metadata">
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.map((item) => (
              <div key={item.label} className="rounded-[1.25rem] bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-xl font-bold text-slate-950">{item.value}</p>
              </div>
            ))}
          </div>
        </InspectorGroup>
      ) : null}
    </>
  );
}

async function loadNode(bookId: string, node: ContentTreeNode) {
  const select = {
    id: true,
    title: true,
    subtitle: true,
    slug: true,
    description: true,
    estimatedMinutes: true,
    published: true,
    archived: true,
    content: true,
    updatedAt: true,
  };
  if (node.type === "PART") {
    return prisma.bookPart
      .findFirst({ where: { id: node.id, bookId }, select: { ...select, kind: true } })
      .then((row) => row && { ...row, label: null });
  }
  if (node.type === "UNIT") {
    return prisma.bookUnit
      .findFirst({ where: { id: node.id, bookId }, select: { ...select, number: true } })
      .then((row) => row && { ...row, label: row.number });
  }
  if (node.type === "CHAPTER") {
    return prisma.bookChapter
      .findFirst({ where: { id: node.id, bookId }, select: { ...select, chapterNumber: true } })
      .then((row) => row && { ...row, label: String(row.chapterNumber) });
  }
  if (node.type === "MODULE") {
    return prisma.bookModule
      .findFirst({ where: { id: node.id, bookId }, select: { ...select, number: true } })
      .then((row) => row && { ...row, label: row.number });
  }
  return prisma.bookTopic
    .findFirst({ where: { id: node.id, bookId }, select: { ...select, number: true } })
    .then((row) => row && { ...row, label: row.number });
}

async function loadReleaseSummaryMap(
  actor: { userId: string; publisherId: string },
  bookId: string,
  targetType: "ACTIVITY" | "WORKSHEET" | "EXERCISE" | "SECTION",
  ids: string[],
) {
  const entries = await Promise.all(
    ids.map(async (targetId) => [
      targetId,
      await loadReleaseSummary({ actor, bookId, targetType, targetId }),
    ] as const),
  );
  return Object.fromEntries(entries);
}

async function loadEditorResources(publisherId: string) {
  return prisma.resource.findMany({
    where: {
      publisherId,
      archived: false,
    },
    select: {
      id: true,
      title: true,
      thumbnail: true,
      fileUrl: true,
      type: true,
      mimeType: true,
      published: true,
      audience: true,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 100,
  });
}

function FolderShell({
  title,
  scope,
  children,
}: {
  title: string;
  scope: FolderScopeDetails;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
          {scope.scopeType === "TOPIC"
            ? "Topic Scope"
            : scope.scopeType === "MODULE"
              ? "Module Scope"
              : "Chapter Scope"}
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{scopePathLabel(scope)}</p>
      </section>
      {children}
    </div>
  );
}

function OutcomeForm({
  action,
  chapterId,
  moduleId,
  topicId,
}: {
  action: (data: FormData) => Promise<void>;
  chapterId: string;
  moduleId: string | null;
  topicId: string | null;
}) {
  return (
    <ContentEditorForm
      action={action}
      submitLabel="Add Outcome"
      className="space-y-5 rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <input type="hidden" name="chapterId" value={chapterId} />
      <input type="hidden" name="moduleId" value={moduleId ?? ""} />
      <input type="hidden" name="topicId" value={topicId ?? ""} />
      <Field label="New Outcome">
        <textarea name="outcome" rows={4} required className={field} />
      </Field>
      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Bloom Level">
          <input name="bloomLevel" className={field} />
        </Field>
        <Field label="Competency">
          <input name="competency" className={field} />
        </Field>
        <Field label="Order">
          <input name="sortOrder" type="number" min="0" defaultValue="0" className={field} />
        </Field>
      </div>
    </ContentEditorForm>
  );
}

function PageLink({
  query,
  chapterId,
  moduleId,
  topicId,
  page,
  label,
}: {
  query: Params;
  chapterId: string;
  moduleId: string | null;
  topicId: string | null;
  page: number;
  label: string;
}) {
  const params = new URLSearchParams(
    Object.entries({
      ...query,
      selected: topicId
        ? `FOLDER:TOPIC:${topicId}:questions`
        : moduleId
          ? `FOLDER:MODULE:${moduleId}:questions`
          : `FOLDER:${chapterId}:questions`,
      page: String(page),
    }).filter(
      (entry): entry is [string, string] => Boolean(entry[1]),
    ),
  );
  return (
    <Link href={`?${params.toString()}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700">
      {label}
    </Link>
  );
}

function InspectorGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block text-sm font-semibold text-slate-700 ${wide ? "lg:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}

function CanvasMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.75rem] bg-white px-5 py-6 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}


function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-700">{value}</dd>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}