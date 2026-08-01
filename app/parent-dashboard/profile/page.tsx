import { getParentChildren, requireParent } from "@/lib/parent-dashboard";

import ParentProfileForm from "@/components/parent/ParentProfileForm";

export default async function ParentProfilePage() {
  const parent = await requireParent();
  const { children } = await getParentChildren();

  return (
    <main className="space-y-6">
      <ParentProfileForm name={parent.user.name} email={parent.user.email} phone={parent.phone ?? null} />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Linked children</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {children.map((child) => <article key={child.student.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-slate-950">{child.student.name}</p><p className="mt-1 text-sm text-slate-600">{child.enrollment.schoolClass.name} {child.enrollment.section.name}</p><p className="mt-1 text-xs uppercase tracking-wide text-slate-500">Managed by the school</p></article>)}
        </div>
      </section>
    </main>
  );
}