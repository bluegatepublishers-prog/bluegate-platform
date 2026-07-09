import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

export default async function AdminResourcesPage() {
  await requireUser(["ADMIN"]);

  let resources: Awaited<ReturnType<typeof prisma.resource.findMany>> = [];

  if (process.env.DATABASE_URL) {
    resources = await prisma.resource.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  } else {
    // No DB available during build — fall back to empty list so the page can render
    resources = [];
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Teacher Resources
          </h1>
          <p className="mt-2 text-slate-600">
            Manage PDFs, PPTs, Videos, Worksheets and other teacher resources.
          </p>
        </div>

        <Link
          href="/admin/resources/new"
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          + Add Resource
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
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
                <td
                  colSpan={5}
                  className="p-8 text-center text-slate-500"
                >
                  No resources found.
                </td>
              </tr>
            ) : (
              resources.map((resource) => (
                <tr
                  key={resource.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="p-4 font-semibold text-slate-900">
                    {resource.title}
                  </td>

                  <td className="p-4">
                    {resource.classLevel}
                  </td>

                  <td className="p-4">
                    {resource.subject}
                  </td>

                  <td className="p-4">
                    {resource.type}
                  </td>

                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
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
    </main>
  );
}