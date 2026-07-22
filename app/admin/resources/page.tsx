import Link from "next/link";
import { ResourceAudience, ResourceType } from "@prisma/client";

import ResourceRowActions from "@/components/admin/ResourceRowActions";
import { prisma } from "@/lib/prisma";
import { requirePublisherAdmin } from "@/lib/publisher-context";
import {
  RESOURCE_AUDIENCE_OPTIONS,
  getResourceAudienceBadgeClass,
  getResourceAudienceLabel,
  validateResourceAudience,
} from "@/lib/resource-audience-ui";
import { buildAdminResourceWhere } from "@/lib/resource-access-policy";
import { formatFileSizeBytes, getResourceFileName } from "@/lib/resource-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ResourceSearch = {
  query?: string;
  type?: string;
  audience?: string;
  classId?: string;
  subjectId?: string;
  seriesId?: string;
  bookId?: string;
  published?: string;
};

function parsePublished(value: string | undefined) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export default async function AdminResourcesPage({
  searchParams,
}: {
  searchParams: Promise<ResourceSearch>;
}) {
  const { publisher } = await requirePublisherAdmin();
  const params = await searchParams;

  const query = params.query?.trim() || undefined;
  const type = Object.values(ResourceType).includes(params.type as ResourceType)
    ? (params.type as ResourceType)
    : undefined;
  const audience = validateResourceAudience(params.audience);
  const classId = params.classId?.trim() || undefined;
  const subjectId = params.subjectId?.trim() || undefined;
  const seriesId = params.seriesId?.trim() || undefined;
  const bookId = params.bookId?.trim() || undefined;
  const published = parsePublished(params.published);

  const [resources, classes, subjects, series, books] = await Promise.all([
    prisma.resource.findMany({
      where: buildAdminResourceWhere(publisher.id, {
        query,
        type,
        audience: audience ?? undefined,
        classId,
        subjectId,
        seriesId,
        bookId,
        published,
      }),
      include: {
        classRef: { select: { id: true, name: true } },
        subjectRef: { select: { id: true, name: true } },
        seriesRef: { select: { id: true, name: true } },
        book: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.class.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.subject.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.bookSeries.findMany({
      where: { publisherId: publisher.id, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.book.findMany({
      where: { publisherId: publisher.id },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const hasFilters = Boolean(
    query || type || audience || classId || subjectId || seriesId || bookId || params.published,
  );

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Teacher Resources</h1>
          <p className="mt-2 text-slate-600">
            Manage PDFs, PPTs, videos, worksheets and other teacher resources.
          </p>
        </div>

        <Link
          href="/admin/resources/new"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          + Add Resource
        </Link>
      </div>

      <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
          Search resources
          <input
            name="query"
            defaultValue={query}
            placeholder="Title, class, or subject"
            className="mt-2 w-full rounded-xl border px-4 py-3 font-normal"
          />
        </label>

        <Select
          label="Type"
          name="type"
          defaultValue={type ?? ""}
          options={Object.values(ResourceType).map((value) => ({ value, label: value }))}
          emptyLabel="All types"
        />

        <Select
          label="Audience"
          name="audience"
          defaultValue={audience ?? ""}
          options={RESOURCE_AUDIENCE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          emptyLabel="All audiences"
        />

        <Select
          label="Class"
          name="classId"
          defaultValue={classId ?? ""}
          options={classes.map((item) => ({ value: item.id, label: item.name }))}
          emptyLabel="All classes"
        />

        <Select
          label="Subject"
          name="subjectId"
          defaultValue={subjectId ?? ""}
          options={subjects.map((item) => ({ value: item.id, label: item.name }))}
          emptyLabel="All subjects"
        />

        <Select
          label="Series"
          name="seriesId"
          defaultValue={seriesId ?? ""}
          options={series.map((item) => ({ value: item.id, label: item.name }))}
          emptyLabel="All series"
        />

        <Select
          label="Book"
          name="bookId"
          defaultValue={bookId ?? ""}
          options={books.map((item) => ({ value: item.id, label: item.title }))}
          emptyLabel="All books"
        />

        <Select
          label="Published"
          name="published"
          defaultValue={params.published ?? ""}
          options={[
            { value: "true", label: "Published" },
            { value: "false", label: "Unpublished" },
          ]}
          emptyLabel="Any status"
        />

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
          <button className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">
            Apply filters
          </button>

          {hasFilters ? (
            <Link
              href="/admin/resources"
              className="inline-flex items-center rounded-xl border px-5 py-3 font-semibold"
            >
              Clear filters
            </Link>
          ) : null}

          <p className="text-sm text-slate-500">{resources.length} result(s)</p>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1250px] w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm font-semibold text-slate-700">
                <th className="p-4">Title</th>
                <th className="p-4">Type</th>
                <th className="p-4">Class</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Series</th>
                <th className="p-4">Book</th>
                <th className="p-4">Audience</th>
                <th className="p-4">Published</th>
                <th className="p-4">File</th>
                <th className="p-4">Updated</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {resources.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center">
                    <p className="font-semibold text-slate-700">
                      {audience === ResourceAudience.STUDENT
                        ? "No student-facing resources found."
                        : audience === ResourceAudience.TEACHER_ONLY
                          ? "No teacher-only resources found."
                          : hasFilters
                            ? "No resources match the selected filters."
                            : "No resources found."}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add your first teacher resource to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                resources.map((resource) => {
                  const fileName = getResourceFileName({
                    originalFileName: resource.originalFileName,
                    fileUrl: resource.fileUrl,
                  });
                  const fileSize = formatFileSizeBytes(
                    resource.fileSizeBytes === null
                      ? null
                      : Number(resource.fileSizeBytes),
                  );

                  return (
                    <tr
                      key={resource.id}
                      className="border-t border-slate-100 align-top transition hover:bg-slate-50"
                    >
                      <td className="p-4 font-semibold text-slate-900">{resource.title}</td>
                      <td className="p-4 text-slate-700">{resource.type}</td>
                      <td className="p-4 text-slate-700">
                        {resource.classRef?.name ?? resource.classLevel ?? "—"}
                      </td>
                      <td className="p-4 text-slate-700">
                        {resource.subjectRef?.name ?? resource.subject ?? "—"}
                      </td>
                      <td className="p-4 text-slate-700">{resource.seriesRef?.name ?? "—"}</td>
                      <td className="p-4 text-slate-700">{resource.book?.title ?? "—"}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getResourceAudienceBadgeClass(resource.audience)}`}
                        >
                          {getResourceAudienceLabel(resource.audience)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            resource.published
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {resource.published ? "Published" : "Unpublished"}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-600">
                        <p className="font-semibold text-slate-700">{fileName}</p>
                        {fileSize ? <p>{fileSize}</p> : null}
                      </td>
                      <td className="p-4 text-xs text-slate-600">
                        {resource.updatedAt.toLocaleString("en-IN")}
                      </td>
                      <td className="p-4">
                        <ResourceRowActions
                          id={resource.id}
                          published={resource.published}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function Select({
  label,
  name,
  defaultValue,
  options,
  emptyLabel,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
  emptyLabel: string;
}) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-xl border px-4 py-3 font-normal"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
