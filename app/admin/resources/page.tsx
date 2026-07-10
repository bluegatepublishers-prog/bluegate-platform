import Link from "next/link";
import type { Resource } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminResourcesPage() {
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

  let resources: Resource[] = [];
  let errorMessage: string | null = null;

  try {
    resources = await prisma.resource.findMany({
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
                <th className="p-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {resources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <p className="font-semibold text-slate-700">
                      No resources found
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