import Link from "next/link";
import { Upload } from "lucide-react";

import ResourceLibraryToolbar from "@/components/admin/resources/ResourceLibraryToolbar";
import ResourceLibraryView from "@/components/admin/resources/ResourceLibraryView";
import {
  listPublisherResources,
  normalizeResourceLibraryQuery,
  type ResourceLibraryQueryInput,
} from "@/lib/admin-resource-library";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Resource Library | Bluegate Admin" };

function queryHref(
  query: ReturnType<typeof normalizeResourceLibraryQuery>,
  page: number,
) {
  const params = new URLSearchParams();
  if (query.query) params.set("query", query.query);
  if (query.type) params.set("type", query.type);
  if (query.audience) params.set("audience", query.audience);
  if (query.status) params.set("status", query.status);
  if (query.attachment) params.set("attachment", query.attachment);
  if (query.sort !== "updated_desc") params.set("sort", query.sort);
  if (query.preset !== "all") params.set("preset", query.preset);
  if (query.view !== "list") params.set("view", query.view);
  if (query.pageSize !== 20) params.set("pageSize", String(query.pageSize));
  if (page > 1) params.set("page", String(page));
  const text = params.toString();
  return text ? `/admin/resources?${text}` : "/admin/resources";
}

export default async function AdminResourcesPage({
  searchParams,
}: {
  searchParams: Promise<ResourceLibraryQueryInput>;
}) {
  const actor = await requireLivePublisherAdmin();
  const query = normalizeResourceLibraryQuery(await searchParams);
  const result = await listPublisherResources(actor.publisherId, query);
  const activeQuery = { ...query, page: result.pagination.page };
  const returnTo = queryHref(activeQuery, result.pagination.page);

  return (
    <main className="min-w-0 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">
            Publisher content
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Resource Library
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Upload once, organize centrally, and reuse documents and media across
            books, schools, teachers, and students.
          </p>
        </div>
        <Link
          href="/admin/resources/new"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 font-semibold text-white shadow-sm transition hover:bg-blue-800"
        >
          <Upload className="h-5 w-5" aria-hidden />
          Upload Resource
        </Link>
      </header>

      <ResourceLibraryToolbar query={activeQuery} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          <strong className="text-slate-800">{result.pagination.total}</strong>{" "}
          resource{result.pagination.total === 1 ? "" : "s"}
        </p>
      </div>

      <ResourceLibraryView
        items={result.items}
        pagination={result.pagination}
        view={query.view}
        returnTo={returnTo}
        previousHref={
          result.pagination.page > 1
            ? queryHref(activeQuery, result.pagination.page - 1)
            : null
        }
        nextHref={
          result.pagination.page < result.pagination.totalPages
            ? queryHref(activeQuery, result.pagination.page + 1)
            : null
        }
      />
    </main>
  );
}
