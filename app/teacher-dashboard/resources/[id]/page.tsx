import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import ResourceActions from "@/components/dashboard/ResourceActions";
import { getResourceDetails } from "@/lib/teacher-dashboard";
import { formatFileSizeBytes, getResourceFileName } from "@/lib/resource-helpers";
import { getResourceAudienceLabel } from "@/lib/resource-audience-ui";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResourceDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { resource, related, bookmarked } = await getResourceDetails(id);

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
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <Link
        href="/teacher-dashboard/resources"
        className="inline-flex items-center font-semibold text-blue-700"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to resources
      </Link>

      <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
        <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
          {isVideo ? (
            <video controls className="aspect-video w-full bg-black" src={resource.fileUrl}>
              Your browser does not support video.
            </video>
          ) : isPdf ? (
            <iframe
              title={`${resource.title} preview`}
              src={resource.fileUrl}
              className="h-[70vh] w-full"
            />
          ) : (
            <div className="flex min-h-96 items-center justify-center bg-slate-50">
              <div className="px-6 text-center">
                <FileText className="mx-auto h-16 w-16 text-blue-600" />
                <p className="mt-4 text-slate-600">
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

        <aside className="rounded-3xl border bg-white p-7 shadow-sm">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {resource.type}
          </span>
          <h1 className="mt-5 text-3xl font-bold">{resource.title}</h1>
          <p className="mt-4 leading-7 text-slate-600">{resource.description}</p>

          <div className="mt-5 space-y-1 text-sm text-slate-600">
            <p>Class: {resource.classRef?.name ?? resource.classLevel}</p>
            <p>Subject: {resource.subjectRef?.name ?? resource.subject}</p>
            {resource.seriesRef?.name ? <p>Series: {resource.seriesRef.name}</p> : null}
            {resource.book?.title ? <p>Book: {resource.book.title}</p> : null}
            <p>Audience: {getResourceAudienceLabel(resource.audience)}</p>
            <p>File name: {fileName}</p>
            {fileSize ? <p>File size: {fileSize}</p> : null}
            <p>Updated: {resource.updatedAt.toLocaleString("en-IN")}</p>
          </div>

          <ResourceActions resourceId={resource.id} bookmarked={bookmarked} />
        </aside>
      </div>

      <section>
        <h2 className="text-2xl font-bold">Related resources</h2>
        {related.length ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/teacher-dashboard/resources/${item.id}`}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                <span className="text-xs font-bold text-blue-700">{item.type}</span>
                <h3 className="mt-3 font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {item.classRef?.name ?? item.classLevel} · {item.subjectRef?.name ?? item.subject}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-slate-500">No related resources available.</p>
        )}
      </section>
    </div>
  );
}
