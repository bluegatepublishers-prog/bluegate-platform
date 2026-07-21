import Link from "next/link";
import { FolderOpen, Search, X } from "lucide-react";
import { ResourceAudience, ResourceType } from "@prisma/client";

import ResourceActions from "@/components/dashboard/ResourceActions";
import { getResources } from "@/lib/teacher-dashboard";
import { formatFileSizeBytes, getResourceFileName } from "@/lib/resource-helpers";
import { getResourceAudienceLabel } from "@/lib/resource-audience-ui";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Resources | Bluegate Teacher Dashboard" };

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string;
    classId?: string;
    subjectId?: string;
    type?: string;
    seriesId?: string;
    bookId?: string;
    audience?: string;
  }>;
}) {
  const params = await searchParams;

  const type = Object.values(ResourceType).includes(params.type as ResourceType)
    ? (params.type as ResourceType)
    : undefined;
  const audience = Object.values(ResourceAudience).includes(
    params.audience as ResourceAudience,
  )
    ? (params.audience as ResourceAudience)
    : undefined;

  const data = await getResources({
    query: params.query?.trim(),
    classId: params.classId,
    subjectId: params.subjectId,
    type,
    seriesId: params.seriesId,
    bookId: params.bookId,
    audience,
  });

  const filtered = Boolean(
    params.query ||
      params.classId ||
      params.subjectId ||
      type ||
      params.seriesId ||
      params.bookId ||
      audience,
  );

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Resources</h1>
        <p className="mt-2 text-slate-600">
          Browse, bookmark, and download teaching resources.
        </p>
      </div>

      <form className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-6">
        <label className="relative lg:col-span-2">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
          <input
            name="query"
            defaultValue={params.query}
            placeholder="Search resources"
            className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4"
          />
        </label>

        <select
          name="classId"
          defaultValue={params.classId ?? ""}
          className="rounded-xl border border-slate-300 px-4"
        >
          <option value="">All classes</option>
          {data.classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          name="subjectId"
          defaultValue={params.subjectId ?? ""}
          className="rounded-xl border border-slate-300 px-4"
        >
          <option value="">All subjects</option>
          {data.subjects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          name="seriesId"
          defaultValue={params.seriesId ?? ""}
          className="rounded-xl border border-slate-300 px-4"
        >
          <option value="">All series</option>
          {data.series.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          name="bookId"
          defaultValue={params.bookId ?? ""}
          className="rounded-xl border border-slate-300 px-4"
        >
          <option value="">All books</option>
          {data.books.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>

        <select
          name="type"
          defaultValue={type ?? ""}
          className="rounded-xl border border-slate-300 px-4"
        >
          <option value="">All types</option>
          {Object.values(ResourceType).map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>

        <select
          name="audience"
          defaultValue={audience ?? ""}
          className="rounded-xl border border-slate-300 px-4"
        >
          <option value="">All audiences</option>
          {Object.values(ResourceAudience).map((value) => (
            <option key={value} value={value}>
              {getResourceAudienceLabel(value)}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap items-center gap-3 lg:col-span-6">
          <button className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">
            Apply filters
          </button>
          {filtered ? (
            <Link
              href="/teacher-dashboard/resources"
              className="inline-flex items-center rounded-xl border px-5"
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Link>
          ) : null}

          <p className="text-sm text-slate-500">{data.resources.length} result(s)</p>
        </div>
      </form>

      {data.resources.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data.resources.map((resource) => {
            const fileName = getResourceFileName({
              originalFileName: resource.originalFileName,
              fileUrl: resource.fileUrl,
            });
            const fileSize = formatFileSizeBytes(
              resource.fileSizeBytes === null ? null : Number(resource.fileSizeBytes),
            );

            return (
              <article
                key={resource.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {resource.type}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {getResourceAudienceLabel(resource.audience)}
                  </span>
                </div>

                <h2 className="mt-4 text-lg font-bold">{resource.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                  {resource.description}
                </p>

                <div className="mt-4 space-y-1 text-xs text-slate-600">
                  <p>
                    Class: {resource.classRef?.name ?? resource.classLevel}
                  </p>
                  <p>
                    Subject: {resource.subjectRef?.name ?? resource.subject}
                  </p>
                  {resource.seriesRef?.name ? <p>Series: {resource.seriesRef.name}</p> : null}
                  {resource.book?.title ? <p>Book: {resource.book.title}</p> : null}
                  <p>File: {fileName}</p>
                  {fileSize ? <p>Size: {fileSize}</p> : null}
                </div>

                <ResourceActions
                  resourceId={resource.id}
                  bookmarked={data.bookmarkedIds.has(resource.id)}
                />
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border bg-white p-14 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-xl font-bold">
            {filtered ? "No matching resources" : "No resources available"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Try changing your filters or check back later.
          </p>
        </div>
      )}
    </div>
  );
}
