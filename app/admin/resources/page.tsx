import Link from "next/link";
import { ResourceAudience, ResourceType, type Resource } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { requirePublisherAdmin } from "@/lib/publisher-context";
import { RESOURCE_AUDIENCE_OPTIONS, getResourceAudienceBadgeClass, getResourceAudienceLabel, validateResourceAudience } from "@/lib/resource-audience-ui";
import { buildAdminResourceWhere } from "@/lib/resource-access-policy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminResourcesPage({searchParams}:{searchParams:Promise<{query?:string;type?:string;audience?:string}>}) {
  /*
   * Check the environment variable before running authentication
   * or any Prisma query. This prevents a database-related build crash.
   */
  if (!process.env.DATABASE_URL) {
    return (
      <main className="mx-auto max-w-7xl p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-slate-900">
          <h1 className="text-3xl font-bold">
            Database configuration required
          </h1>

          <p className="mt-4 text-slate-700">
            The Teacher Resources admin page cannot load because the database
            is not configured. Check the <code className="rounded bg-rose-100 px-1.5 py-0.5 font-mono">
              DATABASE_URL
            </code>
            environment variable and try again.
          </p>
        </div>
      </main>
    );
  }

  await requireUser(["ADMIN"]);
  const {publisher}=await requirePublisherAdmin();
  const params=await searchParams;const query=params.query?.trim()||undefined;
  const type=Object.values(ResourceType).includes(params.type as ResourceType)?params.type as ResourceType:undefined;
  const audience=validateResourceAudience(params.audience);

  let resources: Resource[] = [];
  let errorMessage: string | null = null;

  try {
    resources = await prisma.resource.findMany({
      where:buildAdminResourceWhere(publisher.id,{query,type,audience:audience??undefined}),
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    console.error("Failed to load admin resources:", error);

    errorMessage =
      "Database connection is unavailable. Check the DATABASE_URL environment variable.";
  }

  if (errorMessage) {
    return (
      <main className="mx-auto max-w-7xl p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-slate-900">
          <h1 className="text-3xl font-bold">Unable to load resources</h1>
          <p className="mt-4 text-slate-700">{errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Teacher Resources
          </h1>

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
        <label className="text-sm font-semibold text-slate-700 lg:col-span-2">Search resources<input name="query" defaultValue={query} placeholder="Title, subject, or class" className="mt-2 w-full rounded-xl border px-4 py-3 font-normal"/></label>
        <label className="text-sm font-semibold text-slate-700">Resource type<select name="type" defaultValue={type??""} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal"><option value="">All types</option>{Object.values(ResourceType).map((value)=><option key={value} value={value}>{value}</option>)}</select></label>
        <label className="text-sm font-semibold text-slate-700">Audience<select name="audience" defaultValue={audience??""} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal"><option value="">All audiences</option>{RESOURCE_AUDIENCE_OPTIONS.map((option)=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-4"><button className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">Apply filters</button>{query||type||audience?<Link href="/admin/resources" className="inline-flex items-center rounded-xl border px-5 py-3 font-semibold">Clear filters</Link>:null}</div>
      </form>

      {/* Resources table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm font-semibold text-slate-700">
                <th className="p-4">Title</th>
                <th className="p-4">Class</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Type</th>
                <th className="p-4">Audience</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {resources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center">
                    <p className="font-semibold text-slate-700">
                      {audience===ResourceAudience.STUDENT?"No student-facing resources have been added yet.":audience===ResourceAudience.TEACHER_ONLY?"No teacher-only resources have been added yet.":query||type||audience?"No resources match the selected filters.":"No resources found"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Add your first teacher resource to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                resources.map((resource) => (
                  <tr
                    key={resource.id}
                    className="border-t border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="p-4 font-semibold text-slate-900">
                      {resource.title}
                    </td>

                    <td className="p-4 text-slate-700">
                      {resource.classLevel || "—"}
                    </td>

                    <td className="p-4 text-slate-700">
                      {resource.subject || "—"}
                    </td>

                    <td className="p-4 text-slate-700">{resource.type}</td>

                    <td className="p-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getResourceAudienceBadgeClass(resource.audience)}`}>{getResourceAudienceLabel(resource.audience)}</span></td>

                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          resource.featured
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {resource.featured ? "Featured" : "Normal"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
