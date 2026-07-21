import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePublisherAdminResourceOwnership } from "@/lib/publisher-admin-data";
import { formatFileSizeBytes, getResourceFileName } from "@/lib/resource-helpers";
import { getResourceAudienceLabel } from "@/lib/resource-audience-ui";

export const dynamic = "force-dynamic";

export default async function AdminResourceDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requirePublisherAdminResourceOwnership(id);

  const resource = await prisma.resource.findFirst({
    where: { id, publisherId: actor.publisherId },
    include: {
      classRef: { select: { name: true } },
      subjectRef: { select: { name: true } },
      seriesRef: { select: { name: true } },
      book: { select: { title: true } },
    },
  });

  if (!resource) notFound();

  const isVideo = resource.type === "VIDEO";
  const isPdf = resource.type === "PDF";

  const fileName = getResourceFileName({
    originalFileName: resource.originalFileName,
    fileUrl: resource.fileUrl,
  });

  const fileSize = formatFileSizeBytes(
    resource.fileSizeBytes === null ? null : Number(resource.fileSizeBytes),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link
        href="/admin/resources"
        className="inline-flex items-center text-sm font-semibold text-blue-700"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to resources
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
          {isVideo ? (
            <video controls className="aspect-video w-full bg-black" src={resource.fileUrl}>
              Your browser does not support video playback.
            </video>
          ) : isPdf ? (
            <iframe
              title={`${resource.title} preview`}
              src={resource.fileUrl}
              className="h-[72vh] w-full"
            />
          ) : (
            <div className="flex min-h-[460px] items-center justify-center bg-slate-50 p-6 text-center">
              <div>
                <FileText className="mx-auto h-14 w-14 text-blue-600" />
                <p className="mt-3 text-sm text-slate-600">
                  Preview is not available for this file type. Download the file to open it.
                </p>
                <a
                  href={resource.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Download file
                </a>
              </div>
            </div>
          )}
        </section>

        <aside className="rounded-3xl border bg-white p-6 shadow-sm">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {resource.type}
          </span>
          <h1 className="mt-4 text-2xl font-bold">{resource.title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{resource.description}</p>

          <dl className="mt-6 space-y-2 text-sm">
            <Meta label="Audience" value={getResourceAudienceLabel(resource.audience)} />
            <Meta label="Published" value={resource.published ? "Yes" : "No"} />
            <Meta label="Featured" value={resource.featured ? "Yes" : "No"} />
            <Meta label="Class" value={resource.classRef?.name ?? resource.classLevel} />
            <Meta label="Subject" value={resource.subjectRef?.name ?? resource.subject} />
            <Meta label="Series" value={resource.seriesRef?.name ?? "—"} />
            <Meta label="Book" value={resource.book?.title ?? "—"} />
            <Meta label="File name" value={fileName} />
            <Meta label="File size" value={fileSize || "—"} />
            <Meta label="Updated" value={resource.updatedAt.toLocaleString("en-IN")} />
          </dl>

          <div className="mt-6 flex gap-3">
            <Link
              href={`/admin/resources/${resource.id}/edit`}
              className="rounded-xl border px-4 py-2 text-sm font-semibold"
            >
              Edit
            </Link>
            <a
              href={resource.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Download
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
      <dt className="font-semibold text-slate-700">{label}</dt>
      <dd className="text-right text-slate-600">{value}</dd>
    </div>
  );
}
