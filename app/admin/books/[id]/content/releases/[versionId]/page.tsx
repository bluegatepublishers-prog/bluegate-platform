import Link from "next/link";
import { notFound } from "next/navigation";

import ContentDocumentRenderer from "@/components/admin/books/ContentDocumentRenderer";
import { isLinkedAssetBlock, normalizeContentDocument } from "@/lib/content-document";
import {
  getContentNodeScope,
  loadContentSectionDefinitions,
  resolveLinkedAssetsForDocument,
} from "@/lib/content-linked-assets";
import { resolveMediaForDocument } from "@/lib/content-media";
import { resolveKnowledgeDefinitionsForDocument } from "@/lib/content-knowledge";
import {
  loadReleaseVersionPreview,
  type ReleaseVersionPreview,
} from "@/lib/content-release";
import { resolveActivitiesForLinkedAssetDocument } from "@/lib/activity-studio";
import { resolveWorksheetsForLinkedAssetDocument } from "@/lib/worksheet-studio";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";
import type { BookStructureNodeType } from "@/lib/book-structure-management";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReleaseVersionPreviewPage({
  params,
}: {
  params: Promise<{ id: string; versionId: string }>;
}) {
  const { id, versionId } = await params;
  const actor = await requirePublisherAdminBookOwnership(id);
  const preview = await loadReleaseVersionPreview({
    actor: { userId: actor.userId, publisherId: actor.publisherId },
    bookId: id,
    versionId,
  });
  if (!preview) notFound();
  const resolved = await resolveHistoricalPreview(actor.publisherId, id, preview);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] bg-slate-950 px-6 py-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
              Historical Version Preview
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">{preview.title}</h1>
            <p className="mt-2 text-sm text-slate-300">
              {preview.targetType} {preview.targetId} - v{preview.versionNumber} - Published{" "}
              {preview.publishedAt ? new Date(preview.publishedAt).toLocaleString("en-IN") : "not recorded"}
            </p>
          </div>
          <Link
            href={`/admin/books/${id}/content`}
            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950"
          >
            Back to Studio
          </Link>
        </div>
      </header>

      <section className="grid gap-4 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Draft Blocks" value={preview.compare.draftBlockCount} />
        <Metric label="Version Blocks" value={preview.compare.versionBlockCount} />
        <Metric label="Added" value={preview.compare.addedBlocks} />
        <Metric label="Removed" value={preview.compare.removedBlocks} />
        <Metric label="Changed" value={preview.compare.changedBlocks} />
        <Metric label="Asset/Knowledge Delta" value={preview.compare.linkedAssetChanges + preview.compare.knowledgeReferenceChanges} />
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-bold text-slate-950">Immutable Snapshot</h2>
        <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
          <Summary label="Lifecycle" value={preview.lifecycle} />
          <Summary label="Checksum" value={preview.checksum.slice(0, 24)} />
          <Summary label="Created" value={new Date(preview.createdAt).toLocaleString("en-IN")} />
          <Summary label="Notes" value={preview.releaseNotes ?? "No release notes"} />
        </dl>
      </section>

      <section className="rounded-[2rem] bg-[#fcfaf5] p-6 shadow-sm ring-1 ring-slate-200">
        {preview.document ? (
          <ContentDocumentRenderer
            document={preview.document}
            linkedAssets={resolved.linkedAssets}
            activities={resolved.activities}
            worksheets={resolved.worksheets}
            media={resolved.media}
            sectionDefinitions={resolved.sections}
            knowledgeDefinitions={resolved.knowledgeDefinitions}
          />
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-8 text-sm text-slate-600">
            This release target does not contain manuscript blocks, so only immutable release metadata is available.
          </div>
        )}
      </section>
    </main>
  );
}

async function resolveHistoricalPreview(
  publisherId: string,
  bookId: string,
  preview: ReleaseVersionPreview,
) {
  const sections = await loadContentSectionDefinitions(publisherId, bookId);
  if (!preview.document || !isHierarchyTarget(preview.targetType)) {
    return { sections, linkedAssets: {}, activities: {}, worksheets: {}, media: {}, knowledgeDefinitions: {} };
  }
  const document = normalizeContentDocument(preview.document);
  const scope = await getContentNodeScope(
    publisherId,
    bookId,
    preview.targetType as BookStructureNodeType,
    preview.targetId,
  );
  const blocks = document.blocks
    .filter(isLinkedAssetBlock)
    .map((block) => ({ id: block.id, targetType: block.targetType, targetId: block.targetId }));
  const [linkedAssets, activities, worksheets, media, knowledgeDefinitions] = await Promise.all([
    resolveLinkedAssetsForDocument(scope, document),
    resolveActivitiesForLinkedAssetDocument({ publisherId, bookId, mode: "ADMIN_PREVIEW", blocks }),
    resolveWorksheetsForLinkedAssetDocument({ publisherId, bookId, mode: "ADMIN_PREVIEW", blocks }),
    resolveMediaForDocument(scope, document),
    resolveKnowledgeDefinitionsForDocument(scope, document),
  ]);
  return { sections, linkedAssets, activities, worksheets, media, knowledgeDefinitions };
}

function isHierarchyTarget(value: string): value is "CHAPTER" | "MODULE" | "TOPIC" {
  return value === "CHAPTER" || value === "MODULE" || value === "TOPIC";
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
