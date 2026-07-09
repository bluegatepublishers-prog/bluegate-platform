import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

export default async function AdminResourcesPage() {
  await requireUser(["ADMIN"]);
  const resources = await prisma.resource.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resources</h1>
          <p className="mt-2 text-slate-600">Manage teacher learning resources.</p>
        </div>
        <Link href="/admin/resources/new" className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">
          Add Resource
        </Link>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-white">
        <table className="w-full">
          <thead className="bg-slate-50 text-left">
            <tr><th className="p-4">Title</th><th>Class</th><th>Subject</th><th>Type</th><th>Status</th></tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource.id} className="border-t">
                <td className="p-4 font-semibold">{resource.title}</td>
                <td>{resource.classLevel}</td><td>{resource.subject}</td>
                <td>{resource.type}</td><td>{resource.published ? "Published" : "Draft"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
