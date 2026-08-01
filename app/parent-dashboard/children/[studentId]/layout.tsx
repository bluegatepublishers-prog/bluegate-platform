import type { ReactNode } from "react";

import ParentChildTabs from "@/components/parent/ParentChildTabs";
import { ParentAccessError, requireParentChildAccess } from "@/lib/parent-dashboard";

export const dynamic = "force-dynamic";

export default async function ParentChildLayout({ children, params }: { children: ReactNode; params: Promise<{ studentId: string }> }) {
  let scope;
  try {
    const { studentId } = await params;
    scope = await requireParentChildAccess(studentId);
  } catch (error) {
    if (error instanceof ParentAccessError) {
      return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><section className="max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-8"><h1 className="text-2xl font-bold text-amber-950">Child access unavailable</h1><p className="mt-3 text-amber-800">{error.message}</p></section></main>;
    }
    throw error;
  }

  const { studentId } = await params;
  return <main className="space-y-6"><section className="rounded-[2rem] bg-white p-6 shadow-sm"><p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">Child workspace</p><h1 className="mt-2 text-3xl font-bold text-slate-950">{scope.student.name}</h1><p className="mt-2 text-slate-600">{scope.student.school.schoolName} · {scope.enrollment.schoolClass.name} {scope.enrollment.section.name} · {scope.enrollment.academicYear.name}</p><div className="mt-5"><ParentChildTabs studentId={studentId} /></div></section>{children}</main>;
}