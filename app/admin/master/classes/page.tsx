import Link from "next/link";
import {
  GraduationCap,
  Plus,
  Pencil,
} from "lucide-react";

import { getClasses } from "@/lib/master/classes";
import DeleteClassButton from "@/components/admin/DeleteClassButton";

type ClassItem = Awaited<ReturnType<typeof getClasses>>[number];

export const metadata = {
  title: "Classes | Bluegate Admin",
};

export default async function ClassesPage() {
  const classes = await getClasses();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Classes
          </h1>

          <p className="mt-2 text-slate-600">
            Manage academic classes.
          </p>
        </div>

        <Link
          href="/admin/master/classes/new"
          className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Class
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left">Class</th>
              <th className="px-6 py-4 text-left">Code</th>
              <th className="px-6 py-4 text-left">Order</th>
              <th className="px-6 py-4 text-left">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {classes.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <GraduationCap className="mx-auto mb-4 h-12 w-12 text-slate-300" />

                  <h3 className="text-xl font-semibold">
                    No Classes Found
                  </h3>

                  <p className="mt-2 text-slate-500">
                    Create your first class.
                  </p>
                </td>
              </tr>
            ) : (
              classes.map((item: ClassItem) => (
                <tr
                  key={item.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-6 py-5 font-semibold">
                    {item.name}
                  </td>

                  <td className="px-6 py-5">
                    {item.code}
                  </td>

                  <td className="px-6 py-5">
                    {item.sortOrder}
                  </td>

                  <td className="px-6 py-5">
                    {item.active ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                        Inactive
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/master/classes/${item.id}/edit`}
                        className="rounded-lg border border-slate-300 p-2 hover:bg-slate-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>

                      <DeleteClassButton
                        id={item.id}
                        name={item.name}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}