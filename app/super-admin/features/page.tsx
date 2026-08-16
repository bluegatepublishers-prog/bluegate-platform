import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/publisher-context";

export default async function PlatformFeaturesPage() {
  await requireSuperAdmin();
  const features = await prisma.featureDefinition.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Platform policy</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Platform Features</h1>
          <p className="mt-2 text-slate-600">Readiness determines which features Super Admin can enable for a Publisher.</p>
        </div>
        <Link href="/super-admin/publishers" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">Manage Publishers</Link>
      </div>
      <div className="mt-6 overflow-x-auto rounded-3xl border bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="p-4">Feature</th><th>Category</th><th>Implemented</th><th>Platform active</th><th>Description</th></tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr key={feature.id} className="border-t border-slate-100 align-top">
                <td className="p-4"><p className="font-bold text-slate-950">{feature.name}</p><p className="mt-1 text-xs text-slate-400">{feature.key}</p></td>
                <td className="pt-4 text-sm text-slate-600">{feature.category ?? "—"}</td>
                <td className="pt-4 text-sm font-semibold">{feature.implemented ? "Yes" : "No"}</td>
                <td className="pt-4 text-sm font-semibold">{feature.active ? "Yes" : "No"}</td>
                <td className="max-w-sm py-4 pr-4 text-sm text-slate-600">{feature.description ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
