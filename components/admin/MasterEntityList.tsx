"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";

type Row = {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
  active: boolean;
  description?: string | null;
  dependencyCount?: number;
};

export default function MasterEntityList({
  title,
  apiBase,
  createHref,
  rows,
  includeDescription = false,
}: {
  title: string;
  apiBase: string;
  createHref: string;
  rows: Row[];
  includeDescription?: boolean;
}) {
  const router = useRouter();

  async function remove(id: string) {
    if (!confirm(`Delete this ${title.toLowerCase()}?`)) return;
    const response = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      alert(body.message || `Unable to delete ${title.toLowerCase()}.`);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 text-slate-600">Manage {title.toLowerCase()} used across the platform.</p>
        </div>

        <Link href={createHref} className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">
          <Plus className="mr-2 h-5 w-5" /> Add {title.slice(0, -1)}
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Code</th>
              {includeDescription ? <th className="px-6 py-4">Description</th> : null}
              <th className="px-6 py-4">Order</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-6 py-4 font-semibold">{row.name}</td>
                  <td className="px-6 py-4">{row.code}</td>
                  {includeDescription ? <td className="px-6 py-4 text-slate-600">{row.description || "—"}</td> : null}
                  <td className="px-6 py-4">{row.sortOrder}</td>
                  <td className="px-6 py-4">{row.active ? <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Active</span> : <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Inactive</span>}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link href={`${createHref.replace("/new", `/${row.id}/edit`)}`} className="rounded-lg border p-2 text-slate-700"><Pencil className="h-4 w-4" /></Link>
                      <button type="button" onClick={() => remove(row.id)} className="rounded-lg border p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={includeDescription ? 6 : 5} className="px-6 py-14 text-center text-slate-500">
                  <div className="space-y-4">
                    <p className="text-base font-medium">No {title.toLowerCase()} found.</p>
                    <p className="text-sm text-slate-500">Use the Add {title.slice(0, -1)} button above to create the first record.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}