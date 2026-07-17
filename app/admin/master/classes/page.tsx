import {
  GraduationCap,
} from "lucide-react";

import { getClasses } from "@/lib/master/classes";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

type ClassItem = Awaited<ReturnType<typeof getClasses>>[number];

export const metadata = {
  title: "Classes | Bluegate Admin",
};

export default async function ClassesPage() {
  await requireLivePublisherAdmin();
  const classes = await getClasses();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Classes
          </h1>

          <p className="mt-2 text-slate-600">
            Global academic class catalog (read-only).
          </p>
        </div>

      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left">Class</th>
              <th className="px-6 py-4 text-left">Code</th>
              <th className="px-6 py-4 text-left">Order</th>
              <th className="px-6 py-4 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {classes.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center">
                  <GraduationCap className="mx-auto mb-4 h-12 w-12 text-slate-300" />

                  <h3 className="text-xl font-semibold">
                    No Classes Found
                  </h3>

                  <p className="mt-2 text-slate-500">
                    No global classes are available.
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

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
